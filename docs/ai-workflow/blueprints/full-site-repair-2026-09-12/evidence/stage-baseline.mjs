#!/usr/bin/env node
/**
 * Temporary helper: materialise the pre-fix (HEAD) content of the eight files
 * into ./.staging so fix-anchors.mjs can regenerate its receipt from the
 * pristine state and prove `fix(HEAD) === working tree`.
 * Read-only with respect to git (uses `git show`), writes only inside .staging.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const STAGE = path.join(HERE, '.staging');

const FILES = [
  'AI-Village-Documentation/SWANSTUDIOS-SOCIAL-STYLING-REFERENCE.md',
  'docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md',
  'docs/ai-workflow/VIDEO-LIBRARY-PHASE-2-BLUEPRINT.md',
  'docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md',
  'docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md',
  'docs/ai-workflow/blueprints/ENHANCED-CHART-ANALYTICS-AND-AI-INTEGRATION-MASTER-PROMPT.md',
  'docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md',
  'docs/ai-workflow/personal-training/UNIFIED-TRAINING-INTERFACE-DESIGN.md',
];

fs.rmSync(STAGE, { recursive: true, force: true });

const rows = [];
for (const rel of FILES) {
  const buf = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: REPO_ROOT, maxBuffer: 1 << 28 });
  const blobHasCrlf = buf.includes(Buffer.from('\r\n'));
  const text = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const out = path.join(STAGE, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  const current = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
  rows.push({ file: rel, blobHasCrlf, stagedBytes: Buffer.byteLength(text), currentBytes: Buffer.byteLength(current) });
}
console.table(rows);
