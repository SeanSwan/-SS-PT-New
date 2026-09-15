/**
 * client trainer assignment — batched roster summary contract
 * ===========================================================
 * Slice 1 "Trainer truth feeds" (2026-09-12 dual hostile review, merged
 * Slice 1 / GLM 5.3 findings A1 + A7 + A8).
 *
 * Regression intent:
 *   The trainer roster previously derived per-client stats with TWO
 *   requests per client (history?limit=5 + upcoming?limit=3), so:
 *   - "Completed sessions" capped at 5 per client (A1),
 *   - a 30-client roster fired 61 requests per load (A7),
 *   - any per-client failure fabricated zeros (A1/A8).
 *
 *   The route now computes ONE batched, trainer-scoped summary per load
 *   (COUNT completed all-time, MAX past sessionDate, MIN future
 *   non-cancelled sessionDate over the `sessions` table) and attaches it
 *   additively as `client.rosterSummary`. The frontend prefers the
 *   summary and skips the per-client fan-out.
 *
 * Mocking strategy: source-contract pins (house pattern — see
 * clientTrainerAssignmentClientSource.test.mjs). Behavioral coverage for
 * the summary math lives in the route's own truth tests and the frontend
 * hook tests that consume the attached summary.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(
  resolve(__dirname, '../../routes/clientTrainerAssignmentRoutes.mjs'),
  'utf8'
);

const trainerRouteStart = source.indexOf("router.get('/trainer/:trainerId'");
const trainerRouteEnd = source.indexOf("router.get('/client/:clientId'");
const trainerRoute = source.slice(trainerRouteStart, trainerRouteEnd);

describe('trainer roster batched summary contract', () => {
  it('computes the roster summary in one batched Session query, not per-client fan-out', () => {
    expect(trainerRouteStart).toBeGreaterThan(-1);
    expect(trainerRoute).toContain('rosterSummaryRows');
    expect(trainerRoute).toContain("'completedSessions'");
    expect(trainerRoute).toContain("'lastSessionDate'");
    expect(trainerRoute).toContain("'nextSessionDate'");
    // Batched: grouped by user, filtered to the roster's client ids at once.
    expect(trainerRoute).toContain('[Op.in]: clientIds');
    expect(trainerRoute).toContain('group:');
  });

  it('scopes the summary to the roster owner (trainerId), matching the assignments filter', () => {
    const summaryStart = trainerRoute.indexOf('rosterSummaryRows');
    const summaryBlock = trainerRoute.slice(summaryStart, summaryStart + 1600);
    expect(summaryBlock).toContain('trainerId: parsedTrainerId');
  });

  it('counts completed sessions all-time and derives last/next from sessionDate truth', () => {
    expect(trainerRoute).toContain("status = 'completed'");
    expect(trainerRoute).toContain("'cancelled', 'blocked'");
    expect(trainerRoute).toContain('MAX');
    expect(trainerRoute).toContain('MIN');
  });

  it('attaches the summary additively as client.rosterSummary on the enriched response', () => {
    expect(trainerRoute).toContain('attachRosterSummary');
    expect(trainerRoute).toContain('rosterSummary');
  });

  it('fails soft: a summary query error must not break the assignments response', () => {
    const summaryStart = trainerRoute.indexOf('rosterSummaryRows');
    const summaryBlock = trainerRoute.slice(summaryStart, summaryStart + 2200);
    expect(summaryBlock).toMatch(/catch/);
    expect(summaryBlock).toContain('rosterSummaryMap = {}');
  });
});
