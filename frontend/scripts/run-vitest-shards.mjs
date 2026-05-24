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
 *
 * Optional env:
 *   VITEST_SHARD_SIZE=5
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
const extraArgs = process.argv.slice(2);
const reporterProvided = extraArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='));

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
    process.exit(result.status || 1);
  }
}

console.log('\nVitest sharded run complete.');
