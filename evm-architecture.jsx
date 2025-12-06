import React, { useState } from 'react';

const architectureData = {
  layers: [
    {
      id: 'frontend',
      name: 'フロントエンド',
      icon: '🖥️',
      color: 'bg-blue-500',
      components: [
        { name: 'React + TypeScript', desc: 'SPA フレームワーク' },
        { name: 'Recharts / D3.js', desc: 'EVM可視化チャート' },
        { name: 'TailwindCSS', desc: 'UIスタイリング' },
        { name: 'React Query', desc: 'データフェッチ・キャッシュ' },
      ]
    },
    {
      id: 'api',
      name: 'API層',
      icon: '⚡',
      color: 'bg-green-500',
      components: [
        { name: 'NestJS / FastAPI', desc: 'REST API サーバー' },
        { name: 'JWT認証', desc: 'トークンベース認証' },
        { name: 'Swagger/OpenAPI', desc: 'API ドキュメント' },
        { name: 'バリデーション', desc: 'リクエスト検証' },
      ]
    },
    {
      id: 'business',
      name: 'ビジネスロジック',
      icon: '🔧',
      color: 'bg-purple-500',
      components: [
        { name: 'EVM計算エンジン', desc: 'PV/EV/AC/SPI/CPI算出' },
        { name: 'プロジェクト管理', desc: 'CRUD・権限管理' },
        { name: 'WBS管理', desc: '階層タスク構造' },
        { name: 'レポート生成', desc: 'PDF/Excel出力' },
      ]
    },
    {
      id: 'data',
      name: 'データ層',
      icon: '💾',
      color: 'bg-orange-500',
      components: [
        { name: 'PostgreSQL', desc: 'メインDB（プロジェクト・タスク・コスト）' },
        { name: 'Redis', desc: 'キャッシュ・セッション' },
        { name: 'S3互換ストレージ', desc: '添付ファイル保存' },
      ]
    },
  ],
  evmMetrics: [
    { abbr: 'PV', name: 'Planned Value', desc: '計画価値', formula: '計画工数 × 単価' },
    { abbr: 'EV', name: 'Earned Value', desc: '出来高', formula: '完了タスクの計画価値合計' },
    { abbr: 'AC', name: 'Actual Cost', desc: '実コスト', formula: '実績工数 × 単価' },
    { abbr: 'SV', name: 'Schedule Variance', desc: 'スケジュール差異', formula: 'EV - PV' },
    { abbr: 'CV', name: 'Cost Variance', desc: 'コスト差異', formula: 'EV - AC' },
    { abbr: 'SPI', name: 'Schedule Performance Index', desc: 'スケジュール効率', formula: 'EV / PV' },
    { abbr: 'CPI', name: 'Cost Performance Index', desc: 'コスト効率', formula: 'EV / AC' },
  ],
  techStack: {
    recommended: {
      frontend: ['React 18+', 'TypeScript', 'Vite', 'TailwindCSS', 'Recharts'],
      backend: ['NestJS (Node.js)', 'Prisma ORM', 'Jest'],
      database: ['PostgreSQL 15+', 'Redis'],
      infra: ['Docker', 'AWS/GCP/Azure', 'GitHub Actions'],
    },
    alternative: {
      frontend: ['Vue 3', 'Nuxt 3'],
      backend: ['FastAPI (Python)', 'SQLAlchemy'],
    }
  }
};

export default function EVMArchitecture() {
  const [activeLayer, setActiveLayer] = useState(null);
  const [activeTab, setActiveTab] = useState('architecture');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">📊 EVM プロジェクト管理ツール</h1>
          <p className="text-slate-400">システムアーキテクチャ設計</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { id: 'architecture', label: '🏗️ アーキテクチャ' },
            { id: 'evm', label: '📈 EVM指標' },
            { id: 'tech', label: '🛠️ 技術スタック' },
            { id: 'db', label: '🗄️ DB設計' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            {architectureData.layers.map((layer, idx) => (
              <div
                key={layer.id}
                className={`rounded-xl overflow-hidden transition-all cursor-pointer ${
                  activeLayer === layer.id ? 'ring-2 ring-blue-400' : ''
                }`}
                onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
              >
                <div className={`${layer.color} p-4 flex items-center gap-3`}>
                  <span className="text-2xl">{layer.icon}</span>
                  <span className="text-lg font-semibold">{layer.name}</span>
                  <span className="ml-auto text-sm opacity-75">
                    {activeLayer === layer.id ? '▼' : '▶'}
                  </span>
                </div>
                {activeLayer === layer.id && (
                  <div className="bg-slate-800 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {layer.components.map((comp, i) => (
                      <div key={i} className="bg-slate-700 rounded-lg p-3">
                        <div className="font-medium text-sm">{comp.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{comp.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Data Flow */}
            <div className="mt-6 bg-slate-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">🔄 データフロー</h3>
              <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                {['ユーザー', '→', 'フロントエンド', '→', 'API Gateway', '→', 'ビジネスロジック', '→', 'データ層'].map((item, i) => (
                  <span key={i} className={item === '→' ? 'text-blue-400' : 'bg-slate-700 px-3 py-1 rounded'}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EVM Metrics Tab */}
        {activeTab === 'evm' && (
          <div className="grid md:grid-cols-2 gap-4">
            {architectureData.evmMetrics.map((metric, idx) => (
              <div key={idx} className="bg-slate-800 rounded-xl p-4 hover:bg-slate-750 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-lg">
                    {metric.abbr}
                  </span>
                  <span className="font-medium">{metric.name}</span>
                </div>
                <div className="text-slate-400 text-sm mb-2">{metric.desc}</div>
                <div className="bg-slate-700 rounded px-3 py-2 font-mono text-sm text-green-400">
                  {metric.formula}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tech Stack Tab */}
        {activeTab === 'tech' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 text-green-400">✅ 推奨スタック</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(architectureData.techStack.recommended).map(([category, techs]) => (
                  <div key={category} className="bg-slate-700 rounded-lg p-3">
                    <div className="font-medium text-sm text-slate-300 mb-2 capitalize">{category}</div>
                    <div className="space-y-1">
                      {techs.map((tech, i) => (
                        <div key={i} className="text-sm bg-slate-600 rounded px-2 py-1">{tech}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 text-yellow-400">🔄 代替オプション</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(architectureData.techStack.alternative).map(([category, techs]) => (
                  <div key={category} className="bg-slate-700 rounded-lg p-3">
                    <div className="font-medium text-sm text-slate-300 mb-2 capitalize">{category}</div>
                    <div className="flex gap-2 flex-wrap">
                      {techs.map((tech, i) => (
                        <span key={i} className="text-sm bg-slate-600 rounded px-2 py-1">{tech}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DB Schema Tab */}
        {activeTab === 'db' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="font-semibold mb-4">🗄️ 主要テーブル設計</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'projects', fields: ['id', 'name', 'start_date', 'end_date', 'budget', 'status', 'manager_id'] },
                { name: 'tasks', fields: ['id', 'project_id', 'parent_id', 'name', 'planned_hours', 'actual_hours', 'progress', 'start_date', 'end_date'] },
                { name: 'costs', fields: ['id', 'task_id', 'cost_type', 'planned_amount', 'actual_amount', 'date'] },
                { name: 'evm_snapshots', fields: ['id', 'project_id', 'date', 'pv', 'ev', 'ac', 'spi', 'cpi'] },
              ].map((table, idx) => (
                <div key={idx} className="bg-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-purple-600 px-3 py-2 font-mono font-medium">{table.name}</div>
                  <div className="p-3 space-y-1">
                    {table.fields.map((field, i) => (
                      <div key={i} className="text-sm font-mono text-slate-300 flex items-center gap-2">
                        <span className="text-purple-400">•</span> {field}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          各層をクリックすると詳細が表示されます
        </div>
      </div>
    </div>
  );
}
