# HOSTILE REVIEW PACKET — round H7: attack the H6 fixes. Declare DRY only if nothing genuinely fixable remains.

H6 verdicts: Kimi NOT DRY (H6-1 superseded-only crash window, H6-2 eval-id uniqueness, H6-3 zero-whitespace hex); GLM NOT DRY (H6-1 empty-sealed early-failure dead end — the sibling window — plus minors m1–m3). Both of you called DRY fair if H6 is answered. It is answered:

## H6 fix ledger

- **Kimi H6-1 + GLM H6-1 (both crash windows closed, opposite ways):** `*.superseded-*` entries (top level or sealed/) now count as run-dir evidence, AND `sealed/` is no longer pre-created — the mkdir happens at FIRST append, so an early failure (endpoint typo, unpulled model) leaves literally nothing. GLM's exact red repro executed: early-fail dir has 0 entries; follow-up `--force` proceeds with 0 refusals. Crash-after-supersede smoke also proceeds.
- **Kimi H6-2:** duplicate explicit eval ids throw at load, BEFORE any model call is paid for (smoke: duplicate-id file throws with the id named). buildBlindedPairs retains its own uniqueness throw as the second net.
- **Kimi H6-3:** branch-2 word-class whitespace is `\s*` — `border:1px solid#ccc;` flags (committed red fixture); all selector controls still pass via the terminator guard (verified in the 8-case delta matrix + suite).
- **GLM m1 (CRLF misrefusal): DISPROVEN with an executed test** — `/^Judge: .+$/m.test('Judge: pinned-v1\r\n')` → true, because `.` consumes `\r` and `$` asserts before `\n`. CRLF cards pass both gates. First disproven GLM finding of the loop; recorded in calibration. No change made.
- **GLM m2:** profile lists in both throw messages now derive from `TRACK_PROFILE_PROMPTS` keys — no textual copies of the truth remain.
- **GLM m3:** `run --run-dir` throws (belongs to score); `score --force` throws (score never resets). The known-wrong-command lull is closed for the two named cases.
- Verification: 33/33 tests; GLM's exact H6-1 red test; crash-after-supersede smoke; duplicate-id smoke; hex delta matrix.

Accepted residuals remain as previously declared (mid-list gradient args; quote-wrapped prose hex; GLM's ratified non-findings from H6: `:is()` lists, comment-internal hex, `url(" #fff")`).

A false finding costs more than an honest DRY. If nothing genuinely fixable remains, say **DRY** explicitly. Mandatory DISSENT either way.

## Current source of the two files changed since H6

### scripts/compare-tuned.mjs
```js
#!/usr/bin/env node

/**
 * Base-vs-tuned comparison harness over Ollama (U2/U5, SWA-169) — post-H1.
 *
 *   run   — query both models per eval item (incremental writes), run
 *           deterministic checks, then write a BLINDED judging sheet at the
 *           top level and every arm-labeled artifact under sealed/ (H1-2).
 *   score — ingest verdicts.jsonl, unblind via sealed/mapping.json, compute
 *           paired stats, write scorecard.md, update the run card Result.
 *
 * Blinding: CSPRNG seed, stored only inside sealed/mapping.json; the run card
 * records a sha256 commitment (H1-1). Contamination gate: --train <file>
 * refuses eval sets sharing demo-client ids with training rows (H1-4).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBlindedPairs,
  deterministicChecks,
  freshBlindingSeed,
  mappingCommitment,
  renderJudgingSheet,
  renderRunCard,
  renderScorecard,
  scoreVerdicts,
  sha256File,
} from './lib/compare-core.mjs';
import { TRACK_PROFILE_PROMPTS, isTrackProfile, loadClassroomContract } from './lib/tuning-profiles.mjs';
import { REDACTION_PATTERNS } from './lib/agent-tuning-core.mjs';

// F1 (Kimi H2): contamination is fatal in EVERY entity namespace — coach fake
// clients AND classroom child ids. The child-id regex is DERIVED from the
// contract's own childIdPattern (GLM H3 nit: no second source of truth).
// H4-5: derived LAZILY — a missing/bumped classroom contract must fail closed
// only where it matters (classroom contamination checks), not brick `help` or
// coach/coder runs at import time.
function entityRegexes() {
  const childIdBody = loadClassroomContract().attribution.childIdPattern.replace(/^\^|\$$/g, '');
  return [/demo-client-\d+/g, new RegExp(`\\b(?:${childIdBody})\\b`, 'g')];
}
/** Canonical ideal-provenance accessor — snake_case (eval files) and camelCase (harness records) are one field (F5). */
const provenanceOf = (r) => String(r.ideal_provenance ?? r.idealProvenance ?? '');

/** S3-6: nothing PII-shaped leaves the machine inside a judging sheet. */
function piiLint(text) {
  const hits = [];
  for (const [name, regex] of REDACTION_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(text)) hits.push(name);
  }
  return hits;
}

function numArg(value, flag) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${flag} must be a number, got "${value}".`);
  return n;
}

export function parseArgs(argv) {
  const opts = {
    command: argv[0] || 'help',
    evals: 'agent-tuning-local/evals/agent-eval-seed.jsonl',
    train: '',
    base: '',
    tuned: '',
    endpoint: 'http://127.0.0.1:11434',
    profile: '',
    outDir: '',
    runDir: '',
    seed: null,
    maxItems: 0,
    timeoutMs: 120000,
    temperature: 0,
    numCtx: 8192,
    force: false,
  };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => { i += 1; return argv[i]; };
    if (arg === '--evals') opts.evals = next();
    else if (arg === '--train') opts.train = next();
    else if (arg === '--base') opts.base = next();
    else if (arg === '--tuned') opts.tuned = next();
    else if (arg === '--endpoint') opts.endpoint = next();
    else if (arg === '--profile') opts.profile = next();
    else if (arg === '--out-dir') opts.outDir = next();
    else if (arg === '--run-dir') opts.runDir = next();
    else if (arg === '--audit-seed') {
      opts.seed = numArg(next(), '--audit-seed');
      if (!Number.isInteger(opts.seed)) throw new Error('--audit-seed must be an integer.');
    }
    else if (arg === '--max-items') opts.maxItems = numArg(next(), '--max-items');
    else if (arg === '--timeout-ms') opts.timeoutMs = numArg(next(), '--timeout-ms');
    else if (arg === '--temperature') opts.temperature = numArg(next(), '--temperature');
    else if (arg === '--num-ctx') opts.numCtx = numArg(next(), '--num-ctx');
    else if (arg === '--force') opts.force = true;
    else if (arg === '--allow-unidealized') opts.allowUnidealized = true;
    else if (arg === '--allow-flagged') opts.allowFlagged = true;
    else if (arg === '--allow-unpinned-judge') opts.allowUnpinnedJudge = true;
    else throw new Error(`unknown argument "${arg}"`);
  }
  return opts;
}

function readJsonl(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function chatOnce({ endpoint, model, messages, timeoutMs, temperature, numCtx }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options: { temperature, num_ctx: numCtx } }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Ollama ${model} responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return { text: String(data?.message?.content ?? ''), doneReason: data?.done_reason ?? 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}

function validateRow(row, index) {
  const messages = row.input ?? row.messages;
  if (!Array.isArray(messages) || !messages.every((m) => m && typeof m.content === 'string' && typeof m.role === 'string')) {
    throw new Error(`eval row ${index + 1} (${row.id ?? 'no id'}): input must be an array of {role, content} messages.`);
  }
  return messages;
}

function contaminationGate(evalRows, trainPath, profile) {
  // F1: generator output is never a legitimate contamination REFERENCE for a
  // classroom eval — it is the contaminant itself. The manifest sidecar marks it.
  if (profile === 'classroom-extract-v1' && existsSync(`${trainPath}.manifest.json`)) {
    throw new Error(`contamination gate: ${trainPath} is generator output (manifest sidecar present) — generator rows may never anchor a classroom eval comparison (H4/F1).`);
  }
  // H5-M3: the classroom namespace is fail-closed only where the classroom
  // contract genuinely governs; a coach/coder --train run degrades LOUDLY to
  // the demo-client namespace instead of bricking on a bumped contract.
  let regexes;
  try {
    regexes = entityRegexes();
  } catch (error) {
    if (profile === 'classroom-extract-v1') {
      throw new Error(`classroom contamination check requires a readable, version-matched contract: ${error.message}`);
    }
    regexes = [/demo-client-\d+/g];
    console.warn(`[compare] ⚠ classroom contract unreadable (${error.message.split('\n')[0]}) — child-id namespace NOT checked for this non-classroom run (H5-M3).`);
  }
  const trainText = readFileSync(trainPath, 'utf8');
  for (const re of regexes) {
    const trainIds = new Set(trainText.match(re) ?? []);
    const overlaps = new Set();
    for (const row of evalRows) {
      for (const id of JSON.stringify(row).match(re) ?? []) {
        if (trainIds.has(id)) overlaps.add(id);
      }
    }
    if (overlaps.size > 0) {
      throw new Error(`contamination gate: eval set shares training entity ids [${[...overlaps].join(', ')}] with ${trainPath} — partition ids and regenerate (H1-4/F1).`);
    }
  }
}

async function runCompare(opts) {
  if (!opts.base || !opts.tuned) throw new Error('run requires --base and --tuned model names.');
  if (opts.base === opts.tuned) throw new Error('--base and --tuned are the same model — a degenerate run proves nothing.');
  if (opts.runDir) throw new Error('--run-dir belongs to `score`; `run` takes --out-dir (H6-m3).');
  if (opts.profile && !isTrackProfile(opts.profile)) {
    throw new Error(`unknown profile "${opts.profile}" — deterministic checks would silently vanish (H2-3). Known: ${Object.keys(TRACK_PROFILE_PROMPTS).join(', ')}.`);
  }
  if (!existsSync(opts.evals)) throw new Error(`Eval file not found: ${opts.evals}`);
  const rows = readJsonl(opts.evals);
  const items = (opts.maxItems > 0 ? rows.slice(0, opts.maxItems) : rows);
  if (items.length === 0) throw new Error('Eval file has no rows.');
  items.forEach(validateRow);
  // H6-2: ids are the join key for slices, truncation exclusion, and blinding —
  // duplicates must die BEFORE any model call is paid for.
  const explicitIds = items.map((r) => r.id).filter(Boolean);
  const dupIds = explicitIds.filter((id, i) => explicitIds.indexOf(id) !== i);
  if (dupIds.length) throw new Error(`duplicate eval ids [${[...new Set(dupIds)].join(', ')}] — every downstream join is id-keyed (H6-2).`);
  if (opts.train) contaminationGate(items, opts.train, opts.profile);
  // S3-5: judging "against the ideal" with empty/PENDING ideals is silent rubric decay
  // K3: unanchored on purpose — "author draft — PENDING Sean" must also gate
  const unidealized = items.filter((r) => !String(r.ideal ?? '').trim() || /PENDING/i.test(provenanceOf(r)));
  if (unidealized.length && !opts.allowUnidealized) {
    throw new Error(`${unidealized.length} eval item(s) have empty or PENDING ideals (e.g. ${unidealized[0].id}) — author/approve ideals first, or pass --allow-unidealized for a non-promotable probe run.`);
  }
  if (opts.seed !== null) {
    console.warn('[compare] ⚠ --audit-seed makes the blinding REPRODUCIBLE — debug/audit runs only, never evidence.');
  }

  const stamp = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-p${process.pid}`;
  const safeTuned = opts.tuned.replace(/[^A-Za-z0-9._-]+/g, '_');
  const runDir = opts.outDir || join('agent-tuning-local', 'runs', `${stamp}-compare-${safeTuned}`);
  const sealedDir = join(runDir, 'sealed');
  // K2/H4-3/H5-1: all force logic runs BEFORE any mkdir, so a wrong --out-dir
  // is never touched, not even by an empty sealed/ (H5-1 rider).
  if (existsSync(runDir) && readdirSync(runDir).length > 0) {
    if (!opts.force) {
      throw new Error(`run dir ${runDir} is not empty — stale verdicts would poison scoring (H2-5). Use a fresh dir or --force.`);
    }
    // H5-1: sealed/outputs.jsonl is the run's own signature artifact and the
    // ONLY thing a mid-generation crash leaves behind — it must count as
    // run-dir evidence, or --force deadlocks the exact recovery path the
    // incremental-write design anticipates.
    // H6-1: superseded artifacts are run-dir evidence too — a crash in the
    // window after the rename leaves ONLY *.superseded-* files behind.
    const superseded = (dir) => existsSync(dir) && readdirSync(dir).some((n) => n.includes('.superseded-'));
    const looksLikeRunDir = existsSync(join(runDir, 'run-card.md'))
      || existsSync(join(sealedDir, 'mapping.json'))
      || existsSync(join(sealedDir, 'outputs.jsonl'))
      || superseded(runDir) || superseded(sealedDir);
    if (!looksLikeRunDir) {
      throw new Error(`--force refused: ${runDir} is non-empty but has none of run-card.md, sealed/mapping.json, or sealed/outputs.jsonl — wrong --out-dir? (H4-3/H5-1)`);
    }
    // H4-3/H5-3: SUPERSEDE, never destroy — including the mapping, checks, and
    // card, so every superseded artifact keeps a provenance chain that can
    // still speak for it.
    for (const [dir, name] of [
      [sealedDir, 'outputs.jsonl'], [sealedDir, 'mapping.json'], [sealedDir, 'checks.json'],
      [runDir, 'verdicts.jsonl'], [runDir, 'scorecard.md'], [runDir, 'judging-sheet.md'], [runDir, 'run-card.md'],
    ]) {
      const p = join(dir, name);
      if (existsSync(p)) {
        renameSync(p, join(dir, `${name}.superseded-${stamp}`));
        console.warn(`[compare] ⚠ stale ${name} superseded → ${name}.superseded-${stamp} (K2/H4-3/H5-3) — re-judge the NEW sheet only.`);
      }
    }
  }
  // H6-1 (GLM): sealed/ is created only at first append — an early failure
  // (endpoint typo, model not pulled) leaves NOTHING behind, so the dir stays
  // on the already-recoverable empty/fresh path. Zero footprint until evidence.
  const outputsPath = join(sealedDir, 'outputs.jsonl');
  const outputs = [];
  const checkTotals = {
    base: { hits: 0, invalidJson: 0, truncated: 0, empty: 0 },
    tuned: { hits: 0, invalidJson: 0, truncated: 0, empty: 0 },
  };
  const truncatedIds = [];
  let done = 0;
  for (const row of items) {
    const messages = row.input ?? row.messages ?? [];
    // S2-4: alternate which arm generates first, so cold-cache/thermal effects
    // do not land systematically on one arm (position-swap blinds the judge,
    // not the generation conditions).
    let base; let tuned;
    if (done % 2 === 0) {
      base = await chatOnce({ ...opts, model: opts.base, messages });
      tuned = await chatOnce({ ...opts, model: opts.tuned, messages });
    } else {
      tuned = await chatOnce({ ...opts, model: opts.tuned, messages });
      base = await chatOnce({ ...opts, model: opts.base, messages });
    }
    for (const [arm, out] of [['base', base], ['tuned', tuned]]) {
      const checks = deterministicChecks(out.text, opts.profile);
      checkTotals[arm].hits += checks.hits.length;
      if (checks.jsonValid === false) checkTotals[arm].invalidJson += 1;
      if (checks.empty) checkTotals[arm].empty += 1;
      if (out.doneReason === 'length') checkTotals[arm].truncated += 1;
    }
    const record = {
      id: row.id ?? `item-${done + 1}`,
      slice: row.slice ?? 'unsliced',
      prompt: messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
      ideal: row.ideal ?? '',
      idealProvenance: provenanceOf(row),
      base: base.text,
      tuned: tuned.text,
      doneReasons: { base: base.doneReason, tuned: tuned.doneReason },
    };
    if (base.doneReason === 'length' || tuned.doneReason === 'length') truncatedIds.push(record.id);
    outputs.push(record);
    if (done === 0) mkdirSync(sealedDir, { recursive: true }); // first evidence creates the structure (H6-1)
    appendFileSync(outputsPath, `${JSON.stringify(record)}\n`, 'utf8'); // incremental — a crash keeps completed items (H2-4)
    done += 1;
    console.log(`[compare] ${done}/${items.length} ${record.id}`);
  }

  const judgeable = outputs.filter((o) => !truncatedIds.includes(o.id));
  if (truncatedIds.length) {
    console.warn(`[compare] ${truncatedIds.length} item(s) truncated (done_reason=length) and EXCLUDED from the sheet — raise --num-ctx and re-run them: ${truncatedIds.join(', ')}`);
  }
  const piiHits = new Set(judgeable.flatMap((o) => piiLint(`${o.prompt}\n${o.ideal}\n${o.base}\n${o.tuned}`)));
  if (piiHits.size > 0 && !opts.allowFlagged) {
    throw new Error(`PII lint: sheet content matches sensitive patterns [${[...piiHits].join(', ')}] — outputs are preserved under sealed/; sanitize the eval set or pass --allow-flagged after reviewing (S3-6).`);
  }
  const seed = opts.seed ?? freshBlindingSeed();
  const auditSeed = opts.seed !== null; // F2: the marker must live in ARTIFACTS, not scrollback
  const { pairs, mapping } = buildBlindedPairs(judgeable, seed);
  const mappingText = JSON.stringify({ _warning: 'SEALED. Opening this before verdicts.jsonl is complete unblinds the judge.', seed, auditSeed, mapping }, null, 2);
  writeFileSync(join(sealedDir, 'mapping.json'), mappingText, 'utf8');
  writeFileSync(join(sealedDir, 'checks.json'), JSON.stringify({ checkTotals, truncatedIds }, null, 2), 'utf8');
  writeFileSync(join(runDir, 'judging-sheet.md'), renderJudgingSheet(pairs, { title: 'blinded comparison' }), 'utf8');
  writeFileSync(join(runDir, 'run-card.md'), renderRunCard({
    date: stamp.slice(0, 10),
    baseModel: opts.base,
    tunedModel: opts.tuned,
    evalPath: opts.evals,
    evalHash: sha256File(opts.evals),
    evalCount: judgeable.length,
    profile: opts.profile || null,
    mappingCommitment: mappingCommitment(mappingText),
    blindingMode: auditSeed ? 'AUDIT-SEED (reproducible — NOT promotion evidence)' : 'CSPRNG',
  }), 'utf8');

  console.log(`[compare] run dir: ${runDir} (arm-labeled artifacts under sealed/)`);
  console.log('[compare] next: judge judging-sheet.md into verdicts.jsonl WITHOUT opening sealed/,');
  console.log(`[compare] then: node scripts/compare-tuned.mjs score --run-dir "${runDir}"`);
  return 0;
}

function scoreRun(opts) {
  if (!opts.runDir) throw new Error('score requires --run-dir.');
  if (opts.force) throw new Error('--force belongs to `run`; score never resets anything (H6-m3).');
  const verdictPath = join(opts.runDir, 'verdicts.jsonl');
  if (!existsSync(verdictPath)) throw new Error(`No verdicts.jsonl in ${opts.runDir} — judge the sheet first.`);
  const verdicts = readJsonl(verdictPath);
  const mappingRaw = readFileSync(join(opts.runDir, 'sealed', 'mapping.json'), 'utf8');
  const { mapping, auditSeed } = JSON.parse(mappingRaw);
  const { checkTotals } = JSON.parse(readFileSync(join(opts.runDir, 'sealed', 'checks.json'), 'utf8'));
  const outputs = readJsonl(join(opts.runDir, 'sealed', 'outputs.jsonl'));
  const pendingIdeals = outputs.filter((o) => /PENDING/i.test(o.idealProvenance ?? '')).length;
  // H3-2: there is no legitimate cardless run — runCompare always writes one.
  // A missing card is the cheapest tamper and must fail CLOSED.
  const runCardPath2 = join(opts.runDir, 'run-card.md');
  if (!existsSync(runCardPath2)) {
    throw new Error('run-card.md is missing from the run dir — every run writes one, so its absence means tampering or a hand-built dir; scoring refused (H3-2).');
  }
  const runCardText = readFileSync(runCardPath2, 'utf8');
  if (/Judge: <pin/.test(runCardText) && !opts.allowUnpinnedJudge) {
    throw new Error('run card still says "Judge: <pin...>" — pin the judge (model+version+rubric) before scoring, or pass --allow-unpinned-judge for a non-promotable probe (S4-7 / GLM dissent 4).');
  }
  // F7 + H3-F7-a: the commitment must EXIST and match. A run card with a
  // missing or malformed commitment line is itself a defect — absence of the
  // check must never read as passing the check.
  const cardCommitment = runCardText.match(/sealed\): ([0-9a-f]{64})/)?.[1];
  if (!cardCommitment) {
    throw new Error('run card has no parseable blinding commitment — hand-edited or predates the commitment scheme; a run without a verifiable commitment cannot be scored (H3-F7-a).');
  }
  if (cardCommitment !== mappingCommitment(mappingRaw)) {
    throw new Error('blinding commitment mismatch: sealed/mapping.json is not the mapping this run card committed to — the mapping was swapped or the dir was reused (F7).');
  }
  if (!/^Judge: .+$/m.test(runCardText)) {
    throw new Error('run card has no Judge line at all — deleting the pin marker does not satisfy the pin requirement (H3-F7-a).');
  }
  if (!/^Result: /m.test(runCardText)) {
    throw new Error('run card has no Result line — the line readers trust cannot be silently absent; the rewrite would no-op (H5-2).');
  }
  const truncDelta = Math.abs((checkTotals.base.truncated ?? 0) - (checkTotals.tuned.truncated ?? 0));
  const sliceById = Object.fromEntries(outputs.map((o) => [o.id, o.slice ?? 'unsliced']));
  const stats = scoreVerdicts(verdicts, mapping, sliceById);
  const card = renderScorecard(stats, checkTotals, {
    title: opts.runDir,
    pendingIdeals,
    auditSeed: Boolean(auditSeed),
    truncDelta,
    truncDetail: `base ${checkTotals.base.truncated ?? 0} vs tuned ${checkTotals.tuned.truncated ?? 0}`,
  });
  writeFileSync(join(opts.runDir, 'scorecard.md'), card, 'utf8');
  // H4-7: a probe scored past the unpinned-judge gate must say so on the one
  // line readers trust — the marker lives in the ARTIFACT (F2 doctrine).
  const probeMark = /Judge: <pin/.test(runCardText) ? 'PROBE (unpinned judge) — ' : '';
  const resultLine = stats.incomplete
    ? `Result: ${probeMark}INCOMPLETE — defective verdict file` // H5-m3: the probe marker survives every branch
    : `Result: ${probeMark}${stats.passesStatisticalFloor ? 'floor PASS' : 'floor FAIL'} (${stats.tunedWins}-${stats.baseWins}-${stats.ties}, p=${stats.p.toExponential(2)})`;
  writeFileSync(runCardPath2, runCardText.replace(/^Result: .*$/m, resultLine), 'utf8');
  console.log(card);
  return stats.incomplete ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.command === 'run') return runCompare(opts);
  if (opts.command === 'score') return scoreRun(opts);
  console.log(`Base-vs-tuned comparison harness

Usage:
  node scripts/compare-tuned.mjs run   --base MODEL --tuned MODEL [--evals FILE] [--train FILE]
                                       [--profile NAME] [--endpoint URL] [--num-ctx 8192]
                                       [--max-items N] [--audit-seed N] [--force]
                                       [--allow-unidealized] [--allow-flagged]
  score also accepts: [--allow-unpinned-judge]  (probe runs — Result line is marked PROBE)
  node scripts/compare-tuned.mjs score --run-dir agent-tuning-local/runs/<dir>

run: incremental outputs under sealed/, blinded sheet at top level, CSPRNG blinding,
     contamination gate via --train, truncated items excluded and reported.
score: verdict-integrity checks, sign test + Wilson CI, statistical floor (n>=30), run-card update.
`);
  return opts.command === 'help' ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`[compare] ${error.message}`);
    process.exitCode = 1;
  });
}
```

### scripts/lib/tuning-profiles.mjs
```js
/**
 * Track profiles for the Three Local Brains program (SWA-169).
 *
 * Extends the legacy PROFILES in agent-tuning-core.mjs with per-track system
 * prompts and per-track VALIDATORS. Doctrine (Revision R1 of the master plan):
 *   - verifiable rules live in deterministic code (these validators + the
 *     inference-time guard), only non-enumerable judgment goes in weights;
 *   - training rows must never NAME a forbidden artifact (no retired hex in
 *     any assistant turn, even inside a correction);
 *   - classroom-extract rows are valid only against the pinned contract
 *     version — a provisional contract yields DISPOSABLE data, and the
 *     builder says so out loud.
 *
 * This module imports nothing from agent-tuning-core.mjs (core imports us).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = join(HERE, '..', '..', 'contracts', 'classroom-extract.contract.json');

/** The contract version this code was written against (R1 amendment 6). */
export const EXPECTED_CONTRACT_VERSION = '0.0.0-provisional';

const contractCache = new Map();

export function loadClassroomContract(path = CONTRACT_PATH) {
  if (contractCache.has(path)) return contractCache.get(path); // S4-9: no per-output re-reads
  const contract = JSON.parse(readFileSync(path, 'utf8'));
  if (contract.version !== EXPECTED_CONTRACT_VERSION) {
    throw new Error(
      `classroom-extract contract version mismatch: file has "${contract.version}", `
      + `code expects "${EXPECTED_CONTRACT_VERSION}". Update EXPECTED_CONTRACT_VERSION `
      + 'deliberately after reviewing the contract diff — never build against an unreviewed contract.',
    );
  }
  contractCache.set(path, contract); // cache only VALIDATED contracts
  return contract;
}

export const TRACK_PROFILE_PROMPTS = {
  'swan-coach-v1':
    'You are Swan Coach, the SwanStudios training companion. Use only client context supplied '
    + 'in the conversation or by tools; never invent client facts. Never diagnose medical '
    + 'conditions; on pain, injury, medical, or nutrition uncertainty, ask one focused '
    + 'follow-up, stop the risky pattern, route a note to the trainer, and recommend a '
    + 'licensed professional when symptoms are severe, persistent, radiating, or worsening. '
    + 'Say "stretching" or "flexibility", never yoga or meditation. Answer outcome-first, in '
    + 'plain language matched to the reader. Screening may bundle at most three tightly-scoped '
    + 'questions in one message; with older or overwhelmed clients, ask one question at a time.',
  'classroom-extract-v1':
    'You turn a teacher\'s chaotic voice dump into structured records. Output ONLY a JSON '
    + 'object {"records":[...]}. Each record: type (child_follow_up | developmental_observation '
    + '| parent_follow_up | supply | activity | prep_task), text, attribution (C-number id '
    + 'ONLY when the child is named explicitly, the string "uncertain" for pronoun or ambiguous '
    + 'references — never guess — or null when no child applies), optional triage (MUST | '
    + 'SHOULD | EXTRA), optional flags. If the input contains no records, output {"records":[]}. '
    + 'Never invent a record, a child, or a fact that is not in the dump.',
  'swan-coder-design-v1':
    'You are a SwanStudios senior engineer and design reviewer. styled-components only, never '
    + 'Material-UI. Colors are theme tokens with fallbacks, never hardcoded hex — request the '
    + 'current theme context instead of assuming palette values. Keep diffs surgical, prove '
    + 'claims with file:line evidence, and say "implemented but not yet proven" instead of '
    + '"done" until verification ran. Critique design for hierarchy, spacing rhythm, template '
    + 'smell, and cheap chrome; always name the strongest concrete fix.',
};

/**
 * Patterns FORBIDDEN in assistant turns of training rows, per profile.
 * These are dataset-hygiene alarms (and, mirrored at inference time, the guard
 * layer). Retired-palette hexes are matched but never spelled out in messages
 * or docs — the whole point is that forbidden artifacts stay unnamed.
 */
const RETIRED_PALETTE = [/#00ffff\b/i, /#7851a9\b/i, /#0a0a1a\b/i];
const THINK_LEAK = [/<think(?:ing)?>/i, /<\/think(?:ing)?>/i, /<\|?thinking\|?>/i];
// Any hardcoded hex COLOR is banned in coder rows — EXCEPT as the fallback
// inside a var() token reference, which house rule 6 requires (S3-4). F6:
// valid CSS color lengths only (3/4/6/8), any-width whitespace in the var()
// exemption, and a value-position guard so id selectors (#cafe, #face) that
// happen to spell hex are not flagged.
// H4-1/2/6: '(' restored to the value-position class (function-first-arg hex
// like linear-gradient(#f00,…) must flag); url()/href exemptions widened to
// quoted and spaced forms; var() exemption fully whitespace-tolerant
// (multiline var() is legal CSS) with an uncapped token name.
// H5-M4/m2: two positive branches — value-position hex (after : = quote , ( ))
// OR mid-value hex (after a word-char/closing-paren + whitespace, followed by a
// declaration terminator, so `border: 1px solid #ccc;` flags while selector
// lists `a #face, #beef {}` stay safe). Exemption lookbehinds are uniformly
// \s* (no magic caps) and href covers JSX expression containers href={"#x"}.
const HEX_BODY = '#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\\b';
const HEX_OUTSIDE_VAR = new RegExp(
  '(?<!var\\(\\s*--[\\w-]+\\s*,\\s*)(?<!url\\(\\s*[\'"]?)(?<!href\\s*=\\s*\\{?\\s*["\'`])'
  // branch 1: immediately after : = quote ( — unambiguous value position
  // branch 2: after word/)/]/comma, ONLY when a declaration terminator follows —
  // `solid #ccc;` and `, #00f)` flag; selector `#face,` / `#beef {` do not.
  + `(?:(?<=[:='"\`()]\\s*)${HEX_BODY}|(?<=[\\w)\\]]\\s*|,\\s*)${HEX_BODY}(?=\\s*[;})!]))`, // H6-3: \s* — `solid#ccc;` must not escape on missing whitespace
  'i',
);
const RECORD_KEYS = new Set(['type', 'text', 'attribution', 'triage', 'flags']);
const MAX_RECORDS_PER_DUMP = 20;

export const TRACK_VALIDATORS = {
  'swan-coach-v1': {
    bannedAssistant: [
      ['ai_self_description', /\bas an ai\b|\bi(?: a|['’])m an ai\b|\bai (?:model|assistant|coach)\b/i],
      ['nasm_certified_claim', /nasm[\s-]?certified/i],
      ['banned_wellness_term', /\byoga\b|\bmeditat(?:e|ion|ing)\b/i],
      ...RETIRED_PALETTE.map((re) => ['retired_palette_token', re]),
      ...THINK_LEAK.map((re) => ['thinking_leak', re]),
    ],
  },
  'classroom-extract-v1': {
    bannedAssistant: [...THINK_LEAK.map((re) => ['thinking_leak', re])],
    jsonContract: true,
  },
  'swan-coder-design-v1': {
    bannedAssistant: [
      ['mui_usage', /@mui\/|@material-ui\/|\bfrom ['"]@?material-ui\b/i],
      ['hardcoded_hex_outside_var', HEX_OUTSIDE_VAR],
      ...RETIRED_PALETTE.map((re) => ['retired_palette_token', re]),
      ...THINK_LEAK.map((re) => ['thinking_leak', re]),
    ],
  },
};

export function isTrackProfile(name) {
  return Object.hasOwn(TRACK_PROFILE_PROMPTS, name);
}

function checkBanned(text, banned, problems, rowLabel) {
  for (const [name, regex] of banned) {
    regex.lastIndex = 0;
    if (regex.test(text)) problems.push(`${rowLabel}: assistant turn contains forbidden pattern "${name}".`);
  }
}

/** Validate one assistant payload against the classroom contract. Pure. */
export function validateClassroomRecord(text, contract, problems, rowLabel) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    problems.push(`${rowLabel}: assistant output is not valid JSON.`);
    return;
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
    problems.push(`${rowLabel}: assistant JSON must be an object with a "records" array.`);
    return;
  }
  const extraTop = Object.keys(parsed).filter((k) => k !== 'records');
  if (extraTop.length) problems.push(`${rowLabel}: unexpected top-level key(s) ${extraTop.join(', ')} — output is {"records":[...]} and nothing else.`);
  if (parsed.records.length > MAX_RECORDS_PER_DUMP) problems.push(`${rowLabel}: ${parsed.records.length} records exceeds the sanity cap (${MAX_RECORDS_PER_DUMP}).`);
  const childId = new RegExp(contract.attribution.childIdPattern);
  parsed.records.forEach((record, index) => {
    const label = `${rowLabel} record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      problems.push(`${label}: record must be an object, got ${Array.isArray(record) ? 'array' : typeof record}.`);
      return; // S1-2: primitives must be findings, never TypeErrors
    }
    if (!contract.recordTypes.includes(record?.type)) {
      problems.push(`${label}: type "${record?.type}" is not in the contract.`);
    }
    if (typeof record?.text !== 'string' || !record.text.trim()) {
      problems.push(`${label}: text must be a non-empty string.`);
    }
    if (!('attribution' in (record ?? {}))) {
      problems.push(`${label}: attribution key is required (id, "uncertain", or null).`);
    } else if (record.attribution !== null
      && record.attribution !== contract.attribution.uncertainLiteral
      && !(typeof record.attribution === 'string' && childId.test(record.attribution))) {
      problems.push(`${label}: attribution "${record.attribution}" is not an id, "uncertain", or null.`);
    }
    if (record?.triage !== undefined && !contract.triage.includes(record.triage)) {
      problems.push(`${label}: triage "${record.triage}" is not in the contract.`);
    }
    if (record?.flags !== undefined
      && (!Array.isArray(record.flags) || record.flags.some((f) => typeof f !== 'string'))) {
      problems.push(`${label}: flags must be an array of strings.`);
    }
    const unknownKeys = Object.keys(record ?? {}).filter((k) => !RECORD_KEYS.has(k));
    if (unknownKeys.length) problems.push(`${label}: unknown key(s) ${unknownKeys.join(', ')}.`);
  });
}

/**
 * Profile-specific validation pass over built examples. Returns
 * { problems, warnings } shaped like validateTrainingExamples so callers
 * can merge results. Unknown/legacy profiles validate clean by design.
 */
export function validateExamplesForProfile(examples, profileName, { contractPath } = {}) {
  const problems = [];
  const warnings = [];
  const validator = TRACK_VALIDATORS[profileName];
  if (!validator) return { problems, warnings };

  let contract = null;
  if (validator.jsonContract) {
    contract = loadClassroomContract(contractPath ?? CONTRACT_PATH);
    if (contract.version.includes('provisional')) {
      warnings.push(
        `contract ${contract.version} is PROVISIONAL — rows built now are register-probing, `
        + 'disposable data, not v1 training data (R1 amendment 6).',
      );
    }
  }

  examples.forEach((example, index) => {
    const rowLabel = `Line ${index + 1}`;
    for (const message of example.messages ?? []) {
      if (message.role !== 'assistant') continue;
      const text = String(message.content ?? '');
      checkBanned(text, validator.bannedAssistant ?? [], problems, rowLabel);
      if (validator.jsonContract) validateClassroomRecord(text, contract, problems, rowLabel);
    }
  });
  return { problems, warnings };
}
```
