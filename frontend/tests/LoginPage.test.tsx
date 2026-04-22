import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../src/pages/LoginPage';

const loginMock = vi.fn();
vi.mock('../src/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('LoginPage', () => {
  beforeEach(() => loginMock.mockReset());

  it('submits phone + password', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', phone: '+12025551212', phoneVerified: true, fullName: null, avatarUrl: null, bio: null },
    });
    renderPage();
    await userEvent.type(screen.getByLabelText(/phone/i), '12025551212');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('+12025551212', 'secret12'));
  });
});
