import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Inbox,
  KanbanSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import clsx from 'clsx';

const nav = [
  { to: '/app/tasks', label: 'Tasks', icon: Inbox },
  { to: '/app/kanban', label: 'Kanban', icon: KanbanSquare },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/stats', label: 'Stats', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const nav2 = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const signOut = () => {
    logout();
    nav2('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-20">
        <button onClick={toggleSidebar} className="btn-ghost md:hidden" aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="text-ai" size={20} /> Task AI
        </div>
        <div className="flex-1" />
        <span className="text-sm text-gray-500 hidden sm:inline">{user?.phone}</span>
        <button onClick={signOut} className="btn-ghost" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={clsx(
            'border-r border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800 w-60 shrink-0',
            'md:block',
            sidebarOpen ? 'block' : 'hidden',
            'md:static absolute inset-y-0 left-0 z-10 h-[calc(100vh-57px)] top-[57px] md:h-auto md:top-auto',
          )}
        >
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )
                }
              >
                <item.icon size={18} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 flex z-10">
        {nav.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs min-h-[56px]',
                isActive ? 'text-brand' : 'text-gray-500',
              )
            }
          >
            <item.icon size={20} /> {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
