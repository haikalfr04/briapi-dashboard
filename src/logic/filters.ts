import type { Partner } from './types';

export interface Filters {
  kuadran: string[];
  kelompok: string[];
  profil: string[];
  level: string[];
  skorMin: number | null;
  skorMax: number | null;
  q: string;
}

export type ListKey = 'kuadran' | 'kelompok' | 'profil' | 'level';

export const EMPTY_FILTERS: Filters = { kuadran: [], kelompok: [], profil: [], level: [], skorMin: null, skorMax: null, q: '' };

export function applyFilters(list: Partner[], f: Filters): Partner[] {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (p) =>
      (!f.kuadran.length || f.kuadran.includes(p.kuadran)) &&
      (!f.kelompok.length || f.kelompok.includes(p.kelompok)) &&
      (!f.profil.length || f.profil.includes(p.profil)) &&
      (!f.level.length || f.level.includes(p.level)) &&
      (f.skorMin === null || p.skor >= f.skorMin) &&
      (f.skorMax === null || p.skor <= f.skorMax) &&
      (!q || p.name.toLowerCase().includes(q)),
  );
}

export function activeCount(f: Filters): number {
  return f.kuadran.length + f.kelompok.length + f.profil.length + f.level.length +
    (f.skorMin !== null ? 1 : 0) + (f.skorMax !== null ? 1 : 0) + (f.q.trim() ? 1 : 0);
}

/** Klik chip: tambah/hapus satu nilai. */
export function toggleValue(f: Filters, key: ListKey, value: string): Filters {
  const cur = f[key];
  return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
}

/** Klik grafik (cross-filter): pilih hanya nilai itu; klik lagi untuk melepas. */
export function focusValue(f: Filters, key: ListKey, value: string): Filters {
  const cur = f[key];
  return { ...f, [key]: cur.length === 1 && cur[0] === value ? [] : [value] };
}
