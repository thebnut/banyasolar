import * as fs from 'fs';
import * as path from 'path';

interface RawUsage {
  date: string;
  nemTime: string;
  kwh: number;
  cost: number;
  perKwh: number;
  spotPerKwh: number;
  channelType: 'general' | 'feedIn';
  descriptor: string;
  spikeStatus: string;
  tariffInformation: { period: string; season: string };
  renewables: number;
}

interface IntervalData {
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

interface DailySummary {
  date: string;
  importKwh: number;
  exportKwh: number;
  importCost: number;
  exportRevenue: number;
  netCost: number;
  avgImportPrice: number;
  avgExportPrice: number;
  peakImportPrice: number;
  spikeCount: number;
  highCount: number;
  renewablesAvg: number;
  intervals: IntervalData[];
}

interface BatteryErrorInterval {
  nemTime: string;
  hour: number;
  importKwh: number;
  price: number;
  type: 'high_import' | 'low_export';
  potentialSaving: number;
}

interface BatteryDayAnalysis {
  date: string;
  score: number;
  optimalSavings: number;
  actualBehavior: number;
  missedSavings: number;
  errorIntervals: BatteryErrorInterval[];
  chargeIntervals: number;
  dischargeIntervals: number;
  idleIntervals: number;
  optimalChargePrice: number;
  optimalDischargePrice: number;
}

const BATTERY_CAPACITY = 12.8; // kWh
const FLAT_IMPORT_RATE = 30; // c/kWh
const FLAT_EXPORT_RATE = 5; // c/kWh

const dataDir = path.join(__dirname, '..', 'data');
const outDir = path.join(__dirname, '..', 'src', 'lib', 'data');

fs.mkdirSync(outDir, { recursive: true });

console.log('Loading usage data...');
const usageRaw: RawUsage[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'all_usage.json'), 'utf-8')
);

console.log(`Loaded ${usageRaw.length} usage records`);

// Group usage by date and time interval
const intervalMap = new Map<string, { general?: RawUsage; feedIn?: RawUsage }>();

for (const record of usageRaw) {
  const key = `${record.date}_${record.nemTime}`;
  if (!intervalMap.has(key)) {
    intervalMap.set(key, {});
  }
  const entry = intervalMap.get(key)!;
  if (record.channelType === 'general') {
    entry.general = record;
  } else {
    entry.feedIn = record;
  }
}

// Build daily summaries
const dailyMap = new Map<string, IntervalData[]>();

for (const [, pair] of intervalMap) {
  const gen = pair.general;
  const feed = pair.feedIn;
  const date = gen?.date || feed?.date || '';
  const nemTime = gen?.nemTime || feed?.nemTime || '';

  if (!date || !nemTime) continue;

  const dt = new Date(nemTime);
  const hour = dt.getHours();
  const minute = dt.getMinutes();

  const interval: IntervalData = {
    nemTime,
    hour,
    minute,
    importKwh: gen?.kwh || 0,
    exportKwh: feed?.kwh || 0,
    importPrice: gen?.perKwh || 0,
    exportPrice: feed ? Math.abs(feed.perKwh) : 0,
    importCost: gen?.cost || 0,
    exportRevenue: feed ? Math.abs(feed.cost) : 0,
    descriptor: gen?.descriptor || feed?.descriptor || 'neutral',
    spikeStatus: gen?.spikeStatus || 'none',
    period: gen?.tariffInformation?.period || '',
    renewables: gen?.renewables || feed?.renewables || 0,
  };

  if (!dailyMap.has(date)) {
    dailyMap.set(date, []);
  }
  dailyMap.get(date)!.push(interval);
}

// Sort intervals within each day
for (const [, intervals] of dailyMap) {
  intervals.sort((a, b) => a.nemTime.localeCompare(b.nemTime));
}

// Build daily summaries
const dailySummaries: DailySummary[] = [];
const sortedDates = [...dailyMap.keys()].sort();

for (const date of sortedDates) {
  const intervals = dailyMap.get(date)!;

  let importKwh = 0;
  let exportKwh = 0;
  let importCost = 0;
  let exportRevenue = 0;
  let peakImportPrice = 0;
  let spikeCount = 0;
  let highCount = 0;
  let renewablesSum = 0;
  let importIntervals = 0;
  let exportIntervals = 0;

  for (const iv of intervals) {
    importKwh += iv.importKwh;
    exportKwh += iv.exportKwh;
    importCost += iv.importCost;
    exportRevenue += iv.exportRevenue;
    renewablesSum += iv.renewables;

    if (iv.importPrice > peakImportPrice) {
      peakImportPrice = iv.importPrice;
    }
    if (iv.spikeStatus === 'spike') spikeCount++;
    if (iv.descriptor === 'high' || iv.descriptor === 'spike') highCount++;
    if (iv.importKwh > 0) importIntervals++;
    if (iv.exportKwh > 0) exportIntervals++;
  }

  const avgImportPrice = importIntervals > 0 ? importCost / importKwh : 0;
  const avgExportPrice = exportIntervals > 0 ? exportRevenue / exportKwh : 0;

  dailySummaries.push({
    date,
    importKwh: round(importKwh, 3),
    exportKwh: round(exportKwh, 3),
    importCost: round(importCost, 2),
    exportRevenue: round(exportRevenue, 2),
    netCost: round(importCost - exportRevenue, 2),
    avgImportPrice: round(avgImportPrice, 2),
    avgExportPrice: round(avgExportPrice, 2),
    peakImportPrice: round(peakImportPrice, 2),
    spikeCount,
    highCount,
    renewablesAvg: round(renewablesSum / intervals.length, 1),
    intervals,
  });
}

// Monthly summaries
const monthlyMap = new Map<string, DailySummary[]>();
for (const day of dailySummaries) {
  const month = day.date.substring(0, 7);
  if (!monthlyMap.has(month)) {
    monthlyMap.set(month, []);
  }
  monthlyMap.get(month)!.push(day);
}

const monthlySummaries = [...monthlyMap.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, days]) => {
    const importKwh = days.reduce((s, d) => s + d.importKwh, 0);
    const exportKwh = days.reduce((s, d) => s + d.exportKwh, 0);
    const importCost = days.reduce((s, d) => s + d.importCost, 0);
    const exportRevenue = days.reduce((s, d) => s + d.exportRevenue, 0);
    const netCost = importCost - exportRevenue;

    return {
      month,
      importKwh: round(importKwh, 2),
      exportKwh: round(exportKwh, 2),
      importCost: round(importCost, 2),
      exportRevenue: round(exportRevenue, 2),
      netCost: round(netCost, 2),
      days: days.length,
      avgDailyCost: round(netCost / days.length, 2),
    };
  });

// Battery analysis
console.log('Computing battery analysis...');
const batteryAnalysis: BatteryDayAnalysis[] = [];

for (const day of dailySummaries) {
  const intervals = day.intervals;

  // Sort intervals by import price (descending) for optimal calc
  const sorted = [...intervals].sort((a, b) => b.importPrice - a.importPrice);

  // Optimal discharge: most expensive intervals up to battery capacity
  let optDischargeKwh = 0;
  let optDischargeValue = 0;
  const optDischargeIntervals: IntervalData[] = [];
  for (const iv of sorted) {
    if (optDischargeKwh >= BATTERY_CAPACITY) break;
    const canDischarge = Math.min(iv.importKwh || 0.4, BATTERY_CAPACITY - optDischargeKwh);
    if (canDischarge > 0) {
      optDischargeKwh += canDischarge;
      optDischargeValue += canDischarge * iv.importPrice;
      optDischargeIntervals.push(iv);
    }
  }

  // Optimal charge: cheapest intervals up to battery capacity
  const sortedAsc = [...intervals].sort((a, b) => a.importPrice - b.importPrice);
  let optChargeKwh = 0;
  let optChargeValue = 0;
  for (const iv of sortedAsc) {
    if (optChargeKwh >= BATTERY_CAPACITY) break;
    const canCharge = Math.min(0.4, BATTERY_CAPACITY - optChargeKwh);
    optChargeKwh += canCharge;
    optChargeValue += canCharge * iv.importPrice;
  }

  const optimalSavings = optDischargeValue - optChargeValue;

  // Error detection
  const errorIntervals: BatteryErrorInterval[] = [];
  let chargeIntervals = 0;
  let dischargeIntervals = 0;
  let idleIntervals = 0;

  for (const iv of intervals) {
    const isSolarHour = iv.hour >= 6 && iv.hour < 18;

    // High price + heavy import = battery should have discharged
    if (iv.importPrice > 30 && iv.importKwh > 0.1) {
      const saving = iv.importKwh * (iv.importPrice - 5); // could have used battery instead
      errorIntervals.push({
        nemTime: iv.nemTime,
        hour: iv.hour,
        importKwh: round(iv.importKwh, 3),
        price: round(iv.importPrice, 2),
        type: 'high_import',
        potentialSaving: round(saving, 2),
      });
    }

    // Negative/very low price + exporting = should have charged
    if (iv.importPrice < 0 && iv.exportKwh > 0.1) {
      errorIntervals.push({
        nemTime: iv.nemTime,
        hour: iv.hour,
        importKwh: round(iv.exportKwh, 3),
        price: round(iv.importPrice, 2),
        type: 'low_export',
        potentialSaving: round(iv.exportKwh * Math.abs(iv.importPrice), 2),
      });
    }

    // Infer battery behavior
    if (isSolarHour && iv.exportKwh < 0.05 && iv.importKwh < 0.05) {
      chargeIntervals++;
    } else if (!isSolarHour && iv.importKwh < 0.1) {
      dischargeIntervals++;
    } else {
      idleIntervals++;
    }
  }

  // Actual vs optimal comparison
  const missedSavings = errorIntervals.reduce((s, e) => s + e.potentialSaving, 0);

  // Score: ratio of actual to optimal behavior
  // Simple scoring: percentage of high-price intervals that were NOT importing heavily
  const highPriceIntervals = intervals.filter(iv => iv.importPrice > 30);
  const goodDischarges = highPriceIntervals.filter(iv => iv.importKwh < 0.1).length;
  const score = highPriceIntervals.length > 0
    ? Math.round((goodDischarges / highPriceIntervals.length) * 100)
    : 100;

  batteryAnalysis.push({
    date: day.date,
    score,
    optimalSavings: round(optimalSavings, 2),
    actualBehavior: round(day.importCost, 2),
    missedSavings: round(missedSavings, 2),
    errorIntervals: errorIntervals.slice(0, 20), // limit for file size
    chargeIntervals,
    dischargeIntervals,
    idleIntervals,
    optimalChargePrice: optChargeKwh > 0 ? round(optChargeValue / optChargeKwh, 2) : 0,
    optimalDischargePrice: optDischargeKwh > 0 ? round(optDischargeValue / optDischargeKwh, 2) : 0,
  });
}

// Price analysis
console.log('Computing price analysis...');
const allImportPrices = usageRaw
  .filter(r => r.channelType === 'general')
  .map(r => r.perKwh);

const buckets = [
  { label: '< -10', min: -Infinity, max: -10 },
  { label: '-10 to 0', min: -10, max: 0 },
  { label: '0 to 10', min: 0, max: 10 },
  { label: '10 to 20', min: 10, max: 20 },
  { label: '20 to 30', min: 20, max: 30 },
  { label: '30 to 40', min: 30, max: 40 },
  { label: '40 to 50', min: 40, max: 50 },
  { label: '50 to 75', min: 50, max: 75 },
  { label: '75 to 100', min: 75, max: 100 },
  { label: '100+', min: 100, max: Infinity },
];

const priceDistribution = buckets.map(b => ({
  bucket: b.label,
  count: allImportPrices.filter(p => p >= b.min && p < b.max).length,
  min: b.min === -Infinity ? -100 : b.min,
  max: b.max === Infinity ? 500 : b.max,
}));

// Hour x DayOfWeek price heatmap
const hourDayMap = new Map<string, { sum: number; count: number }>();
for (const record of usageRaw) {
  if (record.channelType !== 'general') continue;
  const dt = new Date(record.nemTime);
  const hour = dt.getHours();
  const dow = dt.getDay();
  const key = `${hour}_${dow}`;
  if (!hourDayMap.has(key)) {
    hourDayMap.set(key, { sum: 0, count: 0 });
  }
  const entry = hourDayMap.get(key)!;
  entry.sum += record.perKwh;
  entry.count++;
}

const hourDayPrices = [...hourDayMap.entries()].map(([key, val]) => {
  const [hour, dow] = key.split('_').map(Number);
  return {
    hour,
    dayOfWeek: dow,
    avgPrice: round(val.sum / val.count, 2),
    count: val.count,
  };
});

// Period (peak/shoulder/offpeak) aggregates
const periodTotals: Record<string, { kwh: number; cost: number; count: number }> = {};
for (const day of dailySummaries) {
  for (const iv of day.intervals) {
    const period = iv.period || 'unknown';
    if (!periodTotals[period]) {
      periodTotals[period] = { kwh: 0, cost: 0, count: 0 };
    }
    periodTotals[period].kwh += iv.importKwh;
    periodTotals[period].cost += iv.importCost;
    periodTotals[period].count++;
  }
}

const periodSummaries = Object.entries(periodTotals)
  .filter(([k]) => k !== 'unknown')
  .map(([period, data]) => ({
    period: period.charAt(0).toUpperCase() + period.slice(1),
    kwh: round(data.kwh, 1),
    cost: round(data.cost, 2),
    avgPrice: data.kwh > 0 ? round(data.cost / data.kwh, 1) : 0,
  }));

// Overall stats
const totalImportKwh = dailySummaries.reduce((s, d) => s + d.importKwh, 0);
const totalExportKwh = dailySummaries.reduce((s, d) => s + d.exportKwh, 0);
const totalImportCost = dailySummaries.reduce((s, d) => s + d.importCost, 0);
const totalExportRevenue = dailySummaries.reduce((s, d) => s + d.exportRevenue, 0);
const totalNetCost = totalImportCost - totalExportRevenue;
const totalDays = dailySummaries.length;

const flatImportCost = totalImportKwh * FLAT_IMPORT_RATE;
const flatExportRevenue = totalExportKwh * FLAT_EXPORT_RATE;
const flatNetCost = flatImportCost - flatExportRevenue;
const savings = flatNetCost - totalNetCost;

const avgBatteryScore = batteryAnalysis.reduce((s, b) => s + b.score, 0) / batteryAnalysis.length;
const totalMissedSavings = batteryAnalysis.reduce((s, b) => s + b.missedSavings, 0);

const overallStats = {
  totalImportKwh: round(totalImportKwh, 2),
  totalExportKwh: round(totalExportKwh, 2),
  totalImportCost: round(totalImportCost, 2),
  totalExportRevenue: round(totalExportRevenue, 2),
  totalNetCost: round(totalNetCost, 2),
  avgDailyImport: round(totalImportKwh / totalDays, 2),
  avgDailyExport: round(totalExportKwh / totalDays, 2),
  avgDailyCost: round(totalNetCost / totalDays, 2),
  totalDays,
  dateRange: {
    start: sortedDates[0],
    end: sortedDates[sortedDates.length - 1],
  },
  flatRateComparison: {
    flatImportCost: round(flatImportCost, 2),
    flatExportRevenue: round(flatExportRevenue, 2),
    flatNetCost: round(flatNetCost, 2),
    savings: round(savings, 2),
  },
  avgBatteryScore: round(avgBatteryScore, 1),
  totalMissedSavings: round(totalMissedSavings, 2),
};

// Write outputs — split daily summaries to keep file sizes manageable
// Write summaries WITHOUT intervals for the list views
const dailySummariesCompact = dailySummaries.map(d => ({
  ...d,
  intervals: undefined,
}));

console.log('Writing output files...');

writeJson('daily-summaries.json', dailySummariesCompact);
writeJson('monthly-summaries.json', monthlySummaries);
writeJson('battery-analysis.json', batteryAnalysis);
writeJson('price-distribution.json', priceDistribution);
writeJson('hour-day-prices.json', hourDayPrices);
writeJson('overall-stats.json', overallStats);
writeJson('period-summaries.json', periodSummaries);

// Write individual day files with full interval data
const daysDir = path.join(outDir, 'days');
fs.mkdirSync(daysDir, { recursive: true });
for (const day of dailySummaries) {
  writeJson(`days/${day.date}.json`, day);
}

console.log(`Done! Processed ${totalDays} days of data.`);
console.log(`Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`);
console.log(`Total import: ${round(totalImportKwh, 1)} kWh ($${round(totalImportCost / 100, 2)})`);
console.log(`Total export: ${round(totalExportKwh, 1)} kWh ($${round(totalExportRevenue / 100, 2)})`);
console.log(`Net cost: $${round(totalNetCost / 100, 2)}`);
console.log(`Flat rate would have been: $${round(flatNetCost / 100, 2)}`);
console.log(`Wholesale savings: $${round(savings / 100, 2)}`);
console.log(`Avg battery score: ${round(avgBatteryScore, 1)}%`);

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(data));
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
