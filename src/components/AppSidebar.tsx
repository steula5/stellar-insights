import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  GitCompareArrows,
  CalendarHeart,
  TrendingUp,
  Sparkles,
  FileDown,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Boxes },
  { to: "/familias", label: "Famílias", icon: Layers },
  { to: "/comparativos", label: "Comparativos", icon: GitCompareArrows },
  { to: "/sazonalidade", label: "Sazonalidade", icon: CalendarHeart },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/insights", label: "Insights IA", icon: Sparkles },
  { to: "/exportar", label: "Exportar Relatório", icon: FileDown },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggleTheme, files } = useDataStore();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
        <div className="size-8 rounded-lg bg-primary/15 grid place-items-center text-primary">
          <Activity className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">Steula</div>
          <div className="text-[11px] text-muted-foreground -mt-0.5">Sales Analytics</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="size-4 relative z-10" />
              <span className="relative z-10">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-2">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Anos importados</div>
          <div className="mt-1 text-sm font-semibold text-sidebar-foreground">
            {files.length === 0 ? "Nenhum" : files.map((f) => f.year).sort().join(" · ")}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition"
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </button>
      </div>
    </aside>
  );
}
