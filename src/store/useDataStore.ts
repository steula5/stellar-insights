import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Filters, ImportedFile, SaleRecord } from "@/lib/types";

interface DataState {
  records: SaleRecord[];
  files: ImportedFile[];
  filters: Filters;
  theme: "light" | "dark";
  addImport: (year: number, fileName: string, records: SaleRecord[]) => void;
  removeYear: (year: number) => void;
  clearAll: () => void;
  setFilters: (f: Partial<Filters>) => void;
  toggleTheme: () => void;
}

const defaultFilters: Filters = {
  years: [],
  items: [],
  families: [],
  months: [],
  topN: 10,
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      records: [],
      files: [],
      filters: defaultFilters,
      theme: "dark",
      addImport: (year, fileName, records) => {
        const existing = get().records.filter((r) => r.year !== year);
        const files = get().files.filter((f) => f.year !== year);
        set({
          records: [...existing, ...records],
          files: [...files, { name: fileName, year, rows: records.length }].sort((a, b) => b.year - a.year),
        });
      },
      removeYear: (year) =>
        set({
          records: get().records.filter((r) => r.year !== year),
          files: get().files.filter((f) => f.year !== year),
        }),
      clearAll: () => set({ records: [], files: [], filters: defaultFilters }),
      setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },
    }),
    {
      name: "steula-sales-analytics",
      partialize: (s) => ({ records: s.records, files: s.files, filters: s.filters, theme: s.theme }),
    },
  ),
);

export function applyTheme() {
  if (typeof document === "undefined") return;
  const t = useDataStore.getState().theme;
  document.documentElement.classList.toggle("dark", t === "dark");
}
