import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, evmApi } from '../api/client';
import { EVMChart } from '../components/EVMChart';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { Tooltip } from '../components/Tooltip';
import { BarChart3, Camera, RefreshCw } from 'lucide-react';

// EVM用語の説明（工数ベース）
const evmTooltips = {
  spi: 'Schedule Performance Index（スケジュール効率指数）= EV ÷ PV。1.0以上なら予定より進んでいる、1.0未満なら遅れている。',
  cpi: 'Cost Performance Index（工数効率指数）= EV ÷ AC。1.0以上なら予定工数内、1.0未満なら工数超過。',
  sv: 'Schedule Variance（スケジュール差異）= EV - PV。正の値なら予定より進んでいる、負の値なら遅れている。',
  cv: 'Cost Variance（工数差異）= EV - AC。正の値なら予定工数内、負の値なら工数超過。',
  pv: 'Planned Value（計画工数）。現時点までに完了しているはずの作業の計画工数。',
  ev: 'Earned Value（出来高）。実際に完了した作業の計画工数。進捗率 × 計画工数で算出。',
  ac: 'Actual Cost（実績工数）。実際に投入した工数。',
  bac: 'Budget at Completion（計画総工数）。プロジェクト全体の計画工数。',
  eac: 'Estimate at Completion（完了時総工数見積）。現在のパフォーマンスで完了した場合の総工数予測。',
  etc: 'Estimate to Complete（残作業工数見積）。残りの作業を完了するために必要な工数予測。',
};

export function Reports() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const { data: evmAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['evm-analysis', selectedProjectId],
    queryFn: () => evmApi.getAnalysis(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const { data: evmSnapshots } = useQuery({
    queryKey: ['evm-snapshots', selectedProjectId],
    queryFn: () => evmApi.getSnapshots(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () => evmApi.createSnapshot(selectedProjectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evm-snapshots', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', selectedProjectId] });
    },
  });

  // 最初のプロジェクトを自動選択
  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">EVMレポート</h2>
        {selectedProjectId && (
          <button
            onClick={() => createSnapshotMutation.mutate()}
            disabled={createSnapshotMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {createSnapshotMutation.isPending ? '保存中...' : 'スナップショット保存'}
          </button>
        )}
      </div>

      {/* プロジェクト選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          プロジェクト選択
        </label>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">プロジェクトを選択...</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {analysisLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : evmAnalysis ? (
            <>
              {/* KPIカード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="SPI（スケジュール効率）"
                  value={evmAnalysis.metrics.spi}
                  format="index"
                  tooltip={evmTooltips.spi}
                  thresholds={{ good: 1.0, warning: 0.9 }}
                  trend={evmAnalysis.metrics.spi >= 1 ? 'up' : 'down'}
                />
                <KPICard
                  title="CPI（コスト効率）"
                  value={evmAnalysis.metrics.cpi}
                  format="index"
                  tooltip={evmTooltips.cpi}
                  thresholds={{ good: 1.0, warning: 0.9 }}
                  trend={evmAnalysis.metrics.cpi >= 1 ? 'up' : 'down'}
                />
                <KPICard
                  title="SV（スケジュール差異）"
                  value={evmAnalysis.metrics.sv}
                  format="hours"
                  tooltip={evmTooltips.sv}
                  trend={evmAnalysis.metrics.sv >= 0 ? 'up' : 'down'}
                />
                <KPICard
                  title="CV（工数差異）"
                  value={evmAnalysis.metrics.cv}
                  format="hours"
                  tooltip={evmTooltips.cv}
                  trend={evmAnalysis.metrics.cv >= 0 ? 'up' : 'down'}
                />
              </div>

              {/* 詳細指標 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">計画工数 (PV)</h3>
                    <Tooltip content={evmTooltips.pv} />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {evmAnalysis.metrics.pv.toLocaleString()}h
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">出来高 (EV)</h3>
                    <Tooltip content={evmTooltips.ev} />
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {evmAnalysis.metrics.ev.toLocaleString()}h
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">実績工数 (AC)</h3>
                    <Tooltip content={evmTooltips.ac} />
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {evmAnalysis.metrics.ac.toLocaleString()}h
                  </p>
                </div>
              </div>

              {/* ステータスと予測 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">プロジェクト状況</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">スケジュール</span>
                      <StatusBadge status={evmAnalysis.schedule_status.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{evmAnalysis.schedule_status.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">コスト</span>
                      <StatusBadge status={evmAnalysis.cost_status.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{evmAnalysis.cost_status.message}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">完了時予測</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">BAC（計画総工数）</span>
                        <Tooltip content={evmTooltips.bac} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {evmAnalysis.metrics.bac.toLocaleString()}h
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">EAC（完了時総工数見積）</span>
                        <Tooltip content={evmTooltips.eac} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {evmAnalysis.metrics.eac.toLocaleString()}h
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">ETC（残作業工数見積）</span>
                        <Tooltip content={evmTooltips.etc} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {evmAnalysis.metrics.etc.toLocaleString()}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 推奨アクション */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">推奨アクション</h3>
                <ul className="space-y-2">
                  {evmAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                      <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-200">
                タスクを追加するとEVM指標が計算されます。
              </p>
            </div>
          )}

          {/* EVMチャート */}
          {evmSnapshots && evmSnapshots.length > 0 && (
            <EVMChart snapshots={evmSnapshots} />
          )}

          {/* スナップショット履歴 */}
          {evmSnapshots && evmSnapshots.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">スナップショット履歴</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日付</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PV</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">EV</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SPI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {evmSnapshots.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(snapshot.date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {snapshot.pv.toLocaleString()}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {snapshot.ev.toLocaleString()}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {snapshot.ac.toLocaleString()}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={snapshot.spi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {snapshot.spi.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={snapshot.cpi >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {snapshot.cpi.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
