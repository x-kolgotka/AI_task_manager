import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantPage from '../src/pages/AssistantPage';
import { useUiStore } from '../src/store/ui';

const patternsMock = vi.fn();
const coachMock = vi.fn();
const weeklyReportMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  aiApi: {
    patterns: (...args: unknown[]) => patternsMock(...args),
    coach: (...args: unknown[]) => coachMock(...args),
    weeklyReport: (...args: unknown[]) => weeklyReportMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AssistantPage />
    </QueryClientProvider>,
  );
};

describe('AssistantPage', () => {
  beforeEach(() => {
    useUiStore.setState({ language: 'ru' });
    patternsMock.mockResolvedValue({
      patterns: [{ category: 'backend_api', avgHours: 2.5, count: 4 }],
      insights: ['Лучше планировать утром'],
      prediction: { hours: 2, confidence: 0.8 },
    });
    coachMock.mockResolvedValue({
      insights: [{ type: 'estimation_error', message: 'Оценки завышены', recommendation: 'Сократить на 15%' }],
    });
    weeklyReportMock.mockResolvedValue({
      summary: { done: 3, inProgress: 2, todo: 5, topTasks: [] },
      recommendations: ['Закрыть срочные задачи'],
    });
  });

  it('localizes report labels and hides technical field names', async () => {
    renderPage();

    expect(await screen.findByText('Готово')).toBeInTheDocument();
    expect(screen.getByText('В процессе')).toBeInTheDocument();
    expect(screen.getByText('К выполнению')).toBeInTheDocument();
    expect(screen.getByText('Backend API')).toBeInTheDocument();
    expect(screen.queryByText('done')).not.toBeInTheDocument();
    expect(screen.queryByText('inProgress')).not.toBeInTheDocument();
    expect(screen.queryByText('backend_api')).not.toBeInTheDocument();
  });
});
