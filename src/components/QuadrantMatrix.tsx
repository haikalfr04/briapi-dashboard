import { useMemo } from 'react';
import { sortByFbi } from '../logic/aggregations';
import { fmtPct } from '../logic/format';
import type { Params, Partner } from '../logic/types';
import { KUADRAN_COLORS, KUADRAN_INK } from '../theme';

type Role = keyof Params['kuadran'];

/** Arahan tindakan per kuadran (acuan: PPT Matriks Keputusan Partner). */
const ACTION: Record<Role, string> = {
  nonTinggi:
    'Beri tenggat perbaikan yang tegas (30 hari untuk High, 60 hari untuk Moderate to High). Lewat tenggat → masuk daftar terminasi.',
  kritikalTinggi:
    'Mitigasi segera, eskalasi ke manajemen senior, bekukan penambahan limit. Siapkan rencana kontinjensi sebelum opsi terminasi dibahas.',
  nonRendah:
    'Review tahunan dengan kuesioner ringkas. Jangan habiskan sumber daya assessment di kuadran ini.',
  kritikalRendah:
    'Review lebih sering dari siklus normal, uji BCP/DRP berkala, pantau perubahan kepemilikan — substitusinya sulit.',
};

const META: Record<Role, string> = {
  nonTinggi: 'Non-Kritikal · Risiko Tinggi',
  kritikalTinggi: 'Kritikal · Risiko Tinggi',
  nonRendah: 'Non-Kritikal · Risiko Rendah',
  kritikalRendah: 'Kritikal · Risiko Rendah',
};

/** Posisi di grid 2×2 (baris = risiko, kolom = kritikalitas) seperti di slide. */
const LAYOUT: Role[] = ['nonTinggi', 'kritikalTinggi', 'nonRendah', 'kritikalRendah'];
/** Indeks warna mengikuti kuadranOrder(): TP, CM, RoE, CoM. */
const COLOR_INDEX: Record<Role, number> = { kritikalTinggi: 0, kritikalRendah: 1, nonTinggi: 2, nonRendah: 3 };

interface Props {
  partners: Partner[];
  params: Params;
  activeKuadran: string[];
  onFocusKuadran: (name: string) => void;
  onSelect: (p: Partner) => void;
}

export default function QuadrantMatrix({ partners, params, activeKuadran, onFocusKuadran, onSelect }: Props) {
  const groups = useMemo(() => {
    const sorted = sortByFbi(partners);
    return Object.fromEntries(
      LAYOUT.map((role) => [role, sorted.filter((p) => p.kuadran === params.kuadran[role])]),
    ) as Record<Role, Partner[]>;
  }, [partners, params]);

  return (
    <section className="card qm">
      <div className="card__head">
        <div>
          <h2 className="card__title">Matriks Keputusan Partner</h2>
          <p className="card__note">Partner diurutkan dari share FBI terbesar · klik nama untuk detail · klik judul kuadran untuk memfilter dashboard</p>
        </div>
      </div>

      <div className="qm__grid">
        <div className="qm__axis qm__axis--x" style={{ gridArea: 'xn' }}>Non-Kritikal</div>
        <div className="qm__axis qm__axis--x" style={{ gridArea: 'xk' }}>Kritikal</div>
        <div className="qm__axis qm__axis--y" style={{ gridArea: 'yt' }}><span>Risiko Tinggi</span></div>
        <div className="qm__axis qm__axis--y" style={{ gridArea: 'yr' }}><span>Risiko Rendah</span></div>

        {LAYOUT.map((role, i) => {
          const name = params.kuadran[role];
          const list = groups[role];
          const ci = COLOR_INDEX[role];
          const color = KUADRAN_COLORS[ci];
          const share = list.reduce((s, p) => s + p.pct, 0);
          const on = activeKuadran.length === 1 && activeKuadran[0] === name;
          return (
            <article
              key={role}
              className={`qm__box${on ? ' is-on' : ''}`}
              style={{ gridArea: `q${i}`, borderColor: color, background: `color-mix(in srgb, ${color} 9%, #fff)` }}
            >
              <button className="qm__title" style={{ color: KUADRAN_INK[ci] }} onClick={() => onFocusKuadran(name)} aria-pressed={on}>
                {name}
              </button>
              <div className="qm__meta">{META[role]}</div>
              <p className="qm__desc">{ACTION[role]}</p>
              <div className="qm__stats">
                <span><b>{list.length}</b> partner</span>
                <span><b>{fmtPct(share)}</b> dari total FBI</span>
              </div>
              {list.length ? (
                <ul className="qm__list">
                  {list.map((p) => (
                    <li key={p.name}>
                      <button onClick={() => onSelect(p)} title={p.name}>
                        <i style={{ background: color }} />
                        <span className="qm__name">{p.name}</span>
                        <span className="qm__pct">{fmtPct(p.pct, 2)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="qm__empty">Tidak ada partner untuk filter ini.</p>
              )}
            </article>
          );
        })}

        <div className="qm__axis qm__axis--foot" style={{ gridArea: 'ft' }}>Tingkat Kritikalitas Partner →</div>
      </div>
    </section>
  );
}
