import type { ProjectStatus } from '../types';

interface StatusBadgeProps {
  status: ProjectStatus | 'on_track' | 'warning' | 'critical';
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: '計画中', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-800' },
  on_hold: { label: '保留', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
  on_track: { label: '順調', color: 'bg-green-100 text-green-800' },
  warning: { label: '注意', color: 'bg-yellow-100 text-yellow-800' },
  critical: { label: '危険', color: 'bg-red-100 text-red-800' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
