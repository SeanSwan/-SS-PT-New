/**
 * @file fenced-runner.mjs
 * @description Reconstructs exact dirty Git state in a disposable worktree and runs gates there.
 *
 * Safety invariants: the source checkout is read-only, fence paths are constrained to
 * the OS temp directory, commands are argv-only with shell disabled, and a source hash
 * mismatch before or after any gate invalidates the complete run.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { captureSnapshot } from './snapshot.mjs';

const MAX_OUTPUT = 4 * 1024 * 1024;

function git(cwd, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    maxBuffer: MAX_OUTPUT,
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
  }
  return result.stdout;
}

function within(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function safeUntrackedPaths(repoRoot) {
  const raw = git(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
  return raw.split('\0').filter(Boolean).map((path) => {
    const source = resolve(repoRoot, path);
    if (!within(repoRoot, source)) throw new Error(`Untracked path escapes repository: ${path}`);
    if (lstatSync(source).isSymbolicLink()) throw new Error(`Untracked symlink is not fence-safe: ${path}`);
    if (!lstatSync(source).isFile()) throw new Error(`Unsupported untracked entry: ${path}`);
    return { path, source };
  });
}

function applyPatch(fencePath, patch, staged) {
  if (!patch.length) return;
  // --index updates both the index and worktree. --cached would leave the
  // worktree at HEAD and manufacture an inverse unstaged change.
  git(fencePath, ['apply', '--binary', '--whitespace=nowarn', ...(staged ? ['--index'] : []), '-'], {
    input: patch,
    encoding: null,
  });
}

/** Materialize the precise HEAD/index/worktree/untracked state represented by snapshot. */
export function createFence({ repoRoot, snapshot, scopeContract = {}, prefix = 'verify-until-dry-' }) {
  const canonicalRoot = realpathSync(repoRoot);
  const parent = mkdtempSync(join(tmpdir(), prefix));
  const fencePath = join(parent, 'worktree');
  if (!within(tmpdir(), fencePath)) throw new Error('Fence path must stay under the OS temp directory');

  try {
    git(canonicalRoot, ['worktree', 'add', '--detach', fencePath, snapshot.headSha]);
    const staged = git(canonicalRoot, ['diff', '--cached', '--binary'], { encoding: null });
    const unstaged = git(canonicalRoot, ['diff', '--binary'], { encoding: null });
    applyPatch(fencePath, staged, true);
    applyPatch(fencePath, unstaged, false);
    for (const item of safeUntrackedPaths(canonicalRoot)) {
      const target = resolve(fencePath, item.path);
      if (!within(fencePath, target)) throw new Error(`Fence target escapes worktree: ${item.path}`);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(item.source, target);
    }
    const fenced = captureSnapshot({ cwd: fencePath, scopeContract });
    if (fenced.sourceHash !== snapshot.sourceHash) {
      const fields = ['headSha', 'statusHash', 'unstagedHash', 'stagedHash'];
      const mismatches = fields.filter((field) => fenced[field] !== snapshot[field]);
      if (JSON.stringify(fenced.untracked) !== JSON.stringify(snapshot.untracked)) mismatches.push('untracked');
      throw new Error(`Fence reconstruction does not match source hash: ${mismatches.join(', ')}`);
    }
    return Object.freeze({ id: randomUUID(), path: fencePath, parent, sourceRoot: canonicalRoot });
  } catch (error) {
    try { git(canonicalRoot, ['worktree', 'remove', '--force', fencePath]); } catch { /* best effort */ }
    rmSync(parent, { recursive: true, force: true });
    throw error;
  }
}

/** Remove only a validated fence created beneath the OS temp directory. */
export function disposeFence(fence) {
  if (!fence || !within(tmpdir(), fence.parent) || !within(fence.parent, fence.path)) {
    throw new Error('Refusing to remove an untrusted fence path');
  }
  try { git(fence.sourceRoot, ['worktree', 'remove', '--force', fence.path]); } finally {
    rmSync(fence.parent, { recursive: true, force: true });
  }
}

export function redactOutput(value) {
  return String(value)
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_]+/g, '<REDACTED-KEY>')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<REDACTED-JWT>')
    .replace(/\b(?:token|password|secret|api[_-]?key)\s*[=:]\s*\S+/gi, '$1=<REDACTED>');
}

function outputHash(stdout, stderr) {
  return createHash('sha256').update(`${stdout}\0${stderr}`).digest('hex');
}

export function executeCommand(spec) {
  return new Promise((resolvePromise) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    const chunks = { stdout: [], stderr: [] };
    let size = 0;
    const collect = (name) => (chunk) => {
      size += chunk.length;
      if (size <= MAX_OUTPUT) chunks[name].push(chunk);
      else child.kill();
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    const timer = setTimeout(() => child.kill(), spec.timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolvePromise({ code: 1, stdout: '', stderr: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({
        code: size > MAX_OUTPUT ? 1 : (code ?? 1),
        stdout: Buffer.concat(chunks.stdout).toString('utf8'),
        stderr: size > MAX_OUTPUT ? 'Output exceeded safety limit' : Buffer.concat(chunks.stderr).toString('utf8'),
      });
    });
  });
}

/** Run gates sequentially and invalidate all evidence if the fenced source moves. */
export async function runGates({ fencePath, expectedSourceHash, gates, scopeContract = {}, capture, execute = executeCommand }) {
  const inspect = capture ?? (() => captureSnapshot({ cwd: fencePath, scopeContract }));
  if (inspect().sourceHash !== expectedSourceHash) throw new Error('Fence mutated before gate execution');
  const results = [];
  for (const gate of gates) {
    const raw = await execute({ ...gate, cwd: resolve(fencePath, gate.cwd), shell: false });
    const stdout = redactOutput(raw.stdout);
    const stderr = redactOutput(raw.stderr);
    results.push(Object.freeze({
      gateId: gate.id,
      status: raw.code === 0 ? 'passed' : 'failed',
      exitCode: raw.code,
      stdout,
      stderr,
      outputHash: outputHash(stdout, stderr),
    }));
    if (inspect().sourceHash !== expectedSourceHash) throw new Error(`Fence mutated during gate: ${gate.id}`);
  }
  return Object.freeze(results);
}
