import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, yearMonthSeries } from "@/lib/analytics";
import { fmtCompact } from "../KpiCard";

const palette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

export function EvolutionChart({ height = 360 }: { height?: number }) {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const years = useMemo(
    () =>
      (filters.years.length
        ? filters.years
        : Array.from(new Set(filtered.map((r) => r.year)))).sort(),
    [filters.years, filtered],
  );
  const data = useMemo(() => yearMonthSeries(filtered, years), [filtered, years]);

  if (!records.length) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            {years.map((y, i) => (
              <linearGradient key={y} id={`gradY-${y}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette[i % palette.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={palette[i % palette.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtCompact(Number(v))}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {years.map((y, i) => (
            <Area
              key={y}
              type="monotone"
              dataKey={String(y)}
              name={String(y)}
              stroke={palette[i % palette.length]}
              fill={`url(#gradY-${y})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {Number(p.value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export { LineChart, Line };
