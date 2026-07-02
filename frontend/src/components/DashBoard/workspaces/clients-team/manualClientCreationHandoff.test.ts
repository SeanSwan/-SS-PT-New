import { describe, expect, it } from 'vitest';

import { buildManualClientCreationHandoff } from './manualClientCreationHandoff';
import type { CreateClientRequest } from '../../../../services/adminClientService';

const baseRequest: CreateClientRequest = {
  firstName: 'Move',
  lastName: 'Client',
  email: 'move.client@example.test',
  username: '',
  password: '',
  clientSource: 'move_fitness',
};

describe('manualClientCreationHandoff', () => {
  it('keeps Move Fitness clients on the claim-link path without exposing temporary passwords', () => {
    const handoff = buildManualClientCreationHandoff({
      data: baseRequest,
      resetEmailSent: null,
      response: {
        data: {
          client: {
            id: 42,
            firstName: 'Move',
            lastName: 'Client',
            email: 'move.client@example.test',
          },
          claimToken: 'SWAN-ABCD1234',
          claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD1234',
          temporaryPassword: 'NeverExpose123!',
        },
      },
    });

    expect(handoff).toMatchObject({
      clientId: '42',
      clientName: 'Move Client',
      clientEmail: 'move.client@example.test',
      clientSource: 'move_fitness',
      credentialMode: 'claim_link_ready',
      claimCode: 'SWAN-ABCD1234',
      claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD1234',
    });
    expect('temporaryPassword' in handoff).toBe(false);
    expect(JSON.stringify(handoff)).not.toContain('NeverExpose123!');
  });

  it('marks missing external claim links for review instead of pretending activation is ready', () => {
    const handoff = buildManualClientCreationHandoff({
      data: baseRequest,
      resetEmailSent: null,
      response: {
        data: {
          client: { id: 51, email: 'fallback@example.test' },
        },
      },
    });

    expect(handoff.credentialMode).toBe('claim_link_needed');
    expect(handoff.message).toMatch(/no claim link returned/i);
  });

  it('uses secure reset-link status for SwanStudios clients', () => {
    const handoff = buildManualClientCreationHandoff({
      data: {
        ...baseRequest,
        firstName: 'Swan',
        lastName: 'Client',
        email: 'swan.client@example.test',
        clientSource: 'swanstudios',
      },
      resetEmailSent: true,
      response: {
        data: {
          client: {
            id: '77',
            firstName: 'Swan',
            lastName: 'Client',
            email: 'swan.client@example.test',
          },
        },
      },
    });

    expect(handoff).toMatchObject({
      clientId: '77',
      clientName: 'Swan Client',
      clientSource: 'swanstudios',
      credentialMode: 'reset_link_sent',
      resetEmailSent: true,
    });
    expect(handoff.message).toMatch(/secure login link was sent to the client/i);
    expect(handoff.message).toMatch(/no password is shown/i);
    expect(handoff.message).not.toMatch(/copy link is also ready/i);
    expect(handoff.resetUrl).toBeUndefined();
  });
  it('marks SwanStudios clients as reset-link-ready when email fails but a reset URL is returned', () => {
    const handoff = buildManualClientCreationHandoff({
      data: {
        ...baseRequest,
        firstName: 'Manual',
        lastName: 'Fallback',
        email: 'manual.fallback@example.test',
        clientSource: 'swanstudios',
      },
      resetEmailSent: false,
      response: {
        data: {
          client: {
            id: '78',
            firstName: 'Manual',
            lastName: 'Fallback',
            email: 'manual.fallback@example.test',
          },
          resetUrl: 'https://sswanstudios.com/reset-password/raw-token',
          resetExpiresAt: '2026-07-01T00:00:00.000Z',
          expiresInMinutes: 60,
          temporaryPassword: 'NeverExpose123!',
        },
      },
    });

    expect(handoff).toMatchObject({
      clientId: '78',
      clientName: 'Manual Fallback',
      clientSource: 'swanstudios',
      credentialMode: 'reset_link_ready',
      resetEmailSent: false,
      resetUrl: 'https://sswanstudios.com/reset-password/raw-token',
      resetExpiresAt: '2026-07-01T00:00:00.000Z',
      resetExpiresInMinutes: 60,
    });
    expect(handoff.message).toMatch(/copy this one-hour reset link/i);
    expect(JSON.stringify(handoff)).not.toContain('NeverExpose123!');
  });
  it('marks SwanStudios clients as reset-link-unavailable when no reset URL can be generated', () => {
    const handoff = buildManualClientCreationHandoff({
      data: {
        ...baseRequest,
        firstName: 'No',
        lastName: 'Link',
        email: 'no.link@example.test',
        clientSource: 'swanstudios',
      },
      resetEmailSent: false,
      response: {
        data: {
          client: {
            id: '79',
            firstName: 'No',
            lastName: 'Link',
            email: 'no.link@example.test',
          },
          credentialAction: 'reset_link_needed',
          credentialIssue: 'reset_link_unavailable',
          temporaryPassword: 'NeverExpose123!',
        },
      },
    });

    expect(handoff).toMatchObject({
      clientId: '79',
      clientName: 'No Link',
      clientSource: 'swanstudios',
      credentialMode: 'reset_link_unavailable',
      credentialIssue: 'reset_link_unavailable',
      resetEmailSent: false,
    });
    expect(handoff.message).toMatch(/reset link could not be generated/i);
    expect(handoff.message).toMatch(/send reset link after the account issue is resolved/i);
    expect(handoff.resetUrl).toBeUndefined();
    expect(JSON.stringify(handoff)).not.toContain('NeverExpose123!');
  });
  it('honors backend credentialMode reset-link-unavailable without credentialIssue', () => {
    const handoff = buildManualClientCreationHandoff({
      data: {
        ...baseRequest,
        firstName: 'Mode',
        lastName: 'Only',
        email: 'mode.only@example.test',
        clientSource: 'swanstudios',
      },
      resetEmailSent: false,
      response: {
        data: {
          client: {
            id: '80',
            firstName: 'Mode',
            lastName: 'Only',
            email: 'mode.only@example.test',
          },
          credentialMode: 'reset_link_unavailable',
        },
      },
    });

    expect(handoff).toMatchObject({
      clientId: '80',
      credentialMode: 'reset_link_unavailable',
    });
    expect(handoff.message).toMatch(/reset link could not be generated/i);
  });
});
