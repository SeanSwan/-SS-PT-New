import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnhancedLoginModal from './EnhancedLoginModal';
import { PASSWORD_POLICY_COPY } from './activationPasswordPolicy';

const loginMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const checkConnectionMock = vi.hoisted(() => vi.fn());
const forceChangePasswordMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock('../context/ThemeContext', () => ({
  useUniversalTheme: () => ({
    theme: 'crystalline-dark',
  }),
}));

vi.mock('../services/api.service', () => ({
  default: {
    checkConnection: checkConnectionMock,
    forceChangePassword: forceChangePasswordMock,
  },
}));

vi.mock('../layouts/AuthLayout', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../config/videoAssets', () => ({
  VIDEO: {
    waves: '/test-waves.mp4',
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

const theme = {
  background: {
    surface: '#141419',
    elevated: '#1A1A24',
  },
  borders: {
    subtle: 'rgba(224, 236, 244, 0.18)',
    elegant: 'rgba(96, 192, 240, 0.55)',
  },
  shadows: {
    elevation: '0 16px 40px rgba(0, 0, 0, 0.35)',
    cosmic: '0 0 28px rgba(96, 192, 240, 0.28)',
    primary: '0 0 18px rgba(96, 192, 240, 0.35)',
  },
  colors: {
    primary: '#60C0F0',
    primaryLight: '#8B5CF6',
    accent: '#C6A84B',
    white: '#FFFFFF',
  },
  gradients: {
    cosmic: 'linear-gradient(135deg, #002060, #141419)',
    stellar: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    primary: 'linear-gradient(135deg, #002060, #8B5CF6)',
  },
  text: {
    primary: '#E0ECF4',
    secondary: '#C7D7E5',
    muted: '#A8B6C7',
  },
};

function renderLoginModal() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <EnhancedLoginModal />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('EnhancedLoginModal force-password-change flow', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
    checkConnectionMock.mockReset();
    forceChangePasswordMock.mockReset();
    checkConnectionMock.mockResolvedValue(true);
  });

  it('switches to a policy-gated password reset form when login requires forcePasswordChange', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({ success: true, forcePasswordChange: true, tempToken: 'temp-reset-token' });
    forceChangePasswordMock.mockResolvedValue({ success: false });

    renderLoginModal();

    await user.type(screen.getByPlaceholderText(/username or email/i), 'client@example.test');
    await user.type(screen.getByPlaceholderText(/^password$/i), 'OldTemporary123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(loginMock).toHaveBeenCalledWith('client@example.test', 'OldTemporary123!');
    expect(await screen.findByRole('heading', { name: /set your new password/i })).toBeInTheDocument();
    expect(screen.getByText(PASSWORD_POLICY_COPY)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/^new password$/i), 'weak');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'weak');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(forceChangePasswordMock).not.toHaveBeenCalled();

    await user.clear(screen.getByPlaceholderText(/^new password$/i));
    await user.clear(screen.getByPlaceholderText(/confirm new password/i));
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'NewSecurePassword123!');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'NewSecurePassword123!');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    await waitFor(() => {
      expect(forceChangePasswordMock).toHaveBeenCalledWith('temp-reset-token', 'NewSecurePassword123!');
    });
  });
});