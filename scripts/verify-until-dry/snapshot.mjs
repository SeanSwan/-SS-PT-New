#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/snapshot.mjs
 * PURPOSE: Bind evidence to committed, staged, dirty, untracked, and scope state.
 * SECURITY: Never follow an untracked symlink outside the repository while hashing.
 */

import { execFileSync } from 'node:child_process';
import { closeSync, constants as fsConstants, existsSync, fstatSync, lstatSync, openSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { canonicalJson, sha256 } from './ledger.mjs';

function git(cwd, args, encoding = 'utf8') {
  return execFileSync('git', args, {
    cwd,
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

function gitOptional(cwd, args) {
  try { return git(cwd, args).trim(); } catch { return null; }
}

function zeroList(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function hashRegularFile(absolute, relative) {
  const before = lstatSync(absolute);
  if (!before.isFile()) throw new Error(`tracked file is not regular: ${relative}`);
  const fd = openSync(absolute, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = fstatSync(fd);
    const after = lstatSync(absolute);
    if (!after.isFile() || opened.ino !== after.ino || opened.size !== after.size ||
        (process.platform !== 'win32' && opened.dev !== after.dev)) {
      throw new Error(`tracked file changed during hashing: ${relative}`);
    }
    return sha256(readFileSync(fd));
  } finally { closeSync(fd); }
}

function hashTracked(cwd, stageRows) {
  const entries = stageRows.map((row) => {
    const separator = row.indexOf('\t');
    const metadata = separator < 0 ? [] : row.slice(0, separator).split(' ');
    const relative = separator < 0 ? '' : row.slice(separator + 1);
    const mode = metadata[0];
    if (metadata.length !== 3 || !/^\d{6}$/.test(mode) || !relative) {
      throw new Error(`Cannot parse tracked index row: ${row}`);
    }
    if (mode === '160000') throw new Error('Submodule verification is unsupported and therefore UNPROVEN');
    const absolute = resolve(cwd, relative);
    if (!existsSync(absolute)) return { path: relative.replace(/\\/g, '/'), mode, state: 'deleted' };
    const hash = mode === '120000' ? sha256(`symlink:${readlinkSync(absolute)}`) : hashRegularFile(absolute, relative);
    return { path: relative.replace(/\\/g, '/'), mode, hash };
  });
  return sha256(canonicalJson(entries));
}

function hashUntracked(cwd, relativeFiles) {
  const root = resolve(cwd);
  return relativeFiles.map((relative) => {
    const absolute = resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error(`untracked path escapes repository: ${relative}`);
    }
    const stat = lstatSync(absolute);
    let content;
    if (stat.isSymbolicLink()) content = `symlink:${readlinkSync(absolute)}`;
    else {
      const fd = openSync(absolute, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
      try {
        const opened = fstatSync(fd);
        const after = lstatSync(absolute);
        if (!after.isFile() || opened.ino !== after.ino || opened.size !== after.size ||
            (process.platform !== 'win32' && opened.dev !== after.dev)) {
          throw new Error(`untracked file changed during hashing: ${relative}`);
        }
        content = readFileSync(fd);
      } finally { closeSync(fd); }
    }
    return { path: relative.replace(/\\/g, '/'), hash: sha256(content) };
  });
}

export function captureSnapshot({ cwd, scopeContract = {} }) {
  const headSha = git(cwd, ['rev-parse', 'HEAD']).trim();
  const stageRows = zeroList(git(cwd, ['ls-files', '--stage', '-z'], 'buffer'));
  const unstaged = git(cwd, ['diff', '--binary', 'HEAD']);
  const staged = git(cwd, ['diff', '--cached', '--binary', 'HEAD']);
  const untrackedFiles = zeroList(git(
    cwd,
    ['ls-files', '--others', '--exclude-standard', '-z'],
    'buffer',
  ));
  const untracked = hashUntracked(cwd, untrackedFiles);
  const scopeHash = sha256(canonicalJson(scopeContract));
  const material = {
    headSha,
    unstagedHash: sha256(unstaged),
    stagedHash: sha256(staged),
    untracked,
    trackedHash: hashTracked(cwd, stageRows),
    executionIdentity: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      git: git(cwd, ['--version']).trim(),
      autocrlf: gitOptional(cwd, ['config', '--get', 'core.autocrlf']),
      symlinks: gitOptional(cwd, ['config', '--get', 'core.symlinks']),
      filemode: gitOptional(cwd, ['config', '--get', 'core.filemode']),
    },
  };
  return {
    ...material,
    scopeHash,
    sourceHash: sha256(canonicalJson(material)),
  };
}

export function compareSnapshots(expected, actual) {
  const reasons = [];
  if (expected?.headSha !== actual?.headSha) reasons.push('head-sha-changed');
  if (expected?.sourceHash !== actual?.sourceHash) reasons.push('source-tree-changed');
  if (expected?.scopeHash !== actual?.scopeHash) reasons.push('scope-contract-changed');
  return { current: reasons.length === 0, reasons };
}
