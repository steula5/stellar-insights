import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  hint?: ReactNode;
  icon?: ReactNode;
  index?: number;
}) {
  const tone =
    delta == null ? "neutral" : delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      className="group relative rounded-xl border border-border bg-card p-5 shadow-elegant overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        {delta != null && (
          <span
            className={
              tone === "positive"
                ? "inline-flex items-center gap-0.5 text-success font-medium"
                : tone === "negative"
                ? "inline-flex items-center gap-0.5 text-destructive font-medium"
                : "inline-flex items-center gap-0.5 text-muted-foreground"
            }
          >
            {tone === "positive" ? (
              <ArrowUpRight className="size-3" />
            ) : tone === "negative" ? (
              <ArrowDownRight className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
      <div className="pointer-events-none absolute -right-12 -bottom-12 size-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

export function fmtNumber(n: number, digits = 0): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCompact(n: number): string {
  return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
