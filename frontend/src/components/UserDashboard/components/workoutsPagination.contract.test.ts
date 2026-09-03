/**
 * Contract: the Progress tab shows a window it can extend, and says so.
 *
 * It fetched a hard `limit: 200` with no "load more" and no signal that more
 * existed (Blueprint v2 S8 / D7). A member training for years saw a truncated
 * history rendered as if it were the whole thing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/components/UserDashboard/components';
const tab = readFileSync(resolve(process.cwd(), `${dir}/WorkoutsTab.tsx`), 'utf8');
const charts = readFileSync(resolve(process.cwd(), `${dir}/WorkoutsTabCharts.tsx`), 'utf8');

/*
 * KNOWN LIMIT — offset pagination has a moving boundary in BOTH directions.
 *
 * A workout logged between two pages shifts rows DOWN, so a page can repeat a
 * row already on screen; the merge dedupes that by id (proven in
 * workoutsExtensionFailure.test.tsx). A workout DELETED between two pages shifts
 * rows UP, so a page can SKIP one — and a skip is invisible to dedupe, because
 * the row simply never arrives.
 *
 * Keyset/cursor pagination — ask for rows before a known timestamp+id rather
 * than for "page N" — is the actual fix, and it needs a backend change.
 * Deletions are rare on this surface, so the dedupe ships now and the cursor is
 * recorded here as the follow-up rather than pretended away.
 * (GLM 5.3 hostile round 3, MISSED.)
 */
describe('workouts pagination', () => {
  it('the hard 200-row fetch is gone', () => {
    expect(tab).not.toMatch(/limit:\s*200/);
    expect(tab).toMatch(/WORKOUT_PAGE_SIZE = 50/);
  });

  it('the first page and the extension both use the page size', () => {
    const calls = tab.match(/params:\s*\{\s*limit:\s*WORKOUT_PAGE_SIZE/g) ?? [];
    expect(calls.length).toBe(2);
  });

  it('the extension APPENDS rather than replaces, and recomputes over the whole window', () => {
    // The append is now id-deduped (GLM round 2 finding 5: the offset boundary
    // moves, so page 2 can repeat a row already on screen). Behaviour is proven
    // in workoutsExtensionFailure.test.tsx; this pins that it still APPENDS.
    // The merge is a dedupe LOOP now (ids can repeat across pages and can
    // serialise as 2 or "2"); it still starts from the existing window.
    expect(tab).toMatch(/const merged = \[\.\.\.sessions\];/);
    expect(tab).toMatch(/merged\.push\(row\);/);
    expect(tab).toMatch(/setCategories\(transformWorkoutLogs\(merged\)\)/);
    expect(tab).toMatch(/setStreak\(merged\.length === 0 \? 0 : calcStreak\(merged\)\)/);
  });

  it('the control only appears when the server says another page exists', () => {
    expect(tab).toMatch(/setHasMore\(Boolean\(response\.data\?\.data\?\.hasMore\)\)/);
    expect(tab).toMatch(/\{hasMore && \(/);
  });

  it('a failed extension uses its OWN error channel, not the full-screen one', () => {
    // SUPERSEDED ASSERTION (2026-09-03, GLM hostile round 1 blocker 1). This
    // used to assert the catch called setError — and it PASSED while the code
    // was broken: `error` drives an early return that replaces the whole tab,
    // so routing an extension failure there deleted the window the feature
    // exists to preserve. Source-shape was the wrong thing to check; the
    // rendered behaviour is asserted in workoutsExtensionFailure.test.tsx.
    const start = tab.indexOf('const loadOlder');
    const body = tab.slice(start, tab.indexOf('useEffect', start));
    expect(body).toMatch(/setExtensionError\('Unable to load older workouts/);
    expect(body).not.toMatch(/setError\(/);
    expect(body).not.toMatch(/setCategories\(\[\]\)/);
  });

  it('the charts state the window they are drawn from', () => {
    expect(tab).toMatch(/Showing your last \$\{sessions\.length\} workouts/);
    expect(tab).toMatch(/Showing all \$\{sessions\.length\} workouts/);
    expect(charts).toMatch(/windowLabel/);
    expect(charts).toMatch(/data-testid="chart-window-note"/);
  });
});
