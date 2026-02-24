import dailySummariesJson from '@/lib/data/daily-summaries.json';
import monthlySummariesJson from '@/lib/data/monthly-summaries.json';
import batteryAnalysisJson from '@/lib/data/battery-analysis.json';
import priceDistributionJson from '@/lib/data/price-distribution.json';
import hourDayPricesJson from '@/lib/data/hour-day-prices.json';
import overallStatsJson from '@/lib/data/overall-stats.json';
import type {
  DailySummary,
  MonthlySummary,
  BatteryDayAnalysis,
  PriceDistribution,
  HourDayPrice,
  OverallStats,
} from './types';

export const dailySummaries = dailySummariesJson as DailySummary[];
export const monthlySummaries = monthlySummariesJson as MonthlySummary[];
export const batteryAnalysis = batteryAnalysisJson as BatteryDayAnalysis[];
export const priceDistribution = priceDistributionJson as PriceDistribution[];
export const hourDayPrices = hourDayPricesJson as HourDayPrice[];
export const overallStats = overallStatsJson as OverallStats;

export function getDailySummary(date: string): DailySummary | undefined {
  return dailySummaries.find(d => d.date === date);
}

export function getRecentDays(count: number): DailySummary[] {
  return dailySummaries.slice(-count);
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars < 0) {
    return `-$${Math.abs(dollars).toFixed(2)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

export function formatCentsShort(cents: number): string {
  return `${cents.toFixed(1)}c`;
}
