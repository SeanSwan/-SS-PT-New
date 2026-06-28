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
});
