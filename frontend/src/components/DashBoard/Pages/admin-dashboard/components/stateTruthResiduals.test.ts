/**
 * SWA-138 S7 — state-truth residual contracts.
 * Locks the two audit defects: interval refresh silently resetting the
 * signups Load-More position, and the sequential N+1 price-lookup loop.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const signups = read('src/components/DashBoard/Pages/admin-dashboard/components/RealTimeSignupMonitoring.tsx');
const cancelled = read('src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.tsx');

describe('RealTimeSignupMonitoring pagination truth (S7)', () => {
  it('only the INITIAL load may reset the Load-More offset', () => {
    expect(signups).toContain('const refreshAll = useCallback(async (includeTotal: boolean, resetOffset = false)');
    expect(signups).toContain('if (signupsLoaded && resetOffset) {');
    expect(signups).toContain('await refreshAll(true, true);');
    // The interval/manual path must NOT pass a reset:
    expect(signups).toContain('await refreshAll(false);');
    expect(signups).not.toContain('await refreshAll(false, true)');
  });
});

describe('CancelledSessionsWidget price lookups (S7)', () => {
  it('fetches per-session prices in parallel, not a sequential N+1 loop', () => {
    expect(cancelled).toContain('await Promise.all(');
    expect(cancelled).toContain('targetSessions.map(async (session)');
    expect(cancelled).not.toContain('for (const session of targetSessions)');
  });
});
