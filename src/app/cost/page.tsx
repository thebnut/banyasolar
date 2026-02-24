'use client';

import { dailySummaries, monthlySummaries, overallStats, periodSummaries, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';

export default function CostAnalysisPage() {
  const stats = overallStats;

  // Monthly chart data
  const monthlyData = monthlySummaries.map(m => ({
    month: m.month,
    importCost: Number((m.importCost / 100).toFixed(2)),
    exportRevenue: Number((m.exportRevenue / 100).toFixed(2)),
    netCost: Number((m.netCost / 100).toFixed(2)),
  }));

  // Period data from pre-computed summaries
  const periodData = periodSummaries.map(p => ({
    period: p.period,
    kwh: p.kwh,
    cost: Number((p.cost / 100).toFixed(2)),
    avgPrice: p.avgPrice,
  }));

  // Flat rate comparison
  const flat = stats.flatRateComparison;
  const comparisonData = [
    {
      label: 'Amber (Wholesale)',
      importCost: Number((stats.totalImportCost / 100).toFixed(2)),
      exportRevenue: Number((stats.totalExportRevenue / 100).toFixed(2)),
      netCost: Number((stats.totalNetCost / 100).toFixed(2)),
    },
    {
      label: 'Flat Rate (30c/5c)',
      importCost: Number((flat.flatImportCost / 100).toFixed(2)),
      exportRevenue: Number((flat.flatExportRevenue / 100).toFixed(2)),
      netCost: Number((flat.flatNetCost / 100).toFixed(2)),
    },
  ];

  // Daily cost heatmap (calendar)
  const dailyCostData = dailySummaries.map(d => ({
    date: d.date,
    cost: Number((d.netCost / 100).toFixed(2)),
    day: new Date(d.date).getDay(),
    week: getWeekNumber(d.date),
  }));

  const maxDailyCost = Math.max(...dailyCostData.map(d => Math.abs(d.cost)));

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Cost Analysis</h1>
        <p className="text-gray-400 text-sm mt-1">Breakdown of energy costs and wholesale savings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Import Cost"
          value={formatCents(stats.totalImportCost)}
          subtitle={`${stats.totalImportKwh.toFixed(0)} kWh`}
          color="amber"
        />
        <StatCard
          title="Total Export Revenue"
          value={formatCents(stats.totalExportRevenue)}
          subtitle={`${stats.totalExportKwh.toFixed(0)} kWh`}
          color="green"
        />
        <StatCard
          title="Net Cost"
          value={formatCents(stats.totalNetCost)}
          subtitle={`Avg ${formatCents(stats.avgDailyCost)}/day`}
          color={stats.totalNetCost < 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Wholesale Savings"
          value={formatCents(flat.savings)}
          subtitle="vs flat rate"
          color={flat.savings > 0 ? 'green' : 'red'}
        />
      </div>

      {/* Wholesale vs Flat rate comparison */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Wholesale vs Flat Rate Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} unit="$" />
            <YAxis dataKey="label" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={140} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, undefined]}
            />
            <Bar dataKey="importCost" name="Import Cost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            <Bar dataKey="exportRevenue" name="Export Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
          <p className="text-green-400 font-semibold text-lg">
            {flat.savings > 0 ? 'Saving' : 'Losing'} {formatCents(Math.abs(flat.savings))} with wholesale pricing
          </p>
          <p className="text-gray-400 text-sm mt-1">
            That&apos;s {formatCents(Math.abs(flat.savings / stats.totalDays))}/day on average
          </p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Monthly Cost Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} unit="$" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, undefined]}
            />
            <Bar dataKey="importCost" name="Import Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exportRevenue" name="Export Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Period breakdown */}
      {periodData.length > 0 && (
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Peak vs Off-Peak vs Shoulder</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {periodData.map(p => (
              <div key={p.period} className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">{p.period}</p>
                <p className="text-xl font-bold text-white">${p.cost.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{p.kwh.toFixed(0)} kWh · {p.avgPrice}c avg</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} unit="$" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Cost']}
              />
              <Bar dataKey="cost" name="cost" radius={[4, 4, 0, 0]}>
                {periodData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.period === 'Peak' ? '#ef4444' :
                      entry.period === 'Shoulder' ? '#f59e0b' :
                      '#22c55e'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily cost calendar heatmap */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Cost Heatmap</h3>
        <div className="flex gap-1 text-xs text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="w-8 text-center">{d}</div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {dailyCostData.map((d, i) => {
            const intensity = Math.abs(d.cost) / maxDailyCost;
            const isCredit = d.cost < 0;
            const bg = isCredit
              ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
              : `rgba(245, 158, 11, ${0.15 + intensity * 0.6})`;
            return (
              <div
                key={i}
                className="w-8 h-8 rounded-sm flex items-center justify-center text-[9px] cursor-default"
                style={{ backgroundColor: bg }}
                title={`${d.date}: $${d.cost.toFixed(2)}`}
              >
                {new Date(d.date).getDate()}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500/40" />
            <span>Credit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-500/40" />
            <span>Cost</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}
