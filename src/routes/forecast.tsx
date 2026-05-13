import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters } from "@/lib/analytics";
import { forecast } from "@/lib/forecast";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartTooltip } from "@/components/charts/EvolutionChart";
import { fmtCompact } from "@/components/KpiCard";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Forecast · Steula Sales Analytics" },
      { name: "description", content: "Projeção futura baseada em tendência histórica, sazonalidade e intervalo de confiança." },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const [horizon, setHorizon] = useState(12);
  const { history, future } = useMemo(() => forecast(filtered, horizon), [filtered, horizon]);

  const series = useMemo(() => {
    return [
      ...history.map((h) => ({ label: h.label, hist: h.value })),
      ...future.map((f) => ({ label: f.label, fc: f.value, lower: f.lower, upper: f.upper, band: [f.lower, f.upper] as [number, number] })),
    ];
  }, [history, future]);

  const cutoffLabel = history.length ? history[history.length - 1].label : null;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Forecast inteligente"
        subtitle="Projeção combinando tendência linear + sazonalidade mensal + intervalo de confiança"
        right={
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Horizonte</label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {[6, 12, 18, 24, 36].map((n) => (
                <option key={n} value={n}>{n} meses</option>
              ))}
            </select>
          </div>
        }
      />
      <FiltersBar />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
        <div style={{ width: "100%", height: 460 }}>
          <ResponsiveContainer>
            <ComposedChart data={series} margin={{ top: 10, right: 16 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={Math.ceil(series.length / 16)} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              {cutoffLabel && (
                <ReferenceLine x={cutoffLabel} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" label={{ value: "Hoje", position: "top", fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              )}
              <Area type="monotone" dataKey="band" name="Intervalo de confiança" stroke="none" fill="var(--color-primary)" fillOpacity={0.12} />
              <Area type="monotone" dataKey="hist" name="Histórico" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#histGrad)" dot={false} />
              <Line type="monotone" dataKey="fc" name="Projeção" stroke="var(--color-primary)" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 2.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <Box label="Soma projetada" value={fmtCompact(future.reduce((s, x) => s + x.value, 0))} hint={`${horizon} meses`} />
        <Box label="Média mensal projetada" value={fmtCompact(future.reduce((s, x) => s + x.value, 0) / Math.max(1, future.length))} hint="próximos meses" />
        <Box
          label="Tendência"
          value={(() => {
            if (!history.length || !future.length) return "—";
            const lastHist = history.slice(-12).reduce((s, x) => s + x.value, 0) / Math.min(12, history.length);
            const fcAvg = future.reduce((s, x) => s + x.value, 0) / future.length;
            const d = lastHist > 0 ? ((fcAvg - lastHist) / lastHist) * 100 : 0;
            return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
          })()}
          hint="vs média recente"
        />
      </div>
    </div>
  );
}

function Box({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
