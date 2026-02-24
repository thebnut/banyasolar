'use client';

import { useState, useMemo } from 'react';
import { dailySummaries, batteryAnalysis, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import type { DailySummary, IntervalData, BatteryDayAnalysis } from '@/lib/types';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';

// Infer battery state for a 5-min interval
function inferBatteryState(iv: IntervalData): 'charging' | 'discharging' | 'idle' {
  const isDaylight = iv.hour >= 6 && iv.hour < 18;
  if (isDaylight) {
    // Solar hours: low export + low import = battery likely charging from solar
    if (iv.exportKwh < 0.05 && iv.importKwh < 0.05) return 'charging';
  } else {
    // Night: low import = battery likely discharging to serve load
    if (iv.importKwh < 0.03) return 'discharging';
  }
  return 'idle';
}

// Battery state color mapping
const batteryStateColors: Record<string, string> = {
  charging: '#3b82f6',    // blue
  discharging: '#a855f7', // purple
  idle: '#374151',        // dark gray
};

const batteryStateLabels: Record<string, string> = {
  charging: 'Charging (est.)',
  discharging: 'Discharging (est.)',
  idle: 'Idle',
};

// Pre-calculate worst days: highest net cost + missed savings
function getWorstDays(): { date: string; netCost: number; missedSavings: number; label: string }[] {
  const batteryMap = new Map<string, BatteryDayAnalysis>();
  batteryAnalysis.forEach(b => batteryMap.set(b.date, b));

  const scored = dailySummaries.map(d => {
    const ba = batteryMap.get(d.date);
    const missedSavings = ba?.missedSavings ?? 0;
    // Combined score: net cost + missed savings gives worst overall days
    return {
      date: d.date,
      netCost: d.netCost,
      missedSavings,
      score: d.netCost + missedSavings,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(d => ({
      date: d.date,
      netCost: d.netCost,
      missedSavings: d.missedSavings,
      label: `${d.date}  —  Net: ${formatCents(d.netCost)}${d.missedSavings > 0 ? ` | Missed: ${formatCents(d.missedSavings)}` : ''}`,
    }));
}

export default function DailyExplorerPage() {
  const dates = dailySummaries.map(d => d.date);
  const [selectedDate, setSelectedDate] = useState(dates[dates.length - 1]);
  const [dayData, setDayData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);

  const worstDays = useMemo(() => getWorstDays(), []);

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

  // Energy chart data with inferred solar & battery state
  const chartData = intervals.map((iv: IntervalData) => {
    const isDaylight = iv.hour >= 6 && iv.hour < 18;
    // Inferred solar: during daylight, total generation = import + export (what the house uses from grid + what it sends back)
    // This is a minimum estimate — actual solar could be higher (serving local load directly)
    const inferredSolar = isDaylight ? iv.importKwh + iv.exportKwh : 0;
    const batteryState = inferBatteryState(iv);

    return {
      time: `${String(iv.hour).padStart(2, '0')}:${String(iv.minute).padStart(2, '0')}`,
      import: iv.importKwh,
      export: iv.exportKwh,
      inferredSolar: inferredSolar > 0 ? inferredSolar : null,
      batteryBand: 0.02, // constant height for colored band
      batteryState,
      batteryColor: batteryStateColors[batteryState],
      importPrice: iv.importPrice,
      exportPrice: iv.exportPrice,
      isExpensive: iv.descriptor === 'high' || iv.descriptor === 'spike',
    };
  });

  // Cost & Revenue chart data
  const costChartData = intervals.map((iv: IntervalData) => ({
    time: `${String(iv.hour).padStart(2, '0')}:${String(iv.minute).padStart(2, '0')}`,
    importCost: iv.importCost > 0 ? iv.importCost : 0,
    exportRevenue: iv.exportRevenue > 0 ? iv.exportRevenue : 0,
    importPrice: iv.importPrice,
    exportPrice: Math.abs(iv.exportPrice),
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
        <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
          {/* Worst days dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) loadDayData(e.target.value);
              e.target.value = ''; // reset to placeholder
            }}
            defaultValue=""
            className="bg-[#161b22] border border-red-700/50 rounded-lg px-3 py-2 text-sm text-red-400 focus:outline-none focus:border-red-500"
          >
            <option value="" disabled>Jump to worst day...</option>
            {worstDays.map(d => (
              <option key={d.date} value={d.date} className="text-gray-200">
                {d.label}
              </option>
            ))}
          </select>
          {/* Date picker */}
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

      {/* Energy chart with inferred solar & battery */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Energy — Import, Export & Inferred Solar (kWh)</h3>
          <span className="text-xs text-gray-500 italic">Solar & battery state are estimated from grid data</span>
        </div>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <>
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
                  formatter={(value?: number) => [`${(value ?? 0).toFixed(3)} kWh`, undefined]}
                />
                {/* Inferred solar as background area */}
                <Area
                  yAxisId="kwh"
                  type="monotone"
                  dataKey="inferredSolar"
                  name="Inferred Solar (est.)"
                  stroke="#eab308"
                  fill="#eab308"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  connectNulls={false}
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
            {/* Battery state band */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-medium">Inferred Battery State:</span>
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Charging
                </span>
                <span className="flex items-center gap-1 text-xs text-purple-400">
                  <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> Discharging
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm bg-gray-600 inline-block" /> Idle / Grid
                </span>
              </div>
              <div className="flex h-4 rounded-md overflow-hidden border border-gray-700">
                {chartData.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: d.batteryColor }}
                    title={`${d.time} — ${batteryStateLabels[d.batteryState]}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </>
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

      {/* Cost & Revenue chart */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Cost & Revenue per Interval</h3>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={costChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                interval={tickInterval}
              />
              <YAxis
                yAxisId="cost"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                unit="c"
                label={{ value: 'Cost (cents)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                unit="c/kWh"
                label={{ value: 'Price (c/kWh)', angle: 90, position: 'insideRight', fill: '#9ca3af', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value?: number) => [`${(value ?? 0).toFixed(2)}`, undefined]}
              />
              <Bar
                yAxisId="cost"
                dataKey="importCost"
                name="Import Cost"
                fill="#f59e0b"
                fillOpacity={0.7}
                radius={[1, 1, 0, 0]}
              >
                {costChartData.map((entry, index) => (
                  <Cell
                    key={`import-${index}`}
                    fill={entry.importCost > 5 ? '#ef4444' : '#f59e0b'}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="cost"
                dataKey="exportRevenue"
                name="Export Revenue"
                fill="#22c55e"
                fillOpacity={0.7}
                radius={[1, 1, 0, 0]}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="importPrice"
                name="Import Price (c/kWh)"
                stroke="#fb923c"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="exportPrice"
                name="Export Price (c/kWh)"
                stroke="#4ade80"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
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
