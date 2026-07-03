/**
 * EnhancedLoginModal claim handoff — Slice 12 tests
 * =================================================
 * Locks: a freshly claimed account arriving at /login?username=&claimed=1
 * gets the username prefilled and an activation welcome; a plain /login
 * visit shows neither. Also locks the ClaimAccountPage handoff URL shape.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnhancedLoginModal from './EnhancedLoginModal';

const loginMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const checkConnectionMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, user: null, isAuthenticated: false }),
}));

vi.mock('../context/ThemeContext', () => ({
  useUniversalTheme: () => ({ theme: 'crystalline-dark' }),
}));

vi.mock('../services/api.service', () => ({
  default: { checkConnection: checkConnectionMock },
}));

vi.mock('../layouts/AuthLayout', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../config/videoAssets', () => ({ VIDEO: { waves: '/test-waves.mp4' } }));

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn() } }));

const theme = {
  background: { surface: '#141419', elevated: '#1A1A24' },
  borders: { subtle: 'rgba(224, 236, 244, 0.18)', elegant: 'rgba(96, 192, 240, 0.55)' },
  shadows: {
    elevation: '0 16px 40px rgba(0, 0, 0, 0.35)',
    cosmic: '0 0 28px rgba(96, 192, 240, 0.28)',
    primary: '0 0 18px rgba(96, 192, 240, 0.35)',
  },
  colors: { primary: '#60C0F0', primaryLight: '#8B5CF6', accent: '#C6A84B', white: '#FFFFFF' },
  gradients: {
    cosmic: 'linear-gradient(135deg, #002060, #141419)',
    stellar: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
    primary: 'linear-gradient(135deg, #002060, #8B5CF6)',
  },
  text: { primary: '#E0ECF4', secondary: '#C7D7E5', muted: '#A8B6C7' },
};

const renderAt = (path: string) => render(
  <ThemeProvider theme={theme as never}>
    <MemoryRouter initialEntries={[path]}>
      <EnhancedLoginModal />
    </MemoryRouter>
  </ThemeProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  checkConnectionMock.mockResolvedValue({ connected: true });
});

describe('EnhancedLoginModal claim handoff', () => {
  it('prefills the username and shows the activation welcome after a claim', async () => {
    renderAt('/login?username=swan-champion&claimed=1');
    expect(await screen.findByDisplayValue('swan-champion')).toBeInTheDocument();
    expect(
      screen.getByText(/Account activated .* welcome to SwanStudios! Log in with your new password\./),
    ).toBeInTheDocument();
  });

  it('plain /login shows no welcome and an empty username', async () => {
    renderAt('/login');
    expect(screen.queryByText(/Account activated/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('swan-champion')).not.toBeInTheDocument();
  });
});

describe('ClaimAccountPage handoff source contract', () => {
  it('routes the activated user to login with username + claimed params', () => {
    const source = readFileSync(resolve(__dirname, './ClaimAccountPage.tsx'), 'utf8');
    expect(source).toContain('/login?username=${encodeURIComponent(activatedUsername)}&claimed=1');
    expect(source).toContain("'/login?claimed=1'");
  });
});
