/** Canonical server-driven login-method tests. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnhancedLoginProviders from './EnhancedLoginProviders';

const getAuthMethodsMock = vi.hoisted(() => vi.fn());
const startFederatedLoginMock = vi.hoisted(() => vi.fn());
const completeFederatedLoginMock = vi.hoisted(() => vi.fn());
const requestMagicLinkMock = vi.hoisted(() => vi.fn());
const completeMagicLinkMock = vi.hoisted(() => vi.fn());

vi.mock('../services/federatedAuthApi', () => ({
  default: {
    getAuthMethods: getAuthMethodsMock,
    startFederatedLogin: startFederatedLoginMock,
    completeFederatedLogin: completeFederatedLoginMock,
    requestMagicLink: requestMagicLinkMock,
    completeMagicLink: completeMagicLinkMock,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/login');
  getAuthMethodsMock.mockResolvedValue({
    emailPassword: true,
    magicLink: false,
    passkey: false,
    providers: [
      { id: 'google', label: 'Google' },
      { id: 'apple', label: 'Apple' },
      { id: 'facebook', label: 'Facebook' },
    ],
  });
});

describe('production API authentication handoff', () => {
  it('uses canonical endpoints and persists tokens only after a POST exchange', () => {
    const source = readFileSync(resolve(__dirname, '../services/federatedAuthApi.ts'), 'utf8');
    expect(source).toContain("this.client.get('/api/auth/providers')");
    expect(source).toContain("this.client.post('/api/auth/oauth/exchange', { exchange })");
    expect(source).toContain("this.client.post('/api/auth/magic-link/request'");
    expect(source).toContain("this.client.post('/api/auth/magic-link/exchange'");
    expect(source).toContain('ProductionTokenManager.setRefreshToken(result.refreshToken)');
    expect(source).toContain('/api/auth/oauth/${encodeURIComponent(provider)}/start');
  });
});

describe('EnhancedLoginProviders', () => {
  it('renders only server-enabled provider choices and no Instagram placeholder', async () => {
    render(<EnhancedLoginProviders returnUrl="/user-dashboard" onAuthenticated={vi.fn()} onError={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    expect(screen.queryByText(/instagram/i)).not.toBeInTheDocument();
  });

  it('starts the selected provider with the safe in-product return path', async () => {
    const user = userEvent.setup();
    render(<EnhancedLoginProviders returnUrl="/user-dashboard/progress" onAuthenticated={vi.fn()} onError={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /continue with google/i }));
    expect(startFederatedLoginMock).toHaveBeenCalledWith('google', '/user-dashboard/progress');
  });

  it('exchanges an opaque callback code and clears it from browser history first', async () => {
    window.history.replaceState({}, '', '/login?exchange=single-use-code&returnUrl=%2Fuser-dashboard');
    const onAuthenticated = vi.fn();
    completeFederatedLoginMock.mockResolvedValue({ user: { id: 8, role: 'user' } });
    render(<EnhancedLoginProviders exchange="single-use-code" returnUrl="/user-dashboard"
      onAuthenticated={onAuthenticated} onError={vi.fn()} />);
    await waitFor(() => expect(completeFederatedLoginMock).toHaveBeenCalledWith('single-use-code'));
    expect(window.location.search).toBe('');
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 8, role: 'user' }, '/user-dashboard');
  });

  it('offers an email sign-in link only when the server enables it', async () => {
    getAuthMethodsMock.mockResolvedValue({
      emailPassword: true, magicLink: true, passkey: false, providers: [],
    });
    requestMagicLinkMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<EnhancedLoginProviders identifier="person@example.com" returnUrl="/progress"
      onAuthenticated={vi.fn()} onError={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /email me a sign-in link/i }));
    expect(requestMagicLinkMock).toHaveBeenCalledWith('person@example.com', '/progress');
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it('exchanges a one-time magic token and clears it from the address bar', async () => {
    completeMagicLinkMock.mockResolvedValue({ user: { id: 9, role: 'client' } });
    const onAuthenticated = vi.fn();
    window.history.replaceState({}, '', '/login#magic=one-time-token&returnUrl=%2Fprogress');
    render(<EnhancedLoginProviders magicToken="one-time-token" returnUrl="/progress"
      onAuthenticated={onAuthenticated} onError={vi.fn()} />);
    await waitFor(() => expect(completeMagicLinkMock).toHaveBeenCalledWith('one-time-token'));
    expect(window.location.hash).toBe('');
    expect(onAuthenticated).toHaveBeenCalledWith({ id: 9, role: 'client' }, '/progress');
  });
});