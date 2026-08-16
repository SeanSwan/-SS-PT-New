/**
 * absence-claim-gate.mjs — deterministic Stop hook against "it's missing" claims that aren't.
 *
 * WHY (2026-08-15): an agent looked for `consult-glm.mjs`, did not find it in its worktree, and
 * reported GLM as "not wired" — then spent a paid review round designing around a tool that was
 * available the whole time on another branch. It searched one checkout and reported a fact about
 * the repository.
 *
 * That failure had TWO guards already and beat both, which is why this is a hook and not more prose:
 *
 *   1. `.claude/skills/cross-env-verify` lists "not found" / "does not exist" / "missing" as its
 *      triggers. It did not fire, and would not have helped if it had: every vantage in its table is
 *      a TOOLCHAIN failure ("I cannot reach X with this tool"), whereas here the toolchain worked
 *      and answered correctly. The agent's own sentence matched no row.
 *   2. The session-start drift check literally prints "tooling may appear missing when it exists on
 *      main". It fires every session, generically, before any particular claim — which is precisely
 *      what turns it into a banner people scroll past.
 *
 * CLAUDE.md rule 57: "a duty enforced only by the model remembering is a duty that will eventually
 * be dropped." The gates that hold in this repo (dual-tier, dry-loop, lesson-recall) all fire at the
 * MOMENT of the thing they police. So does this one.
 *
 * CONTRACT (Claude Code Stop hook, type "command" — same shape as dry-loop-gate/lesson-recall-gate):
 *   stdin  = { stop_hook_active, transcript_path, ... }
 *   allow  = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION RULES (current turn only):
 *   1. stop_hook_active                        -> allow (no-loop guard: one enforcement per turn)
 *   2. transcript unreadable / any throw       -> allow (FAIL-OPEN; a broken gate must never wedge)
 *   3. no absence claim about a repo asset     -> allow silently
 *   4. claim carries evidence in the same turn -> allow (the check was actually run)
 *   5. ABSENCE-CHECK: N/A — <reason>           -> allow (honest, reasoned escape hatch)
 *   6. otherwise                               -> BLOCK, naming the claim and the one command
 *
 * DELIBERATELY NARROW. It fires only when the missing thing is REPO-ASSET-SHAPED — a filename with a
 * code/script extension, or a path fragment. "the column does not exist", "no such user", "the key is
 * missing from the env" are all common and none of them are what this is about; matching them would
 * make the gate noise, and a noisy gate gets disabled, which is worse than no gate. The evidence
 * token is satisfied by running scripts/repo-wide-find.mjs, or by any explicit multi-ref git check.
 */
import { readFileSync } from 'node:fs';

/** An absence assertion: "X is not wired", "there is no X", "X does not exist", "X is missing". */
const ABSENCE_RE = new RegExp(
  String.raw`(?:\b(?:not wired|not present|not installed|not built|never (?:written|created|built)|does(?:n't| not) exist|is missing|isn't (?:there|present)|no such file|could(?:n't| not) find|unable to find)\b)`,
  'i',
);

/** Repo-asset-shaped: a script/code filename, or an explicit repo path fragment. */
const ASSET_RE = /[\w.-]+\.(?:mjs|cjs|js|jsx|ts|tsx|py|sh|ps1|json|ya?ml|sql)\b|\b(?:scripts|backend|frontend|src|docs)\/[\w./-]+/;

/** Proof the multi-ref check actually ran this turn. */
const EVIDENCE_RE = /repo-wide-find|for-each-ref|ls-tree\s+-r|git\s+branch\s+(?:-a|--all)|git\s+log\s+--all|MSYS_NO_PATHCONV/i;

const ESCAPE_RE = /ABSENCE-CHECK:\s*N\/A\s*[—:-]/i;

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

/** Entries appended during THIS turn, newest-last. */
function currentTurn(raw) {
  const rows = String(raw)
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);

  // A turn starts at the last human message. Everything after it is this turn's work.
  // `type` is checked as well as `message.role`: Claude Code transcript rows carry the speaker at
  // the TOP level, and reading only `message.role` made this gate silently match nothing — it
  // allowed every turn, including the one it was written for. Caught by its own first test.
  let start = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const r = rows[i];
    const role = r?.message?.role ?? r?.role ?? r?.type;
    const isMeta = r?.isMeta === true || r?.subtype === 'system';
    if (role === 'user' && !isMeta) { start = i; break; }
  }
  return rows.slice(start);
}

/** Flatten every text/tool payload in the turn into one searchable string. */
function turnText(entries) {
  const out = [];
  for (const e of entries) {
    const content = e?.message?.content;
    if (typeof content === 'string') { out.push(content); continue; }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part?.text === 'string') out.push(part.text);
      if (typeof part?.input === 'object' && part.input) out.push(JSON.stringify(part.input));
      if (typeof part?.content === 'string') out.push(part.content);
      else if (Array.isArray(part?.content)) {
        for (const c of part.content) if (typeof c?.text === 'string') out.push(c.text);
      }
    }
  }
  return out.join('\n');
}

/** The assistant's closing message — where a claim actually reaches Sean. */
function finalMessage(entries) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i];
    if ((e?.message?.role ?? e?.role ?? e?.type) !== 'assistant') continue;
    const content = e?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const text = content.filter((p) => typeof p?.text === 'string').map((p) => p.text).join('\n');
      if (text.trim()) return text;
    }
  }
  return '';
}

/**
 * The whole decision, as a pure function of (payload, raw transcript).
 *
 * Exported and separated from I/O so the behaviour is unit-testable — the same shape as
 * dry-loop-gate. A gate whose logic can only be exercised by spawning a process is a gate whose
 * edge cases never get tested, and this one's edge cases (what counts as a repo asset) are the
 * entire difference between a useful gate and a noisy one.
 *
 * @returns {string|null} the block reason, or null to allow.
 */
export function decide(payload, raw) {
  if (payload?.stop_hook_active) return null;

  let entries;
  try {
    entries = currentTurn(raw);
  } catch {
    return null; // FAIL-OPEN
  }

  const closing = finalMessage(entries);
  if (!closing) return null;
  if (ESCAPE_RE.test(closing)) return null;

  // Only claims in the CLOSING message count: that is what Sean reads and acts on. An absence noted
  // mid-turn and then disproven by the agent itself is the process working, not a defect.
  const sentences = closing.split(/(?<=[.!?\n])/);
  const offenders = sentences.filter((s) => ABSENCE_RE.test(s) && ASSET_RE.test(s));
  if (!offenders.length) return null;

  // Did the multi-ref check actually run anywhere this turn?
  if (EVIDENCE_RE.test(turnText(entries))) return null;

  const quoted = offenders.slice(0, 2).map((s) => `  "${s.trim().slice(0, 160)}"`).join('\n');
  return [
    'ABSENCE-CLAIM GATE: this turn reports a repo asset as missing, with no multi-ref check in the transcript.',
    '',
    quoted,
    '',
    '"X is not in this checkout" is not "X does not exist". A repo is every branch, every remote-tracking',
    'ref, every linked worktree and the stash — and in a repo with worktrees, the tree you are standing in',
    'is the least representative sample available. On 2026-08-15 this exact claim ("GLM is not wired") cost',
    'a paid review round; the file was on another branch the whole time.',
    '',
    'Run the one command, then re-state the claim with its result:',
    '    node scripts/repo-wide-find.mjs <name>',
    '  exit 0 = it exists somewhere (your claim is false) · 1 = absence is now evidenced · 2 = check could not run',
    '',
    'If the claim is not about a repo asset, or the check genuinely does not apply, say so explicitly:',
    '    ABSENCE-CHECK: N/A — <reason>',
  ].join('\n');
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return; // unparseable stdin -> allow
  }
  if (!payload.transcript_path) return;
  let raw;
  try {
    raw = readFileSync(payload.transcript_path, 'utf8');
  } catch {
    return; // FAIL-OPEN
  }
  const reason = decide(payload, raw);
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

// Only run as a hook when executed directly, so importing it for tests has no side effects.
if (process.argv[1] && process.argv[1].endsWith('absence-claim-gate.mjs')) {
  try {
    main();
  } catch {
    // FAIL-OPEN, always. A gate that wedges the session is worse than the bug it polices.
  }
}
