/**
 * closeout-gate.mjs — the ONE closeout Stop hook. Replaces three serialized gates:
 * hermes-closeout-gate (rules 68-69), linear-sync-gate (SWA-23), dual-tier-gate (rule 57).
 *
 * WHY ONE GATE (Fable 5 verdict, 2026-08-26, governance review §2): the three gates each
 * blocked on a single condition, one after another. A heavy session was stopped 24-38
 * times; each block cost a full turn of governance prose before the NEXT gate fired on the
 * next missing item. That serialized thrash is what "the agent steps on its own toes" looks
 * like from Sean's chair. This gate evaluates every closeout condition in ONE pass and emits
 * ONE block that lists everything missing, so a compliant reply is one reply.
 *
 * CONTRACT (Claude Code Stop hook, type "command"):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION (current turn only — lines after the last real user message):
 *   1. stop_hook_active                      -> allow (no-loop guard)
 *   2. transcript unreadable / any throw     -> allow (fail-open; a broken gate must never wedge)
 *   3. not build-shaped (<2 non-emission file writes AND no git commit/push) -> allow silently
 *   4. build-shaped: run every check; drop checks currently in SHADOW mode (gate-mode.json,
 *      same names as before so operational config is unchanged); if anything remains -> ONE block
 *
 * CHECKS (each keeps the exact pass paths its predecessor documented):
 *   hermes-closeout-gate  memo/packet emitted this turn (write or cited path), and any emitted
 *                         memo carries a "## Mistakes I made" heading (honest-empty form OK)
 *   linear-sync-gate      a real save_issue/save_comment call, `LINEAR: SWA-<n>`, or `LINEAR: N/A — why`
 *   dual-tier-gate        closing message has a plain-English heading then a technical heading,
 *                         or `DUAL-TIER: N/A — why`
 *
 * Telemetry: one record per check under the OLD hook names (so the retire/keep report keeps
 * its history) plus one record for the unified gate. Shadow allowlist is unchanged.
 */
import { emit, isShadowed as isShadowedLive, record } from '../lib/gate-shadow.mjs';
import { readFileSync } from 'node:fs';
import { readSettled, settleNote, closingMessageLanded } from './lib/transcript-settle.mjs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const MEMO_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]pending[\\/]|hermes-learning-packets[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;
const LINEAR_WRITE_RE = /^mcp__linear-server__(save_issue|save_comment)\b/;
const ISSUE_REF_RE = /LINEAR:\s*\**\s*SWA-\d+\b/i;
const LINEAR_NA_RE = /LINEAR:\s*N\/A/i;
const PLAIN_RE = /(^|\n)\s{0,3}(#{1,4}\s*|\*\*)\s*plain[\s-]?english\b/i;
const TECH_RE = /(^|\n)\s{0,3}(#{1,4}\s*|\*\*)\s*technical\b/i;
const DUAL_NA_RE = /DUAL-TIER:\s*N\/A/i;
const MISTAKES_RE = /^\s*#{1,4}\s*Mistakes\b(?!-)/im;

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
  for (const line of String(raw).split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed line */
    }
  }
  return entries;
}

/** One pass over the current turn; every check reads from this. */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const s = {
    fileWrites: 0,
    gitActivity: false,
    memoEmitted: false,
    memoPaths: [],
    linearWrite: false,
    lastAssistantText: '',
  };

  for (const entry of turn) {
    if (entry?.type !== 'assistant') continue;
    const content = entry.message?.content;
    if (typeof content === 'string') {
      if (content.trim()) s.lastAssistantText = content;
      if (MEMO_PATH_RE.test(content)) s.memoEmitted = true;
      continue;
    }
    if (!Array.isArray(content)) continue;
    const textHere = content
      .filter((c) => c?.type === 'text')
      .map((c) => String(c.text ?? ''))
      .join('\n');
    if (textHere.trim()) s.lastAssistantText = textHere;
    if (MEMO_PATH_RE.test(textHere)) s.memoEmitted = true; // closeout cites an emitted artifact
    for (const item of content) {
      if (item?.type !== 'tool_use') continue;
      if (LINEAR_WRITE_RE.test(String(item.name ?? ''))) {
        s.linearWrite = true;
        continue;
      }
      const input = item.input ?? {};
      const target = String(input.file_path ?? input.path ?? '');
      if (WRITE_TOOLS.has(item.name)) {
        if (!target) continue;
        if (MEMO_PATH_RE.test(target)) {
          s.memoEmitted = true;
          s.memoPaths.push(target);
        } else if (!EMISSION_PATH_RE.test(target)) {
          s.fileWrites += 1;
        }
      } else if (item.name === 'Bash' && GIT_ACTIVITY_RE.test(String(input.command ?? ''))) {
        s.gitActivity = true;
      }
    }
  }

  const t = s.lastAssistantText;
  s.hasClosingText = t.trim().length > 0;
  s.linearMarker = ISSUE_REF_RE.test(t) || LINEAR_NA_RE.test(t);
  const plain = t.search(PLAIN_RE);
  const tech = t.search(TECH_RE);
  s.dualNA = DUAL_NA_RE.test(t);
  s.plainSeen = plain !== -1;
  s.techSeen = tech !== -1;
  s.plainFirst = plain !== -1 && (tech === -1 || plain < tech);
  return s;
}

export function buildShaped(s) {
  return s.fileWrites >= 2 || s.gitActivity;
}

/** Returns the first emitted memo path lacking a Mistakes heading, or null. Unreadable -> null. */
export function memoMissingMistakes(memoPaths, readFile) {
  for (const p of memoPaths) {
    let text;
    try {
      text = readFile(p);
    } catch {
      continue; // fail-open: never punish an unreadable file
    }
    if (!MISTAKES_RE.test(text)) return p;
  }
  return null;
}

/**
 * Every check: { id, missing: string|null }. `id` is the PREDECESSOR gate's name on
 * purpose — gate-mode.json shadow entries and the telemetry history keep working unchanged.
 */
export function runChecks(s, readFile) {
  const checks = [];

  // hermes-closeout-gate (rules 68-69)
  let hermes = null;
  if (!s.memoEmitted) {
    hermes =
      'Hermes memo — write a privacy-safe memo to .ai-workflow/hermes-inbox/pending/ (hermes-inbox ' +
      'skill) with a "## Mistakes I made" section. If the lesson came from a verified Fable-tier ' +
      'synthesis, also emit a hermes-learning-packet (sub-Fable output never enters the durable corpus). ' +
      'If this turn was genuinely not substantial (analysis only, partial work, Q&A), say so in one ' +
      'line instead — do not fabricate an artifact.';
  } else {
    const bad = memoMissingMistakes(s.memoPaths, readFile);
    if (bad) {
      hermes =
        `Hermes memo is missing its "## Mistakes I made" section (file: ${bad}). One line per error: ` +
        'what you got wrong -> how it was caught -> the rule that prevents the repeat; include errors ' +
        'you caught yourself, false-success tools, and claims walked back; say explicitly if you ' +
        'repeated a mistake already written up. Honest-empty is allowed only after a hostile pass ran ' +
        'dry: "## Mistakes I made — none surfaced this task". Never omit the heading.';
    }
  }
  checks.push({ id: 'hermes-closeout-gate', missing: hermes });

  // linear-sync-gate (SWA-23)
  let linear = null;
  if (!s.linearWrite && !s.linearMarker) {
    linear =
      'Linear board sync — do ONE of: (a) update the SWA issue via the Linear tool ' +
      '(save_issue/save_comment, strongest); (b) capture a new issue if this is net-new work ' +
      '(linear-todo, dedup first); (c) claim it as `LINEAR: SWA-<n>` (a bare "SWA-123" mention is ' +
      'citing, not syncing); or (d) `LINEAR: N/A — <reason>` if it maps to no issue. Never fabricate ' +
      'an id. If no mcp__linear-server__* tool is registered, do NOT conclude Linear is unconfigured ' +
      '(wrong 5 times running): run `node scripts/check-mcp-health.mjs linear` first.';
  }
  checks.push({ id: 'linear-sync-gate', missing: linear });

  // dual-tier-gate (rule 57)
  let dual = null;
  if (!s.dualNA) {
    if (!s.plainSeen || !s.techSeen) {
      dual =
        'Dual-tier summary — close with "## Plain English" (outcome-framed: no paths, SHAs, rule ' +
        'numbers or jargon) FOLLOWED BY "## Technical" (files, commits, test counts, verdicts, ' +
        'deferred items + reason), in the same message. Or `DUAL-TIER: N/A — <reason>` when the turn ' +
        'genuinely does not warrant one.';
    } else if (!s.plainFirst) {
      dual = 'Dual-tier summary — both sections present but TECHNICAL comes first; plain-English must lead.';
    }
  }
  checks.push({ id: 'dual-tier-gate', missing: dual });

  return checks;
}

export function composeReason(missing) {
  const n = missing.length;
  const lines = missing.map((m, i) => `  ${i + 1}. ${m.missing}`);
  return (
    `Closeout incomplete — ${n} item${n === 1 ? '' : 's'} missing. Fix ALL of them in ONE reply ` +
    '(this is the single closeout gate; nothing else will ask again):\n' +
    lines.join('\n') +
    '\nA single closing message satisfies everything: "## Plain English" -> "## Technical" ' +
    '(with the LINEAR: line and the memo path cited inside it).'
  );
}

/**
 * Pure decision. `deps.readFile` reads an emitted memo; `deps.isShadowed(id)` reports shadow
 * mode per check. Returns { reason: string|null, checks } so main() can record telemetry.
 */
export function decide(hookInput, transcriptRaw, deps = {}) {
  const readFile = deps.readFile ?? ((p) => readFileSync(p, 'utf8'));
  const isShadowed = deps.isShadowed ?? (() => false);
  if (hookInput?.stop_hook_active) return { reason: null, checks: [] };
  const s = analyzeTurn(parseTranscript(transcriptRaw));
  if (!buildShaped(s)) return { reason: null, checks: [] };
  const checks = runChecks(s, readFile).map((c) => ({
    ...c,
    shadowed: Boolean(c.missing) && safeShadowed(isShadowed, c.id),
  }));
  const live = checks.filter((c) => c.missing && !c.shadowed);
  return { reason: live.length ? composeReason(live) : null, checks };
}

function safeShadowed(fn, id) {
  try {
    return Boolean(fn(id));
  } catch {
    return false; // any surprise -> the check blocks, as it did before shadow mode
  }
}

function main() {
  const startedAt = Date.now();
  let hookInput = {};
  try {
    hookInput = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return; // no/bad stdin -> allow
  }
  if (hookInput?.stop_hook_active) return; // deterministic loop guard
  // SWA-194: re-read briefly ONLY while the turn is build-shaped with no closing text yet —
  // the one state a transcript flush race and genuine non-compliance are identical in.
  const slurp = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
  const ambiguous = (text) => buildShaped(analyzeTurn(parseTranscript(text))) && !closingMessageLanded(text);
  const settled = readSettled(String(hookInput.transcript_path ?? ''), ambiguous, slurp);
  if (settled.raw === null) return; // unreadable -> fail-open
  const note = settleNote(settled, 'closeout-gate');
  if (note) console.error(note);
  try {
    const { reason, checks } = decide(hookInput, settled.raw, { isShadowed: isShadowedLive });
    // Per-check telemetry under the predecessor names keeps the retire/keep history intact.
    for (const c of checks) {
      record({
        ts: new Date().toISOString(),
        hook: c.id,
        via: 'closeout-gate',
        fired: Boolean(c.missing),
        would_block: Boolean(c.missing),
        blocked: Boolean(c.missing) && !c.shadowed,
        shadowed: Boolean(c.shadowed),
        latency_ms: null,
        reason: c.missing ? String(c.missing).split(' — ')[0].slice(0, 120) : null,
      });
      if (c.missing && c.shadowed) {
        process.stderr.write(`[closeout-gate] SHADOW: ${c.id} would have asked — ${String(c.missing).split(' — ')[0]}\n`);
      }
    }
    // 'closeout-gate' is NOT on the SHADOWABLE allowlist: shadowing is decided per check
    // above, so emit() here always blocks when a reason survives. Its stdout write is the
    // last statement and reachable even if the prelude fails.
    emit('closeout-gate', reason, { startedAt });
  } catch {
    /* any analysis error -> fail-open */
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
