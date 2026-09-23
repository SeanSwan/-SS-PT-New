/** Planning-only scoped preservation. No pruning, no restore over source, no network. */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const sourceRoot = 'C:/tmp/ss-charts-unify-20260903';
const target = process.argv[2];
if (!target) throw new Error('Pass a new absolute snapshot directory.');
const destination = resolve(target);
const sourceFiles = [
  'ACTIVE-INDEX.md',
  'docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION-BLUEPRINT-2026-09-03.md',
  'docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION-BLUEPRINT-V2-2026-09-03.md',
  'docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION-BUILD-CONTEXT-2026-09-04.md',
  'docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION-GLM-REVIEW-PACKET-2026-09-04.md',
];
const files = sourceFiles.map(path => ({ input: join(sourceRoot, path), source: `chart-worktree/${path}` }));
files.push({ input: join(root, 'ACTIVE-INDEX.md'), source: 'shared-repo/ACTIVE-INDEX.md' });
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
mkdirSync(destination); // refuse a reused destination
const entries = files.map(({ input, source }) => {
  const output = join(destination, source);
  const sha256 = hash(input);
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(input, output);
  if (hash(output) !== sha256 || hash(input) !== sha256) throw new Error(`Race: ${source}`);
  return { source, snapshot: source, sha256 };
});
const manifest = {
  schemaVersion: 'non-vibe-planning-snapshot-v1',
  createdAt: new Date().toISOString(),
  mechanism: 'explicit-scoped-copy; native vault absent in source worktree', entries,
};
const path = join(destination, 'manifest.json');
writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ path, sha256: hash(path), files: entries.length }));
