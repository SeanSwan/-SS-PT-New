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
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { captureSnapshot } from './snapshot.mjs';

const MAX_OUTPUT = 4 * 1024 * 1024;
const GIT_TIMEOUT_MS = 30_000;
const ISSUED_FENCES = new Set();
const SAFE_ENV_KEYS = Object.freeze([
  'CI', 'COMSPEC', 'LANG', 'LC_ALL', 'PATH', 'PATHEXT', 'SYSTEMROOT',
  'TEMP', 'TMP', 'TMPDIR', 'WINDIR',
]);

function git(cwd, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    maxBuffer: MAX_OUTPUT,
    timeout: GIT_TIMEOUT_MS,
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

function fenceKey(fence) {
  return `${resolve(fence.parent)}\0${resolve(fence.path)}\0${resolve(fence.sourceRoot)}`;
}

function attachDependencies(sourceRoot, fencePath, links) {
  for (const relativePath of ['node_modules', 'frontend/node_modules', 'backend/node_modules']) {
    const source = resolve(sourceRoot, relativePath);
    const target = resolve(fencePath, relativePath);
    if (!existsSync(source) || existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');
    links.push(target);
  }
}

function detachDependencies(links = []) {
  for (const target of [...links].reverse()) {
    if (existsSync(target)) unlinkSync(target);
  }
}

function safeUntrackedPaths(repoRoot) {
  const raw = git(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
  return raw.split('\0').filter(Boolean).map((path) => {
    const source = resolve(repoRoot, path);
    if (!within(repoRoot, source)) throw new Error(`Untracked path escapes repository: ${path}`);
    const before = lstatSync(source);
    if (before.isSymbolicLink()) throw new Error(`Untracked symlink is not fence-safe: ${path}`);
    if (!before.isFile()) throw new Error(`Unsupported untracked entry: ${path}`);
    const fd = openSync(source, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    try {
      const opened = fstatSync(fd);
      const after = lstatSync(source);
      if (!after.isFile() || opened.ino !== after.ino || opened.size !== after.size ||
          (process.platform !== 'win32' && opened.dev !== after.dev)) {
        throw new Error(`Untracked file changed during safe open: ${path}`);
      }
      return { path, content: readFileSync(fd) };
    } finally { closeSync(fd); }
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

function mirrorTrackedBytes(sourceRoot, fencePath) {
  const paths = git(sourceRoot, ['ls-files', '-z'], { encoding: null })
    .toString('utf8').split('\0').filter(Boolean);
  for (const path of paths) {
    const source = resolve(sourceRoot, path);
    const target = resolve(fencePath, path);
    if (!within(sourceRoot, source) || !within(fencePath, target)) {
      throw new Error(`Tracked path escapes repository: ${path}`);
    }
    if (!existsSync(source)) {
      try { lstatSync(target); unlinkSync(target); } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      continue;
    }
    const sourceStat = lstatSync(source);
    if (sourceStat.isSymbolicLink()) {
      try { lstatSync(target); unlinkSync(target); } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      symlinkSync(readlinkSync(source), target);
      continue;
    }
    if (!sourceStat.isFile()) throw new Error(`Unsupported tracked entry: ${path}`);
    const fd = openSync(source, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    try {
      const opened = fstatSync(fd);
      const after = lstatSync(source);
      if (!after.isFile() || opened.ino !== after.ino || opened.size !== after.size ||
          (process.platform !== 'win32' && opened.dev !== after.dev)) {
        throw new Error(`Tracked file changed during safe open: ${path}`);
      }
      writeFileSync(target, readFileSync(fd));
    } finally { closeSync(fd); }
  }
}

/** Materialize the precise HEAD/index/worktree/untracked state represented by snapshot. */
export function createFence({ repoRoot, snapshot, scopeContract = {}, prefix = 'verify-until-dry-' }) {
  const canonicalRoot = realpathSync(repoRoot);
  const parent = mkdtempSync(join(tmpdir(), prefix));
  const fencePath = join(parent, 'worktree');
  const dependencyLinks = [];
  if (!within(tmpdir(), fencePath)) throw new Error('Fence path must stay under the OS temp directory');

  try {
    git(canonicalRoot, ['worktree', 'add', '--detach', fencePath, snapshot.headSha]);
    const staged = git(canonicalRoot, ['diff', '--cached', '--binary'], { encoding: null });
    const unstaged = git(canonicalRoot, ['diff', '--binary'], { encoding: null });
    applyPatch(fencePath, staged, true);
    applyPatch(fencePath, unstaged, false);
    mirrorTrackedBytes(canonicalRoot, fencePath);
    for (const item of safeUntrackedPaths(canonicalRoot)) {
      const target = resolve(fencePath, item.path);
      if (!within(fencePath, target)) throw new Error(`Fence target escapes worktree: ${item.path}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, item.content, { flag: 'wx' });
    }
    attachDependencies(canonicalRoot, fencePath, dependencyLinks);
    const fenced = captureSnapshot({ cwd: fencePath, scopeContract });
    if (fenced.sourceHash !== snapshot.sourceHash) {
      const fields = ['headSha', 'unstagedHash', 'stagedHash', 'trackedHash'];
      const mismatches = fields.filter((field) => fenced[field] !== snapshot[field]);
      if (JSON.stringify(fenced.untracked) !== JSON.stringify(snapshot.untracked)) mismatches.push('untracked');
      throw new Error(`Fence reconstruction does not match source hash: ${mismatches.join(', ')}`);
    }
    const fence = Object.freeze({ id: randomUUID(), path: fencePath, parent,
      sourceRoot: canonicalRoot, dependencyLinks: Object.freeze([...dependencyLinks]) });
    ISSUED_FENCES.add(fenceKey(fence));
    return fence;
  } catch (error) {
    detachDependencies(dependencyLinks);
    try { git(canonicalRoot, ['worktree', 'remove', '--force', fencePath]); } catch { /* best effort */ }
    rmSync(parent, { recursive: true, force: true });
    throw error;
  }
}

/** Remove only a validated fence created beneath the OS temp directory. */
export function disposeFence(fence) {
  const temp = resolve(tmpdir());
  const parent = fence?.parent ? resolve(fence.parent) : '';
  const expectedPath = parent ? resolve(parent, 'worktree') : '';
  if (!fence || parent === temp || dirname(parent) !== temp ||
      !/verify-until-dry-[^\\/]+$/.test(parent) || resolve(fence.path) !== expectedPath ||
      !ISSUED_FENCES.has(fenceKey(fence))) {
    throw new Error('Refusing to remove an untrusted fence path');
  }
  detachDependencies(fence.dependencyLinks);
  git(fence.sourceRoot, ['worktree', 'remove', '--force', fence.path]);
  rmSync(fence.parent, { recursive: true, force: true });
  ISSUED_FENCES.delete(fenceKey(fence));
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
    const env = {};
    for (const key of [...SAFE_ENV_KEYS, ...(spec.allowEnv ?? [])]) {
      const actual = Object.keys(process.env).find((candidate) => candidate.toUpperCase() === key.toUpperCase());
      if (actual && process.env[actual] !== undefined) env[actual] = process.env[actual];
    }
    Object.assign(env, spec.env ?? {});
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env,
      detached: process.platform !== 'win32',
      shell: false,
      windowsHide: true,
    });
    const chunks = { stdout: [], stderr: [] };
    let size = 0;
    let terminating = false;
    const terminate = () => {
      if (terminating) return;
      terminating = true;
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      else {
        try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
        setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* exited */ } }, 2_000).unref();
      }
    };
    const collect = (name) => (chunk) => {
      size += chunk.length;
      if (size <= MAX_OUTPUT) chunks[name].push(chunk);
      else terminate();
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    const timer = setTimeout(terminate, spec.timeoutMs);
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
