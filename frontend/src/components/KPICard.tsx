import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface KPICardProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percent' | 'index';
  description?: string;
  tooltip?: string;
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
  tooltip,
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
    if (!thresholds) return 'text-gray-900 dark:text-white';
    if (value >= thresholds.good) return 'text-green-600 dark:text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500 dark:text-green-400' : trend === 'down' ? 'text-red-500 dark:text-red-400' : 'text-gray-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {trend && <TrendIcon className={`w-5 h-5 ${trendColor}`} />}
      </div>
      <p className={`mt-2 text-3xl font-bold ${getStatusColor()}`}>
        {formatValue(value)}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}
