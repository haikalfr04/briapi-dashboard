import type { Band, Level, Params, Partner, PartnerInput } from './types';

/** Nilai default = sheet "Parameter Dummy" (acuan PPT Matriks Keputusan Partner, slide 5). */
export const DEFAULT_PARAMS: Params = {
  ambangFbi: 0.005,
  skorMinDomain0: 3.5,
  bands: [
    { min: 0, profil: 'Low', level: 'Rendah' },
    { min: 1.5, profil: 'Low To Moderate', level: 'Rendah' },
    { min: 3, profil: 'Moderate', level: 'Tinggi' },
    { min: 3.5, profil: 'Moderate To High', level: 'Tinggi' },
    { min: 4.5, profil: 'High', level: 'Tinggi' },
  ],
  kuadran: {
    kritikalTinggi: 'Top Priority',
    kritikalRendah: 'Closely Monitored',
    nonTinggi: 'Remediate or Exit',
    nonRendah: 'Continuous Monitoring',
  },
};

/** Urutan tampil kuadran (sama dengan sheet Dashboard Data). */
export function kuadranOrder(p: Params): string[] {
  const k = p.kuadran;
  return [k.kritikalTinggi, k.kritikalRendah, k.nonTinggi, k.nonRendah];
}

export function profilOrder(p: Params): string[] {
  return p.bands.map((b) => b.profil);
}

/** BR-04: pita skor → profil & level. */
export function bandFor(skor: number, bands: Band[]): Band {
  let found = bands[0];
  for (const b of bands) if (skor >= b.min) found = b;
  return found;
}

/** BR-01..BR-06: hitung semua kolom turunan untuk seluruh partner. */
export function classify(inputs: PartnerInput[], p: Params): Partner[] {
  const totalFbi = inputs.reduce((s, r) => s + r.fbi, 0);
  return inputs.map((r) => {
    const pct = totalFbi > 0 ? r.fbi / totalFbi : 0; // BR-01
    const fbiKritikal = pct >= p.ambangFbi;
    const kritikal = fbiKritikal || r.pjp || r.intiPembayaran || r.dataPribadi; // BR-02
    const skorEfektif = r.domain0 ? Math.max(r.skor, p.skorMinDomain0) : r.skor; // BR-03
    const band = bandFor(skorEfektif, p.bands); // BR-04
    const level: Level = band.level;
    const k = p.kuadran; // BR-05
    const kuadran = kritikal
      ? level === 'Tinggi' ? k.kritikalTinggi : k.kritikalRendah
      : level === 'Tinggi' ? k.nonTinggi : k.nonRendah;
    return {
      ...r,
      pct,
      kelompok: kritikal ? 'Kritikal' : 'Non Kritikal',
      asalKritikal: kritikal ? (fbiKritikal ? 'fbi' : 'lain') : null, // BR-06
      skorEfektif,
      profil: band.profil,
      level,
      kuadran,
    };
  });
}

/** FR-03: partner yang kolom turunannya di Excel berbeda dengan hasil hitung aplikasi. */
export function findMismatches(partners: Partner[]): { name: string; fields: string[] }[] {
  const out: { name: string; fields: string[] }[] = [];
  for (const p of partners) {
    const e = p.excel;
    const fields: string[] = [];
    if (e.percentage !== undefined && Math.abs(e.percentage - p.pct) > 1e-6) fields.push('Percentage');
    if (e.kelompok !== undefined && e.kelompok !== p.kelompok) fields.push('Kritikal/Non');
    if (e.profil !== undefined && e.profil !== p.profil) fields.push('Profil Risiko');
    if (e.level !== undefined && e.level !== p.level) fields.push('Level Risiko');
    if (e.kuadran !== undefined && e.kuadran !== p.kuadran) fields.push('Kuadran');
    if (fields.length) out.push({ name: p.name, fields });
  }
  return out;
}
