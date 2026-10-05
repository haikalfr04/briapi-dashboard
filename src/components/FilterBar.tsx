import { KELOMPOK } from '../logic/aggregations';
import { activeCount, EMPTY_FILTERS, toggleValue, type Filters, type ListKey } from '../logic/filters';
import { KELOMPOK_COLORS, LEVEL_COLORS, PROFIL_RAMP } from '../theme';
import MultiSelect from './MultiSelect';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  kuadranOrder: string[];
  kuadranColors: string[];
  profils: string[];
  shown: number;
  total: number;
}

export default function FilterBar({ filters, onChange, kuadranOrder, kuadranColors, profils, shown, total }: Props) {
  const n = activeCount(filters);

  const select = (label: string, key: ListKey, values: string[], colorOf: (v: string, i: number) => string) => (
    <MultiSelect
      label={label}
      options={values.map((v, i) => ({ value: v, color: colorOf(v, i) }))}
      selected={filters[key]}
      onToggle={(v) => onChange(toggleValue(filters, key, v))}
      onClear={() => onChange({ ...filters, [key]: [] })}
    />
  );

  const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

  return (
    <section className="filterbar" aria-label="Filter">
      <input
        className="search"
        type="search"
        placeholder="Cari nama partner…"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
      />
      {select('Kuadran', 'kuadran', kuadranOrder, (_, i) => kuadranColors[i])}
      {select('Kelompok', 'kelompok', KELOMPOK, (v) => KELOMPOK_COLORS[v])}
      {select('Level Risiko', 'level', ['Tinggi', 'Rendah'], (v) => LEVEL_COLORS[v])}
      {select('Profil Risiko', 'profil', profils, (_, i) => PROFIL_RAMP[i])}
      <div className="skor">
        <span className="ms__label">Skor</span>
        <input className="num-input" type="number" step="0.1" min="0" placeholder="min" aria-label="Skor minimum"
          value={filters.skorMin ?? ''} onChange={(e) => onChange({ ...filters, skorMin: num(e.target.value) })} />
        <span className="muted">–</span>
        <input className="num-input" type="number" step="0.1" min="0" placeholder="maks" aria-label="Skor maksimum"
          value={filters.skorMax ?? ''} onChange={(e) => onChange({ ...filters, skorMax: num(e.target.value) })} />
      </div>
      <div className="filterbar__status">
        <span>
          <b>{shown}</b> dari {total} partner
        </span>
        {n > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => onChange(EMPTY_FILTERS)}>
            Reset filter ({n})
          </button>
        )}
      </div>
    </section>
  );
}
