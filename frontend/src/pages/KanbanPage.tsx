import { DragEvent, PointerEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/TaskCard';
import Modal from '@/components/Modal';
import TaskDetail from '@/components/TaskDetail';
import { TranslationKey, useT } from '@/i18n';
import clsx from 'clsx';

const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const statusLabelKeys: Record<TaskStatus, TranslationKey> = {
  TODO: 'status.todo',
  IN_PROGRESS: 'status.inProgress',
  DONE: 'status.done',
};

export default function KanbanPage() {
  const t = useT();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => tasksApi.list() });
  const tasks = data?.tasks ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const pointerDrag = useRef<{ id: string; pointerId: number; startX: number; startY: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const moveTask = (id: string, status: TaskStatus) => {
    const current = tasks.find((task) => task.id === id);
    if (!current || current.status === status) return;
    moveMut.mutate({ id, status });
  };

  const handleDrop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) moveTask(id, status);
    setDragId(null);
  };

  const handlePointerDown = (id: string) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerDrag.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const state = pointerDrag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const distance = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
    if (distance < 10) return;
    state.active = true;
    suppressClick.current = true;
    setDragId(state.id);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const state = pointerDrag.current;
    pointerDrag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!state || state.pointerId !== e.pointerId || !state.active) return;
    const target = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const column = target instanceof Element ? target.closest<HTMLElement>('[data-kanban-status]') : null;
    const status = column?.dataset.kanbanStatus as TaskStatus | undefined;
    if (status) moveTask(state.id, status);
    setDragId(null);
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  tasks.forEach((t) => grouped[t.status].push(t));

  return (
    <div className="p-4 mobile-page-bottom md:pb-4 h-[calc(100dvh-var(--app-header-height))] overflow-y-auto">
      <h1 className="text-xl font-semibold mb-4">{t('kanban.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div
            key={col}
            data-testid={`kanban-column-${col}`}
            data-kanban-status={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop(col)}
            className={clsx(
              'card min-h-[200px] flex flex-col gap-2 bg-gray-50 transition-colors dark:bg-gray-900/50',
              dragId && 'ring-1 ring-brand/20',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">{t(statusLabelKeys[col])}</h2>
              <span className="text-xs text-gray-500">{grouped[col].length}</span>
            </div>
            {grouped[col].map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', t.id);
                  setDragId(t.id);
                }}
                onDragEnd={() => setDragId(null)}
                onPointerDown={handlePointerDown(t.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  pointerDrag.current = null;
                  setDragId(null);
                  suppressClick.current = false;
                }}
                className={clsx('touch-none rounded-lg', dragId === t.id && 'opacity-70')}
              >
                <TaskCard
                  task={t}
                  compact
                  onClick={() => {
                    if (suppressClick.current) return;
                    setOpenId(t.id);
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Modal open={!!openId} onClose={() => setOpenId(null)} title={t('calendar.task')} widthClass="max-w-xl">
        {openId && <TaskDetail taskId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}
