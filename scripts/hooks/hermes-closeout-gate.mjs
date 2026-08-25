/**
 * hermes-closeout-gate.mjs — deterministic Stop hook for the Hermes closeout gate (rules 68-69).
 *
 * WHY THIS EXISTS (2026-07-11): the first implementation was a prompt-type Stop hook. Live-fire
 * smoke proved the classifier model cannot see turn content, so it blocked 100% of turns —
 * including "what is 2+2" — costing one extra model round + ~20s + noise text per turn. This
 * command hook replaces it with pure local heuristics: zero model calls, deterministic loop
 * guard, and fail-open on every error path (a broken gate must never wedge a session).
 *
 * CONTRACT (Claude Code Stop hook, type "command"):
 *   stdin  = hook input JSON: { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0 with no output
 *   block  = exit 0 with stdout JSON { decision: "block", reason: "..." }
 *
 * DECISION RULES (current turn only — lines after the last real user message):
 *   1. stop_hook_active true            -> allow (deterministic no-loop guard)
 *   2. transcript unreadable/unparseable -> allow (fail-open)
 *   3. memo/packet emitted this turn     -> allow (already complied)
 *   4. substantial signals: >=3 file writes outside emission dirs, OR a git commit/push
 *      in this turn's Bash calls        -> block with rule 68-69 guidance
 *   5. anything else (trivial/conversational/read-only) -> allow, silently
 *
 * Under-triggering is acceptable (rules 68-69 + closeout-evidence-lock still bind by
 * convention); over-triggering is the failure mode this file exists to kill.
 */
import { emit } from '../lib/gate-shadow.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]pending[\\/]|hermes-learning-packets[\\/]/;

/**
 * Is this emitted path an actual MEMO (which must confess mistakes), or a support file?
 *
 * The emission directories also hold `_schema.json`, `INDEX.md` and `ENTRY-TEMPLATE.md`.
 * Those are infrastructure, not reports — they have no author and no task to be wrong about.
 * On 2026-08-13 this gate demanded a markdown "## Mistakes I made" heading inside a JSON
 * schema file; satisfying it would have corrupted the schema, so the gate was asking for
 * damage. Mirrors the filter in scripts/hermes-learning-validate.mjs.
 */
export function isMemoFile(p) {
  const base = String(p).replace(/\\/g, '/').split('/').pop() ?? '';
  return base.toLowerCase().endsWith('.md')
    && !base.startsWith('_')
    && base !== 'INDEX.md'
    && base !== 'ENTRY-TEMPLATE.md'
    && base !== 'README.md';
}

const MISTAKES_BLOCK_REASON = (p) =>
  `Hermes memo is missing its mistakes section (Sean 2026-08-04: "give a report to Hermes, ` +
  `especially about the mistakes that you made so I can learn from them… this should be ` +
  `automatic"). File: ${p}. Add a "## Mistakes I made" section listing YOUR OWN errors this ` +
  `task — one line each: what you got wrong -> how it was caught -> the rule that prevents the ` +
  `repeat. Include mistakes you caught and fixed yourself, tools that reported false success, ` +
  `wrong severity calls, and claims you walked back; if you repeated a mistake you had already ` +
  `written up, say so explicitly (highest signal). If a paid/external model was consulted, add ` +
  `its calibration (findings real vs disproven on verification). Honest-empty is allowed ONLY ` +
  `after a hostile pass genuinely ran dry: "## Mistakes I made — none surfaced this task". ` +
  `Never omit the heading — an absent section reads as "nothing went wrong".`;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git\s+(commit|push)\b/;

const BLOCK_REASON =
  'Before stopping, run the Hermes closeout gate. This turn shows substantial completed work ' +
  '(file changes and/or a git commit/push) with no Hermes artifact emitted. If it completed a ' +
  'substantial implementation, feature, architecture decision, hard bug root cause, deployment, ' +
  'security change, major review, or final plan with transferable facts: invoke hermes-inbox and ' +
  'write a privacy-safe memo to .ai-workflow/hermes-inbox/pending/. If the permanent lesson came ' +
  'from a verified Fable-tier synthesis, also invoke hermes-learning-packet (sub-Fable output ' +
  'never enters the durable corpus). Run the secret/privacy scan, report the artifact path, then ' +
  'stop. If this turn was genuinely not substantial (analysis only, partial work, Q&A), state ' +
  'that in one line and stop — do not fabricate an artifact.';

/** True for a real human/user message line (not a tool_result envelope). */
/**
 * A Stop hook's own feedback is written back into the transcript as a `user` entry.
 * Counting it as the user speaking reset the turn window to the moment of the
 * complaint, so the gate could no longer see the work it had just judged: fileWrites
 * fell to 0, buildShaped went false, and the gate passed silently while enforcing
 * nothing. Measured 2026-08-03 — lastUserIdx landed on the gate's own feedback text
 * while the required marker sat in the closeout just above it.
 *
 * Excluding feedback can only widen the window (start it earlier), never narrow it,
 * so the failure direction is "the gate sees more of the turn" — the safe one.
 *
 * KEEP IN LOCKSTEP: all four Stop gates carry a byte-identical copy of this predicate.
 * `gate-window-parity.test.mjs` fails if they drift. Deliberately duplicated rather
 * than shared: a failed import of a common module would break all four at load time,
 * before each gate's own fail-open can catch it.
 */
const HOOK_FEEDBACK_RE = /^\s*Stop hook feedback:/i;

export function isRealUserLine(entry) {
  if (!entry || entry.type !== 'user') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') {
    return content.trim().length > 0 && !HOOK_FEEDBACK_RE.test(content);
  }
  if (Array.isArray(content)) {
    if (!content.some((c) => c?.type === 'text')) return false;
    if (content.some((c) => c?.type === 'tool_result')) return false;
    const text = content
      .filter((c) => c?.type === 'text')
      .map((c) => String(c.text ?? ''))
      .join('\n');
    // Non-blank required, matching the string branch above. The array branch used to
    // accept a whitespace-only block, so an empty message could reset the window too.
    return text.trim().length > 0 && !HOOK_FEEDBACK_RE.test(text);
  }
  return false;
}

/** Parse JSONL text into entries, skipping unparseable lines (fail-open per line). */
export function parseTranscript(raw) {
  const entries = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed line */
    }
  }
  return entries;
}

/** Collect block/allow signals from the current turn's entries. */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const signals = { fileWrites: 0, gitActivity: false, memoEmitted: false, memoPaths: [] };

  for (const entry of turn) {
    if (entry?.type !== 'assistant') continue;
    const content = entry.message?.content;
    if (typeof content === 'string') {
      // Some transcript shapes carry assistant text as a plain string — a memo
      // citation there must still count, or a compliant turn gets re-blocked.
      if (EMISSION_PATH_RE.test(content)) signals.memoEmitted = true;
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const item of content) {
      if (item?.type === 'tool_use') {
        const input = item.input ?? {};
        const target = String(input.file_path ?? input.path ?? '');
        if (WRITE_TOOLS.has(item.name)) {
          if (EMISSION_PATH_RE.test(target)) {
            signals.memoEmitted = true;
            // Only MEMOS carry a mistakes section. The corpus dir also holds support files —
            // _schema.json, INDEX.md, ENTRY-TEMPLATE.md — which are not reports and have no
            // author to confess. Without this filter the gate demanded a markdown "## Mistakes
            // I made" heading inside a JSON schema (observed 2026-08-13); complying would have
            // corrupted the file, so the gate was asking for damage. Same convention as
            // scripts/hermes-learning-validate.mjs: .md, not underscore-prefixed, not INDEX.
            if (isMemoFile(target)) signals.memoPaths.push(target);
          } else if (target) signals.fileWrites += 1;
        } else if (item.name === 'Bash' && GIT_ACTIVITY_RE.test(String(input.command ?? ''))) {
          signals.gitActivity = true;
        }
      } else if (item?.type === 'text' && EMISSION_PATH_RE.test(String(item.text ?? ''))) {
        signals.memoEmitted = true; // final response cites an emitted artifact path
      }
    }
  }
  return signals;
}

/**
 * A memo without a mistakes section teaches Hermes nothing about how the work
 * actually went (Sean 2026-08-04: "especially about the mistakes that you made
 * so I can learn from them… this should be automatic"). Detecting the FILE was
 * never enough — the section is the payload. Reads the memo Write tool actually
 * produced; unreadable/absent file -> fail-open (this gate is heuristic, and a
 * false block is worse than a missed nudge).
 */
export function memoMissingMistakes(memoPaths, readFile) {
  for (const p of memoPaths) {
    let text;
    try {
      text = readFile(p);
    } catch {
      continue; // cannot read -> do not punish
    }
    // Accept the honest-empty form too; only a MISSING heading blocks.
    if (!/^\s*#{1,4}\s*Mistakes\b/im.test(text)) return p;
  }
  return null;
}

/**
 * A malformed DURABLE packet is worse than a missing one: it lands in the compounding corpus and
 * stays there. `scripts/hermes-learning-validate.mjs` has been the written contract since
 * 2026-08-13 but nothing ever called it, so 12 packets written AFTER the schema shipped still
 * failed it — the corpus kept drifting while every closeout passed. A contract nothing enforces
 * is a document, not a contract.
 *
 * Scope is deliberately narrow: only the durable corpus (`hermes-learning-packets/`). Ephemeral
 * inbox memos are drained daily and have no schema, so validating them would be noise.
 */
const CORPUS_PATH_RE = /hermes-learning-packets[\\/]/;

export function packetErrors(memoPaths, validate) {
  if (typeof validate !== 'function') return null; // validator unavailable -> never block
  for (const p of memoPaths) {
    if (!CORPUS_PATH_RE.test(String(p))) continue;
    try {
      const errs = validate(p);
      if (Array.isArray(errs) && errs.length) return { path: p, errors: errs };
    } catch {
      continue; // unreadable/broken -> do not punish (same fail-open rule as memoMissingMistakes)
    }
  }
  return null;
}

const PACKET_BLOCK_REASON = ({ path, errors }) =>
  `Durable learning packet fails the corpus schema. File: ${path}\n` +
  errors.map((e) => `  - ${e}`).join('\n') +
  `\n\nThe contract is docs/ai-workflow/hermes-learning-packets/_schema.json; fix the packet, not ` +
  `the schema. Run \`node scripts/hermes-learning-validate.mjs --file ${path} --json\` for ` +
  `machine-readable errors you can self-repair from in this turn. ` +
  `NEVER guess originating_model to make this pass — it is the fail-closed Rule 68 tier gate, and ` +
  `a wrong provenance tag admits sub-Fable output into the permanent corpus. If a field is ` +
  `genuinely unrecoverable, write "unknown".`;

/**
 * REVIEW DEBT (rules 46 + 74 + 82, merged 2026-08-23 per Fable's Final-Decider ruling).
 *
 * All three rules were procedurally correct and none had an emitter, so nothing anywhere held the
 * state "a review is owed". Measured result in the forensics corpus: `panel deferred` ×3, "the owed
 * panel is now deferred six times", `unprompted Linear-sync deferred` ×3. One tethered obligation
 * replaces three untethered ones.
 *
 * Scoped to BUILD-SHAPED turns only. Blocking conversational turns would make the gate intolerable
 * and it would be switched off — the failure mode this repo records more than any other.
 */
const DEBT_BLOCK_REASON = (debts) =>
  `${debts.length} outstanding review debt(s) — you are shipping while a review is owed.\n\n` +
  debts.map((d) => `  ${d.id}\n    topic : ${d.topic}\n    reason: ${d.reason}`).join('\n') +
  `\n\nRules 46/74/82 merged into one tracked obligation because three untethered rules produced ` +
  `six deferred panels. Discharge or record the deferral before closing:\n` +
  `  node scripts/review-debt.mjs close --id <id> --artifact <path-to-review-output>\n` +
  `  node scripts/review-debt.mjs waive --id <id> --reason "<why no review is needed>"\n` +
  `A waiver is a legitimate answer and is recorded permanently. Silence is not.`;

/** Pure decision: returns null (allow) or a block reason string. */
export function decide(
  hookInput,
  transcriptRaw,
  readFile = (p) => readFileSync(p, 'utf8'),
  validate,
  listDebts = () => [], // injected; defaults to "no debts" so a missing ledger never blocks
) {
  if (hookInput?.stop_hook_active) return null;
  const signals = analyzeTurn(parseTranscript(transcriptRaw));

  // Debt is checked BEFORE the memo branch: emitting a memo discharges the Hermes obligation, not
  // the review obligation. A turn that satisfies one while owing the other must still stop.
  if (signals.fileWrites >= 3 || signals.gitActivity) {
    let debts = [];
    try {
      debts = listDebts() || [];
    } catch {
      debts = []; // broken ledger -> never block
    }
    if (debts.length) return DEBT_BLOCK_REASON(debts);
  }

  if (signals.memoEmitted) {
    const bad = memoMissingMistakes(signals.memoPaths, readFile);
    if (bad) return MISTAKES_BLOCK_REASON(bad);
    const malformed = packetErrors(signals.memoPaths, validate);
    return malformed ? PACKET_BLOCK_REASON(malformed) : null;
  }
  if (signals.fileWrites >= 3 || signals.gitActivity) return BLOCK_REASON;
  return null;
}

/**
 * Load the packet validator LAZILY and defensively.
 *
 * A static `import` runs at module load — outside main()'s try/catch — so a missing, syntactically
 * broken, or unparseable-schema validator would crash the hook process instead of failing open.
 * That would violate this file's first contract ("a broken gate must never wedge a session") and
 * would do it at the worst possible moment: while the user is trying to stop.
 *
 * Returns null on ANY problem, which makes packetErrors() a no-op.
 */
async function loadPacketValidator() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = join(here, '..', '..');
    const schemaPath = join(repoRoot, 'docs', 'ai-workflow', 'hermes-learning-packets', '_schema.json');
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    const mod = await import('../hermes-learning-validate.mjs');
    if (typeof mod.validatePacket !== 'function') return null;

    // Transcripts record repo-RELATIVE paths, so resolving them against process.cwd() only works
    // when the hook happens to run from the repo root. Run from anywhere else the read threw, the
    // catch swallowed it, and the gate enforced NOTHING while still exiting 0 -- measured
    // 2026-08-16 with a two-cwd control. Anchoring the schema script-relative while leaving the
    // packet cwd-relative was the bug: half the inputs were anchored.
    return (p) => {
      const abs = isAbsolute(p) ? p : join(repoRoot, p);
      return mod.validatePacket(p, readFileSync(abs, 'utf8'), schema).errors;
    };
  } catch {
    return null; // validator unavailable -> skip the packet check entirely, never block
  }
}

/**
 * Load the review-debt reader LAZILY, same reasoning as loadPacketValidator: a static import runs
 * outside main()'s try/catch, so a missing or broken ledger module would crash the hook instead of
 * failing open — and it would do it while the user is trying to stop.
 *
 * Returns a function that always yields an array. Any problem -> () => [] -> the gate never blocks.
 */
async function loadDebtReader() {
  try {
    const mod = await import('../review-debt.mjs');
    if (typeof mod.openDebts !== 'function') return () => [];
    return () => {
      try {
        return mod.openDebts() || [];
      } catch {
        return [];
      }
    };
  } catch {
    return () => [];
  }
}

async function main() {
  let hookInput = {};
  try {
    hookInput = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return; // no/bad stdin -> allow
  }
  if (hookInput?.stop_hook_active) return; // deterministic loop guard, no file I/O needed
  let raw = '';
  try {
    raw = readFileSync(String(hookInput.transcript_path ?? ''), 'utf8');
  } catch {
    return; // unreadable transcript -> fail-open
  }
  try {
    const validate = await loadPacketValidator();
    const listDebts = await loadDebtReader();
    const reason = decide(hookInput, raw, (p) => readFileSync(p, 'utf8'), validate, listDebts);
    // Routed through the shadow-mode emitter (2026-08-23, ox-alpha-led review).
    // Behaviour is UNCHANGED unless .ai-workflow/gate-mode.json names this hook AND
    // its window is unexpired. Every decision — block or allow — is logged so the
    // keep/retire call is made on evidence instead of argument.
    // A failure inside emit() falls back to BLOCKING: it guards every step and its
    // stdout write is the LAST statement, reached even if the prelude fails. That
    // matters because the catch below is fail-OPEN — an earlier version of this
    // comment promised the guarantee before the code actually provided it.
    emit('hermes-closeout-gate', reason);
  } catch {
    /* any analysis error -> fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  await main();
}
