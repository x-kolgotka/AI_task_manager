import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Trash2, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi, tasksApi } from '@/api/tasks';
import { Priority, Task, TaskStatus } from '@/types';
import SubtaskList from './SubtaskList';
import AiSplitDialog from './AiSplitDialog';
import { priorityColor, statusLabel } from '@/utils/format';
import clsx from 'clsx';

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [aiOpen, setAiOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId),
  });
  const task = data?.task;

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
      toast.success('Task deleted');
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
      <div className="p-6 text-sm text-gray-500">Loading…</div>
    );
  }

  return (
    <div className="p-5 space-y-4 h-full overflow-y-auto">
      <div className="flex items-start gap-2">
        <h2 className="text-xl font-semibold flex-1">{task.title}</h2>
        <button onClick={() => delMut.mutate()} className="btn-ghost p-2 text-red-500" aria-label="Delete">
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
            {statusLabel(s)}
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
            {p}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[96px]"
          defaultValue={task.description ?? ''}
          onBlur={(e) => {
            if (e.target.value !== (task.description ?? '')) {
              updateMut.mutate({ description: e.target.value || null });
            }
          }}
          maxLength={5000}
        />
      </div>

      <div>
        <label className="label">Due date</label>
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
          <Sparkles size={16} /> Split with AI
        </button>
        <button
          onClick={() => estimateMut.mutate()}
          disabled={estimateMut.isPending}
          className="btn-ghost border border-gray-200 flex-1 sm:flex-none"
        >
          <Timer size={16} /> {estimateMut.isPending ? 'Estimating…' : 'Estimate time'}
        </button>
      </div>

      <div>
        <h3 className="font-medium mb-2">Subtasks</h3>
        <SubtaskList taskId={task.id} subtasks={task.subtasks ?? []} />
      </div>

      <AiSplitDialog open={aiOpen} onClose={() => setAiOpen(false)} task={task} />
    </div>
  );
}
