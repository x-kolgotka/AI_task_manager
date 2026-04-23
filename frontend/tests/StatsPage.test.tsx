import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatsPage from '../src/pages/StatsPage';
import { useUiStore } from '../src/store/ui';

const listMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  tasksApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <StatsPage />
    </QueryClientProvider>,
  );
};

describe('StatsPage', () => {
  beforeEach(() => {
    useUiStore.setState({ language: 'ru' });
    listMock.mockResolvedValue({ tasks: [] });
  });

  it('localizes dashboard labels', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Статистика' })).toBeInTheDocument();
    expect(screen.getByText('Всего')).toBeInTheDocument();
    expect(screen.getByText('Готово сегодня')).toBeInTheDocument();
    expect(screen.getByText('Последние 7 дней - выполненные задачи')).toBeInTheDocument();
  });
});
