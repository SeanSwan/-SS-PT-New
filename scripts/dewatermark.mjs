#!/usr/bin/env node

/**
 * dewatermark.mjs -- rewrite outward-facing prose through a NON-SIGNATORY local model
 * so it no longer carries the Anthropic (SynthID-Text) statistical watermark.
 * =============================================================================
 *
 * WHAT THE WATERMARK ACTUALLY IS (verified 2026-09-03 against anthropic.com/news/
 * claude-text-watermark, not from memory):
 *   Claude biases its token sampling using a keyed pseudo-random source. Nothing is
 *   embedded in the file -- there is no header, no zero-width character, no metadata.
 *   Certain word choices are simply made more often than chance. A holder of the key
 *   can measure that bias and report a probability that Claude wrote the passage.
 *   The detector is in PRIVATE PREVIEW for regulators, law enforcement, media,
 *   fact-checkers, educational orgs and compliant enterprises. There is no public
 *   detector, so any site claiming to detect it is lying.
 *
 * WHY LIGHT EDITING DOES NOT WORK:
 *   The signal is carried by the CHOSEN TOKENS THEMSELVES, spread across the whole
 *   passage. Changing a few words leaves most of the biased choices standing, and
 *   confidence grows with length. The only reliable removal is to have a model that
 *   never signed the EU transparency code re-choose every token. That is this script.
 *
 * WHY LOCAL: an Ollama model on Sean's own box is $0, needs no spend gate, and
 *   nothing leaves the machine -- so marketing drafts that mention real clients
 *   cannot leak (Rule 8). Do NOT "improve" this by routing to a cloud seat.
 *
 * PROOF, NOT VIBES: a rewrite is only real if the original's word sequences did not
 *   survive. This script measures 4-gram survival between input and output and FAILS
 *   when too much of the original wording is still standing. "The model said it
 *   rewrote it" is not evidence; the overlap number is.
 *
 * AND THE NEGATIVE CONTROL: low overlap alone would also pass a hallucinated rewrite
 *   that quietly dropped the price or the credential -- garbage scores 0% survival.
 *   So every number and proper noun in the source must still appear in the output,
 *   or the rewrite is rejected as unfaithful. One metric proves it is not a copy;
 *   the other proves it is still true. Neither is sufficient alone.
 *
 * Usage:
 *   node scripts/dewatermark.mjs --in <file> [--out <file>]
 *     [--voice <file>]          notes/samples of Sean's voice to preserve
 *     [--model <alias|tag>]     default | fast | <raw ollama tag>
 *     [--endpoint <url>]        default http://127.0.0.1:11434
 *     [--min-words <n>]         default 150 -- below this a rewrite buys nothing
 *     [--max-overlap <0..1>]    default 0.20 -- 4-gram survival ceiling
 *     [--temperature <n>]       default 0.85
 *     [--force]                 rewrite even below the word floor
 *     [--check]                 measure only: print word count + verdict, call nothing
 *     [--retries <n>]           default 2 -- self-retry hotter when overlap is high
 *     [--timeout-ms <n>]        default 600000
 *
 * Exit codes: 0 rewrite written and verified | 1 usage/IO error | 3 refused
 * (below floor, or overlap ceiling exceeded -- output still written to <out>.reject)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d = '') => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);

const inPath = arg('--in');
const voicePath = arg('--voice');
const endpoint = arg('--endpoint', 'http://127.0.0.1:11434').replace(/\/+$/, '');
const minWords = Number(arg('--min-words', '150'));
const maxOverlap = Number(arg('--max-overlap', '0.20'));
const temperature = Number(arg('--temperature', '0.85'));
const timeoutMs = Number(arg('--timeout-ms', '600000'));
const force = has('--force');
const checkOnly = has('--check');
const retries = Number(arg('--retries', '2'));

// Aliases so a model is named, not spelled as a 60-character tag. Any raw Ollama
// tag passes through unchanged. NOTE: never point this at an abliterated model --
// this task needs faithful rewriting, not removed refusals.
const MODEL_ALIASES = {
  default: 'qwen3.8:27b-mtp-q4_K_M',
  fast: 'qwen3:14b',
};
const modelArg = arg('--model', 'default');
const model = MODEL_ALIASES[modelArg] ?? modelArg;

if (!inPath) {
  console.error('dewatermark: --in <file> is required. See the header for usage.');
  process.exit(1);
}
if (!existsSync(inPath)) {
  console.error(`dewatermark: input not found: ${inPath}`);
  process.exit(1);
}
for (const [name, v] of [['--min-words', minWords], ['--max-overlap', maxOverlap], ['--temperature', temperature], ['--timeout-ms', timeoutMs], ['--retries', retries]]) {
  if (!Number.isFinite(v)) { console.error(`dewatermark: ${name} must be a number`); process.exit(1); }
}

const source = readFileSync(inPath, 'utf8');
const outPath = arg('--out', inPath.replace(/(\.[^.\/\\]+)?$/, '.dewatermarked$1'));

/* ---------------------------------------------------------------------------
 * Prose accounting. Fenced code, inline code and link targets are NOT prose:
 * Anthropic states code carries little or no watermark, and counting it would
 * inflate the word total and wave through a passage that is really too short.
 * ------------------------------------------------------------------------- */
const stripNonProse = (t) => t
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/~~~[\s\S]*?~~~/g, ' ')
  .replace(/`[^`\n]*`/g, ' ')
  .replace(/\]\([^)]*\)/g, '] ')
  .replace(/^\s{4,}\S.*$/gm, ' ');

const words = (t) => stripNonProse(t).toLowerCase().match(/[a-z0-9']+/g) ?? [];

const proseWords = words(source);
const wordCount = proseWords.length;

/** 4-gram survival: the share of the ORIGINAL's 4-word sequences still present in
 *  the rewrite. This is the honesty check. A model that returns the input with two
 *  synonyms swapped scores ~0.9 and is rejected; a genuine rewrite scores near 0.
 *  Quoted matter and proper nouns legitimately survive, which is why the ceiling is
 *  0.20 and not 0. */
const grams = (list, n = 4) => {
  const out = new Set();
  for (let i = 0; i + n <= list.length; i++) out.add(list.slice(i, i + n).join(' '));
  return out;
};
const overlapRatio = (a, b) => {
  const ga = grams(a); if (ga.size === 0) return 0;
  const gb = grams(b);
  let kept = 0;
  for (const g of ga) if (gb.has(g)) kept++;
  return kept / ga.size;
};

/** Fidelity anchors: the tokens a rewrite is NEVER allowed to lose -- money, dates,
 *  quantities, and proper nouns. Low 4-gram overlap on its own is satisfied by a
 *  hallucination, so this is the negative control that keeps the PASS honest. */
const anchors = (t) => {
  const prose = stripNonProse(t);
  const nums = prose.match(/\$?\d[\d,.]*%?/g) ?? [];

  // Proper nouns, via three signals that each fix a defect found in testing:
  //   1. The bag of lower-case words is built from the ORIGINAL casing. Lower-casing
  //      the text first made every proper noun match itself, so the filter discarded
  //      all of them and the check silently degraded to numbers-only.
  //   2. A token is a NAME if it carries an internal capital (SwanStudios, NASM) or
  //      appears at least once mid-sentence. Requiring mid-sentence alone dropped
  //      "SwanStudios" when it opened a line; allowing any capital promoted "Each",
  //      which opens every sentence of a list and never appears lower-case.
  //   3. Anything that also occurs lower-case somewhere is an ordinary word.
  const lowerBag = new Set(prose.match(/\b[a-z]{3,}\b/g) ?? []);
  const named = new Set();
  const re = /\b[A-Z][A-Za-z]{2,}\b/g;
  for (let m; (m = re.exec(prose)) !== null;) {
    const w = m[0];
    if (lowerBag.has(w.toLowerCase())) continue;
    const internalCap = /[a-z][A-Z]/.test(w) || w === w.toUpperCase();
    const before = prose.slice(Math.max(0, m.index - 3), m.index);
    const sentenceStart = m.index === 0 || /(^|[.!?:;]|\n)\s*$/.test(before);
    if (internalCap || !sentenceStart) named.add(w);
  }
  const propers = [...named];

  return [...new Set([...nums, ...propers].map((s) => s.replace(/[.,]$/, '')))]
    .filter((s) => s.length > 1);
};
const missingAnchors = (src, out) => {
  const hay = out.toLowerCase();
  return anchors(src).filter((a) => !hay.includes(a.toLowerCase()));
};

console.error(`[dewatermark] in=${inPath} prose-words=${wordCount} model=${model} (local Ollama, $0, nothing leaves this machine)`);

if (wordCount < minWords) {
  const msg =
    `[dewatermark] ${wordCount} prose words is below the --min-words floor of ${minWords}.\n` +
    `  Anthropic's own page: detection "doesn't work well on small samples". A short passage\n` +
    `  carries too few token choices to measure, so a rewrite costs time and buys nothing --\n` +
    `  and risks degrading copy that is already fine. Ship it as written.\n` +
    `  Override with --force if you have a specific reason.`;
  if (!force) { console.error(msg); process.exit(3); }
  console.error('[dewatermark] below floor, but --force given; proceeding.');
}

if (checkOnly) {
  console.log(JSON.stringify({
    input: inPath, proseWords: wordCount, minWords,
    verdict: wordCount < minWords ? 'below-floor-skip' : 'rewrite-warranted',
  }, null, 2));
  process.exit(0);
}

/* ------------------------------------------------------------------------- */
const voice = voicePath && existsSync(voicePath) ? readFileSync(voicePath, 'utf8') : '';

const REMIT = [
  'You are rewriting a passage of prose so that it is entirely your own wording.',
  '',
  'Rewrite EVERY sentence from scratch. Do not copy phrases, clauses, or sentence',
  'openings from the source. Choose your own words and your own sentence shapes.',
  '',
  'Hold these EXACTLY constant -- they are the point of the passage:',
  '  - every fact, number, date, price, statistic and proper noun',
  '  - every claim and its strength (do not soften or inflate anything)',
  '  - the order of ideas and the section/heading structure',
  '  - all markdown formatting, links, and link targets',
  '  - the reading level, register and length (stay within 10% of the original length)',
  '',
  'Do NOT add opinions, calls to action, filler, hedges, or transitions that were',
  'not in the source. Do NOT summarise. Do NOT explain what you changed.',
  '',
  voice
    ? `Write in this voice. Match its rhythm, vocabulary and level of directness:\n---\n${voice}\n---\n`
    : 'Keep the voice plain, concrete and direct. Avoid corporate filler and stock AI phrasing\n("delve", "in today\'s fast-paced", "it\'s not just X, it\'s Y", "unlock", "elevate").\n',
  'Output ONLY the rewritten passage. No preamble, no notes, no closing remark.',
].join('\n');

// Only strip a leading line that ANNOUNCES a rewrite. The first cut matched any
// "Okay,"/"Here's ...:" opener and would have eaten a real first sentence such as
// "Here's the thing: most apps quit on you." Requiring a rewrite word makes the
// false positive essentially impossible.
const stripPreamble = (t) => t
  .replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '')
  .replace(/^[^\n]{0,120}\b(rewritten|rewrite|revised|new version|paraphrased)\b[^\n]{0,60}[:.]\s*\n+/i, '')
  .replace(/^\s*```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i, '$1')
  .trim();

// Ollama silently truncates anything past num_ctx, which would return a rewrite of
// only the opening -- and a truncated rewrite scores WELL on overlap, so the metric
// would not catch it. Warn loudly rather than pass a half-rewritten passage.
const NUM_CTX = 32768;
const estTokens = Math.ceil(source.length / 3.5);
if (estTokens > NUM_CTX * 0.55) {
  console.error(
    `[dewatermark] WARNING: input is ~${estTokens} tokens against a ${NUM_CTX}-token window.\n` +
    '  Prompt plus rewrite may not fit and Ollama truncates silently. Split the passage\n' +
    '  by section and rewrite each part.'
  );
}

async function askModel(temp) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: temp, num_ctx: NUM_CTX },
        messages: [
          { role: 'system', content: REMIT },
          { role: 'user', content: source },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[dewatermark] Ollama returned HTTP ${res.status}. Is it running? curl ${endpoint}/api/version`);
      process.exit(1);
    }
    const json = await res.json();
    return stripPreamble(json?.message?.content ?? '');
  } catch (err) {
    const why = err?.name === 'AbortError' ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err);
    console.error(`[dewatermark] local model call failed: ${why}`);
    console.error(`[dewatermark] check: curl ${endpoint}/api/version   and   ollama list`);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

const judge = (text) => {
  const outW = words(text);
  const overlap = overlapRatio(proseWords, outW);
  const lost = missingAnchors(source, text);
  const f = [];
  if (overlap > maxOverlap) f.push('too much original wording survived');
  if (lost.length) f.push(`dropped ${lost.length} fact anchor(s): ${lost.slice(0, 8).join(', ')}`);
  return { overlap, lost, failures: f, lengthRatio: outW.length / Math.max(proseWords.length, 1) };
};

/* A single sample at a fixed temperature is a coin flip: the same passage scored 4.6%
 * survival on one run and 23.8% on the next. The tool already knows how to grade its
 * own output, so it retries itself at a higher temperature rather than making the
 * caller re-run by hand. Only an OVERLAP failure is worth retrying -- a dropped fact
 * anchor means the model is losing the content, and more heat makes that worse. */
let rewritten = '';
let result = null;
for (let attempt = 0; attempt <= retries; attempt++) {
  const temp = Math.min(temperature + attempt * 0.1, 1.2);
  if (attempt > 0) console.error(`[dewatermark] retry ${attempt}/${retries} at temperature ${temp.toFixed(2)}`);
  rewritten = await askModel(temp);
  if (!rewritten) {
    console.error('[dewatermark] model returned an empty rewrite; nothing written.');
    process.exit(1);
  }
  result = judge(rewritten);
  if (result.failures.length === 0) break;
  if (result.lost.length) break; // fidelity loss: retrying hotter only makes it worse
  if (attempt < retries) {
    console.error(`[dewatermark] attempt ${attempt + 1}: ${(result.overlap * 100).toFixed(1)}% survival exceeds ceiling`);
  }
}

const { overlap, lost, failures, lengthRatio } = result;
const verdict = failures.length === 0 ? 'PASS' : 'REJECT';
const target = verdict === 'PASS' ? outPath : `${outPath}.reject`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, rewritten.endsWith('\n') ? rewritten : `${rewritten}\n`, 'utf8');

console.error(
  `[dewatermark] ${verdict}  4-gram survival ${(overlap * 100).toFixed(1)}% ` +
  `(ceiling ${(maxOverlap * 100).toFixed(0)}%)  fact anchors kept ` +
  `${anchors(source).length - lost.length}/${anchors(source).length}  ` +
  `length ${(lengthRatio * 100).toFixed(0)}% of original  -> ${target}`
);

if (verdict === 'REJECT') {
  for (const f of failures) console.error(`[dewatermark]   REJECTED: ${f}`);
  console.error(
    '[dewatermark] Surviving wording means the watermark plausibly survived with it;\n' +
    '  a dropped anchor means the rewrite is no longer true. Retry with a higher\n' +
    '  --temperature (0.95), a different --model, or split the passage and rewrite in\n' +
    '  parts. Do NOT ship the .reject file.'
  );
  process.exit(3);
}

console.error('[dewatermark] Read the result before publishing: a local model can drift on facts.');
