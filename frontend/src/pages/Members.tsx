import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, membersApi } from '../api/client';
import { Users, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import type { MemberCreate, MemberWithUtilization } from '../types';

export function Members() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithUtilization | null>(null);
  const [formData, setFormData] = useState<{ name: string; available_hours_per_week: number }>({
    name: '',
    available_hours_per_week: 40,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members', selectedProjectId],
    queryFn: () => membersApi.getByProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MemberCreate> }) =>
      membersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: membersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
    },
  });

  // 最初のプロジェクトを自動選択
  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  const resetForm = () => {
    setShowForm(false);
    setEditingMember(null);
    setFormData({ name: '', available_hours_per_week: 40 });
  };

  const handleEdit = (member: MemberWithUtilization) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      available_hours_per_week: member.available_hours_per_week,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({
        id: editingMember.id,
        data: formData,
      });
    } else if (selectedProjectId) {
      createMutation.mutate({
        project_id: selectedProjectId,
        ...formData,
      });
    }
  };

  const getUtilizationColor = (rate: number): string => {
    if (rate > 100) return 'text-red-600 dark:text-red-400';
    if (rate > 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUtilizationBarColor = (rate: number): string => {
    if (rate > 100) return 'bg-red-500';
    if (rate > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">メンバー管理</h2>
        {selectedProjectId && (
          <button
            onClick={() => {
              if (showForm && !editingMember) {
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            メンバー追加
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

      {/* メンバー追加・編集フォーム */}
      {showForm && selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingMember ? 'メンバー編集' : '新規メンバー'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  名前 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  週あたり稼働可能時間
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.available_hours_per_week}
                  onChange={(e) => setFormData({ ...formData, available_hours_per_week: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {editingMember
                  ? (updateMutation.isPending ? '更新中...' : '更新')
                  : (createMutation.isPending ? '追加中...' : '追加')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* メンバー一覧 */}
      {selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">稼働率一覧</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    メンバー名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    稼働可能時間/週
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    アサイン工数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    稼働率
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {membersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      読み込み中...
                    </td>
                  </tr>
                ) : members && members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {member.available_hours_per_week}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {member.assigned_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${getUtilizationBarColor(member.utilization_rate)}`}
                              style={{ width: `${Math.min(member.utilization_rate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getUtilizationColor(member.utilization_rate)}`}>
                            {member.utilization_rate}%
                          </span>
                          {member.utilization_rate > 100 && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="編集"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('このメンバーを削除しますか？担当タスクの割り当ては解除されます。')) {
                                deleteMutation.mutate(member.id);
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p>メンバーがいません</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        最初のメンバーを追加する
                      </button>
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
