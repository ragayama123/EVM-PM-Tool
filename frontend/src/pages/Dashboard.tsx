import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi, evmApi } from '../api/client';
import { KPICard } from '../components/KPICard';
import { EVMChart } from '../components/EVMChart';
import { StatusBadge } from '../components/StatusBadge';
import { FolderKanban, AlertCircle } from 'lucide-react';

// EVM用語の説明
const evmTooltips = {
  spi: 'Schedule Performance Index（スケジュール効率指数）= EV ÷ PV。1.0以上なら予定より進んでいる、1.0未満なら遅れている。',
  cpi: 'Cost Performance Index（コスト効率指数）= EV ÷ AC。1.0以上なら予算内、1.0未満なら予算超過。',
  ev: 'Earned Value（出来高）。実際に完了した作業の計画コスト。進捗率 × 計画価値で算出。',
  eac: 'Estimate at Completion（完了時総コスト見積）。現在のパフォーマンスで完了した場合の総コスト予測。',
};

export function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  // 最初のプロジェクトのEVM分析を取得（デモ用）
  const firstProjectId = projects?.[0]?.id;

  const { data: evmAnalysis } = useQuery({
    queryKey: ['evm-analysis', firstProjectId],
    queryFn: () => evmApi.getAnalysis(firstProjectId!),
    enabled: !!firstProjectId,
  });

  const { data: evmSnapshots } = useQuery({
    queryKey: ['evm-snapshots', firstProjectId],
    queryFn: () => evmApi.getSnapshots(firstProjectId!),
    enabled: !!firstProjectId,
  });

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h2>

      {/* KPIカード */}
      {evmAnalysis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="SPI（スケジュール効率）"
            value={evmAnalysis.metrics.spi}
            format="index"
            tooltip={evmTooltips.spi}
            thresholds={{ good: 1.0, warning: 0.9 }}
            trend={evmAnalysis.metrics.spi >= 1 ? 'up' : 'down'}
            description={evmAnalysis.schedule_status.message}
          />
          <KPICard
            title="CPI（コスト効率）"
            value={evmAnalysis.metrics.cpi}
            format="index"
            tooltip={evmTooltips.cpi}
            thresholds={{ good: 1.0, warning: 0.9 }}
            trend={evmAnalysis.metrics.cpi >= 1 ? 'up' : 'down'}
            description={evmAnalysis.cost_status.message}
          />
          <KPICard
            title="EV（出来高）"
            value={evmAnalysis.metrics.ev}
            format="currency"
            tooltip={evmTooltips.ev}
          />
          <KPICard
            title="EAC（完了時総コスト見積）"
            value={evmAnalysis.metrics.eac}
            format="currency"
            tooltip={evmTooltips.eac}
          />
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-yellow-800 dark:text-yellow-200">
            プロジェクトを作成するとEVM指標が表示されます。
          </p>
        </div>
      )}

      {/* EVMチャート */}
      {evmSnapshots && evmSnapshots.length > 0 && (
        <EVMChart snapshots={evmSnapshots} />
      )}

      {/* プロジェクト一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">プロジェクト一覧</h3>
          <Link
            to="/projects/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            新規作成
          </Link>
        </div>

        {projects && projects.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FolderKanban className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(project.start_date).toLocaleDateString('ja-JP')} 〜{' '}
                        {new Date(project.end_date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      予算: ¥{project.budget.toLocaleString()}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>プロジェクトがありません</p>
            <Link
              to="/projects/new"
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              最初のプロジェクトを作成する
            </Link>
          </div>
        )}
      </div>

      {/* 推奨アクション */}
      {evmAnalysis && evmAnalysis.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">推奨アクション</h3>
          <ul className="space-y-2">
            {evmAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span className="text-gray-700 dark:text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
