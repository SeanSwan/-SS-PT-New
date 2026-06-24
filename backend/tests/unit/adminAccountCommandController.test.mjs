/**
 * Admin account command controller compatibility tests.
 * Stale dashboard bundles can still call the target-list route directly.
 */
import { describe, expect, it } from 'vitest';

import { getAdminAccountCommandTargets } from '../../controllers/adminAccountCommandController.mjs';

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('adminAccountCommandController', () => {
  it('quietly returns no targets when owner allowlist is missing', async () => {
    const originalEmails = process.env.OWNER_ADMIN_EMAILS;
    const originalIds = process.env.OWNER_ADMIN_IDS;
    delete process.env.OWNER_ADMIN_EMAILS;
    delete process.env.OWNER_ADMIN_IDS;
    const res = createResponse();

    try {
      await getAdminAccountCommandTargets({
        user: { id: 2, role: 'admin', email: 'admin@example.test' },
        query: { limit: '50', status: 'all' },
      }, res);
    } finally {
      if (originalEmails === undefined) delete process.env.OWNER_ADMIN_EMAILS;
      else process.env.OWNER_ADMIN_EMAILS = originalEmails;
      if (originalIds === undefined) delete process.env.OWNER_ADMIN_IDS;
      else process.env.OWNER_ADMIN_IDS = originalIds;
    }

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      targets: [],
      accountControl: expect.objectContaining({
        configured: false,
        ownerAllowed: false,
        canListTargets: false,
        canRunCommands: false,
        code: 'OWNER_GATE_NOT_CONFIGURED',
      }),
    });
  });

  it('still denies target listing when owner allowlist is configured but actor is not allowed', async () => {
    const originalEmails = process.env.OWNER_ADMIN_EMAILS;
    const originalIds = process.env.OWNER_ADMIN_IDS;
    process.env.OWNER_ADMIN_EMAILS = '';
    process.env.OWNER_ADMIN_IDS = '1';
    const res = createResponse();

    try {
      await getAdminAccountCommandTargets({
        user: { id: 2, role: 'admin', email: 'admin@example.test' },
        query: { limit: '50', status: 'all' },
      }, res);
    } finally {
      if (originalEmails === undefined) delete process.env.OWNER_ADMIN_EMAILS;
      else process.env.OWNER_ADMIN_EMAILS = originalEmails;
      if (originalIds === undefined) delete process.env.OWNER_ADMIN_IDS;
      else process.env.OWNER_ADMIN_IDS = originalIds;
    }

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      code: 'OWNER_GATE_DENIED',
    }));
  });
});
