import { MONTHS, type SaleRecord } from "./types";
import { byYear } from "./analytics";

/**
 * Forecast next N months using:
 * - linear trend (least squares) on historical (year,month) totals
 * - seasonality factor by month (avg ratio vs yearly mean)
 * - confidence interval from residual stddev
 */
export interface ForecastPoint {
  label: string;       // "JAN/2027"
  year: number;
  monthIndex: number;
  value: number;
  lower: number;
  upper: number;
  isForecast: boolean;
}

export interface HistoricalPoint extends ForecastPoint {}

export function buildSeries(records: SaleRecord[]): { years: number[]; series: { year: number; mi: number; total: number }[] } {
  const map = new Map<string, number>();
  let maxYear = 0;
  let maxMi = 0;

  for (const r of records) {
    const k = `${r.year}-${r.monthIndex}`;
    map.set(k, (map.get(k) ?? 0) + r.quantity);
    if (r.year > maxYear || (r.year === maxYear && r.monthIndex > maxMi)) {
      maxYear = r.year;
      maxMi = r.monthIndex;
    }
  }

  const years = Array.from(new Set(records.map((r) => r.year))).sort();
  const series: { year: number; mi: number; total: number }[] = [];
  
  for (const y of years) {
    const endMi = y === maxYear ? maxMi : 11;
    for (let mi = 0; mi <= endMi; mi++) {
      series.push({ year: y, mi, total: map.get(`${y}-${mi}`) ?? 0 });
    }
  }
  return { years, series };
}

function linreg(ys: number[]): { a: number; b: number } {
  const n = ys.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += ys[i]; sxx += i * i; sxy += i * ys[i];
  }
  const denom = n * sxx - sx * sx || 1;
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}

export function forecast(records: SaleRecord[], horizonMonths?: number): { history: HistoricalPoint[]; future: ForecastPoint[] } {
  const { years, series } = buildSeries(records);
  if (!series.length) return { history: [], future: [] };

  const totals = series.map((s) => s.total);
  const { a, b } = linreg(totals);

  // Seasonality
  const monthSums = new Array(12).fill(0);
  const monthCounts = new Array(12).fill(0);
  for (const s of series) {
    monthSums[s.mi] += s.total;
    monthCounts[s.mi] += 1;
  }
  
  const globalAvg = totals.reduce((s, v) => s + v, 0) / totals.length || 1;
  const monthFactors = monthSums.map((sum, i) => monthCounts[i] ? (sum / monthCounts[i]) / globalAvg : 1);

  // Residuals
  const residuals: number[] = totals.map((v, i) => v - (a + b * i));
  const variance = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length - 1);
  const sd = Math.sqrt(variance);

  const history: HistoricalPoint[] = series.map((s, i) => ({
    label: `${MONTHS[s.mi]}/${s.year}`,
    year: s.year,
    monthIndex: s.mi,
    value: s.total,
    lower: s.total,
    upper: s.total,
    isForecast: false,
  }));

  const lastPoint = series[series.length - 1];
  const finalHorizon = horizonMonths ?? ((11 - lastPoint.mi) + 12);

  const future: ForecastPoint[] = [];
  let cy = lastPoint.year;
  let cmi = lastPoint.mi;
  
  for (let h = 1; h <= finalHorizon; h++) {
    cmi += 1;
    if (cmi > 11) { cmi = 0; cy += 1; }
    const idx = totals.length + h - 1;
    const trend = a + b * idx;
    const seasonal = monthFactors[cmi];
    const value = Math.max(0, trend * seasonal);
    const ci = 1.96 * sd * Math.sqrt(1 + h / Math.max(1, totals.length));
    future.push({
      label: `${MONTHS[cmi]}/${cy}`,
      year: cy,
      monthIndex: cmi,
      value,
      lower: Math.max(0, value - ci),
      upper: value + ci,
      isForecast: true,
    });
  }
  return { history, future };
}
