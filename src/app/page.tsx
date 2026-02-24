'use client';

import { overallStats, getRecentDays, formatCents } from '@/lib/data';
import { StatCard } from '@/components/stat-card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

const COLORS = {
  import: '#f59e0b',
  export: '#22c55e',
  cost: '#ef4444',
  revenue: '#22c55e',
  grid: '#374151',
};

export default function DashboardPage() {
  const last7 = getRecentDays(7);
  const last30 = getRecentDays(30);
  const stats = overallStats;

  const trendData = last7.map(d => ({
    date: d.date.slice(5),
    import: Number(d.importKwh.toFixed(1)),
    export: Number(d.exportKwh.toFixed(1)),
    netCost: Number((d.netCost / 100).toFixed(2)),
  }));

  const revenueData = last7.map(d => ({
    date: d.date.slice(5),
    cost: Number((d.importCost / 100).toFixed(2)),
    revenue: Number((d.exportRevenue / 100).toFixed(2)),
    net: Number((d.netCost / 100).toFixed(2)),
  }));

  const todaySummary = last7[last7.length - 1];
  const yesterdaySummary = last7.length > 1 ? last7[last7.length - 2] : null;

  // Last 30 days stats
  const last30Import = last30.reduce((s, d) => s + d.importKwh, 0);
  const last30Export = last30.reduce((s, d) => s + d.exportKwh, 0);
  const last30Net = last30.reduce((s, d) => s + d.netCost, 0);

  return (
    <div className="space-y-6 lg:pt-0 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {stats.dateRange.start} to {stats.dateRange.end} · {stats.totalDays} days
        </p>
      </div>

      {/* Latest Day Summary */}
      {todaySummary && (
        <>
          <h2 className="text-lg font-semibold text-gray-300">
            Latest Day — {todaySummary.date}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Import"
              value={`${todaySummary.importKwh.toFixed(1)} kWh`}
              subtitle={formatCents(todaySummary.importCost)}
              color="amber"
            />
            <StatCard
              title="Export"
              value={`${todaySummary.exportKwh.toFixed(1)} kWh`}
              subtitle={formatCents(todaySummary.exportRevenue) + ' earned'}
              color="green"
            />
            <StatCard
              title="Net Cost"
              value={formatCents(todaySummary.netCost)}
              subtitle={todaySummary.netCost < 0 ? 'Net credit' : 'Net charge'}
              color={todaySummary.netCost < 0 ? 'green' : 'red'}
            />
            <StatCard
              title="Avg Import Price"
              value={`${todaySummary.avgImportPrice.toFixed(1)}c/kWh`}
              color="gray"
            />
            <StatCard
              title="Avg Export Price"
              value={`${todaySummary.avgExportPrice.toFixed(1)}c/kWh`}
              color="gray"
            />
          </div>
        </>
      )}

      {/* Overall Stats */}
      <h2 className="text-lg font-semibold text-gray-300">Overall Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Cost"
          value={formatCents(stats.totalNetCost)}
          subtitle={`${stats.totalDays} days`}
          color="amber"
        />
        <StatCard
          title="Avg Daily Cost"
          value={formatCents(stats.avgDailyCost)}
          color="gray"
        />
        <StatCard
          title="Wholesale Savings"
          value={formatCents(stats.flatRateComparison.savings)}
          subtitle="vs flat rate (30c/5c)"
          color={stats.flatRateComparison.savings > 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Battery Score"
          value={`${stats.avgBatteryScore}%`}
          subtitle={`${formatCents(stats.totalMissedSavings)} missed`}
          color={stats.avgBatteryScore > 70 ? 'green' : stats.avgBatteryScore > 40 ? 'amber' : 'red'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day energy trend */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Last 7 Days — Energy</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} unit=" kWh" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="import"
                name="Import"
                stroke={COLORS.import}
                fill={COLORS.import}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="export"
                name="Export"
                stroke={COLORS.export}
                fill={COLORS.export}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day cost/revenue */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Last 7 Days — Cost & Revenue</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} unit="$" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value?: number) => [`$${(value ?? 0).toFixed(2)}`, undefined]}
              />
              <Bar dataKey="cost" name="Import Cost" fill={COLORS.import} radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name="Export Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 30-day summary row */}
      <h2 className="text-lg font-semibold text-gray-300">Last 30 Days</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Import"
          value={`${last30Import.toFixed(0)} kWh`}
          color="amber"
        />
        <StatCard
          title="Export"
          value={`${last30Export.toFixed(0)} kWh`}
          color="green"
        />
        <StatCard
          title="Net Cost"
          value={formatCents(last30Net)}
          color={last30Net < 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Avg Daily"
          value={formatCents(last30Net / 30)}
          color="gray"
        />
      </div>
    </div>
  );
}
