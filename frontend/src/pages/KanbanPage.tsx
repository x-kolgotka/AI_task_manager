import { DragEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { Task, TaskStatus } from '@/types';
import TaskCard from '@/components/TaskCard';
import Modal from '@/components/Modal';
import TaskDetail from '@/components/TaskDetail';
import { statusLabel } from '@/utils/format';
import clsx from 'clsx';

const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export default function KanbanPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => tasksApi.list() });
  const tasks = data?.tasks ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleDrop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    if (dragId) {
      moveMut.mutate({ id: dragId, status });
      setDragId(null);
    }
  };

  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  tasks.forEach((t) => grouped[t.status].push(t));

  return (
    <div className="p-4 pb-20 md:pb-4 h-[calc(100vh-57px)] overflow-y-auto">
      <h1 className="text-xl font-semibold mb-4">Kanban</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div
            key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop(col)}
            className={clsx(
              'card min-h-[200px] flex flex-col gap-2 bg-gray-50 dark:bg-gray-900/50',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">{statusLabel(col)}</h2>
              <span className="text-xs text-gray-500">{grouped[col].length}</span>
            </div>
            {grouped[col].map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => setDragId(null)}
              >
                <TaskCard task={t} compact onClick={() => setOpenId(t.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Task" widthClass="max-w-xl">
        {openId && <TaskDetail taskId={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}
