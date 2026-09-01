/**
 * run-vitest-shards.mjs
 * =====================
 * Full-suite Vitest launcher for the SwanStudios frontend.
 *
 * Why this exists:
 * - The all-in-one `vitest run` process can exhaust a worker heap after many
 *   jsdom-heavy files have executed in the same fork.
 * - Running the same test inventory in deterministic batches gives every batch
 *   a fresh Node/Vitest process while preserving normal test isolation.
 *
 * Usage:
 *   npm run test:run
 *   npm run test:run -- --reporter verbose
 *   npm run test:run -- --fail-fast     # stop at the first failing batch
 *
 * Optional env:
 *   VITEST_SHARD_SIZE=5
 *
 * RUNS EVERY BATCH BY DEFAULT, then reports all failures together and exits 1.
 * It used to `process.exit` on the first failing batch, which meant a single
 * red shard silently skipped every shard after it — on 2026-09-01 a halt at
 * batch 166/321 left 48% of the suite unexecuted and hid two further failures
 * (a 313>300 line-cap breach and a canonical save-path payload mismatch) behind
 * one visible one. A runner that stops early cannot answer "is the suite green",
 * only "is the first failure still there". Pass --fail-fast for the old
 * behaviour when you want a quick signal.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendRoot = resolve(__dirname, '..');
const srcRoot = join(frontendRoot, 'src');
const vitestBin = join(frontendRoot, 'node_modules', 'vitest', 'vitest.mjs');

const shardSize = Number.parseInt(process.env.VITEST_SHARD_SIZE || '5', 10);
const batchSize = Number.isFinite(shardSize) && shardSize > 0 ? shardSize : 5;
const rawArgs = process.argv.slice(2);
// --fail-fast is ours, not vitest's: strip it so it is never forwarded.
const failFast = rawArgs.includes('--fail-fast');
const extraArgs = rawArgs.filter((arg) => arg !== '--fail-fast');
const reporterProvided = extraArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='));
const failedBatches = [];

function collectTests(dir) {
  const tests = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      tests.push(...collectTests(fullPath));
      continue;
    }
    if (!/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(entry)) continue;
    if (/\.e2e\.test\.tsx$/.test(entry)) continue;
    tests.push(relative(frontendRoot, fullPath).replace(/\\/g, '/'));
  }
  return tests;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

if (!existsSync(vitestBin)) {
  console.error(`Vitest binary not found at ${vitestBin}`);
  process.exit(1);
}

const tests = collectTests(srcRoot).sort();
const batches = chunk(tests, batchSize);

console.log(`Vitest sharded run: ${tests.length} files across ${batches.length} batch(es).`);

for (const [index, batch] of batches.entries()) {
  const batchLabel = `${index + 1}/${batches.length}`;
  console.log(`\n[vitest-shard ${batchLabel}] ${batch.length} file(s)`);
  const args = [
    vitestBin,
    'run',
    ...batch,
    ...(reporterProvided ? [] : ['--reporter', 'dot']),
    ...extraArgs,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: frontendRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(`[vitest-shard ${batchLabel}] failed with status ${result.status ?? 'unknown'}.`);
    failedBatches.push({ label: batchLabel, status: result.status ?? 'unknown', files: batch.map((f) => relative(frontendRoot, f)) });
    if (failFast) {
      console.error('[vitest-shard] --fail-fast set: stopping here. Shards after this one did NOT run.');
      process.exit(result.status || 1);
    }
  }
}

if (failedBatches.length > 0) {
  console.error(`\nVitest sharded run: ${failedBatches.length} of ${batches.length} batch(es) FAILED.`);
  const MAX_LISTED = 8; // a failing batch names its files, but never a wall of them
  for (const f of failedBatches) {
    console.error(`  [vitest-shard ${f.label}] status ${f.status} — ${f.files.length} file(s)`);
    for (const file of f.files.slice(0, MAX_LISTED)) console.error(`      ${file}`);
    if (f.files.length > MAX_LISTED) console.error(`      … +${f.files.length - MAX_LISTED} more in this batch`);
  }
  console.error('\nEvery batch ran. The list above is the COMPLETE set of failures.');
  process.exit(1);
}

console.log(`\nVitest sharded run complete — all ${batches.length} batch(es) passed.`);
