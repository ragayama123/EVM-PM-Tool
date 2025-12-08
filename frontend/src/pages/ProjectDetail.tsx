import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { projectsApi, tasksApi, evmApi } from '../api/client';
import { KPICard } from '../components/KPICard';
import { EVMChart } from '../components/EVMChart';
import { StatusBadge } from '../components/StatusBadge';
import { HolidayCalendar } from '../components/HolidayCalendar';
import { ArrowLeft, Plus, Trash2, ListTodo, Camera, Edit2, X, Save } from 'lucide-react';
import type { TaskCreate, ProjectCreate, ProjectStatus } from '../types';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = Number(id);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState<Partial<ProjectCreate>>({});
  const [taskFormData, setTaskFormData] = useState<Omit<TaskCreate, 'project_id'>>({
    name: '',
    description: '',
    planned_hours: 0,
    actual_hours: 0,
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

  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<ProjectCreate>) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditingProject(false);
    },
  });

  // プロジェクトデータが読み込まれたらフォームを初期化
  useEffect(() => {
    if (project) {
      setProjectFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
      });
    }
  }, [project]);

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate(projectFormData);
  };

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
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {project.start_date ? new Date(project.start_date).toLocaleDateString('ja-JP') : '-'} 〜{' '}
              {project.end_date ? new Date(project.end_date).toLocaleDateString('ja-JP') : '-'}
              {' '}/ 計画工数: {project.budget > 0 ? `${project.budget.toLocaleString()}h` : '-'}
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditingProject(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            編集
          </button>
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

      {/* プロジェクト編集モーダル */}
      {isEditingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">プロジェクト編集</h3>
              <button
                onClick={() => setIsEditingProject(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    プロジェクト名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectFormData.name || ''}
                    onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ステータス
                  </label>
                  <select
                    value={projectFormData.status || 'planning'}
                    onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="planning">計画中</option>
                    <option value="in_progress">進行中</option>
                    <option value="on_hold">保留中</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">中止</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ※ 開始日・終了日・計画総工数はタスクから自動計算されます
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={projectFormData.description || ''}
                  onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingProject(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateProjectMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* プロジェクト情報 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">計画総工数</span>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{project.budget.toLocaleString()}h</p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">ステータス</span>
            <p className="mt-1"><StatusBadge status={project.status} /></p>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">説明</span>
            <p className="text-gray-700 dark:text-gray-300">{project.description || '説明なし'}</p>
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
            title="CPI（工数効率）"
            value={evmAnalysis.metrics.cpi}
            format="index"
            thresholds={{ good: 1.0, warning: 0.9 }}
            trend={evmAnalysis.metrics.cpi >= 1 ? 'up' : 'down'}
          />
          <KPICard
            title="EV（出来高）"
            value={evmAnalysis.metrics.ev}
            format="hours"
          />
          <KPICard
            title="AC（実績工数）"
            value={evmAnalysis.metrics.ac}
            format="hours"
          />
        </div>
      )}

      {/* EVMチャート */}
      {evmSnapshots && evmSnapshots.length > 0 && (
        <EVMChart snapshots={evmSnapshots} />
      )}

      {/* タスク一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">タスク一覧</h3>
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    タスク名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskFormData.name}
                    onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    説明
                  </label>
                  <input
                    type="text"
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 予定スケジュール */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">予定スケジュール</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      予定開始日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.planned_start_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      予定終了日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.planned_end_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      予定工数 (時間)
                    </label>
                    <input
                      type="number"
                      value={taskFormData.planned_hours}
                      onChange={(e) => setTaskFormData({ ...taskFormData, planned_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 実績スケジュール */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">実績スケジュール</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      実績開始日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.actual_start_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      実績終了日
                    </label>
                    <input
                      type="date"
                      value={taskFormData.actual_end_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      実績工数 (時間)
                    </label>
                    <input
                      type="number"
                      value={taskFormData.actual_hours}
                      onChange={(e) => setTaskFormData({ ...taskFormData, actual_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* タスクテーブル */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">タスク名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">予定期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">実績期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">予定工数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">実績工数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">進捗率</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{task.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {task.planned_hours}h
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-12">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          if (confirm('このタスクを削除しますか？')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    タスクがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 休日カレンダー */}
      {project.start_date && project.end_date && (
        <HolidayCalendar
          projectId={projectId}
          projectStartDate={project.start_date}
          projectEndDate={project.end_date}
        />
      )}

      {/* 推奨アクション */}
      {evmAnalysis && evmAnalysis.recommendations.length > 0 && (
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
      )}
    </div>
  );
}
