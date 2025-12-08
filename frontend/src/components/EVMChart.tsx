import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EVMSnapshot } from '../types';

interface EVMChartProps {
  snapshots: EVMSnapshot[];
}

export function EVMChart({ snapshots }: EVMChartProps) {
  const data = snapshots.map((snapshot) => ({
    date: new Date(snapshot.date).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    }),
    PV: snapshot.pv,
    EV: snapshot.ev,
    AC: snapshot.ac,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EVM Sカーブ</h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          データがありません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EVM Sカーブ</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `${value.toLocaleString()}h`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="PV"
              name="計画工数 (PV)"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="EV"
              name="出来高 (EV)"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="AC"
              name="実績工数 (AC)"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
