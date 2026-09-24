/** Reproducible local Coach receipt for pure runtime and planning checks.
 * No application boot, environment loading, network or provider invocation.
 * Nonzero acceptance status stays nonzero; known REDs never become a green badge.
 * Captures actual command exits and hashes the reviewed changed source/artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const packet = fileURLToPath(new URL('../', import.meta.url));
const prefix = 'docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/';
const runtime = ['astra.progress-keys.test.mjs', 'astra.readback-validation.test.mjs',
  'astra.acceptance.red.test.mjs', 'astra.strict-payload.test.mjs'].map(name => `${prefix}tests/${name}`);
runtime.push('backend/tests/unit/coachWorkoutResultVerifier.test.mjs', 'backend/tests/unit/coachProgressEvidence.test.mjs');
const runs = [];
for (const [id, tests] of [['runtime', runtime], ['plan', [`${prefix}tests/review-integration.test.mjs`]]]) {
  const args = ['--test', ...tests];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000 });
  const output = (result.stdout || '') + (result.stderr || '');
  const log = `evidence/astra-${id}-tests.log`;
  fs.writeFileSync(path.join(packet, log), output);
  runs.push({ id, command: ['node', ...args], exitCode: result.status, signal: result.signal,
    error: result.error?.message || null, log,
    tests: Number(output.match(/^# tests (\d+)/m)?.[1] ?? 0),
    pass: Number(output.match(/^# pass (\d+)/m)?.[1] ?? 0),
    fail: Number(output.match(/^# fail (\d+)/m)?.[1] ?? 0),
    failedTests: [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]),
  });
}
const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const head = git(['rev-parse', 'HEAD']);
const diff = git(['diff', '--check']);
const sourceFiles = [
  'backend/services/workout/coachStrictWorkoutPayload.mjs',
  'backend/services/workout/aiWorkoutDailyFormPayloadService.mjs',
  'backend/services/ai/coachWorkoutResultVerifier.mjs',
  'backend/services/ai/coachProgressEvidence.mjs',
  'backend/services/ai/coachIntentService.mjs',
  'frontend/src/components/WorkoutLogger/useWorkoutLoggerDictation.ts',
  'frontend/src/components/WorkoutLogger/useWorkoutLoggerDictation.provenance.test.tsx',
  'frontend/src/hooks/useCoachCommand.ts', 'frontend/src/hooks/coachInputOrigin.ts',
  ...fs.readdirSync(packet).filter(name => /^(1[1-9]|2[0-2])-.*\.md$|^session-desk-review\.html$/.test(name)).map(name => prefix + name),
  ...fs.readdirSync(path.join(packet, 'tests')).filter(name => /^(astra|dashboard|review-integration).*\.mjs$/.test(name)).map(name => `${prefix}tests/${name}`),
];
const hashes = Object.fromEntries(sourceFiles.map(file => [file,
  createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const receipt = { generatedAt: new Date().toISOString(), scope: 'local pure helper and planning checks',
  head: head.status === 0 ? head.stdout.trim() : null, runs,
  diffCheckExit: diff.status, hashes,
  runtimeAcceptance: runs[0].exitCode === 0 && runs[0].tests > 0,
  productionVerified: false,
};
fs.writeFileSync(path.join(packet, 'evidence/astra-current-verification.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ runs: runs.map(({ id, exitCode, tests, pass, fail }) => ({ id, exitCode, tests, pass, fail })), diffCheckExit: diff.status }));
process.exitCode = runs.every(run => run.exitCode === 0 && run.tests > 0) && diff.status === 0 ? 0 : 1;
