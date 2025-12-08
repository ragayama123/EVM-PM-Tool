import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ListTodo, Users, BarChart3, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { path: '/projects', label: 'プロジェクト', icon: FolderKanban },
  { path: '/tasks', label: 'タスク', icon: ListTodo },
  { path: '/members', label: 'メンバー', icon: Users },
  { path: '/reports', label: 'レポート', icon: BarChart3 },
];

export function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            EVM プロジェクト管理ツール
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <nav className="w-64 min-h-screen bg-white dark:bg-gray-800 shadow-sm">
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
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
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
