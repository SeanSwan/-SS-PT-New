#!/usr/bin/env node
/**
 * Native fallback secret scanner for release verification.
 *
 * This does not replace scripts/scan-secrets.sh for final commit review. It is
 * a no-child-process scanner used by the Windows release verifier so the
 * one-command gate works when Bash cannot be launched from PowerShell.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const skipDirs = new Set([
  '.git',
  '.auth',
  'node_modules',
  'dist',
  'coverage',
  '.playwright-mcp',
  'test-results',
  'playwright-report',
]);

const skipExactFiles = new Set([
  '.env',
  'backend/.env',
  'frontend/.env',
  'frontend/.env.production',
]);

const textExtensions = new Set([
  '.cjs', '.css', '.env', '.example', '.html', '.js', '.json', '.jsx',
  '.md', '.mjs', '.ps1', '.sh', '.sql', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

const patterns = [
  ['stripe-secret', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]{16,}\b/g],
  ['stripe-webhook', /\bwhsec_[A-Za-z0-9_]{16,}\b/g],
  ['stripe-publishable', /\bpk_(?:live|test)_[A-Za-z0-9_]{16,}\b/g],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{20,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g],
  ['database-url', /\bpostgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^/\s]+\/[^\s"']+/gi],
];

const allowlist = [
  [/scripts[\\/]qa[\\/]secret-scan-lite\.mjs$/, /stripe-secret|stripe-webhook|stripe-publishable|google-api-key|jwt|private-key|database-url/],
  [/scripts[\\/]scan-secrets\.sh$/, /private-key/],
];

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function shouldSkipFile(filePath) {
  const rel = relative(filePath);
  if (skipExactFiles.has(rel)) return true;
  const ext = path.extname(filePath).toLowerCase();
  if (!textExtensions.has(ext) && !rel.endsWith('.env.example')) return true;
  const stats = statSync(filePath);
  return stats.size > 1024 * 1024;
}

function isAllowed(filePath, findingName) {
  const rel = relative(filePath);
  return allowlist.some(([filePattern, findingPattern]) => (
    filePattern.test(rel) && findingPattern.test(findingName)
  ));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const files = walk(repoRoot);
const findings = [];
let scanned = 0;
let skipped = 0;

for (const file of files) {
  if (shouldSkipFile(file)) {
    skipped += 1;
    continue;
  }

  scanned += 1;
  const text = readFileSync(file, 'utf8');
  for (const [name, pattern] of patterns) {
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    if (!matches.length || isAllowed(file, name)) continue;
    findings.push({
      file: relative(file),
      name,
      count: matches.length,
    });
  }
}

process.stdout.write('SwanStudios native secret scan\n');
process.stdout.write(`Scanned: ${scanned} files\n`);
process.stdout.write(`Skipped: ${skipped} files\n`);

if (findings.length) {
  process.stdout.write(`Hits: ${findings.length}\n`);
  for (const finding of findings.slice(0, 25)) {
    process.stdout.write(`FAIL ${finding.file} ${finding.name} (${finding.count})\n`);
  }
  process.exit(1);
}

process.stdout.write('Hits: 0\n');
process.stdout.write('CLEAN.\n');
