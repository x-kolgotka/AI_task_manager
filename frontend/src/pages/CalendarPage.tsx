import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es as esLocale, ru } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { tasksApi } from '@/api/tasks';
import Modal from '@/components/Modal';
import TaskDetail from '@/components/TaskDetail';
import { useUiStore, CalendarMode, Language } from '@/store/ui';
import { Task } from '@/types';
import { TranslationKey, useT } from '@/i18n';

type CalendarStatus = 'done' | 'inProgress' | 'overdue' | 'planned';

const modeOptions: { value: CalendarMode; labelKey: TranslationKey }[] = [
  { value: 'day', labelKey: 'calendar.mode.day' },
  { value: 'twoDays', labelKey: 'calendar.mode.twoDays' },
  { value: 'week', labelKey: 'calendar.mode.week' },
  { value: 'month', labelKey: 'calendar.mode.month' },
  { value: 'year', labelKey: 'calendar.mode.year' },
  { value: 'custom', labelKey: 'calendar.mode.custom' },
];

const statusMeta: Record<CalendarStatus, { labelKey: TranslationKey; icon: typeof CheckCircle2; classes: string; dot: string }> = {
  done: {
    labelKey: 'calendar.status.done',
    icon: CheckCircle2,
    classes: 'bg-emerald-100 text-emerald-900 border-emerald-500 border-l-4 line-through decoration-emerald-700/50 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-400',
    dot: 'bg-emerald-500',
  },
  inProgress: {
    labelKey: 'calendar.status.inProgress',
    icon: Activity,
    classes: 'bg-sky-100 text-sky-900 border-sky-500 border-l-4 dark:bg-sky-900/60 dark:text-sky-100 dark:border-sky-400',
    dot: 'bg-sky-500',
  },
  overdue: {
    labelKey: 'calendar.status.overdue',
    icon: AlertTriangle,
    classes: 'bg-red-100 text-red-900 border-red-600 border-l-4 font-semibold dark:bg-red-900/60 dark:text-red-100 dark:border-red-400',
    dot: 'bg-red-500',
  },
  planned: {
    labelKey: 'calendar.status.planned',
    icon: CalendarClock,
    classes: 'bg-slate-100 text-slate-900 border-slate-400 border-l-4 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-500',
    dot: 'bg-slate-500',
  },
};

const dateLocales = {
  en: enUS,
  ru,
  es: esLocale,
} satisfies Record<Language, Locale>;

const weekdayKeys: TranslationKey[] = [
  'calendar.weekday.sun',
  'calendar.weekday.mon',
  'calendar.weekday.tue',
  'calendar.weekday.wed',
  'calendar.weekday.thu',
  'calendar.weekday.fri',
  'calendar.weekday.sat',
];

const dateInput = (date: Date) => format(date, 'yyyy-MM-dd');
const parseInputDate = (value: string) => value ? new Date(`${value}T00:00:00`) : null;

const calendarStatus = (task: Task, today: Date): CalendarStatus => {
  if (task.status === 'DONE') return 'done';
  if (task.dueDate && isBefore(startOfDay(new Date(task.dueDate)), startOfDay(today))) return 'overdue';
  if (task.status === 'IN_PROGRESS') return 'inProgress';
  return 'planned';
};

export default function CalendarPage() {
  const t = useT();
  const { data } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => tasksApi.list() });
  const [cursorDate, setCursorDate] = useState(new Date());
  const [openId, setOpenId] = useState<string | null>(null);
  const { calendarMode, setCalendarMode, calendarRange, setCalendarRange, weekStart, language } = useUiStore();

  const weekStartsOn = weekStart === 'sun' ? 0 : 1;
  const dateLocale = dateLocales[language];
  const tasks = data?.tasks ?? [];
  const today = startOfDay(new Date());

  const period = useMemo(() => {
    if (calendarMode === 'day') return { start: startOfDay(cursorDate), end: startOfDay(cursorDate) };
    if (calendarMode === 'twoDays') return { start: startOfDay(cursorDate), end: addDays(startOfDay(cursorDate), 1) };
    if (calendarMode === 'week') return {
      start: startOfWeek(cursorDate, { weekStartsOn }),
      end: endOfWeek(cursorDate, { weekStartsOn }),
    };
    if (calendarMode === 'year') return { start: startOfYear(cursorDate), end: endOfYear(cursorDate) };
    if (calendarMode === 'custom') {
      const fallbackStart = startOfDay(cursorDate);
      const fallbackEnd = addDays(fallbackStart, 6);
      const start = parseInputDate(calendarRange.start) ?? fallbackStart;
      const end = parseInputDate(calendarRange.end) ?? fallbackEnd;
      return isBefore(end, start) ? { start: end, end: start } : { start, end };
    }
    return { start: startOfMonth(cursorDate), end: endOfMonth(cursorDate) };
  }, [calendarMode, calendarRange.end, calendarRange.start, cursorDate, weekStartsOn]);

  const rangeTitle = useMemo(() => {
    if (calendarMode === 'month') return format(cursorDate, 'MMMM yyyy', { locale: dateLocale });
    if (calendarMode === 'year') return format(cursorDate, 'yyyy', { locale: dateLocale });
    if (isSameDay(period.start, period.end)) return format(period.start, 'EEEE, MMM d', { locale: dateLocale });
    return `${format(period.start, 'MMM d', { locale: dateLocale })} - ${format(period.end, 'MMM d, yyyy', { locale: dateLocale })}`;
  }, [calendarMode, cursorDate, dateLocale, period.end, period.start]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(task);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn });
    const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [cursorDate, weekStartsOn]);

  const rangeDays = useMemo(() => eachDayOfInterval(period), [period]);
  const visibleRangeDays = rangeDays.slice(0, 120);

  const movePeriod = (direction: -1 | 1) => {
    if (calendarMode === 'day') setCursorDate(addDays(cursorDate, direction));
    else if (calendarMode === 'twoDays') setCursorDate(addDays(cursorDate, direction * 2));
    else if (calendarMode === 'week') setCursorDate(addWeeks(cursorDate, direction));
    else if (calendarMode === 'year') setCursorDate(addYears(cursorDate, direction));
    else if (calendarMode === 'custom') {
      const days = Math.max(1, differenceInCalendarDays(period.end, period.start) + 1);
      const start = addDays(period.start, direction * days);
      const end = addDays(period.end, direction * days);
      setCursorDate(start);
      setCalendarRange({ start: dateInput(start), end: dateInput(end) });
    } else {
      setCursorDate(addMonths(cursorDate, direction));
    }
  };

  const renderTask = (task: Task) => {
    const status = calendarStatus(task, today);
    const meta = statusMeta[status];
    const Icon = meta.icon;
    const label = t(meta.labelKey);
    return (
      <button
        key={task.id}
        onClick={() => setOpenId(task.id)}
        title={task.title}
        aria-label={`${label}: ${task.title}`}
        className={clsx(
          'rounded-md border px-2 py-1 text-left text-xs leading-snug whitespace-normal break-words max-h-20 overflow-y-auto',
          meta.classes,
        )}
      >
        <span className="flex items-start gap-1.5">
          <Icon size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{task.title}</span>
        </span>
      </button>
    );
  };

  const renderDay = (day: Date, monthContext = false) => {
    const key = format(day, 'yyyy-MM-dd');
    const items = byDay.get(key) ?? [];
    const dayIsToday = isSameDay(day, today);
    return (
      <div
        key={key}
        className={clsx(
          'min-h-[112px] rounded-lg border p-2 text-xs flex flex-col gap-1.5',
          monthContext && !isSameMonth(day, cursorDate)
            ? 'bg-gray-50 text-gray-400 dark:bg-gray-900/30'
            : 'bg-white dark:bg-gray-900',
          dayIsToday ? 'border-brand ring-1 ring-brand/20' : 'border-gray-200 dark:border-gray-800',
        )}
      >
        <div className={clsx('font-medium flex items-center gap-1', dayIsToday && 'text-brand')}>
          <span>{format(day, monthContext ? 'd' : 'EEE d', { locale: dateLocale })}</span>
          {items.length > 0 && <span className="text-[10px] text-gray-400">({items.length})</span>}
        </div>
        {items.slice(0, 5).map(renderTask)}
        {items.length > 5 && <span className="text-gray-400">+{items.length - 5}</span>}
      </div>
    );
  };

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 h-[calc(100dvh-var(--app-header-height))] overflow-y-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => movePeriod(-1)} className="btn-ghost p-2" aria-label={t('calendar.prev')}>
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold flex-1 min-w-[220px] break-words">{rangeTitle}</h1>
        <button onClick={() => movePeriod(1)} className="btn-ghost p-2" aria-label={t('calendar.next')}>
          <ChevronRight size={18} />
        </button>
        <button onClick={() => setCursorDate(new Date())} className="btn-ghost text-sm">
          {t('calendar.today')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {modeOptions.map((mode) => (
          <button
            key={mode.value}
            aria-pressed={calendarMode === mode.value}
            onClick={() => setCalendarMode(mode.value)}
            className={clsx(
              'rounded-lg border px-3 py-2 text-sm font-medium',
              calendarMode === mode.value
                ? 'border-brand bg-brand text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-brand dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200',
            )}
          >
            {t(mode.labelKey)}
          </button>
        ))}
      </div>

      {calendarMode === 'custom' && (
        <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <label className="label" htmlFor="calendar-start">{t('calendar.startDate')}</label>
            <input
              id="calendar-start"
              type="date"
              className="input"
              value={calendarRange.start || dateInput(period.start)}
              onChange={(e) => setCalendarRange({ start: e.target.value, end: calendarRange.end || dateInput(period.end) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="calendar-end">{t('calendar.endDate')}</label>
            <input
              id="calendar-end"
              type="date"
              className="input"
              value={calendarRange.end || dateInput(period.end)}
              onChange={(e) => setCalendarRange({ start: calendarRange.start || dateInput(period.start), end: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.entries(statusMeta) as [CalendarStatus, typeof statusMeta[CalendarStatus]][]).map(([status, meta]) => (
          <div key={status} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-gray-800 dark:bg-gray-900">
            <span className={clsx('h-2.5 w-2.5 rounded-full', meta.dot)} aria-hidden="true" />
            {t(meta.labelKey)}
          </div>
        ))}
      </div>

      {calendarMode === 'year' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 12 }, (_, index) => {
            const monthDate = new Date(cursorDate.getFullYear(), index, 1);
            const monthTasks = tasks.filter((task) => task.dueDate && isSameYear(new Date(task.dueDate), monthDate) && new Date(task.dueDate).getMonth() === index);
            return (
              <button
                key={format(monthDate, 'yyyy-MM')}
                onClick={() => {
                  setCursorDate(monthDate);
                  setCalendarMode('month');
                }}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-brand dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex items-center gap-2 font-medium">
                  <CalendarDays size={16} className="text-brand" aria-hidden="true" />
                  {format(monthDate, 'MMMM', { locale: dateLocale })}
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(Object.keys(statusMeta) as CalendarStatus[]).map((status) => (
                    <span key={status} className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-950">
                      {monthTasks.filter((task) => calendarStatus(task, today) === status).length}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : calendarMode === 'month' ? (
        <>
          <div className="grid grid-cols-7 text-xs text-gray-500">
            {(weekStartsOn === 1 ? weekdayKeys.slice(1).concat(weekdayKeys[0]) : weekdayKeys).map((day) => (
              <div key={day} className="px-2">
                {t(day)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-1">
            {monthGridDays.map((day) => renderDay(day, true))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {visibleRangeDays.map((day) => renderDay(day))}
          </div>
          {rangeDays.length > visibleRangeDays.length && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t('calendar.longRange', { count: visibleRangeDays.length })}
            </p>
          )}
        </>
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title={t('calendar.task')} widthClass="max-w-xl">
        {openId && <TaskDetail taskId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}
