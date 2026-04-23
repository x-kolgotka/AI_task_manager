import { FormEvent, useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { subtasksApi } from '@/api/tasks';
import { Subtask } from '@/types';
import { useT } from '@/i18n';

export default function SubtaskList({ taskId, subtasks }: { taskId: string; subtasks: Subtask[] }) {
  const t = useT();
  const inputId = useId();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['task', taskId] });
  };

  const createMut = useMutation({
    mutationFn: (t: string) => subtasksApi.create(taskId, { title: t }),
    onSuccess: () => {
      setTitle('');
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (s: Subtask) => subtasksApi.update(s.id, { completed: !s.completed }),
    onSuccess: invalidate,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => subtasksApi.remove(id),
    onSuccess: invalidate,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMut.mutate(title.trim());
  };

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-2">
      {total > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('subtasks.done', { done, total })}</span>
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li key={s.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={s.completed}
              onChange={() => toggleMut.mutate(s)}
              className="h-5 w-5 rounded accent-brand"
              aria-label={t('subtasks.toggle', { title: s.title })}
            />
            <span className={s.completed ? 'line-through text-gray-400 flex-1' : 'flex-1'}>
              {s.title}
              {s.estimateHours ? (
                <span className="text-xs text-gray-400 ml-2">~{s.estimateHours}h</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => delMut.mutate(s.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
              aria-label={t('subtasks.delete', { title: s.title })}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">{t('subtasks.newLabel')}</label>
        <input
          id={inputId}
          name="subtaskTitle"
          autoComplete="off"
          className="input flex-1"
          placeholder={t('subtasks.new')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn-ghost px-3" disabled={!title.trim()} aria-label={t('subtasks.add')}>
          <Plus size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
