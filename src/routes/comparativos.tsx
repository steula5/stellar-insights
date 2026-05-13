import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, byMonthAcrossYears, yearMonthSeries, yoyGrowth } from "@/lib/analytics";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import { fmtCompact, fmtNumber } from "@/components/KpiCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ChartTooltip } from "@/components/charts/EvolutionChart";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/comparativos")({
  head: () => ({
    meta: [
      { title: "Comparativos · Steula Sales Analytics" },
      { name: "description", content: "Comparativos YoY, crescimento percentual e desempenho mensal por ano." },
    ],
  }),
  component: ComparativosPage,
});

function ComparativosPage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const yoy = useMemo(() => yoyGrowth(filtered), [filtered]);
  const years = useMemo(() => yoy.map((y) => y.year), [yoy]);
  const monthly = useMemo(() => yearMonthSeries(filtered, years), [filtered, years]);
  const monthAvg = useMemo(() => byMonthAcrossYears(filtered), [filtered]);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Comparativos" subtitle="YoY, crescimento percentual e desempenho mensal histórico" />
      <FiltersBar />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="text-base font-semibold tracking-tight mb-4">Crescimento ano a ano (YoY)</h2>
          <div className="space-y-1.5">
            {yoy.map((y) => (
              <div key={y.year} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0">
                <span className="w-14 font-medium tabular-nums">{y.year}</span>
                <span className="flex-1 tabular-nums text-muted-foreground">{fmtNumber(y.total)}</span>
                {y.growth != null ? (
                  <span className={"inline-flex items-center gap-1 font-medium tabular-nums " + (y.growth >= 0 ? "text-success" : "text-destructive")}>
                    {y.growth >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {(y.growth * 100).toFixed(1)}%
                  </span>
                ) : <span className="text-muted-foreground text-xs">—</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="text-base font-semibold tracking-tight mb-4">Distribuição mensal histórica</h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthAvg}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
        <h2 className="text-base font-semibold tracking-tight mb-4">Mês a mês — todos os anos lado a lado</h2>
        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {years.map((y, i) => (
                <Bar key={y} dataKey={String(y)} fill={`var(--color-chart-${(i % 6) + 1})`} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
