/**
 * plannerIaV2.rolodex.test.ts — S18 acceptance fence (JARVIS blueprint §4.3).
 * Locks: Filters button + facet sheet replace the five always-visible chip
 * rows; search autofocus + 150ms debounce; Plan tab with already-in-plan
 * counts; single-tap add gets a 5s Undo through the real remove action;
 * the existing virtualizer is retained; zero new dependencies. Deferred
 * items (media preview, NASM movement-pattern facet, pain-excluded-with-
 * reason) are recorded in the source header + breadcrumb, not silently cut.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const v2 = read('WorkoutPlannerRolodexPanelV2.tsx');
const layout = read('WorkoutPlannerPageLayout.tsx');

describe('S18 Rolodex V2 contract', () => {
  it('replaces the five chip rows with one Filters button + grouped facet sheet', () => {
    expect(v2).toContain('planner-rolodex-facet-sheet');
    expect(v2).toMatch(/Filters/);
    // Facet chips render only inside the sheet, gated on facetsOpen.
    expect(v2).toContain('{facetsOpen && (');
    // Active filters collapse to ≤3 dismissible chips + overflow count.
    expect(v2).toContain('activeFacets.slice(0, 3)');
    expect(v2).toContain('+{activeFacets.length - 3}');
  });

  it('is search-first: autofocus on mount, 150ms debounce', () => {
    expect(v2).toContain('searchRef.current?.focus()');
    expect(v2).toContain('SEARCH_DEBOUNCE_MS = 150');
  });

  it('has a Plan tab with already-in-plan counts', () => {
    expect(v2).toContain("'library' | 'plan'");
    expect(v2).toContain('In plan · {planExercises.length}');
    expect(v2).toContain('never double-add');
  });

  it('offers a 5-second Undo wired to the real remove action', () => {
    expect(v2).toContain('UNDO_WINDOW_MS = 5000');
    expect(v2).toContain('planner-rolodex-undo');
    expect(v2).toContain('act.pageActions.removeExercise(undoTarget.id)');
  });

  it('retains the existing virtualizer and the shared row renderer', () => {
    expect(v2).toContain("from 'react-window'");
    expect(v2).toContain('rowComponent: exerciseRowRenderer');
  });

  it('mounts only in the V2 shell; V1 rolodex panel is untouched', () => {
    expect(layout).toContain('rolodex={<WorkoutPlannerRolodexPanelV2 />}');
    expect(layout).toContain('<WorkoutPlannerRolodexPanel'); // V1 branch keeps its panel
  });

  it('adds zero new dependencies (package.json untracked-diff = 0)', () => {
    const changed = execSync('git diff HEAD --name-only', { cwd: resolve(__dirname), encoding: 'utf8' })
      .split(/\r?\n/).filter(line => /(^|\/)package\.json$/.test(line));
    expect(changed).toEqual([]);
  });
});
