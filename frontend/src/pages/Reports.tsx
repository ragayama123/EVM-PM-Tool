import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, evmApi } from '../api/client';
import { EVMChart } from '../components/EVMChart';
import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { BarChart3, Camera, RefreshCw } from 'lucide-react';

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
        <h2 className="text-2xl font-bold text-gray-900">EVMレポート</h2>
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
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          プロジェクト選択
        </label>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  thresholds={{ good: 1.0, warning: 0.9 }}
                  trend={evmAnalysis.metrics.spi >= 1 ? 'up' : 'down'}
                />
                <KPICard
                  title="CPI（コスト効率）"
                  value={evmAnalysis.metrics.cpi}
                  format="index"
                  thresholds={{ good: 1.0, warning: 0.9 }}
                  trend={evmAnalysis.metrics.cpi >= 1 ? 'up' : 'down'}
                />
                <KPICard
                  title="SV（スケジュール差異）"
                  value={evmAnalysis.metrics.sv}
                  format="currency"
                  trend={evmAnalysis.metrics.sv >= 0 ? 'up' : 'down'}
                />
                <KPICard
                  title="CV（コスト差異）"
                  value={evmAnalysis.metrics.cv}
                  format="currency"
                  trend={evmAnalysis.metrics.cv >= 0 ? 'up' : 'down'}
                />
              </div>

              {/* 詳細指標 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">計画価値 (PV)</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{evmAnalysis.metrics.pv.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">出来高 (EV)</h3>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{evmAnalysis.metrics.ev.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">実コスト (AC)</h3>
                  <p className="text-2xl font-bold text-red-600">
                    ¥{evmAnalysis.metrics.ac.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* ステータスと予測 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">プロジェクト状況</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">スケジュール</span>
                      <StatusBadge status={evmAnalysis.schedule_status.status} />
                    </div>
                    <p className="text-sm text-gray-500">{evmAnalysis.schedule_status.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">コスト</span>
                      <StatusBadge status={evmAnalysis.cost_status.status} />
                    </div>
                    <p className="text-sm text-gray-500">{evmAnalysis.cost_status.message}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">完了時予測</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500">BAC（総予算）</span>
                      <p className="text-xl font-bold text-gray-900">
                        ¥{evmAnalysis.metrics.bac.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">EAC（完了時総コスト見積）</span>
                      <p className="text-xl font-bold text-gray-900">
                        ¥{evmAnalysis.metrics.eac.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">ETC（残作業コスト見積）</span>
                      <p className="text-xl font-bold text-gray-900">
                        ¥{evmAnalysis.metrics.etc.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 推奨アクション */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">推奨アクション</h3>
                <ul className="space-y-2">
                  {evmAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <p className="text-yellow-800">
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">スナップショット履歴</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PV</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EV</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {evmSnapshots.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(snapshot.date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{snapshot.pv.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{snapshot.ev.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{snapshot.ac.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={snapshot.spi >= 1 ? 'text-green-600' : 'text-red-600'}>
                          {snapshot.spi.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={snapshot.cpi >= 1 ? 'text-green-600' : 'text-red-600'}>
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
