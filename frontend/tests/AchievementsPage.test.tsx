import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AchievementsPage from '../src/pages/AchievementsPage';
import { useUiStore } from '../src/store/ui';

const achievementsMock = vi.fn();
const pointsMock = vi.fn();

vi.mock('../src/api/tasks', () => ({
  usersApi: {
    achievements: (...args: unknown[]) => achievementsMock(...args),
    points: (...args: unknown[]) => pointsMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AchievementsPage />
    </QueryClientProvider>,
  );
};

describe('AchievementsPage', () => {
  beforeEach(() => {
    useUiStore.setState({ language: 'ru' });
    achievementsMock.mockResolvedValue([
      {
        id: 'a1',
        badge: 'first_task',
        title: 'Первая задача',
        description: 'Выполнил первую задачу',
        points: 10,
        unlockedAt: '2026-04-22T10:00:00Z',
      },
    ]);
    pointsMock.mockResolvedValue({ points: 25 });
  });

  it('renders localized earned achievements and points', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Достижения' })).toBeInTheDocument();
    expect(await screen.findByText('25')).toBeInTheDocument();
    expect(await screen.findByText('Первая задача')).toBeInTheDocument();
    expect(screen.getByText('Выполнил первую задачу')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });
});
