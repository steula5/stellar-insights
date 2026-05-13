import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDataStore } from "@/store/useDataStore";
import { applyFilters, byYear, computeKpis, rankFamilies, rankItems, seasonalityMatrix, yoyGrowth, computeLastMonthKpi } from "@/lib/analytics";
import { generateInsights } from "@/lib/insights";
import { forecast } from "@/lib/forecast";
import { MONTHS, type SaleRecord } from "@/lib/types";
import { PageHeader } from "./index";
import { Download, FileText } from "lucide-react";
import { fmtNumber } from "@/components/KpiCard";

export const Route = createFileRoute("/exportar")({
  head: () => ({
    meta: [
      { title: "Exportar Relatório · Steula Sales Analytics" },
      { name: "description", content: "Exporte um relatório HTML executivo offline com gráficos, KPIs e insights." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const { records, filters, files } = useDataStore();
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    try {
      const html = buildReportHtml(filtered, files.map((f) => f.year));
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `steula-relatorio-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader title="Exportar Relatório" subtitle="Relatório HTML monolítico — funciona 100% offline" />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <FileText className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold tracking-tight">Relatório executivo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Inclui KPIs, evolução anual, comparativos YoY, sazonalidade, ranking de produtos, famílias, projeção de forecast e insights automáticos.
              Identidade visual premium preservada. Abre em qualquer navegador, sem dependências.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {fmtNumber(filtered.length)} registros · {files.length} ano(s)
            </div>
          </div>
          <button
            onClick={generate}
            disabled={busy || !records.length}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-50 transition"
          >
            <Download className="size-4" />
            {busy ? "Gerando..." : "Gerar HTML"}
          </button>
        </div>
        {!records.length && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs">
            Atenção: Nenhum dado foi carregado ainda. Importe um arquivo Excel na página inicial primeiro.
          </div>
        )}
        {records.length > 0 && !filtered.length && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs">
            Dica: Seus filtros atuais estão ocultando todos os dados. Remova os filtros para exportar o relatório completo.
          </div>
        )}
      </div>
    </div>
  );
}

function buildReportHtml(records: SaleRecord[], allYears: number[]): string {
  const lastMonth = computeLastMonthKpi(records);
  const kpis = computeKpis(records);
  const insights = generateInsights(records);
  const fc = forecast(records);
  
  // Data for the interactive part
  const dataJson = JSON.stringify(records);
  const yearsJson = JSON.stringify(allYears.sort((a, b) => b - a));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Relatório Steula Sales Analytics</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    :root {
      --bg: #09090b; --card: #18181b; --border: #27272a; --fg: #fafafa;
      --mut: #a1a1aa; --p: #8b5cf6; --p-glow: rgba(139,92,246,0.3);
      --succ: #22c55e; --neg: #ef4444;
    }
    * { box-sizing: border-box; }
    body { 
      margin: 0; background: var(--bg); color: var(--fg); 
      font-family: 'Inter', -apple-system, sans-serif; line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
    .header h1 { font-size: 28px; margin: 0; letter-spacing: -0.02em; }
    .header p { color: var(--mut); font-size: 14px; margin: 4px 0 0; }

    /* Interactive Filters */
    .filters { 
      display: flex; gap: 16px; margin-bottom: 24px; background: var(--card); 
      padding: 16px; border-radius: 12px; border: 1px solid var(--border);
      position: sticky; top: 10px; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .search-box { flex: 1; position: relative; }
    .search-box input {
      width: 100%; background: #000; border: 1px solid var(--border);
      color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 14px;
    }
    .year-btns { display: flex; gap: 8px; }
    .y-btn {
      padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border);
      background: #000; color: var(--mut); cursor: pointer; font-size: 13px; font-weight: 500;
    }
    .y-btn.active { background: var(--p); color: #fff; border-color: var(--p); box-shadow: 0 0 15px var(--p-glow); }

    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .kpi { background: var(--card); border: 1px solid var(--border); padding: 24px; border-radius: 16px; transition: transform 0.2s; }
    .kpi:hover { transform: translateY(-2px); }
    .kpi-label { font-size: 12px; color: var(--mut); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .kpi-value { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; }
    .kpi-sub { font-size: 13px; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
    .kpi-sub.pos { color: var(--succ); } .kpi-sub.neg { color: var(--neg); }

    /* Last Month Emphasis */
    .last-month-hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #15171f 100%);
      border: 1px solid var(--p); border-radius: 20px; padding: 32px; margin-bottom: 32px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .lm-info h2 { margin: 0; font-size: 14px; color: var(--p); text-transform: uppercase; }
    .lm-info .v { font-size: 48px; font-weight: 800; margin: 8px 0; }
    .lm-info .m { font-size: 18px; color: var(--mut); }

    /* Tables */
    .section { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .section h3 { margin: 0 0 20px; font-size: 18px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 12px; color: var(--mut); font-weight: 500; border-bottom: 1px solid var(--border); }
    td { padding: 12px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    .r { text-align: right; }
    .bar { height: 6px; background: var(--p); border-radius: 3px; display: inline-block; }

    /* Insights */
    .insight-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .insight { padding: 16px; border-radius: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); font-size: 14px; }
    .insight.positive { border-left: 4px solid var(--succ); }
    .insight.negative { border-left: 4px solid var(--neg); }
    
    @media (max-width: 768px) {
      .filters { flex-direction: column; }
      .kpi-grid { grid-template-columns: 1fr; }
      .last-month-hero { flex-direction: column; text-align: center; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório Executivo Steula</h1>
      <p>Gerado em ${new Date().toLocaleString("pt-BR")} · Análise interativa offline</p>
    </div>

    ${lastMonth ? `
    <div class="last-month-hero">
      <div class="lm-info">
        <h2>Performance Recente</h2>
        <div class="v">${lastMonth.total.toLocaleString("pt-BR")} <small style="font-size: 20px; font-weight: 400">vendas</small></div>
        <div class="m">${lastMonth.month} / ${lastMonth.year}</div>
      </div>
      <div style="text-align: right">
        <div style="font-size: 12px; color: var(--mut); margin-bottom: 4px">Crescimento vs Mês Anterior</div>
        <div style="font-size: 24px; font-weight: 700; color: ${lastMonth.growthVsPrev && lastMonth.growthVsPrev >= 0 ? "var(--succ)" : "var(--neg)"}">
          ${lastMonth.growthVsPrev ? (lastMonth.growthVsPrev > 0 ? "+" : "") + (lastMonth.growthVsPrev * 100).toFixed(1) + "%" : "—"}
        </div>
      </div>
    </div>
    ` : ""}

    <div class="filters">
      <div class="search-box">
        <input type="text" id="search" placeholder="Filtrar por produto ou família..." oninput="updateDashboard()"/>
      </div>
      <div class="year-btns" id="year-filters"></div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Volume Total</div>
        <div class="kpi-value" id="kpi-total">0</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Média Mensal</div>
        <div class="kpi-value" id="kpi-avg">0</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">YoY Growth</div>
        <div class="kpi-value" id="kpi-yoy">0%</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;" id="main-grid">
      <div class="section">
        <h3>Top Produtos</h3>
        <table id="products-table">
          <thead><tr><th>Produto</th><th class="r">Qtd</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="section">
        <h3>Top Famílias</h3>
        <table id="families-table">
          <thead><tr><th>Família</th><th class="r">Qtd</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h3>Insights Sugeridos</h3>
      <div class="insight-list">
        ${insights.map(i => `<div class="insight ${i.tone}">${i.text}</div>`).join("")}
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 40px; color: var(--mut); font-size: 12px;">
      Steula Sales Analytics · Relatório Offline
    </div>
  </div>

  <script>
    const RAW_DATA = ${dataJson};
    const ALL_YEARS = ${yearsJson};
    const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
    
    let activeYears = [];

    function init() {
      const yearContainer = document.getElementById("year-filters");
      ALL_YEARS.forEach(y => {
        const btn = document.createElement("button");
        btn.className = "y-btn";
        btn.textContent = y;
        btn.onclick = () => toggleYear(y, btn);
        yearContainer.appendChild(btn);
      });
      updateDashboard();
    }

    function toggleYear(y, btn) {
      if (activeYears.includes(y)) {
        activeYears = activeYears.filter(ay => ay !== y);
        btn.classList.remove("active");
      } else {
        activeYears.push(y);
        btn.classList.add("active");
      }
      updateDashboard();
    }

    function updateDashboard() {
      const query = document.getElementById("search").value.toLowerCase();
      
      const filtered = RAW_DATA.filter(r => {
        const matchesYear = activeYears.length === 0 || activeYears.includes(r.year);
        const matchesText = !query || 
          r.item.toLowerCase().includes(query) || 
          (r.family && r.family.toLowerCase().includes(query));
        return matchesYear && matchesText;
      });

      // Update KPIs
      const total = filtered.reduce((s, r) => s + r.quantity, 0);
      document.getElementById("kpi-total").textContent = total.toLocaleString("pt-BR");
      
      const yearCount = (activeYears.length || ALL_YEARS.length) || 1;
      document.getElementById("kpi-avg").textContent = Math.round(total / (yearCount * 12)).toLocaleString("pt-BR");

      // Rankings
      renderTable("products-table", rank(filtered, "item"));
      renderTable("families-table", rank(filtered, "family"));
    }

    function rank(data, key) {
      const m = new Map();
      data.forEach(r => {
        const k = r[key] || "—";
        m.set(k, (m.get(k) || 0) + r.quantity);
      });
      return Array.from(m, ([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
    }

    function renderTable(id, data) {
      const tbody = document.querySelector("#" + id + " tbody");
      const max = data[0]?.total || 1;
      tbody.innerHTML = data.map(d => \`
        <tr>
          <td>\${d.name}</td>
          <td class="r">
            <div style="font-weight: 600">\${d.total.toLocaleString("pt-BR")}</div>
            <div class="bar" style="width: \${(d.total / max * 100)}%; height: 4px; opacity: 0.5"></div>
          </td>
        </tr>
      \`).join("");
    }

    function fmt(n) { return n.toLocaleString("pt-BR"); }

    init();
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
