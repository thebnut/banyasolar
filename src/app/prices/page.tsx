'use client';

import { priceDistribution, hourDayPrices, dailySummaries, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PricesPage() {
  // Spike analysis
  const totalSpikes = dailySummaries.reduce((s, d) => s + d.spikeCount, 0);
  const totalHigh = dailySummaries.reduce((s, d) => s + d.highCount, 0);
  const avgRenewables = dailySummaries.reduce((s, d) => s + d.renewablesAvg, 0) / dailySummaries.length;

  // All daily avg prices for feed-in trend
  const priceTrend = dailySummaries.map(d => ({
    date: d.date.slice(5),
    avgImport: Number(d.avgImportPrice.toFixed(1)),
    avgExport: Number(d.avgExportPrice.toFixed(1)),
    peak: Number(d.peakImportPrice.toFixed(0)),
  }));

  // Heatmap data: hour x day-of-week
  const heatmapData: { hour: number; day: number; price: number }[] = [];
  for (const item of hourDayPrices) {
    heatmapData.push({
      hour: item.hour,
      day: item.dayOfWeek,
      price: item.avgPrice,
    });
  }

  const maxHeatPrice = Math.max(...heatmapData.map(d => d.price));
  const minHeatPrice = Math.min(...heatmapData.map(d => d.price));

  // Spike days
  const spikeDays = dailySummaries
    .filter(d => d.spikeCount > 0)
    .sort((a, b) => b.spikeCount - a.spikeCount)
    .slice(0, 10);

  // Renewables vs price scatter (daily)
  const renewablesData = dailySummaries.map(d => ({
    date: d.date.slice(5),
    renewables: Number(d.renewablesAvg.toFixed(1)),
    avgImport: Number(d.avgImportPrice.toFixed(1)),
  }));

  // Export price trend
  const exportTrend = dailySummaries.map(d => ({
    date: d.date.slice(5),
    avgExport: Number(d.avgExportPrice.toFixed(1)),
  }));

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Price Analysis</h1>
        <p className="text-gray-400 text-sm mt-1">Wholesale price patterns and spike analysis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Spikes"
          value={totalSpikes.toString()}
          subtitle="Spike intervals"
          color="red"
        />
        <StatCard
          title="High Price Intervals"
          value={totalHigh.toString()}
          subtitle="High or spike"
          color="amber"
        />
        <StatCard
          title="Avg Renewables"
          value={`${avgRenewables.toFixed(0)}%`}
          color="green"
        />
        <StatCard
          title="Spike Days"
          value={spikeDays.length.toString()}
          subtitle={`out of ${dailySummaries.length} days`}
          color={spikeDays.length > 10 ? 'red' : 'amber'}
        />
      </div>

      {/* Price distribution */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Import Price Distribution (c/kWh)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={priceDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="bucket" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="count" name="Intervals" radius={[4, 4, 0, 0]}>
              {priceDistribution.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.bucket.includes('-') || entry.bucket === '0 to 10'
                      ? '#22c55e'
                      : entry.bucket === '100+'
                      ? '#ef4444'
                      : entry.bucket.includes('50') || entry.bucket.includes('75')
                      ? '#f97316'
                      : '#f59e0b'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price trend */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Average Price Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={priceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={6} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="c" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Line type="monotone" dataKey="avgImport" name="Avg Import (c/kWh)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="avgExport" name="Avg Export (c/kWh)" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Time-of-day heatmap */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Price Heatmap — Hour × Day of Week</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header row */}
            <div className="flex gap-1 mb-1">
              <div className="w-12 text-xs text-gray-500" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-gray-500">
                  {h}
                </div>
              ))}
            </div>
            {/* Data rows */}
            {DAY_NAMES.map((dayName, dayIdx) => (
              <div key={dayIdx} className="flex gap-1 mb-1">
                <div className="w-12 text-xs text-gray-400 flex items-center">{dayName}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmapData.find(d => d.hour === h && d.day === dayIdx);
                  const price = cell?.price || 0;
                  const normalized = (price - minHeatPrice) / (maxHeatPrice - minHeatPrice);
                  const r = Math.round(245 * normalized);
                  const g = Math.round(158 * (1 - normalized * 0.7));
                  const b = Math.round(11 + 60 * (1 - normalized));
                  return (
                    <div
                      key={h}
                      className="flex-1 h-8 rounded-sm flex items-center justify-center text-[9px] text-white/70 cursor-default"
                      style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, ${0.3 + normalized * 0.5})` }}
                      title={`${dayName} ${h}:00 — ${price.toFixed(1)}c/kWh`}
                    >
                      {price.toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Renewables vs price */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Renewables % vs Import Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={renewablesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={6} />
            <YAxis yAxisId="price" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="c" />
            <YAxis yAxisId="renew" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Line yAxisId="price" type="monotone" dataKey="avgImport" name="Avg Import (c/kWh)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            <Line yAxisId="renew" type="monotone" dataKey="renewables" name="Renewables %" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Spike days table */}
      {spikeDays.length > 0 && (
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4">Top Spike Days</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Spikes</th>
                  <th className="text-right py-2 px-3">Peak Price</th>
                  <th className="text-right py-2 px-3">Import Cost</th>
                  <th className="text-right py-2 px-3">Net Cost</th>
                </tr>
              </thead>
              <tbody>
                {spikeDays.map(d => (
                  <tr key={d.date} className="border-b border-gray-800/50">
                    <td className="py-2 px-3 text-gray-300">{d.date}</td>
                    <td className="py-2 px-3 text-right text-red-400">{d.spikeCount}</td>
                    <td className="py-2 px-3 text-right text-amber-400">{d.peakImportPrice.toFixed(0)}c</td>
                    <td className="py-2 px-3 text-right text-gray-300">{formatCents(d.importCost)}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{formatCents(d.netCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feed-in rate trend */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Feed-in Rate Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={exportTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={6} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="c" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Line type="monotone" dataKey="avgExport" name="Avg Feed-in Rate (c/kWh)" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
