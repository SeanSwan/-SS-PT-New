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
 *   `SWA-<n>`            — names the issue this work advanced/finished (agent claims it synced it), OR
 *   `LINEAR: N/A — why`  — this build turn genuinely maps to no issue (trivial/no-ticket work).
 *   Preferred is an ACTUAL save_issue/save_comment call — that needs no marker at all (rule 3).
 */
import { readFileSync } from 'node:fs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;
/** Linear MCP board-WRITE tools (reads like list_issues/get_issue do NOT count as a sync). */
const LINEAR_WRITE_RE = /^mcp__linear-server__(save_issue|save_comment|save_document|save_project|save_milestone|create_)/;
/** Final-closeout markers: an issue id, or an explicit opt-out with a reason. */
const ISSUE_REF_RE = /\bSWA-\d+\b/;
const OPTOUT_RE = /LINEAR:\s*N\/A/i;

const BLOCK_REASON =
  'Linear board sync (SWA-23, Sean 2026-07-21 "did you add this to Linear?"): this turn changed ' +
  'code/files or committed, but the closeout neither updated a SWA issue nor named one. The board ' +
  'sync is UNPROMPTED — Sean must never have to ask. Do ONE of: (a) update the SWA issue this work ' +
  'advanced/finished via the Linear tool (save_issue/save_comment) — strongest; (b) if it is ' +
  'substantial net-new work with no issue, capture one (linear-todo Mode 1, dedup first); (c) name ' +
  'the issue in your closeout as `SWA-<n>`; or (d) if this build genuinely maps to no issue, state ' +
  '`LINEAR: N/A — <reason>`. See closeout-evidence-lock Section 6.6. Do not fabricate an SWA id.';

export function isRealUserLine(entry) {
  if (!entry || entry.type !== 'user') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) {
    return content.some((c) => c?.type === 'text') && !content.some((c) => c?.type === 'tool_result');
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
