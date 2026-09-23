# HOSTILE REVIEW PACKET — round H6: attack the H5 fixes. Declare DRY only if nothing genuinely fixable remains.

H5 verdicts: Kimi NOT DRY (H5-1 force-guard deadlock + mkdir pollution, H5-2 silent Result no-op, H5-3 provenance destruction); GLM NOT DRY (M1 force-refusal on fresh/empty dirs, M2 crashed-dir dead end, M3 gate-time contract coupling, M4 mid-value hex escape, m1–m4). The two sets overlapped heavily (M1/M2/m1 ≈ H5-1/H5-3). ALL are fixed.

## H5 fix ledger (every item smoke- or fixture-proven this session)

- **H5-1/M1/M2 (force guard rebuilt):** ALL force logic now precedes any mkdir; the guard runs only on NON-EMPTY dirs; `sealed/outputs.jsonl` counts as run-dir evidence (crashed dirs recover). Smokes: fresh nonexistent dir + `--force` → proceeds (0 refusals); existing empty dir → proceeds; crashed dir (only sealed/outputs.jsonl) → proceeds with supersede; junk dir → refused with ZERO filesystem footprint (no sealed/ created).
- **H5-3/m1 (full provenance chain):** supersede list now covers all seven artifacts — outputs, mapping, checks, verdicts, scorecard, judging-sheet, run-card — every superseded artifact keeps a chain that can speak for it.
- **H5-2 (Result line fail-closed):** score throws when the card lacks a `Result:` line (smoke-proven with a GENUINE commitment so the check is actually reached; a full real scoring cycle then executed end-to-end and rewrote the card).
- **M3 (gate-time coupling):** `contaminationGate` try/catches the contract load — classroom profile stays fail-closed; non-classroom `--train` runs degrade LOUDLY to the demo-client namespace with an explicit "child-id namespace NOT checked" warning. Smoke: coach `--train` run with a version-bumped contract proceeds with the warning (contract restored after).
- **M4/m2 (hex rebuilt, third time, with the full red/control matrix):** two positive branches — immediate value position (`: = quote (`), and word/paren/comma-preceded hex ONLY when a declaration terminator follows. Red: `border: 1px solid #ccc;`, `box-shadow: … #000;`, `url(plate.png) #fff;`, gradient first AND second args. Controls: `a #face, #beef {}`, `#face:hover`, `href={"#fade"}` (JSX container), quoted/spaced url(), multiline var(). All exemption lookbehinds uniformly `\s*`. **14-case matrix passes**, 6 of them in the committed test suite.
- **m3:** PROBE marker survives the INCOMPLETE branch.
- **m4:** dataset helper throws on an explicitly-passed unknown `--profile` (same H2-3 policy as the sibling); legacy profiles remain valid.
- Verification: 33/33 tests; the 14-case hex matrix; five force-path smokes; M3 bump smoke; m4 throw smoke.

Known accepted residuals (argued in your own dissents, not hidden): mid-list gradient args (`, #b,` — no terminator) escape branch 2; quote-wrapped prose hex remains flagged per designed doctrine.

A false finding costs more than an honest DRY. If nothing genuinely fixable remains, say **DRY** explicitly. Mandatory DISSENT either way.

## Current source of the three files changed since H5

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
import { isTrackProfile, loadClassroomContract } from './lib/tuning-profiles.mjs';
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
  if (opts.profile && !isTrackProfile(opts.profile)) {
    throw new Error(`unknown profile "${opts.profile}" — deterministic checks would silently vanish (H2-3). Known: swan-coach-v1, classroom-extract-v1, swan-coder-design-v1.`);
  }
  if (!existsSync(opts.evals)) throw new Error(`Eval file not found: ${opts.evals}`);
  const rows = readJsonl(opts.evals);
  const items = (opts.maxItems > 0 ? rows.slice(0, opts.maxItems) : rows);
  if (items.length === 0) throw new Error('Eval file has no rows.');
  items.forEach(validateRow);
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
    const looksLikeRunDir = existsSync(join(runDir, 'run-card.md'))
      || existsSync(join(sealedDir, 'mapping.json'))
      || existsSync(join(sealedDir, 'outputs.jsonl'));
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
  mkdirSync(sealedDir, { recursive: true });

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
  + `(?:(?<=[:='"\`()]\\s*)${HEX_BODY}|(?<=[\\w)\\]]\\s+|,\\s*)${HEX_BODY}(?=\\s*[;})!]))`,
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

### scripts/agent-tuning-dataset.mjs
```js
#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ROOT,
  PROFILES,
  buildExamples,
  collectSourceFiles,
  createEvalSeed,
  createWorkspace,
  readTrainingJsonl,
  validateTrainingExamples,
  writeJsonl,
} from './lib/agent-tuning-core.mjs';
import { isTrackProfile, validateExamplesForProfile } from './lib/tuning-profiles.mjs';

function assertKnownProfile(opts) {
  // H5-m4: same policy as the compare harness (H2-3) — an explicitly passed
  // unknown profile must throw, or validation silently vanishes on a typo.
  if (opts.profileExplicit && !PROFILES[opts.profile] && !isTrackProfile(opts.profile)) {
    throw new Error(`unknown profile "${opts.profile}" — validation would silently vanish. Known: ${[...Object.keys(PROFILES), 'swan-coach-v1', 'classroom-extract-v1', 'swan-coder-design-v1'].join(', ')}.`);
  }
}

function reportProfileValidation(examples, profile) {
  if (!isTrackProfile(profile)) return 0;
  const { problems, warnings } = validateExamplesForProfile(examples, profile);
  for (const warning of warnings) console.warn(`[agent-tuning] profile warning: ${warning}`);
  for (const problem of problems) console.error(`[agent-tuning] profile problem: ${problem}`);
  if (problems.length === 0) console.log(`[agent-tuning] profile ${profile}: clean (${examples.length} example(s))`);
  return problems.length;
}

export function parseArgs(argv) {
  const opts = {
    command: argv[0] || 'help',
    root: DEFAULT_ROOT,
    sources: [],
    profile: 'swan-codex',
    out: '',
    file: '',
    maxExamples: 1000,
    minAssistantChars: 120,
    count: 25,
    allowSmall: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--root') {
      opts.root = next;
      i += 1;
    } else if (arg === '--source') {
      opts.sources.push(next);
      i += 1;
    } else if (arg === '--profile') {
      opts.profile = next;
      opts.profileExplicit = true; // H5-m4: an explicit typo must throw, not silently skip validation
      i += 1;
    } else if (arg === '--out') {
      opts.out = next;
      i += 1;
    } else if (arg === '--file') {
      opts.file = next;
      i += 1;
    } else if (arg === '--max-examples' || arg === '--min-assistant-chars' || arg === '--count') {
      const n = Number(next);
      if (!Number.isFinite(n)) throw new Error(`${arg} must be a number, got "${next}".`); // H4-8
      opts[{ '--max-examples': 'maxExamples', '--min-assistant-chars': 'minAssistantChars', '--count': 'count' }[arg]] = n;
      i += 1;
    } else if (arg === '--allow-small') {
      opts.allowSmall = true;
    } else if (!arg.startsWith('--')) {
      opts.sources.push(arg);
    } else {
      // H3 residual: this helper swallowed typo'd flags while its siblings threw
      throw new Error(`unknown argument "${arg}"`);
    }
  }

  if (opts.sources.length === 0) opts.sources.push(join(opts.root, 'raw'));
  if (!opts.out && opts.command === 'build') opts.out = join(opts.root, 'datasets', 'agent-sft.jsonl');
  if (!opts.file && opts.command === 'validate') opts.file = join(opts.root, 'datasets', 'agent-sft.jsonl');
  if (!opts.file && opts.command === 'eval-seed') opts.file = join(opts.root, 'datasets', 'agent-sft.jsonl');
  if (!opts.out && opts.command === 'eval-seed') opts.out = join(opts.root, 'evals', 'agent-eval-seed.jsonl');
  if (!opts.out && opts.command === 'quickstart') opts.out = join(opts.root, 'datasets', 'sample-agent-sft.jsonl');
  return opts;
}

function printHelp() {
  console.log(`AI agent tuning dataset helper

Usage:
  node scripts/agent-tuning-dataset.mjs doctor [--root DIR]
  node scripts/agent-tuning-dataset.mjs quickstart [--root DIR]
  node scripts/agent-tuning-dataset.mjs init [--root DIR]
  node scripts/agent-tuning-dataset.mjs build [--source DIR_OR_FILE] [--out FILE] [--profile swan-codex]
  node scripts/agent-tuning-dataset.mjs validate [--file FILE] [--allow-small] [--profile NAME]

Track profiles (SWA-169; add per-track validation on build + validate):
  swan-coach-v1 | classroom-extract-v1 | swan-coder-design-v1
  node scripts/agent-tuning-dataset.mjs eval-seed [--file FILE] [--out FILE] [--count 25]

Default local workspace:
  ${DEFAULT_ROOT}
`);
}

function summarizeRedactions(redactions) {
  return Object.entries(redactions)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${name}:${count}`)
    .join(', ') || 'none';
}

function countJsonlRows(file) {
  if (!existsSync(file)) return 0;
  try {
    return readTrainingJsonl(file).length;
  } catch {
    return 0;
  }
}

function hasUnslothOnPath() {
  const checker = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(checker, ['unsloth'], { encoding: 'utf8' });
  return result.status === 0;
}

function writeSampleSource(root) {
  const rawDir = join(root, 'raw');
  mkdirSync(rawDir, { recursive: true });
  const samplePath = join(rawDir, 'sample-agent-example.md');
  if (!existsSync(samplePath)) {
    writeFileSync(samplePath, `User: Help me finish a SwanStudios coding slice without stepping on another agent's files.
Assistant: Start with git status and the live coordination lane. Read the other agent's locked files before editing. Claim only the exact files needed for the slice, keep the implementation surgical, and verify with the narrowest meaningful test. Before closeout, name the command that passed, call out unrelated dirty files you did not touch, and avoid claiming production readiness unless the production path was actually verified.
`, 'utf8');
  }
  return samplePath;
}

function printDoctor(opts) {
  const rawDir = join(opts.root, 'raw');
  const sampleSource = join(rawDir, 'sample-agent-example.md');
  const dataset = join(opts.root, 'datasets', 'agent-sft.jsonl');
  const evalSeed = join(opts.root, 'evals', 'agent-eval-seed.jsonl');
  const sampleDataset = join(opts.root, 'datasets', 'sample-agent-sft.jsonl');
  const sampleEvalSeed = join(opts.root, 'evals', 'sample-agent-eval-seed.jsonl');
  const rawFiles = existsSync(rawDir) ? collectSourceFiles([rawDir]).length : 0;

  console.log('[agent-tuning] doctor');
  console.log(`  workspace: ${existsSync(opts.root) ? 'ready' : 'missing'} (${opts.root})`);
  console.log(`  raw sources: ${rawFiles}`);
  console.log(`  training rows: ${countJsonlRows(dataset)} (${dataset})`);
  console.log(`  sample rows: ${countJsonlRows(sampleDataset)} (${sampleDataset})`);
  console.log(`  eval rows: ${countJsonlRows(evalSeed)} (${evalSeed})`);
  console.log(`  sample eval rows: ${countJsonlRows(sampleEvalSeed)} (${sampleEvalSeed})`);
  console.log(`  unsloth on PATH: ${hasUnslothOnPath() ? 'yes' : 'no'}`);
  console.log('');
  if (!existsSync(opts.root)) console.log('Next: npm run agent-tuning:init');
  else if (rawFiles === 0) console.log('Next: npm run agent-tuning:quickstart');
  else if (rawFiles === 1 && existsSync(sampleSource)) {
    console.log('Next: replace the sample with approved real examples, then run npm run agent-tuning:build');
  }
  else if (!existsSync(dataset)) console.log('Next: npm run agent-tuning:build');
  else console.log('Next: npm run agent-tuning:validate');
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);

  if (opts.command === 'help' || opts.command === '--help' || opts.command === '-h') {
    printHelp();
    return 0;
  }

  if (opts.command === 'doctor') {
    printDoctor(opts);
    return 0;
  }

  if (opts.command === 'init') {
    const dirs = createWorkspace(opts.root);
    console.log(`[agent-tuning] initialized ${opts.root}`);
    for (const dir of dirs) console.log(`  ${dir}`);
    return 0;
  }

  if (opts.command === 'quickstart') {
    createWorkspace(opts.root);
    const samplePath = writeSampleSource(opts.root);
    const result = buildExamples({ ...opts, sources: [samplePath], minAssistantChars: 40 });
    writeJsonl(opts.out, result.examples.map(({ messages }) => ({ messages })));
    const evalOut = join(opts.root, 'evals', 'sample-agent-eval-seed.jsonl');
    writeJsonl(evalOut, createEvalSeed(result.examples, 5));
    const validation = validateTrainingExamples(result.examples, { allowSmall: true });
    for (const problem of validation.problems) console.error(`[agent-tuning] problem: ${problem}`);
    console.log(`[agent-tuning] sample source: ${samplePath}`);
    console.log(`[agent-tuning] sample dataset: ${opts.out}`);
    console.log(`[agent-tuning] sample eval seed: ${evalOut}`);
    console.log('[agent-tuning] Replace the sample with approved real examples, then run npm run agent-tuning:build');
    return validation.problems.length === 0 ? 0 : 1;
  }

  if (opts.command === 'build') {
    assertKnownProfile(opts);
    createWorkspace(opts.root);
    const result = buildExamples(opts);
    console.log(`[agent-tuning] read ${result.files.length} source file(s)`);
    console.log(`[agent-tuning] redactions: ${summarizeRedactions(result.redactions)}`);
    for (const warning of result.warnings) console.warn(`[agent-tuning] warning: ${warning}`);
    // H4-4: validate BEFORE any write — a failed build must never overwrite a
    // pre-existing good dataset at --out, and no poisoned bytes ever land on
    // the trainable paths. Evidence goes to a stamped .rejected file only.
    const profileProblems = reportProfileValidation(result.examples, opts.profile);
    if (profileProblems > 0) {
      const rejected = `${opts.out}.rejected-${Date.now()}-${process.pid}`;
      writeJsonl(rejected, result.examples.map(({ messages }) => ({ messages })));
      console.error(`[agent-tuning] build FAILED profile validation BEFORE writing — evidence at ${rejected}; ${opts.out} untouched.`);
      return 1;
    }
    writeJsonl(opts.out, result.examples.map(({ messages }) => ({ messages })));
    writeJsonl(join(opts.root, 'reports', 'latest-sources.jsonl'), result.examples);
    console.log(`[agent-tuning] wrote ${result.examples.length} training example(s) to ${opts.out}`);
    return result.examples.length > 0 ? 0 : 1;
  }

  if (opts.command === 'validate') {
    assertKnownProfile(opts);
    if (!existsSync(opts.file)) throw new Error(`Dataset not found: ${opts.file}`);
    const examples = readTrainingJsonl(opts.file);
    const result = validateTrainingExamples(examples, { allowSmall: opts.allowSmall });
    for (const warning of result.warnings) console.warn(`[agent-tuning] warning: ${warning}`);
    for (const problem of result.problems) console.error(`[agent-tuning] problem: ${problem}`);
    const profileProblems = reportProfileValidation(examples, opts.profile);
    console.log(`[agent-tuning] validated ${examples.length} example(s) from ${opts.file}`);
    return result.problems.length === 0 && profileProblems === 0 ? 0 : 1;
  }

  if (opts.command === 'eval-seed') {
    if (!existsSync(opts.file)) throw new Error(`Dataset not found: ${opts.file}`);
    const examples = readTrainingJsonl(opts.file);
    const evalSeed = createEvalSeed(examples, opts.count);
    writeJsonl(opts.out, evalSeed);
    console.log(`[agent-tuning] wrote ${evalSeed.length} eval seed item(s) to ${opts.out}`);
    return evalSeed.length > 0 ? 0 : 1;
  }

  printHelp();
  return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`[agent-tuning] ${error.message}`);
    process.exitCode = 1;
  });
}
```
