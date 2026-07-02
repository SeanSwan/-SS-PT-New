import { describe, expect, it } from 'vitest';

import {
  getOnboardingAccessModalCopy,
  getOnboardingResetUrlToCopy,
  getOnboardingAccessMode,
  getOnboardingAccessStatusLabel,
} from './ClientOnboardingAccessHandoff';

describe('ClientOnboardingAccessHandoff', () => {
  it('recognizes credentialMode reset-link-ready handoffs for staff onboarding success copy', () => {
    const handoff = {
      credentialMode: 'reset_link_ready',
      resetUrl: 'https://sswanstudios.com/reset-password/raw-token',
      resetEmailSent: false,
    };

    expect(getOnboardingAccessMode(handoff)).toBe('reset_link_ready');
    expect(getOnboardingAccessStatusLabel(handoff)).toBe('Reset link ready to copy');
    expect(getOnboardingAccessModalCopy(handoff)).toBe(
      'Email delivery did not complete. Copy the secure one-hour reset link and send it directly to the client.',
    );
  });

  it('keeps reset-link-unavailable warning ahead of generic reset-link-needed copy', () => {
    const handoff = {
      credentialMode: 'reset_link_needed',
      credentialIssue: 'reset_link_unavailable',
      resetEmailSent: false,
    };

    expect(getOnboardingAccessMode(handoff)).toBe('reset_link_unavailable');
    expect(getOnboardingAccessStatusLabel(handoff)).toBe('Reset link unavailable');
    expect(getOnboardingAccessModalCopy(handoff)).toBe(
      'Reset link could not be generated. Return to Client Hub and use Send reset link after the account issue is resolved.',
    );
  });

  it('supports legacy credentialAction and resetEmailSent fallback states', () => {
    expect(getOnboardingAccessMode({ credentialAction: 'reset_link_sent' })).toBe('reset_link_sent');
    expect(getOnboardingAccessStatusLabel({ resetEmailSent: true })).toBe('Reset link sent');
    expect(getOnboardingAccessStatusLabel({ resetEmailSent: false })).toBe('Reset link needed');
    expect(getOnboardingAccessMode({ credentialMode: 'reset_link_unavailable' })).toBe('reset_link_unavailable');
  });
  it('does not expose stale reset URLs when the handoff is unavailable', () => {
    expect(getOnboardingResetUrlToCopy({
      credentialMode: 'reset_link_needed',
      credentialIssue: 'reset_link_unavailable',
      resetUrl: 'https://sswanstudios.com/reset-password/stale-token',
      resetEmailSent: false,
    })).toBeNull();
    expect(getOnboardingResetUrlToCopy({
      credentialMode: 'reset_link_unavailable',
      resetUrl: 'https://sswanstudios.com/reset-password/stale-token',
    })).toBeNull();
  });

  it('keeps reset URLs copyable only for sent or ready reset handoffs', () => {
    const resetUrl = 'https://sswanstudios.com/reset-password/raw-token';

    expect(getOnboardingResetUrlToCopy({ credentialMode: 'reset_link_ready', resetUrl })).toBe(resetUrl);
    expect(getOnboardingResetUrlToCopy({ credentialMode: 'reset_link_sent', resetUrl })).toBe(resetUrl);
    expect(getOnboardingResetUrlToCopy({ credentialMode: 'reset_link_needed', resetUrl })).toBeNull();
  });
});
