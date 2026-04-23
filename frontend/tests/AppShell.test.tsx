import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import AppShell from '../src/pages/AppShell';
import { useAuthStore } from '../src/store/auth';
import { useUiStore } from '../src/store/ui';

describe('AppShell', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', phone: '+12025551212', phoneVerified: true, totpEnabled: false, isPremium: false, fullName: null, avatarUrl: null, bio: null },
    });
    useUiStore.setState({ language: 'ru' });
  });

  it('localizes navigation labels', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Задачи')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Календарь')[0]).toBeInTheDocument();
    expect(screen.getByLabelText('Выйти')).toBeInTheDocument();
  });

  it('keeps core actions reachable from mobile bottom navigation', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );

    const mobileNav = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    expect(within(mobileNav).getByRole('link', { name: 'Задачи' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Календарь' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'AI ассистент' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
  });

  it('hides the top bar on scroll down and restores it on scroll up', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );

    const header = screen.getByTestId('app-header');
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
    fireEvent.scroll(window);
    expect(header).toHaveClass('max-md:-translate-y-full');

    Object.defineProperty(window, 'scrollY', { value: 40, configurable: true });
    fireEvent.scroll(window);
    expect(header).not.toHaveClass('max-md:-translate-y-full');
  });
});
