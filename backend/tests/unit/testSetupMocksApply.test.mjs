/**
 * ============================================================================
 * FILE: testSetupMocksApply.test.mjs
 * PURPOSE: Prove the global mocks in tests/setup.mjs actually apply.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-29
 * ============================================================================
 *
 * WHY THIS EXISTS
 * `vi.mock('<path>')` against a path that nothing imports — or that does not
 * exist — is SILENTLY INERT. vitest does not warn. So a global mock can sit in
 * setup.mjs for months, advertising a guarantee it never provided, and every test
 * keeps passing.
 *
 * That is exactly what happened: setup.mjs mocked
 * '../services/emailService.mjs', which does not exist. The real module is
 * backend/emailService.mjs (imported by services/notificationService.mjs and
 * utils/notification.mjs). Nothing broke only because the real sendEmail fails
 * closed with no transporter configured — "no SMTP creds in CI" was the only thing
 * standing between a test fixture's email address and a real send.
 *
 * These assertions are cheap and they fail loudly the moment a mocked path is
 * renamed or moved. Add a case here whenever setup.mjs gains a global mock.
 */

import { describe, it, expect } from 'vitest';

describe('tests/setup.mjs global mocks are actually in effect', () => {
  it('emailService is mocked — sendEmail never reaches a real transport', async () => {
    const { sendEmail } = await import('../../emailService.mjs');

    // The real implementation returns { success: false, error } when the
    // transporter is unconfigured. The mock returns { success: true }. Getting
    // `true` here is therefore proof the mock is bound to the path that the
    // runtime code actually imports.
    await expect(sendEmail({
      to: 'fixture@example.test',
      subject: 'mock check',
      text: 'mock check',
    })).resolves.toEqual({ success: true });
  });

  it('the mocked path is the one runtime code imports', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

    const setup = readFileSync(resolve(backendRoot, 'tests/setup.mjs'), 'utf8');
    expect(setup).toContain("vi.mock('../emailService.mjs'");
    // And the stale path must not come back.
    expect(setup).not.toContain("vi.mock('../services/emailService.mjs'");

    // Real consumers import the same module this mock targets.
    const notificationService = readFileSync(
      resolve(backendRoot, 'services/notificationService.mjs'), 'utf8',
    );
    expect(notificationService).toContain("from '../emailService.mjs'");
  });

  it('stripe is mocked — no test constructs a live Stripe client', async () => {
    const Stripe = (await import('stripe')).default;
    const client = new Stripe('sk_test_not_a_real_key');
    // The mock exposes a canned checkout.sessions.create; the real SDK would not
    // return this fixture id.
    const session = await client.checkout.sessions.create({});
    expect(session.id).toBe('cs_test_123');
  });
});
