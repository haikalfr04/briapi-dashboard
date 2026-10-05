import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { classify } from '../logic/rules';
import type { Dataset, Partner } from '../logic/types';

const STORAGE_KEY = 'briapi-dashboard:dataset:v1';

function loadStored(): Dataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Dataset) : null;
  } catch {
    return null;
  }
}

interface Ctx {
  dataset: Dataset | null;
  partners: Partner[];
  /** false bila data hanya ada di memori (mis. localStorage diblokir / penuh). */
  persisted: boolean;
  setDataset: (d: Dataset) => void;
  clear: () => void;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setState] = useState<Dataset | null>(loadStored);
  const [persisted, setPersisted] = useState(true);

  const value = useMemo<Ctx>(
    () => ({
      dataset,
      partners: dataset ? classify(dataset.inputs, dataset.params) : [],
      persisted,
      setDataset: (d) => {
        setState(d);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
          setPersisted(true);
        } catch {
          setPersisted(false);
        }
      },
      clear: () => {
        setState(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* abaikan */
        }
      },
    }),
    [dataset, persisted],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData harus dipakai di dalam <DataProvider>');
  return ctx;
}
