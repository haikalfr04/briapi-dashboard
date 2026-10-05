import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import * as charts from '../components/charts';
import EChart, { type ChartClick } from '../components/EChart';
import FilterBar from '../components/FilterBar';
import PartnerDetail from '../components/PartnerDetail';
import PartnerTable from '../components/PartnerTable';
import QuadrantMatrix from '../components/QuadrantMatrix';
import * as agg from '../logic/aggregations';
import { applyFilters, EMPTY_FILTERS, focusValue, type Filters } from '../logic/filters';
import { fmtPct, fmtRp } from '../logic/format';
import { kuadranOrder, profilOrder } from '../logic/rules';
import type { Partner } from '../logic/types';
import { useData } from '../state/DataContext';
import { KELOMPOK_COLORS, KUADRAN_COLORS, kuadranColor, PROFIL_RAMP } from '../theme';

function ChartCard({ title, hint, footer, children }: { title: string; hint?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="card chart-card" title={hint ? `Tips: ${hint}` : undefined}>
      <header className="chart-card__head">
        <h3 className="card__title">{title}</h3>
        {hint && <span className="chart-card__hint">{hint}</span>}
      </header>
      <div className="chart-card__body">{children}</div>
      {footer}
    </section>
  );
}

function Empty() {
  return <div className="chart-empty">Tidak ada data untuk filter ini.</div>;
}

const ASAL_LAIN_COLOR = '#9085e9';

export default function DashboardPage() {
  const { dataset, partners } = useData();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [ns, setNs] = useState([5, 10, 20]);

  const params = dataset?.params;
  const order = useMemo(() => (params ? kuadranOrder(params) : []), [params]);
  const profils = useMemo(() => (params ? profilOrder(params) : []), [params]);
  const list = useMemo(() => applyFilters(partners, filters), [partners, filters]);

  const view = useMemo(() => {
    if (!params) return null;
    const kua = agg.byKuadran(list, params);
    const kel = agg.byKelompok(list);
    const mat = agg.matrix(list, params);
    const prof = agg.shareByProfil(list, params);
    const top20 = agg.topN(list, 20);
    const top10 = top20.slice(0, 10);
    return {
      kpi: agg.kpis(list, params),
      insights: agg.insights(list, params, fmtPct),
      kua, kel, mat, prof, top20, top10,
      asal: agg.asalKritikal(list),
      conc: agg.concentration(list, ns),
      opt: {
        donut: charts.kuadranDonut(kua, order),
        kuaShare: charts.kuadranShareBar(kua, order),
        profKel: charts.profilKelompokBar(mat),
        profShare: charts.profilShareBar(prof),
        levelKel: charts.levelKelompokBar(kel),
        pareto: charts.paretoChart(top20),
        kelCmp: charts.kelompokCompareBar(kel),
        top10: charts.top10Bar(top10, order),
      },
    };
  }, [list, params, order, ns]);

  // Cross-filter (FR-09): klik mark → fokus ke nilai itu di seluruh dashboard; klik lagi untuk melepas.
  const focusKuadran = useCallback((name: string) => setFilters((f) => focusValue(f, 'kuadran', name)), []);
  const onKuadran = useCallback<ChartClick>((e) => focusKuadran(String(e.name)), [focusKuadran]);
  const onProfil = useCallback<ChartClick>((e) => setFilters((f) => focusValue(f, 'profil', String(e.name))), []);
  const onProfilKel = useCallback<ChartClick>((e) => setFilters((f) => focusValue(focusValue(f, 'profil', String(e.name)), 'kelompok', String(e.seriesName))), []);
  const onKelompokSeries = useCallback<ChartClick>((e) => setFilters((f) => focusValue(f, 'kelompok', String(e.seriesName))), []);
  const onLevelKel = useCallback<ChartClick>(
    (e) => setFilters((f) => focusValue(focusValue(f, 'kelompok', String(e.name)), 'level', String(e.seriesName).replace('Risiko ', ''))),
    [],
  );
  // Pareto & Top 10 sama-sama berurutan dari rank 1, jadi dataIndex = rank - 1.
  const top20 = view?.top20;
  const onRank = useCallback<ChartClick>((e) => {
    const t = top20?.[e.dataIndex];
    if (t) setSelected(t.partner);
  }, [top20]);
  const closeDetail = useCallback(() => setSelected(null), []);

  if (!dataset || !params || !view) {
    return (
      <div className="empty-state card">
        <h2>Belum ada data</h2>
        <p className="muted">Upload file Excel di halaman Input Data untuk menampilkan dashboard.</p>
        <Link className="btn btn--primary" to="/input">Ke halaman Input Data →</Link>
      </div>
    );
  }

  const { kpi, asal } = view;
  const has = list.length > 0;
  const isDummy = /dummy/i.test(dataset.sheetName);
  const chart = (option: (typeof view.opt)[keyof typeof view.opt], onClick: ChartClick, label: string) =>
    has ? <EChart option={option} onClick={onClick} ariaLabel={label} /> : <Empty />;

  return (
    <div className="dashboard">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        kuadranOrder={order}
        kuadranColors={KUADRAN_COLORS}
        profils={profils}
        shown={list.length}
        total={partners.length}
      />

      {/* ===== Layar pertama: dimaksimalkan mengisi tinggi layar ===== */}
      <div className="fold">
        <div className="toprow">
          <section className="kpis" aria-label="Ringkasan">
            <div className="kpi"><span>Total Partner</span><b>{kpi.total}</b></div>
            <div className="kpi"><span>Partner Kritikal</span><b>{kpi.kritikal}</b></div>
            <div className="kpi"><span>% Partner Kritikal</span><b>{fmtPct(kpi.pctKritikal, 0)}</b></div>
            <div className="kpi"><span>Partner Risiko Tinggi</span><b>{kpi.risikoTinggi}</b></div>
            <div className="kpi"><span>Share FBI Kritikal</span><b>{fmtPct(kpi.shareKritikal)}</b></div>
            <div className="kpi"><span>Share FBI {params.kuadran.kritikalTinggi}</span><b>{fmtPct(kpi.shareTopPriority)}</b></div>
          </section>

          <section className="card asal" aria-label="Asal kritikalitas partner kritikal">
            <h3 className="card__title">Asal Kritikalitas Partner Kritikal</h3>
            {asal.total ? (
              <>
                <div className="asal__total"><b>{asal.total}</b> partner Kritikal</div>
                <div className="split__bar" role="img" aria-label={`${asal.fbi} karena FBI, ${asal.lain} karena kriteria lain`}>
                  {asal.fbi > 0 && <div style={{ flex: asal.fbi, background: KELOMPOK_COLORS.Kritikal }} />}
                  {asal.lain > 0 && <div style={{ flex: asal.lain, background: ASAL_LAIN_COLOR }} />}
                </div>
                <div className="asal__nums">
                  <div>
                    <b>{asal.fbi}</b> <span className="muted">({fmtPct(asal.fbi / asal.total, 0)})</span>
                    <span className="asal__lbl"><i style={{ background: KELOMPOK_COLORS.Kritikal }} />FBI ≥ {fmtPct(params.ambangFbi, 2)} dari total</span>
                  </div>
                  <div>
                    <b>{asal.lain}</b> <span className="muted">({fmtPct(asal.lain / asal.total, 0)})</span>
                    <span className="asal__lbl"><i style={{ background: ASAL_LAIN_COLOR }} />Kriteria lain (PJP / tahap inti / data pribadi)</span>
                  </div>
                </div>
              </>
            ) : <Empty />}
          </section>

          <section className="card insights">
            <h3 className="card__title">
              Temuan Utama
              {isDummy && <span className="ribbon">Data fiktif · {dataset.sheetName}</span>}
            </h3>
            {has ? <ul>{view.insights.map((t, i) => <li key={i}>{t}</li>)}</ul> : <Empty />}
          </section>
        </div>

        <div className="chartrow">
          <ChartCard title="Jumlah Partner per Kuadran" hint="klik untuk filter">
            {chart(view.opt.donut, onKuadran, 'Donut jumlah partner per kuadran')}
          </ChartCard>
          <ChartCard title="Share FBI per Kuadran" hint="klik untuk filter">
            {chart(view.opt.kuaShare, onKuadran, 'Bar share FBI per kuadran')}
          </ChartCard>
          <ChartCard title="Level Risiko per Kelompok Kritikalitas" hint="klik untuk filter">
            {chart(view.opt.levelKel, onLevelKel, 'Bar bertumpuk level risiko per kelompok')}
          </ChartCard>
          <ChartCard title="Kritikal vs Non Kritikal: % Partner vs Share FBI" hint="klik untuk filter">
            {chart(view.opt.kelCmp, onKelompokSeries, 'Perbandingan persen partner dan share FBI')}
          </ChartCard>
        </div>

        <div className="chartrow">
          <ChartCard title="Pareto Top 20 Partner: Share FBI & Kumulatif" hint="klik untuk detail">
            {chart(view.opt.pareto, onRank, 'Pareto top 20 partner')}
          </ChartCard>
          <ChartCard
            title="Top 10 Partner berdasarkan Share FBI"
            hint="klik untuk detail"
            footer={has && (
              <div className="legend">
                {order.map((k) => <Badge key={k} color={kuadranColor(order, k)}>{k}</Badge>)}
              </div>
            )}
          >
            {chart(view.opt.top10, onRank, 'Top 10 partner')}
          </ChartCard>
          <ChartCard title="Partner per Profil Risiko: Kritikal vs Non Kritikal" hint="klik untuk filter">
            {chart(view.opt.profKel, onProfilKel, 'Bar jumlah partner per profil risiko')}
          </ChartCard>
          <ChartCard title="Share FBI per Profil Risiko" hint="klik untuk filter">
            {chart(view.opt.profShare, onProfil, 'Bar share FBI per profil risiko')}
          </ChartCard>
        </div>
      </div>

      {/* ===== Di bawah layar pertama (scroll) ===== */}
      <QuadrantMatrix
        partners={list}
        params={params}
        activeKuadran={filters.kuadran}
        onFocusKuadran={focusKuadran}
        onSelect={setSelected}
      />

      <div className="tablerow">
        <section className="card">
          <h2 className="card__title">Top 10 Partner berdasarkan Share FBI</h2>
          <div className="table-wrap">
            <table className="table table--hover table--nowrap">
              <thead>
                <tr><th className="num">#</th><th>Partner</th><th className="num">Share FBI</th><th>Kritikal/Non</th><th>Profil Risiko</th><th>Kuadran</th><th className="num">Kumulatif</th></tr>
              </thead>
              <tbody>
                {view.top10.map((t) => (
                  <tr key={t.partner.name} onClick={() => setSelected(t.partner)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelected(t.partner)}>
                    <td className="num muted">{t.rank}</td>
                    <td className="cell-name" title={fmtRp(t.partner.fbi)}>{t.partner.name}</td>
                    <td className="num">
                      <div className="databar">
                        <div className="databar__track"><div style={{ width: `${(t.partner.pct / view.top10[0].partner.pct) * 100}%` }} /></div>
                        <span>{fmtPct(t.partner.pct)}</span>
                      </div>
                    </td>
                    <td>{t.partner.kelompok}</td>
                    <td>{t.partner.profil}</td>
                    <td><Badge color={kuadranColor(order, t.partner.kuadran)}>{t.partner.kuadran}</Badge></td>
                    <td className="num">{fmtPct(t.cumulative)}</td>
                  </tr>
                ))}
                {!view.top10.length && <tr><td colSpan={7} className="empty-cell">Tidak ada data.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Matriks Kritikalitas × Profil Risiko</h2>
          <div className="table-wrap">
            <table className="table table--matrix">
              <thead>
                <tr>
                  <th>Kritikalitas</th>
                  {view.mat.profils.map((p, i) => (
                    <th key={p} className="num"><span className="th-dot" style={{ background: PROFIL_RAMP[i] }} />{p}</th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {view.mat.rows.map((r) => (
                  <tr key={r.kelompok}>
                    <th scope="row"><Badge color={KELOMPOK_COLORS[r.kelompok]}>{r.kelompok}</Badge></th>
                    {r.cells.map((c, i) => <td key={i} className="num">{c}</td>)}
                    <td className="num"><b>{r.total}</b></td>
                  </tr>
                ))}
                <tr className="row-total">
                  <th scope="row">Total</th>
                  {view.mat.colTotals.map((c, i) => <td key={i} className="num">{c}</td>)}
                  <td className="num"><b>{view.mat.total}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Konsentrasi FBI</h2>
          <p className="card__note">Ubah angka N untuk melihat share FBI Top-N partner.</p>
          <table className="table">
            <thead><tr><th>Segmen</th><th className="num">N Partner</th><th className="num">Share FBI</th></tr></thead>
            <tbody>
              {view.conc.map((c, i) => (
                <tr key={i}>
                  <td>Top {c.n} partner</td>
                  <td className="num">
                    <input
                      className="num-input"
                      type="number"
                      min={1}
                      max={Math.max(1, partners.length)}
                      value={ns[i]}
                      aria-label={`N segmen ${i + 1}`}
                      onChange={(e) => {
                        const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        setNs((cur) => cur.map((x, j) => (j === i ? v : x)));
                      }}
                    />
                  </td>
                  <td className="num"><b>{fmtPct(c.share)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <PartnerTable partners={list} kuadranOrder={order} profils={profils} onSelect={setSelected} />
      </section>

      <PartnerDetail partner={selected} params={params} kuadranOrder={order} onClose={closeDetail} />
    </div>
  );
}
