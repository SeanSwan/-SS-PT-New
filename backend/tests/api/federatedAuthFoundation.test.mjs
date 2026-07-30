/**
 * Federated authentication foundation contracts.
 *
 * Locks the fail-closed provider registry, single-use OAuth transaction state,
 * safe local return URLs, and the no-silent-link account takeover boundary.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPublicAuthProviders,
  getServerAuthProvider,
} from '../../config/authProviders.mjs';
import {
  consumeOAuthTransaction,
  createOAuthTransaction,
  normalizeAuthReturnUrl,
} from '../../services/auth/oauthStateService.mjs';
import { decideFederatedAccountAction } from '../../services/auth/federatedAccountService.mjs';
import { buildProviderAuthorizationUrl, validateOidcNonce } from '../../services/auth/oauthProviderClient.mjs';
import { serializeAuthUser } from '../../services/auth/authSessionService.mjs';
import { rateLimiter } from '../../middleware/authMiddleware.mjs';

const PROVIDER_ENV = [
  'AUTH_GOOGLE_ENABLED', 'GOOGLE_AUTH_CLIENT_ID', 'GOOGLE_AUTH_CLIENT_SECRET',
  'AUTH_APPLE_ENABLED', 'APPLE_AUTH_CLIENT_ID', 'APPLE_AUTH_CLIENT_SECRET',
  'AUTH_FACEBOOK_ENABLED', 'FACEBOOK_AUTH_CLIENT_ID', 'FACEBOOK_AUTH_CLIENT_SECRET',
  'AUTH_TIKTOK_ENABLED', 'TIKTOK_AUTH_CLIENT_KEY', 'TIKTOK_AUTH_CLIENT_SECRET',
];

afterEach(() => {
  PROVIDER_ENV.forEach((name) => vi.unstubAllEnvs(name));
  vi.unstubAllEnvs();
});

describe('auth limiter storage boundary', () => {
  it('keeps normal blocking behavior while bounding distinct client keys', () => {
    const limiter = rateLimiter({ windowMs: 60_000, max: 1, maxKeys: 1 });
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    limiter({ ip: '198.51.100.1' }, response, next);
    limiter({ ip: '198.51.100.1' }, response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(429);

    limiter({ ip: '198.51.100.2' }, response, next);
    limiter({ ip: '198.51.100.1' }, response, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
  it('expires stale keys and caps retained distinct-client state', () => {
    const source = readFileSync(new URL('../../middleware/authMiddleware.mjs', import.meta.url), 'utf8');
    const limiter = source.slice(source.indexOf('export const rateLimiter'));
    expect(limiter).toContain('maxKeys = 10_000');
    expect(limiter).toContain('requests.delete(storedKey)');
    expect(limiter).toContain('requests.size >= maxKeys');
  });
});

describe('federated callback security boundaries', () => {
  it('keeps completion credentials out of the query string and rechecks login eligibility', () => {
    const controller = readFileSync(new URL('../../controllers/federatedAuthController.mjs', import.meta.url), 'utf8');
    expect(controller).toContain('url.hash = fragment.toString()');
    expect(controller).toContain("user.accountStatus !== 'active'");
  });

  it('requires a current-password step-up before enrolling a persistent provider identity', () => {
    const controller = readFileSync(new URL('../../controllers/federatedAuthController.mjs', import.meta.url), 'utf8');
    const link = controller.slice(controller.indexOf('export async function startFederatedLink'),
      controller.indexOf('export async function completeFederatedCallback'));
    expect(link).toContain('request.body?.currentPassword');
    expect(link).toContain('user.checkPassword');
    expect(link).toContain('AUTH_STEP_UP_REQUIRED');
  });
});

describe('federated callback rejection order', () => {
  it('validates and consumes state before handling a provider-declined callback', () => {
    const controller = readFileSync(new URL('../../controllers/federatedAuthController.mjs', import.meta.url), 'utf8');
    const callback = controller.slice(controller.indexOf('export async function completeFederatedCallback'));
    expect(callback.indexOf('consumeOAuthTransaction')).toBeGreaterThan(-1);
    expect(callback.indexOf('consumeOAuthTransaction')).toBeLessThan(callback.indexOf('if (input.error)'));
  });
});
describe('federated route ownership', () => {
  it('mounts discovery, login start, dual-method callback, one-time exchange, and protected linking', () => {
    const routes = readFileSync(resolve(process.cwd(), 'routes/authRoutes.mjs'), 'utf8');
    const controller = readFileSync(resolve(process.cwd(), 'controllers/federatedAuthController.mjs'), 'utf8');

    expect(routes).toContain("router.get('/providers', listAuthProviders)");
    expect(routes).toContain("router.get('/oauth/:provider/start', startFederatedLogin)");
    expect(routes).toContain("router.get('/oauth/:provider/callback', completeFederatedCallback)");
    expect(routes).toContain("router.post('/oauth/:provider/callback', completeFederatedCallback)");
    expect(routes).toContain("router.post('/oauth/exchange', exchangeFederatedCompletion)");
    expect(routes).toContain("router.post('/oauth/:provider/link/start', protect, startFederatedLink)");
    expect(controller).toContain('storeOAuthCompletion');
    expect(controller).not.toMatch(/[?&](?:access_)?token=/);
  });
});
describe('auth provider registry', () => {
  it('publishes no social provider unless its flag and server credentials are present', () => {
    expect(getPublicAuthProviders()).toEqual([]);

    vi.stubEnv('AUTH_GOOGLE_ENABLED', 'true');
    expect(getPublicAuthProviders()).toEqual([]);

    vi.stubEnv('GOOGLE_AUTH_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_AUTH_CLIENT_SECRET', 'google-client-secret');
    expect(getPublicAuthProviders()).toEqual([
      { id: 'google', label: 'Google' },
    ]);
  });

  it('never exposes provider secrets through its public shape', () => {
    vi.stubEnv('AUTH_GOOGLE_ENABLED', 'true');
    vi.stubEnv('GOOGLE_AUTH_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_AUTH_CLIENT_SECRET', 'never-public');

    const publicProvider = getPublicAuthProviders()[0];
    expect(JSON.stringify(publicProvider)).not.toContain('never-public');
    expect(getServerAuthProvider('google').clientSecret).toBe('never-public');
  });
});

describe('provider bearer-token transport', () => {
  it('keeps the Facebook access token out of the request URL', () => {
    const source = readFileSync(new URL('../../services/auth/oauthProviderClient.mjs', import.meta.url), 'utf8');
    const facebook = source.slice(source.indexOf('async function facebookProfile'),
      source.indexOf('async function tiktokProfile'));
    expect(facebook).not.toContain("url.searchParams.set('access_token'");
    expect(facebook).toContain('Authorization: `Bearer ${tokens.access_token}`');
  });
});

describe('provider authorization requests', () => {
  it('uses code flow, state, nonce, and S256 PKCE without exposing the client secret', () => {
    vi.stubEnv('AUTH_GOOGLE_ENABLED', 'true');
    vi.stubEnv('GOOGLE_AUTH_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_AUTH_CLIENT_SECRET', 'never-in-url');
    const provider = getServerAuthProvider('google');
    const url = new URL(buildProviderAuthorizationUrl(provider, {
      state: 'state-token', nonce: 'nonce-token', codeChallenge: 'challenge-token',
    }));

    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-token');
    expect(url.searchParams.get('nonce')).toBe('nonce-token');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-token');
    expect(url.toString()).not.toContain('never-in-url');
  });
});
describe('OIDC replay protection', () => {
  it('requires the returned nonce to match the server-side transaction', () => {
    expect(() => validateOidcNonce({ nonce: 'expected' }, 'expected')).not.toThrow();
    expect(() => validateOidcNonce({ nonce: 'attacker' }, 'expected'))
      .toThrowError(expect.objectContaining({ code: 'PROVIDER_NONCE_INVALID' }));
    expect(() => validateOidcNonce({}, 'expected'))
      .toThrowError(expect.objectContaining({ code: 'PROVIDER_NONCE_INVALID' }));
  });
});
describe('OAuth transaction state', () => {
  const sessionRequest = () => ({
    session: {
      save(callback) { callback(); },
    },
  });

  it('stores state, nonce, and PKCE server-side and consumes each transaction once', async () => {
    const request = sessionRequest();
    const started = await createOAuthTransaction(request, {
      provider: 'google', returnUrl: '/user-dashboard/progress', mode: 'login',
    });

    expect(started.state).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(started.nonce).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(started.codeChallenge).toMatch(/^[A-Za-z0-9_-]{32,}$/);

    const consumed = await consumeOAuthTransaction(request, {
      provider: 'google', state: started.state,
    });
    expect(consumed.returnUrl).toBe('/user-dashboard/progress');
    await expect(consumeOAuthTransaction(request, {
      provider: 'google', state: started.state,
    })).rejects.toMatchObject({ code: 'OAUTH_STATE_INVALID' });
  });

  it('rejects mismatched state without consuming the valid transaction', async () => {
    const request = sessionRequest();
    const started = await createOAuthTransaction(request, {
      provider: 'google', returnUrl: '//evil.example', mode: 'login',
    });

    await expect(consumeOAuthTransaction(request, {
      provider: 'google', state: `${started.state}x`,
    })).rejects.toMatchObject({ code: 'OAUTH_STATE_INVALID' });
    expect((await consumeOAuthTransaction(request, {
      provider: 'google', state: started.state,
    })).returnUrl).toBe('/user-dashboard');
  });

  it('allows only local in-app return paths', () => {
    expect(normalizeAuthReturnUrl('/dashboard/client/overview?tab=progress')).toBe('/dashboard/client/overview?tab=progress');
    expect(normalizeAuthReturnUrl('https://evil.example/steal')).toBe('/user-dashboard');
    expect(normalizeAuthReturnUrl('//evil.example/steal')).toBe('/user-dashboard');
    expect(normalizeAuthReturnUrl('/\\evil.example')).toBe('/user-dashboard');
  });
});

describe('federated session response privacy', () => {
  it('returns the canonical user shape without password or refresh-token fields', () => {
    const serialized = serializeAuthUser({
      id: 9, firstName: 'Swan', lastName: 'Member', email: 'swan@example.test',
      username: 'swan-member', role: 'user', password: 'hash', refreshTokenHash: 'hash',
      isOnboardingComplete: false, availableSessions: 0,
    });
    expect(serialized).toMatchObject({ id: 9, role: 'user', isOnboardingComplete: false, availableSessions: 0 });
    expect(serialized).not.toHaveProperty('password');
    expect(serialized).not.toHaveProperty('refreshTokenHash');
  });
});
describe('federated account resolution policy', () => {
  it('logs in a known provider subject and never silently links by matching email', () => {
    expect(decideFederatedAccountAction({ identityUserId: 42 })).toEqual({ action: 'login', userId: 42 });
    expect(decideFederatedAccountAction({
      identityUserId: null, matchingEmailUserId: 7, email: 'member@example.test', emailVerified: true,
    })).toEqual({ action: 'link_required', userId: 7 });
  });

  it('creates only from a verified provider email', () => {
    expect(decideFederatedAccountAction({
      identityUserId: null, matchingEmailUserId: null, email: 'new@example.test', emailVerified: true,
    })).toEqual({ action: 'create' });
    expect(decideFederatedAccountAction({
      identityUserId: null, matchingEmailUserId: null, email: 'new@example.test', emailVerified: false,
    })).toEqual({ action: 'reject', code: 'PROVIDER_EMAIL_UNVERIFIED' });
    expect(decideFederatedAccountAction({
      identityUserId: null, matchingEmailUserId: null, email: null, emailVerified: false,
    })).toEqual({ action: 'reject', code: 'PROVIDER_EMAIL_REQUIRED' });
  });
});