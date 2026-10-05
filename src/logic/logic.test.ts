import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import * as agg from './aggregations';
import { fmtPct } from './format';
import { DEFAULT_DATA_SHEET, ParseError, parseWorkbook, readWorkbook } from './parseExcel';
import { classify, DEFAULT_PARAMS, findMismatches } from './rules';

// Angka acuan = REQUIREMENTS.md bagian 8 (hasil sheet Dashboard di Excel).
const XLSX_PATH = resolve(__dirname, '../../../BRIAPI 2026 - Data Kuadran Patner.xlsx');

function load() {
  const buf = readFileSync(XLSX_PATH);
  const wb = readWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const ds = parseWorkbook(wb, 'test.xlsx', DEFAULT_DATA_SHEET);
  return { ds, partners: classify(ds.inputs, ds.params) };
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

// File Excel tidak ikut di repo (lihat .gitignore), jadi di GitHub Actions bagian ini dilewati.
describe.skipIf(!existsSync(XLSX_PATH))('file Excel BRIAPI 2026 (Data Dummy)', () => {
  const { ds, partners } = existsSync(XLSX_PATH) ? load() : ({} as ReturnType<typeof load>);
  const p = ds?.params;

  it('membaca 200 partner dan parameter dari file tanpa peringatan', () => {
    expect(ds.inputs).toHaveLength(200);
    expect(ds.warnings).toEqual([]);
    expect(ds.paramsFromFile).toBe(true);
    expect(p).toEqual(DEFAULT_PARAMS);
  });

  it('hasil hitung aplikasi sama dengan kolom turunan di Excel (0 selisih)', () => {
    expect(findMismatches(partners)).toEqual([]);
  });

  it('KPI', () => {
    const k = agg.kpis(partners, p);
    expect([k.total, k.kritikal, k.risikoTinggi]).toEqual([200, 52, 51]);
    expect(round(k.pctKritikal)).toBe(0.26);
    expect(round(k.shareKritikal)).toBe(0.787);
    expect(round(k.shareTopPriority)).toBe(0.271);
  });

  it('sebaran per kuadran', () => {
    expect(agg.byKuadran(partners, p).map((x) => [x.kuadran, x.count, round(x.share)])).toEqual([
      ['Top Priority', 24, 0.271],
      ['Closely Monitored', 28, 0.516],
      ['Remediate or Exit', 27, 0.044],
      ['Continuous Monitoring', 121, 0.169],
    ]);
  });

  it('matriks kritikalitas × profil risiko & share per profil', () => {
    const m = agg.matrix(partners, p);
    expect(m.rows.map((r) => r.cells)).toEqual([
      [3, 25, 9, 14, 1],
      [45, 76, 13, 14, 0],
    ]);
    expect(agg.shareByProfil(partners, p).map((x) => round(x.share))).toEqual([0.09, 0.594, 0.18, 0.134, 0.001]);
  });

  it('konsentrasi, asal kritikalitas, risiko tinggi per kelompok', () => {
    expect(agg.concentration(partners, [5, 10, 20]).map((x) => round(x.share))).toEqual([0.508, 0.617, 0.716]);
    expect(agg.asalKritikal(partners)).toEqual({ fbi: 26, lain: 26, total: 52 });
    expect(agg.byKelompok(partners).map((x) => round(x.pctTinggi))).toEqual([0.462, 0.182]);
  });

  it('top 10 dan temuan utama sama dengan sheet Dashboard', () => {
    const top = agg.topN(partners, 10);
    expect(top[0].partner.name).toBe('PT Espay Debit Indonesia Koe');
    expect(round(top[9].cumulative)).toBe(0.617);
    expect(agg.insights(partners, p, fmtPct)).toEqual([
      '24 partner (12%) berada di kuadran Top Priority dan menguasai 27,1% dari total FBI.',
      'Top 10 partner menyumbang 61,7% FBI; 26 partner Kritikal karena FBI di atas ambang, 26 lainnya karena kriteria non-FBI.',
      '46,2% partner Kritikal berisiko tinggi, dibanding 18,2% pada Non Kritikal.',
      '27 partner Non Kritikal berisiko tinggi masuk Remediate or Exit (4,4% FBI); 24 partner Kritikal berisiko tinggi masuk Top Priority.',
    ]);
  });

  it('filter kuadran Top Priority → 24 partner', () => {
    expect(partners.filter((x) => x.kuadran === 'Top Priority')).toHaveLength(24);
  });
});

describe('validasi input', () => {
  const sheet = (rows: unknown[][]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Data Dummy');
    return wb;
  };
  const H = ['Nama Partner', 'Sum of FBI (Rp)', 'PJP berizin BI?', 'Menyentuh tahap inti pembayaran?',
    'Akses data pribadi skala besar?', 'Nilai (Skor Risiko)', 'Ada domain kematangan 0?'];

  it('file bukan Excel → error jelas', () => {
    expect(() => readWorkbook(new TextEncoder().encode('bukan excel').buffer as ArrayBuffer)).toThrow(ParseError);
  });

  it('kolom wajib hilang → error jelas', () => {
    expect(() => parseWorkbook(sheet([['Nama Partner', 'FBI']]), 'x', 'Data Dummy')).toThrow(ParseError);
  });

  it('baris salah dilewati dengan peringatan, baris valid tetap diproses, default parameter dipakai', () => {
    const ds = parseWorkbook(
      sheet([H, ['A', 100, 'Ya', 'Tidak', 'Tidak', 2, 'Tidak'], ['B', 'abc', 'Ya', 'x', 'Tidak', 2, 'Tidak'], [], ['A', 5, 'Tidak', 'Tidak', 'Tidak', 1, 'Ya']]),
      'x', 'Data Dummy',
    );
    expect(ds.inputs.map((r) => r.name)).toEqual(['A']);
    expect(ds.warnings.some((w) => w.includes('Baris 3 (B)'))).toBe(true);
    expect(ds.warnings.some((w) => w.includes('duplikat'))).toBe(true);
    expect(ds.params).toEqual(DEFAULT_PARAMS);
  });

  it('domain kematangan 0 menaikkan skor efektif ke 3,5 (Moderate To High)', () => {
    const ds = parseWorkbook(sheet([H, ['A', 1, 'Tidak', 'Tidak', 'Tidak', 1.2, 'Ya']]), 'x', 'Data Dummy');
    const [a] = classify(ds.inputs, ds.params);
    expect([a.skorEfektif, a.profil, a.level, a.kelompok, a.kuadran]).toEqual([3.5, 'Moderate To High', 'Tinggi', 'Kritikal', 'Top Priority']);
  });
});
