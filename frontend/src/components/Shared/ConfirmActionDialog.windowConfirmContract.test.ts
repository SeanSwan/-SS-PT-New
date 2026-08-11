/**
 * Destructive dashboard actions must not fall back to the browser's native
 * confirm() dialog — it is unbranded, unstyled, untranslatable, and on mobile
 * it renders as a system sheet that looks nothing like SwanStudios.
 *
 * This test used to name THREE files by hand. Two problems with that, both of
 * which had already happened by the time this was rewritten:
 *
 *   1. One of the three (BulkModerationPanel.tsx) had been deleted, so every
 *      run died on ENOENT before asserting anything. A safety contract that
 *      throws is a safety contract that is not running.
 *   2. A hand-written list only ever covers what somebody remembered to add.
 *      Sweeping the real admin surface immediately found three violations
 *      sitting outside the list — the contract was reporting green while
 *      being broken elsewhere.
 *
 * So the file list is now DISCOVERED FROM DISK. New admin surfaces are
 * covered the moment they land, not when someone remembers to register them.
 *
 * KNOWN_VIOLATIONS is a ratchet, not an excuse: it freezes the debt that
 * already existed so main can stay green, while any NEW window.confirm fails
 * immediately. Entries are removed as each surface is converted to
 * ConfirmActionDialog — the list should only ever shrink.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/components/DashBoard', 'src/components/Admin'];

/**
 * Pre-existing native-confirm usages, recorded 2026-08-05. Each is a real
 * violation awaiting conversion to ConfirmActionDialog — NOT an approved
 * exception. Delete the entry when the surface is converted; the test then
 * defends it permanently.
 */
const KNOWN_VIOLATIONS = new Set([
  'src/components/DashBoard/Pages/admin-packages/ProductVariantsManager.tsx',
  'src/components/DashBoard/workspaces/clients-team/tabs/ClientWorkoutPlanActions.tsx',
  'src/components/DashBoard/workspaces/marketing/CampaignManager.tsx',
]);

const toPosix = (value: string) => value.split(sep).join('/');

const collectTsx = (dir: string, out: string[] = []): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // a root that no longer exists is caught by the arity check below
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectTsx(full, out);
    } else if (entry.endsWith('.tsx') && !entry.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
};

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('dashboard destructive action confirmation contract', () => {
  it('sweeps a real, non-empty admin surface', () => {
    // Fail-closed. If the roots move or the walk silently returns nothing,
    // every assertion below would pass vacuously and this contract would go
    // quiet without anyone noticing — the exact failure mode being defended.
    const files = ROOTS.flatMap((root) => collectTsx(resolve(process.cwd(), root)));
    expect(files.length).toBeGreaterThan(100);
  });

  it('keeps destructive dashboard actions out of browser-native confirm prompts', () => {
    const offenders = ROOTS
      .flatMap((root) => collectTsx(resolve(process.cwd(), root)))
      .map((file) => toPosix(relative(process.cwd(), file)))
      .filter((file) => readSource(file).includes('window.confirm('))
      .filter((file) => !KNOWN_VIOLATIONS.has(file));

    expect(offenders, 'new window.confirm in a dashboard surface').toEqual([]);
  });

  it('does not let the ratchet rust — every frozen violation must still exist', () => {
    // If a listed file is deleted or already fixed, the entry is stale and
    // must go, otherwise the allowlist quietly grants amnesty to a path that
    // could later be re-created with a fresh violation.
    for (const file of KNOWN_VIOLATIONS) {
      expect(readSource(file), `${file} is allowlisted but no longer offends`).toContain(
        'window.confirm(',
      );
    }
  });

  it('routes confirmation UX through branded in-app dialogs', () => {
    expect(readSource('src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx')).toContain('Delete special?');
    expect(readSource('src/components/Admin/NASM/NASMAdminDashboard.tsx')).toContain('Delete template?');
    // The third assertion here read BulkModerationPanel.tsx, which no longer
    // exists. Removed rather than re-pointed: inventing a replacement target
    // would assert something nobody chose.
  });
});
