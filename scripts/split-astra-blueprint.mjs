#!/usr/bin/env node
/**
 * Split an Astra Pro reply into the fable-blueprint-forge numbered doc set.
 *
 * The Forge doctrine (Phase 2) requires the package be a SMALL DOC SET — one
 * directory, numbered files, each ≤~300 lines, so a builder can load them
 * piecemeal. Astra returns one reply with PART A/B/C and `### NN-name.md`
 * headings under PART B; this turns that reply into the real files.
 *
 * FENCE-AWARE (2026-09-19). The first version matched headings anywhere, including
 * inside ``` fenced blocks. The consult packet's own §7 shows the required reply
 * format inside a fence — so the splitter happily parsed the *template* as if it
 * were the reply and exited 0 with a bogus package. A reply that quotes the format
 * spec, or a PART B document that shows a fenced example containing `### 05-slices.md`,
 * would corrupt the split the same way. Headings are now only honoured at fence
 * depth 0.
 *
 * It FAILS LOUDLY if any required section is missing rather than writing a
 * partial package — a silently-incomplete blueprint is worse than none, because
 * a builder will fill the hole with its own judgment and the Forge exists
 * precisely to stop that.
 *
 * Usage:
 *   node scripts/split-astra-blueprint.mjs [--in <reply.md>] [--out-dir <dir>] [--check]
 *     [--mega-blueprint] [--title <name>] [--packet <path>]
 *
 * `--mega-blueprint` requires the extra `### 09-tests.md` document that Mega
 * Blueprint mode mandates, and takes its required-doc list from
 * `lib/mega-blueprint-mandate.mjs` so the prompt and this splitter cannot drift.
 *
 * MANIFEST IDENTITY IS DERIVED, NOT BAKED IN (2026-09-20). `--title` and `--packet`
 * exist because the manifest was generated from two constants left over from the
 * first package this splitter ever wrote: the title read "Social Bridge Completion
 * Blueprint" and the packet path pointed at
 * `BLUEPRINT-social-bridge-completion-2026-09-19/`, a directory that does not exist.
 * Every later package inherited both. The cinematic-frontend package shipped that
 * way and the previous session had to hand-write a correction note into its
 * MANIFEST.md so a reader could tell generated text from reviewed text — the
 * generated text was simply false. A manifest that misnames its own package is
 * worse than no manifest, because it is read as provenance.
 *
 * Both are now optional and default to a derivation from `--out-dir`, so the
 * default is honest for any package rather than correct for exactly one.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FORGE_DOCS, MEGA_BLUEPRINT_REQUIRED_DOCS } from './lib/mega-blueprint-mandate.mjs';

const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19';
const PART_A = 'PART A — HOSTILE REVIEW';
const PART_B = 'PART B — FORGED PACKAGE';
const PART_C = 'PART C — DECISION-DENSITY SELF-TEST';

function parseArgs(argv) {
  const o = {
    in: `${PKG}/ASTRA-PRO-REPLY.md`, outDir: PKG, check: false,
    megaBlueprint: false, title: null, packet: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--in') o.in = argv[++i];
    else if (argv[i] === '--out-dir') o.outDir = argv[++i];
    else if (argv[i] === '--check') o.check = true;
    else if (argv[i] === '--title') o.title = argv[++i];
    else if (argv[i] === '--packet') o.packet = argv[++i];
    // Mega Blueprint replies carry an extra document (09-tests.md). Requiring it
    // only in that mode keeps existing packages valid.
    else if (argv[i] === '--mega-blueprint') o.megaBlueprint = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return o;
}

/**
 * `BLUEPRINT-theme-lens-2026-09-20` -> `Theme Lens`.
 * Only used when the caller did not pass `--title`.
 *
 * NOT EXPORTED ON PURPOSE. This file is a CLI: importing it runs `parseArgs` and can
 * call `process.exit(1)` at module scope. Exporting a helper from it would invite an
 * importer that dies during import. The behaviour is tested through the subprocess
 * boundary, on the MANIFEST.md actually written, which is the artifact that matters.
 */
function deriveTitle(outDir) {
  const base = String(outDir).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || '';
  const slug = base
    .replace(/^BLUEPRINT-/i, '')
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!slug) return base || 'Untitled Blueprint';
  return slug.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Find the packet that produced this package, INSIDE the package. Returns null
 * rather than guessing at a sibling directory — a wrong path is the bug.
 */
function derivePacket(outDir) {
  const direct = join(outDir, 'CONSULT-PACKET.md');
  if (existsSync(direct)) return direct;
  if (!existsSync(outDir)) return null;
  const hit = readdirSync(outDir)
    .filter((f) => /\.md$/i.test(f) && /(REQUEST|PACKET)/i.test(f))
    .sort()[0];
  return hit ? join(outDir, hit) : null;
}

/**
 * Index the document's headings, ignoring anything inside a fenced code block.
 * Returns { lines, headings } where headings carry their line index.
 */
function scanHeadings(text) {
  const lines = text.split('\n');
  const headings = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (m) headings.push({ level: m[1].length, text: m[2], idx: i });
  }
  return { lines, headings };
}

const opts = parseArgs(process.argv.slice(2));
if (!existsSync(opts.in)) { console.error(`FATAL: reply not found: ${opts.in}`); process.exit(1); }

/**
 * The required document set comes from the mandate module so the prompt and the
 * splitter cannot drift apart — a mismatch means a paid reply the splitter
 * rejects, which is the exact failure the fence-aware fix already cost once.
 */
const REQUIRED_DOCS = opts.megaBlueprint ? MEGA_BLUEPRINT_REQUIRED_DOCS : FORGE_DOCS;

const text = readFileSync(opts.in, 'utf8');
const { lines, headings } = scanHeadings(text);

const find = (title) => headings.find((h) => h.level === 2 && h.text.toUpperCase().includes(title.toUpperCase()));
const hA = find(PART_A);
const hB = find(PART_B);
const hC = find(PART_C);

const missingSections = [];
if (!hA) missingSections.push(`## ${PART_A}`);
if (!hB) missingSections.push(`## ${PART_B}`);
if (!hC) missingSections.push(`## ${PART_C}`);

const joinLines = (from, to) => lines.slice(from, to === undefined ? lines.length : to).join('\n').trim();
const partA = hA ? joinLines(hA.idx + 1, hB ? hB.idx : hC ? hC.idx : undefined) : null;
const partB = hB ? joinLines(hB.idx + 1, hC ? hC.idx : undefined) : null;
const partC = hC ? joinLines(hC.idx + 1) : null;

/** Pull `### 00-README.md`-style sections out of PART B, at fence depth 0. */
function splitPartB(body) {
  const out = new Map();
  if (!body) return out;
  const { lines: bLines, headings: bHeads } = scanHeadings(body);
  const marks = bHeads.filter((h) => h.level === 3 && /^\d{2}-[A-Za-z0-9._-]+\.md$/.test(h.text));
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].idx : bLines.length;
    out.set(mark.text, bLines.slice(mark.idx + 1, end).join('\n').trim());
  });
  return out;
}

const docs = splitPartB(partB);
const missingDocs = REQUIRED_DOCS.filter((d) => !docs.has(d));

console.log(`[split] reply: ${opts.in} (${text.length} chars)`);
console.log(`[split] PART A: ${partA ? `${partA.length} chars` : 'MISSING'}`);
console.log(`[split] PART B: ${partB ? `${partB.length} chars` : 'MISSING'}`);
console.log(`[split] PART C: ${partC ? `${partC.length} chars` : 'MISSING'}`);
console.log(`[split] PART B documents found: ${docs.size}`);
for (const name of REQUIRED_DOCS) {
  const body = docs.get(name);
  console.log(body ? `[split]   OK      ${name} (${body.split('\n').length} lines)` : `[split]   MISSING ${name}`);
}
if (missingSections.length) console.error(`[split] FATAL: missing top-level sections: ${missingSections.join(', ')}`);
if (missingDocs.length) console.error(`[split] FATAL: missing PART B documents: ${missingDocs.join(', ')}`);
if (missingSections.length || missingDocs.length) process.exit(1);

if (opts.check) { console.log('[split] --check: nothing written.'); process.exit(0); }

mkdirSync(opts.outDir, { recursive: true });
const written = [];

function emit(filename, body, { extraHeader = '' } = {}) {
  const full = extraHeader ? `${extraHeader}\n\n---\n\n${body}\n` : `${body}\n`;
  const lineCount = full.split('\n').length;
  const fences = (full.match(/^\s*```/gm) || []).length;
  if (fences % 2 !== 0) console.warn(`[split] WARN: ${filename} has an unbalanced code fence (${fences} fence lines)`);
  if (lineCount > 300) console.warn(`[split] WARN: ${filename} is ${lineCount} lines, over the ~300-line budget — builder should split it`);
  writeFileSync(join(opts.outDir, filename), full, 'utf8');
  written.push({ filename, lines: lineCount, fences });
}

emit('HOSTILE-REVIEW.md', partA, {
  extraHeader: '# PART A — Hostile Review (Astra Pro)\n\n> Review first, per the Forge: findings carry file:line evidence and a fix.\n> A finding without a fix is not a finding.',
});
for (const name of REQUIRED_DOCS) emit(name, docs.get(name));
emit('08-decision-density-self-test.md', partC, {
  extraHeader: '# PART C — Decision-Density Self-Test\n\n> Every remaining builder choice: decided-in-package, or delegated-with-bounds.',
});

const title = opts.title || deriveTitle(opts.outDir);
const packet = opts.packet || derivePacket(opts.outDir);
// `join()` yields `docs\ai-workflow\...` on Windows while the source-reply line is
// written from the caller's POSIX-style argument, so the two lines of the same
// manifest disagreed on separator. Normalise both: this manifest is read and
// copy-pasted by agents on Windows, WSL and macOS.
const asPosix = (p) => String(p).replace(/\\/g, '/');
const manifest = `# Package Manifest — ${title} Blueprint\n\n`
  + `**Generated:** ${new Date().toISOString()}\n`
  + `**Source reply:** \`${asPosix(opts.in)}\`\n`
  + (packet ? `**Packet:** \`${asPosix(packet)}\`\n` : '**Packet:** not filed in this directory\n')
  + `\n## Documents\n\n| File | Lines | Fenced blocks |\n|---|---|---|\n`
  + written.map((w) => `| \`${w.filename}\` | ${w.lines} | ${w.fences} |`).join('\n')
  + `\n\n## Build order\n\nPer \`04-build-order.md\` and \`05-slices.md\`. Build ONE slice at a time;`
  + ` after each slice, produce the diff + the acceptance-criteria evidence and WAIT for the`
  + ` checkpoint verdict before continuing.\n`;
writeFileSync(join(opts.outDir, 'MANIFEST.md'), manifest, 'utf8');

console.log(`[split] wrote ${written.length + 1} files to ${opts.outDir}`);
for (const w of written) console.log(`[split]   ${w.filename}  ${w.lines} lines`);
