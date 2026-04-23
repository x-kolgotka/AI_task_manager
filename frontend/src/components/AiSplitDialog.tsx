import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi, subtasksApi } from '@/api/tasks';
import Modal from './Modal';
import { Task } from '@/types';
import { useT } from '@/i18n';

type Suggestion = { title: string; description?: string; estimateHours?: number };

export default function AiSplitDialog({
  open,
  onClose,
  task,
}: {
  open: boolean;
  onClose: () => void;
  task: Task;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loaded, setLoaded] = useState(false);

  const splitMut = useMutation({
    mutationFn: () => aiApi.split({ taskId: task.id, apply: false }),
    onSuccess: (r) => {
      setItems(r.subtasks);
      setLoaded(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const applyMut = useMutation({
    mutationFn: async () => {
      for (const s of items) {
        await subtasksApi.create(task.id, {
          title: s.title.slice(0, 200),
          estimateHours: typeof s.estimateHours === 'number' ? s.estimateHours : undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(t('ai.subtasksAdded'));
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', task.id] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const run = () => splitMut.mutate();

  return (
    <Modal open={open} onClose={onClose} title={t('ai.splitTitle')} widthClass="max-w-3xl">
      {!loaded ? (
        <div className="text-center py-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-ai">
            <Sparkles size={20} />
            <span className="font-medium">{task.title}</span>
          </div>
          <p className="text-sm text-gray-500">{t('ai.splitDescription')}</p>
          <button onClick={run} className="btn-ai" disabled={splitMut.isPending}>
            {splitMut.isPending ? t('ai.thinking') : t('ai.generateSubtasks')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {items.map((s, i) => (
              <li key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                <label className="sr-only" htmlFor={`split-title-${i}`}>
                  {t('ai.splitTitle')} {i + 1}
                </label>
                <textarea
                  id={`split-title-${i}`}
                  className="input textarea-auto flex-1 min-h-[48px]"
                  rows={Math.max(1, Math.ceil(s.title.length / 60))}
                  value={s.title}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...s, title: e.target.value };
                    setItems(next);
                  }}
                />
                <div className="flex gap-2 items-start">
                  <label className="sr-only" htmlFor={`split-hours-${i}`}>hours</label>
                  <input
                    id={`split-hours-${i}`}
                    className="input w-24"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="h"
                    value={s.estimateHours ?? ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = {
                        ...s,
                        estimateHours: e.target.value === '' ? undefined : Number(e.target.value),
                      };
                      setItems(next);
                    }}
                  />
                  <button
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                    className="btn-ghost p-2 shrink-0"
                    aria-label={t('ai.remove')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setItems([...items, { title: '' }])}
            className="btn-ghost w-full"
          >
            <Plus size={16} /> {t('ai.addRow')}
          </button>
          <div className="flex gap-2 pt-2">
            <button onClick={run} className="btn-ghost flex-1" disabled={splitMut.isPending}>
              <RefreshCw size={16} /> {t('ai.tryAgain')}
            </button>
            <button
              onClick={() => applyMut.mutate()}
              className="btn-primary flex-1"
              disabled={applyMut.isPending || items.length === 0}
            >
              {applyMut.isPending ? t('ai.saving') : t('ai.apply', { count: items.length })}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
