import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, rankFamilies } from "@/lib/analytics";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import { fmtNumber } from "@/components/KpiCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChartTooltip } from "@/components/charts/EvolutionChart";

export const Route = createFileRoute("/familias")({
  head: () => ({
    meta: [
      { title: "Famílias · Steula Sales Analytics" },
      { name: "description", content: "Desempenho, representatividade e evolução por família de produtos." },
    ],
  }),
  component: FamiliasPage,
});

function FamiliasPage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const ranked = useMemo(() => rankFamilies(filtered), [filtered]);
  const total = ranked.reduce((s, x) => s + x.total, 0) || 1;

  // Family x Year matrix
  const yearTotals = useMemo(() => {
    const ys = Array.from(new Set(filtered.map((r) => r.year))).sort();
    const data = ranked.slice(0, 8).map((f) => {
      const row: Record<string, string | number> = { family: f.family };
      for (const y of ys) row[String(y)] = 0;
      for (const r of filtered) if (r.family === f.family) row[String(r.year)] = (row[String(r.year)] as number) + r.quantity;
      return row;
    });
    return { years: ys, data };
  }, [filtered, ranked]);

  if (!ranked.length) {
    return (
      <div className="px-10 py-16 text-center text-muted-foreground">
        Os arquivos importados não possuem coluna "Família".
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Famílias" subtitle="Representatividade e evolução por família" />
      <FiltersBar />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="text-base font-semibold tracking-tight mb-4">Participação no volume</h2>
          <div className="space-y-2">
            {ranked.map((f) => {
              const pct = (f.total / total) * 100;
              return (
                <div key={f.family} className="flex items-center gap-3 text-sm">
                  <span className="w-40 truncate">{f.family}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-chart-2" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                  <span className="w-20 text-right tabular-nums">{fmtNumber(f.total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="text-base font-semibold tracking-tight mb-4">Evolução anual (top 8)</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={yearTotals.data} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="family" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={120} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {yearTotals.years.map((y, i) => (
                  <Bar key={y} dataKey={String(y)} stackId="a" fill={`var(--color-chart-${(i % 6) + 1})`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
