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
import { TranslationKey, useT } from '@/i18n';
import clsx from 'clsx';

const filterLabelKeys: Record<TaskStatus | 'ALL', TranslationKey> = {
  ALL: 'status.all',
  TODO: 'status.todo',
  IN_PROGRESS: 'status.doing',
  DONE: 'status.done',
};

export default function TasksPage() {
  const t = useT();
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

  const bulkImport = async (drafts: { title: string; status: string }[]) => {
    for (const d of drafts) {
      await tasksApi.create({ title: d.title, status: d.status as Task['status'], priority: 'MEDIUM' });
    }
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    toast.success(`${drafts.length} tasks imported`);
  };

  const prioritizeMut = useMutation({
    mutationFn: () => aiApi.prioritize(),
    onSuccess: async (r) => {
      await tasksApi.reorder(r.order);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(t('tasks.reordered'));
    },
    onError: (e) => toast.error(e.message),
  });

  const tasks = data?.tasks ?? [];
  const filters: (TaskStatus | 'ALL')[] = ['ALL', 'TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-var(--app-header-height))]">
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 bg-surface/95 dark:bg-gray-950/95 backdrop-blur px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 min-h-[56px]">
          <h1 className="text-xl font-semibold shrink-0">{t('tasks.title')}</h1>
          <div
            className="flex-1 min-w-0 overflow-x-auto scrollbar-none"
          >
            <div
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 text-xs"
              role="group"
              aria-label={t('tasks.filters')}
            >
              <Filter size={14} className="mx-1 text-gray-500 shrink-0" aria-hidden="true" />
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md whitespace-nowrap min-h-[32px]',
                    statusFilter === f
                      ? 'bg-brand text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  {t(filterLabelKeys[f])}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => prioritizeMut.mutate()}
            disabled={prioritizeMut.isPending || tasks.length < 2}
            className="btn-ai hidden sm:inline-flex"
          >
            <Sparkles size={16} aria-hidden="true" /> {prioritizeMut.isPending ? t('tasks.sorting') : t('tasks.aiPrioritize')}
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary hidden sm:inline-flex">
            <Plus size={16} aria-hidden="true" /> {t('tasks.new')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-[calc(var(--mobile-nav-height)+5rem)] md:pb-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p className="mb-4">{t('tasks.noTasks')}</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={16} aria-hidden="true" /> {t('tasks.createFirst')}
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
          className="sm:hidden fixed bottom-[calc(var(--mobile-nav-height)+1rem)] right-4 bg-brand hover:bg-brand-hover text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center z-10"
          aria-label={t('tasks.newTask')}
        >
          <Plus size={24} aria-hidden="true" />
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
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskDetail taskId={selectedId} onClose={() => select(null)} />
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('tasks.newTask')}>
        <TaskForm
          onSubmit={async (v) => { await createMut.mutateAsync(v); }}
          onCancel={() => setCreateOpen(false)}
          submitLabel={createMut.isPending ? t('tasks.creating') : t('tasks.create')}
          onBulkImport={bulkImport}
        />
      </Modal>
    </div>
  );
}
