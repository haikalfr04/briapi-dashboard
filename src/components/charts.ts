import type { EChartsOption } from 'echarts';
import type * as agg from '../logic/aggregations';
import { fmtInt, fmtPct, fmtRpShort } from '../logic/format';
import { INK, KELOMPOK_COLORS, kuadranColor, LEVEL_COLORS, PARETO_BAR, PARETO_LINE, PROFIL_RAMP } from '../theme';

// Spesifikasi mark: bar tipis dengan ujung membulat 4px, celah 2px warna permukaan antar-isian,
// grid/axis tipis & samar, tooltip di setiap mark, label hanya selektif.

type Kua = ReturnType<typeof agg.byKuadran>;
type Kel = ReturnType<typeof agg.byKelompok>;
type Mat = ReturnType<typeof agg.matrix>;
type Prof = ReturnType<typeof agg.shareByProfil>;
type Top = ReturnType<typeof agg.topN>;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const RADIUS_V: [number, number, number, number] = [4, 4, 0, 0];
const RADIUS_H: [number, number, number, number] = [0, 4, 4, 0];

const base = (): EChartsOption => ({
  textStyle: { fontFamily: FONT, color: INK.secondary },
  animationDuration: 300,
  tooltip: {
    backgroundColor: '#fff',
    borderColor: INK.grid,
    padding: [8, 12],
    textStyle: { color: INK.primary, fontSize: 12, fontFamily: FONT },
    extraCssText: 'box-shadow:0 4px 14px rgba(0,0,0,.10);border-radius:8px;',
  },
});

const valueAxis = (fmt: (v: number) => string, extra: object = {}) => ({
  type: 'value' as const,
  axisLabel: { formatter: fmt, color: INK.muted, fontSize: 11 },
  splitLine: { lineStyle: { color: INK.grid } },
  axisLine: { show: false },
  ...extra,
});

const catAxis = (data: string[], extra: object = {}) => ({
  type: 'category' as const,
  data,
  axisLine: { lineStyle: { color: INK.axis } },
  axisTick: { show: false },
  axisLabel: { color: INK.secondary, fontSize: 11, interval: 0 },
  ...extra,
});

const legendTop = { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 12 } };
const pct0 = (v: number) => fmtPct(v, 0);
const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>`;

/** G1 — Jumlah Partner per Kuadran (donut, ≤ 4 irisan). */
export function kuadranDonut(data: Kua, order: string[]): EChartsOption {
  const total = data.reduce((s, d) => s + d.count, 0);
  const centerText = (left: string, top: string) => [{
    type: 'text' as const, left, top,
    style: {
      text: `{n|${fmtInt(total)}}\n{l|partner}`, align: 'center' as const, verticalAlign: 'middle' as const,
      rich: {
        n: { fontSize: 18, fontWeight: 600, fill: INK.primary, fontFamily: FONT, lineHeight: 20 },
        l: { fontSize: 11, fill: INK.muted, fontFamily: FONT, lineHeight: 14 },
      },
    },
  }];
  // Kartu lebar: legenda di kanan. Kartu sempit (< 420px): legenda pindah ke bawah agar tidak menimpa donut.
  return {
    baseOption: {
      ...base(),
      tooltip: {
        ...base().tooltip,
        trigger: 'item',
        formatter: (p: any) => `${dot(p.color)}<b>${p.name}</b><br/>${fmtInt(p.value)} partner · ${fmtPct(p.value / (total || 1))}`,
      },
      legend: {
        orient: 'vertical', right: 4, top: 'middle', icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 8, selectedMode: false,
        textStyle: { color: INK.secondary, fontSize: 12 },
        formatter: (name: string) => {
          const d = data.find((x) => x.kuadran === name);
          return `${name}   ${d ? fmtInt(d.count) : 0}`;
        },
      },
      graphic: centerText('26%', 'middle'),
      series: [{
        type: 'pie', radius: ['50%', '74%'], center: ['29%', '50%'], cursor: 'pointer',
        label: { show: false }, labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        emphasis: { scale: true, scaleSize: 4 },
        data: data.map((d) => ({ name: d.kuadran, value: d.count, itemStyle: { color: kuadranColor(order, d.kuadran) } })),
      }],
    },
    media: [{
      query: { maxWidth: 420 },
      option: {
        legend: { orient: 'horizontal', left: 'center', right: 'auto', top: 'auto', bottom: 0, itemGap: 10 },
        graphic: centerText('center', '40%'),
        series: [{ center: ['50%', '40%'], radius: ['42%', '64%'] }],
      },
    }],
  } as EChartsOption;
}

/** "Remediate or Exit" → "Remediate\nor Exit" supaya label sumbu tidak bertabrakan di kartu sempit. */
const twoLines = (s: string) => s.replace(' ', '\n');

/** G2 — Share FBI per Kuadran. */
export function kuadranShareBar(data: Kua, order: string[]): EChartsOption {
  return {
    ...base(),
    grid: { left: 44, right: 12, top: 24, bottom: 44 },
    tooltip: {
      ...base().tooltip, trigger: 'item',
      formatter: (p: any) => {
        const d = data[p.dataIndex];
        return `${dot(p.color)}<b>${d.kuadran}</b><br/>Share FBI ${fmtPct(d.share)}<br/>${fmtInt(d.count)} partner`;
      },
    },
    xAxis: catAxis(data.map((d) => d.kuadran), { axisLabel: { color: INK.secondary, fontSize: 11, interval: 0, lineHeight: 13, formatter: twoLines } }),
    yAxis: valueAxis(pct0),
    series: [{
      type: 'bar', barMaxWidth: 36, cursor: 'pointer',
      label: { show: true, position: 'top', color: INK.primary, fontSize: 11, formatter: (p: any) => fmtPct(p.value) },
      data: data.map((d) => ({ value: d.share, itemStyle: { color: kuadranColor(order, d.kuadran), borderRadius: RADIUS_V } })),
    }],
  };
}

/** G4 — Partner per Profil Risiko: Kritikal vs Non Kritikal (bar berkelompok). */
export function profilKelompokBar(m: Mat): EChartsOption {
  return {
    ...base(),
    legend: { ...legendTop, selectedMode: false },
    grid: { left: 36, right: 8, top: 32, bottom: 44 },
    tooltip: { ...base().tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } } },
    xAxis: catAxis(m.profils, { axisLabel: { color: INK.secondary, fontSize: 11, interval: 0, width: 70, overflow: 'break' } }),
    yAxis: valueAxis((v) => fmtInt(v), { minInterval: 1 }),
    series: m.rows.map((r) => ({
      name: r.kelompok, type: 'bar' as const, barMaxWidth: 20, barGap: '12%', cursor: 'pointer',
      itemStyle: { color: KELOMPOK_COLORS[r.kelompok], borderRadius: RADIUS_V },
      data: r.cells,
    })),
  };
}

/** G5 — Share FBI per Profil Risiko (kategori berurutan → ramp ordinal). */
export function profilShareBar(data: Prof): EChartsOption {
  return {
    ...base(),
    grid: { left: 44, right: 12, top: 24, bottom: 44 },
    tooltip: {
      ...base().tooltip, trigger: 'item',
      formatter: (p: any) => {
        const d = data[p.dataIndex];
        return `${dot(p.color)}<b>${d.profil}</b><br/>Share FBI ${fmtPct(d.share)}<br/>${fmtInt(d.count)} partner`;
      },
    },
    xAxis: catAxis(data.map((d) => d.profil), { axisLabel: { color: INK.secondary, fontSize: 11, interval: 0, width: 70, overflow: 'break' } }),
    yAxis: valueAxis(pct0),
    series: [{
      type: 'bar', barMaxWidth: 36, cursor: 'pointer',
      label: { show: true, position: 'top', color: INK.primary, fontSize: 11, formatter: (p: any) => fmtPct(p.value) },
      data: data.map((d, i) => ({ value: d.share, itemStyle: { color: PROFIL_RAMP[i] ?? PROFIL_RAMP[PROFIL_RAMP.length - 1], borderRadius: RADIUS_V } })),
    }],
  };
}

/** G6 — Level Risiko per Kelompok Kritikalitas (bar bertumpuk horizontal). */
export function levelKelompokBar(data: Kel): EChartsOption {
  const seg = (name: 'Tinggi' | 'Rendah', key: 'tinggi' | 'rendah', last: boolean) => ({
    name: `Risiko ${name}`, type: 'bar' as const, stack: 'lvl', barMaxWidth: 34, cursor: 'pointer',
    itemStyle: { color: LEVEL_COLORS[name], borderColor: '#fff', borderWidth: 1, borderRadius: last ? RADIUS_H : 0 },
    label: {
      show: true, position: 'inside' as const, fontSize: 11,
      color: name === 'Tinggi' ? '#fff' : INK.primary,
      formatter: (p: any) => (p.value >= 6 ? fmtInt(p.value) : ''),
    },
    data: data.map((d) => d[key]),
  });
  return {
    ...base(),
    legend: { ...legendTop, selectedMode: false },
    grid: { left: 84, right: 16, top: 32, bottom: 24 },
    tooltip: {
      ...base().tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      formatter: (ps: any) => {
        const d = data[ps[0].dataIndex];
        return `<b>${d.kelompok}</b> · ${fmtInt(d.count)} partner<br/>${dot(LEVEL_COLORS.Tinggi)}Risiko Tinggi ${fmtInt(d.tinggi)} (${fmtPct(d.pctTinggi)})<br/>${dot(LEVEL_COLORS.Rendah)}Risiko Rendah ${fmtInt(d.rendah)}`;
      },
    },
    xAxis: valueAxis((v) => fmtInt(v), { minInterval: 1 }),
    yAxis: catAxis(data.map((d) => d.kelompok), { inverse: true }),
    series: [seg('Tinggi', 'tinggi', false), seg('Rendah', 'rendah', true)],
  };
}

/** G7 — Pareto Top 20: bar share + garis kumulatif pada SATU sumbu persen. */
export function paretoChart(top: Top): EChartsOption {
  const last = top.length - 1;
  return {
    ...base(),
    legend: { ...legendTop, selectedMode: false, data: ['Share FBI', 'Kumulatif'] },
    grid: { left: 44, right: 16, top: 32, bottom: 28 },
    tooltip: {
      ...base().tooltip, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: INK.axis } },
      formatter: (ps: any) => {
        const t = top[ps[0].dataIndex];
        return `<b>#${t.rank} ${t.partner.name}</b><br/>${dot(PARETO_BAR)}Share FBI ${fmtPct(t.partner.pct)} · ${fmtRpShort(t.partner.fbi)}<br/>${dot(PARETO_LINE)}Kumulatif ${fmtPct(t.cumulative)}`;
      },
    },
    xAxis: catAxis(top.map((t) => String(t.rank))),
    yAxis: valueAxis(pct0, { max: 1 }),
    series: [
      {
        name: 'Share FBI', type: 'bar', barMaxWidth: 16, cursor: 'pointer',
        itemStyle: { color: PARETO_BAR, borderRadius: RADIUS_V },
        data: top.map((t) => t.partner.pct),
      },
      {
        name: 'Kumulatif', type: 'line', symbol: 'circle', symbolSize: 6, showSymbol: false,
        lineStyle: { width: 2, color: PARETO_LINE }, itemStyle: { color: PARETO_LINE },
        // Label selektif: hanya titik terakhir (total kumulatif Top-N).
        endLabel: {
          show: last >= 0, color: INK.primary, fontSize: 11, fontWeight: 600, offset: [-28, -14],
          formatter: (p: any) => fmtPct(p.value),
        },
        data: top.map((t) => t.cumulative),
      },
    ],
  };
}

/** G8 — Kritikal vs Non Kritikal: % Partner vs Share FBI. */
export function kelompokCompareBar(data: Kel): EChartsOption {
  return {
    ...base(),
    legend: { ...legendTop, selectedMode: false },
    grid: { left: 44, right: 12, top: 32, bottom: 28 },
    tooltip: {
      ...base().tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      formatter: (ps: any) =>
        `<b>${ps[0].name}</b><br/>` + ps.map((p: any) => `${dot(p.color)}${p.seriesName} ${fmtPct(p.value)}`).join('<br/>'),
    },
    xAxis: catAxis(['% Partner', 'Share FBI']),
    yAxis: valueAxis(pct0, { max: 1 }),
    series: data.map((d) => ({
      name: d.kelompok, type: 'bar' as const, barMaxWidth: 36, barGap: '8%', cursor: 'pointer',
      itemStyle: { color: KELOMPOK_COLORS[d.kelompok], borderRadius: RADIUS_V },
      label: { show: true, position: 'top' as const, color: INK.primary, fontSize: 11, formatter: (p: any) => fmtPct(p.value) },
      data: [d.pctPartner, d.share],
    })),
  };
}

/** G9 — Top 10 Partner berdasarkan Share FBI (warna = kuadran). */
export function top10Bar(top: Top, order: string[]): EChartsOption {
  return {
    ...base(),
    grid: { left: 172, right: 52, top: 4, bottom: 8 },
    tooltip: {
      ...base().tooltip, trigger: 'item',
      formatter: (p: any) => {
        const t = top[p.dataIndex];
        return `<b>#${t.rank} ${t.partner.name}</b><br/>Share FBI ${fmtPct(t.partner.pct)} · ${fmtRpShort(t.partner.fbi)}<br/>${dot(p.color)}${t.partner.kuadran}`;
      },
    },
    xAxis: valueAxis(pct0, { show: false }),
    yAxis: catAxis(top.map((t) => t.partner.name), {
      inverse: true,
      axisLabel: { color: INK.secondary, fontSize: 11, width: 160, overflow: 'truncate' },
    }),
    series: [{
      type: 'bar', barMaxWidth: 16, cursor: 'pointer',
      label: { show: true, position: 'right', color: INK.primary, fontSize: 11, formatter: (p: any) => fmtPct(p.value) },
      data: top.map((t) => ({ value: t.partner.pct, itemStyle: { color: kuadranColor(order, t.partner.kuadran), borderRadius: RADIUS_H } })),
    }],
  };
}
