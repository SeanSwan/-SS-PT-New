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
import { readFileSync } from 'node:fs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]pending[\\/]|hermes-learning-packets[\\/]/;
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
export function isRealUserLine(entry) {
  if (!entry || entry.type !== 'user') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) {
    return content.some((c) => c?.type === 'text') && !content.some((c) => c?.type === 'tool_result');
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
  const signals = { fileWrites: 0, gitActivity: false, memoEmitted: false };

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
          if (EMISSION_PATH_RE.test(target)) signals.memoEmitted = true;
          else if (target) signals.fileWrites += 1;
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

/** Pure decision: returns null (allow) or a block reason string. */
export function decide(hookInput, transcriptRaw) {
  if (hookInput?.stop_hook_active) return null;
  const signals = analyzeTurn(parseTranscript(transcriptRaw));
  if (signals.memoEmitted) return null;
  if (signals.fileWrites >= 3 || signals.gitActivity) return BLOCK_REASON;
  return null;
}

function main() {
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
    const reason = decide(hookInput, raw);
    if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  } catch {
    /* any analysis error -> fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
