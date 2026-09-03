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
    expect(tab).toMatch(/const merged = \[\.\.\.sessions, \.\.\.older\]/);
    expect(tab).toMatch(/setCategories\(transformWorkoutLogs\(merged\)\)/);
    expect(tab).toMatch(/setStreak\(merged\.length === 0 \? 0 : calcStreak\(merged\)\)/);
  });

  it('the control only appears when the server says another page exists', () => {
    expect(tab).toMatch(/setHasMore\(Boolean\(response\.data\?\.data\?\.hasMore\)\)/);
    expect(tab).toMatch(/\{hasMore && \(/);
  });

  it('a failed extension keeps the window already on screen', () => {
    const start = tab.indexOf('const loadOlder');
    const body = tab.slice(start, tab.indexOf('useEffect', start));
    expect(body).toMatch(/setError\('Unable to load older workouts/);
    expect(body).not.toMatch(/setCategories\(\[\]\)/);
  });

  it('the charts state the window they are drawn from', () => {
    expect(tab).toMatch(/Showing your last \$\{sessions\.length\} workouts/);
    expect(tab).toMatch(/Showing all \$\{sessions\.length\} workouts/);
    expect(charts).toMatch(/windowLabel/);
    expect(charts).toMatch(/data-testid="chart-window-note"/);
  });
});
