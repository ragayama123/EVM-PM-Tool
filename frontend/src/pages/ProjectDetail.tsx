import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { projectsApi, tasksApi, evmApi } from '../api/client';
import { KPICard } from '../components/KPICard';
import { EVMChart } from '../components/EVMChart';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Plus, Trash2, ListTodo, Camera } from 'lucide-react';
import type { TaskCreate } from '../types';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(id);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState<Omit<TaskCreate, 'project_id'>>({
    name: '',
    description: '',
    planned_hours: 0,
    actual_hours: 0,
    hourly_rate: 5000,
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId),
    enabled: !!projectId,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.getByProject(projectId),
    enabled: !!projectId,
  });

  const { data: evmAnalysis } = useQuery({
    queryKey: ['evm-analysis', projectId],
    queryFn: () => evmApi.getAnalysis(projectId),
    enabled: !!projectId,
  });

  const { data: evmSnapshots } = useQuery({
    queryKey: ['evm-snapshots', projectId],
    queryFn: () => evmApi.getSnapshots(projectId),
    enabled: !!projectId,
  });

  const createTaskMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
      setShowTaskForm(false);
      setTaskFormData({
        name: '',
        description: '',
        planned_hours: 0,
        actual_hours: 0,
        hourly_rate: 5000,
        planned_start_date: '',
        planned_end_date: '',
        actual_start_date: '',
        actual_end_date: '',
      });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) =>
      tasksApi.updateProgress(id, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
    },
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () => evmApi.createSnapshot(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evm-snapshots', projectId] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      navigate('/projects');
    },
  });

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate({
      ...taskFormData,
      project_id: projectId,
    });
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">プロジェクトが見つかりません</p>
        <Link to="/projects" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          プロジェクト一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-sm text-gray-500">
              {new Date(project.start_date).toLocaleDateString('ja-JP')} 〜{' '}
              {new Date(project.end_date).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createSnapshotMutation.mutate()}
            disabled={createSnapshotMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            スナップショット保存
          </button>
          <button
            onClick={() => {
              if (confirm('このプロジェクトを削除しますか？')) {
                deleteProjectMutation.mutate(projectId);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
        </div>
      </div>

      {/* プロジェクト情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">予算</span>
            <p className="text-xl font-bold text-gray-900">¥{project.budget.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">ステータス</span>
            <p className="mt-1"><StatusBadge status={project.status} /></p>
          </div>
          <div>
            <span className="text-sm text-gray-500">説明</span>
            <p className="text-gray-700">{project.description || '説明なし'}</p>
          </div>
        </div>
      </div>

      {/* EVM指標 */}
      {evmAnalysis && (
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
            title="EV（出来高）"
            value={evmAnalysis.metrics.ev}
            format="currency"
          />
          <KPICard
            title="AC（実コスト）"
            value={evmAnalysis.metrics.ac}
            format="currency"
          />
        </div>
      )}

      {/* EVMチャート */}
      {evmSnapshots && evmSnapshots.length > 0 && (
        <EVMChart snapshots={evmSnapshots} />
      )}

      {/* タスク一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">タスク一覧</h3>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            タスク追加
          </button>
        </div>

        {/* タスク追加フォーム */}
        {showTaskForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タスク名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskFormData.name}
                    onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    時間単価 (円/時)
                  </label>
                  <input
                    type="number"
                    value={taskFormData.hourly_rate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, hourly_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <input
                    type="text"
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 予定スケジュール */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">予定スケジュール</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      予定開始日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.planned_start_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      予定終了日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.planned_end_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      予定工数 (時間)
                    </label>
                    <input
                      type="number"
                      value={taskFormData.planned_hours}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 実績スケジュール */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">実績スケジュール</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      実績開始日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.actual_start_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      実績終了日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.actual_end_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      実績工数 (時間)
                    </label>
                    <input
                      type="number"
                      value={taskFormData.actual_hours}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? '追加中...' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* タスクテーブル */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タスク名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">予定期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">実績期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">予定工数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">実績工数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">進捗率</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">計画価値</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{task.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.planned_start_date && task.planned_end_date ? (
                        <div className="text-xs">
                          <div>{new Date(task.planned_start_date).toLocaleDateString('ja-JP')}</div>
                          <div className="text-gray-400">〜</div>
                          <div>{new Date(task.planned_end_date).toLocaleDateString('ja-JP')}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.actual_start_date || task.actual_end_date ? (
                        <div className="text-xs">
                          <div>{task.actual_start_date ? new Date(task.actual_start_date).toLocaleDateString('ja-JP') : '-'}</div>
                          <div className="text-gray-400">〜</div>
                          <div>{task.actual_end_date ? new Date(task.actual_end_date).toLocaleDateString('ja-JP') : '-'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.planned_hours}h
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.actual_hours}h
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={task.progress}
                          onChange={(e) =>
                            updateProgressMutation.mutate({
                              id: task.id,
                              progress: Number(e.target.value),
                            })
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500 w-12">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      ¥{(task.planned_hours * task.hourly_rate).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          if (confirm('このタスクを削除しますか？')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    タスクがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 推奨アクション */}
      {evmAnalysis && evmAnalysis.recommendations.length > 0 && (
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
      )}
    </div>
  );
}
