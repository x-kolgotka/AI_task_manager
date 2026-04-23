import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  KanbanSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import { usersApi } from '@/api/tasks';
import { TranslationKey, useT } from '@/i18n';
import clsx from 'clsx';

const nav = [
  { to: '/app/tasks', labelKey: 'nav.tasks', icon: Inbox },
  { to: '/app/kanban', labelKey: 'nav.kanban', icon: KanbanSquare },
  { to: '/app/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { to: '/app/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/app/assistant', labelKey: 'ai.navAssistant', icon: Sparkles },
  { to: '/app/achievements', labelKey: 'nav.achievements', icon: Trophy },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings },
] satisfies { to: string; labelKey: TranslationKey; icon: typeof Inbox }[];

const mobileNav = [nav[0], nav[2], nav[4], nav[6]];

export default function AppShell() {
  const t = useT();
  const nav2 = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTop = useRef(0);

  const signOut = () => {
    logout();
    nav2('/login');
  };

  const language = useUiStore((s) => s.language);
  useEffect(() => {
    usersApi.setPreferences({ language }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const readScrollTop = (target: EventTarget | null) => {
      if (target === window || target === document) return window.scrollY || document.documentElement.scrollTop || 0;
      if (target instanceof HTMLElement) return target.scrollTop;
      return window.scrollY || 0;
    };

    const onScroll = (event: Event) => {
      const nextTop = readScrollTop(event.target);
      const previousTop = lastScrollTop.current;
      if (Math.abs(nextTop - previousTop) < 6) return;
      setHeaderHidden(nextTop > previousTop && nextTop > 48);
      lastScrollTop.current = Math.max(0, nextTop);
    };

    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>
      <header
        data-testid="app-header"
        className={clsx(
          'app-header flex items-center gap-3 border-b border-gray-200 bg-white px-4 dark:bg-gray-900 dark:border-gray-800 sticky top-0 z-30 transition-transform duration-200 ease-out',
          headerHidden && !sidebarOpen && 'max-md:-translate-y-full',
        )}
      >
        <button onClick={toggleSidebar} className="btn-ghost md:hidden" aria-label={t('nav.toggleMenu')}>
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2 font-bold text-lg">
          <Sparkles className="text-ai" size={20} aria-hidden="true" /> Task AI
        </div>
        <div className="flex-1" />
        <span className="text-sm text-gray-500 hidden sm:inline">{user?.phone}</span>
        <button onClick={signOut} className="btn-ghost" aria-label={t('nav.signOut')}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={closeSidebar}
            aria-label={t('nav.closeMenu')}
          />
        )}
        <aside
          className={clsx(
            'border-r border-gray-200 bg-white p-3 dark:bg-gray-900 dark:border-gray-800 w-[min(18rem,82vw)] shrink-0',
            'md:block',
            sidebarOpen ? 'block' : 'hidden',
            'fixed left-0 z-30 h-[calc(100dvh-var(--app-header-height))] top-[var(--app-header-height)] overflow-y-auto overscroll-contain md:static md:z-auto md:h-auto md:top-auto',
          )}
        >
          <nav className="flex flex-col gap-1" aria-label={t('nav.primary')}>
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    )
                  }
                >
                  <Icon size={18} aria-hidden="true" /> {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-x-hidden scroll-mt-16">
          <Outlet />
        </main>
      </div>

      <nav
        className="mobile-bottom-nav md:hidden fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white/95 backdrop-blur dark:bg-gray-900/95 dark:border-gray-800 flex z-20"
        aria-label={t('nav.mobile')}
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'min-w-0 flex-1 flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] min-h-[58px]',
                  isActive ? 'text-brand' : 'text-gray-500',
                )
              }
              aria-current={location.pathname.startsWith(item.to) ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="max-w-full truncate">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
