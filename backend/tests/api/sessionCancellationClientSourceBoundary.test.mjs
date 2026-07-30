import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const apiRoutesSource = readFileSync(resolve(__dirname, '../../routes/api.mjs'), 'utf8');
const unifiedRouteSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');
const legacyRouteSource = readFileSync(resolve(__dirname, '../../routes/sessionRoutes.mjs'), 'utf8');
const unifiedServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/session.service.mjs'), 'utf8');
const cancellationReviewServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/sessionCancellationReviewService.mjs'), 'utf8');
const aiCancelServiceSource = readFileSync(resolve(__dirname, '../../services/sessions/sessionCancelService.mjs'), 'utf8');

/**
 * Comments must be stripped before ANY mount-order indexOf. core/routes.mjs carries a
 * NOTE that quotes "the `app.use('/api', apiRoutes)` fallback", positioned ABOVE the
 * exact /api/sessions mount while the real aggregate mount is far BELOW it — so a raw
 * indexOf resolves the aggregate to that comment and the ordering check fails while
 * the mounts are correctly ordered. Same defect fixed in
 * tests/unit/supportIssueSchemaContract.test.mjs.
 *
 * No line numbers on purpose: editing that comment block shifts every line after it,
 * which already invalidated the numbers an earlier version of this note quoted.
 */
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');
const coreRoutesCode = stripComments(coreRoutesSource);

const sliceBetween = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  return {
    start,
    end,
    source: source.slice(start, end)
  };
};

describe('session cancellation clientSource restore boundary', () => {
  it('documents unified session routes shadowing the legacy fallback session router', () => {
    expect(coreRoutesCode.indexOf("app.use('/api/sessions', sessionsRoutes)"))
      .toBeGreaterThan(-1);
    expect(coreRoutesCode.indexOf("app.use('/api/sessions', sessionsRoutes)"))
      .toBeLessThan(coreRoutesCode.indexOf("app.use('/api', apiRoutes)"));
    expect(apiRoutesSource).toContain("router.use('/sessions', sessionRoutes)");
  });

  it('does not restore credits for free-tracking clients in unified cancellation service', () => {
    const { start, end, source } = sliceBetween(
      unifiedServiceSource,
      'async cancelSession(sessionId, user',
      'async confirmSession'
    );

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source.indexOf('isNonDeductingClient(client)'))
      .toBeLessThan(source.indexOf('client.availableSessions ='));
  });

  it('does not restore credits for free-tracking clients in unified waived cancellation review', () => {
    const { start, end, source } = sliceBetween(
      cancellationReviewServiceSource,
      'async function restoreWaivedCreditIfNeeded',
      'function buildReviewResponse'
    );

    expect(unifiedRouteSource).toContain('recordCancellationBillingDecision');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(cancellationReviewServiceSource).toContain("import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';");
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source.indexOf('isNonDeductingClient(client)'))
      .toBeLessThan(source.indexOf("client.increment('availableSessions'"));
  });

  it('does not restore credits for free-tracking clients in Swan Coach cancellation', () => {
    const { start, end, source } = sliceBetween(
      aiCancelServiceSource,
      'async function restoreCredit',
      'async function sendCancellationNotifications'
    );

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(aiCancelServiceSource).toContain("import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';");
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source.indexOf('isNonDeductingClient(client)'))
      .toBeLessThan(source.indexOf("await client.increment('availableSessions'"));
    expect(source).toContain('getSessionCreditsToRestore(');
    expect(source).toContain("by: creditsToRestore");
  });

  it('does not restore credits for free-tracking clients in the legacy restore helper', () => {
    const { start, end, source } = sliceBetween(
      legacyRouteSource,
      'async function restoreSessionCredit',
      'const buildRecurrenceDates'
    );

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(legacyRouteSource).toContain("import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';");
    expect(legacyRouteSource).not.toContain('NON_DEDUCTING_CLIENT_SOURCES');
    expect(source).toContain('isNonDeductingClient(client)');
    expect(source.indexOf('isNonDeductingClient(client)'))
      .toBeLessThan(source.indexOf("await client.increment('availableSessions'"));
    expect(source).toContain('getSessionCreditsToRestore(');
    expect(source).toContain("by: creditsToRestore");
  });

  it('does not bulk-restore recurring cancellation credits unless a real paid session deduction happened', () => {
    const { start, end, source } = sliceBetween(
      legacyRouteSource,
      'router.delete("/my-recurring/:groupId"',
      'router.put("/reschedule/:sessionId"'
    );

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const shouldRestoreRecurringCredits = !isNonDeductingClient(user);');
    expect(source).toContain('session.sessionDeducted &&');
    expect(source).toContain('!session.sessionCreditRestored &&');
    expect(source).toContain('shouldRestoreRecurringCredits');
    expect(source).not.toContain('session.sessionCreditRestored = true;\n      await session.save({ transaction });\n      sessionsRestored++;');
    expect(source).toContain('getSessionCreditsToRestore(session, {');
    expect(source).toContain("await user.increment('availableSessions', { by: creditsRestored, transaction })");
    expect(source).toContain('cancelledCount: sessions.length');
    expect(source).toContain('creditsRestored,');
    expect(source).not.toContain('availableSessions = (user.availableSessions || 0) + sessionsRestored');
  });
});
