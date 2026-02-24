interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'amber' | 'green' | 'red' | 'blue' | 'gray';
}

const colorMap = {
  amber: 'text-amber-400',
  green: 'text-green-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  gray: 'text-gray-300',
};

const bgColorMap = {
  amber: 'bg-amber-500/10 border-amber-500/20',
  green: 'bg-green-500/10 border-green-500/20',
  red: 'bg-red-500/10 border-red-500/20',
  blue: 'bg-blue-500/10 border-blue-500/20',
  gray: 'bg-gray-700/30 border-gray-600/30',
};

export function StatCard({ title, value, subtitle, color = 'gray' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${bgColorMap[color]}`}>
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
