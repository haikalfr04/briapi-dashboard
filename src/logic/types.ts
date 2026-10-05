export type Level = 'Tinggi' | 'Rendah';
export type Kelompok = 'Kritikal' | 'Non Kritikal';

/** Kolom input dari sheet Data Dummy (yang bukan hasil rumus). */
export interface PartnerInput {
  row: number; // nomor baris di Excel, untuk pesan validasi
  name: string;
  fbi: number;
  pjp: boolean;
  intiPembayaran: boolean;
  dataPribadi: boolean;
  skor: number;
  domain0: boolean;
  deskripsi: string;
  /** Nilai kolom turunan seperti tertulis di Excel — hanya untuk cek selisih (FR-03). */
  excel: {
    percentage?: number;
    kelompok?: string;
    profil?: string;
    level?: string;
    kuadran?: string;
  };
}

export type AsalKritikal = 'fbi' | 'lain';

export interface Partner extends PartnerInput {
  pct: number;
  kelompok: Kelompok;
  asalKritikal: AsalKritikal | null;
  skorEfektif: number;
  profil: string;
  level: Level;
  kuadran: string;
}

export interface Band {
  min: number;
  profil: string;
  level: Level;
}

export interface Params {
  ambangFbi: number;
  skorMinDomain0: number;
  /** Urut naik berdasarkan `min`. */
  bands: Band[];
  kuadran: {
    kritikalTinggi: string;
    kritikalRendah: string;
    nonTinggi: string;
    nonRendah: string;
  };
}

export interface Dataset {
  fileName: string;
  sheetName: string;
  loadedAt: string; // ISO
  params: Params;
  paramsFromFile: boolean;
  inputs: PartnerInput[];
  warnings: string[];
}
