import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { abcCurve, applyFilters, rankItems } from "@/lib/analytics";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import { fmtCompact, fmtNumber } from "@/components/KpiCard";
import { motion } from "framer-motion";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos · Steula Sales Analytics" },
      { name: "description", content: "Ranking de produtos, curva ABC, participação, crescimento e tendência histórica." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const ranked = useMemo(() => rankItems(filtered), [filtered]);
  const abc = useMemo(() => abcCurve(ranked), [ranked]);

  // Per-item growth (first vs last year present)
  const growthMap = useMemo(() => {
    const map = new Map<string, { first: number; last: number; firstYear: number; lastYear: number }>();
    const yearMap = new Map<string, Map<number, number>>();
    for (const r of filtered) {
      let im = yearMap.get(r.item);
      if (!im) { im = new Map(); yearMap.set(r.item, im); }
      im.set(r.year, (im.get(r.year) ?? 0) + r.quantity);
    }
    for (const [item, ys] of yearMap) {
      const yrs = Array.from(ys.keys()).sort();
      if (yrs.length >= 1) {
        map.set(item, {
          first: ys.get(yrs[0])!,
          last: ys.get(yrs[yrs.length - 1])!,
          firstYear: yrs[0],
          lastYear: yrs[yrs.length - 1],
        });
      }
    }
    return map;
  }, [filtered]);

  const total = ranked.reduce((s, x) => s + x.total, 0) || 1;
  const top = abc.slice(0, filters.topN || 20);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Produtos" subtitle="Ranking, curva ABC e tendência por produto" />
      <FiltersBar />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Top {top.length} produtos</h2>
          <div className="text-xs text-muted-foreground">{ranked.length} produtos no total</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                <th className="text-left px-6 py-2.5 font-medium">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Produto</th>
                <th className="text-left px-3 py-2.5 font-medium">Família</th>
                <th className="text-right px-3 py-2.5 font-medium">Volume</th>
                <th className="text-right px-3 py-2.5 font-medium">Participação</th>
                <th className="text-right px-3 py-2.5 font-medium">Crescimento</th>
                <th className="text-center px-6 py-2.5 font-medium">Classe</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row, i) => {
                const g = growthMap.get(row.item);
                const growth = g && g.first > 0 ? (g.last - g.first) / g.first : null;
                const share = (row.total / total) * 100;
                return (
                  <tr key={row.item} className="border-t border-border/60 hover:bg-accent/20 transition">
                    <td className="px-6 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{row.item}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.family ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtNumber(row.total)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                        {share.toFixed(1)}%
                      </div>
                    </td>
                    <td className={"px-3 py-2.5 text-right tabular-nums " + (growth == null ? "text-muted-foreground" : growth >= 0 ? "text-success" : "text-destructive")}>
                      {growth == null ? "—" : `${(growth * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <span
                        className={
                          "inline-flex size-6 items-center justify-center rounded-md text-[11px] font-semibold " +
                          (row.class === "A"
                            ? "bg-primary/15 text-primary"
                            : row.class === "B"
                            ? "bg-warning/20 text-warning"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {row.class}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-3">
        <SmallStat label="Classe A" value={abc.filter((x) => x.class === "A").length} hint="80% do volume" />
        <SmallStat label="Classe B" value={abc.filter((x) => x.class === "B").length} hint="80%–95%" />
        <SmallStat label="Classe C" value={abc.filter((x) => x.class === "C").length} hint="cauda longa" />
      </div>
    </div>
  );
}

function SmallStat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{fmtCompact(value)}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
