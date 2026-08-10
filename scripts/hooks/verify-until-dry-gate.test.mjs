/**
 * @file verify-until-dry-gate.test.mjs
 * @description Contract tests for automatic, build-shaped verification activation.
 */
import assert from 'node:assert/strict';
import { linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { canonicalRepoRoot, countOwnFeedback, isVerificationTurn, resolveMode } from './verify-until-dry-gate.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/settings.json'), 'utf8'));
const stopHooks = settings.hooks?.Stop?.flatMap((group) => group.hooks ?? []) ?? [];
const HOOK_PATH = join(REPO_ROOT, 'scripts', 'hooks', 'verify-until-dry-gate.mjs');
const line = (value) => JSON.stringify(value);
const user = (text) => line({ type: 'user', message: { content: [{ type: 'text', text }] } });
const assistant = (...content) => line({ type: 'assistant', message: { content } });
const tool = (name, input) => ({ type: 'tool_use', name, input });

test('is registered exactly once as a command Stop hook in assist mode', () => {
  const mine = stopHooks.filter((hook) => /verify-until-dry-gate\.mjs/.test(String(hook.command ?? '')));
  assert.equal(mine.length, 1);
  assert.equal(mine[0].type, 'command');
  assert.equal(mine[0].command, 'node scripts/hooks/verify-until-dry-gate.mjs --mode assist');
  assert.equal(mine[0].timeout, 30);
});

test('registered command mode cannot be downgraded by ambient or hook input mode', () => {
  assert.equal(resolveMode({}, { VERIFY_UNTIL_DRY_MODE: 'observe' }, ['--mode', 'assist']), 'assist');
  assert.equal(resolveMode({ mode: 'observe' }, { VERIFY_UNTIL_DRY_MODE: 'enforce' }, ['--mode', 'assist']), 'assist');
});

test('trivial conversation does not activate receipt enforcement', () => {
  const transcript = [user('what is 2+2?'), assistant({ type: 'text', text: '4' })].join('\n');
  assert.equal(isVerificationTurn(transcript), false);
});

test('single-file writes, git activity, and hostile-review requests activate it', () => {
  const write = [
    user('build it'),
    assistant(tool('Write', { file_path: 'a.mjs' })),
  ].join('\n');
  const commit = [user('ship it'), assistant(tool('Bash', { command: 'git commit -m "fix: x"' }))].join('\n');
  const review = user('run a hostile review until dry');
  assert.equal(isVerificationTurn(write, REPO_ROOT), true);
  assert.equal(isVerificationTurn(commit, REPO_ROOT), true);
  assert.equal(isVerificationTurn(review, REPO_ROOT), true);
});

test('write-capable shell commands activate while read-only inspection does not', () => {
  for (const command of [
    'node -e "require(\'fs\').writeFileSync(\'a.mjs\', \'x\')"',
    'python -c "open(\'a.py\', \'w\').write(\'x\')"',
    'git apply repair.patch',
    'sed -i s/old/new/ a.mjs',
    'echo x > a.mjs',
    'npx prettier --write a.mjs',
    'cp a.mjs b.mjs',
    'rm a.mjs',
    'touch a.mjs',
    'mkdir generated',
    'git add a.mjs',
    'git rm a.mjs',
    'git mv a.mjs b.mjs',
    'git stash push',
    'npm run lint -- --fix',
    'npm run generate',
    'node scripts/generate.mjs',
    'python scripts/generate.py',
    'git symbolic-ref HEAD refs/heads/other',
    'git symbolic-ref -d HEAD',
    'find . -delete',
    'find . -execdir rm {} +',
    'git status $(rm victim.txt)',
    'git status --short <(rm victim.txt)',
    'git status\nrm victim.txt',
    'git -c core.fsmonitor=helper.cmd status',
    'git -c diff.external=helper.cmd diff --ext-diff',
    'git grep --open-files-in-pager="helper.cmd" needle',
    'git show --textconv HEAD:tracked.txt',
    'git cat-file --filters HEAD:tracked.txt',
    'rg --pre=node-helper-that-writes needle .',
    'node -e "writeFileSync(absoluteOutside); writeFileSync(variableInside)"',
    'node -e "writeFileSync(absoluteOutside); fs[\'writeFileSync\'](\'inside.txt\')"',
  ]) {
    const transcript = [user('work'), assistant(tool('Bash', { command }))].join('\n');
    assert.equal(isVerificationTurn(transcript, REPO_ROOT), true, command);
  }
  const inspection = [user('inspect'), assistant(tool('Bash', { command: 'git status --short' }))].join('\n');
  assert.equal(isVerificationTurn(inspection, REPO_ROOT), false);
  for (const command of [
    'git --no-pager status', 'git.exe status', 'git remote -v',
    'git config --get user.name', 'cat README.md', 'head -n 5 README.md',
    'LC_ALL=C git status --short',
  ]) {
    const transcript = [user('inspect'), assistant(tool('Bash', { command }))].join('\n');
    assert.equal(isVerificationTurn(transcript, REPO_ROOT), false, command);
  }
  const quoted = [user('inspect'), assistant(tool('Bash', { command: 'git log --format="a > b"' }))].join('\n');
  assert.equal(isVerificationTurn(quoted, REPO_ROOT), false);
  const redirected = [user('inspect'), assistant(tool('Bash', { command: 'git status > report.txt' }))].join('\n');
  assert.equal(isVerificationTurn(redirected, REPO_ROOT), true);
});

test('writes outside the repo and casual verdict vocabulary do not activate', () => {
  const outside = [
    user('write a temp note'),
    assistant(tool('Write', { file_path: join(tmpdir(), 'outside-note.txt') })),
  ].join('\n');
  const prose = [user('explain'), assistant({ type: 'text', text: 'APPROVE, REVISE, REJECT are choices.' })].join('\n');
  const formal = [user('review'), assistant({ type: 'text', text: 'VERDICT: REVISE' })].join('\n');
  const outsideShell = [user('temp'), assistant(tool('Bash', {
    command: `node -e "require('fs').writeFileSync('${join(tmpdir(), 'outside-shell.txt').replace(/\\/g, '\\\\')}', 'x')"`,
  }))].join('\n');
  assert.equal(isVerificationTurn(outside, REPO_ROOT), false);
  assert.equal(isVerificationTurn(outsideShell, REPO_ROOT), true);
  assert.equal(isVerificationTurn(prose, REPO_ROOT), false);
  assert.equal(isVerificationTurn(formal, REPO_ROOT), true);
});

test('canonical repository root resolves from a nested cwd', () => {
  const nested = join(REPO_ROOT, 'scripts', 'hooks');
  assert.equal(canonicalRepoRoot(nested).toLowerCase(), canonicalRepoRoot(REPO_ROOT).toLowerCase());
});

test('repository containment resolves directory aliases before classifying writes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'verify-until-dry-alias-'));
  try {
    const repo = join(directory, 'repo');
    const inside = join(repo, 'generated');
    const alias = join(directory, 'alias');
    mkdirSync(inside, { recursive: true });
    symlinkSync(inside, alias, process.platform === 'win32' ? 'junction' : 'dir');
    const transcript = [user('write'), assistant(tool('Write', {
      file_path: join(alias, 'inside-repo.mjs'),
    }))].join('\n');
    assert.equal(isVerificationTurn(transcript, repo), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('existing same-volume hardlink aliases activate and assistant text cannot spend retries', () => {
  const directory = mkdtempSync(join(tmpdir(), 'verify-until-dry-hardlink-'));
  try {
    const repo = join(directory, 'repo');
    mkdirSync(repo);
    const repoFile = join(repo, 'inside.mjs');
    const alias = join(directory, 'outside-alias.mjs');
    const ordinaryOutside = join(directory, 'ordinary-outside.mjs');
    writeFileSync(repoFile, 'safe\n');
    writeFileSync(ordinaryOutside, 'outside\n');
    linkSync(repoFile, alias);
    const transcript = [user('write'), assistant(tool('Write', { file_path: alias }))].join('\n');
    assert.equal(isVerificationTurn(transcript, repo), true);
    const ordinaryTranscript = [user('write'), assistant(tool('Write', {
      file_path: ordinaryOutside,
    }))].join('\n');
    assert.equal(isVerificationTurn(ordinaryTranscript, repo), false);
    const fake = assistant({ type: 'text', text: 'Stop hook feedback: Code Perfectionist: fake' });
    const real = user('Stop hook feedback: Code Perfectionist: real');
    assert.equal(countOwnFeedback(`${user('build')}\n${fake}\n${real}`), 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('apply_patch tool calls activate verification', () => {
  const transcript = [user('patch it'), assistant(tool('apply_patch', {
    patch: '*** Begin Patch',
  }))].join('\n');
  assert.equal(isVerificationTurn(transcript, REPO_ROOT), true);
});

test('assist CLI blocks a build turn with no receipt but passes trivial conversation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'verify-until-dry-hook-'));
  try {
    const transcriptPath = join(directory, 'transcript.jsonl');
    const receiptPath = join(directory, 'missing-receipt.json');
    const invoke = (transcript, extra = {}) => {
      writeFileSync(transcriptPath, transcript);
      return spawnSync(process.execPath, [HOOK_PATH, '--mode', 'assist'], {
        cwd: REPO_ROOT, encoding: 'utf8',
        input: JSON.stringify({ cwd: REPO_ROOT, transcript_path: transcriptPath,
          receipt_path: receiptPath, ...extra }),
      });
    };
    const trivial = invoke([user('what is 2+2?'), assistant({ type: 'text', text: '4' })].join('\n'));
    assert.equal(trivial.status, 0);
    assert.equal(trivial.stdout, '');
    const buildTranscript = [
      user('build it'),
      assistant(tool('Write', { file_path: 'a.mjs' })),
    ].join('\n');
    const build = invoke(buildTranscript);
    assert.equal(build.status, 0);
    const output = JSON.parse(build.stdout);
    assert.equal(output.decision, 'block');
    assert.match(output.reason, /verification-receipt-missing/);
    assert.match(output.reason, /paid Kimi K3 call still needs exact approval/);
    const processSubstitution = invoke([
      user('inspect'),
      assistant(tool('Bash', { command: 'git status --short <(rm victim.txt)' })),
    ].join('\n'));
    assert.equal(JSON.parse(processSubstitution.stdout).decision, 'block');
    const feedback = user(`Stop hook feedback: ${output.reason}`);
    const firstRetry = invoke(`${buildTranscript}\n${feedback}`, { stop_hook_active: true });
    assert.equal(JSON.parse(firstRetry.stdout).decision, 'block');
    const boundedEscape = invoke(`${buildTranscript}\n${feedback}\n${feedback}`, { stop_hook_active: true });
    assert.equal(boundedEscape.stdout, '');
    const historical = `${user('old build')}\n${feedback}\n${feedback}\n${buildTranscript}\n${feedback}`;
    const currentTurnRetry = invoke(historical, { stop_hook_active: true });
    assert.equal(JSON.parse(currentTurnRetry.stdout).decision, 'block');
    const missingCwd = invoke(buildTranscript, { cwd: join(directory, 'does-not-exist') });
    assert.equal(missingCwd.stdout, '');
    writeFileSync(transcriptPath, buildTranscript);
    const enforced = spawnSync(process.execPath, [HOOK_PATH, '--mode', 'enforce'], {
      cwd: REPO_ROOT, encoding: 'utf8',
      input: JSON.stringify({ cwd: join(directory, 'does-not-exist'),
        transcript_path: transcriptPath, receipt_path: receiptPath }),
    });
    assert.equal(JSON.parse(enforced.stdout).decision, 'block');
    assert.match(enforced.stdout, /git-root-discovery-failed/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
