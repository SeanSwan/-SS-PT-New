/**
 * linear-sync-gate.mjs — deterministic Stop hook enforcing SWA-23 (unprompted Linear board sync).
 *
 * WHY (Sean, 2026-07-21 — "did you add this to Linear?"): substantial work was shipping without a
 * board record, and the sync only happened when Sean ASKED. closeout-evidence-lock Section 6.6 made
 * it a convention; this hook is the deterministic guarantee — the same backstop dry-loop-gate.mjs is
 * for hostile reviews. Sean must never have to ask "did you add this to Linear?" again.
 *
 * CONTRACT (Claude Code Stop hook, type "command" — identical shape to dry-loop-gate / hermes gate):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES (current turn only):
 *   1. stop_hook_active                 -> allow (no-loop guard; one guaranteed enforcement/turn)
 *   2. transcript unreadable            -> allow (fail-open — a broken gate must never wedge a session)
 *   3. a Linear board WRITE happened this turn (mcp__linear-server__save_issue/save_comment/…)
 *                                       -> allow (the board WAS synced — strongest, mechanical proof)
 *   4. final assistant text names an issue (`SWA-\d+`) or opts out (`LINEAR: N/A — <reason>`)
 *                                       -> allow (claim/opt-out, like the dry-loop marker)
 *   5. build signals present (>=2 non-emission file writes OR git commit/push) and none of 3-4
 *                                       -> BLOCK with board-sync guidance
 *   6. otherwise                        -> allow silently (not build-shaped)
 *
 * MARKER CONTRACT (what the closeout must contain to pass without an actual board write):
 *   `LINEAR: SWA-<n>`    — names the issue this work advanced/finished (agent CLAIMS it synced it), OR
 *   `LINEAR: N/A — why`  — this build turn genuinely maps to no issue (trivial/no-ticket work).
 *   Preferred is an ACTUAL save_issue/save_comment call — that needs no marker at all (rule 3).
 *   NOTE: a bare `SWA-123` mention no longer passes — see ISSUE_REF_RE for why.
 */
import { readFileSync } from 'node:fs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;
/** Linear MCP ISSUE-content writes — the sync SWA-23 is about (an issue got updated/created or
 * commented). Reads (list_issues/get_issue) and non-issue writes (save_project/milestone/document,
 * create_attachment/label) do NOT count — those can happen without the work's issue being synced,
 * and accepting them would falsely waive the gate (tightened in the gate's own dry-loop 2026-07-21). */
const LINEAR_WRITE_RE = /^mcp__linear-server__(save_issue|save_comment)\b/;
/**
 * Final-closeout markers: a DELIBERATE sync claim, or an explicit opt-out.
 *
 * TIGHTENED 2026-08-04 (Sean: "are we updating Linear as well… this should be
 * automatic"). This was `/\bSWA-\d+\b/` — ANY incidental mention anywhere in the
 * closeout satisfied it. Closeouts routinely cite issues for context
 * ("see SWA-111", "filed as SWA-126"), so the gate effectively never fired:
 * citing an issue was indistinguishable from syncing one, and a turn could ship
 * a governance change with zero board activity and still pass. The marker now
 * has to be an explicit claim — `LINEAR: SWA-<n>` — which an agent only writes
 * when it means "this issue is synced". Real `save_issue`/`save_comment` calls
 * still pass with no marker at all (the preferred path), and the N/A opt-out is
 * unchanged, so every documented escape hatch survives.
 *
 * HOSTILE-ROUND CORRECTION (same day): the first cut allowed arbitrary text
 * between the label and the id (`LINEAR:\s*(?:[^\n]*\b)?SWA-\d+`), which let
 * `LINEAR: none — but SWA-9 exists` and `LINEAR: pending, see SWA-5 later`
 * pass — re-opening the accidental-pass hole this exists to close, because
 * "LINEAR:" followed by prose plus an incidental citation is NOT a sync claim.
 * The id must now follow the label directly (only whitespace / markdown
 * emphasis between), so the marker cannot be assembled by accident.
 */
const ISSUE_REF_RE = /LINEAR:\s*\**\s*SWA-\d+\b/i;
const OPTOUT_RE = /LINEAR:\s*N\/A/i;

const BLOCK_REASON =
  'Linear board sync (SWA-23, Sean 2026-07-21 "did you add this to Linear?"): this turn changed ' +
  'code/files or committed, but the closeout neither updated a SWA issue nor named one. The board ' +
  'sync is UNPROMPTED — Sean must never have to ask. Do ONE of: (a) update the SWA issue this work ' +
  'advanced/finished via the Linear tool (save_issue/save_comment) — strongest; (b) if it is ' +
  'substantial net-new work with no issue, capture one (linear-todo Mode 1, dedup first); (c) claim ' +
  'the sync explicitly as `LINEAR: SWA-<n>` (a bare "SWA-123" mention no longer counts — citing an ' +
  'issue is not syncing it); or (d) if this build genuinely maps to no issue, state ' +
  '`LINEAR: N/A — <reason>`. See closeout-evidence-lock Section 6.6. Do not fabricate an SWA id.';

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

/** Signals from the current turn: build activity, a real Linear write, and the closing marker.
 * The text marker counts ONLY in the LAST assistant message that carries text (a mid-turn SWA-N
 * mention must not waive the gate — the hole caught on dry-loop-gate 2026-07-21). A Linear WRITE,
 * by contrast, counts anywhere in the turn: calling save_issue IS the sync, wherever it happened. */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const signals = { fileWrites: 0, gitActivity: false, linearWrite: false, markerSeen: false };
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
      if (LINEAR_WRITE_RE.test(String(item.name ?? ''))) {
        signals.linearWrite = true;
        continue;
      }
      const input = item.input ?? {};
      const target = String(input.file_path ?? input.path ?? '');
      if (WRITE_TOOLS.has(item.name)) {
        if (target && !EMISSION_PATH_RE.test(target)) signals.fileWrites += 1;
      } else if (item.name === 'Bash' && GIT_ACTIVITY_RE.test(String(input.command ?? ''))) {
        signals.gitActivity = true;
      }
    }
  }
  signals.markerSeen = ISSUE_REF_RE.test(lastAssistantText) || OPTOUT_RE.test(lastAssistantText);
  return signals;
}

export function decide(hookInput, transcriptRaw) {
  if (hookInput?.stop_hook_active) return null;
  const s = analyzeTurn(parseTranscript(transcriptRaw));
  if (s.linearWrite || s.markerSeen) return null;
  if (s.fileWrites >= 2 || s.gitActivity) return BLOCK_REASON;
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
    if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  } catch {
    /* fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
