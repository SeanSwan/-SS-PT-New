import { describe, expect, it, vi } from 'vitest';
import { buildClientOnboardAccessHandoff } from '../../services/clientOnboardAccessHandoffService.mjs';

describe('client onboard access handoff service', () => {
  it('keeps generated claim links as the preferred client access handoff', async () => {
    const expires = new Date('2026-06-30T10:00:00.000Z');
    const buildResetHandoff = vi.fn();

    const result = await buildClientOnboardAccessHandoff({
      user: { id: 41 },
      claimData: {
        plainToken: 'SWAN-ABCD1234',
        expires,
      },
      frontendUrl: 'https://app.example.test/',
      buildResetHandoff,
    });

    expect(buildResetHandoff).not.toHaveBeenCalled();
    expect(result).toEqual({
      credentialMode: 'claim_link_ready',
      claimCode: 'SWAN-ABCD1234',
      claimUrl: 'https://app.example.test/claim/SWAN-ABCD1234',
      claimExpiresAt: '2026-06-30T10:00:00.000Z',
    });
  });

  it('falls back to a reset-link handoff when no claim token is generated', async () => {
    const user = { id: 42 };
    const buildResetHandoff = vi.fn(async () => ({
      credentialAction: 'reset_link_ready',
      resetEmailSent: false,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-06-30T10:00:00.000Z',
      expiresInMinutes: 60,
    }));

    const result = await buildClientOnboardAccessHandoff({
      user,
      claimData: null,
      frontendUrl: 'https://app.example.test',
      buildResetHandoff,
    });

    expect(buildResetHandoff).toHaveBeenCalledWith(user);
    expect(result).toEqual({
      credentialMode: 'reset_link_ready',
      resetEmailSent: false,
      resetUrl: 'https://app.example.test/reset-password/raw-token',
      resetExpiresAt: '2026-06-30T10:00:00.000Z',
      expiresInMinutes: 60,
    });
  });

  it('preserves reset-link-unavailable context for no-claim failures', async () => {
    const buildResetHandoff = vi.fn(async () => ({
      credentialAction: 'reset_link_needed',
      resetEmailSent: false,
      credentialIssue: 'reset_link_unavailable',
    }));

    const result = await buildClientOnboardAccessHandoff({
      user: { id: 43 },
      claimData: null,
      frontendUrl: 'https://app.example.test',
      buildResetHandoff,
    });

    expect(result).toEqual({
      credentialMode: 'reset_link_unavailable',
      resetEmailSent: false,
      credentialIssue: 'reset_link_unavailable',
    });
  });
});