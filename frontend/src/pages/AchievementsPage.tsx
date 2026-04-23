import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle2, Medal, Sparkles, Star, Trophy } from 'lucide-react';
import { usersApi } from '@/api/tasks';
import { TranslationKey, useT } from '@/i18n';
import { Language, useUiStore } from '@/store/ui';
import clsx from 'clsx';

type Achievement = {
  id: string;
  badge: string;
  title: string;
  description?: string;
  points: number;
  unlockedAt: string;
};

const badgeIcon = {
  first_task: CheckCircle2,
  ten_tasks: Medal,
  fifty_tasks: Award,
  hundred_tasks: Trophy,
  streak_7: Sparkles,
  ai_master: Star,
  night_owl: Trophy,
} as const;

const badgeOrder = ['first_task', 'ten_tasks', 'fifty_tasks', 'hundred_tasks', 'streak_7', 'ai_master', 'night_owl'] as const;

const badgeTextKeys = {
  first_task: {
    title: 'achievements.badge.first_task.title',
    description: 'achievements.badge.first_task.description',
    points: 'achievements.badge.first_task.points',
  },
  ten_tasks: {
    title: 'achievements.badge.ten_tasks.title',
    description: 'achievements.badge.ten_tasks.description',
    points: 'achievements.badge.ten_tasks.points',
  },
  fifty_tasks: {
    title: 'achievements.badge.fifty_tasks.title',
    description: 'achievements.badge.fifty_tasks.description',
    points: 'achievements.badge.fifty_tasks.points',
  },
  hundred_tasks: {
    title: 'achievements.badge.hundred_tasks.title',
    description: 'achievements.badge.hundred_tasks.description',
    points: 'achievements.badge.hundred_tasks.points',
  },
  streak_7: {
    title: 'achievements.badge.streak_7.title',
    description: 'achievements.badge.streak_7.description',
    points: 'achievements.badge.streak_7.points',
  },
  ai_master: {
    title: 'achievements.badge.ai_master.title',
    description: 'achievements.badge.ai_master.description',
    points: 'achievements.badge.ai_master.points',
  },
  night_owl: {
    title: 'achievements.badge.night_owl.title',
    description: 'achievements.badge.night_owl.description',
    points: 'achievements.badge.night_owl.points',
  },
} satisfies Record<string, Record<'title' | 'description' | 'points', TranslationKey>>;

const formatUnlocked = (language: Language, value: string) =>
  new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function AchievementsPage() {
  const t = useT();
  const language = useUiStore((s) => s.language);
  const achievements = useQuery({ queryKey: ['users', 'achievements'], queryFn: usersApi.achievements });
  const points = useQuery({ queryKey: ['users', 'points'], queryFn: usersApi.points });

  const unlockedByBadge = useMemo(() => {
    const rows = (achievements.data ?? []) as Achievement[];
    return new Map(rows.map((achievement) => [achievement.badge, achievement]));
  }, [achievements.data]);

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-pretty">{t('achievements.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('achievements.subtitle')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-right shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('achievements.points')}</div>
          <div className="text-3xl font-semibold tabular-nums text-brand">{points.data?.points ?? 0}</div>
        </div>
      </header>

      <section aria-live="polite">
        {achievements.isPending ? (
          <div className="card text-sm text-gray-500">{t('achievements.loading')}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {badgeOrder.map((badge) => {
              const item = unlockedByBadge.get(badge);
              const Icon = badgeIcon[badge as keyof typeof badgeIcon] ?? Trophy;
              const keys = badgeTextKeys[badge];
              const unlocked = Boolean(item);
              return (
                <article
                  key={badge}
                  className={clsx(
                    'rounded-lg border p-4 shadow-sm transition-colors',
                    unlocked
                      ? 'border-brand/30 bg-white dark:bg-gray-900'
                      : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={clsx(
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        unlocked ? 'bg-brand/10 text-brand' : 'bg-gray-200 text-gray-500 dark:bg-gray-800',
                      )}
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold break-words">
                        {item?.title ?? t(keys.title)}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400 break-words">
                        {item?.description ?? t(keys.description)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                    <span className={clsx('font-semibold tabular-nums', unlocked ? 'text-brand' : 'text-gray-500')}>
                      +{item?.points ?? t(keys.points)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item ? formatUnlocked(language, item.unlockedAt) : t('achievements.locked')}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
