import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KanbanPage from '../src/pages/KanbanPage';
import { useUiStore } from '../src/store/ui';
import { Task } from '../src/types';

const listMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  tasksApi: {
    list: (...args: unknown[]) => listMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

const task = (patch: Partial<Task>): Task => ({
  id: patch.id ?? 'task-1',
  title: patch.title ?? 'Task',
  description: null,
  status: patch.status ?? 'TODO',
  priority: patch.priority ?? 'MEDIUM',
  dueDate: null,
  tags: [],
  position: 1,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  subtasks: [],
});

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <KanbanPage />
    </QueryClientProvider>,
  );
};

describe('KanbanPage', () => {
  beforeEach(() => {
    useUiStore.setState({ language: 'ru' });
    listMock.mockResolvedValue({
      tasks: [task({ id: 'task-1', title: 'Перетащить меня', status: 'TODO' })],
    });
    updateMock.mockResolvedValue({ task: task({ id: 'task-1', status: 'DONE' }) });
  });

  it('moves a task to another column with drag and drop', async () => {
    renderPage();

    const taskCard = await screen.findByText('Перетащить меня');
    const doneColumn = screen.getByTestId('kanban-column-DONE');
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn((type: string, value: string) => data.set(type, value)),
      getData: vi.fn((type: string) => data.get(type) ?? ''),
    };

    fireEvent.dragStart(taskCard, { dataTransfer });
    fireEvent.dragOver(doneColumn, { dataTransfer });
    fireEvent.drop(doneColumn, { dataTransfer });

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('task-1', { status: 'DONE' }));
  });

  it('moves a task with touch pointer drag', async () => {
    renderPage();

    const taskCard = await screen.findByText('Перетащить меня');
    const doneColumn = screen.getByTestId('kanban-column-DONE');
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => doneColumn),
    });

    fireEvent.pointerDown(taskCard, { pointerId: 3, pointerType: 'touch', clientX: 20, clientY: 20 });
    fireEvent.pointerMove(taskCard, { pointerId: 3, pointerType: 'touch', clientX: 28, clientY: 44 });
    fireEvent.pointerUp(taskCard, { pointerId: 3, pointerType: 'touch', clientX: 28, clientY: 44 });

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('task-1', { status: 'DONE' }));
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: originalElementFromPoint,
    });
  });
});
