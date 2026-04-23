import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../src/pages/SettingsPage';
import { useUiStore } from '../src/store/ui';

describe('SettingsPage', () => {
  beforeEach(() => {
    useUiStore.setState({
      theme: 'light',
      language: 'en',
      interfaceSize: 'md',
      density: 'comfortable',
      timeFormat: '24h',
      weekStart: 'mon',
      emailNotify: true,
      colorScheme: 'blue',
      compact: false,
    });
    document.documentElement.style.removeProperty('--color-brand');
    document.documentElement.style.removeProperty('--color-brand-hover');
  });

  it('uses custom controls and applies language/accent settings', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email notifications')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'System' }));
    await userEvent.click(screen.getByRole('button', { name: 'Large' }));
    await userEvent.click(screen.getByRole('button', { name: 'Compact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    await userEvent.click(screen.getByRole('button', { name: 'Accent color Green' }));
    await userEvent.click(screen.getByRole('button', { name: 'Русский' }));

    const state = useUiStore.getState();
    expect(state.theme).toBe('system');
    expect(state.language).toBe('ru');
    expect(state.interfaceSize).toBe('lg');
    expect(state.density).toBe('compact');
    expect(state.weekStart).toBe('sun');
    expect(state.colorScheme).toBe('green');
    expect(document.documentElement.style.getPropertyValue('--color-brand')).toBe('22 163 74');
    expect(screen.getByRole('button', { name: 'Акцентный цвет Зеленый' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument();
    expect(screen.getByText('Интерфейс')).toBeInTheDocument();
  });
});
