import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percent' | 'index';
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  thresholds?: {
    good: number;
    warning: number;
  };
}

export function KPICard({
  title,
  value,
  format = 'number',
  description,
  trend,
  thresholds
}: KPICardProps) {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return `¥${val.toLocaleString()}`;
      case 'percent':
        return `${(val * 100).toFixed(1)}%`;
      case 'index':
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
  };

  const getStatusColor = (): string => {
    if (!thresholds) return 'text-gray-900';
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend && <TrendIcon className={`w-5 h-5 ${trendColor}`} />}
      </div>
      <p className={`mt-2 text-3xl font-bold ${getStatusColor()}`}>
        {formatValue(value)}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}
