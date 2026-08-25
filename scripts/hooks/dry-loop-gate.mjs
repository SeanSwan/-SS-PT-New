/**
 * dry-loop-gate.mjs — deterministic Stop hook enforcing Sean's Dry-Loop Law (2026-07-21).
 *
 * WHY (Sean, 2026-07-21): "I shouldn't have to keep saying do another hostile review…
 * all hostile reviews should be done until there is nothing left — and then one more on
 * top of that, the second final. This has been a major issue my whole life coding with
 * AI agents. It should be like a hook, always looking, always active. Mandatory."
 *
 * CONTRACT (Claude Code Stop hook, type "command" — same shape as hermes-closeout-gate):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES (current turn only):
 *   1. stop_hook_active            -> allow (no-loop guard; one guaranteed enforcement/turn)
 *   2. transcript unreadable       -> allow (fail-open — a broken gate must never wedge)
 *   3. build signals present (>=2 non-emission file writes OR git commit/push) AND the
 *      final assistant text carries NO dry-loop ledger marker -> BLOCK with loop guidance
 *   4. marker present or turn not build-shaped -> allow silently
 *
 * MARKER CONTRACT (what the closeout must contain to pass):
 *   `DRY-LOOP: CLEAN×2` (+ optional `(rounds: N)`) — two consecutive find-nothing rounds ran, OR
 *   `DRY-LOOP: N/A — <reason>`   — turn is genuinely not build-shaped (docs-only, partial WIP…).
 *   Fabricating the marker without running rounds violates rules 19/28 — the marker is a
 *   claim, and claims need the round ledger evidence in the same closeout.
 */
import { emit } from '../lib/gate-shadow.mjs';
import { readFileSync } from 'node:fs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;
const MARKER_RE = /DRY-LOOP:\s*(CLEAN\s*[×x]\s*2|N\/A)/i;
// Rule 73 (Proof-Before-Done, Sean 2026-07-22): a build-shaped closeout must also
// carry a PROOF token — current-session evidence for the completion claim, or an
// explicit `PROOF: N/A — <reason>` when the work is genuinely unproveable in-session
// (disclosed, not claimed done). The dry-loop marker proves the hostile loop ran;
// the PROOF token proves the WORK itself was verified.
const PROOF_RE = /PROOF:\s*\S/i;

const BLOCK_REASON =
  'Dry-Loop Law (Sean 2026-07-21): this turn changed code/files or committed, but the closeout ' +
  'carries no dry-loop ledger. Hostile-review rounds must repeat until a round finds NOTHING ' +
  'fixable, then ONE MORE confirmation round runs (two consecutive CLEAN rounds = dry). Each ' +
  'round must gather NEW evidence from a vantage not yet tried (different cwd/worktree, mode, ' +
  'flag, role, viewport, real caller path) — re-reading code is not a round, and the round that ' +
  'applied fixes is the next round\'s primary attack surface. Sean-gated findings are flagged to ' +
  'Linear (linear-todo Mode 1), not fixed. When dry, end the closeout with the round ledger and ' +
  'the literal marker `DRY-LOOP: CLEAN×2 (rounds: N)`. If this turn was genuinely not ' +
  'build-shaped (docs-only, partial WIP, Q&A), state `DRY-LOOP: N/A — <reason>` instead. ' +
  'Never fabricate the marker without the rounds behind it.';

const PROOF_BLOCK_REASON =
  'Proof-Before-Done (Rule 73, Sean 2026-07-22): this turn changed code/committed and the ' +
  'hostile loop ran, but the closeout carries NO proof of the work itself. You may not claim ' +
  'done/fixed/passing without current-session, reproducible evidence in the SAME closeout. End ' +
  'with a `PROOF:` line stating the evidence you actually ran this turn — e.g. `PROOF: npm test ' +
  '842 passed, tsc --noEmit exit 0, npm run build ok` or the exact vitest file + N/N, or a ' +
  'Canonical Surface Receipt / live-probe observed value for UI/data-truth. If the work genuinely ' +
  'cannot be proven in-session (e.g. a live authed browser journey needs a backend that will not ' +
  'run here), DISCLOSE it: `PROOF: N/A — <what could not be proven, why, and the lower-tier ' +
  'evidence that stands in>` and scope your claim to only the proven part (Rule 28). Asserting ' +
  'evidence you did not run is a rule 19/28 violation.';

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

/** Signals from the current turn: build activity + whether the marker closes the turn.
 * The marker counts ONLY in the LAST assistant message that carries text — a mid-turn
 * mention (status update quoting the marker, or a doc written containing it) must NOT
 * waive the gate (hole caught in the 2026-07-21 dry run on the gate itself). */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const signals = { fileWrites: 0, gitActivity: false, markerSeen: false };
  let lastAssistantText = '';

  for (const entry of turn) {
    if (entry?.type !== 'assistant') continue;
    const content = entry.message?.content;
    if (typeof content === 'string') {
      if (content.trim()) lastAssistantText = content;
      continue;
    }
    if (!Array.isArray(content)) continue;
    const textHere = content
      .filter((c) => c?.type === 'text')
      .map((c) => String(c.text ?? ''))
      .join('\n');
    if (textHere.trim()) lastAssistantText = textHere;
    for (const item of content) {
      if (item?.type !== 'tool_use') continue;
      const input = item.input ?? {};
      const target = String(input.file_path ?? input.path ?? '');
      if (WRITE_TOOLS.has(item.name)) {
        if (target && !EMISSION_PATH_RE.test(target)) signals.fileWrites += 1;
      } else if (item.name === 'Bash' && GIT_ACTIVITY_RE.test(String(input.command ?? ''))) {
        signals.gitActivity = true;
      }
    }
  }
  signals.markerSeen = MARKER_RE.test(lastAssistantText);
  signals.proofSeen = PROOF_RE.test(lastAssistantText);
  return signals;
}

export function decide(hookInput, transcriptRaw) {
  if (hookInput?.stop_hook_active) return null;
  const s = analyzeTurn(parseTranscript(transcriptRaw));
  const buildShaped = s.fileWrites >= 2 || s.gitActivity;
  if (!buildShaped) return null;
  // Rule 73: a build-shaped turn must carry BOTH the dry-loop marker (hostile loop
  // ran to dry) AND the PROOF token (the work itself was verified this session).
  if (!s.markerSeen) return BLOCK_REASON;
  if (!s.proofSeen) return PROOF_BLOCK_REASON;
  return null;
}

function main() {
  let hookInput = {};
  try {
    hookInput = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  if (hookInput?.stop_hook_active) return;
  let raw = '';
  try {
    raw = readFileSync(String(hookInput.transcript_path ?? ''), 'utf8');
  } catch {
    return;
  }
  try {
    const reason = decide(hookInput, raw);
    // Routed through the shadow-mode emitter (2026-08-23, ox-alpha-led review).
    // Behaviour is UNCHANGED unless .ai-workflow/gate-mode.json names this hook AND
    // its window is unexpired. Every decision — block or allow — is logged so the
    // keep/retire call is made on evidence instead of argument.
    // A failure inside emit() falls back to BLOCKING: it guards every step and its
    // stdout write is the LAST statement, reached even if the prelude fails. That
    // matters because the catch below is fail-OPEN — an earlier version of this
    // comment promised the guarantee before the code actually provided it.
    emit('dry-loop-gate', reason);
  } catch {
    /* fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
