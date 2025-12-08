import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysApi } from '../api/client';
import type { Holiday, HolidayType, HolidayGenerateRequest } from '../types';
import { Calendar, Plus, Trash2, Upload, Wand2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface HolidayCalendarProps {
  projectId: number;
  projectStartDate: string;
  projectEndDate: string;
}

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  weekend: '土日',
  national: '祝日',
  company: '会社休日',
  custom: 'カスタム',
};

const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  weekend: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
  national: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  company: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  custom: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
};

// ローカル日付をYYYY-MM-DD形式の文字列に変換（タイムゾーンの影響を受けない）
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function HolidayCalendar({ projectId, projectStartDate, projectEndDate }: HolidayCalendarProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const start = new Date(projectStartDate);
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });

  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    holiday_type: 'custom' as HolidayType,
  });

  const [generateConfig, setGenerateConfig] = useState<HolidayGenerateRequest>({
    start_date: projectStartDate.split('T')[0],
    end_date: projectEndDate.split('T')[0],
    include_weekends: true,
    include_national_holidays: true,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', projectId],
    queryFn: () => holidaysApi.getByProject(projectId),
    enabled: !!projectId,
  });

  const { data: workingDaysInfo } = useQuery({
    queryKey: ['working-days', projectId, projectStartDate, projectEndDate],
    queryFn: () => holidaysApi.getWorkingDays(projectId, projectStartDate.split('T')[0], projectEndDate.split('T')[0]),
    enabled: !!projectId && !!projectStartDate && !!projectEndDate,
  });

  const createMutation = useMutation({
    mutationFn: (data: { date: string; name: string; holiday_type: HolidayType }) =>
      holidaysApi.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', projectId] });
      queryClient.invalidateQueries({ queryKey: ['working-days', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
      setShowAddForm(false);
      setNewHoliday({ date: '', name: '', holiday_type: 'custom' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', projectId] });
      queryClient.invalidateQueries({ queryKey: ['working-days', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: (holidayType?: HolidayType) => holidaysApi.deleteAll(projectId, holidayType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', projectId] });
      queryClient.invalidateQueries({ queryKey: ['working-days', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (request: HolidayGenerateRequest) => holidaysApi.generate(projectId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', projectId] });
      queryClient.invalidateQueries({ queryKey: ['working-days', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
      setShowGenerateForm(false);
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: (file: File) => holidaysApi.importCsv(projectId, file, false),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['holidays', projectId] });
      queryClient.invalidateQueries({ queryKey: ['working-days', projectId] });
      queryClient.invalidateQueries({ queryKey: ['evm-analysis', projectId] });
      alert(`インポート完了: ${result.created}件追加, ${result.skipped}件スキップ`);
    },
    onError: (error) => {
      alert(`インポートエラー: ${error}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importCsvMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newHoliday);
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(generateConfig);
  };

  // カレンダー表示用のデータ生成
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0 = Sunday

    const days: { date: Date; isCurrentMonth: boolean; holiday?: Holiday }[] = [];

    // 前月の日を埋める
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // 今月の日
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = formatLocalDate(date);
      const holiday = holidays.find((h) => h.date === dateStr);
      days.push({ date, isCurrentMonth: true, holiday });
    }

    // 翌月の日を埋める（6週分にする）
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">休日カレンダー</h3>
            {workingDaysInfo && (
              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                稼働日: {workingDaysInfo.working_days}日 / 全{workingDaysInfo.total_days}日
                （休日: {workingDaysInfo.holiday_count}日）
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerateForm(!showGenerateForm)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              自動生成
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              CSVインポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        </div>
      </div>

      {/* 自動生成フォーム */}
      {showGenerateForm && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
          <form onSubmit={handleGenerateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={generateConfig.start_date}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={generateConfig.end_date}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generateConfig.include_weekends}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, include_weekends: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">土日を含める</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generateConfig.include_national_holidays}
                  onChange={(e) => setGenerateConfig({ ...generateConfig, include_national_holidays: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">日本の祝日を含める</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={generateMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {generateMutation.isPending ? '生成中...' : '生成'}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 休日追加フォーム */}
      {showAddForm && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  日付 *
                </label>
                <input
                  type="date"
                  required
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  名称 *
                </label>
                <input
                  type="text"
                  required
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="例: 創立記念日"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  種類
                </label>
                <select
                  value={newHoliday.holiday_type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_type: e.target.value as HolidayType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="custom">カスタム</option>
                  <option value="company">会社休日</option>
                  <option value="national">祝日</option>
                  <option value="weekend">土日</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '追加中...' : '追加'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* カレンダー表示 */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </h4>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => {
            const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
            return (
              <div
                key={index}
                className={`min-h-[60px] p-1 border border-gray-100 dark:border-gray-700 rounded ${
                  day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div
                  className={`text-sm ${
                    !day.isCurrentMonth
                      ? 'text-gray-300 dark:text-gray-600'
                      : day.holiday
                      ? 'text-red-500 font-bold'
                      : isWeekend
                      ? day.date.getDay() === 0
                        ? 'text-red-400'
                        : 'text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day.date.getDate()}
                </div>
                {day.holiday && day.isCurrentMonth && (
                  <div
                    className={`mt-1 text-xs px-1 py-0.5 rounded truncate ${HOLIDAY_TYPE_COLORS[day.holiday.holiday_type]}`}
                    title={day.holiday.name}
                  >
                    {day.holiday.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 休日一覧 */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">休日一覧</h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('すべての休日を削除しますか？')) {
                  deleteAllMutation.mutate(undefined);
                }
              }}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800"
            >
              すべて削除
            </button>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {holidays.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              休日が設定されていません
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">日付</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">名称</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">種類</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {holidays.map((holiday) => {
                  // YYYY-MM-DD形式の日付をパースしてローカル日付として表示
                  const [year, month, day] = holiday.date.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  return (
                  <tr key={holiday.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                      {dateObj.toLocaleDateString('ja-JP', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{holiday.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded ${HOLIDAY_TYPE_COLORS[holiday.holiday_type]}`}>
                        {HOLIDAY_TYPE_LABELS[holiday.holiday_type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(holiday.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
