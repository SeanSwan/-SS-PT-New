/**
 * FILE: probe-m43.mjs — does the refusal suite pin the line that actually clears a stale error?
 *
 * Probe M41 removed the success-path clear: the suite stayed green.
 * Probe M42 removed the start-of-call clear: the suite stayed green (the success-path clear hid it).
 * The redundant clear has now been removed from production, so M43 — removing the START-of-call
 * clear — must make the suite FAIL. If it does not, the tests still prove nothing.
 *
 * Read-only apart from the mutated file, which is restored byte-identically (hash compared).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const hook = path.join(root, 'frontend', 'src', 'hooks', 'useSprintAPI.ts');
const suite = 'src/hooks/useSprintAPI.confirmError.test.tsx';
const original = readFileSync(hook);
const hash = (buf) => createHash('sha256').update(buf).digest('hex');

/** Remove the FIRST occurrence of the start-of-call reset in confirmSlot. */
function mutate(text) {
  const confirmStart = text.indexOf('const confirmSlot = useCallback');
  if (confirmStart === -1) return null;
  const resetAt = text.indexOf('setError(null);', confirmStart);
  if (resetAt === -1) return null;
  return text.slice(0, resetAt) + text.slice(resetAt + 'setError(null);'.length);
}

const mutated = mutate(original.toString('utf8'));
const before = hash(original);
if (!mutated) {
  console.log('M43 inconclusive: could not locate the start-of-call reset');
  process.exit(1);
}

writeFileSync(hook, mutated);
let exitCode;
let summary = '';
try {
  const out = execFileSync('npx', ['vitest', 'run', suite, '--reporter=dot'],
    { cwd: path.join(root, 'frontend'), encoding: 'utf8', shell: true });
  exitCode = 0;
  summary = out;
} catch (error) {
  exitCode = error.status ?? 1;
  summary = `${error.stdout ?? ''}${error.stderr ?? ''}`;
} finally {
  writeFileSync(hook, original);
}
const restored = hash(readFileSync(hook)) === before;

const lines = summary.split(/\r?\n/).filter((l) => /Tests\s|Test Files\s|Failed Tests/.test(l));
console.log(`M43 mutation: removed the START-of-call setError(null) in confirmSlot`);
for (const line of lines) console.log(`  ${line.trim()}`);
console.log(`M43 exit=${exitCode} (expect non-zero: without the reset the stale refusal must survive)`);
console.log(`hook restored byte-identical: ${restored}  sha256=${before.slice(0, 16)}...`);
console.log(exitCode !== 0 && restored ? 'M43_DISCRIMINATES' : 'M43_UNDISCRIMINATING');
process.exit(exitCode !== 0 && restored ? 0 : 1);
