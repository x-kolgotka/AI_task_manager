import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tasksApi } from '@/api/tasks';
import Modal from '@/components/Modal';
import TaskDetail from '@/components/TaskDetail';
import { priorityColor } from '@/utils/format';
import clsx from 'clsx';

export default function CalendarPage() {
  const { data } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => tasksApi.list() });
  const [month, setMonth] = useState(new Date());
  const [openId, setOpenId] = useState<string | null>(null);

  const tasks = data?.tasks ?? [];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const k = format(new Date(t.dueDate), 'yyyy-MM-dd');
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    });
    return map;
  }, [tasks]);

  return (
    <div className="p-4 pb-20 md:pb-4 h-[calc(100vh-57px)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setMonth(subMonths(month, 1))} className="btn-ghost p-2" aria-label="Prev">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold flex-1">{format(month, 'MMMM yyyy')}</h1>
        <button onClick={() => setMonth(addMonths(month, 1))} className="btn-ghost p-2" aria-label="Next">
          <ChevronRight size={18} />
        </button>
        <button onClick={() => setMonth(new Date())} className="btn-ghost text-sm">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="px-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const items = byDay.get(key) ?? [];
          const today = isSameDay(d, new Date());
          return (
            <div
              key={key}
              className={clsx(
                'min-h-[90px] p-1.5 rounded-lg border text-xs flex flex-col gap-1',
                isSameMonth(d, month) ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900/30 text-gray-400',
                today ? 'border-brand' : 'border-gray-200 dark:border-gray-800',
              )}
            >
              <div className={clsx('font-medium', today && 'text-brand')}>{format(d, 'd')}</div>
              {items.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className={clsx('truncate rounded px-1.5 py-0.5 text-left border', priorityColor(t.priority))}
                >
                  {t.title}
                </button>
              ))}
              {items.length > 3 && <span className="text-gray-400">+{items.length - 3}</span>}
            </div>
          );
        })}
      </div>

      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Task" widthClass="max-w-xl">
        {openId && <TaskDetail taskId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}
