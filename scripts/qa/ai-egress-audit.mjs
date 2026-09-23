#!/usr/bin/env node
/**
 * ai-egress-audit.mjs — static ratchet for repository-owned AI/harness surfaces.
 *
 * This is intentionally narrower than a firewall. It catches accidental or
 * reviewable repository changes that authorize workspace capture/upload or add
 * an unredacted external transport. It cannot control an arbitrary third-party
 * binary, MCP server, browser extension, or OS process.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const POLICY_PATH = path.join(ROOT, 'config', 'ai-egress-policy.json');
const POLICY = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));

const CODE_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.ts', '.tsx', '.jsx']);
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', 'tmp', 'output', 'out', 'graphify-out',
  'worktrees', 'skills', 'archive', '.understand-anything',
]);
const TEST_SUFFIX = /(?:\.test|\.spec)\.[cm]?[jt]sx?$/i;

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '').toLowerCase();
}

function isUnder(rel, prefix) {
  const value = normalize(rel);
  const base = normalize(prefix).replace(/\/$/, '');
  if (!base) return false;
  if (String(prefix).endsWith('/')) return value === base || value.startsWith(`${base}/`);
  return value === base || value.startsWith(base);
}

export function classifySurface(filePath) {
  const rel = normalize(filePath);
  if (POLICY.harnessConfigFiles.some((file) => rel === normalize(file))) return 'harness-config';
  if ((POLICY.harnessConfigPatterns || []).some((pattern) => new RegExp(pattern, 'i').test(rel))) return 'harness-config';
  if (POLICY.aiTransportPrefixes.some((prefix) => isUnder(rel, prefix))) {
    if (!CODE_EXTENSIONS.has(path.posix.extname(rel))) return 'other';
    if (TEST_SUFFIX.test(rel)) return 'test';
    return 'ai-transport';
  }
  return 'other';
}

function lineNumber(source, index) {
  return source.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function externalTransport(source) {
  if (!/\b(?:fetch(?:ForEgress)?|axios|https?\.request|FormData|openai|anthropic|generative-ai)\b/i.test(source)) return false;
  const urls = [...source.matchAll(/https?:\/\/([^/\s'"`]+)/gi)].map((m) => m[1].toLowerCase());
  if (!urls.length) return false;
  return urls.some((host) => !POLICY.allowedLocalHosts.some((allowed) => host === allowed || host.startsWith(`${allowed}:`)));
}

function firstMatchLine(source, regex) {
  const match = source.match(regex);
  return match?.index == null ? 1 : lineNumber(source, match.index);
}

function finding(ruleId, severity, rel, line, message) {
  return { ruleId, severity, file: normalize(rel), line, message };
}

export function findFindings(filePath, source, policy = POLICY) {
  const rel = normalize(filePath);
  const surface = classifySurface(rel);
  if (surface === 'other' || surface === 'test') return [];
  const text = String(source ?? '');
  const findings = [];
  const allow = new RegExp(`//[^\\n]*${policy.allowMarker.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i');

  if (surface === 'harness-config') {
    for (const rule of policy.blockedConfigPatterns) {
      const regex = new RegExp(rule.regex, 'i');
      const match = text.match(regex);
      if (match) findings.push(finding(rule.id, rule.severity, rel, lineNumber(text, match.index), rule.reason));
    }
    return findings;
  }

  if (!externalTransport(text)) return findings;
  const hasChokepoint = new RegExp(`\\b${policy.requiredRuntimeTransport}\\b`).test(text);
  if (!hasChokepoint && !allow.test(text)) {
    findings.push(finding(
      'raw-external-transport',
      'high',
      rel,
      firstMatchLine(text, /\b(?:fetch(?:ForEgress)?|axios|https?\.request|FormData|openai|anthropic|generative-ai)\b/i),
      `External transport in an AI workflow must use ${policy.requiredRuntimeTransport}.`,
    ));
  }

  const bundle = /\b(?:archiver|git\s+archive|tar(?:\.gz)?|zip|create(?:Read|Write)Stream)\b/i;
  if (bundle.test(text) && !allow.test(text)) {
    findings.push(finding(
      'repository-bundle-egress',
      'critical',
      rel,
      firstMatchLine(text, bundle),
      'AI workflow combines repository/file packaging with external transport; explicit review is required.',
    ));
  }

  const protectedRoot = new RegExp(
    `(?:readFileSync|createReadStream|readdirSync|readFile|git\\s+(?:diff|archive))[^\\n]{0,160}(?:${policy.protectedRoots.map(escapeRegExp).join('|')})`,
    'i',
  );
  if (protectedRoot.test(text) && !allow.test(text)) {
    findings.push(finding(
      'protected-root-egress',
      'critical',
      rel,
      firstMatchLine(text, protectedRoot),
      'AI workflow reads a protected repository root on a file that can send external data.',
    ));
  }

  return findings;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    const file = path.join(dir, entry.name);
    const rel = relative(file);
    if (classifySurface(rel) !== 'other') out.push(file);
  }
  return out;
}

function allFiles() {
  const files = [];
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'CODEBUDDY.md', '.github/copilot-instructions.md', '.mcp.json', '.mcp.local.json']) {
    const file = path.join(ROOT, name);
    if (existsSync(file)) files.push(file);
  }
  for (const dir of ['.claude', '.cursor', '.continue', '.opencode', '.codex', '.codebuddy', 'scripts']) {
    const root = path.join(ROOT, dir);
    if (existsSync(root)) walk(root, files);
  }
  return [...new Set(files)];
}

function stagedFiles() {
  const supplied = process.env.AI_EGRESS_STAGED_FILES;
  if (typeof supplied === 'string') {
    return supplied.split(/\r?\n/).filter(Boolean).map((rel) => path.join(ROOT, rel));
  }
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: ROOT, encoding: 'utf8' });
  return output.split(/\r?\n/).filter(Boolean).map((rel) => path.join(ROOT, rel));
}

export function collectFiles(mode, explicit = []) {
  if (mode === 'all') return allFiles();
  if (mode === 'staged') return stagedFiles();
  return explicit.map((value) => path.isAbsolute(value) ? value : path.join(ROOT, value));
}

export function auditFiles(files) {
  const findings = [];
  let scanned = 0;
  for (const file of files) {
    if (!existsSync(file) || !statSync(file).isFile()) continue;
    const rel = relative(file);
    if (classifySurface(rel) === 'other' || classifySurface(rel) === 'test') continue;
    scanned += 1;
    findings.push(...findFindings(rel, readFileSync(file, 'utf8')));
  }
  return { scanned, findings };
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--all') ? 'all' : args.includes('--staged') ? 'staged' : 'explicit';
  const explicit = args.filter((arg) => !arg.startsWith('--'));
  let files;
  try {
    files = collectFiles(mode, explicit);
  } catch (error) {
    console.error(`[ai-egress] BLOCKED — could not establish audit input: ${error?.message || error}`);
    process.exit(2);
  }
  const result = auditFiles(files);
  if (!result.findings.length) {
    console.log(`[ai-egress] CLEAN — policy v${POLICY.version}; scanned ${result.scanned} harness/AI surface(s).`);
    return;
  }
  console.error(`[ai-egress] BLOCKED — ${result.findings.length} finding(s) across ${result.scanned} surface(s).`);
  for (const item of result.findings) {
    console.error(`  ${item.file}:${item.line} ${item.ruleId} [${item.severity}]`);
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
