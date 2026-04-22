import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 19 dead-route guard. See
// docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md.
// Canonical admin client surface is /dashboard/admin/client-management.
// Any /dashboard/people[/...] link silently redirects admins to
// /dashboard/admin/overview via UniversalDashboardLayout.tsx:869/874.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

const SCAN_DIRS = ['frontend/src', 'backend'];

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
]);

const SCAN_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_TEST_FILES = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Files allowed to still contain `/dashboard/people` literals.
// Each entry has a documented reason. Removing an entry is how you
// declare a surface canonically cleaned — land the code edit and the
// allowlist delete in the same commit. Adding an entry requires
// updating the Phase 19 receipt doc.
const ALLOWLIST: Record<string, string> = {
  // Legacy / dormant — unmounted historical record, no live consumer.
  'frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx':
    'legacy — not JSX-mounted, pending dormant-removal pass',
  'frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx':
    'dormant — zero runtime imports, pending dormant-removal pass',
  // Canonical file — documentation comment only (Phase 15.4 incident note).
  'frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx':
    'canonical — documentation comment only',
  // Historical audit comment at dashboard-tabs.ts:535-547 after Phase
  // 19.A polish. The orphaned tab config at line 161 was retargeted in
  // Phase 19.B so the only remaining literal here is the comment.
  'frontend/src/config/dashboard-tabs.ts':
    'historical audit comment only (Phase 6 + Phase 19 annotations)',
};

const FORBIDDEN = '/dashboard/people';

function walk(dir: string, out: string[]): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile()) {
      if (!SCAN_EXTENSIONS.test(name)) continue;
      if (SKIP_TEST_FILES.test(name)) continue;
      out.push(full);
    }
  }
  return out;
}

function toRepoRelative(absPath: string): string {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
}

describe('no-dead-people-routes guard (Phase 19)', () => {
  it('every allowlist entry points at a real file', () => {
    const missing: string[] = [];
    for (const rel of Object.keys(ALLOWLIST)) {
      if (!existsSync(join(REPO_ROOT, rel))) {
        missing.push(rel);
      }
    }
    expect(
      missing,
      `Allowlist references paths that no longer exist. Update the allowlist and PHASE-19 receipt together: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('no non-allowlisted source file references the dead /dashboard/people route', () => {
    const offenders: Array<{ file: string; lines: number[] }> = [];

    for (const scanDir of SCAN_DIRS) {
      const absDir = join(REPO_ROOT, scanDir);
      if (!existsSync(absDir)) continue;
      const files = walk(absDir, []);
      for (const file of files) {
        const rel = toRepoRelative(file);
        if (rel in ALLOWLIST) continue;
        let content: string;
        try {
          content = readFileSync(file, 'utf8');
        } catch {
          continue;
        }
        if (!content.includes(FORBIDDEN)) continue;
        const lines: number[] = [];
        content.split('\n').forEach((line, idx) => {
          if (line.includes(FORBIDDEN)) lines.push(idx + 1);
        });
        offenders.push({ file: rel, lines });
      }
    }

    const message = offenders
      .map((o) => `  ${o.file}: lines ${o.lines.join(', ')}`)
      .join('\n');

    expect(
      offenders,
      `New \`/dashboard/people\` references found. These silently redirect admins to the Command Center catch-all. Replace with the canonical surface (typically /dashboard/admin/client-management) or, if you hit a blocked case (view-as / measurements / movement-screen), add the file to the allowlist in this test with a reason string AND update docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md.\n${message}`,
    ).toEqual([]);
  });
});
