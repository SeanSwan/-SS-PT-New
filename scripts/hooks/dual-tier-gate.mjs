/**
 * dual-tier-gate.mjs — deterministic Stop hook enforcing Rule 57 (Dual-Tier Summary).
 *
 * WHY (Sean, 2026-08-03): "i originally told you to give me a plain english review and a
 * technical review in the instructions in claude.md and you have not been doing that."
 *
 * He was right. Rule 57 has existed since 2026-04-30 and drifted anyway — because it was
 * the ONLY closeout rule with no hook behind it. The Hermes memo, the dry-loop ledger and
 * the Linear sync all fire every single turn; they have gates. Rule 57 had prose, and prose
 * decays. That is the same lesson the Hermes outbox taught at n=443: a duty enforced only
 * by the model remembering is a duty that will be dropped.
 *
 * WHY IT MATTERS (Sean, 2026-04-30): "we're getting so much work done now that it's easy to
 * get lost and I need to be able to look at my prompts etcetera and see what it was that we
 * actually did." The goal is that Sean can scroll back in two weeks and reconstruct a
 * session in 90 seconds — WITHOUT opening a file. Technical-only closeouts fail that.
 *
 * CONTRACT (Claude Code Stop hook, type "command" — same shape as dry-loop-gate):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES (current turn only):
 *   1. stop_hook_active       -> allow (no-loop guard; one guaranteed enforcement/turn)
 *   2. transcript unreadable  -> allow (fail-open — a broken gate must never wedge a session)
 *   3. build-shaped turn AND the closing message lacks a plain-English section -> BLOCK
 *   4. both sections present, plain-English FIRST -> allow
 *
 * MARKER CONTRACT (what the closeout must contain to pass):
 *   A plain-English heading (`## Plain English`, `Plain-English Summary`, …) AND a technical
 *   heading (`## Technical`, `Technical Summary`, …), with plain-English appearing FIRST —
 *   Rule 57 is explicit that the outcome-framed part leads, because that is the part Sean
 *   reads. Or `DUAL-TIER: N/A — <reason>` when the turn genuinely does not warrant one.
 *
 * Deliberately reuses dry-loop-gate's build-shaped signal (>=2 non-emission file writes OR a
 * git commit/push) so the two gates agree on what "substantial" means. A turn that owes a
 * dry-loop ledger owes a dual-tier summary. Predictable beats clever.
 */
import { emit } from '../lib/gate-shadow.mjs';
import { readFileSync } from 'node:fs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;

// Headings only — a passing mention of the words in prose must not waive the gate.
const PLAIN_RE = /(^|\n)\s{0,3}(#{1,4}\s*|\*\*)\s*plain[\s-]?english\b/i;
const TECH_RE = /(^|\n)\s{0,3}(#{1,4}\s*|\*\*)\s*technical\b/i;
const NA_RE = /DUAL-TIER:\s*N\/A/i;

const BLOCK_REASON =
  'Dual-Tier Summary (Rule 57, Sean 2026-04-30; re-flagged 2026-08-03): this turn changed ' +
  'code/files or committed, but the closeout has no plain-English section. Substantial work ' +
  'MUST close with TWO parts in the SAME message, plain-English FIRST:\n' +
  '  (1) "## Plain English" — outcome-framed, no file paths, no function names, no commit ' +
  'SHAs, no rule numbers, no jargon. What changed for Sean and why it matters. Frame blockers ' +
  'as "we deferred this because of X we will fix next", not "gated on the IDOR mitigation".\n' +
  '  (2) "## Technical" — files, commits, test counts, review verdicts, deferred items with ' +
  'the specific reason.\n' +
  'The test: Sean opens this chat in two weeks and reconstructs what happened in 90 seconds ' +
  'WITHOUT opening a file. A technical-only closeout fails that test, which is why this gate ' +
  'exists. If the turn genuinely does not warrant one (trivial edit, mid-task progress, Q&A), ' +
  'state `DUAL-TIER: N/A — <reason>` instead. Never fabricate the headings without the content.';

const ORDER_REASON =
  'Dual-Tier Summary (Rule 57): both sections are present but TECHNICAL comes before ' +
  'PLAIN-ENGLISH. Rule 57 is explicit that plain-English leads — it is the part Sean actually ' +
  'reads, and burying it under file paths defeats the purpose. Move the plain-English section ' +
  'above the technical one.';

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

/** Build signals for the current turn + whether the CLOSING message carries both tiers.
 * Sections count only in the LAST assistant message with text — a mid-turn mention, or a
 * doc written during the turn that happens to contain the headings, must not waive it. */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const signals = { fileWrites: 0, gitActivity: false };
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

  const plain = lastAssistantText.search(PLAIN_RE);
  const tech = lastAssistantText.search(TECH_RE);
  signals.naSeen = NA_RE.test(lastAssistantText);
  signals.plainSeen = plain !== -1;
  signals.techSeen = tech !== -1;
  signals.plainFirst = plain !== -1 && (tech === -1 || plain < tech);
  return signals;
}

export function decide(hookInput, transcriptRaw) {
  if (hookInput?.stop_hook_active) return null;
  const s = analyzeTurn(parseTranscript(transcriptRaw));
  const buildShaped = s.fileWrites >= 2 || s.gitActivity;
  if (!buildShaped) return null;
  if (s.naSeen) return null;
  if (!s.plainSeen || !s.techSeen) return BLOCK_REASON;
  if (!s.plainFirst) return ORDER_REASON;
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
    emit('dual-tier-gate', reason);
  } catch {
    /* fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
