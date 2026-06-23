/**
 * Admin owner gate tests.
 * Dangerous account-control actions must stay owner-only, not generic-admin.
 */
import { describe, expect, it } from 'vitest';

import {
  AdminOwnerGateError,
  getOwnerAdminAccess,
  isOwnerAdmin,
  requireOwnerAdmin,
} from '../../services/admin/adminOwnerGate.mjs';

describe('adminOwnerGate', () => {
  it('fails closed when no owner allowlist is configured', () => {
    expect(isOwnerAdmin({ id: 1, role: 'admin', email: 'sean@example.com' }, {})).toBe(false);
    expect(() => requireOwnerAdmin({ id: 1, role: 'admin', email: 'sean@example.com' }, {}))
      .toThrow(AdminOwnerGateError);
  });

  it('allows an admin whose email is explicitly allowlisted', () => {
    const env = { OWNER_ADMIN_EMAILS: ' sean@example.com, owner@example.com ' };
    expect(isOwnerAdmin({ id: 9, role: 'admin', email: 'SEAN@example.com' }, env)).toBe(true);
  });

  it('allows an admin whose id is explicitly allowlisted', () => {
    const env = { OWNER_ADMIN_IDS: '7, 12' };
    expect(isOwnerAdmin({ id: '12', role: 'admin', email: 'other@example.com' }, env)).toBe(true);
  });

  it('rejects allowlisted non-admin actors', () => {
    const env = { OWNER_ADMIN_EMAILS: 'trainer@example.com', OWNER_ADMIN_IDS: '3' };
    expect(isOwnerAdmin({ id: 3, role: 'trainer', email: 'trainer@example.com' }, env)).toBe(false);
  });

  it('reports owner-gate status without throwing so the dashboard can avoid noisy target fetches', () => {
    expect(getOwnerAdminAccess({ id: 1, role: 'admin', email: 'sean@example.com' }, {})).toEqual({
      configured: false,
      ownerAdmin: false,
      code: 'OWNER_GATE_NOT_CONFIGURED',
    });

    expect(getOwnerAdminAccess({ id: 2, role: 'admin', email: 'helper@example.com' }, { OWNER_ADMIN_IDS: '1' })).toEqual({
      configured: true,
      ownerAdmin: false,
      code: 'OWNER_GATE_DENIED',
    });

    expect(getOwnerAdminAccess({ id: 2, role: 'admin', email: 'owner@example.com' }, { OWNER_ADMIN_EMAILS: 'owner@example.com' }).code)
      .toBe('OWNER_GATE_ALLOWED');
  });
});
