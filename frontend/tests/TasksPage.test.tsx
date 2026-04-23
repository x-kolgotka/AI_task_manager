import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TasksPage from '../src/pages/TasksPage';
import { useUiStore } from '../src/store/ui';

const listMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  tasksApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
  aiApi: {
    prioritize: vi.fn(),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TasksPage />
    </QueryClientProvider>,
  );
};

describe('TasksPage', () => {
  beforeEach(() => {
    useUiStore.setState({ language: 'ru', compact: false, selectedTaskId: null });
    listMock.mockResolvedValue({ tasks: [] });
  });

  it('localizes the task list controls and empty state', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Задачи' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'К выполнению' })).toBeInTheDocument();
    expect(screen.getByText('Задач пока нет.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать первую задачу' })).toBeInTheDocument();
    expect(screen.getByLabelText('Новая задача')).toBeInTheDocument();
  });
});
