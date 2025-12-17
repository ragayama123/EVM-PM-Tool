import { useState, useRef } from 'react';
import { X, Download, Upload, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/client';
import type { WBSImportPreviewResponse, WBSImportPreviewTask } from '../types';

interface Props {
  projectId: number;
  onClose: () => void;
}

export function WBSImportModal({ projectId, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<WBSImportPreviewResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // テンプレートダウンロード
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await tasksApi.downloadTemplate(projectId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wbs_template_${projectId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('テンプレートのダウンロードに失敗しました');
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  // プレビューmutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => tasksApi.importExcelPreview(projectId, file),
    onSuccess: (data) => {
      setPreviewData(data);
      setError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || 'プレビューの取得に失敗しました');
      setPreviewData(null);
    },
  });

  // インポート実行mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => tasksApi.importExcel(projectId, file),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        alert(data.message);
        onClose();
      } else {
        setError(data.message);
      }
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || 'インポートに失敗しました');
    },
  });

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setError(null);
    }
  };

  // プレビュー実行
  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  // インポート実行
  const handleImport = () => {
    if (selectedFile && previewData?.success) {
      if (confirm('既存のタスクは全て削除され、Excelファイルの内容で置き換えられます。\n\n実行してもよろしいですか？')) {
        importMutation.mutate(selectedFile);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* ヘッダー */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              ExcelからWBSインポート
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* 警告 */}
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">注意</p>
                <p>インポートを実行すると、既存のタスクは全て削除され、Excelファイルの内容で置き換えられます。</p>
              </div>
            </div>
          </div>

          {/* ステップ1: テンプレートダウンロード */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              ステップ1: テンプレートをダウンロード（任意）
            </h4>
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'ダウンロード中...' : 'テンプレートをダウンロード'}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              プロジェクトのメンバー情報が含まれたExcelテンプレートをダウンロードできます。
            </p>
          </div>

          {/* ステップ2: ファイル選択 */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              ステップ2: Excelファイルを選択
            </h4>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                <Upload className="w-4 h-4" />
                ファイルを選択
              </button>
              {selectedFile && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          {/* ステップ3: プレビュー */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              ステップ3: プレビュー
            </h4>
            <button
              onClick={handlePreview}
              disabled={!selectedFile || previewMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewMutation.isPending ? 'プレビュー中...' : 'プレビュー'}
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* プレビュー結果 */}
          {previewData && (
            <div className="mb-4">
              {/* エラー一覧 */}
              {previewData.errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    バリデーションエラー ({previewData.errors.length}件)
                  </p>
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside max-h-32 overflow-y-auto">
                    {previewData.errors.map((err, idx) => (
                      <li key={idx}>行{err.row}: {err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 成功表示 */}
              {previewData.success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {previewData.total_count}件のタスクをインポートできます
                    </p>
                  </div>
                </div>
              )}

              {/* タスク一覧 */}
              {previewData.tasks.length > 0 && (
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">WBS番号</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">タスク名</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">種別</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">工数</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">予定開始日</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">予定終了日</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">担当者</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.tasks.map((task: WBSImportPreviewTask) => (
                          <tr key={task.row} className={task.is_child ? 'text-gray-500 dark:text-gray-400' : ''}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {task.is_child && <span className="mr-1">└</span>}
                              {task.wbs_number}
                            </td>
                            <td className="px-3 py-2">{task.name}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {task.task_type_label || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{task.planned_hours}h</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {task.planned_start_date || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {task.planned_end_date || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {task.assigned_member_name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData?.success || importMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importMutation.isPending ? 'インポート中...' : 'インポート実行'}
          </button>
        </div>
      </div>
    </div>
  );
}
