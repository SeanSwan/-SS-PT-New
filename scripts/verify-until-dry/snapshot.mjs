#!/usr/bin/env node
/**
 * FILE: scripts/verify-until-dry/snapshot.mjs
 * PURPOSE: Bind evidence to committed, staged, dirty, untracked, and scope state.
 * SECURITY: Never follow an untracked symlink outside the repository while hashing.
 */

import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
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

function zeroList(buffer) {
  return buffer.toString('utf8').split('\0').filter(Boolean);
}

function hashUntracked(cwd, relativeFiles) {
  const root = resolve(cwd);
  return relativeFiles.map((relative) => {
    const absolute = resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error(`untracked path escapes repository: ${relative}`);
    }
    const stat = lstatSync(absolute);
    const content = stat.isSymbolicLink()
      ? `symlink:${readlinkSync(absolute)}`
      : readFileSync(absolute);
    return { path: relative.replace(/\\/g, '/'), hash: sha256(content) };
  });
}

export function captureSnapshot({ cwd, scopeContract = {} }) {
  const headSha = git(cwd, ['rev-parse', 'HEAD']).trim();
  const status = git(cwd, ['status', '--porcelain=v1', '-z'], 'buffer');
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
    statusHash: sha256(status),
    unstagedHash: sha256(unstaged),
    stagedHash: sha256(staged),
    untracked,
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
