import { describe, expect, it } from 'vitest';
import {
  buildCommandLogAccessHandoff,
  buildCommandResultAccessHandoff,
  commandLogAccessHandoffAttachment,
  commandLogAccessHandoffDescription,
  commandLogAccessHandoffIntro,
} from './CoachCommandCenter.accessHandoff';

describe('CoachCommandCenter access handoff helpers', () => {
  it('treats claim-code-only client creation results as usable access handoffs', () => {
    const handoff = buildCommandLogAccessHandoff({
      result: {
        client: { id: 88, firstName: 'Ava', lastName: 'Stone', clientSource: 'external' },
        claimCode: 'SWAN-CODE77',
      },
      createdName: 'Ava Stone',
      fallbackClientSource: 'external',
    });

    expect(handoff?.credentialMode).toBe('claim_link_ready');
    expect(handoff?.claimCode).toBe('SWAN-CODE77');
    expect(commandLogAccessHandoffDescription(handoff!)).toBe('Ava Stone: Share this claim link or code so the client can complete account access.');
    expect(commandLogAccessHandoffIntro(handoff)).toBe('Claim link is ready for client access handoff. ');
    expect(commandLogAccessHandoffAttachment(handoff)).toBe('claim link ready');
  });

  it('does not describe reset-link-needed handoffs as ready links', () => {
    const handoff = buildCommandLogAccessHandoff({
      result: {
        client: { id: 88, firstName: 'Ava', lastName: 'Stone', clientSource: 'swanstudios' },
        credentialMode: 'reset_link_needed',
      },
      createdName: 'Ava Stone',
      fallbackClientSource: 'swanstudios',
    });

    expect(handoff?.credentialMode).toBe('reset_link_needed');
    expect(commandLogAccessHandoffIntro(handoff)).toBe('Client access handoff needs review. ');
    expect(commandLogAccessHandoffAttachment(handoff)).toBe('access handoff review');
  });
  it('preserves reset-link-unavailable handoff issues for command-log copy', () => {
    const handoff = buildCommandLogAccessHandoff({
      result: {
        client: { id: 88, firstName: 'Ava', lastName: 'Stone', clientSource: 'swanstudios' },
        credentialAction: 'reset_link_needed',
        credentialIssue: 'reset_link_unavailable',
      },
      createdName: 'Ava Stone',
      fallbackClientSource: 'swanstudios',
    });

    expect(handoff?.credentialMode).toBe('reset_link_needed');
    expect(handoff?.credentialIssue).toBe('reset_link_unavailable');
    expect(commandLogAccessHandoffIntro(handoff)).toBe('Reset link could not be generated for client access handoff. ');
    expect(commandLogAccessHandoffAttachment(handoff)).toBe('reset link unavailable');
  });
  it('preserves backend reset-link-unavailable credential modes from reset commands', () => {
    const handoff = buildCommandResultAccessHandoff({
      command: 'reset_client_password',
      client: { firstName: 'Ava' },
      result: {
        credentialMode: 'reset_link_unavailable',
        resetEmailSent: false,
        emailSent: false,
      },
    });

    expect(handoff?.credentialMode).toBe('reset_link_unavailable');
    expect(commandLogAccessHandoffIntro(handoff)).toBe('Reset link could not be generated for client access handoff. ');
    expect(commandLogAccessHandoffAttachment(handoff)).toBe('reset link unavailable');
  });
  it('preserves backend reset-link-unavailable credential modes from client creation results', () => {
    const handoff = buildCommandLogAccessHandoff({
      result: {
        client: { id: 88, firstName: 'Ava', lastName: 'Stone', clientSource: 'swanstudios' },
        credentialMode: 'reset_link_unavailable',
      },
      createdName: 'Ava Stone',
      fallbackClientSource: 'swanstudios',
    });

    expect(handoff?.credentialMode).toBe('reset_link_unavailable');
    expect(handoff?.credentialIssue).toBe('reset_link_unavailable');
    expect(commandLogAccessHandoffIntro(handoff)).toBe('Reset link could not be generated for client access handoff. ');
    expect(commandLogAccessHandoffAttachment(handoff)).toBe('reset link unavailable');
  });
});
