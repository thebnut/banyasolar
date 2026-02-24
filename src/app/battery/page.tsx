'use client';

import { batteryAnalysis, dailySummaries, overallStats, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

export default function BatteryPage() {
  const stats = overallStats;

  // Score trend data
  const scoreTrend = batteryAnalysis.map(b => ({
    date: b.date.slice(5),
    score: b.score,
    missedSavings: Number((b.missedSavings / 100).toFixed(2)),
    errors: b.errorIntervals.length,
  }));

  // Aggregate stats
  const avgScore = batteryAnalysis.reduce((s, b) => s + b.score, 0) / batteryAnalysis.length;
  const totalMissed = batteryAnalysis.reduce((s, b) => s + b.missedSavings, 0);
  const totalErrors = batteryAnalysis.reduce((s, b) => s + b.errorIntervals.length, 0);
  const worstDays = [...batteryAnalysis].sort((a, b) => a.score - b.score).slice(0, 5);
  const bestDays = [...batteryAnalysis].sort((a, b) => b.score - a.score).slice(0, 5);

  // Error breakdown by hour
  const errorsByHour: Record<number, { highImport: number; lowExport: number }> = {};
  for (let h = 0; h < 24; h++) {
    errorsByHour[h] = { highImport: 0, lowExport: 0 };
  }
  for (const day of batteryAnalysis) {
    for (const err of day.errorIntervals) {
      if (err.type === 'high_import') {
        errorsByHour[err.hour].highImport++;
      } else {
        errorsByHour[err.hour].lowExport++;
      }
    }
  }
  const errorHourData = Object.entries(errorsByHour).map(([hour, data]) => ({
    hour: `${hour.padStart(2, '0')}:00`,
    highImport: data.highImport,
    lowExport: data.lowExport,
  }));

  // Optimal vs actual comparison
  const optimalData = batteryAnalysis.map(b => ({
    date: b.date.slice(5),
    optimalSavings: Number((b.optimalSavings / 100).toFixed(2)),
    missedSavings: Number((b.missedSavings / 100).toFixed(2)),
  }));

  // Score distribution
  const scoreRanges = [
    { label: '0-20%', min: 0, max: 20 },
    { label: '20-40%', min: 20, max: 40 },
    { label: '40-60%', min: 40, max: 60 },
    { label: '60-80%', min: 60, max: 80 },
    { label: '80-100%', min: 80, max: 101 },
  ];
  const scoreDist = scoreRanges.map(r => ({
    range: r.label,
    count: batteryAnalysis.filter(b => b.score >= r.min && b.score < r.max).length,
  }));

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Battery Performance</h1>
        <p className="text-gray-400 text-sm mt-1">
          Analysis of battery behavior inferred from grid import/export data
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Battery Score"
          value={`${avgScore.toFixed(0)}%`}
          subtitle="Higher is better"
          color={avgScore > 70 ? 'green' : avgScore > 40 ? 'amber' : 'red'}
        />
        <StatCard
          title="Total Missed Savings"
          value={formatCents(totalMissed)}
          subtitle="Could have saved"
          color="red"
        />
        <StatCard
          title="Error Intervals"
          value={totalErrors.toString()}
          subtitle="High import or bad export"
          color={totalErrors > 100 ? 'red' : 'amber'}
        />
        <StatCard
          title="Best Day Score"
          value={`${bestDays[0]?.score || 0}%`}
          subtitle={bestDays[0]?.date || ''}
          color="green"
        />
      </div>

      {/* How it works explanation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">How Battery Scoring Works</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p><strong className="text-gray-300">Score:</strong> Percentage of high-price intervals (&gt;30c/kWh) where the battery was discharging (low grid import).</p>
          <p><strong className="text-gray-300">Error — High Import:</strong> Importing heavily from grid when price is high. Battery should have been discharging.</p>
          <p><strong className="text-gray-300">Error — Low Export:</strong> Exporting to grid when price is negative. Battery should have been charging instead.</p>
          <p><strong className="text-gray-300">Missed Savings:</strong> Cost difference between actual behavior and what optimal battery usage would achieve.</p>
        </div>
      </div>

      {/* Score trend */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Battery Score Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={6} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Battery Score"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2, fill: '#f59e0b' }}
            />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Missed savings trend */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Missed Savings</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={optimalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={6} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="$" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, undefined]}
            />
            <Bar dataKey="missedSavings" name="Missed Savings" fill="#ef4444" radius={[2, 2, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Error by hour */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Battery Errors by Hour of Day</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={errorHourData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="highImport" name="High Import" stackId="a" fill="#ef4444" />
            <Bar dataKey="lowExport" name="Bad Export" stackId="a" fill="#f59e0b" />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score distribution */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scoreDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="count" name="Days" radius={[4, 4, 0, 0]}>
              {scoreDist.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    i === 0 ? '#ef4444' :
                    i === 1 ? '#f97316' :
                    i === 2 ? '#f59e0b' :
                    i === 3 ? '#84cc16' :
                    '#22c55e'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Worst and Best days tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worst days */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4">Worst 5 Days</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Score</th>
                <th className="text-right py-2">Missed</th>
                <th className="text-right py-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {worstDays.map(d => (
                <tr key={d.date} className="border-b border-gray-800/50">
                  <td className="py-2 text-gray-300">{d.date}</td>
                  <td className="py-2 text-right text-red-400">{d.score}%</td>
                  <td className="py-2 text-right text-amber-400">{formatCents(d.missedSavings)}</td>
                  <td className="py-2 text-right text-gray-400">{d.errorIntervals.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Best days */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-green-400 mb-4">Best 5 Days</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Score</th>
                <th className="text-right py-2">Missed</th>
                <th className="text-right py-2">Errors</th>
              </tr>
            </thead>
            <tbody>
              {bestDays.map(d => (
                <tr key={d.date} className="border-b border-gray-800/50">
                  <td className="py-2 text-gray-300">{d.date}</td>
                  <td className="py-2 text-right text-green-400">{d.score}%</td>
                  <td className="py-2 text-right text-amber-400">{formatCents(d.missedSavings)}</td>
                  <td className="py-2 text-right text-gray-400">{d.errorIntervals.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
