/**
 * @file fixer-policy.mjs
 * @description Pure policy gate for bounded, allowlisted repair proposals.
 */
import { isAbsolute } from 'node:path';

const SAFE_PATH = /^(?!.*(?:^|[\\/])\.\.(?:[\\/]|$)).+/;

function allowedPath(path, allowlist) {
  return allowlist.some((rule) => {
    const normalized = rule.replaceAll('\\', '/');
    if (normalized.endsWith('/**')) return path.startsWith(normalized.slice(0, -2));
    return path === normalized;
  });
}

function reject(reasons, fileCount, netLines) {
  return Object.freeze({ allowed: false, reasons: Object.freeze(reasons), fileCount, netLines });
}

export function validateFixProposal(input = {}) {
  const reasons = [];
  const files = Array.isArray(input.files) ? input.files : [];
  const allowlist = Array.isArray(input.allowlist) ? input.allowlist : [];
  const tier = input.tier;
  if (!Number.isInteger(tier) || tier < 0 || tier > 3) reasons.push('invalid-risk-tier');
  if (!input.fixer || input.fixer === input.reviewer) reasons.push('fixer-must-be-independent-from-reviewer');
  if (allowlist.length === 0) reasons.push('empty-path-allowlist');

  let netLines = 0;
  for (const file of files) {
    const path = String(file?.path ?? '').replaceAll('\\', '/');
    const added = Number(file?.added);
    const deleted = Number(file?.deleted);
    if (!path || isAbsolute(path) || !SAFE_PATH.test(path)) reasons.push(`unsafe-path:${path || '(empty)'}`);
    else if (!allowedPath(path, allowlist)) reasons.push(`outside-allowlist:${path}`);
    if (!Number.isInteger(added) || added < 0 || !Number.isInteger(deleted) || deleted < 0) {
      reasons.push(`invalid-line-count:${path}`);
    } else netLines += added + deleted;
    if (file?.deletesTests) reasons.push(`test-deletion-forbidden:${path}`);
  }

  if (tier === 3) {
    const approval = input.ownerApproval;
    const valid = approval?.scopeHash === input.scopeHash &&
      Number.isInteger(approval?.maxFiles) && approval.maxFiles >= files.length &&
      Number.isInteger(approval?.maxNetLines) && approval.maxNetLines >= netLines;
    if (!valid) reasons.push('tier-3-owner-approval-required');
  } else if (Number.isInteger(tier)) {
    if (files.length > input.config.fixer.maxFiles[tier]) reasons.push('file-budget-exceeded');
    if (netLines > input.config.fixer.maxNetLines[tier]) reasons.push('line-budget-exceeded');
  }
  return reasons.length ? reject(reasons, files.length, netLines) :
    Object.freeze({ allowed: true, reasons: Object.freeze([]), fileCount: files.length, netLines });
}
