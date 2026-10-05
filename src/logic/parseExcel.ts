import * as XLSX from 'xlsx';
import { DEFAULT_PARAMS } from './rules';
import type { Band, Dataset, Level, Params, PartnerInput } from './types';

export const DEFAULT_DATA_SHEET = 'Data Dummy';
export const PARAM_SHEET = 'Parameter Dummy';

export class ParseError extends Error {}

type Cell = string | number | boolean | null | undefined;

const norm = (v: Cell) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Pencocokan header berdasarkan nama (bukan posisi kolom), supaya urutan kolom boleh berubah. */
const COLUMNS = {
  name: (h: string) => h === 'nama partner',
  fbi: (h: string) => h.startsWith('sum of fbi') || h === 'fbi' || h === 'fbi (rp)',
  percentage: (h: string) => h === 'percentage',
  pjp: (h: string) => h.startsWith('pjp berizin bi'),
  intiPembayaran: (h: string) => h.startsWith('menyentuh tahap inti pembayaran'),
  dataPribadi: (h: string) => h.startsWith('akses data pribadi'),
  kelompok: (h: string) => h === 'kritikal/non',
  skor: (h: string) => h.startsWith('nilai (skor risiko)') || h === 'skor risiko',
  domain0: (h: string) => h.startsWith('ada domain kematangan 0'),
  profil: (h: string) => h === 'profil risiko',
  level: (h: string) => h === 'level risiko',
  kuadran: (h: string) => h === 'kuadran',
  deskripsi: (h: string) => h === 'deskripsi',
} as const;

type ColKey = keyof typeof COLUMNS;
const REQUIRED: ColKey[] = ['name', 'fbi', 'pjp', 'intiPembayaran', 'dataPribadi', 'skor', 'domain0'];
const LABEL: Record<ColKey, string> = {
  name: 'Nama Partner',
  fbi: 'Sum of FBI (Rp)',
  percentage: 'Percentage',
  pjp: 'PJP berizin BI?',
  intiPembayaran: 'Menyentuh tahap inti pembayaran?',
  dataPribadi: 'Akses data pribadi skala besar?',
  kelompok: 'Kritikal/Non',
  skor: 'Nilai (Skor Risiko)',
  domain0: 'Ada domain kematangan 0?',
  profil: 'Profil Risiko',
  level: 'Level Risiko',
  kuadran: 'Kuadran',
  deskripsi: 'Deskripsi',
};

function toNumber(v: Cell): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    // Format Indonesia: titik ribuan, koma desimal ("Rp1.234.567,5")
    const n = Number(v.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toYaTidak(v: Cell): boolean | null {
  const s = norm(v);
  if (s === 'ya') return true;
  if (s === 'tidak') return false;
  return null;
}

const optText = (v: Cell) => (v === null || v === undefined || v === '' ? undefined : String(v).trim());

export function readWorkbook(buf: ArrayBuffer): XLSX.WorkBook {
  // SheetJS juga mau membaca teks/CSV biasa, jadi cek dulu signature file Excel:
  // .xlsx/.xlsm = ZIP ("PK"), .xls lama = OLE (D0 CF 11 E0).
  const b = new Uint8Array(buf.slice(0, 4));
  const isZip = b[0] === 0x50 && b[1] === 0x4b;
  const isOle = b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
  if (!isZip && !isOle) throw new ParseError('File tidak bisa dibaca. Pastikan file berformat Excel (.xlsx).');
  try {
    return XLSX.read(buf, { type: 'array' });
  } catch {
    throw new ParseError('File tidak bisa dibaca. Pastikan file berformat Excel (.xlsx).');
  }
}

function parseParams(wb: XLSX.WorkBook, warnings: string[]): { params: Params; fromFile: boolean } {
  const ws = wb.Sheets[PARAM_SHEET];
  if (!ws) {
    warnings.push(`Sheet "${PARAM_SHEET}" tidak ditemukan — memakai parameter default.`);
    return { params: DEFAULT_PARAMS, fromFile: false };
  }
  const v = (addr: string): Cell => ws[addr]?.v;
  const ambang = toNumber(v('B3'));
  const skorMin = toNumber(v('B5'));
  const bands: Band[] = [];
  for (let r = 8; r <= 12; r++) {
    const min = toNumber(v(`A${r}`));
    const profil = optText(v(`B${r}`));
    const level = optText(v(`C${r}`));
    if (min === null || !profil || (level !== 'Tinggi' && level !== 'Rendah')) break;
    bands.push({ min, profil, level: level as Level });
  }
  const names = [v('B17'), v('C17'), v('B18'), v('C18')].map(optText);
  const headerOk = optText(v('B16')) === 'Tinggi' && optText(v('C16')) === 'Rendah';

  const problems: string[] = [];
  if (ambang === null) problems.push('ambang FBI (B3)');
  if (skorMin === null) problems.push('skor minimum domain 0 (B5)');
  if (bands.length !== 5) problems.push('pita skor (A8:C12)');
  if (!headerOk || names.some((n) => !n)) problems.push('matriks kuadran (A16:C18)');
  if (problems.length) {
    warnings.push(`Parameter tidak terbaca di "${PARAM_SHEET}": ${problems.join(', ')} — memakai nilai default untuk bagian tersebut.`);
  }
  bands.sort((a, b) => a.min - b.min);
  return {
    params: {
      ambangFbi: ambang ?? DEFAULT_PARAMS.ambangFbi,
      skorMinDomain0: skorMin ?? DEFAULT_PARAMS.skorMinDomain0,
      bands: bands.length === 5 ? bands : DEFAULT_PARAMS.bands,
      kuadran:
        headerOk && names.every(Boolean)
          ? { kritikalTinggi: names[0]!, kritikalRendah: names[1]!, nonTinggi: names[2]!, nonRendah: names[3]! }
          : DEFAULT_PARAMS.kuadran,
    },
    fromFile: problems.length === 0,
  };
}

export function parseWorkbook(wb: XLSX.WorkBook, fileName: string, dataSheet: string): Dataset {
  const ws = wb.Sheets[dataSheet];
  if (!ws) throw new ParseError(`Sheet "${dataSheet}" tidak ditemukan di file.`);
  const rows = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, blankrows: true, defval: null });
  if (rows.length < 2) throw new ParseError(`Sheet "${dataSheet}" kosong.`);

  const header = rows[0].map(norm);
  const col = {} as Record<ColKey, number>;
  for (const key of Object.keys(COLUMNS) as ColKey[]) {
    col[key] = header.findIndex((h) => COLUMNS[key](h));
  }
  const missing = REQUIRED.filter((k) => col[k] < 0).map((k) => `"${LABEL[k]}"`);
  if (missing.length) {
    throw new ParseError(`Kolom wajib tidak ditemukan di baris pertama sheet "${dataSheet}": ${missing.join(', ')}.`);
  }

  const warnings: string[] = [];
  const { params, fromFile } = parseParams(wb, warnings);
  const inputs: PartnerInput[] = [];
  const seen = new Set<string>();
  const get = (r: Cell[], k: ColKey): Cell => (col[k] >= 0 ? r[col[k]] : undefined);

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNo = i + 1;
    if (!r || r.every((c) => c === null || c === '')) continue; // baris kosong diabaikan

    const name = optText(get(r, 'name'));
    const label = name ? `Baris ${rowNo} (${name})` : `Baris ${rowNo}`;
    const errs: string[] = [];
    if (!name) errs.push('Nama Partner kosong');
    const fbi = toNumber(get(r, 'fbi'));
    if (fbi === null || fbi < 0) errs.push('FBI bukan angka ≥ 0');
    const skor = toNumber(get(r, 'skor'));
    if (skor === null) errs.push('Skor Risiko bukan angka');
    const flags = (['pjp', 'intiPembayaran', 'dataPribadi', 'domain0'] as const).map((k) => {
      const b = toYaTidak(get(r, k));
      if (b === null) errs.push(`"${LABEL[k]}" harus Ya/Tidak`);
      return b;
    });
    if (name && seen.has(name.toLowerCase())) errs.push('Nama Partner duplikat');

    if (errs.length) {
      warnings.push(`${label} dilewati: ${errs.join('; ')}.`);
      continue;
    }
    seen.add(name!.toLowerCase());
    const pctRaw = get(r, 'percentage');
    inputs.push({
      row: rowNo,
      name: name!,
      fbi: fbi!,
      skor: skor!,
      pjp: flags[0]!,
      intiPembayaran: flags[1]!,
      dataPribadi: flags[2]!,
      domain0: flags[3]!,
      deskripsi: optText(get(r, 'deskripsi')) ?? '',
      excel: {
        percentage: typeof pctRaw === 'number' ? pctRaw : undefined,
        kelompok: optText(get(r, 'kelompok')),
        profil: optText(get(r, 'profil')),
        level: optText(get(r, 'level')),
        kuadran: optText(get(r, 'kuadran')),
      },
    });
  }

  if (inputs.length === 0) throw new ParseError(`Tidak ada baris partner yang valid di sheet "${dataSheet}".`);

  return {
    fileName,
    sheetName: dataSheet,
    loadedAt: new Date().toISOString(),
    params,
    paramsFromFile: fromFile,
    inputs,
    warnings,
  };
}
