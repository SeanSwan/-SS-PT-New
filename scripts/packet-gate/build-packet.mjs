#!/usr/bin/env node
/**
 * build-packet.mjs — assemble a review packet whose code blocks are extracted, never typed.
 * ==========================================================================================
 * THE POINT: the gate refuses hand-typed code (R3). This makes NOT hand-typing it the cheapest
 * path. The blueprint's own top-ranked failure mode is operators routing around an expensive gate,
 * and the only durable defense is to make compliance easier than the bypass — not to add locks.
 *
 * It also removes a whole class of mistake this author made by hand: `split('\n')` on a file ending
 * in a newline yields a phantom final element, so a 257-line file gets cited as `lines=1-258` and
 * R3 correctly refuses the packet. Here the line count is computed by the SAME normalization R3
 * verifies against, so a generated packet cannot disagree with the checker about arithmetic.
 *
 * Usage:
 *   node scripts/packet-gate/build-packet.mjs --out out/packet.md \
 *     --remit "Hostile review of X. Attack it: …" \
 *     --file scripts/packet-gate.mjs \
 *     --file scripts/packet-gate/checks.mjs:1-120
 *
 * Then ALWAYS run the gate before sending:
 *   node scripts/packet-gate.mjs --document out/packet.md
 *
 * @module packet-gate/build-packet
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The SAME normalization checks.mjs uses to verify — imported, not re-typed. Divergence here is a
 *  self-inflicted R3, and a local copy of a normalizer is how three of them drifted already. */
const normLines = (text) => normalizeEol(text).replace(/\n$/, '').split('\n');

const LANG_BY_EXT = {
  '.mjs': 'js', '.js': 'js', '.cjs': 'js', '.ts': 'ts', '.tsx': 'tsx', '.jsx': 'jsx',
  '.json': 'json', '.sh': 'bash', '.py': 'python', '.sql': 'sql', '.css': 'css', '.html': 'html',
};

function parseArgs(argv) {
  const a = { files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const v = argv[i + 1];
    if (argv[i] === '--out') { a.out = v; i += 1; }
    else if (argv[i] === '--remit') { a.remit = v; i += 1; }
    else if (argv[i] === '--remit-file') { a.remitFile = v; i += 1; }
    else if (argv[i] === '--file') { a.files.push(v); i += 1; }
  }
  return a;
}

/** `path/to/file.mjs` or `path/to/file.mjs:10-80`. */
function parseSpec(spec) {
  const m = /^(.*?)(?::(\d+)-(\d+))?$/.exec(spec);
  return { file: m[1], start: m[2] ? Number(m[2]) : null, end: m[3] ? Number(m[3]) : null };
}

const args = parseArgs(process.argv.slice(2));
if (!args.out || !args.files.length || (!args.remit && !args.remitFile)) {
  console.error('usage: build-packet.mjs --out <path.md> (--remit "…" | --remit-file <path>) --file <path[:start-end]> [--file …]');
  process.exit(2);
}

const remit = args.remit ?? readFileSync(path.resolve(ROOT, args.remitFile), 'utf8').trim();
const parts = ['## Remit', '', remit, '', '## Artifact', ''];

for (const spec of args.files) {
  const { file, start, end } = parseSpec(spec);
  const abs = path.resolve(ROOT, file);
  if (!existsSync(abs)) {
    console.error(`build-packet: file not found: ${file}`);
    process.exit(2);
  }
  const lines = normLines(readFileSync(abs, 'utf8'));
  const from = start ?? 1;
  const to = end ?? lines.length;
  if (from < 1 || to > lines.length || to < from) {
    console.error(`build-packet: ${file} has ${lines.length} lines; requested ${from}-${to}`);
    process.exit(2);
  }
  const rel = path.relative(ROOT, abs).replaceAll('\\', '/');
  const lang = LANG_BY_EXT[path.extname(abs)] ?? '';
  // Verbatim slice. Nothing is reformatted, re-indented, or "improved" on the way in — that is the
  // entire contract, and R3 will re-extract and diff it.
  parts.push(`\`\`\`${lang} path=${rel} lines=${from}-${to}`, lines.slice(from - 1, to).join('\n'), '```', '');
}

const doc = parts.join('\n');
const outAbs = path.resolve(ROOT, args.out);
mkdirSync(path.dirname(outAbs), { recursive: true });
writeFileSync(outAbs, doc);

console.log(`wrote ${path.relative(ROOT, outAbs).replaceAll('\\', '/')}  (${doc.length.toLocaleString()} chars, ${args.files.length} cited block(s))`);
console.log(`next:  node scripts/packet-gate.mjs --document ${args.out}`);
