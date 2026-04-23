import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Trash2, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi, tasksApi } from '@/api/tasks';
import { Priority, Task, TaskStatus } from '@/types';
import SubtaskList from './SubtaskList';
import AiSplitDialog from './AiSplitDialog';
import { priorityColor } from '@/utils/format';
import { TranslationKey, useT } from '@/i18n';
import clsx from 'clsx';

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const statusLabelKeys: Record<TaskStatus, TranslationKey> = {
  TODO: 'status.todo',
  IN_PROGRESS: 'status.inProgress',
  DONE: 'status.done',
};

const priorityLabelKeys: Record<Priority, TranslationKey> = {
  LOW: 'priority.low',
  MEDIUM: 'priority.medium',
  HIGH: 'priority.high',
  URGENT: 'priority.urgent',
};

export default function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [aiOpen, setAiOpen] = useState(false);
  const [smartData, setSmartData] = useState<null | { smart: Record<string, string>; goal: string; dueDate: string | null }>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  });
  const task = data?.task;

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el || !task) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [task]);

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Task>) => tasksApi.update(taskId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => tasksApi.remove(taskId),
    onSuccess: () => {
      toast.success(t('task.deleted'));
      qc.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const estimateMut = useMutation({
    mutationFn: () => aiApi.estimate({ taskId }),
    onSuccess: (r) => toast.success(`AI: ~${r.hours}h (confidence ${Math.round(r.confidence * 100)}%)`),
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !task) {
    return (
      <div className="p-6 text-sm text-gray-500">{t('task.loading')}</div>
    );
  }

  return (
    <div className="p-5 space-y-4 h-full overflow-y-auto">
      <div className="flex items-start gap-2">
        <h2 className="text-xl font-semibold flex-1">{task.title}</h2>
        <button onClick={() => delMut.mutate()} className="btn-ghost p-2 text-red-500" aria-label={t('task.delete')}>
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => updateMut.mutate({ status: s })}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium border',
              task.status === s
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand',
            )}
          >
            {t(statusLabelKeys[s])}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {priorities.map((p) => (
          <button
            key={p}
            onClick={() => updateMut.mutate({ priority: p })}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium border uppercase',
              task.priority === p ? priorityColor(p) + ' ring-2 ring-offset-1' : 'bg-white border-gray-200 text-gray-500',
            )}
          >
            {t(priorityLabelKeys[p])}
          </button>
        ))}
      </div>

      <div>
        <label className="label">{t('task.description')}</label>
        <textarea
          ref={descriptionRef}
          className="input textarea-auto min-h-[112px]"
          defaultValue={task.description ?? ''}
          onBlur={(e) => {
            if (e.target.value !== (task.description ?? '')) {
              updateMut.mutate({ description: e.target.value || null });
            }
          }}
          maxLength={5000}
          title={task.description ?? ''}
        />
        {(task.description?.length ?? 0) > 180 && (
          <details className="long-preview">
            <summary className="cursor-pointer font-medium">{t('task.previewDescription')}</summary>
            <div className="mt-1">{task.description}</div>
          </details>
        )}
      </div>

      <div>
        <label className="label">{t('task.dueDate')}</label>
        <input
          type="date"
          className="input"
          defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
          onBlur={(e) => {
            const v = e.target.value ? new Date(e.target.value).toISOString() : null;
            if (v !== task.dueDate) updateMut.mutate({ dueDate: v });
          }}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setAiOpen(true)} className="btn-ai flex-1 sm:flex-none">
          <Sparkles size={16} /> {t('task.splitAi')}
        </button>
        <button
          onClick={() => estimateMut.mutate()}
          disabled={estimateMut.isPending}
          className="btn-ghost border border-gray-200 flex-1 sm:flex-none"
        >
          <Timer size={16} /> {estimateMut.isPending ? t('task.estimating') : t('task.estimateTime')}
        </button>
        <button
          onClick={async () => {
            setSmartLoading(true);
            try {
              const r = await aiApi.smartGoal(task.title, task.description ?? '');
              setSmartData(r);
            } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
            finally { setSmartLoading(false); }
          }}
          disabled={smartLoading}
          className="btn-ghost border border-gray-200 flex-1 sm:flex-none"
        >
          <Sparkles size={16} /> {smartLoading ? t('ai.parsing') : t('ai.smartGenerate')}
        </button>
      </div>

      {smartData && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 space-y-2 text-sm">
          <div className="font-semibold text-brand flex items-center gap-1"><Sparkles size={14} /> {t('ai.smartGoal')}</div>
          <p className="font-medium">{smartData.goal}</p>
          {Object.entries({
            specific: t('ai.smartSpecific'),
            measurable: t('ai.smartMeasurable'),
            achievable: t('ai.smartAchievable'),
            relevant: t('ai.smartRelevant'),
            timeBound: t('ai.smartTimeBound'),
          }).map(([key, label]) => (
            <div key={key}>
              <span className="font-medium text-xs text-gray-500 uppercase tracking-wide">{label}: </span>
              <span>{smartData.smart[key]}</span>
            </div>
          ))}
          {smartData.dueDate && (
            <button
              className="text-xs text-brand underline"
              onClick={() => { updateMut.mutate({ dueDate: new Date(smartData.dueDate!).toISOString() }); setSmartData(null); }}
            >
              {t('task.dueDate')}: {smartData.dueDate} →
            </button>
          )}
        </div>
      )}

      <div>
        <h3 className="font-medium mb-2">{t('task.subtasks')}</h3>
        <SubtaskList taskId={task.id} subtasks={task.subtasks ?? []} />
      </div>

      <AiSplitDialog open={aiOpen} onClose={() => setAiOpen(false)} task={task} />
    </div>
  );
}
