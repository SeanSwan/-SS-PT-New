/**
 * Android/mobile login access regression tests.
 *
 * The production defect presented when Chrome's visual viewport shortened for
 * the software keyboard: the password control fell below the visible viewport
 * while the page-level login wrapper clipped overflow. These contracts protect
 * semantic input access and the viewport/scroll primitives used by the browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnhancedLoginModal from './EnhancedLoginModal';

const checkConnectionMock = vi.hoisted(() => vi.fn());
const providerPropsMock = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), user: null, isAuthenticated: false }),
}));
vi.mock('../context/ThemeContext', () => ({
  useUniversalTheme: () => ({ theme: 'crystalline-dark' }),
}));
vi.mock('../services/api.service', () => ({
  default: { checkConnection: checkConnectionMock },
}));
vi.mock('./EnhancedLoginProviders', () => ({
  default: (props: unknown) => { providerPropsMock(props); return null; },
}));
vi.mock('../layouts/AuthLayout', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../config/videoAssets', () => ({ VIDEO: { waves: '/test-waves.mp4' } }));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn() } }));

const theme = {
  background: { surface: '#141419', elevated: '#1A1A24' },
  borders: { subtle: '#4A5A6A', elegant: '#60C0F0' },
  shadows: { elevation: 'none', cosmic: 'none', primary: 'none' },
  colors: { primary: '#60C0F0', primaryLight: '#8B5CF6', accent: '#C6A84B', white: '#FFFFFF' },
  gradients: { cosmic: 'none', stellar: 'none', primary: 'none' },
  text: { primary: '#E0ECF4', secondary: '#C7D7E5', muted: '#A8B6C7' },
};

const renderLogin = (initialEntry = '/login') => render(
  <ThemeProvider theme={theme as never}>
    <MemoryRouter initialEntries={[initialEntry]}><EnhancedLoginModal /></MemoryRouter>
  </ThemeProvider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  checkConnectionMock.mockResolvedValue({ connected: true });
});

describe('EnhancedLoginModal mobile input access', () => {
  it('exposes labelled autofill-ready credentials and a touch-accessible password reveal', async () => {
    const user = userEvent.setup();
    renderLogin();

    const username = await screen.findByLabelText(/username or email/i);
    expect(username).toHaveAttribute('autocomplete', 'username');
    await user.type(username, 'person@example.test');
    expect(providerPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      identifier: 'person@example.test',
    }));
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute('autocomplete', 'current-password');

    await user.type(password, 'SwanSecret123!');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('keeps the page wrapper scrollable when the Android keyboard shortens the viewport', () => {
    const source = readFileSync(resolve(__dirname, 'EnhancedLoginModal.styles.ts'), 'utf8');
    const wrapper = source.match(/export const LoginContainer[\s\S]*?export const FormWrapper/)?.[0] ?? '';

    expect(wrapper).not.toContain('100vh');
    expect(wrapper).not.toMatch(/overflow:\s*hidden/);
  });

  it('forwards fragment credentials from the canonical login route and rejects control-character redirects', async () => {
    renderLogin('/login#magic=one-time-token&returnUrl=%2F%09%2Fattacker.example');
    expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
    expect(providerPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      magicToken: 'one-time-token', returnUrl: '/user-dashboard',
    }));
  });

  it('asks Chrome Android to resize content around its interactive keyboard', () => {    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    expect(html).toContain('interactive-widget=resizes-content');
  });
});