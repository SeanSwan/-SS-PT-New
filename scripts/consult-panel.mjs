#!/usr/bin/env node
/**
 * consult-panel.mjs — ONE command that fans a document out to the registered
 * hostile-review seats in deterministic order, then hands the replies back for an
 * explicit adjudicator. The current Public-Creative-Lab default is the two
 * zero-dollar GLM seats; the active GPT builder supplies the third pass.
 * =====================================================================
 * Current packet directive: GLM 5.3 Flash, GLM 5.3, and whichever GPT agent
 * is actively building/orchestrating. No paid seat is part of this topology.
 *
 * EXTERNAL SEATS (the active GPT adjudicator is not spawned here; it runs
 * locally after both replies are verified):
 *
 *   seat  script              billing                       gate
 *   ----  ------------------  ----------------------------  ------------------
 *   glmflash consult-ox.mjs  GLM 5.3 Flash via Z.ai subscription, $0
 *   glm      consult-glm.mjs  GLM 5.3 via Z.ai subscription, $0
 *
 * The registry retains legacy seats for other explicitly authorized packet
 * types, but they are never implied by this default or silently substituted.
 *
 * WHY NOT ":batch" (the half-price GPT-5.6 Sol Pro listing Sean spotted):
 * `openai/gpt-5.6-sol-pro:batch` IS the same model at exactly 50% off
 * ($1.25/M in, $7.50/M out) — but it is served by OpenRouter's ASYNC Batch
 * API (POST /api/beta/batches, poll GET /api/beta/batches/:id) on a 24-HOUR
 * completion window. It is not reachable from a synchronous /chat/completions
 * call, so it cannot drop into these scripts. On a typical ~20k-in/8k-out
 * review packet the discount saves about $0.09 — nine cents — in exchange for
 * up to a day of latency. Not worth it for interactive review. Revisit only
 * if we ever queue a large overnight sweep; see PANEL-AND-MODEL-ROUTING.md.
 *
 * Usage:
 *   node scripts/consult-panel.mjs --document <path> [--seed <path>]
 *        [--out-dir docs/ai-workflow/AI-HANDOFF/panel-<date>-<document-slug>[-N]]
 *        [--seats glmflash,glm] [--adjudicator "<owner>"] [--remit "<override>"]
 *        [--dry-run] [--confirm-spend]
 *
 * Safety: paid or legacy seats are never inferred from this default.
 *   default            -> only glmflash and glm run and send the document.
 *   explicit roster    -> other registry seats require their own policy and,
 *                         where applicable, --confirm-spend.
 *   --confirm-spend    -> all requested seats run, including paid ones.
 *   --dry-run          -> nothing runs at all; prints the plan + cost estimate.
 *                         This is the ONLY flag that guarantees no egress.
 * Rule 16 spend gate applies to paid seats. The Public-Creative-Lab policy
 * uses only `glm,glmflash`; its third pass is the active builder's local
 * hostile review and is not a model seat. See the current packet policy doc.
 *
 * Privacy (Rule 8/44/59): this script never reads or prints API keys; each
 * seat script loads its own. Keep the document to IDs + roles, no PII.
 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { DEFAULT_REMIT } from './lib/panel-remit.mjs';
import { validateEvidenceMarkers, validateVerdictContract } from './lib/panel-artifact.mjs';
import { buildSeats } from './lib/panel-seats.mjs';
import { validateLiveWindowNarration } from './lib/panel-window.mjs';
import { redactForEgress, selfTest as selfTestRedactor } from './lib/redact-egress.mjs';

// Resolve sibling seat scripts from THIS file, not from cwd — the panel must
// work when invoked from a subdirectory or by a hook.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (flag, fallback = '') => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const documentPath = arg('--document');
const seedPath = arg('--seed');
const confirmSpend = argv.includes('--confirm-spend');
const dryRun = argv.includes('--dry-run');
const adjudicator = arg('--adjudicator', 'active GPT builder/orchestrator');
const reviewRoundId = `panel_${randomUUID()}`;
const stamp = new Date().toISOString().slice(0, 10);
// COLLISION SAFETY (2026-08-23). The default used to be `panel-<date>`, which every
// run on that date shared. Three panels on three DIFFERENT documents landed in one
// directory and overwrote each other by filename: five of seven replies to a
// forensics report were destroyed, including the strongest seat's, with no error and
// no warning. Paid output, gone. The slug gives each document its own directory by
// default; the allocator below also gives each same-document run a fresh directory.
const docSlug = (documentPath.split(/[\\/]/).pop() || 'document')
  .replace(/\.md$/i, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48);
const requestedOutDir = arg('--out-dir', null);
const baseOutDir = requestedOutDir ?? `docs/ai-workflow/AI-HANDOFF/panel-${stamp}-${docSlug}`;
let outDir = baseOutDir;
if (!requestedOutDir) {
  // A same-document rerun must not replace a prior provider report or receipt.
  // Keep the first directory readable, then allocate deterministic numeric suffixes
  // for later runs. Explicit --out-dir remains governed by the guard below.
  let collisionIndex = 1;
  while (existsSync(outDir)) {
    outDir = `${baseOutDir}-${collisionIndex}`;
    collisionIndex += 1;
  }
}
// Dedupe: `--seats kimi,kimi` is a typo, but without this it would fire a PAID
// seat twice and bill twice for one review.
const requested = [...new Set(
  arg('--seats', 'glmflash,glm').split(',').map((s) => s.trim()).filter(Boolean),
)];

if (!documentPath) {
  console.error('usage: node scripts/consult-panel.mjs --document <path> [--seed <path>] [--seats glmflash,glm] [--adjudicator "<owner>"] [--remit "<override>"] [--confirm-spend]');
  process.exit(1);
}
if (!existsSync(documentPath)) {
  console.error(`document not found: ${documentPath}`);
  process.exit(1);
}

const remit = arg('--remit', DEFAULT_REMIT);

// Seat roster + pricing live in ./lib/panel-seats.mjs (extracted 2026-08-21
// when the two DeepSeek V4 seats pushed this file past the 300-line cap).
const SEATS = buildSeats(remit);

// An EMPTY seat list is an error, not a no-op. `--seats ""` (or a scripted
// `--seats "$VAR"` with VAR unset, or a stray comma) previously fell straight
// through to "nothing was sent, nothing was spent" and exited 0 - a run that
// reviewed NOTHING while reporting success. That is the same silence-looks-like-
// success failure the seat wall-clock cap exists to prevent: the operator is left
// believing a panel covered the document when no seat ever saw it.
if (!requested.length) {
  console.error('no seats requested. Pass --seats with at least one of: ' + Object.keys(SEATS).join(', '));
  process.exit(1);
}

const unknown = requested.filter((s) => !SEATS[s]);
if (unknown.length) {
  console.error(`unknown seat(s): ${unknown.join(', ')} — valid: ${Object.keys(SEATS).join(', ')}`);
  process.exit(1);
}

const document = readFileSync(documentPath, 'utf-8');
const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';
// The Public-Creative-Lab packet claims its live-window prose is generated from
// the checked-in annex. Enforce that claim before any provider child is spawned;
// a stale §J/§K projection must never reach an external seat or earn evidence.
const normalizedDocumentPath = documentPath.replace(/\\/g, '/');
if (normalizedDocumentPath.endsWith('/PUBLIC-CREATIVE-LAB-HOSTILE-REVIEW-AND-BUILD-BLUEPRINT-2026-08-25.md')) {
  const annexPath = join(SCRIPT_DIR, '..', 'docs', 'ai-workflow', 'AI-HANDOFF', 'PANEL-LEDGER-ANNEX-V1.json');
  try {
    const annex = JSON.parse(readFileSync(annexPath, 'utf8'));
    const liveWindowError = validateLiveWindowNarration(document, annex.map((entry) => entry.roundId));
    if (liveWindowError) {
      console.error(`[panel] live-window narration gate FAILED — refusing provider dispatch: ${liveWindowError}`);
      process.exit(1);
    }
    console.log('[panel] live-window narration gate: passed');
  } catch (err) {
    console.error(`[panel] live-window narration gate FAILED — refusing provider dispatch: ${err.message}`);
    process.exit(1);
  }
}
try {
  selfTestRedactor();
  console.log('[panel] review-packet-scrub-canary: passed');
} catch (err) {
  console.error(`[panel] review-packet-scrub-canary: FAILED — refusing provider dispatch: ${err.message}`);
  process.exit(1);
}
// Rough token estimate: ~4 chars/token. Used ONLY for the pre-spend estimate,
// never for billing truth — each seat reports its own real usage.
const promptTok = Math.round((remit.length + document.length + seed.length) / 4);
const ASSUMED_OUT_TOK = 6000;
const REQUIRED_REPLY_HEADINGS = ['## VERDICT', '## BLOCKERS', '## ATTACKS', '## HIGHEST RISK', '## CONFIDENCE'];
const MIN_REPLY_BYTES = 2048;
const MAX_REPLY_BYTES = 262144;
// Provider transport failures are machine-marker lines, not ordinary words in a
// review. Mask Markdown code and blockquotes before scanning so a reviewer can
// quote the contract or a prior void without making its own artifact invalid.
const INVALID_ARTIFACT_MARKER = /^\s*(?:INCOMPLETE|finish:error|upstream error|socket closed)\s*$/im;

function maskQuotedMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\r\n]/g, ' '))
    .replace(/`[^`\r\n]*`/g, (span) => span.replace(/[^\r\n]/g, ' '))
    .replace(/^\s*>[^\r\n]*$/gm, (quote) => quote.replace(/[^\r\n]/g, ' '));
}

function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

// A seat process can exit 0 after writing an empty/truncated file. That is an
// invalid review artifact, not a clean seat. Every required section must have
// non-whitespace content, and the whole round is void if any requested seat is
// invalid; this prevents a missing lens from being mistaken for dry evidence.
function validateReplyArtifact(replyText) {
  const byteLength = Buffer.byteLength(replyText, 'utf8');
  if (byteLength < MIN_REPLY_BYTES) return `artifact below ${MIN_REPLY_BYTES}-byte minimum`;
  if (byteLength > MAX_REPLY_BYTES) return `artifact exceeds ${MAX_REPLY_BYTES}-byte maximum`;
  if (INVALID_ARTIFACT_MARKER.test(maskQuotedMarkdown(replyText))) {
    return 'artifact contains an incomplete/provider-error marker';
  }
  try {
    const { hits } = redactForEgress(replyText);
    if (hits.length) {
      return `reply egress scan found ${hits.reduce((n, hit) => n + hit.count, 0)} secret/identity-shaped value(s)`;
    }
  } catch (err) {
    return `reply egress scan failed closed: ${err.message}`;
  }
  const missing = REQUIRED_REPLY_HEADINGS.filter((heading) => !replyText.includes(heading));
  if (missing.length) return `missing required headings: ${missing.join(', ')}`;
  const evidenceError = validateEvidenceMarkers(replyText);
  if (evidenceError) return evidenceError;
  const empty = REQUIRED_REPLY_HEADINGS.filter((heading, index) => {
    const start = replyText.indexOf(heading) + heading.length;
    const next = REQUIRED_REPLY_HEADINGS.slice(index + 1)
      .map((candidate) => replyText.indexOf(candidate, start))
      .filter((position) => position >= 0)
      .sort((a, b) => a - b)[0] ?? replyText.length;
    return !replyText.slice(start, next).trim();
  });
  if (empty.length) return `required headings have empty sections: ${empty.join(', ')}`;
  return validateVerdictContract(replyText);
}

console.log(`[panel] document=${documentPath} (${document.length} chars, ~${promptTok} tok)`);
console.log(`[panel] seats=${requested.join(', ')}  out-dir=${outDir}`);
// The mode label describes the SPEND gate, never whether anything is sent. Calling
// the un-confirmed state "DRY-RUN" was a lie: `--dry-run` is a separate flag that
// exits before any request, whereas omitting --confirm-spend still RUNS every
// paid:false seat. With ox (an undisclosed provider that RETAINS prompts) and gemini
// (a metered Google key) both free-and-default, an operator reading "DRY-RUN" would
// believe nothing left the machine while the document was already being egressed.
// Found by two independent panel seats, 2026-08-23, and reproduced directly:
// `--seats qwen` with no flags printed "mode=DRY-RUN" and then "running: qwen".
const freeSeats = requested.filter((n) => !SEATS[n].paid);
const modeLabel = confirmSpend
  ? 'LIVE (all requested seats)'
  : `PAID SEATS GATED — ${freeSeats.length} free seat(s) WILL still run and send this document`;
console.log(`[panel] mode=${modeLabel}`);

// A DATA crossing must be announced in its own currency. Round 2 of the panel noted
// that `--seats ox` prints only the money label, priming the operator to think about
// dollars while a prompt-RETAINING undisclosed provider is about to receive the
// document. `premium` now covers both axes, so the warning has to name which one.
const retaining = requested.filter((n) => SEATS[n].premium && !SEATS[n].paid);
if (retaining.length) {
  console.log(
    `[panel] ⚠ DATA EGRESS — ${retaining.map((n) => SEATS[n].label).join(', ')}: ` +
    'costs $0 but an undisclosed provider RETAINS this prompt. Send only what you ' +
    'would send any vendor; the spend gate does NOT cover this.'
  );
}
console.log('');

let estimate = 0;
for (const name of requested) {
  const s = SEATS[name];
  const cost = (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
  estimate += cost;
  const billing = s.paid ? `~$${cost.toFixed(4)}` : '$0';
  console.log(`  ${name.padEnd(5)} ${s.label.padEnd(18)} ${billing.padStart(9)}  — ${s.note}`);
}
console.log(`\n[panel] estimated spend for this run: ~$${estimate.toFixed(4)} (assumes ${ASSUMED_OUT_TOK} output tok/seat)`);

// PREMIUM SEATS: priced on EVERY run even when NOT requested. Sean's standing ask
// (2026-08-22) is to be told what Fable and Sol would cost each time so the yes/no is
// informed. Printing unconditionally means the answer is already on screen - no second
// dry-run, no guessing, and no silent omission of the expensive option.
const premiumAvailable = Object.keys(SEATS).filter((n) => SEATS[n].premium && !requested.includes(n));
if (premiumAvailable.length) {
  console.log('\n[panel] PREMIUM seats NOT included - ask Sean before adding:');
  for (const n of premiumAvailable) {
    const ps = SEATS[n];
    const c = (promptTok / 1e6) * ps.inPerM + (ASSUMED_OUT_TOK / 1e6) * ps.outPerM;
    // The hint must be the command that ACTUALLY works for this seat. A free
    // opt-in seat (ox) needs naming but not --confirm-spend; printing the money
    // flag for it teaches a wrong incantation and implies a cost of dollars when
    // the real cost is disclosure. Say what it costs in its own currency.
    const how = ps.paid ? `--seats ...,${n} --confirm-spend` : `--seats ...,${n}`;
    const price = ps.paid ? `would add ~$${c.toFixed(4)}` : 'no $ cost — gated on DATA';
    console.log(`  + ${n.padEnd(6)} ${ps.label.padEnd(18)} ${price.padEnd(26)} (${how})`);
  }
}

// Spend gate. The gate exists to protect MONEY (Rule 16), so it applies to the
// paid seats only — making the free local/subscription seats demand a spend
// confirmation would train the reflex of typing --confirm-spend by habit,
// which is exactly how a real spend gate stops working.
// Premium seats were removed from the DEFAULT roster, so a bare
// `--document X --confirm-spend` can never reach Fable's $10/$50. Naming one is the
// deliberate act that authorises it.
const premiumRequested = requested.filter((n) => SEATS[n].premium);
if (premiumRequested.length && confirmSpend) {
  console.log(`\n[panel] PREMIUM seat(s) explicitly requested and confirmed: ${premiumRequested.join(', ')}`);
}
const paidRequested = requested.filter((n) => SEATS[n].paid);
const skipped = confirmSpend ? [] : paidRequested;
const seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid);

if (dryRun) {
  console.log('\n[panel] --dry-run — nothing was sent, nothing was spent.');
  // A dry-run must PREVIEW the real run's outcome, including its exit code. Without
  // this, `--seats fable --dry-run` exited 0 while the identical run without
  // --dry-run exits 1 for zero coverage — so the preview contradicted the thing it
  // previews, which is the one job it has. Caught by a panel seat in round 3.
  if (!seatsToRun.length) {
    console.error('[panel] …and the real run would review NOTHING (every requested seat is gated). Exiting 1 to match.');
    process.exit(1);
  }
  process.exit(0);
}
if (skipped.length) {
  console.log(`\n[panel] SKIPPING paid seats (${skipped.join(', ')}) — no --confirm-spend.`);
  console.log('[panel] re-run with --confirm-spend once Sean approves the spend above.');
}
if (!seatsToRun.length) {
  // NON-ZERO. Zero seats ran, so zero coverage was produced — a caller checking $?
  // would otherwise read "panel completed successfully" from a run that reviewed
  // nothing. Same failure the empty-`--seats` guard exists to stop, reached through
  // a different door (`--seats kimi` with no --confirm-spend), and caught by a panel
  // seat in round 2. The message was already honest; the EXIT CODE was not, and the
  // exit code is the half that automation reads.
  console.error('[panel] no runnable seats — every requested seat is paid and unconfirmed. Nothing spent, and NOTHING REVIEWED.');
  console.error('[panel] re-run with --confirm-spend, or request a free seat.');
  process.exit(1);
}
console.log(`[panel] running: ${seatsToRun.join(', ')}\n`);

// GUARD: never silently overwrite another document's panel. The slug default makes
// this rare, but an explicit --out-dir can still collide, and the failure mode is
// invisible — replies are overwritten by filename, INDEX.md is rewritten, and the
// run reports success. Fail loudly instead; --force is the deliberate escape hatch.
const priorIndexPath = join(outDir, 'INDEX.md');
if (existsSync(priorIndexPath)) {
  const priorDoc = (readFileSync(priorIndexPath, 'utf-8')
    .match(/^\*\*Document under review:\*\*\s*`([^`]+)`/m) || [])[1];
  const norm = (p) => String(p || '').replace(/\\/g, '/').trim();
  if (priorDoc && norm(priorDoc) !== norm(documentPath) && !argv.includes('--force')) {
    console.error(`\n[panel] REFUSING TO WRITE — ${outDir} already holds a panel for a DIFFERENT document.`);
    console.error(`  existing: ${priorDoc}`);
    console.error(`  this run: ${documentPath}`);
    console.error('  Writing here overwrites those replies by filename and destroys them silently.');
    console.error('  Use a different --out-dir, or --force to overwrite deliberately.\n');
    process.exit(4);
  }
}

mkdirSync(outDir, { recursive: true });

// Snapshot the exact bytes once before any provider child starts. Seat scripts
// receive this private per-run copy rather than reopening a mutable working-tree
// path, so every seat is bound to one dispatch hash even if the source file changes
// while a long GLM response is streaming.
const dispatchSnapshotDir = mkdtempSync(join(tmpdir(), 'swan-public-creative-panel-'));
const dispatchDocumentPath = join(dispatchSnapshotDir, 'packet.md');
writeFileSync(dispatchDocumentPath, document, 'utf8');
const dispatchDocumentSha256 = sha256Hex(document);
if (sha256Hex(readFileSync(dispatchDocumentPath, 'utf8')) !== dispatchDocumentSha256) {
  rmSync(dispatchSnapshotDir, { recursive: true, force: true });
  console.error('[panel] dispatch snapshot hash mismatch - refusing provider dispatch.');
  process.exit(17);
}

// Per-seat hard wall-clock cap. WHY: the ordered run waits for EVERY seat, so a
// single seat that never exits would prevent INDEX.md — the artifact recording which seats
// actually ran, and therefore whether this panel is COMPLETE — is never written at
// all. The operator is then left guessing coverage, which is precisely the
// "silence looks like success" failure the INDEX exists to prevent.
// Calibration, 2026-08-21 (measured, not guessed): on a ~6.3k-token packet the
// seven seats returned in 20.9s (kimi), 26.7s (qwen), 157.6s (dspro), 228.9s (glm),
// 268.0s (grok), 356.9s (sol) and 813.5s (dsflash). DeepSeek V4 Flash spends most
// of that budget on reasoning deltas that carry no delta.content, so for ~13 minutes
// it looks identical to a stuck seat while being perfectly healthy — and because
// consult-grok's idle watchdog pokes on any BYTE received, it would not fire even
// on a genuinely stuck one. The cap is therefore set well ABOVE the slowest observed
// healthy seat: it exists to bound a truly stuck child, not to police slow reasoning.
// Do not lower it toward 813s — that would kill a seat we have watched succeed.
const SEAT_WALL_MS = Number(process.env.SWAN_PANEL_SEAT_WALL_MS || 1_800_000);

/** Run one seat as a child process. Never rejects — a dead seat must not kill the panel. */
function runSeat(name) {
  const s = SEATS[name];
  const outPath = join(outDir, s.out);
  // Every seat receives the same immutable, pre-hashed snapshot.
  const args = [join(SCRIPT_DIR, s.script), ...s.args(dispatchDocumentPath, outPath)];
  if (seedPath && s.script !== 'consult-qwen.mjs' && s.script !== 'consult-glm.mjs' && s.script !== 'consult-ox.mjs') args.push('--seed', seedPath);

  return new Promise((settle) => {
    const t0 = Date.now();
    console.log(`[panel] -> ${name} (${s.label}) started`);
    // shell:false + argv array: the remit contains quotes and newlines that a
    // shell would mangle on Windows. execPath keeps us on this same Node.
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        ...(s.env || {}),
        SWAN_GLM_REVIEW_ROUND_ID: reviewRoundId,
      },
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(wallTimer);
      settle(result);
    };
    const wallTimer = setTimeout(() => {
      console.error(`[panel] ${name} exceeded ${SEAT_WALL_MS / 1000}s with no exit — killing so the INDEX can be written.`);
      child.kill('SIGKILL');
      finish({
        name, label: s.label, outPath, ok: false, truncated: false,
        wall: ((Date.now() - t0) / 1000).toFixed(1),
        error: `hung: no exit within ${SEAT_WALL_MS / 1000}s (killed). A reasoning-only stream can defeat the transport idle watchdog.`,
      });
    }, SEAT_WALL_MS);

    let stderr = '';
    child.stdout.on('data', (d) => process.stdout.write(`   [${name}] ${d}`));
    child.stderr.on('data', (d) => { stderr += d; process.stderr.write(`   [${name}] ${d}`); });
    child.on('error', (err) => {
      finish({ name, label: s.label, ok: false, outPath, wall: 0, error: `spawn failed: ${err.message}` });
    });
    child.on('close', (code) => {
      const wall = ((Date.now() - t0) / 1000).toFixed(1);
      const wrote = existsSync(outPath);
      const replyText = wrote ? readFileSync(outPath, 'utf-8') : '';
      const artifactError = code === 0 && wrote ? validateReplyArtifact(replyText) : null;
      const invalidReply = Boolean(artifactError);
      // A seat can exit non-zero AND still have written a truncated reply
      // (exit 2 = hit max_tokens). Surface that rather than silently dropping it.
      // `ok` already requires BOTH exit 0 and a written file, but the error message
      // was keyed on the exit code alone — so a seat that exited 0 and wrote nothing
      // was recorded as failed with `error: null`, printed as "hy3 — null". A failure
      // whose reason is the word "null" tells the operator nothing and reads like a
      // bug in the panel rather than in the seat.
      //
      // That is exactly how the HY3 seat's first run presented (2026-08-23): its
      // script carries its own spend gate, the seat args omitted --confirm-spend, so
      // it ran preflight, wrote no file, and exited 0 — reporting success while
      // reviewing nothing. Name that state explicitly; it is the seat-level form of
      // the silent-clean failure this repo has spent a session hunting.
      const silentNoOp = code === 0 && !wrote;
      finish({
        name, label: s.label, outPath, wall,
        ok: code === 0 && wrote && !invalidReply,
        truncated: code === 2 && wrote,
        error: code === 0 && wrote && !invalidReply
          ? null
          : invalidReply
            ? `exited 0 but wrote an invalid review artifact — ${artifactError}`
          : silentNoOp
            ? `exited 0 but wrote NO reply — the seat believes it succeeded while reviewing nothing. Check whether its script needs a flag the seat args omit (e.g. its own --confirm-spend): ${stderr.trim().slice(-300)}`
            : `exit ${code}${wrote ? ' (partial reply written)' : ' (no output)'}: ${stderr.trim().slice(-300)}`,
      });
    });
  });
}

const results = [];
for (const seatName of seatsToRun) {
  results.push(await runSeat(seatName));
}
rmSync(dispatchSnapshotDir, { recursive: true, force: true });

// Only the seats that actually ran can have cost anything. Reporting the
// full requested-set estimate here would overstate spend whenever paid seats
// were gated out — the exact class of drift just fixed in consult-sol.mjs.
const spentEstimate = seatsToRun.reduce((sum, n) => {
  const s = SEATS[n];
  return sum + (promptTok / 1e6) * s.inPerM + (ASSUMED_OUT_TOK / 1e6) * s.outPerM;
}, 0);

// Payload-free evidence receipt: hashes, sizes, served model identity, and the
// exact transport script hash prove which reply bytes were reviewed without
// copying provider text into the index or another artifact.
const artifactReceipt = {
  schemaVersion: 'panel-artifact-v1',
  documentSha256: dispatchDocumentSha256,
  generatedAt: new Date().toISOString(),
  seats: results.map((r) => {
    const reply = existsSync(r.outPath) ? readFileSync(r.outPath, 'utf8') : '';
    const seat = SEATS[r.name];
    const scriptPath = join(SCRIPT_DIR, seat.script);
    const scriptText = existsSync(scriptPath) ? readFileSync(scriptPath, 'utf8') : '';
    return {
      seat: r.name,
      model: seat.model ?? seat.label,
      scriptSha256: scriptText ? sha256Hex(scriptText) : null,
      status: r.ok ? 'valid' : r.truncated ? 'truncated' : 'invalid',
      byteLength: Buffer.byteLength(reply, 'utf8'),
      replySha256: reply ? sha256Hex(reply) : null,
      wallSeconds: r.wall,
    };
  }),
};
const artifactReceiptPath = join(outDir, 'PANEL-ARTIFACT-RECEIPT.json');
writeFileSync(artifactReceiptPath, `${JSON.stringify(artifactReceipt, null, 2)}\n`, 'utf8');

const validSeatCount = results.filter((r) => r.ok).length;
const failedBeforeArtifactCount = results.filter((r) => !r.ok && !r.truncated).length;

const index = [
  `# Hostile Review Panel — ${stamp}`,
  '',
  `**Document under review:** \`${documentPath}\``,
  seedPath ? `**Seed context:** \`${seedPath}\`` : '**Seed context:** (none)',
      `**Seats run:** ${seatsToRun.join(', ')} · **Estimated spend:** ~$${spentEstimate.toFixed(4)}`,
      `**Active GPT pass:** ${adjudicator} (the third local adjudication pass; not an external seat)`,
  `**Artifact contract:** panel-artifact-v1 · minimum ${MIN_REPLY_BYTES} UTF-8 bytes · invalid seat voids the round · [digest receipt](./PANEL-ARTIFACT-RECEIPT.json)`,
  // Never say "full panel" unless every seat actually ran. A partial panel
  // that reads as complete is how a missing perspective turns into false
  // confidence downstream (Rule 75 — copy describes what the run ACTUALLY did).
      skipped.length
        ? `**Seats SKIPPED (unconfirmed spend):** ${skipped.join(', ')} — this panel is INCOMPLETE; ${validSeatCount} of ${requested.length} requested external seats returned valid artifacts; ${failedBeforeArtifactCount} attempted seat(s) failed before artifact; the active GPT pass is the third local adjudication pass.`
        : failedBeforeArtifactCount
          ? `**Coverage:** ${validSeatCount} of ${requested.length} requested external seats returned valid artifacts; ${failedBeforeArtifactCount} failed before artifact; the active GPT pass is the third local adjudication pass.`
          : `**Coverage:** all ${requested.length} requested external seats returned valid artifacts; the active GPT pass is the third local adjudication pass.`,
  '',
  `> **Adjudication owner:** ${adjudicator}. Seat replies are ADVISORY INPUT. The owner`,
  '> arbitrates contradictions against the house rules and owns the packet verdict.',
  '> This does not replace any repo-level owner or Rule 46 commit gate. A seat reply',
  '> is a HYPOTHESIS until verified (Rule 30) — findings',
  '> must be checked against the real code before any of them is acted on.',
  '',
  '| Seat | Model | Status | Wall | Reply |',
  '|---|---|---|---|---|',
  ...results.map((r) => {
    const status = r.ok ? '✅ ok' : r.truncated ? '⚠ TRUNCATED' : '❌ failed';
    const link = existsSync(r.outPath) ? `[reply](./${SEATS[r.name].out})` : '—';
    return `| ${r.name} | ${r.label} | ${status} | ${r.wall}s | ${link} |`;
  }),
  '',
  '## Failures',
  ...(results.filter((r) => !r.ok).length
    ? results.filter((r) => !r.ok).map((r) => `- **${r.name}** — ${r.error}`)
    : ['- none — all seats returned.']),
  '',
  `## Adjudication — ${adjudicator}`,
  '',
  `_Pending — ${adjudicator} fills this in after reading every reply above._`,
  '',
  '1. **Consensus** — what two or more seats independently flagged (highest signal).',
  '2. **Contradictions** — where seats disagree, and which is right on the evidence.',
  '3. **Unique insight** — a real finding only one seat saw.',
  '4. **Blind spots** — what NO seat looked at, that a human reviewer would.',
  '5. **Verified verdict** — the arbitrated call, with the findings confirmed against real code.',
  '',
].join('\n');

const indexPath = join(outDir, 'INDEX.md');
writeFileSync(indexPath, index, 'utf-8');

const okCount = results.filter((r) => r.ok).length;
console.log(`\n[panel] ${okCount}/${results.length} seats returned cleanly -> ${indexPath}`);
for (const r of results.filter((x) => !x.ok)) console.error(`[panel] ⚠ ${r.name}: ${r.error}`);
// Any invalid requested seat voids the round. A partial panel is not admissible
// evidence for the two-consecutive-clean-round gate; rerun after the cause is
// corrected. Keep a distinct code from all-seat infrastructure failure.
if (results.some((r) => !r.ok)) {
  console.error('[panel] one or more seat artifacts are invalid — this round is VOID; repair/rerun before adjudication.');
  process.exit(okCount === 0 ? 1 : 2);
}
