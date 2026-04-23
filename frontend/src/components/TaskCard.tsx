import { Task } from '@/types';
import { priorityColor } from '@/utils/format';
import { Calendar, CheckSquare } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es as esLocale, ru } from 'date-fns/locale';
import { Language, useUiStore } from '@/store/ui';

const dateLocales = {
  en: enUS,
  ru,
  es: esLocale,
} satisfies Record<Language, Locale>;

export default function TaskCard({
  task,
  onClick,
  selected,
  compact,
}: {
  task: Task;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}) {
  const language = useUiStore((s) => s.language);
  const dateLocale = dateLocales[language];
  const totalSub = task.subtasks?.length ?? 0;
  const doneSub = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const pct = totalSub ? Math.round((doneSub / totalSub) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'card text-left w-full transition hover:shadow-md cursor-pointer flex flex-col gap-2',
        selected && 'ring-2 ring-brand',
        compact && 'py-2',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={clsx(
            'text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wide font-semibold',
            priorityColor(task.priority),
          )}
        >
          {task.priority}
        </span>
        <h3 className="font-medium flex-1 break-words whitespace-normal max-h-20 overflow-y-auto" title={task.title}>
          {task.title}
        </h3>
      </div>
      {!compact && task.description && (
        <p className="text-sm text-gray-500 break-words whitespace-pre-wrap max-h-24 overflow-y-auto" title={task.description}>
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
        {task.dueDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} aria-hidden="true" /> {format(new Date(task.dueDate), 'MMM d', { locale: dateLocale })}
          </span>
        )}
        {totalSub > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare size={12} aria-hidden="true" /> {doneSub}/{totalSub}
          </span>
        )}
        {totalSub > 0 && (
          <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden max-w-[60px]">
            <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}
