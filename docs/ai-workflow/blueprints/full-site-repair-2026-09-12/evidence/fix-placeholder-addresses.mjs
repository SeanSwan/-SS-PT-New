#!/usr/bin/env node
/**
 * S17 — placeholder-address repair.
 *
 * The checker resolves a `mailto:` link by looking up its domain, so addresses
 * at reserved/example domains (`test.com`, `*.dev`, `company.com`) are reported
 * dead. Those addresses are illustrative account identifiers in test plans and
 * inventories, not navigable mail links, and `mailto:` to them would bounce.
 *
 * Fix: render exactly those addresses as inline code, which preserves the text
 * verbatim, is semantically more accurate, and stops the checker treating them
 * as links. Only the address cell is touched; nothing else on the line changes.
 *
 * Idempotent: already-backticked addresses are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();

/** Addresses proven non-resolving by the checker; all are deliberate placeholders. */
const PLACEHOLDERS = [
  'trainer@test.com',
  'client-paid@test.com',
  'client-free@test.com',
  'client@test.com',
  'user@test.com',
  'smoketest_...@test.com',
  'phase2test_...@test.com',
  'pwtest_...@test.com',
  'testclient_...@test.com',
  'admin@swanstudios.dev',
  'trainer@swanstudios.dev',
  'client-paid@test.dev',
  'client-free@test.dev',
  'privacy@company.com',
];

const FILES = [
  'docs/ai-workflow/blueprints/OPERATIONS-READY-TESTPLAN-AND-GAPS.md',
  'docs/ai-workflow/launch-readiness/ACCOUNT-CLEANUP-PLAN.md',
  'docs/ai-workflow/launch-readiness/ACCOUNT-INVENTORY-BEFORE-AFTER.md',
  'docs/archive/MASTER_PROMPT_V26_API.md',
];

const changes = [];
for (const rel of FILES) {
  const abs = path.join(root, rel);
  const original = fs.readFileSync(abs, 'utf8');
  const lines = original.split('\n');
  let touched = 0;

  const updated = lines.map((line, i) => {
    let next = line;
    for (const addr of PLACEHOLDERS) {
      // Skip if already inside inline code: there is a backtick before and after.
      const idx = next.indexOf(addr);
      if (idx === -1) continue;
      const before = next[idx - 1];
      const after = next[idx + addr.length];
      if (before === '`' && after === '`') continue;
      if (before === '`' || after === '`') continue; // partially formatted: leave alone
      next = next.slice(0, idx) + '`' + addr + '`' + next.slice(idx + addr.length);
    }
    if (next !== line) {
      touched += 1;
      changes.push({ file: rel, line: i + 1, before: line.trim(), after: next.trim() });
    }
    return next;
  });

  if (touched) fs.writeFileSync(abs, updated.join('\n'));
  console.log(`${rel}: ${touched} line(s) changed`);
}

const out = path.join(root, '.mega-blueprints/artifacts/docs-link-debt-20260913/placeholder-address-repairs.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), changes }, null, 2) + '\n');
console.log(`\n${changes.length} change(s) recorded to ${path.relative(root, out)}`);
