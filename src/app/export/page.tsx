'use client';

import { dailySummaries, monthlySummaries, overallStats, batteryAnalysis, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';

export default function ExportPage() {
  const stats = overallStats;

  const downloadCSV = () => {
    const headers = [
      'Date', 'Import kWh', 'Export kWh', 'Import Cost ($)',
      'Export Revenue ($)', 'Net Cost ($)', 'Avg Import Price (c/kWh)',
      'Avg Export Price (c/kWh)', 'Peak Price (c/kWh)', 'Spikes',
      'Battery Score (%)', 'Missed Savings ($)', 'Renewables %'
    ];

    const rows = dailySummaries.map(d => {
      const bat = batteryAnalysis.find(b => b.date === d.date);
      return [
        d.date,
        d.importKwh.toFixed(3),
        d.exportKwh.toFixed(3),
        (d.importCost / 100).toFixed(2),
        (d.exportRevenue / 100).toFixed(2),
        (d.netCost / 100).toFixed(2),
        d.avgImportPrice.toFixed(2),
        d.avgExportPrice.toFixed(2),
        d.peakImportPrice.toFixed(2),
        d.spikeCount,
        bat?.score || 0,
        bat ? (bat.missedSavings / 100).toFixed(2) : '0',
        d.renewablesAvg.toFixed(1),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banya-solar-daily-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMonthlyCSV = () => {
    const headers = [
      'Month', 'Days', 'Import kWh', 'Export kWh', 'Import Cost ($)',
      'Export Revenue ($)', 'Net Cost ($)', 'Avg Daily Cost ($)'
    ];

    const rows = monthlySummaries.map(m => [
      m.month,
      m.days,
      m.importKwh.toFixed(2),
      m.exportKwh.toFixed(2),
      (m.importCost / 100).toFixed(2),
      (m.exportRevenue / 100).toFixed(2),
      (m.netCost / 100).toFixed(2),
      (m.avgDailyCost / 100).toFixed(2),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banya-solar-monthly-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Export & Reporting</h1>
        <p className="text-gray-400 text-sm mt-1">Download data and view key metrics summary</p>
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={downloadCSV}
          className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-6 text-left hover:bg-amber-500/25 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <h3 className="text-lg font-semibold text-amber-400">Daily Summary CSV</h3>
          </div>
          <p className="text-sm text-gray-400">
            {dailySummaries.length} days of data including energy, costs, prices, battery scores, and renewables
          </p>
        </button>

        <button
          onClick={downloadMonthlyCSV}
          className="bg-green-500/15 border border-green-500/30 rounded-xl p-6 text-left hover:bg-green-500/25 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <h3 className="text-lg font-semibold text-green-400">Monthly Summary CSV</h3>
          </div>
          <p className="text-sm text-gray-400">
            {monthlySummaries.length} months of aggregated energy and cost data
          </p>
        </button>
      </div>

      {/* Key metrics summary */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Key Metrics Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Energy */}
          <div>
            <h4 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wide">Energy</h4>
            <div className="space-y-3">
              <MetricRow label="Total Import" value={`${stats.totalImportKwh.toFixed(0)} kWh`} />
              <MetricRow label="Total Export" value={`${stats.totalExportKwh.toFixed(0)} kWh`} />
              <MetricRow label="Avg Daily Import" value={`${stats.avgDailyImport.toFixed(1)} kWh`} />
              <MetricRow label="Avg Daily Export" value={`${stats.avgDailyExport.toFixed(1)} kWh`} />
              <MetricRow label="Net Import" value={`${(stats.totalImportKwh - stats.totalExportKwh).toFixed(0)} kWh`} />
            </div>
          </div>

          {/* Cost */}
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wide">Financial</h4>
            <div className="space-y-3">
              <MetricRow label="Total Import Cost" value={formatCents(stats.totalImportCost)} />
              <MetricRow label="Total Export Revenue" value={formatCents(stats.totalExportRevenue)} />
              <MetricRow label="Net Cost" value={formatCents(stats.totalNetCost)} />
              <MetricRow label="Avg Daily Cost" value={formatCents(stats.avgDailyCost)} />
              <MetricRow label="Wholesale Savings" value={formatCents(stats.flatRateComparison.savings)} highlight />
            </div>
          </div>

          {/* Comparison */}
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide">Flat Rate Comparison</h4>
            <div className="space-y-3">
              <MetricRow label="Flat Import (30c/kWh)" value={formatCents(stats.flatRateComparison.flatImportCost)} />
              <MetricRow label="Flat Export (5c/kWh)" value={formatCents(stats.flatRateComparison.flatExportRevenue)} />
              <MetricRow label="Flat Net Cost" value={formatCents(stats.flatRateComparison.flatNetCost)} />
              <MetricRow label="Savings with Amber" value={formatCents(stats.flatRateComparison.savings)} highlight />
            </div>
          </div>

          {/* Battery */}
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wide">Battery</h4>
            <div className="space-y-3">
              <MetricRow label="Avg Battery Score" value={`${stats.avgBatteryScore}%`} />
              <MetricRow label="Total Missed Savings" value={formatCents(stats.totalMissedSavings)} />
              <MetricRow label="Data Period" value={`${stats.totalDays} days`} />
              <MetricRow label="Date Range" value={`${stats.dateRange.start} to ${stats.dateRange.end}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-2 px-3">Month</th>
                <th className="text-right py-2 px-3">Days</th>
                <th className="text-right py-2 px-3">Import</th>
                <th className="text-right py-2 px-3">Export</th>
                <th className="text-right py-2 px-3">Cost</th>
                <th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">Net</th>
                <th className="text-right py-2 px-3">$/Day</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummaries.map(m => (
                <tr key={m.month} className="border-b border-gray-800/50">
                  <td className="py-2 px-3 text-gray-300 font-medium">{m.month}</td>
                  <td className="py-2 px-3 text-right text-gray-400">{m.days}</td>
                  <td className="py-2 px-3 text-right text-amber-400">{m.importKwh.toFixed(0)} kWh</td>
                  <td className="py-2 px-3 text-right text-green-400">{m.exportKwh.toFixed(0)} kWh</td>
                  <td className="py-2 px-3 text-right text-red-400">{formatCents(m.importCost)}</td>
                  <td className="py-2 px-3 text-right text-green-400">{formatCents(m.exportRevenue)}</td>
                  <td className="py-2 px-3 text-right text-white font-medium">{formatCents(m.netCost)}</td>
                  <td className="py-2 px-3 text-right text-gray-400">{formatCents(m.avgDailyCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-green-400' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}
