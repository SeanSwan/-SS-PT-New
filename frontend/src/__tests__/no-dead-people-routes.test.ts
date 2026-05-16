import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const ALLOWLIST: Record<string, string> = {
  'frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx':
    'canonical - documentation comment only',
  'frontend/src/config/dashboard-tabs.ts':
    'historical audit comment only',
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

describe('no-dead-people-routes guard', () => {
  it('every allowlist entry points at a real file', () => {
    const missing: string[] = [];
    for (const rel of Object.keys(ALLOWLIST)) {
      if (!existsSync(join(REPO_ROOT, rel))) {
        missing.push(rel);
      }
    }

    expect(
      missing,
      `Allowlist references paths that no longer exist: ${missing.join(', ')}`,
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
      `New /dashboard/people references found. Replace with the canonical /dashboard/admin/client-management surface or document a new exception.\n${message}`,
    ).toEqual([]);
  });
});
