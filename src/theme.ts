// Warna data. Palet kuadran sudah divalidasi (CVD ΔE ≥ 9,1; normal ΔE ≥ 22,9 untuk pasangan
// bersebelahan). Kuning & tosca < 3:1 terhadap putih → selalu disertai label/legenda + tabel.

export const BRI_BLUE = '#0857c3';

/** Urutan = kuadranOrder(): Top Priority, Closely Monitored, Remediate or Exit, Continuous Monitoring.
 *  Merah/oranye/kuning/hijau seperti di slide PPT tidak lolos cek buta warna (merah↔oranye ΔE 7,1;
 *  hijau↔oranye tertukar untuk protan), jadi dipakai palet tervalidasi dengan arti yang mendekati. */
export const KUADRAN_COLORS = ['#eb6834', '#2a78d6', '#eda100', '#1baf7a'];
/** Varian gelap untuk teks judul kuadran (kontras cukup di atas latar terang). */
export const KUADRAN_INK = ['#a8431a', '#1c5cab', '#7a5300', '#0d6e4b'];

export const KELOMPOK_COLORS: Record<string, string> = {
  Kritikal: '#4a3aa7',
  'Non Kritikal': '#a8a79f',
};

export const LEVEL_COLORS: Record<string, string> = {
  Tinggi: '#e34948',
  Rendah: '#b9b8b0',
};

/** Ramp ordinal biru untuk profil risiko (Low → High), step 250…650. */
export const PROFIL_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

export const PARETO_BAR = '#2a78d6';
export const PARETO_LINE = '#0d366b';

export const INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e8e7e1',
  axis: '#c3c2b7',
  surface: '#ffffff',
};

export function kuadranColor(order: string[], name: string): string {
  const i = order.indexOf(name);
  return KUADRAN_COLORS[i] ?? INK.muted;
}
