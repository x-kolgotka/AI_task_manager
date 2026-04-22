import { FormEvent, useState } from 'react';
import { Priority, Task, TaskStatus } from '@/types';

type Values = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
};

export default function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: {
  initial?: Partial<Task>;
  onSubmit: (v: Partial<Task>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [v, setV] = useState<Values>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: (initial?.status as TaskStatus) ?? 'TODO',
    priority: (initial?.priority as Priority) ?? 'MEDIUM',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: v.title,
      description: v.description || null,
      status: v.status,
      priority: v.priority,
      dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          required
          maxLength={200}
          autoFocus
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[96px] resize-y"
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          maxLength={5000}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as TaskStatus })}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={v.priority}
            onChange={(e) => setV({ ...v, priority: e.target.value as Priority })}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Due date</label>
        <input
          type="date"
          className="input"
          value={v.dueDate}
          onChange={(e) => setV({ ...v, dueDate: e.target.value })}
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
