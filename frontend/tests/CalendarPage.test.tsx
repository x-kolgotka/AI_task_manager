import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPage from '../src/pages/CalendarPage';
import { useUiStore } from '../src/store/ui';
import { Task } from '../src/types';

const listMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  tasksApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

const task = (patch: Partial<Task>): Task => ({
  id: patch.id ?? 'task-1',
  title: patch.title ?? 'Task',
  description: null,
  status: patch.status ?? 'TODO',
  priority: patch.priority ?? 'MEDIUM',
  dueDate: patch.dueDate ?? null,
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
      <CalendarPage />
    </QueryClientProvider>,
  );
};

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-04-22T12:00:00.000Z'));
    useUiStore.setState({ calendarMode: 'month', weekStart: 'mon', language: 'en', calendarRange: { start: '', end: '' } });
    listMock.mockResolvedValue({
      tasks: [
        task({ id: 'done', title: 'Done task', status: 'DONE', dueDate: '2026-04-22T00:00:00.000Z' }),
        task({ id: 'progress', title: 'Progress task', status: 'IN_PROGRESS', dueDate: '2026-04-24T00:00:00.000Z' }),
        task({ id: 'overdue', title: 'Overdue task', status: 'TODO', dueDate: '2026-04-10T00:00:00.000Z' }),
        task({ id: 'planned', title: 'Planned task with a deliberately long readable title', status: 'TODO', dueDate: '2026-04-28T00:00:00.000Z' }),
      ],
    });
  });

  it('shows status legend and readable status-coded tasks', async () => {
    renderPage();

    expect(await screen.findByText('Done task')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByTitle('Planned task with a deliberately long readable title')).toBeInTheDocument();
  });

  it('switches between calendar ranges and exposes custom dates', async () => {
    renderPage();

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
  });

  it('uses the saved first day of week setting in the month header', async () => {
    useUiStore.setState({ weekStart: 'sun' });
    renderPage();

    await screen.findByText('Done task');
    const sunday = screen.getByText('Sun');
    const monday = screen.getByText('Mon');
    expect(sunday.compareDocumentPosition(monday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('localizes calendar controls and status legend', async () => {
    useUiStore.setState({ language: 'ru' });
    renderPage();

    expect(await screen.findByText('Выполнено')).toBeInTheDocument();
    expect(screen.getByText('Просрочено')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Неделя' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument();
  });
});
