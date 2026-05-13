const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Mock data structures from the app
const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function cleanItem(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(v) {
  return String(v ?? "").trim().toUpperCase();
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i] ?? [];
    const cells = row.map(normalizeHeader);
    const monthCount = cells.filter((c) => 
      MONTHS.some(m => c === m || c.startsWith(m + "/") || c.startsWith(m + " ") || c.startsWith(m + "-"))
    ).length;
    if (monthCount >= 6) return { rowIdx: i, cols: cells };
  }
  return null;
}

function parseWorkbook(buf, year) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const records = [];
  
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const header = findHeader(rows);
    if (!header) continue;
    
    const cols = header.cols;
    const itemCol = 0;
    const familyCol = cols.findIndex((c) => c === "FAMÍLIA" || c === "FAMILIA" || c === "FAMILIAS") >= 0 
      ? cols.findIndex((c) => c === "FAMÍLIA" || c === "FAMILIA" || c === "FAMILIAS") 
      : 1;

    const monthCols = [];
    cols.forEach((c, idx) => {
      const mi = MONTHS.findIndex(m => c === m || c.startsWith(m + "/") || c.startsWith(m + " ") || c.startsWith(m + "-"));
      if (mi >= 0) monthCols.push({ idx, month: MONTHS[mi], mi });
    });

    for (let r = header.rowIdx + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const item = cleanItem(row[itemCol]);
      const upperItem = item.toUpperCase();
      
      if (!item || item === "0" || upperItem.includes("TOTAL") || upperItem.includes("FATURAMENTO") || upperItem.includes("MÉDIA") || upperItem.includes("VARIAÇÃO")) continue;
      
      const family = familyCol >= 0 ? cleanItem(row[familyCol]) || undefined : undefined;
      
      for (const mc of monthCols) {
        let val = row[mc.idx];
        if (typeof val === 'string') val = parseFloat(val.replace(',', '.'));
        if (!isNaN(val) && val !== 0) {
          records.push({ year, month: mc.month, monthIndex: mc.mi, item, family, quantity: val });
        }
      }
    }
    break;
  }
  return records;
}

// Main execution
const excelPath = path.join(__dirname, '..', 'src', 'Resumo-Vendas-2026.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error("Excel file not found at " + excelPath);
  process.exit(1);
}

const buf = fs.readFileSync(excelPath);
const records = parseWorkbook(buf, 2026);

// HTML Template (simplified version of exportar.tsx)
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Dashboard Steula Sales Analytics</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    :root {
      --bg: #09090b; --card: #18181b; --border: #27272a; --fg: #fafafa;
      --mut: #a1a1aa; --p: #8b5cf6; --p-glow: rgba(139,92,246,0.3);
      --succ: #22c55e; --neg: #ef4444;
    }
    body { 
      margin: 0; background: var(--bg); color: var(--fg); 
      font-family: 'Inter', system-ui, sans-serif;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .kpi { background: var(--card); border: 1px solid var(--border); padding: 24px; border-radius: 16px; }
    .kpi-label { font-size: 12px; color: var(--mut); text-transform: uppercase; margin-bottom: 8px; }
    .kpi-value { font-size: 32px; font-weight: 700; }
    .filters { display: flex; gap: 16px; margin-bottom: 24px; background: var(--card); padding: 16px; border-radius: 12px; border: 1px solid var(--border); position: sticky; top: 10px; z-index: 100; }
    .search-box { flex: 1; }
    .search-box input { width: 100%; background: #000; border: 1px solid var(--border); color: #fff; padding: 10px 16px; border-radius: 8px; }
    .section { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 12px; color: var(--mut); border-bottom: 1px solid var(--border); }
    td { padding: 12px; border-bottom: 1px solid var(--border); }
    .r { text-align: right; }
    .bar { height: 4px; background: var(--p); border-radius: 2px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Steula Sales Analytics</h1>
      <p>Dashboard Interativo · Atualizado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <div class="filters">
      <div class="search-box">
        <input type="text" id="search" placeholder="Filtrar por produto ou família..." oninput="updateDashboard()"/>
      </div>
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
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
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
  </div>
  <script>
    const DATA = ${JSON.stringify(records)};
    function updateDashboard() {
      const query = document.getElementById("search").value.toLowerCase();
      const filtered = DATA.filter(r => 
        !query || r.item.toLowerCase().includes(query) || (r.family && r.family.toLowerCase().includes(query))
      );
      const total = filtered.reduce((s, r) => s + r.quantity, 0);
      document.getElementById("kpi-total").textContent = total.toLocaleString("pt-BR");
      document.getElementById("kpi-avg").textContent = Math.round(total / 12).toLocaleString("pt-BR");
      renderTable("products-table", rank(filtered, "item"));
      renderTable("families-table", rank(filtered, "family"));
    }
    function rank(data, key) {
      const m = new Map();
      data.forEach(r => { const k = r[key] || "—"; m.set(k, (m.get(k) || 0) + r.quantity); });
      return Array.from(m, ([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 15);
    }
    function renderTable(id, data) {
      const tbody = document.querySelector("#" + id + " tbody");
      const max = data[0]?.total || 1;
      tbody.innerHTML = data.map(d => \`
        <tr><td>\${d.name}</td><td class="r"><b>\${d.total.toLocaleString("pt-BR")}</b><br/><div class="bar" style="width:\${(d.total/max*100)}%"></div></td></tr>
      \`).join("");
    }
    updateDashboard();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html);
console.log("Static index.html generated successfully!");
