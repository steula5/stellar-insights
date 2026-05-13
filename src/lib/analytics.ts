import { MONTHS, type SaleRecord, type Filters } from "./types";

export function applyFilters(records: SaleRecord[], f: Filters): SaleRecord[] {
  return records.filter((r) => {
    if (f.years.length && !f.years.includes(r.year)) return false;
    if (f.items.length && !f.items.includes(r.item)) return false;
    if (f.families.length && (!r.family || !f.families.includes(r.family))) return false;
    if (f.months.length && !f.months.includes(r.monthIndex)) return false;
    return true;
  });
}

export function sum(records: SaleRecord[]): number {
  let s = 0;
  for (const r of records) s += r.quantity;
  return s;
}

export function byYear(records: SaleRecord[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of records) m.set(r.year, (m.get(r.year) ?? 0) + r.quantity);
  return m;
}

export function byMonthAcrossYears(records: SaleRecord[]): { month: string; total: number; mi: number }[] {
  const arr = MONTHS.map((m, i) => ({ month: m, mi: i, total: 0 }));
  for (const r of records) arr[r.monthIndex].total += r.quantity;
  return arr;
}

/**
 * Time series: one point per (year, month) combined; output sorted chronologically.
 * Each series item contains values per year if pivot=true.
 */
export function yearMonthSeries(
  records: SaleRecord[],
  years: number[],
): { month: string; mi: number; [year: string]: number | string }[] {
  const yearSet = years.length ? years : Array.from(new Set(records.map((r) => r.year))).sort();
  const data = MONTHS.map((m, i) => {
    const row: { month: string; mi: number; [year: string]: number | string } = { month: m, mi: i };
    for (const y of yearSet) row[String(y)] = 0;
    return row;
  });
  for (const r of records) {
    if (yearSet.includes(r.year)) {
      data[r.monthIndex][String(r.year)] = (data[r.monthIndex][String(r.year)] as number) + r.quantity;
    }
  }
  return data;
}

export function rankItems(records: SaleRecord[]): { item: string; total: number; family?: string }[] {
  const m = new Map<string, { total: number; family?: string }>();
  for (const r of records) {
    const cur = m.get(r.item);
    if (cur) cur.total += r.quantity;
    else m.set(r.item, { total: r.quantity, family: r.family });
  }
  return Array.from(m, ([item, v]) => ({ item, total: v.total, family: v.family }))
    .sort((a, b) => b.total - a.total);
}

export function rankFamilies(records: SaleRecord[]): { family: string; total: number }[] {
  const m = new Map<string, number>();
  for (const r of records) {
    if (!r.family) continue;
    m.set(r.family, (m.get(r.family) ?? 0) + r.quantity);
  }
  return Array.from(m, ([family, total]) => ({ family, total })).sort((a, b) => b.total - a.total);
}

export function abcCurve(items: { item: string; total: number; family?: string }[]): { item: string; total: number; family?: string; cum: number; cumPct: number; class: "A" | "B" | "C" }[] {
  const total = items.reduce((s, x) => s + x.total, 0) || 1;
  let cum = 0;
  return items.map((it) => {
    cum += it.total;
    const cumPct = (cum / total) * 100;
    const cls: "A" | "B" | "C" = cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C";
    return { ...it, cum, cumPct, class: cls };
  });
}

export function yoyGrowth(records: SaleRecord[]): { year: number; total: number; growth: number | null; isPartial?: boolean }[] {
  const years = Array.from(new Set(records.map(r => r.year))).sort();
  if (!years.length) return [];

  const lastYear = years[years.length - 1];
  const lastYearRecords = records.filter(r => r.year === lastYear);
  const maxMonth = lastYearRecords.length ? Math.max(...lastYearRecords.map(r => r.monthIndex)) : 11;
  const isLastYearPartial = maxMonth < 11;

  const yearTotals = byYear(records);

  return years.map((y, i) => {
    const total = yearTotals.get(y) || 0;
    if (i === 0) return { year: y, total, growth: null };

    const prevYear = years[i - 1];
    let prevCompareTotal = yearTotals.get(prevYear) || 0;

    // Se estivermos no último ano e ele for parcial, filtra o ano anterior pelo mesmo período
    if (y === lastYear && isLastYearPartial) {
      prevCompareTotal = records
        .filter(r => r.year === prevYear && r.monthIndex <= maxMonth)
        .reduce((s, r) => s + r.quantity, 0);
    }

    const growth = prevCompareTotal > 0 ? (total - prevCompareTotal) / prevCompareTotal : null;
    return { year: y, total, growth, isPartial: y === lastYear && isLastYearPartial };
  });
}

export function cagr(records: SaleRecord[]): number | null {
  const m = byYear(records);
  const years = Array.from(m.keys()).sort();
  if (years.length < 2) return null;
  const first = m.get(years[0])!;
  const last = m.get(years[years.length - 1])!;
  if (first <= 0) return null;
  const n = years.length - 1;
  return Math.pow(last / first, 1 / n) - 1;
}

export interface Kpis {
  totalHistorical: number;
  yoy: number | null;
  isYoyPartial?: boolean;
  topItem: string | null;
  topFamily: string | null;
  bestYear: { year: number; total: number } | null;
  bestMonth: { month: string; total: number } | null;
  cagr: number | null;
  monthlyAvg: number;
}

export function computeKpis(records: SaleRecord[]): Kpis {
  const total = sum(records);
  const yoyArr = yoyGrowth(records);
  const lastYoy = yoyArr.length ? yoyArr[yoyArr.length - 1] : null;
  
  const items = rankItems(records);
  const fams = rankFamilies(records);
  const yMap = byYear(records);
  let bestYear: { year: number; total: number } | null = null;
  for (const [y, t] of yMap) if (!bestYear || t > bestYear.total) bestYear = { year: y, total: t };
  const monthArr = byMonthAcrossYears(records);
  let bestMonth: { month: string; total: number } | null = null;
  for (const m of monthArr) if (!bestMonth || m.total > bestMonth.total) bestMonth = { month: m.month, total: m.total };
  const yearCount = yMap.size || 1;
  return {
    totalHistorical: total,
    yoy: lastYoy?.growth ?? null,
    isYoyPartial: lastYoy?.isPartial,
    topItem: items[0]?.item ?? null,
    topFamily: fams[0]?.family ?? null,
    bestYear,
    bestMonth,
    cagr: cagr(records),
    monthlyAvg: total / (yearCount * 12),
  };
}

export function seasonalityMatrix(records: SaleRecord[]): { years: number[]; matrix: number[][] } {
  const years = Array.from(new Set(records.map((r) => r.year))).sort();
  const matrix: number[][] = years.map(() => new Array(12).fill(0));
  for (const r of records) {
    const yi = years.indexOf(r.year);
    if (yi >= 0) matrix[yi][r.monthIndex] += r.quantity;
  }
  return { years, matrix };
}

export function computeLastMonthKpi(records: SaleRecord[]): { month: string; year: number; total: number; growthVsPrev: number | null } | null {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => (a.year * 12 + a.monthIndex) - (b.year * 12 + b.monthIndex));
  const last = sorted[sorted.length - 1];
  const lm = last.monthIndex;
  const ly = last.year;
  
  const total = records.filter(r => r.year === ly && r.monthIndex === lm).reduce((s, r) => s + r.quantity, 0);
  
  let pm = lm - 1;
  let py = ly;
  if (pm < 0) { pm = 11; py--; }
  
  const prevTotal = records.filter(r => r.year === py && r.monthIndex === pm).reduce((s, r) => s + r.quantity, 0);
  const growth = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;
  
  return { month: last.month, year: ly, total, growthVsPrev: growth };
}
