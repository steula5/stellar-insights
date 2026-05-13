import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { rankFamilies, rankItems } from "@/lib/analytics";
import { MONTHS } from "@/lib/types";
import { X } from "lucide-react";

export function FiltersBar() {
  const { records, filters, setFilters } = useDataStore();

  const years = useMemo(
    () => Array.from(new Set(records.map((r) => r.year))).sort(),
    [records],
  );
  const items = useMemo(() => rankItems(records).slice(0, 200).map((i) => i.item), [records]);
  const families = useMemo(() => rankFamilies(records).map((f) => f.family), [records]);

  const activeCount =
    filters.years.length + filters.items.length + filters.families.length + filters.months.length;

  if (records.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
        Filtros
      </span>

      <MultiSelect
        label="Ano"
        value={filters.years.map(String)}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
        onChange={(vals) => setFilters({ years: vals.map(Number) })}
      />
      <MultiSelect
        label="Família"
        value={filters.families}
        options={families.map((f) => ({ value: f, label: f }))}
        onChange={(vals) => setFilters({ families: vals })}
      />
      <MultiSelect
        label="Produto"
        value={filters.items}
        options={items.map((i) => ({ value: i, label: i }))}
        onChange={(vals) => setFilters({ items: vals })}
        searchable
      />
      <MultiSelect
        label="Mês"
        value={filters.months.map(String)}
        options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
        onChange={(vals) => setFilters({ months: vals.map(Number) })}
      />

      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Top</label>
        <select
          value={filters.topN}
          onChange={(e) => setFilters({ topN: Number(e.target.value) })}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {[5, 10, 15, 20, 30, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters({ years: [], items: [], families: [], months: [] })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition"
          >
            <X className="size-3" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  value,
  options,
  onChange,
  searchable,
}: {
  label: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer select-none inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:border-primary/40 transition">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value.length === 0 ? "Todos" : value.length === 1 ? value[0] : `${value.length} sel.`}
        </span>
      </summary>
      <div className="absolute z-30 mt-1 w-64 max-h-72 overflow-auto rounded-md border border-border bg-popover p-1.5 shadow-lg">
        {searchable && (
          <input
            placeholder="Buscar..."
            onChange={(e) => {
              const q = e.target.value.toLowerCase();
              const els = e.currentTarget.parentElement?.querySelectorAll<HTMLLabelElement>("label[data-opt]");
              els?.forEach((el) => {
                const lbl = el.dataset.label?.toLowerCase() ?? "";
                el.style.display = lbl.includes(q) ? "" : "none";
              });
            }}
            className="w-full mb-1 h-7 rounded border border-input bg-background px-2 text-xs"
          />
        )}
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              data-opt
              data-label={o.label}
              className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) onChange([...value, o.value]);
                  else onChange(value.filter((v) => v !== o.value));
                }}
                className="size-3.5 accent-primary"
              />
              <span className="truncate">{o.label}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
