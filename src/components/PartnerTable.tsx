import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { fmtNum, fmtPct, fmtRp } from '../logic/format';
import type { Partner } from '../logic/types';
import { KELOMPOK_COLORS, kuadranColor, LEVEL_COLORS } from '../theme';
import Badge from './Badge';

type SortKey = 'name' | 'fbi' | 'skor' | 'kelompok' | 'profil' | 'level' | 'kuadran';
const PAGE = 20;

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: 'name', label: 'Nama Partner' },
  { key: 'fbi', label: 'Sum of FBI', num: true },
  { key: 'fbi', label: 'Share FBI', num: true },
  { key: 'skor', label: 'Skor', num: true },
  { key: 'kelompok', label: 'Kritikal/Non' },
  { key: 'profil', label: 'Profil Risiko' },
  { key: 'level', label: 'Level' },
  { key: 'kuadran', label: 'Kuadran' },
];

interface Props {
  partners: Partner[];
  kuadranOrder: string[];
  profils: string[];
  onSelect: (p: Partner) => void;
}

export default function PartnerTable({ partners, kuadranOrder, profils, onSelect }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'fbi', dir: -1 });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    // Kolom kategori diurutkan sesuai urutan bisnis, bukan abjad.
    const rank = (p: Partner): number | string => {
      switch (sort.key) {
        case 'kuadran': return kuadranOrder.indexOf(p.kuadran);
        case 'profil': return profils.indexOf(p.profil);
        case 'kelompok': return p.kelompok === 'Kritikal' ? 0 : 1;
        case 'level': return p.level === 'Tinggi' ? 0 : 1;
        case 'name': return p.name.toLowerCase();
        default: return p[sort.key];
      }
    };
    return [...partners].sort((a, b) => {
      const x = rank(a), y = rank(b);
      return (x < y ? -1 : x > y ? 1 : b.fbi - a.fbi) * (x === y ? 1 : sort.dir);
    });
  }, [partners, sort, kuadranOrder, profils]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = sorted.slice(cur * PAGE, cur * PAGE + PAGE);

  function exportXlsx() {
    const data = sorted.map((p) => ({
      'Nama Partner': p.name,
      'Sum of FBI (Rp)': p.fbi,
      Percentage: p.pct,
      'PJP berizin BI?': p.pjp ? 'Ya' : 'Tidak',
      'Menyentuh tahap inti pembayaran?': p.intiPembayaran ? 'Ya' : 'Tidak',
      'Akses data pribadi skala besar?': p.dataPribadi ? 'Ya' : 'Tidak',
      'Kritikal/Non': p.kelompok,
      'Nilai (Skor Risiko)': p.skor,
      'Ada domain kematangan 0?': p.domain0 ? 'Ya' : 'Tidak',
      'Profil Risiko': p.profil,
      'Level Risiko': p.level,
      Kuadran: p.kuadran,
      Deskripsi: p.deskripsi,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Partner');
    XLSX.writeFile(wb, `partner-terfilter-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <>
      <div className="card__head">
        <h2 className="card__title">Daftar Partner <span className="muted">({partners.length})</span></h2>
        <button className="btn btn--ghost btn--sm" onClick={exportXlsx} disabled={!partners.length}>
          Ekspor ke Excel
        </button>
      </div>
      <div className="table-wrap">
        <table className="table table--hover">
          <thead>
            <tr>
              {COLS.map((c) => {
                const active = sort.key === c.key; // Sum & Share FBI berbagi urutan yang sama
                return (
                  <th key={c.label} className={c.num ? 'num' : undefined} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    <button className="th-sort" onClick={() => {
                      setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : c.num ? -1 : 1 }));
                      setPage(0);
                    }}>
                      {c.label}
                      <span className="th-sort__arrow">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name} onClick={() => onSelect(p)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect(p)}>
                <td className="cell-name">{p.name}</td>
                <td className="num">{fmtRp(p.fbi)}</td>
                <td className="num">{fmtPct(p.pct, 2)}</td>
                <td className="num">{fmtNum(p.skor)}</td>
                <td><Badge color={KELOMPOK_COLORS[p.kelompok]}>{p.kelompok}</Badge></td>
                <td>{p.profil}</td>
                <td><Badge color={LEVEL_COLORS[p.level]}>{p.level}</Badge></td>
                <td><Badge color={kuadranColor(kuadranOrder, p.kuadran)}>{p.kuadran}</Badge></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={COLS.length} className="empty-cell">Tidak ada partner yang cocok dengan filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <button className="btn btn--ghost btn--sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Sebelumnya</button>
          <span>Halaman {cur + 1} dari {pages}</span>
          <button className="btn btn--ghost btn--sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Berikutnya ›</button>
        </div>
      )}
    </>
  );
}
