import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters } from "@/lib/analytics";
import { generateInsights } from "@/lib/insights";
import { FiltersBar } from "@/components/FiltersBar";
import { PageHeader } from "./index";
import { motion } from "framer-motion";
import { Sparkles, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights IA · Steula Sales Analytics" },
      { name: "description", content: "Insights executivos e analíticos automáticos extraídos do seu histórico de vendas." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const insights = useMemo(() => generateInsights(filtered), [filtered]);

  const exec = insights.filter((i) => i.kind === "executive");
  const ana = insights.filter((i) => i.kind === "analytical");

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Insights automáticos" subtitle="Narrativas executivas e analíticas geradas a partir do histórico" />
      <FiltersBar />

      <Section icon={<Sparkles className="size-4 text-primary" />} title="Executivos" items={exec} />
      <Section icon={<BarChart3 className="size-4 text-chart-2" />} title="Analíticos" items={ana} />
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: { id: string; tone: string; text: string }[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} insights</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.length === 0 && <div className="text-sm text-muted-foreground">Sem dados suficientes.</div>}
        {items.map((i, idx) => (
          <motion.div
            key={i.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="rounded-lg border border-border bg-background/50 p-4 text-sm leading-relaxed"
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  "mt-1.5 size-2 rounded-full shrink-0 " +
                  (i.tone === "positive" ? "bg-success" : i.tone === "negative" ? "bg-destructive" : "bg-muted-foreground")
                }
              />
              <span>{i.text}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
