import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, seasonalityMatrix } from "@/lib/analytics";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import { MONTHS } from "@/lib/types";
import { fmtCompact } from "@/components/KpiCard";

export const Route = createFileRoute("/sazonalidade")({
  head: () => ({
    meta: [
      { title: "Sazonalidade · Steula Sales Analytics" },
      { name: "description", content: "Heatmap de sazonalidade — intensidade de vendas por mês e ano." },
    ],
  }),
  component: SazonalidadePage,
});

function SazonalidadePage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const { years, matrix } = useMemo(() => seasonalityMatrix(filtered), [filtered]);

  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Sazonalidade" subtitle="Intensidade de vendas por mês e ano" />
      <FiltersBar />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium pr-3">Ano</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
                  {m}
                </th>
              ))}
              <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium pl-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y, yi) => {
              const total = matrix[yi].reduce((s, x) => s + x, 0);
              return (
                <tr key={y}>
                  <td className="text-sm font-medium pr-3">{y}</td>
                  {matrix[yi].map((v, mi) => {
                    const intensity = v / max;
                    return (
                      <td key={mi} className="text-center">
                        <div
                          className="rounded-md px-2 py-2.5 text-[11px] tabular-nums transition hover:scale-105"
                          style={{
                            background: `color-mix(in oklab, var(--color-primary) ${intensity * 90}%, var(--color-card))`,
                            color: intensity > 0.55 ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                          }}
                          title={`${MONTHS[mi]}/${y}: ${v.toLocaleString("pt-BR")}`}
                        >
                          {fmtCompact(v)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right text-sm font-semibold tabular-nums pl-3">{fmtCompact(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
