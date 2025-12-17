import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi, tasksApi, membersApi } from '../api/client';
import { ListTodo, Plus, Trash2, Pencil, User, Calendar, X, Flag, Zap, FileSpreadsheet } from 'lucide-react';
import type { Task, TaskCreate, ReschedulePreviewResponse, AutoSchedulePreviewResponse } from '../types';
import { TASK_TYPES, type TaskType } from '../types';
import { useProject } from '../contexts/ProjectContext';
import { WBSImportModal } from '../components/WBSImportModal';

// 日付文字列をYYYY-MM-DD形式に変換するヘルパー
const toDateInput = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

export function Tasks() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Omit<TaskCreate, 'project_id'> & { progress: number; is_milestone: boolean; task_type?: TaskType; parent_id?: number; predecessor_id?: number }>({
    name: '',
    description: '',
    planned_hours: 0,
    actual_hours: 0,
    hourly_rate: 5000,
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    assigned_member_id: undefined,
    progress: 0,
    is_milestone: false,
    task_type: undefined,
    parent_id: undefined,
    predecessor_id: undefined,
  });

  // リスケジュール関連のステート
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [selectedTaskForReschedule, setSelectedTaskForReschedule] = useState<Task | null>(null);
  const [shiftDays, setShiftDays] = useState<number>(0);
  const [previewData, setPreviewData] = useState<ReschedulePreviewResponse | null>(null);
  const [showReschedulePreview, setShowReschedulePreview] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // 自動スケジュール関連のステート
  const [autoScheduleMode, setAutoScheduleMode] = useState(false);
  const [autoScheduleStartDate, setAutoScheduleStartDate] = useState<string>('');
  const [selectedTasksForAutoSchedule, setSelectedTasksForAutoSchedule] = useState<number[]>([]);
  const [autoSchedulePreviewData, setAutoSchedulePreviewData] = useState<AutoSchedulePreviewResponse | null>(null);
  const [showAutoSchedulePreview, setShowAutoSchedulePreview] = useState(false);
  const [autoScheduleError, setAutoScheduleError] = useState<string | null>(null);

  // WBSインポートモーダル
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', selectedProjectId],
    queryFn: () => tasksApi.getByProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const { data: members } = useQuery({
    queryKey: ['members', selectedProjectId],
    queryFn: () => membersApi.getByProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, task }: { id: number; task: Partial<TaskCreate> }) =>
      tasksApi.update(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
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
      assigned_member_id: undefined,
      progress: 0,
      is_milestone: false,
      task_type: undefined,
      parent_id: undefined,
      predecessor_id: undefined,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
    },
  });

  // リスケジュール実行mutation
  const rescheduleMutation = useMutation({
    mutationFn: () => tasksApi.reschedule(selectedProjectId!, selectedTaskForReschedule!.id, shiftDays),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert(data.message);
      resetRescheduleMode();
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      setRescheduleError(error.response?.data?.detail || 'リスケジュールに失敗しました');
    },
  });

  // リスケジュールモードをリセット
  const resetRescheduleMode = () => {
    setRescheduleMode(false);
    setSelectedTaskForReschedule(null);
    setShiftDays(0);
    setPreviewData(null);
    setShowReschedulePreview(false);
    setRescheduleError(null);
  };

  // 自動スケジュールモードをリセット
  const resetAutoScheduleMode = () => {
    setAutoScheduleMode(false);
    setAutoScheduleStartDate('');
    setSelectedTasksForAutoSchedule([]);
    setAutoSchedulePreviewData(null);
    setShowAutoSchedulePreview(false);
    setAutoScheduleError(null);
  };

  // 自動スケジュール対象タスクのトグル
  const toggleTaskForAutoSchedule = (taskId: number) => {
    setSelectedTasksForAutoSchedule(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // 全タスク選択/解除
  const toggleAllTasksForAutoSchedule = () => {
    if (!tasks) return;
    const eligibleTasks = tasks.filter(t => !t.parent_id && t.task_type);
    if (selectedTasksForAutoSchedule.length === eligibleTasks.length) {
      setSelectedTasksForAutoSchedule([]);
    } else {
      setSelectedTasksForAutoSchedule(eligibleTasks.map(t => t.id));
    }
  };

  // 自動スケジュールプレビュー取得
  const handlePreviewAutoSchedule = async () => {
    if (!selectedProjectId || !autoScheduleStartDate || selectedTasksForAutoSchedule.length === 0) return;
    setAutoScheduleError(null);
    try {
      const data = await tasksApi.autoSchedulePreview(
        selectedProjectId,
        selectedTasksForAutoSchedule,
        autoScheduleStartDate
      );
      setAutoSchedulePreviewData(data);
      setShowAutoSchedulePreview(true);
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      setAutoScheduleError(err.response?.data?.detail || 'プレビューの取得に失敗しました');
    }
  };

  // 自動スケジュール実行
  const handleExecuteAutoSchedule = async () => {
    if (!selectedProjectId || !autoScheduleStartDate || selectedTasksForAutoSchedule.length === 0) return;
    try {
      const data = await tasksApi.autoSchedule(
        selectedProjectId,
        selectedTasksForAutoSchedule,
        autoScheduleStartDate
      );
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['members', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert(data.message);
      resetAutoScheduleMode();
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      setAutoScheduleError(err.response?.data?.detail || '自動スケジュールに失敗しました');
    }
    setShowAutoSchedulePreview(false);
  };

  // プレビュー取得
  const handlePreviewReschedule = async () => {
    if (!selectedProjectId || !selectedTaskForReschedule || shiftDays === 0) return;
    setRescheduleError(null);
    try {
      const data = await tasksApi.reschedulePreview(selectedProjectId, selectedTaskForReschedule.id, shiftDays);
      setPreviewData(data);
      setShowReschedulePreview(true);
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      setRescheduleError(err.response?.data?.detail || 'プレビューの取得に失敗しました');
    }
  };

  // リスケジュール実行
  const handleExecuteReschedule = () => {
    rescheduleMutation.mutate();
    setShowReschedulePreview(false);
  };

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
      assigned_member_id: task.assigned_member_id,
      progress: task.progress,
      is_milestone: task.is_milestone || false,
      task_type: task.task_type,
      parent_id: task.parent_id,
      predecessor_id: task.predecessor_id,
    });
    setShowForm(true);
  };

  // メンバーIDから名前を取得
  const getMemberName = (memberId: number | undefined): string | null => {
    if (!memberId || !members) return null;
    const member = members.find(m => m.id === memberId);
    return member ? member.name : null;
  };

  // タスクIDから名前を取得（先行タスク表示用）
  const getTaskName = (taskId: number | undefined): string | null => {
    if (!taskId || !tasks) return null;
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : null;
  };

  // タスクを階層構造でソート
  const getHierarchicalTasks = (taskList: Task[] | undefined): (Task & { isChild: boolean })[] => {
    if (!taskList) return [];

    const result: (Task & { isChild: boolean })[] = [];
    const parentTasks = taskList.filter(t => !t.parent_id);

    parentTasks.forEach(parent => {
      result.push({ ...parent, isChild: false });
      const children = taskList.filter(t => t.parent_id === parent.id);
      children.forEach(child => {
        result.push({ ...child, isChild: true });
      });
    });

    // 親が見つからない子タスクも追加（孤立タスク）
    const addedIds = new Set(result.map(t => t.id));
    taskList.forEach(t => {
      if (!addedIds.has(t.id)) {
        result.push({ ...t, isChild: !!t.parent_id });
      }
    });

    return result;
  };

  const hierarchicalTasks = getHierarchicalTasks(tasks);

  // 最初のプロジェクトを自動選択
  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WBS</h2>
        {selectedProjectId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excelインポート
            </button>
            <button
              onClick={() => {
                if (autoScheduleMode) {
                  resetAutoScheduleMode();
                } else {
                  resetForm();
                  resetRescheduleMode();
                  setAutoScheduleMode(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoScheduleMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
              }`}
            >
              <Zap className="w-4 h-4" />
              自動割り当て
            </button>
            <button
              onClick={() => {
                if (rescheduleMode) {
                  resetRescheduleMode();
                } else {
                  resetForm();
                  resetAutoScheduleMode();
                  setRescheduleMode(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                rescheduleMode
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
              }`}
            >
              <Calendar className="w-4 h-4" />
              リスケジュール
            </button>
            <button
              onClick={() => {
                if (showForm && !editingTask) {
                  resetForm();
                } else {
                  resetForm();
                  resetRescheduleMode();
                  resetAutoScheduleMode();
                  setShowForm(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              タスク追加
            </button>
          </div>
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

      {/* リスケジュールモード操作パネル */}
      {rescheduleMode && selectedProjectId && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
            リスケジュールモード
          </h3>
          <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
            基準となるタスクを選択し、ずらす日数を指定してください。
            選択したタスクより後の親タスク（とその子タスク）がリスケジュールされます。
            <span className="font-medium">固定日付タスクは対象外</span>です。
          </p>

          {rescheduleError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
              {rescheduleError}
            </div>
          )}

          {selectedTaskForReschedule ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">基準タスク:</span>
                <span className="px-3 py-1 bg-white dark:bg-gray-700 rounded border border-orange-300 dark:border-orange-600 text-gray-900 dark:text-white">
                  {selectedTaskForReschedule.name}
                </span>
                <button
                  onClick={() => setSelectedTaskForReschedule(null)}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-orange-800 dark:text-orange-200">ずらす稼働日数:</label>
                <input
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-orange-700 dark:text-orange-300">
                  {shiftDays > 0 ? `${shiftDays}日 後ろ倒し` : shiftDays < 0 ? `${Math.abs(shiftDays)}日 前倒し` : '変更なし'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePreviewReschedule}
                  disabled={shiftDays === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  プレビュー
                </button>
                <button
                  onClick={() => {
                    setSelectedTaskForReschedule(null);
                    setShiftDays(0);
                    setRescheduleError(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  クリア
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-orange-600 dark:text-orange-400 italic">
              下のタスク一覧から基準タスクをクリックして選択してください（親タスクのみ選択可）
            </p>
          )}
        </div>
      )}

      {/* 自動スケジュールモード操作パネル */}
      {autoScheduleMode && selectedProjectId && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
            自動割り当てモード
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
            タスク種別とメンバーのスキルに基づいて、担当者と日付を自動設定します。
            対象タスクを選択し、開始日を指定してください。
          </p>

          {autoScheduleError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
              {autoScheduleError}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-purple-800 dark:text-purple-200">開始日:</label>
              <input
                type="date"
                value={autoScheduleStartDate}
                onChange={(e) => setAutoScheduleStartDate(e.target.value)}
                className="px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                選択中: {selectedTasksForAutoSchedule.length}件
              </span>
              <button
                type="button"
                onClick={toggleAllTasksForAutoSchedule}
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 underline"
              >
                {tasks && selectedTasksForAutoSchedule.length === tasks.filter(t => !t.parent_id && t.task_type).length
                  ? '全て解除'
                  : '全て選択（種別設定済みのみ）'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePreviewAutoSchedule}
                disabled={!autoScheduleStartDate || selectedTasksForAutoSchedule.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                プレビュー
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTasksForAutoSchedule([]);
                  setAutoScheduleStartDate('');
                  setAutoScheduleError(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                クリア
              </button>
            </div>

            <p className="text-sm text-purple-600 dark:text-purple-400 italic">
              下のタスク一覧からチェックボックスで対象タスクを選択してください（タスク種別が設定されているもののみ）
            </p>
          </div>
        </div>
      )}

      {/* タスク追加・編集フォーム */}
      {showForm && selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingTask ? 'タスク編集' : '新規タスク'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  タスク名 *
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
                  先行タスク
                </label>
                <select
                  value={formData.predecessor_id || ''}
                  onChange={(e) => setFormData({ ...formData, predecessor_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">なし</option>
                  {tasks?.filter(t => t.id !== editingTask?.id).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  タスク種別
                </label>
                <select
                  value={formData.task_type || ''}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value ? e.target.value as TaskType : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">未設定</option>
                  {Object.entries(TASK_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  担当者
                </label>
                <select
                  value={formData.assigned_member_id || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_member_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">未割り当て</option>
                  {members?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* 予定 */}
            <div className="border-t dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">予定</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    予定開始日
                  </label>
                  <input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    予定終了日
                  </label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    予定工数 (時間)
                  </label>
                  <input
                    type="number"
                    value={formData.planned_hours}
                    onChange={(e) => setFormData({ ...formData, planned_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    オプション
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_milestone}
                      onChange={(e) => setFormData({ ...formData, is_milestone: e.target.checked })}
                      className="w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500"
                    />
                    <Flag className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">固定日付（リスケ対象外）</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 実績 */}
            <div className="border-t dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">実績</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    実績開始日
                  </label>
                  <input
                    type="date"
                    value={formData.actual_start_date}
                    onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    実績終了日
                  </label>
                  <input
                    type="date"
                    value={formData.actual_end_date}
                    onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    実績工数 (時間)
                  </label>
                  <input
                    type="number"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData({ ...formData, actual_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    進捗率 (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                    />
                  </div>
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
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* タスク一覧 */}
      {selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {autoScheduleMode && (
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                      <input
                        type="checkbox"
                        checked={tasks && selectedTasksForAutoSchedule.length === tasks.filter(t => !t.parent_id && t.task_type).length && selectedTasksForAutoSchedule.length > 0}
                        onChange={toggleAllTasksForAutoSchedule}
                        className="w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    タスク名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    先行タスク
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    種別
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    予定期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    実績期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    予定工数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    実績工数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    進捗率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tasksLoading ? (
                  <tr>
                    <td colSpan={autoScheduleMode ? 11 : 10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      読み込み中...
                    </td>
                  </tr>
                ) : hierarchicalTasks.length > 0 ? (
                  hierarchicalTasks.map((task) => {
                    const isEligibleForAutoSchedule = !task.parent_id && task.task_type;
                    return (
                    <tr
                      key={task.id}
                      onClick={() => {
                        if (rescheduleMode && !task.parent_id && task.planned_start_date && !task.is_milestone) {
                          setSelectedTaskForReschedule(task);
                          setRescheduleError(null);
                        }
                      }}
                      className={`
                        hover:bg-gray-50 dark:hover:bg-gray-700
                        ${rescheduleMode && !task.parent_id && task.planned_start_date && !task.is_milestone ? 'cursor-pointer' : ''}
                        ${selectedTaskForReschedule?.id === task.id ? 'bg-orange-100 dark:bg-orange-900/30' : ''}
                        ${rescheduleMode && (task.parent_id || !task.planned_start_date || task.is_milestone) ? 'opacity-50' : ''}
                        ${autoScheduleMode && selectedTasksForAutoSchedule.includes(task.id) ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                        ${autoScheduleMode && !isEligibleForAutoSchedule ? 'opacity-50' : ''}
                      `}
                    >
                      {autoScheduleMode && (
                        <td className="px-2 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={selectedTasksForAutoSchedule.includes(task.id)}
                            onChange={() => toggleTaskForAutoSchedule(task.id)}
                            disabled={!isEligibleForAutoSchedule}
                            className="w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 disabled:opacity-50"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {task.isChild && (
                            <span className="text-gray-400 dark:text-gray-500 ml-2">└</span>
                          )}
                          {task.is_milestone ? (
                            <Flag className="w-4 h-4 text-orange-500" />
                          ) : (
                            <ListTodo className={`w-4 h-4 ${task.isChild ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`} />
                          )}
                          <span className={`font-medium ${task.is_milestone ? 'text-orange-600 dark:text-orange-400' : task.isChild ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {task.name}
                          </span>
                          {task.is_milestone && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                              固定
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getTaskName(task.predecessor_id) || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {task.task_type ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                            {TASK_TYPES[task.task_type as TaskType] || task.task_type}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {getMemberName(task.assigned_member_id) ? (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{getMemberName(task.assigned_member_id)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.planned_start_date && task.planned_end_date ? (
                          <div className="text-xs">
                            <div>{new Date(task.planned_start_date).toLocaleDateString('ja-JP')}</div>
                            <div className="text-gray-400 dark:text-gray-500">〜</div>
                            <div>{new Date(task.planned_end_date).toLocaleDateString('ja-JP')}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.actual_start_date || task.actual_end_date ? (
                          <div className="text-xs">
                            <div>{task.actual_start_date ? new Date(task.actual_start_date).toLocaleDateString('ja-JP') : '-'}</div>
                            <div className="text-gray-400 dark:text-gray-500">〜</div>
                            <div>{task.actual_end_date ? new Date(task.actual_end_date).toLocaleDateString('ja-JP') : '-'}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
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
                          <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                task.progress >= 100 ? 'bg-green-500' :
                                task.progress >= 50 ? 'bg-blue-500' :
                                task.progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(task.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-12">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                ) : (
                  <tr>
                    <td colSpan={autoScheduleMode ? 11 : 10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      タスクがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* リスケジュールプレビューモーダル */}
      {showReschedulePreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden mx-4">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">リスケジュール確認</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {previewData.total_count}件のタスクが影響を受けます
                  （{previewData.shift_days > 0 ? `${previewData.shift_days}日 後ろ倒し` : `${Math.abs(previewData.shift_days)}日 前倒し`}）
                </p>
              </div>
              <button
                onClick={() => setShowReschedulePreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {previewData.total_count > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <tr>
                      <th className="pb-2 font-medium">タスク名</th>
                      <th className="pb-2 font-medium">現在の開始日</th>
                      <th className="pb-2 font-medium">新しい開始日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {previewData.affected_tasks.map((task) => (
                      <tr key={task.id} className={task.is_child ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}>
                        <td className="py-2">
                          {task.is_child && <span className="mr-2">└</span>}
                          {task.name}
                        </td>
                        <td className="py-2">
                          {task.current_start ? new Date(task.current_start).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="py-2 text-blue-600 dark:text-blue-400 font-medium">
                          {task.new_start ? new Date(task.new_start).toLocaleDateString('ja-JP') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  リスケジュール対象のタスクがありません
                </p>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowReschedulePreview(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleExecuteReschedule}
                disabled={previewData.total_count === 0 || rescheduleMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rescheduleMutation.isPending ? '実行中...' : '実行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自動スケジュールプレビューモーダル */}
      {showAutoSchedulePreview && autoSchedulePreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden mx-4">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">自動割り当て確認</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {autoSchedulePreviewData.total_count}件のタスクに担当者と日付を設定します
                  （開始日: {new Date(autoSchedulePreviewData.start_date).toLocaleDateString('ja-JP')}）
                </p>
              </div>
              <button
                onClick={() => setShowAutoSchedulePreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 警告表示 */}
            {autoSchedulePreviewData.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">警告:</p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {autoSchedulePreviewData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {autoSchedulePreviewData.tasks.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <tr>
                      <th className="pb-2 font-medium">タスク名</th>
                      <th className="pb-2 font-medium">種別</th>
                      <th className="pb-2 font-medium">工数</th>
                      <th className="pb-2 font-medium">日数</th>
                      <th className="pb-2 font-medium">担当者</th>
                      <th className="pb-2 font-medium">開始日</th>
                      <th className="pb-2 font-medium">終了日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {autoSchedulePreviewData.tasks.map((task) => (
                      <tr key={task.id} className="text-gray-900 dark:text-white">
                        <td className="py-2">{task.name}</td>
                        <td className="py-2">
                          {task.task_type ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                              {TASK_TYPES[task.task_type as TaskType] || task.task_type}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2">{task.planned_hours}h</td>
                        <td className="py-2">{task.calculated_days}日</td>
                        <td className="py-2">
                          {task.new_member_name ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              {task.new_member_name}
                            </span>
                          ) : (
                            <span className="text-gray-400">未割当</span>
                          )}
                        </td>
                        <td className="py-2 text-purple-600 dark:text-purple-400 font-medium">
                          {task.new_start ? new Date(task.new_start).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="py-2 text-purple-600 dark:text-purple-400 font-medium">
                          {task.new_end ? new Date(task.new_end).toLocaleDateString('ja-JP') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  自動割り当て対象のタスクがありません
                </p>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowAutoSchedulePreview(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleExecuteAutoSchedule}
                disabled={autoSchedulePreviewData.total_count === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WBSインポートモーダル */}
      {showImportModal && selectedProjectId && (
        <WBSImportModal
          projectId={selectedProjectId}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
