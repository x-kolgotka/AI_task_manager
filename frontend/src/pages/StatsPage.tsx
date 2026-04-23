import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format, startOfDay, subDays } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es as esLocale, ru } from 'date-fns/locale';
import { tasksApi } from '@/api/tasks';
import { useT } from '@/i18n';
import { Language, useUiStore } from '@/store/ui';

const dateLocales = {
  en: enUS,
  ru,
  es: esLocale,
} satisfies Record<Language, Locale>;

export default function StatsPage() {
  const t = useT();
  const language = useUiStore((s) => s.language);
  const dateLocale = dateLocales[language];
  const { data } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => tasksApi.list() });
  const tasks = data?.tasks ?? [];

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const doing = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const today = startOfDay(new Date()).getTime();
    const doneToday = tasks.filter(
      (t) => t.status === 'DONE' && differenceInDays(new Date(), new Date(t.updatedAt)) === 0,
    ).length;
    const overdue = tasks.filter(
      (t) =>
        t.status !== 'DONE' &&
        t.dueDate &&
        new Date(t.dueDate).getTime() < today,
    ).length;

    const last7 = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    const byDay = last7.map((d) => ({
      day: format(d, 'EEE', { locale: dateLocale }),
      done: tasks.filter(
        (t) =>
          t.status === 'DONE' &&
          format(new Date(t.updatedAt), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'),
      ).length,
    }));
    const maxDone = Math.max(1, ...byDay.map((d) => d.done));

    return { total, done, doing, todo, doneToday, overdue, byDay, maxDone };
  }, [dateLocale, tasks]);

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 space-y-6">
      <h1 className="text-xl font-semibold">{t('stats.title')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t('stats.total')} value={stats.total} />
        <Stat label={t('status.done')} value={stats.done} tone="green" />
        <Stat label={t('status.inProgress')} value={stats.doing} tone="blue" />
        <Stat label={t('status.todo')} value={stats.todo} />
        <Stat label={t('stats.doneToday')} value={stats.doneToday} tone="green" />
        <Stat label={t('calendar.status.overdue')} value={stats.overdue} tone="red" />
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">{t('stats.last7')}</h2>
        <div className="flex items-end gap-2 h-32">
          {stats.byDay.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-brand rounded-t"
                style={{ height: `${(d.done / stats.maxDone) * 100}%`, minHeight: d.done ? '8px' : '2px' }}
              />
              <span className="text-xs text-gray-500">{d.day}</span>
              <span className="text-xs font-medium">{d.done}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'blue' | 'red' }) {
  const color =
    tone === 'green'
      ? 'text-green-600'
      : tone === 'blue'
        ? 'text-brand'
        : tone === 'red'
          ? 'text-red-600'
          : 'text-ink dark:text-gray-200';
  return (
    <div className="card">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
