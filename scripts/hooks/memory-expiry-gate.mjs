#!/usr/bin/env node
/**
 * memory-expiry-gate.mjs — a memory that asserts a STATE must carry an expiry.
 * =====================================================================
 * WHY THIS EXISTS. An audit of this project's memory directory on 2026-08-26
 * found 150 files, of which 63 (42%) assert a point-in-time STATE: SHIPPED,
 * PENDING, RESOLVED, OBSOLETE, "NOT executed", AWAITING. Those are moments,
 * not laws, and nothing expires them. A stale "migration X pending" injected
 * at session start against code where X already shipped makes an agent act on
 * a false premise — which looks exactly like the agent making things up.
 *
 * The naive fix is to ban status vocabulary from memories outright. That was
 * rejected: it would reject legitimate durable lessons that merely *mention*
 * shipping, and a check with a wall of false positives is a check people learn
 * to bypass, which is worse than no check at all.
 *
 * So this gate does not ban state. It requires state to be DATED:
 *
 *     if a memory asserts a state, it must also say when to re-check it.
 *
 * That is strictly weaker than a ban, has near-zero false-positive cost (add
 * one frontmatter line), and it is the thing that actually fixes the decay —
 * an undated status claim is indistinguishable from a current one forever,
 * while a dated one can be swept.
 *
 * CONTRACT (Claude Code PreToolUse hook, type "command"):
 *   stdin = { tool_name, tool_input: { file_path, content?, new_string? }, ... }
 *   allow = exit 0, no output
 *   deny  = exit 0 + stdout { hookSpecificOutput: { hookEventName: "PreToolUse",
 *                             permissionDecision: "deny", permissionDecisionReason } }
 *
 * FAIL POSTURE: FAIL-OPEN. Any parse error, unreadable payload, or unexpected
 * shape allows the write. This gate improves hygiene; it must never be the
 * reason a session cannot record something.
 *
 * SCOPE: only files under a Claude memory directory. It deliberately does NOT
 * police MEMORY.md, the index — an index of pointers cannot carry one expiry
 * date for sixty entries. Per-line expiry for the index is a separate problem
 * and is NOT solved here.
 */

/**
 * State assertions.
 *
 * The `(?<![-\w])` prefix is not decoration. `\bSHIPPED\b` matches inside
 * "already-shipped", because a hyphen is a word boundary — and "you plan
 * against already-shipped code" is a durable lesson using the word
 * adjectivally, not a memory declaring its own state. Measured against the
 * real corpus, that single compound form was a false positive on a permanent
 * rule. A status word compounded onto another word is describing something
 * else; only the bare word is a claim about this memory.
 */
const STATUS_PATTERNS = [
  /(?<![-\w])SHIPPED\b/i,
  /(?<![-\w])PENDING\b/i,
  /(?<![-\w])OBSOLETE\b/i,
  /(?<![-\w])RESOLVED\b/i,
  /(?<![-\w])AWAITING\b/i,
  /(?<![-\w])NOT\s+EXECUTED\b/i,
  /(?<![-\w])IN\s+PROGRESS\b/i,
  /(?<![-\w])SUPERSEDED\b/i,
];

/** Any one of these satisfies the requirement. */
const EXPIRY_PATTERNS = [
  /^\s*review[-_]after\s*:/mi,
  /^\s*expires(?:[-_]at)?\s*:/mi,
  /^\s*verified[-_]at\s*:/mi,
  /^\s*recheck[-_]after\s*:/mi,
];

/**
 * A memory path looks like .../.claude/**\/memory/<name>.md
 * MEMORY.md (the index) is excluded — see SCOPE above.
 */
export function isMemoryFile(p) {
  if (!p) return false;
  const norm = String(p).replace(/\\/g, '/');
  if (!/\/memory\/[^/]+\.md$/i.test(norm)) return false;
  if (/\/MEMORY\.md$/i.test(norm)) return false;
  return true;
}

/**
 * SCAN WINDOW — the single most important decision in this gate.
 *
 * A whole-body scan was measured against the real 150-file corpus and denied
 * 32%, including `feedback_proof_before_done_rule_73` (which merely LISTS
 * "shipped" among banned words) and `feedback_dry_loop_law` (which quotes
 * "AWAITING SEAN" as a marker name). Neither asserts a state. Those are the
 * false positives that get a gate bypassed.
 *
 * A memory declares its OWN state in two places: the frontmatter (especially
 * `description:`) and the opening paragraph. Prose further down quotes,
 * explains, and cites — it does not assert the memory's current status. So the
 * window is frontmatter + first paragraph, and nothing else.
 */
export function scanWindow(body) {
  if (!body) return '';
  let rest = body;
  let front = '';
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    front = fm[1];
    rest = body.slice(fm[0].length);
  }
  const firstPara = rest.replace(/^\s+/, '').split(/\n\s*\n/)[0] ?? '';
  return `${front}\n${firstPara}`;
}

/** Returns the matched status words found in the scan window, or []. */
export function statusWords(body) {
  const window = scanWindow(body);
  if (!window.trim()) return [];
  return STATUS_PATTERNS
    .map((re) => window.match(re))
    .filter(Boolean)
    .map((m) => m[0]);
}

export function hasExpiry(body) {
  return Boolean(body) && EXPIRY_PATTERNS.some((re) => re.test(body));
}

/**
 * Core decision. Returns null to allow, or a reason string to deny.
 * Exported so the tests exercise the same function the hook runs.
 */
export function decide(payload) {
  const tool = payload?.tool_name;
  if (tool !== 'Write' && tool !== 'Edit') return null;

  const input = payload?.tool_input ?? {};
  if (!isMemoryFile(input.file_path)) return null;

  // Write carries `content`; Edit carries `new_string`. Only the incoming text
  // is judged — a pre-existing file is not retroactively blocked, because this
  // gate governs what is written from now on, not what is already on disk.
  const body = typeof input.content === 'string'
    ? input.content
    : typeof input.new_string === 'string'
      ? input.new_string
      : null;
  if (body === null) return null;

  const found = statusWords(body);
  if (found.length === 0) return null;
  if (hasExpiry(body)) return null;

  const uniq = [...new Set(found.map((w) => w.toUpperCase()))].join(', ');
  return [
    `MEMORY EXPIRY GATE — this memory asserts a STATE (${uniq}) but never says when to re-check it.`,
    '',
    'A state claim with no expiry is indistinguishable from a current one forever.',
    '42% of this project\'s memory files carry exactly this defect, and a stale',
    '"pending" injected against shipped code is why an agent acts on a false premise.',
    '',
    'Add ONE line to the frontmatter, then re-issue:',
    '',
    '    review-after: YYYY-MM-DD',
    '',
    'Also accepted: expires:, expires-at:, verified-at:, recheck-after:.',
    '',
    'If this is a durable LAW rather than a status report, rewrite it so it does not',
    'assert a moment — "X is the canonical path" rather than "X SHIPPED" — and the',
    'gate will pass without a date. Durable law does not expire; status does.',
  ].join('\n');
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(''));
  });
}

async function main() {
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); } // fail-open
  const reason = decide(payload);
  if (reason) deny(reason);
  process.exit(0);
}

// Only run when invoked directly, so the tests can import decide() cleanly.
if (process.argv[1] && process.argv[1].endsWith('memory-expiry-gate.mjs')) {
  main().catch(() => process.exit(0)); // fail-open: never wedge a session
}
