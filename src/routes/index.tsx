import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Crown, Calendar, Layers, BarChart3, Activity, Trophy, Sparkles } from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, computeKpis } from "@/lib/analytics";
import { fmtCompact, fmtNumber, KpiCard } from "@/components/KpiCard";
import { ImportZone } from "@/components/ImportZone";
import { FiltersBar } from "@/components/FiltersBar";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { generateInsights } from "@/lib/insights";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Steula Sales Analytics" },
      { name: "description", content: "Dashboard executivo de vendas com KPIs históricos, evolução anual e insights automáticos." },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const { records, filters } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(filtered).slice(0, 3), [filtered]);

  if (records.length === 0) return <EmptyState />;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Visão Geral"
        subtitle="Análise consolidada do histórico de vendas"
      />

      <FiltersBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard index={0} label="Total histórico" value={fmtCompact(kpis.totalHistorical)} hint="unidades" icon={<BarChart3 className="size-4" />} />
        <KpiCard index={1} label="Crescimento YoY" value={kpis.yoy != null ? `${(kpis.yoy * 100).toFixed(1)}%` : "—"} delta={kpis.yoy} hint="último ano vs anterior" icon={<TrendingUp className="size-4" />} />
        <KpiCard index={2} label="CAGR histórico" value={kpis.cagr != null ? `${(kpis.cagr * 100).toFixed(1)}%` : "—"} hint="taxa anual composta" icon={<Activity className="size-4" />} />
        <KpiCard index={3} label="Média mensal" value={fmtCompact(kpis.monthlyAvg)} hint="histórica" icon={<Calendar className="size-4" />} />
        <KpiCard index={4} label="Produto líder" value={<span className="text-base">{kpis.topItem ?? "—"}</span>} icon={<Crown className="size-4" />} />
        <KpiCard index={5} label="Família líder" value={<span className="text-base">{kpis.topFamily ?? "—"}</span>} icon={<Layers className="size-4" />} />
        <KpiCard index={6} label="Melhor ano" value={kpis.bestYear?.year ?? "—"} hint={kpis.bestYear ? fmtCompact(kpis.bestYear.total) : ""} icon={<Trophy className="size-4" />} />
        <KpiCard index={7} label="Melhor mês histórico" value={kpis.bestMonth?.month ?? "—"} hint={kpis.bestMonth ? fmtCompact(kpis.bestMonth.total) : ""} icon={<Calendar className="size-4" />} />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Evolução mensal por ano</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Comparativo entre anos selecionados · responde aos filtros</p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {fmtNumber(filtered.length)} registros
          </span>
        </div>
        <div className="p-4">
          <EvolutionChart height={400} />
        </div>
      </motion.section>

      {insights.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">Insights destacados</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {insights.map((i) => (
              <div key={i.id} className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                <span
                  className={
                    "inline-block size-1.5 rounded-full mr-2 " +
                    (i.tone === "positive" ? "bg-success" : i.tone === "negative" ? "bg-destructive" : "bg-muted-foreground")
                  }
                />
                {i.text}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
        <h2 className="text-base font-semibold tracking-tight mb-3">Importar mais arquivos</h2>
        <ImportZone compact />
      </section>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Steula Sales Analytics</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative min-h-screen grid-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background pointer-events-none" />
      <div className="relative px-6 lg:px-10 py-16 max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-wider text-primary font-medium">Steula Sales Analytics</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Análise executiva de vendas, do histórico ao forecast.</h1>
        <p className="mt-3 text-muted-foreground">
          Importe seus arquivos Excel anuais (ex: <span className="text-foreground font-medium">Resumo-Vendas-2024.xlsx</span>).
          O sistema detecta o ano, normaliza produtos e famílias, e desbloqueia comparativos, sazonalidade, forecast e insights automáticos.
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <ImportZone />
        </div>
        <div className="mt-6 grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <Feat title="100% local" desc="Nada sai do seu navegador. Sem backend, sem upload." />
          <Feat title="Multi-ano" desc="Carregue de 2006 a 2026+ e compare lado a lado." />
          <Feat title="Forecast inteligente" desc="Tendência + sazonalidade com intervalo de confiança." />
        </div>
      </div>
    </div>
  );
}

function Feat({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-foreground font-medium text-sm">{title}</div>
      <div className="mt-0.5">{desc}</div>
    </div>
  );
}
