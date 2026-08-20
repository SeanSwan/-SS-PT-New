/**
 * Hostile round: attack the paths that unit tests only exercised through
 * injected doubles. An injected `exec` proves my branching; it proves nothing
 * about what real git actually returns.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stagedGitignored, decidePretool } from '../../privacy-boundary-gate.mjs';

let failures = 0;
const expect = (label, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!cond) failures += 1;
};

// ---- a REAL repository, not a stubbed exec -------------------------------
const repo = mkdtempSync(join(tmpdir(), 'privgit-'));
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
git('init', '-q', '.');
git('config', 'user.email', 'x@example.com');
git('config', 'user.name', 'x');
writeFileSync(join(repo, '.gitignore'), 'secrets/\n*.local\n', 'utf8');
writeFileSync(join(repo, 'ok.txt'), 'fine', 'utf8');
git('add', '.gitignore', 'ok.txt');

expect('nothing ignored staged -> clean (real git check-ignore exits 1)',
  stagedGitignored(repo).length === 0, JSON.stringify(stagedGitignored(repo)));

// Force-stage an ignored file, which is the only way this state arises.
mkdirSync(join(repo, 'secrets'), { recursive: true });
writeFileSync(join(repo, 'secrets', 'creds.txt'), 'x', 'utf8');
writeFileSync(join(repo, 'notes.local'), 'x', 'utf8');
git('add', '-f', 'secrets/creds.txt', 'notes.local');

const hits = stagedGitignored(repo);
expect('force-staged ignored files are detected by real git', hits.length === 2, JSON.stringify(hits));

const reason = decidePretool({ tool_input: { command: 'git commit -m "wip"' } }, repo);
expect('pretool blocks the commit', Boolean(reason));
expect('pretool names an offending path', Boolean(reason?.includes('secrets/creds.txt')));

// A commit-shaped command that is NOT git commit must not pay the cost.
expect('non-commit bash is ignored',
  decidePretool({ tool_input: { command: 'echo "git commit" >> notes.md' } }, repo) !== null
    ? false
    : true,
  'a quoted mention still matches the word-boundary regex — see note');

// ---- cwd independence -----------------------------------------------------
// Hooks are spawned by the harness; nothing guarantees cwd is the repo root. A
// gate that only works from the root is a gate that silently stops working.
const REPO_ROOT = resolve('.');
const elsewhere = mkdtempSync(join(tmpdir(), 'elsewhere-'));
const out = execFileSync(process.execPath, [join(REPO_ROOT, 'scripts', 'hooks', 'privacy-boundary-gate.mjs'), '--selftest'], {
  cwd: elsewhere, encoding: 'utf8',
});
expect('selftest runs from a foreign cwd', out.includes('selftest clean'), out.trim());

rmSync(repo, { recursive: true, force: true });
rmSync(elsewhere, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILURE(S)` : '\nhostile round clean');
process.exitCode = failures ? 1 : 0;
