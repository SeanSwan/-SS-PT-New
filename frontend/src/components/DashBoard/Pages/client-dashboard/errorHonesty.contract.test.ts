/**
 * Contract: on the client progress surface, a FAILED fetch never renders as an
 * empty week or as nothing at all.
 *
 * Incident (five-surface review C1, narrowed by the Sol pass 2026-09-02): the
 * stat strip distinguished error from zero via `weeklyRecapError ? '—'`, but
 * WeeklyRecapCard received no error prop — a network failure rendered the same
 * "No weekly recap available yet." as a genuinely empty week. PersonalRecordsCard
 * was worse: gated on `records.length > 0`, a failed fetch rendered nothing at
 * all. Both now render the shared ErrorCard with a retry.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/DashBoard/Pages/client-dashboard';
const page = readFileSync(resolve(process.cwd(), `${dir}/ClientProgressDashboardPage.tsx`), 'utf8');
const cards = readFileSync(resolve(process.cwd(), `${dir}/ClientProgressDashboardPage.cards.tsx`), 'utf8');
const hook = readFileSync(resolve(process.cwd(), `${dir}/useClientProgressPanels.ts`), 'utf8');

describe('client progress error honesty', () => {
  it('WeeklyRecapCard takes an error state and renders the shared ErrorCard for it', () => {
    expect(cards).toMatch(/error\?:\s*boolean/);
    expect(cards).toMatch(/onRetry\?:\s*\(\)\s*=>\s*void/);
    expect(cards).toContain("import ErrorCard from '../../../ui/ErrorCard'");
    expect(cards).toMatch(/testId="recap-error"/);
  });

  it('the error branch precedes the empty-state branch (failure never reads as empty)', () => {
    const errorAt = cards.indexOf('testId="recap-error"');
    const emptyAt = cards.indexOf('No weekly recap available yet.');
    expect(errorAt).toBeGreaterThan(-1);
    expect(emptyAt).toBeGreaterThan(-1);
    expect(errorAt).toBeLessThan(emptyAt);
  });

  it('the page threads the error state and a retry into the recap card', () => {
    expect(page).toMatch(/error=\{weeklyRecapError\}/);
    expect(page).toMatch(/onRetry=\{retryWeeklyRecap\}/);
  });

  it('personal records render an ErrorCard on failure instead of nothing', () => {
    expect(page).toMatch(/personalRecordsError\s*\?\s*\(/);
    expect(page).toMatch(/testId="pr-error"/);
    expect(page).toMatch(/onRetry=\{retryPersonalRecords\}/);
  });

  it('retrying re-runs the loaders (attempt nonces are in the effect deps)', () => {
    // RE-POINTED 2026-09-03: the two loaders moved into useClientProgressPanels
    // so the page stays under the 300-line cap. The intent is unchanged — a
    // retry must actually re-run the fetch — so the assertion follows the code.
    expect(hook).toMatch(/\[authAxios, userId, weeklyRecapAttempt\]/);
    expect(hook).toMatch(/\[authAxios, userId, personalRecordsAttempt\]/);
    expect(page).toMatch(/useClientProgressPanels\(authAxios, user\?\.id\)/);
  });

  it('each attempt supersedes the one before it (no last-writer-wins race)', () => {
    // GLM 5.3 hostile round 1, finding 3: nonces re-ran the effect but nothing
    // sequenced the attempts, so a slow first request could resolve last and
    // overwrite a newer result or resurrect a cleared error.
    const guards = hook.match(/let isMounted = true;/g) ?? [];
    expect(guards.length).toBe(2);
    expect(hook).toMatch(/if \(!isMounted\) return;/);
  });
});
