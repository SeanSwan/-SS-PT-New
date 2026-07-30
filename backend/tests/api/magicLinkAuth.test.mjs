import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const routesSource = fs.readFileSync(new URL('../../routes/authRoutes.mjs', import.meta.url), 'utf8');

const loadService = async () => import('../../services/auth/magicLinkService.mjs');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('magic-link route contract', () => {
  it('owns request and one-time exchange under the canonical auth router', () => {
    expect(routesSource).toContain("router.post('/magic-link/request'");
    expect(routesSource).toContain("router.post('/magic-link/exchange'");
  });
});

describe('magic-link capability gate', () => {
  it('is fail-closed unless the feature, email delivery, and secret are configured', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', '');
    vi.stubEnv('MAGIC_LINK_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');
    const { isMagicLinkEnabled } = await loadService();
    expect(isMagicLinkEnabled()).toBe(false);
  });
});

describe('magic-link token lifecycle', () => {
  it('rejects locked accounts at issuance and consumption', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { consumeMagicLink, issueMagicLink } = await loadService();
    const lockedUser = {
      id: 31, email: 'locked@example.test', isActive: true, isLocked: true, accountStatus: 'active',
    };
    const sendEmail = vi.fn();

    await expect(issueMagicLink(lockedUser.email, '/', {
      findUser: vi.fn().mockResolvedValue(lockedUser), sendEmail,
    })).resolves.toEqual({ accepted: true });
    expect(sendEmail).not.toHaveBeenCalled();
    await expect(consumeMagicLink('locked-token', {
      consumeToken: vi.fn().mockResolvedValue([{ userId: lockedUser.id }]),
      findUserById: vi.fn().mockResolvedValue(lockedUser),
    })).rejects.toMatchObject({ status: 401 });
  });

  it('cleans expired credentials before creating a replacement', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { issueMagicLink } = await loadService();
    const order = [];
    await issueMagicLink('person@example.test', '/', {
      findUser: vi.fn().mockResolvedValue({ id: 17, email: 'person@example.test', isActive: true }),
      cleanupExpiredTokens: vi.fn(async () => order.push('cleanup')),
      invalidateTokens: vi.fn(async () => order.push('invalidate')),
      createToken: vi.fn(async () => { order.push('create'); return { destroy: vi.fn() }; }),
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
      randomToken: () => 'raw-token-never-stored',
    });
    expect(order).toEqual(['cleanup', 'invalidate', 'create']);
  });

  it('does not wait for account-specific delivery work before returning the public response', () => {
    const controller = fs.readFileSync(new URL('../../controllers/magicLinkController.mjs', import.meta.url), 'utf8');
    expect(controller).toContain('void issueMagicLink(request.body.email, request.body.returnUrl)');
    expect(controller).not.toContain('await issueMagicLink(request.body.email, request.body.returnUrl)');
  });

  it('stores only a keyed hash and sends the raw token only inside an HTTPS fragment', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { issueMagicLink } = await loadService();
    const created = [];
    const sendEmail = vi.fn().mockResolvedValue({ success: true });
    const result = await issueMagicLink('Person@Example.com', '/progress', {
      findUser: vi.fn().mockResolvedValue({ id: 17, email: 'person@example.com', isActive: true }),
      cleanupExpiredTokens: vi.fn().mockResolvedValue(undefined),
      invalidateTokens: vi.fn().mockResolvedValue(undefined),
      createToken: vi.fn(async (record) => { created.push(record); return { destroy: vi.fn() }; }),
      sendEmail,
      frontendUrl: 'https://sswanstudios.com',
      now: () => 1700000000000,
      randomToken: () => 'raw-token-never-stored',
    });

    expect(result).toEqual({ accepted: true });
    expect(created[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created[0].tokenHash).not.toContain('raw-token-never-stored');
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'person@example.com',
      text: expect.stringContaining('https://sswanstudios.com/login#magic=raw-token-never-stored'),
    }));
  });

  it('returns the same accepted result for an unknown email without sending', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { issueMagicLink } = await loadService();
    const sendEmail = vi.fn();
    await expect(issueMagicLink('missing@example.com', '/', {
      findUser: vi.fn().mockResolvedValue(null), sendEmail,
    })).resolves.toEqual({ accepted: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not bypass an invited account activation handoff', async () => {
    vi.stubEnv('AUTH_MAGIC_LINK_ENABLED', 'true');
    vi.stubEnv('SENDGRID_API_KEY', 'SG.test');
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { issueMagicLink } = await loadService();
    const sendEmail = vi.fn();
    await expect(issueMagicLink('invited@example.com', '/', {
      findUser: vi.fn().mockResolvedValue({
        id: 44, email: 'invited@example.com', isActive: true, accountStatus: 'invited',
      }),
      sendEmail,
    })).resolves.toEqual({ accepted: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('atomically consumes a valid hash once and never accepts the raw token from storage', async () => {
    vi.stubEnv('MAGIC_LINK_SECRET', 'unit-test-magic-secret');
    const { consumeMagicLink, hashMagicLinkToken } = await loadService();
    const rawToken = 'one-time-token';
    const consumeToken = vi.fn().mockResolvedValue([{ userId: 22 }]);
    const user = { id: 22, isActive: true };
    await expect(consumeMagicLink(rawToken, {
      consumeToken,
      findUserById: vi.fn().mockResolvedValue(user),
      now: () => 1700000000000,
    })).resolves.toBe(user);
    expect(consumeToken).toHaveBeenCalledWith(hashMagicLinkToken(rawToken), new Date(1700000000000));
  });
});