import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  options: { value: string; color: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}

/** Dropdown checklist ringkas untuk filter (satu baris filter di atas dashboard). */
export default function MultiSelect({ label, options, selected, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const summary = selected.length === 0 ? 'Semua' : selected.length === 1 ? selected[0] : `${selected.length} dipilih`;

  return (
    <div className="ms" ref={root}>
      <button
        className={`ms__btn${selected.length ? ' is-active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ms__label">{label}</span>
        <span className="ms__value">{summary}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      {open && (
        <div className="ms__pop" role="listbox" aria-multiselectable="true" aria-label={label}>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className="ms__opt">
                <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} />
                <i style={{ background: o.color }} />
                {o.value}
              </label>
            );
          })}
          {selected.length > 0 && (
            <button className="ms__clear" onClick={onClear}>Hapus pilihan</button>
          )}
        </div>
      )}
    </div>
  );
}
