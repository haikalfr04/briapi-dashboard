const intFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 27,1% — desimal koma (NFR-05). */
export function fmtPct(v: number, digits = 1): string {
  return `${new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v * 100)}%`;
}

/** Rp19.631.039.400 */
export const fmtRp = (v: number) => `Rp${intFmt.format(v)}`;

/** Rp19,6 M / Rp350,2 jt — untuk kartu & tooltip yang sempit. */
export function fmtRpShort(v: number): string {
  const f = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);
  if (v >= 1e12) return `Rp${f(v / 1e12)} T`;
  if (v >= 1e9) return `Rp${f(v / 1e9)} M`;
  if (v >= 1e6) return `Rp${f(v / 1e6)} jt`;
  return fmtRp(v);
}

export const fmtInt = (v: number) => intFmt.format(v);

export const fmtNum = (v: number, digits = 2) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
