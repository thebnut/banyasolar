export interface UsageRecord {
  type: string;
  duration: number;
  date: string;
  endTime: string;
  quality: string;
  kwh: number;
  nemTime: string;
  perKwh: number;
  channelType: 'general' | 'feedIn';
  channelIdentifier: string;
  cost: number;
  renewables: number;
  spotPerKwh: number;
  startTime: string;
  spikeStatus: string;
  tariffInformation: {
    period: string;
    season: string;
  };
  descriptor: string;
}

export interface PriceRecord {
  type: string;
  date: string;
  duration: number;
  startTime: string;
  endTime: string;
  nemTime: string;
  perKwh: number;
  renewables: number;
  spotPerKwh: number;
  channelType: string;
  spikeStatus: string;
  tariffInformation: {
    period: string;
    season: string;
  };
  descriptor: string;
}

export interface DailySummary {
  date: string;
  importKwh: number;
  exportKwh: number;
  importCost: number; // cents
  exportRevenue: number; // cents (positive)
  netCost: number; // cents
  avgImportPrice: number; // c/kWh
  avgExportPrice: number; // c/kWh
  peakImportPrice: number;
  spikeCount: number;
  highCount: number;
  renewablesAvg: number;
  intervals: IntervalData[];
}

export interface IntervalData {
  nemTime: string;
  hour: number;
  minute: number;
  importKwh: number;
  exportKwh: number;
  importPrice: number;
  exportPrice: number;
  importCost: number;
  exportRevenue: number;
  descriptor: string;
  spikeStatus: string;
  period: string;
  renewables: number;
}

export interface HourlySummary {
  hour: number;
  importKwh: number;
  exportKwh: number;
  importCost: number;
  exportRevenue: number;
  avgImportPrice: number;
  avgExportPrice: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  importKwh: number;
  exportKwh: number;
  importCost: number;
  exportRevenue: number;
  netCost: number;
  days: number;
  avgDailyCost: number;
}

export interface BatteryDayAnalysis {
  date: string;
  score: number; // 0-100
  optimalSavings: number; // cents
  actualBehavior: number; // cents (what grid usage cost)
  missedSavings: number; // cents
  errorIntervals: BatteryErrorInterval[];
  chargeIntervals: number;
  dischargeIntervals: number;
  idleIntervals: number;
  optimalChargePrice: number;
  optimalDischargePrice: number;
}

export interface BatteryErrorInterval {
  nemTime: string;
  hour: number;
  importKwh: number;
  price: number;
  type: 'high_import' | 'low_export';
  potentialSaving: number; // cents
}

export interface PriceDistribution {
  bucket: string;
  count: number;
  min: number;
  max: number;
}

export interface HourDayPrice {
  hour: number;
  dayOfWeek: number;
  avgPrice: number;
  count: number;
}

export interface ProcessedData {
  dailySummaries: DailySummary[];
  monthlySummaries: MonthlySummary[];
  batteryAnalysis: BatteryDayAnalysis[];
  priceDistribution: PriceDistribution[];
  hourDayPrices: HourDayPrice[];
  overallStats: OverallStats;
}

export interface OverallStats {
  totalImportKwh: number;
  totalExportKwh: number;
  totalImportCost: number;
  totalExportRevenue: number;
  totalNetCost: number;
  avgDailyImport: number;
  avgDailyExport: number;
  avgDailyCost: number;
  totalDays: number;
  dateRange: { start: string; end: string };
  flatRateComparison: {
    flatImportCost: number;
    flatExportRevenue: number;
    flatNetCost: number;
    savings: number; // positive = wholesale is cheaper
  };
  avgBatteryScore: number;
  totalMissedSavings: number;
}
