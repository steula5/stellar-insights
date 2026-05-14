import * as XLSX from "xlsx";
import { MONTHS, type Month, type SaleRecord } from "./types";

export function detectYearFromFilename(name: string): number | null {
  const m = name.match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

function normalizeHeader(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function cleanItem(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

export interface ParseResult {
  records: SaleRecord[];
  hasFamily: boolean;
  detectedHeaderRow: number;
}

/**
 * Find header row by scanning for "ITEM" + month tokens.
 */
function findHeader(rows: unknown[][]): { rowIdx: number; cols: string[] } | null {
  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i] ?? [];
    const cells = row.map(normalizeHeader);
    
    // Busca por colunas que identifiquem a linha como sendo o cabeçalho
    const monthCount = cells.filter((c) => 
      (MONTHS as readonly string[]).some(m => c === m || c.startsWith(m + "/") || c.startsWith(m + " ") || c.startsWith(m + "-"))
    ).length;

    // Se encontramos pelo menos 6 meses, consideramos que esta é a linha do cabeçalho
    if (monthCount >= 6) return { rowIdx: i, cols: cells };
  }
  return null;
}

export function parseWorkbook(buf: ArrayBuffer, year: number): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  const records: SaleRecord[] = [];
  let hasFamily = false;
  let detectedHeaderRow = -1;
  let count = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const header = findHeader(rows);
    if (!header) continue;
    detectedHeaderRow = header.rowIdx;
    const cols = header.cols;

    const itemCol = 0; // Coluna A sempre é o código do item conforme solicitado
    
    const familyCol = cols.findIndex((c) => c === "FAMÍLIA" || c === "FAMILIA" || c === "FAMILIAS") >= 0 
      ? cols.findIndex((c) => c === "FAMÍLIA" || c === "FAMILIA" || c === "FAMILIAS") 
      : 1; // Fallback para coluna B
    
    if (familyCol >= 0) hasFamily = true;

    const monthCols: { idx: number; month: Month; mi: number }[] = [];
    cols.forEach((c, idx) => {
      const mi = (MONTHS as readonly string[]).findIndex(m => c === m || c.startsWith(m + "/") || c.startsWith(m + " ") || c.startsWith(m + "-"));
      if (mi >= 0) monthCols.push({ idx, month: MONTHS[mi], mi });
    });

    for (let r = header.rowIdx + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const item = cleanItem(row[itemCol]);
      const upperItem = item.toUpperCase();
      
      // Filtra linhas vazias, zeradas, totais, faturamento ou notas de rodapé
      if (
        !item || 
        item === "0" || 
        upperItem.includes("TOTAL") || 
        upperItem.includes("VENDA S/IPI") ||
        upperItem.includes("FATURAMENTO") ||
        upperItem.includes("RESUMO VENDAS") ||
        upperItem.includes("OBSERVAÇÕES") ||
        upperItem.includes("OBSERVACOES") ||
        upperItem.includes("MÉDIA") ||
        upperItem.includes("MEDIA") ||
        upperItem.includes("VARIAÇÃO") ||
        upperItem.includes("VARIACAO") ||
        upperItem.includes("FAMILIAS") ||
        upperItem.includes("FAMÍLIAS") ||
        /^\d+\s*\)/.test(item) // Notas como "1) ", "2)"
      ) {
        console.log(`Pulando linha ${r}: item="${item}" (Filtro ativo)`);
        continue;
      }
      
      const family = familyCol >= 0 ? cleanItem(row[familyCol]) || undefined : undefined;
      let any = false;
      
      for (const mc of monthCols) {
        const val = parseFloat(String(row[mc.idx] ?? "0").replace(",", "."));
        if (!isNaN(val) && val !== 0) {
          records.push({
            year: year,
            month: mc.month,
            monthIndex: mc.mi,
            item,
            family,
            quantity: val,
          });
          any = true;
        }
      }
      if (any) count++;
    }
    
    console.log(`Importação concluída: ${count} itens processados, ${records.length} registros totais.`);
    break;
  }

  return { records, hasFamily, detectedHeaderRow };
}

export async function parseFile(file: File): Promise<{ year: number; result: ParseResult } | { error: string }> {
  const year = detectYearFromFilename(file.name);
  if (!year) return { error: `Não foi possível detectar o ano em "${file.name}"` };
  const buf = await file.arrayBuffer();
  try {
    const result = parseWorkbook(buf, year);
    if (!result.records.length) return { error: `Nenhum dado encontrado em "${file.name}"` };
    return { year, result };
  } catch (e) {
    return { error: `Falha ao ler "${file.name}": ${(e as Error).message}` };
  }
}
