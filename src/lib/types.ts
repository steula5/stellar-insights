export const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"] as const;
export type Month = typeof MONTHS[number];

export interface SaleRecord {
  year: number;
  month: Month;
  monthIndex: number; // 0..11
  item: string;
  family?: string;
  quantity: number;
}

export interface ImportedFile {
  name: string;
  year: number;
  rows: number;
}

export interface Filters {
  years: number[];        // empty = all
  items: string[];        // empty = all
  families: string[];     // empty = all
  months: number[];       // empty = all (0..11)
  topN: number;           // for rankings
}
