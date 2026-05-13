import { MONTHS, type SaleRecord } from "./types";
import { byYear, rankFamilies, rankItems, sum, yoyGrowth } from "./analytics";

export interface Insight {
  id: string;
  kind: "executive" | "analytical";
  tone: "positive" | "negative" | "neutral";
  text: string;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function trendOfItem(records: SaleRecord[], item: string): { startYear: number; endYear: number; growth: number | null } {
  const map = new Map<number, number>();
  for (const r of records) if (r.item === item) map.set(r.year, (map.get(r.year) ?? 0) + r.quantity);
  const years = Array.from(map.keys()).sort();
  if (years.length < 2) return { startYear: years[0] ?? 0, endYear: years[0] ?? 0, growth: null };
  const a = map.get(years[0])!;
  const b = map.get(years[years.length - 1])!;
  return { startYear: years[0], endYear: years[years.length - 1], growth: a > 0 ? (b - a) / a : null };
}

export function generateInsights(records: SaleRecord[]): Insight[] {
  const out: Insight[] = [];
  if (!records.length) return out;
  const total = sum(records);
  const items = rankItems(records).slice(0, 30);
  const fams = rankFamilies(records);
  const yoy = yoyGrowth(records);

  // Executive
  if (items[0]) {
    const t = trendOfItem(records, items[0].item);
    if (t.growth !== null) {
      out.push({
        id: "top-item-growth",
        kind: "executive",
        tone: t.growth >= 0 ? "positive" : "negative",
        text: `${items[0].item} ${t.growth >= 0 ? "cresceu" : "caiu"} ${pct(Math.abs(t.growth))} entre ${t.startYear} e ${t.endYear}.`,
      });
    }
  }

  if (fams[0]) {
    const share = fams[0].total / total;
    out.push({
      id: "top-family-share",
      kind: "executive",
      tone: "neutral",
      text: `Família ${fams[0].family} representa ${pct(share)} do volume total histórico.`,
    });
  }

  const bestYoY = yoy.filter((y) => y.growth !== null).sort((a, b) => (b.growth! - a.growth!))[0];
  if (bestYoY) {
    out.push({
      id: "best-yoy",
      kind: "executive",
      tone: "positive",
      text: `${bestYoY.year} apresentou o maior crescimento histórico: ${pct(bestYoY.growth!)} vs ano anterior.`,
    });
  }

  // Sazonalidade — mês mais forte
  const monthTot = new Array(12).fill(0);
  for (const r of records) monthTot[r.monthIndex] += r.quantity;
  const monthMean = monthTot.reduce((s, x) => s + x, 0) / 12;
  const peakIdx = monthTot.indexOf(Math.max(...monthTot));
  const peakRatio = monthMean ? monthTot[peakIdx] / monthMean : 1;
  if (peakRatio > 1.2) {
    out.push({
      id: "seasonality",
      kind: "analytical",
      tone: "neutral",
      text: `Existe forte sazonalidade em ${MONTHS[peakIdx]} (${pct(peakRatio - 1)} acima da média mensal).`,
    });
  }

  // Itens em queda
  for (const it of items.slice(0, 10)) {
    const t = trendOfItem(records, it.item);
    if (t.growth !== null && t.growth < -0.15) {
      out.push({
        id: `decline-${it.item}`,
        kind: "analytical",
        tone: "negative",
        text: `${it.item} apresenta tendência de queda desde ${t.startYear} (${pct(t.growth)}).`,
      });
    } else if (t.growth !== null && Math.abs(t.growth) < 0.05) {
      out.push({
        id: `stable-${it.item}`,
        kind: "analytical",
        tone: "neutral",
        text: `${it.item} possui comportamento estável ao longo do período.`,
      });
    } else if (t.growth !== null && t.growth > 0.25) {
      out.push({
        id: `growth-${it.item}`,
        kind: "analytical",
        tone: "positive",
        text: `${it.item} cresceu ${pct(t.growth)} entre ${t.startYear} e ${t.endYear}.`,
      });
    }
  }

  // Concentração ABC
  const sortedTotals = items.map((i) => i.total);
  const cum80 = (() => {
    const tot = sortedTotals.reduce((s, x) => s + x, 0);
    let acc = 0;
    for (let i = 0; i < sortedTotals.length; i++) {
      acc += sortedTotals[i];
      if (acc / tot >= 0.8) return i + 1;
    }
    return sortedTotals.length;
  })();
  out.push({
    id: "abc",
    kind: "analytical",
    tone: "neutral",
    text: `${cum80} produtos concentram 80% do volume — alta dependência de poucos SKUs.`,
  });

  return out.slice(0, 12);
}
