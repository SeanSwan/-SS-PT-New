/** Build an exact, hash-bound review packet without making external calls. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCRIPT_DIR = join('scripts', 'classroom-hermes');
const PREP_DIR = join('docs', 'ai-workflow', 'brainstorms', 'classroom-copilot-2026-08-15', 'mac-prep');
const ALLOWED_EXTENSIONS = /\.(?:mjs|md|yaml|command)$/iu;

function walk(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (ALLOWED_EXTENSIONS.test(path)) files.push(path);
  }
  return files;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function assertNoHighConfidenceSecret(text, label) {
  const shapes = [
    /sk-or-v1-[A-Za-z0-9_-]{20,}/u,
    /\bBearer\s+[A-Za-z0-9._~+/-]{24,}/iu,
    /\b(?:api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9._~+/-]{24,}/iu,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  ];
  if (shapes.some((pattern) => pattern.test(text))) {
    throw new Error(`secret-shape-blocked:${label}`);
  }
}

export function buildReviewPacket(repoRoot) {
  const files = [
    ...walk(join(repoRoot, SCRIPT_DIR)),
    ...walk(join(repoRoot, PREP_DIR)),
  ].sort((a, b) => relative(repoRoot, a).localeCompare(relative(repoRoot, b)));

  const parts = [
    '# Classroom Hermes Mac Preparation — Exact Hostile Review Packet',
    '',
    'Scope: public/synthetic implementation only. No real child data, credential, or live Mac evidence is included.',
    'Treat the privacy broker, target Mac, school policy, and 5090 endpoint as UNPROVEN unless an exact artifact below proves otherwise.',
    'Review every exact file. Findings require severity, file/line, failure path, and smallest defensible repair.',
    '',
    `Exact file count: ${files.length}`,
    '',
  ];

  const receipts = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const label = relative(repoRoot, file).replaceAll('\\', '/');
    assertNoHighConfidenceSecret(content, label);
    const hash = sha256(content);
    receipts.push({ file: label, sha256: hash, bytes: Buffer.byteLength(content) });
    parts.push(
      `## BEGIN EXACT FILE: ${label}`,
      `SHA-256: ${hash}`,
      '',
      '```text',
      content.replace(/```/gu, '``\u200b`'),
      '```',
      `## END EXACT FILE: ${label}`,
      '',
    );
  }

  const text = `${parts.join('\n')}\n`;
  return {
    text,
    fileCount: files.length,
    bytes: Buffer.byteLength(text),
    sha256: sha256(text),
    receipts,
  };
}

function parseOutput(args) {
  const index = args.indexOf('--out');
  if (index === -1) return null;
  if (!args[index + 1]) throw new Error('--out requires an exact file path');
  return resolve(args[index + 1]);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const packet = buildReviewPacket(process.cwd());
    const output = parseOutput(process.argv.slice(2));
    if (output) {
      writeFileSync(output, packet.text, { encoding: 'utf8', flag: 'wx' });
      process.stdout.write(`${JSON.stringify({ output, fileCount: packet.fileCount, bytes: packet.bytes, sha256: packet.sha256 })}\n`);
    } else {
      process.stdout.write(packet.text);
    }
  } catch (error) {
    process.stderr.write(`BLOCKED: ${error.message}\n`);
    process.exitCode = 2;
  }
}

