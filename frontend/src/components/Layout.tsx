import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ListTodo, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { path: '/projects', label: 'プロジェクト', icon: FolderKanban },
  { path: '/tasks', label: 'タスク', icon: ListTodo },
  { path: '/reports', label: 'レポート', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            📊 EVM プロジェクト管理ツール
          </h1>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <nav className="w-64 min-h-screen bg-white shadow-sm">
          <ul className="py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
