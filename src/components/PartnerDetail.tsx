import { useEffect } from 'react';
import { fmtNum, fmtPct, fmtRp } from '../logic/format';
import type { Params, Partner } from '../logic/types';
import { KELOMPOK_COLORS, kuadranColor, LEVEL_COLORS } from '../theme';
import Badge from './Badge';

interface Props {
  partner: Partner | null;
  params: Params;
  kuadranOrder: string[];
  onClose: () => void;
}

export default function PartnerDetail({ partner: p, params, kuadranOrder, onClose }: Props) {
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p, onClose]);

  if (!p) return null;

  const yt = (b: boolean) => (b ? <b className="text-yes">Ya</b> : <span className="muted">Tidak</span>);
  const alasan =
    p.kelompok === 'Non Kritikal'
      ? 'Tidak memenuhi kriteria Kritikal.'
      : [
          p.pct >= params.ambangFbi && `Kontribusi FBI ${fmtPct(p.pct, 2)} ≥ ambang ${fmtPct(params.ambangFbi, 2)}`,
          p.pjp && 'PJP berizin BI',
          p.intiPembayaran && 'Menyentuh tahap inti pembayaran',
          p.dataPribadi && 'Akses data pribadi skala besar',
        ].filter(Boolean).join(' · ');

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Detail ${p.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <h2>{p.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <div className="drawer__badges">
          <Badge color={kuadranColor(kuadranOrder, p.kuadran)}>{p.kuadran}</Badge>
          <Badge color={KELOMPOK_COLORS[p.kelompok]}>{p.kelompok}</Badge>
          <Badge color={LEVEL_COLORS[p.level]}>Risiko {p.level}</Badge>
        </div>

        <dl className="kv">
          <dt>Sum of FBI</dt><dd>{fmtRp(p.fbi)}</dd>
          <dt>Share FBI</dt><dd>{fmtPct(p.pct, 2)}</dd>
          <dt>Skor risiko</dt>
          <dd>
            {fmtNum(p.skor)}
            {p.skorEfektif !== p.skor && <span className="muted"> → efektif {fmtNum(p.skorEfektif)} (ada domain kematangan 0)</span>}
          </dd>
          <dt>Profil risiko</dt><dd>{p.profil}</dd>
        </dl>

        <h3 className="subhead">Kriteria Kritikalitas</h3>
        <dl className="kv">
          <dt>PJP berizin BI</dt><dd>{yt(p.pjp)}</dd>
          <dt>Tahap inti pembayaran</dt><dd>{yt(p.intiPembayaran)}</dd>
          <dt>Data pribadi skala besar</dt><dd>{yt(p.dataPribadi)}</dd>
          <dt>Domain kematangan 0</dt><dd>{yt(p.domain0)}</dd>
          <dt>Alasan</dt><dd>{alasan}</dd>
        </dl>

        {p.deskripsi && (
          <>
            <h3 className="subhead">Deskripsi</h3>
            <p className="desc">{p.deskripsi}</p>
          </>
        )}
        <p className="muted small">Baris {p.row} di sheet sumber.</p>
      </aside>
    </div>
  );
}
