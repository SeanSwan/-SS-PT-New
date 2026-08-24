#!/usr/bin/env node
/**
 * build-packet.mjs — assemble the hostile-debate packet from the deliverables.
 * Every file passes the canary-proven redact-egress chokepoint before leaving disk.
 */
import { readForEgress } from '../lib/redact-egress.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const FILES = [
  ['docs/ai-workflow/AI-HANDOFF/QWEN-HANDOFF-SHADOW-DB-SEED-2026-08-23.md', 'THE BRIEF — rules, 8 acceptance criteria, house rules'],
  ['backend/scripts/seed-shadow-db.mjs', 'DELIVERABLE 1 — the seeder'],
  ['backend/scripts/seed-shadow-db.test.mjs', 'DELIVERABLE 2 — vitest suite (DB-free)'],
  ['backend/scripts/seed-shadow-db.selftest.mjs', 'DELIVERABLE 3 — dependency-free self-test'],
  ['backend/vitest.config.mjs', 'DELIVERABLE 4 — vitest config (suite wiring)'],
  [".github/workflows/migration-shadow-check.yml", 'DELIVERABLE 5 — CI workflow'],
];

const parts = [
  '# FINAL-REVIEW PACKET — SS-PT shadow-database seeder (SWA-200), post panel-ruling fixes',
  '',
  '**Reviewer role:** FINAL REVIEW (Ox Alpha, separate call) — review the FINAL deliverable state after the hostile debate panel\'s fixes have been applied. This is not a debate round.',
  '',
  '**Verification already performed after fixes (trust, but check):**',
  '- self-test: 36/36 PASS, exit 0 (`node backend/scripts/seed-shadow-db.selftest.mjs`) — 4 new enum-recovery checks added per the GLM R15 finding (normalizeModel-driven, `DataTypes.ENUM` type-instance values, `ENUM(a,b)` type-string recovery, attribute-level `.values` retained)',
  '- live safety gate: DATABASE_URL unset -> REFUSED exit 1; non-localhost -> REFUSED exit 1; localhost without "shadow" -> REFUSED exit 1; valid shadow URL passes gate and fails only at real DB connect (correct order)',
  '- `node --check` clean on all three JS deliverables',
  '- workflow YAML parsed (js-yaml): 12 steps, self-test step present after npm ci, service env all "shadow", DATABASE_URL password "shadow" matching POSTGRES_PASSWORD',
  '- real-model audit (in-memory SQLite, actual 167-model registry): 257/257 attribute FK references resolve to a target, 0 dangling; 139/139 enum attributes resolved to a non-null value (0 before the fix — the "every enum column NULLs" defect is gone); 2 self-FKs (SocialComment.parentCommentId, CustomExercise.parentVersionId) routed to cycle backfill; topo order 164/164, 3 cycle nodes, 32 root tables',
  '- redaction audit: no key material, no credential values, no `***`-redacted secrets in deliverables (only inert URL fixtures in the self-test, which validate host+word not password)',
  '- UNPROVEN-by-necessity: end-to-end insert against real Postgres (no local Postgres; no Docker — the CI shadow job is the production gate); vitest run blocked on a missing @rollup Linux native binary on this machine — the dependency-free self-test executes the same contracts 36/36',
  '',
  "**Your job: judge the DELIVERABLE as it stands now. (a) Would it pass the CI shadow job on first real run? (b) Does it hold the brief's 8 acceptance criteria (safety gate, no prod data, no fake PII, no override switch)? (c) Which residual risks — if any — make it NOT safe to merge? Findings need file + location + severity. Rubber-stamps are the failure mode; unlocatable claims are the opposite failure mode. Both are void verdicts.",
  '',
  '---',
  '',
];
// Files are read relative to the repo root (the script's grandparent dir), so the script works from any cwd.
for (const [f, label] of FILES) {
  const text = readForEgress(join(REPO_ROOT, f), { label });
  parts.push(`===================== FILE: ${f} — ${label} =====================`, '', text, '', '---', '');
}
const out = join(REPO_ROOT, 'docs/ai-workflow/AI-HANDOFF/panel-debate-shadow-seed-2026-08-23', 'PACKET.md');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, parts.join('\n'), 'utf8');
console.log('packet written:', out, parts.join('\n').length, 'chars');
