import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiApi, tasksApi } from '@/api/tasks';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import Modal from '@/components/Modal';
import TaskDetail from '@/components/TaskDetail';
import { useUiStore } from '@/store/ui';
import clsx from 'clsx';

export default function TasksPage() {
  const qc = useQueryClient();
  const compact = useUiStore((s) => s.compact);
  const selectedId = useUiStore((s) => s.selectedTaskId);
  const select = useUiStore((s) => s.selectTask);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () =>
      tasksApi.list({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
  });

  const createMut = useMutation({
    mutationFn: (input: Partial<Task>) => tasksApi.create(input),
    onSuccess: (r) => {
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      select(r.task.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const prioritizeMut = useMutation({
    mutationFn: () => aiApi.prioritize(),
    onSuccess: async (r) => {
      await tasksApi.reorder(r.order);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Reordered by AI');
    },
    onError: (e) => toast.error(e.message),
  });

  const tasks = data?.tasks ?? [];
  const filters: (TaskStatus | 'ALL')[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-57px)] pb-16 md:pb-0">
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 bg-surface/95 dark:bg-gray-950/95 backdrop-blur px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold mr-auto">Tasks</h1>
          <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 text-xs">
            <Filter size={14} className="mx-1 text-gray-500" />
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={clsx(
                  'px-2.5 py-1 rounded-md',
                  statusFilter === f
                    ? 'bg-brand text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                {f === 'ALL' ? 'All' : f === 'TODO' ? 'To Do' : f === 'IN_PROGRESS' ? 'Doing' : 'Done'}
              </button>
            ))}
          </div>
          <button
            onClick={() => prioritizeMut.mutate()}
            disabled={prioritizeMut.isPending || tasks.length < 2}
            className="btn-ai hidden sm:inline-flex"
          >
            <Sparkles size={16} /> {prioritizeMut.isPending ? 'Sorting…' : 'AI prioritize'}
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary hidden sm:inline-flex">
            <Plus size={16} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p className="mb-4">No tasks yet.</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={16} /> Create your first task
              </button>
            </div>
          ) : (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                selected={selectedId === t.id}
                compact={compact}
                onClick={() => select(t.id)}
              />
            ))
          )}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="sm:hidden fixed bottom-20 right-4 bg-brand hover:bg-brand-hover text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center z-10"
          aria-label="New task"
        >
          <Plus size={24} />
        </button>
      </section>

      {selectedId && (
        <aside className="hidden lg:block w-[400px] shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <TaskDetail taskId={selectedId} onClose={() => select(null)} />
        </aside>
      )}

      {selectedId && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => select(null)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskDetail taskId={selectedId} onClose={() => select(null)} />
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <TaskForm
          onSubmit={async (v) => {
            await createMut.mutateAsync(v);
          }}
          onCancel={() => setCreateOpen(false)}
          submitLabel={createMut.isPending ? 'Creating…' : 'Create'}
        />
      </Modal>
    </div>
  );
}
