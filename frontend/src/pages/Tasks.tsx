import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, tasksApi } from '../api/client';
import { ListTodo, Plus, Trash2, Pencil } from 'lucide-react';
import type { Task, TaskCreate } from '../types';

// 日付文字列をYYYY-MM-DD形式に変換するヘルパー
const toDateInput = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

export function Tasks() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Omit<TaskCreate, 'project_id'>>({
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

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', selectedProjectId],
    queryFn: () => tasksApi.getByProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, task }: { id: number; task: Partial<TaskCreate> }) =>
      tasksApi.update(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
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
  };

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) =>
      tasksApi.updateProgress(id, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        task: formData,
      });
    } else {
      createMutation.mutate({
        ...formData,
        project_id: selectedProjectId,
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      planned_hours: task.planned_hours,
      actual_hours: task.actual_hours,
      hourly_rate: task.hourly_rate,
      planned_start_date: toDateInput(task.planned_start_date),
      planned_end_date: toDateInput(task.planned_end_date),
      actual_start_date: toDateInput(task.actual_start_date),
      actual_end_date: toDateInput(task.actual_end_date),
    });
    setShowForm(true);
  };

  // 最初のプロジェクトを自動選択
  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">タスク管理</h2>
        {selectedProjectId && (
          <button
            onClick={() => {
              if (showForm && !editingTask) {
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            タスク追加
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

      {/* タスク追加・編集フォーム */}
      {showForm && selectedProjectId && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTask ? 'タスク編集' : '新規タスク'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タスク名 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  時間単価 (円/時)
                </label>
                <input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    予定終了日
                  </label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    予定工数 (時間)
                  </label>
                  <input
                    type="number"
                    value={formData.planned_hours}
                    onChange={(e) => setFormData({ ...formData, planned_hours: Number(e.target.value) })}
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
                    value={formData.actual_start_date}
                    onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    実績終了日
                  </label>
                  <input
                    type="date"
                    value={formData.actual_end_date}
                    onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    実績工数 (時間)
                  </label>
                  <input
                    type="number"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData({ ...formData, actual_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {editingTask
                  ? (updateMutation.isPending ? '更新中...' : '更新')
                  : (createMutation.isPending ? '追加中...' : '追加')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* タスク一覧 */}
      {selectedProjectId && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タスク名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    予定期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    実績期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    予定工数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    実績工数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    進捗率
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    計画価値
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasksLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : tasks && tasks.length > 0 ? (
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
                          <span className="text-sm text-gray-500 w-12">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        ¥{(task.planned_hours * task.hourly_rate).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:text-blue-800"
                            title="編集"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('このタスクを削除しますか？')) {
                                deleteMutation.mutate(task.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
      )}
    </div>
  );
}
