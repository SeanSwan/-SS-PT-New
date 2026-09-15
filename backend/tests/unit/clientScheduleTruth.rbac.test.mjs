/**
 * client schedule truth — RBAC regression contracts
 * ==================================================
 * Client-dashboard schedule fix (2026-09-12, Sean report: client dashboard
 * shows no schedule while admin/trainer do).
 *
 * Regression intent:
 *   unifiedSessionService.getAllSessions returned `[]` for role 'user'
 *   ("social-only accounts" branch). Role 'user' is the User model DEFAULT
 *   (User.mjs:123-127 ENUM('user','client','trainer','admin') DEFAULT 'user')
 *   and the client dashboard maps it to the client surface
 *   (UniversalSchedule.tsx normalizeAuthRole: 'user' -> 'client'), so any
 *   role-'user' account with owned sessions saw an empty schedule. The
 *   frontend waiver gate (403 WAIVER_REQUIRED from waiverGate.mjs) is the
 *   other silent-empty path; it is surfaced on the frontend instead.
 *
 *   Post-fix contract: role 'user' is scoped strictly to OWN sessions
 *   (filter.userId = user.id) — no bookable available slots, no other
 *   client's data — and trainer contact attributes stay client-limited.
 *
 * Mocking strategy: source-contract pins (house pattern — see
 * trainerTruthFeeds.schemaContract.test.mjs header). Behavioral evidence
 * for the empty-schedule complaint is recorded in the slice's live DB
 * probes (backend/scripts/inspect-client-schedule-truth.mjs).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceSource = readFileSync(
  resolve(__dirname, '../../services/sessions/session.service.mjs'),
  'utf8'
);

function getAllSessionsSource(source) {
  const start = source.indexOf('async getAllSessions(');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('async getSessionById(', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('client schedule truth — role user RBAC contract', () => {
  const getAllSessions = getAllSessionsSource(serviceSource);

  function userRoleBranch(source) {
    const start = source.indexOf("user.role === 'user'");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('Unknown role', start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  it('no longer returns [] for role user (the empty-schedule regression)', () => {
    const branch = userRoleBranch(getAllSessions);
    expect(branch).not.toContain('return []');
  });

  it('scopes role user strictly to their OWN sessions', () => {
    const branch = userRoleBranch(getAllSessions);
    expect(branch).toContain('filter.userId = user.id');
  });

  it('does not grant role user the bookable available-slots branch', () => {
    const branch = userRoleBranch(getAllSessions);
    expect(branch).not.toContain("status: 'available'");
  });

  it('keeps trainer contact attributes client-limited for role user (PII parity with client)', () => {
    const anchor = getAllSessions.indexOf('const trainerAttributes');
    expect(anchor).toBeGreaterThan(-1);
    const block = getAllSessions.slice(anchor, anchor + 220);
    expect(block).toContain("'client', 'user'");
  });
});
