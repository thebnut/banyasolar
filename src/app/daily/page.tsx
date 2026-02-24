'use client';

import { useState } from 'react';
import { dailySummaries, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import type { DailySummary, IntervalData } from '@/lib/types';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

export default function DailyExplorerPage() {
  const dates = dailySummaries.map(d => d.date);
  const [selectedDate, setSelectedDate] = useState(dates[dates.length - 1]);
  const [dayData, setDayData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);

  const summary = dailySummaries.find(d => d.date === selectedDate);

  // Load full interval data for selected date
  const loadDayData = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    try {
      const mod = await import(`@/lib/data/days/${date}.json`);
      setDayData(mod.default as DailySummary);
    } catch {
      setDayData(null);
    }
    setLoading(false);
  };

  // Initialize on first render
  if (!dayData && !loading) {
    loadDayData(selectedDate);
  }

  const intervals = dayData?.intervals || [];

  const chartData = intervals.map((iv: IntervalData) => ({
    time: `${String(iv.hour).padStart(2, '0')}:${String(iv.minute).padStart(2, '0')}`,
    import: iv.importKwh,
    export: iv.exportKwh,
    importPrice: iv.importPrice,
    exportPrice: iv.exportPrice,
    isExpensive: iv.descriptor === 'high' || iv.descriptor === 'spike',
  }));

  // Show every 2 hours
  const tickInterval = Math.floor(chartData.length / 12) || 1;

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Explorer</h1>
          <p className="text-gray-400 text-sm mt-1">5-minute resolution view</p>
        </div>
        <div className="sm:ml-auto">
          <select
            value={selectedDate}
            onChange={(e) => loadDayData(e.target.value)}
            className="bg-[#161b22] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
          >
            {dates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Day summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard title="Import" value={`${summary.importKwh.toFixed(1)} kWh`} color="amber" />
          <StatCard title="Export" value={`${summary.exportKwh.toFixed(1)} kWh`} color="green" />
          <StatCard title="Net Cost" value={formatCents(summary.netCost)} color={summary.netCost < 0 ? 'green' : 'red'} />
          <StatCard title="Peak Price" value={`${summary.peakImportPrice.toFixed(0)}c`} color={summary.peakImportPrice > 100 ? 'red' : 'gray'} />
          <StatCard title="Spikes" value={`${summary.spikeCount}`} color={summary.spikeCount > 0 ? 'red' : 'green'} />
          <StatCard title="Renewables" value={`${summary.renewablesAvg.toFixed(0)}%`} color="green" />
        </div>
      )}

      {/* Energy chart */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Energy — Import & Export (kWh)</h3>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                interval={tickInterval}
              />
              <YAxis yAxisId="kwh" tick={{ fill: '#9ca3af', fontSize: 11 }} unit=" kWh" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area
                yAxisId="kwh"
                type="monotone"
                dataKey="import"
                name="Import kWh"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
              <Area
                yAxisId="kwh"
                type="monotone"
                dataKey="export"
                name="Export kWh"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Price chart */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Prices (c/kWh)</h3>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                interval={tickInterval}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="c" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '30c', fill: '#ef4444', fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="importPrice"
                name="Import Price"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="exportPrice"
                name="Export Price"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Expensive intervals table */}
      {intervals.filter(iv => iv.descriptor === 'high' || iv.descriptor === 'spike').length > 0 && (
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4">
            Expensive Intervals ({intervals.filter(iv => iv.descriptor === 'high' || iv.descriptor === 'spike').length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-right py-2 px-3">Price</th>
                  <th className="text-right py-2 px-3">Import</th>
                  <th className="text-right py-2 px-3">Cost</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {intervals
                  .filter(iv => iv.descriptor === 'high' || iv.descriptor === 'spike')
                  .map((iv, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-2 px-3 text-gray-300">
                        {String(iv.hour).padStart(2, '0')}:{String(iv.minute).padStart(2, '0')}
                      </td>
                      <td className="py-2 px-3 text-right text-red-400">
                        {iv.importPrice.toFixed(1)}c
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400">
                        {iv.importKwh.toFixed(3)} kWh
                      </td>
                      <td className="py-2 px-3 text-right text-red-400">
                        {formatCents(iv.importCost)}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          iv.descriptor === 'spike'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {iv.descriptor}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
