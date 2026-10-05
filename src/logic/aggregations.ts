import { kuadranOrder, profilOrder } from './rules';
import type { Kelompok, Params, Partner } from './types';

// Catatan FR-18: `pct` tiap partner selalu relatif terhadap total FBI SELURUH partner,
// jadi menjumlahkan `pct` dari daftar yang sudah difilter = share terhadap total keseluruhan.

const sumPct = (list: Partner[]) => list.reduce((s, p) => s + p.pct, 0);
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);
export const KELOMPOK: Kelompok[] = ['Kritikal', 'Non Kritikal'];

export function kpis(list: Partner[], params: Params) {
  const kritikal = list.filter((p) => p.kelompok === 'Kritikal');
  return {
    total: list.length,
    kritikal: kritikal.length,
    pctKritikal: ratio(kritikal.length, list.length),
    risikoTinggi: list.filter((p) => p.level === 'Tinggi').length,
    shareKritikal: sumPct(kritikal),
    shareTopPriority: sumPct(list.filter((p) => p.kuadran === params.kuadran.kritikalTinggi)),
  };
}

export function byKuadran(list: Partner[], params: Params) {
  return kuadranOrder(params).map((kuadran) => {
    const g = list.filter((p) => p.kuadran === kuadran);
    return { kuadran, count: g.length, pctPartner: ratio(g.length, list.length), share: sumPct(g) };
  });
}

export function byKelompok(list: Partner[]) {
  return KELOMPOK.map((kelompok) => {
    const g = list.filter((p) => p.kelompok === kelompok);
    const tinggi = g.filter((p) => p.level === 'Tinggi').length;
    return {
      kelompok,
      count: g.length,
      pctPartner: ratio(g.length, list.length),
      share: sumPct(g),
      tinggi,
      rendah: g.length - tinggi,
      pctTinggi: ratio(tinggi, g.length),
    };
  });
}

/** Matriks Kritikalitas × Profil Risiko (jumlah partner). */
export function matrix(list: Partner[], params: Params) {
  const profils = profilOrder(params);
  const rows = KELOMPOK.map((kelompok) => {
    const cells = profils.map((pr) => list.filter((p) => p.kelompok === kelompok && p.profil === pr).length);
    return { kelompok, cells, total: cells.reduce((a, b) => a + b, 0) };
  });
  const colTotals = profils.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0));
  return { profils, rows, colTotals, total: list.length };
}

export function shareByProfil(list: Partner[], params: Params) {
  return profilOrder(params).map((profil) => {
    const g = list.filter((p) => p.profil === profil);
    return { profil, count: g.length, share: sumPct(g) };
  });
}

export const sortByFbi = (list: Partner[]) => [...list].sort((a, b) => b.fbi - a.fbi);

/** Top-N berdasarkan share FBI, dengan kumulatif. */
export function topN(list: Partner[], n: number) {
  let cum = 0;
  return sortByFbi(list)
    .slice(0, n)
    .map((p, i) => {
      cum += p.pct;
      return { rank: i + 1, partner: p, cumulative: cum };
    });
}

export function concentration(list: Partner[], ns: number[]) {
  const sorted = sortByFbi(list);
  return ns.map((n) => ({ n, share: sumPct(sorted.slice(0, n)) }));
}

export function asalKritikal(list: Partner[]) {
  const kritikal = list.filter((p) => p.kelompok === 'Kritikal');
  const fbi = kritikal.filter((p) => p.asalKritikal === 'fbi').length;
  return { fbi, lain: kritikal.length - fbi, total: kritikal.length };
}

/** FR-06: empat kalimat Temuan Utama (template sama dengan sheet Dashboard). */
export function insights(list: Partner[], params: Params, fmtPct: (v: number, d?: number) => string): string[] {
  const k = params.kuadran;
  const kua = byKuadran(list, params);
  const tp = kua.find((x) => x.kuadran === k.kritikalTinggi)!;
  const re = kua.find((x) => x.kuadran === k.nonTinggi)!;
  const [kr, non] = byKelompok(list);
  const top10 = concentration(list, [10])[0];
  const asal = asalKritikal(list);
  return [
    `${tp.count} partner (${fmtPct(tp.pctPartner, 0)}) berada di kuadran ${k.kritikalTinggi} dan menguasai ${fmtPct(tp.share)} dari total FBI.`,
    `Top 10 partner menyumbang ${fmtPct(top10.share)} FBI; ${asal.fbi} partner Kritikal karena FBI di atas ambang, ${asal.lain} lainnya karena kriteria non-FBI.`,
    `${fmtPct(kr.pctTinggi)} partner Kritikal berisiko tinggi, dibanding ${fmtPct(non.pctTinggi)} pada Non Kritikal.`,
    `${non.tinggi} partner Non Kritikal berisiko tinggi masuk ${k.nonTinggi} (${fmtPct(re.share)} FBI); ${kr.tinggi} partner Kritikal berisiko tinggi masuk ${k.kritikalTinggi}.`,
  ];
}
