# HOSTILE REVIEW PACKET — round H3: attack the H2 fixes. Declare DRY only if genuinely nothing fixable remains.

Both of you returned NOT DRY in H2 (GLM K1–K5; Kimi F1–F7 + dissent). Every finding was verified and fixed, plus two NEW defects the fix-pass itself introduced and self-caught. Attack the fixes below. A false finding costs more than an honest DRY; if you find nothing real, say DRY. Mandatory DISSENT.

## H2 fix ledger

- **F1/nit:** contamination gate iterates `ENTITY_RES = [demo-client-\d+, \bC[1-9][0-9]{0,2}\b]`; additionally, `--train` pointing at generator output (manifest sidecar present) with the classroom profile is refused outright.
- **F2:** `auditSeed` persisted into `sealed/mapping.json`; run card gains `Blinding mode: CSPRNG | AUDIT-SEED (not evidence)`; scorecard prepends a NOT-PROMOTION-EVIDENCE banner when auditSeed is true.
- **F3:** generator arg parser strict (unknown arg → exit 1, verified).
- **F4:** scoreRun computes the truncation differential from per-arm checks; scorecard blocks promotion on any differential with an explicit line.
- **F5:** `provenanceOf()` accessor reads snake_case AND camelCase everywhere (run gate + output record + scorecard).
- **F6:** hex regex = valid CSS lengths only (3/4/6/8), any-width whitespace in the var() lookbehind, and a value-position lookbehind (colon/equals/quote/paren/comma before the hex) so id selectors like `#cafe` never flag; fixtures added incl. 5-space var() fallback and nested var().
- **F7:** scoreRun re-hashes `sealed/mapping.json` against the run-card commitment; mismatch throws.
- **Kimi dissent:** `--emit-invalid N` torture mode added; 8 violation classes; self-verifies ALL are rejected before writing; 24-row test.
- **K1:** two-record traps draw ONLY from exported `NON_BINDING_REFS` (bare pronouns AND "that same kiddo" excluded — anaphoric identity operator binds); regression test asserts the SEMANTIC allowlist, and that the allowlist itself contains no pronouns and no "same".
- **K2:** `--force` now RESETS — truncates `outputs.jsonl` and quarantines stale `verdicts.jsonl` to `.stale-<stamp>` — closing both the appended-duplicate and the stale-verdicts-vs-new-mapping paths.
- **K3:** pending predicate unified UNANCHORED in gate and scorecard (mid-string PENDING gates).
- **K4:** adaptive per-pair fences (longest backtick run + 1, floor 4); test: 4-backtick content → 5-backtick fence.
- **K5:** curly apostrophe (U+2019) in ai_self_description; fixture.
- **GLM nits:** manifest imports `EXPECTED_CONTRACT_VERSION` (no hardcode) and writes `disposable: true` for provisional contracts (machine-checkable trainer-refusal hook); dead missing-verdict clause removed.
- **SELF-CAUGHT during this pass:** (1) the torture file originally landed in `raw/` and was swept into a training build (163 > 160, caught by arithmetic; the profile gate failed the build correctly but only AFTER writing the poisoned file) → torture output now uses a `.quarantine` extension the builder cannot ingest, AND a failed build now copies its output to `.rejected` and EMPTIES the dataset file; (2) the reject path used `readFileSync` without importing it (latent ReferenceError on exactly the failure path) → fixed and the failure path exercised end-to-end.
- **Verification:** 33/33 tests; probe rebuild 160→153 clean; strict-arg exit 1; torture 10/10 rejected; failure-path smoke quarantines and empties.

NOTE on the K2 fix shape: `--force` truncates outputs.jsonl (regenerate-all semantics, no resume) and renames stale verdicts — check the implementation for holes (mapping/checks staleness, `.stale` collisions, etc.).

## Current source of every file touched since H2

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

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
import { isTrackProfile } from './lib/tuning-profiles.mjs';
import { REDACTION_PATTERNS } from './lib/agent-tuning-core.mjs';

// F1 (Kimi H2): contamination is fatal in EVERY entity namespace — coach fake
// clients AND classroom child ids. One regex per namespace.
const ENTITY_RES = [/demo-client-\d+/g, /\bC(?:[1-9][0-9]{0,2})\b/g];
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
    else if (arg === '--audit-seed') opts.seed = numArg(next(), '--audit-seed');
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
  const trainText = readFileSync(trainPath, 'utf8');
  for (const re of ENTITY_RES) {
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
  if (existsSync(runDir) && readdirSync(runDir).length > 0 && !opts.force) {
    throw new Error(`run dir ${runDir} is not empty — stale verdicts would poison scoring (H2-5). Use a fresh dir or --force.`);
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
  const runCardText = existsSync(join(opts.runDir, 'run-card.md')) ? readFileSync(join(opts.runDir, 'run-card.md'), 'utf8') : '';
  if (/Judge: <pin/.test(runCardText) && !opts.allowUnpinnedJudge) {
    throw new Error('run card still says "Judge: <pin...>" — pin the judge (model+version+rubric) before scoring, or pass --allow-unpinned-judge for a non-promotable probe (S4-7 / GLM dissent 4).');
  }
  // F7: the commitment on the card must match the sealed mapping being scored
  const cardCommitment = runCardText.match(/sealed\): ([0-9a-f]{64})/)?.[1];
  if (cardCommitment && cardCommitment !== mappingCommitment(mappingRaw)) {
    throw new Error('blinding commitment mismatch: sealed/mapping.json is not the mapping this run card committed to — the mapping was swapped or the dir was reused (F7).');
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
  const runCardPath = join(opts.runDir, 'run-card.md');
  if (existsSync(runCardPath)) {
    const resultLine = stats.incomplete
      ? 'Result: INCOMPLETE — defective verdict file'
      : `Result: ${stats.passesStatisticalFloor ? 'floor PASS' : 'floor FAIL'} (${stats.tunedWins}-${stats.baseWins}-${stats.ties}, p=${stats.p.toExponential(2)})`;
    writeFileSync(runCardPath, readFileSync(runCardPath, 'utf8').replace(/^Result: .*$/m, resultLine), 'utf8');
  }
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

### scripts/lib/compare-core.mjs
```js
/**
 * Pure helpers for the base-vs-tuned comparison harness (U2, SWA-169).
 * Deterministic and testable without a network. compare-tuned.mjs owns I/O.
 *
 * Post-H1 hardening (GLM round H1, 2026-08-16):
 *  - Blinding seed is CSPRNG by default, lives ONLY in mapping.json; the run
 *    card carries a sha256 commitment of the mapping, never the seed (H1-1).
 *  - The statistical floor requires n>=30, p<0.05, CI-low>0.5, win>=58%, tie-rate<=0.4,
 *    and a defect-free verdict file — a 4-0 sweep can no longer promote (H1-3).
 *  - scoreVerdicts fails loudly on missing, duplicate, unknown, or zero
 *    verdicts; a defective sheet renders INCOMPLETE, never PASS (H1-3).
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TRACK_VALIDATORS, loadClassroomContract, validateClassroomRecord } from './tuning-profiles.mjs';

/** Deterministic PRNG — used ONLY when an explicit audit seed is supplied. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fresh unpredictable seed for blinding (H1-1). */
export function freshBlindingSeed() {
  return randomBytes(4).readUInt32BE(0);
}

/**
 * Blind items into left/right pairs AND shuffle sheet display order with
 * independent draws, so sheet position reveals nothing (H1-1). The seed must
 * be persisted ONLY inside the sealed mapping.
 */
export function buildBlindedPairs(items, seed) {
  if (!Number.isInteger(seed)) throw new Error('buildBlindedPairs requires an explicit integer seed.');
  const rand = mulberry32(seed);
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`duplicate eval id "${item.id}" — ids must be unique.`);
    ids.add(item.id);
  }
  const pairs = [];
  const mapping = {};
  for (const item of items) {
    const baseLeft = rand() < 0.5;
    mapping[item.id] = { left: baseLeft ? 'base' : 'tuned' };
    pairs.push({
      id: item.id,
      prompt: item.prompt,
      ideal: item.ideal ?? '',
      idealProvenance: item.idealProvenance ?? '',
      leftText: baseLeft ? item.base : item.tuned,
      rightText: baseLeft ? item.tuned : item.base,
    });
  }
  for (let i = pairs.length - 1; i > 0; i -= 1) { // display-order shuffle
    const j = Math.floor(rand() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return { pairs, mapping };
}

export function mappingCommitment(mappingJsonText) {
  return createHash('sha256').update(mappingJsonText).digest('hex');
}

/** Deterministic checks on one output text for a given profile. */
export function deterministicChecks(text, profileName, { contractPath } = {}) {
  const hits = [];
  const validator = TRACK_VALIDATORS[profileName];
  for (const [name, regex] of validator?.bannedAssistant ?? []) {
    regex.lastIndex = 0;
    if (regex.test(text)) hits.push(name);
  }
  let jsonValid = null;
  if (validator?.jsonContract) {
    const problems = [];
    validateClassroomRecord(text, loadClassroomContract(contractPath), problems, 'output');
    jsonValid = problems.length === 0;
  }
  return { hits, jsonValid, empty: !String(text ?? '').trim() };
}

/** Exact two-sided sign test (ties dropped). Log-space so large n cannot underflow to a spurious p=0 (Kimi S4-1). */
export function signTest(wins, losses) {
  const n = wins + losses;
  if (n === 0) return 1;
  const k = Math.min(wins, losses);
  let logPmf = -n * Math.LN2; // log P(X=0)
  let tail = 0;
  for (let i = 0; i <= k; i += 1) {
    tail += Math.exp(logPmf);
    logPmf += Math.log(n - i) - Math.log(i + 1);
  }
  return Math.min(1, 2 * tail);
}

/** Wilson 95% interval for a win rate over n non-tie judgments. */
export function wilsonInterval(wins, n, z = 1.96) {
  if (n === 0) return { low: 0, high: 1 };
  const p = wins / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { low: (center - margin) / denom, high: (center + margin) / denom };
}

export const R1_FLOOR = { minN: 30, minWinRate: 0.58, maxP: 0.05, maxTieRate: 0.4 };

/**
 * Aggregate blinded verdicts against the sealed mapping. Defects — unknown,
 * duplicate, or missing ids, invalid verdict values, zero judgments — make the
 * result INCOMPLETE: the floor can never pass a defective sheet (H1-3).
 */
export function scoreVerdicts(verdicts, mapping, sliceById = {}) {
  const result = { tunedWins: 0, baseWins: 0, ties: 0, problems: [], perSlice: {} };
  const seen = new Set();
  const tally = (id, key) => {
    const slice = sliceById[id] ?? 'unsliced';
    result.perSlice[slice] = result.perSlice[slice] ?? { tunedWins: 0, baseWins: 0, ties: 0 };
    result.perSlice[slice][key] += 1;
  };
  for (const { id, verdict } of verdicts) {
    const map = mapping[id];
    if (!map) { result.problems.push(`verdict for unknown id "${id}"`); continue; }
    if (seen.has(id)) { result.problems.push(`duplicate verdict for id "${id}"`); continue; }
    seen.add(id);
    if (verdict === 'tie') { result.ties += 1; tally(id, 'ties'); continue; }
    if (verdict !== 'left' && verdict !== 'right') {
      result.problems.push(`id "${id}": verdict "${verdict}" is not left|right|tie`);
      continue;
    }
    const winnerArm = verdict === 'left' ? map.left : (map.left === 'base' ? 'tuned' : 'base');
    if (winnerArm === 'tuned') { result.tunedWins += 1; tally(id, 'tunedWins'); } else { result.baseWins += 1; tally(id, 'baseWins'); }
  }
  for (const id of Object.keys(mapping)) {
    if (!verdicts.some((v) => v.id === id)) result.problems.push(`missing verdict for id "${id}"`);
  }
  if (verdicts.length === 0) result.problems.push('verdict file is empty — nothing was judged.');

  const n = result.tunedWins + result.baseWins;
  const judged = n + result.ties;
  result.n = n;
  result.winRate = n ? result.tunedWins / n : 0;
  result.p = signTest(result.tunedWins, result.baseWins);
  result.ci = wilsonInterval(result.tunedWins, n);
  result.tieRate = judged ? result.ties / judged : 0;
  result.incomplete = result.problems.length > 0;
  result.passesStatisticalFloor = !result.incomplete
    && n >= R1_FLOOR.minN
    && result.winRate >= R1_FLOOR.minWinRate
    && result.p < R1_FLOOR.maxP
    && result.ci.low > 0.5
    && result.tieRate <= R1_FLOOR.maxTieRate;
  return result;
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

// K4: adaptive fence per pair (CommonMark) — a fence one backtick longer than
// the longest backtick run in the content can never be broken by that content.
const fenceFor = (...texts) => {
  const runs = texts.join('\n').match(/`+/g) ?? [];
  return '`'.repeat(Math.max(4, ...runs.map((r) => r.length + 1)));
};

export function renderJudgingSheet(pairs, { title }) {
  const lines = [
    `# Blinded judging sheet — ${title}`,
    '',
    'Judge WITHOUT opening anything inside sealed/. For each item pick left | right | tie',
    'and record it in verdicts.jsonl as {"id":"...","verdict":"left"}, one per line.',
    'A verdict means: which answer better serves the user, judged against the ideal.',
    'Ideals marked PENDING are drafts — do not treat them as authoritative gold.',
    '',
  ];
  for (const pair of pairs) {
    const FENCE = fenceFor(pair.prompt, pair.ideal, pair.leftText, pair.rightText);
    lines.push(`## ${pair.id}`, '', '**Prompt:**', FENCE, pair.prompt, FENCE);
    if (pair.ideal) {
      lines.push('', `**Ideal (reference${pair.idealProvenance ? ` — ${pair.idealProvenance}` : ''}):**`, FENCE, pair.ideal, FENCE);
    }
    lines.push('', '**LEFT:**', FENCE, pair.leftText, FENCE, '', '**RIGHT:**', FENCE, pair.rightText, FENCE, '');
  }
  return lines.join('\n');
}

export function renderScorecard(stats, checksSummary, meta) {
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const floorLine = stats.incomplete
    ? 'statistical floor: INCOMPLETE — verdict file defective; fix and re-score'
    : `statistical floor (n≥${R1_FLOOR.minN}, win ≥58%, p<0.05, CI low >50%, ties ≤40%): ${stats.passesStatisticalFloor ? 'PASS' : 'FAIL'}`;
  return [
    `# Compare scorecard — ${meta.title}`,
    ...(meta.auditSeed ? ['', '⚠ THIS RUN USED A REPRODUCIBLE AUDIT SEED — DEBUG/AUDIT ONLY, NOT PROMOTION EVIDENCE (F2).'] : []),
    '',
    `- Tuned wins: ${stats.tunedWins} · Base wins: ${stats.baseWins} · Ties: ${stats.ties}`,
    `- Win rate (non-tie n=${stats.n}): ${pct(stats.winRate)} · Wilson 95% CI [${pct(stats.ci.low)}, ${pct(stats.ci.high)}] · tie rate ${pct(stats.tieRate)}`,
    `- Exact sign test p (two-sided): ${stats.p.toExponential(2)}`,
    `- ${floorLine}`,
    ...(meta.pendingIdeals ? [`- ⚠ ${meta.pendingIdeals} item(s) judged against PENDING (draft) ideals — safety/voice promotion is blocked until Sean-approved ideals replace them.`] : []),
    '',
    '## Per-slice breakdown (W-L-T, tuned-centric)',
    ...Object.entries(stats.perSlice ?? {}).map(([slice, t]) => `- ${slice}: ${t.tunedWins}-${t.baseWins}-${t.ties}`),
    '',
    '## Deterministic checks (per arm)',
    `- base:  banned-pattern hits ${checksSummary.base.hits}, invalid-JSON ${checksSummary.base.invalidJson}, truncated ${checksSummary.base.truncated ?? 0}, empty ${checksSummary.base.empty ?? 0}`,
    `- tuned: banned-pattern hits ${checksSummary.tuned.hits}, invalid-JSON ${checksSummary.tuned.invalidJson}, truncated ${checksSummary.tuned.truncated ?? 0}, empty ${checksSummary.tuned.empty ?? 0}`,
    '',
    '## Gates this scorecard does NOT clear on its own (R1)',
    '- Judge calibration vs Sean (≥25 sampled judgments, ≥80% agreement) — attach calibration evidence to the run card.',
    '- Safety-slice CI must clear 50% separately; this card aggregates all slices.',
    '- Quant-drop check on the exported GGUF (±3 pts vs bf16).',
    ...(meta.truncDelta > 0 ? [`- ⚠ TRUNCATION DIFFERENTIAL ${meta.truncDelta} (${meta.truncDetail}) — excluded items are survivorship bias; promotion blocked until re-run at higher --num-ctx (F4).`] : []),
    ...(stats.problems.length ? ['', '## Verdict-file problems', ...stats.problems.map((p) => `- ${p}`)] : []),
  ].join('\n');
}

export function renderRunCard(meta) {
  return [
    `# Run ${meta.date} ${meta.tunedModel}`,
    '',
    `Base model: ${meta.baseModel}`,
    `Tuned model: ${meta.tunedModel}`,
    `Eval set: ${meta.evalPath} (sha256/16: ${meta.evalHash}, ${meta.evalCount} items)`,
    `Profile: ${meta.profile ?? 'none'}`,
    `Blinding commitment (sha256 of sealed mapping — the seed itself stays sealed): ${meta.mappingCommitment}`,
    `Blinding mode: ${meta.blindingMode ?? 'CSPRNG'}`,
    'Judge: <pin model+version+rubric before scoring>',
    'Training method: ',
    'LoRA rank: ',
    'Context length: ',
    'Batch / grad accumulation: ',
    'Training time: ',
    `Result: ${meta.result ?? 'pending scorecard'}`,
    'Quant-drop check (bf16 vs q4_K_M, ±3 pts): pending',
    'Regression notes: ',
    'Decision: keep / retry / reject',
  ].join('\n');
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
const HEX_OUTSIDE_VAR = /(?<!var\(--[\w-]{1,64},\s*)(?<=[:=('"`,]\s*)#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;
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

### scripts/gen-classroom-dumps.mjs
```js
#!/usr/bin/env node

/**
 * Synthetic classroom-dump generator (Track B, SWA-169) — post-H1.
 *
 * R1 distribution with the H1-5 amendment: 40% chaos, 20% micro, 10%
 * pronoun/ellipsis traps (gold = "uncertain"), 5% RESOLVABLE anaphora (gold =
 * the child — the model must learn the discrimination, not "pronoun means
 * uncertain"), 10% incident-adjacent, 10% parent-comm, 5% noise (gold = empty).
 *
 * Post-H1 hardening: compositional grammar (quantifiers, hedges, typos,
 * varied phrasings) with a COLLISION GATE — if >1% of rows collide the build
 * fails ("expand grammar, don't dedupe harder"); triage is NOT supervised in
 * gold (judgment, not a type lookup — Kimi S2-5 ruling); a lineage manifest sidecar
 * (seed, distribution, per-row category); the chaos child-pool bug (dead
 * `|| CHILDREN` fallback) is fixed.
 *
 * STANDING CAVEATS: provisional contract => disposable register-probing data;
 * generator rows may NEVER be evals (H4 monoculture).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from './lib/compare-core.mjs';
import { EXPECTED_CONTRACT_VERSION, validateExamplesForProfile } from './lib/tuning-profiles.mjs';

const CHILDREN = Array.from({ length: 12 }, (_, i) => `C${i + 1}`);
const SUPPLIES = ['wipes', 'glue sticks', 'construction paper', 'paper towels', 'playdough', 'band-aids', 'paint cups', 'napkins', 'hand soap', 'sidewalk chalk', 'cotton balls', 'dot markers', 'tissue boxes', 'sandwich bags'];
const ACTIVITIES = ['an apple stamping activity', 'a leaf rubbing table', 'a pumpkin counting game', 'a shape sorting station', 'a family photo collage', 'a water table afternoon', 'a felt board story', 'a bear counting tray', 'a color mixing tray', 'a big-block obstacle course', 'a name-tracing sheet', 'a texture walk'];
const OBSERVATIONS = ['counted five bears all by herself', 'wrote the first letter of a name without help', 'shared the blocks without being asked', 'sat through the whole story today', 'used a full sentence to ask for more', 'poured water without spilling', 'stacked nine blocks', 'matched all the color cards', 'held scissors correctly for the first time', 'hopped on one foot across the rug', 'named four shapes in a row', 'comforted a crying friend unprompted', 'zipped a jacket alone', 'sorted the animals by size', 'traced a whole name today', 'asked a friend to play instead of grabbing', 'built a ramp for the cars on purpose', 'counted to ten with one skip', 'put both shoes on the right feet', 'retold the story with three details'];
const FOLLOW_UPS = ['had a hard time cleaning up', 'refused to nap again', 'cried at drop-off for a while', 'kept taking toys at the sensory table', 'would not try the new snack', 'needed three reminders during circle time', 'melted down at the transition to outside', 'kept climbing on the bookshelf', 'struggled to share the trucks all morning', 'kept dumping the bins after cleanup', 'hid under the table at circle time', 'refused to wash hands before lunch', 'threw sand near friends twice'];
const PARENT_ASKS = ['asked about the nap schedule', 'asked when picture day is', 'said pickup will be early Friday', 'asked how lunch went this week', 'wants to know about potty progress', 'asked about the winter break dates', 'asked if we can use the diaper cream they dropped off', 'wants a quick call about biting', 'asked whether the jacket got found', 'asked about the field trip forms', 'wants the weekly menu emailed', 'asked if grandma can do pickup Thursday', 'asked how the new nap mat is working'];
const PARENT_NOTES = ['send a note about the activity photos', 'reply about the allergy form', 'confirm the early pickup', 'share two photos from the water table', 'send the updated supply wishlist'];
const PREP_TASKS = ['print the family pictures', 'laminate the new name labels', 'cut shapes', 'set up the easel', 'refill the sensory bin', 'swap the job chart names', 'hang the new artwork', 'restock the cubby labels'];
const TIME_BINDERS = ['before circle tomorrow', 'for tomorrow', 'before the morning rush', 'tonight'];
const INCIDENTS = [
  ['bit another friend during cleanup, no skin broken', 'bite'],
  ['slipped off the bottom step of the slide, checked and fine', 'fall'],
  ['had a very rough drop-off, took a long time to settle', 'hard_drop_off'],
  ['scratched a friend reaching for the same truck', 'scratch'],
  ['bumped heads with a friend under the loft, both fine after ice', 'bump'],
];
const PRONOUN_REFS = ['the little guy who had a rough morning', 'she', 'he', 'that same kiddo from yesterday', 'the one who loves the trucks', 'our friend from the blue table', 'the new friend'];
// Non-binding = cannot resolve to an in-dump antecedent (K1). Exported for the semantic regression test.
export const NON_BINDING_REFS = ['the little guy who had a rough morning', 'the one who loves the trucks', 'our friend from the blue table', 'the new friend'];
const NOISE = ['twinkle twinkle little star we sang it like six times today', 'ok where did I put my keys', 'remind me to call my sister back', 'it rained all through outside time today', 'so tired today honestly', 'the copier downstairs is broken again someone said', 'I think the hallway smells like paint', 'note to self drink more water', 'the radio said traffic is bad tomorrow', 'my phone is at 4 percent of course it is', 'I hummed the cleanup song in the car again', 'the vending machine ate my dollar', 'someone left the gym door propped open all day', 'I should really pack my lunch tonight', 'the parking lot line took forever this morning', 'I keep meaning to water that poor plant'];
const CONNECTORS = ['and then', 'oh and', 'also', 'um and', 'ok so', 'oh wait and', 'plus', 'and um'];
const OPENERS = ['today was a lot.', 'ok end of day brain dump.', 'quick notes before I forget.', 'whew ok.', 'today was actually pretty good.', 'brain dump go.', 'ok let me get this out.', ''];
const QUANTIFIERS = ['', 'two more ', 'a few ', 'another pack of ', 'like three '];
const HEDGES = ['', 'I think ', 'pretty sure ', 'if I remember right '];
const TAILS = ['', ' today', ' this afternoon', ' ugh', ' anyway', ' I guess', ' for real'];

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const maybe = (rand, p) => rand() < p;
const hedge = (rand) => pick(rand, HEDGES);
const typo = (rand, text) => {
  if (!maybe(rand, 0.12)) return text;
  const words = text.split(' ');
  const i = Math.floor(rand() * words.length);
  if (words[i].length > 4) words[i] = words[i].slice(0, -1); // dropped-letter dictation typo
  return words.join(' ');
};

// Triage ruling (Kimi S2-5 + GLM H2-10, Fable 2026-08-17): triage is judgment,
// not a function of type — synthetic gold does NOT supervise it at all. A
// type→triage lookup baked into weights is a wrong enumerable rule.
const supplyRecord = (s) => ({ type: 'supply', text: `need ${s}`, attribution: null });
const prepRecord = (p) => ({ type: 'prep_task', text: p, attribution: null });

function chaosDump(rand) {
  const count = 4 + Math.floor(rand() * 5);
  const parts = [];
  const records = [];
  const childPool = [...CHILDREN];
  const takeChild = () => (childPool.length ? childPool.splice(Math.floor(rand() * childPool.length), 1)[0] : null);
  let guard = 0;
  for (let i = 0; i < count && guard < count * 3; i += 1) {
    guard += 1;
    const kind = pick(rand, ['obs', 'follow', 'supply', 'parent', 'prep', 'activity']);
    if (kind === 'obs' || kind === 'follow' || kind === 'parent') {
      const child = takeChild();
      if (child === null) { i -= 1; continue; }
      if (kind === 'obs') {
        const obs = pick(rand, OBSERVATIONS);
        if (maybe(rand, 0.18)) {
          const wrong = pick(rand, CHILDREN.filter((c) => c !== child));
          parts.push(`${wrong} no wait ${child} ${typo(rand, obs)}`);
        } else parts.push(`${child} ${typo(rand, obs)}`);
        records.push({ type: 'developmental_observation', text: obs, attribution: child });
      } else if (kind === 'follow') {
        const f = pick(rand, FOLLOW_UPS);
        parts.push(`${hedge(rand)}${child} ${typo(rand, f)}`);
        records.push({ type: 'child_follow_up', text: f, attribution: child });
      } else {
        const ask = pick(rand, PARENT_ASKS);
        parts.push(`${child}'s ${maybe(rand, 0.5) ? 'mom' : 'dad'} ${typo(rand, ask)}`);
        records.push({ type: 'parent_follow_up', text: ask, attribution: child });
      }
    } else if (kind === 'supply') {
      const s = pick(rand, SUPPLIES);
      const out = maybe(rand, 0.5);
      parts.push(out ? `we are out of ${pick(rand, QUANTIFIERS)}${s}` : `running low on ${s}`);
      records.push(supplyRecord(s));
    } else if (kind === 'prep') {
      const p = pick(rand, PREP_TASKS);
      const timeBound = maybe(rand, 0.5);
      const binder = timeBound ? ` ${pick(rand, TIME_BINDERS)}` : '';
      parts.push(`I still need to ${typo(rand, p)}${binder}`);
      records.push(prepRecord(`${p}${binder}`));
    } else {
      const a = pick(rand, ACTIVITIES);
      parts.push(`${hedge(rand)}I want ${a} for tomorrow`);
      records.push({ type: 'activity', text: a.replace(/^an? /, ''), attribution: null });
    }
  }
  const glue = () => (maybe(rand, 0.7) ? ` ${pick(rand, CONNECTORS)} ` : '. ');
  const text = `${pick(rand, OPENERS)} ${parts.reduce((acc, p, i) => (i ? acc + glue() + p : p), '')}`.trim();
  return { text, records };
}

function microDump(rand) {
  const roll = rand();
  if (roll < 0.4) {
    const s = pick(rand, SUPPLIES);
    const phrasing = pick(rand, [`add: need ${s}`, `we need ${pick(rand, QUANTIFIERS)}${s}`, `out of ${s} again`, `${s} running low`, `${s} almost gone`, `grab ${s} on the supply order`]) + pick(rand, TAILS);
    return { text: phrasing, records: [supplyRecord(s)] };
  }
  if (roll < 0.7) {
    const child = pick(rand, CHILDREN); const obs = pick(rand, OBSERVATIONS);
    return { text: `${child} ${typo(rand, obs)}${pick(rand, ['!!', '!', ' today', ' just now', ''])}`, records: [{ type: 'developmental_observation', text: obs, attribution: child }] };
  }
  const p = pick(rand, PREP_TASKS);
  const timeBound = maybe(rand, 0.4);
  const binder = timeBound ? ` ${pick(rand, TIME_BINDERS)}` : '';
  const phrasing = pick(rand, [`dont let me forget to ${p}${binder}`, `todo ${p}${binder}`, `remember: ${p}${binder}`, `${hedge(rand)}I have to ${p}${binder}`, `note: ${p}${binder}`]) + pick(rand, TAILS);
  return { text: phrasing, records: [prepRecord(`${p}${binder}`)] };
}

function pronounTrapDump(rand) {
  const ref = pick(rand, PRONOUN_REFS);
  const f = pick(rand, FOLLOW_UPS);
  if (maybe(rand, 0.4)) { // pronoun-only dump — no named child anywhere (H1-5)
    return {
      text: `${hedge(rand)}${ref} ${f}${pick(rand, [' again today', ' today', ' this morning', ' again', ' at the end of the day'])}`,
      records: [{ type: 'child_follow_up', text: f, attribution: 'uncertain' }],
    };
  }
  // K1 (GLM H2): two-record branch may use only NON-BINDING descriptives. Bare
  // pronouns bind syntactically; "that same kiddo" binds anaphorically — both
  // would resolve to the named child, so gold=uncertain would be wrong.
  const dref = pick(rand, NON_BINDING_REFS);
  const extraChild = pick(rand, CHILDREN);
  const extraObs = pick(rand, OBSERVATIONS);
  // named child on an UNRELATED topic, then a DESCRIPTIVE ambiguous reference — gold stays uncertain
  return {
    text: `${extraChild} ${extraObs} ${pick(rand, CONNECTORS)} ${dref} ${f} again today`,
    records: [
      { type: 'developmental_observation', text: extraObs, attribution: extraChild },
      { type: 'child_follow_up', text: f, attribution: 'uncertain' },
    ],
  };
}

function resolvableAnaphoraDump(rand) {
  const child = pick(rand, CHILDREN);
  const pronoun = maybe(rand, 0.5) ? 'she' : 'he';
  if (rand() < 0.5) {
    const ask = pick(rand, PARENT_ASKS);
    // "C4's mom stopped me — she asked about lunch": antecedent unambiguous, gold = child
    return {
      text: `${child}'s ${pronoun === 'she' ? 'mom' : 'dad'} stopped me at pickup, ${pronoun} ${ask}`,
      records: [{ type: 'parent_follow_up', text: ask, attribution: child }],
    };
  }
  const obs = pick(rand, OBSERVATIONS);
  const f = pick(rand, FOLLOW_UPS);
  // one child introduced, continued with a pronoun — resolves to that child
  return {
    text: `${child} ${obs} but then ${pronoun} ${f}`,
    records: [
      { type: 'developmental_observation', text: obs, attribution: child },
      { type: 'child_follow_up', text: f, attribution: child },
    ],
  };
}

function incidentDump(rand) {
  const child = pick(rand, CHILDREN);
  const [desc, kind] = pick(rand, INCIDENTS);
  const told = maybe(rand, 0.7);
  const supply = pick(rand, SUPPLIES);
  const tail = maybe(rand, 0.6) ? ` ${pick(rand, CONNECTORS)} we are out of ${supply}` : '';
  return {
    text: `${pick(rand, OPENERS)} ${child} ${desc}${told ? ', I told the family at pickup' : ', still need to tell the family'}${tail}`,
    records: [
      { type: 'child_follow_up', text: `${desc}${told ? ' — family informed at pickup' : ' — family NOT yet informed'}`, attribution: child, flags: ['incident_adjacent', kind] },
      ...(tail ? [supplyRecord(supply)] : []),
      ...(told ? [] : [{ type: 'parent_follow_up', text: 'tell the family about the incident', attribution: child }]),
    ],
  };
}

function parentCommDump(rand) {
  const child = pick(rand, CHILDREN);
  const ask = pick(rand, PARENT_ASKS);
  const child2 = pick(rand, CHILDREN.filter((c) => c !== child));
  const note = pick(rand, PARENT_NOTES);
  return {
    text: `${child}'s mom ${typo(rand, ask)} ${pick(rand, CONNECTORS)} I owe ${child2}'s family — ${note}`,
    records: [
      { type: 'parent_follow_up', text: ask, attribution: child },
      { type: 'parent_follow_up', text: note, attribution: child2 },
    ],
  };
}

const noiseDump = (rand) => ({ text: `${pick(rand, OPENERS)} ${pick(rand, NOISE)}${pick(rand, TAILS)}`.trim(), records: [] });

const CATEGORIES = [
  ['chaos', 0.40, chaosDump],
  ['micro', 0.20, microDump],
  ['pronoun_trap', 0.10, pronounTrapDump],
  ['resolvable_anaphora', 0.05, resolvableAnaphoraDump],
  ['incident', 0.10, incidentDump],
  ['parent_comm', 0.10, parentCommDump],
  ['noise', 0.05, noiseDump],
];

export function generate({ count = 150, seed = 42 } = {}) {
  const rand = mulberry32(seed);
  const rows = [];
  const distribution = {};
  const seenTexts = new Set();
  let collisions = 0;
  for (let i = 0; i < count; i += 1) {
    let roll = rand();
    let picked = CATEGORIES.at(-1);
    for (const cat of CATEGORIES) {
      if (roll < cat[1]) { picked = cat; break; }
      roll -= cat[1];
    }
    const [name, , fn] = picked;
    // rejection-sample: redraw on duplicate text so the combinatorial space is
    // actually used; a collision is counted only when 5 draws all collide,
    // which measures true space exhaustion, not birthday accidents (H1-5).
    let text; let records; let fresh = false;
    for (let attempt = 0; attempt < 5 && !fresh; attempt += 1) {
      ({ text, records } = fn(rand));
      fresh = !seenTexts.has(text);
    }
    if (!fresh) { collisions += 1; continue; }
    seenTexts.add(text);
    distribution[name] = (distribution[name] || 0) + 1;
    rows.push({
      category: name,
      messages: [
        { role: 'user', content: text },
        { role: 'assistant', content: JSON.stringify({ records }) },
      ],
    });
  }
  return { rows, distribution, collisions, collisionRate: collisions / count };
}

function parseArgs(argv) {
  const opts = { count: 150, seed: 42, out: 'agent-tuning-local/raw/classroom-probe/gen-classroom-dumps.jsonl', emitInvalid: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--count' || argv[i] === '--seed' || argv[i] === '--emit-invalid') {
      const n = Number(argv[i + 1]);
      if (!Number.isFinite(n)) { console.error(`[gen-classroom] ${argv[i]} must be a number.`); process.exit(1); }
      opts[{ '--count': 'count', '--seed': 'seed', '--emit-invalid': 'emitInvalid' }[argv[i]]] = n; i += 1;
    } else if (argv[i] === '--out') { opts.out = argv[i + 1]; i += 1; }
    else { console.error(`[gen-classroom] unknown argument "${argv[i]}"`); process.exit(1); } // F3: a swallowed typo corrupts the lineage manifest
  }
  return opts;
}

/**
 * Kimi H2 dissent: validator torture rows — deliberately contract-violating
 * outputs so every validator rule is volume-tested the day it lands. Written
 * to a SEPARATE .invalid.jsonl, never into training data.
 */
export function generateInvalid(count = 10, seed = 999) {
  const rand = mulberry32(seed);
  const makers = [
    () => ({ records: ['a bare string record'] }),
    () => ({ records: [{ type: 'supply', text: 'x', attribution: null, confidence: 0.9 }] }),
    () => ({ records: [{ type: 'nap_time', text: 'x', attribution: null }] }),
    () => ({ records: [{ type: 'supply', text: 'x', attribution: 'C0' }] }),
    () => ({ records: [{ type: 'supply', text: 'x', attribution: null }], summary: 'extra' }),
    () => ({ records: Array.from({ length: 21 }, () => ({ type: 'supply', text: 'x', attribution: null })) }),
    () => ({ records: [{ type: 'supply', text: '', attribution: null }] }),
    () => ({ records: [{ type: 'supply', text: 'x' }] }),
  ];
  return Array.from({ length: count }, (_, i) => ({
    messages: [
      { role: 'user', content: `torture input ${i + 1} seed ${seed}` },
      { role: 'assistant', content: JSON.stringify(makers[Math.floor(rand() * makers.length)]()) },
    ],
  }));
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const { rows, distribution, collisions, collisionRate } = generate(opts);
  if (collisionRate > 0.01) {
    console.error(`[gen-classroom] collision rate ${(collisionRate * 100).toFixed(1)}% exceeds 1% at count ${opts.count} — expand the grammar, don't dedupe harder (H1-5).`);
    return 1;
  }
  const { problems, warnings } = validateExamplesForProfile(rows, 'classroom-extract-v1');
  for (const warning of warnings) console.warn(`[gen-classroom] warning: ${warning}`);
  if (problems.length) {
    for (const problem of problems.slice(0, 10)) console.error(`[gen-classroom] problem: ${problem}`);
    console.error(`[gen-classroom] ${problems.length} problem(s) — generator bug, nothing written.`);
    return 1;
  }
  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, `${rows.map((r) => JSON.stringify({ messages: r.messages })).join('\n')}\n`, 'utf8');
  const provisional = EXPECTED_CONTRACT_VERSION.includes('provisional');
  writeFileSync(`${opts.out}.manifest.json`, JSON.stringify({
    seed: opts.seed, requested: opts.count, written: rows.length, collisions, collisionRate,
    contract: `classroom-extract@${EXPECTED_CONTRACT_VERSION}`, // never hardcode — a version bump must reflect here (GLM nit)
    disposable: provisional, // machine-checkable: a future trainer entrypoint must refuse disposable manifests (GLM dissent 3)
    distribution, perRowCategory: rows.map((r) => r.category),
  }, null, 2), 'utf8');
  if (opts.emitInvalid > 0) {
    const invalid = generateInvalid(opts.emitInvalid, opts.seed + 1);
    const { problems: invalidProblems } = validateExamplesForProfile(invalid, 'classroom-extract-v1');
    const rowsFailing = new Set(invalidProblems.map((p) => p.match(/Line (\d+)/)?.[1])).size;
    if (rowsFailing !== invalid.length) {
      console.error(`[gen-classroom] TORTURE-TEST GAP: only ${rowsFailing}/${invalid.length} invalid rows caught — a validator rule has a hole.`);
      return 1;
    }
    // .quarantine extension — NOT a builder source extension, so torture rows
    // can never be swept into a training build (self-caught contamination 2026-08-17)
    writeFileSync(`${opts.out}.invalid.quarantine`, `${invalid.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
    console.log(`[gen-classroom] torture set: ${invalid.length}/${invalid.length} invalid rows correctly rejected → ${opts.out}.invalid.quarantine (JSONL content; extension keeps it out of builds).`);
  }
  console.log(`[gen-classroom] wrote ${rows.length}/${opts.count} rows to ${opts.out} (seed ${opts.seed}, collisions ${collisions})`);
  console.log(`[gen-classroom] distribution: ${JSON.stringify(distribution)}`);
  console.log('[gen-classroom] REMINDER: provisional contract — disposable register-probing data; never use generator rows as evals (H4).');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main();
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
  buildExamples,
  collectSourceFiles,
  createEvalSeed,
  createWorkspace,
  readTrainingJsonl,
  validateTrainingExamples,
  writeJsonl,
} from './lib/agent-tuning-core.mjs';
import { isTrackProfile, validateExamplesForProfile } from './lib/tuning-profiles.mjs';

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
      i += 1;
    } else if (arg === '--out') {
      opts.out = next;
      i += 1;
    } else if (arg === '--file') {
      opts.file = next;
      i += 1;
    } else if (arg === '--max-examples') {
      opts.maxExamples = Number(next);
      i += 1;
    } else if (arg === '--min-assistant-chars') {
      opts.minAssistantChars = Number(next);
      i += 1;
    } else if (arg === '--count') {
      opts.count = Number(next);
      i += 1;
    } else if (arg === '--allow-small') {
      opts.allowSmall = true;
    } else if (!arg.startsWith('--')) {
      opts.sources.push(arg);
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
    createWorkspace(opts.root);
    const result = buildExamples(opts);
    writeJsonl(opts.out, result.examples.map(({ messages }) => ({ messages })));
    writeJsonl(join(opts.root, 'reports', 'latest-sources.jsonl'), result.examples);
    console.log(`[agent-tuning] read ${result.files.length} source file(s)`);
    console.log(`[agent-tuning] wrote ${result.examples.length} training example(s) to ${opts.out}`);
    console.log(`[agent-tuning] redactions: ${summarizeRedactions(result.redactions)}`);
    for (const warning of result.warnings) console.warn(`[agent-tuning] warning: ${warning}`);
    const profileProblems = reportProfileValidation(result.examples, opts.profile);
    if (profileProblems > 0) {
      // A failed build must not leave a poisoned dataset where a trainer can find it.
      const rejected = `${opts.out}.rejected`;
      writeFileSync(rejected, readFileSync(opts.out, 'utf8'), 'utf8');
      writeFileSync(opts.out, '', 'utf8');
      console.error(`[agent-tuning] build FAILED profile validation — output quarantined to ${rejected}, dataset file emptied.`);
    }
    return result.examples.length > 0 && profileProblems === 0 ? 0 : 1;
  }

  if (opts.command === 'validate') {
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
