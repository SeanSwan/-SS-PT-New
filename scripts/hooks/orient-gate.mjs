/**
 * orient-gate.mjs — deterministic Stop hook enforcing the ORIENT block. Replaces dual-tier-gate.
 * =============================================================================================
 * WHY THE OLD GATE DIED (Sean, 2026-08-27). Rule 57's dual-tier summary could never satisfy
 * what Sean asked for: BOTH of its tiers described the DELTA at two altitudes and NEITHER
 * stated the INVARIANT — which project this is, where in it we are. He was not misreading good
 * summaries; he was missing an index, and altitude cannot cure an indexing failure. Confirmed
 * independently by two GLM 5.3 hostile reviews.
 *
 * RETIRED ON *WRONG TARGET*, EXPLICITLY NOT ON FIRE RATE — and the distinction is load-bearing.
 * dual-tier-gate measured 6.3% raw / 5.9% cleaned against a 15% kill threshold Sean had
 * pre-registered BEFORE the data existed, and stayed a KEEP at every clustering window tested
 * (1/5/10/30/60 min). Retiring it for "firing too much" would have been false, and would have
 * taught every future gate that a pre-registered threshold is negotiable after the fact. The
 * honest ground — the one on the record — is that it enforced the wrong requirement accurately.
 *
 * CONTRACT (Claude Code Stop hook, type "command"):
 *   stdin = { stop_hook_active, transcript_path, ... }
 *   allow = exit 0, no output;  block = exit 0 + stdout {decision:"block", reason}
 *
 * DECISION ORDER (current turn only):
 *   1. stop_hook_active / unreadable transcript      -> allow (fail-open; a broken gate must
 *      never wedge a session, and the no-loop guard keeps enforcement to once per turn)
 *   2. trivial turn                                  -> allow (Sean's call 2026-08-27: a bare
 *      acknowledgement carries no block. Uniform blocks on "ok" manufacture the noise that
 *      trains him to skim past the real ones — the failure both reviewers named.)
 *   3. `ORIENT: N/A — <whitelisted reason>`          -> allow (free text is BANNED; an escape
 *      hatch that accepts any prose becomes boilerplate, and boilerplate teaches him that all
 *      markers are ignorable)
 *   4. block absent / malformed / vacuous / over budget / unverifiable PROOF -> BLOCK
 *   5. derived line disagrees with the live repo (wrong project, carried copy, wrong size)
 *      -> BLOCK. These are the checks a typed header cannot survive.
 *
 * REMOVAL CONDITION, pre-registered now, before its data exists (house rule: nothing lands
 * without exit criteria — that ratchet is what produced a 216KB rulebook):
 *   - DELETE if the CLEANED fire rate exceeds 15% of runs at 2026-09-27, where "cleaned" means
 *     distinct occasions at a 10-minute clustering window. That definition is written down HERE
 *     because the old policy said "cleaned" without defining it, and the verdict for two other
 *     gates flipped depending on the window chosen.
 *   - DELETE if its detection regex is widened twice inside the window: two widenings means the
 *     contract is wrong, not the matcher.
 */
import { emit } from '../lib/gate-shadow.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseOrient, validateShape, contentHash, CODE } from '../lib/orient-contract.mjs';

const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]|hermes-learning-packets[\\/]|memory[\\/]/;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit', 'write_file', 'patch']);
const GIT_ACTIVITY_RE = /git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(commit|push)\b/;
/** Whitelisted escape reasons. Literals only — see decision order note 3. */
const NA_RE = /ORIENT:\s*N\/A\s*—?\s*(NO-WORK|HANDOFF-FOLLOWS|OPERATOR-WAIT)\b/;

/** A turn is trivial when it touched nothing and said almost nothing. */
const TRIVIAL_CHARS = 200;

// NOTE: the feedback predicate below is a BYTE-IDENTICAL copy shared by every Stop gate, and
// `gate-window-parity.test.mjs` fails if it drifts. Gate-specific constants must stay ABOVE
// this line. (Do not name the constant in this comment — the parity extractor searches for
// that literal and will start its slab here instead of at the declaration.) Duplicated rather
// than imported on purpose: a failed import breaks the gate at load, before its fail-open.
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
    try { entries.push(JSON.parse(line)); } catch { /* skip malformed line */ }
  }
  return entries;
}

/** Signals for the current turn. Only the CLOSING assistant message can satisfy the gate. */
export function analyzeTurn(entries) {
  const lastUserIdx = entries.reduce((acc, e, i) => (isRealUserLine(e) ? i : acc), -1);
  const turn = entries.slice(lastUserIdx + 1);
  const s = { fileWrites: 0, gitActivity: false, toolUses: 0, text: '' };

  for (const entry of turn) {
    if (entry?.type !== 'assistant') continue;
    const content = entry.message?.content;
    if (typeof content === 'string') { if (content.trim()) s.text = content; continue; }
    if (!Array.isArray(content)) continue;
    const textHere = content.filter((c) => c?.type === 'text').map((c) => String(c.text ?? '')).join('\n');
    if (textHere.trim()) s.text = textHere;
    for (const item of content) {
      if (item?.type !== 'tool_use') continue;
      s.toolUses += 1;
      const input = item.input ?? {};
      const target = String(input.file_path ?? input.path ?? '');
      if (WRITE_TOOLS.has(item.name)) {
        if (target && !EMISSION_PATH_RE.test(target)) s.fileWrites += 1;
      } else if (item.name === 'Bash' && GIT_ACTIVITY_RE.test(String(input.command ?? ''))) {
        s.gitActivity = true;
      }
    }
  }
  return s;
}

/** Live repository facts. FAIL-OPEN: unavailable git means "cannot verify", never "assume bad". */
export function readGitFacts() {
  const git = (...a) => {
    try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { return ''; }
  };
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const sha = git('rev-parse', 'HEAD');
  const recent = git('log', '--max-count=50', '--format=%h');
  return {
    branch: branch || null,
    sha: sha ? sha.slice(0, 7) : null,
    recentShas: recent ? recent.split('\n').filter(Boolean) : [],
  };
}

/**
 * Hash of the last ACCEPTED block — written by `rememberAccepted` below, never by the renderer.
 * That distinction is the whole correctness of this detector: an earlier version stamped the
 * hash at RENDER time, so the first honest emission of freshly-written content compared equal
 * to itself and was accused of being a copy. The gate caught that in itself on its first live
 * turn (2026-08-27).
 *
 * Returns null on ANY ambiguity — no ledger, several ledgers, unreadable file. Null means "no
 * claim made", so the check simply does not run. This detector must never block on a guess.
 */
function readLastHash() {
  try {
    const dir = '.ai-workflow/orientation';
    if (!existsSync(dir)) return null;
    const yamls = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
    if (yamls.length !== 1) return null;
    const m = readFileSync(join(dir, yamls[0]), 'utf8').match(/^last_block_hash:\s*"?([0-9a-f]{16})"?/m);
    return m ? m[1] : null;
  } catch { return null; }
}

const say = (code, detail) =>
  `${code} — ${detail}\n\nRender the block instead of typing it: \`node scripts/orient.mjs\` `
  + '(add `--full` on a commit, a phase change, or when Sean asks for a recap). Update its '
  + 'content first with `node scripts/orient.mjs --set now="..." next="..."`. The identity line '
  + 'is derived from git and is recomputed here — a hand-edited one is exactly the typed header '
  + 'this replaced.';

export function decide(hookInput, transcriptRaw, live = readGitFacts(), lastHash = readLastHash()) {
  if (hookInput?.stop_hook_active) return null;
  const s = analyzeTurn(parseTranscript(transcriptRaw));

  // Sean's call 2026-08-27: pure acknowledgements carry nothing.
  const trivial = s.toolUses === 0 && s.text.trim().length < TRIVIAL_CHARS;
  if (trivial) return null;
  if (NA_RE.test(s.text)) return null;

  const claim = parseOrient(s.text);
  if (!claim) {
    return say(CODE.ABSENT,
      'this reply did substantive work but does not open with an ORIENT block. Sean runs many '
      + 'projects at once and needs to know which one a tab is, and where in it we are, without '
      + 'reading the reply.');
  }

  const shape = validateShape(claim);
  if (shape.length) return say(shape[0].code, shape[0].detail);

  // Wrong project is the failure this whole mechanism exists to end, so it always blocks.
  if (live?.branch && claim.branch !== live.branch) {
    return say(CODE.WRONG_PROJECT,
      `the block says branch "${claim.branch}" but this repository is on "${live.branch}". `
      + 'That header is describing different work than the work that happened.');
  }

  // Sha lag accuses ONLY when the turn made no commit. If the turn committed, HEAD moved
  // legitimately after an honest render, and blocking would punish correct behaviour — a false
  // block costs a whole turn, which is how a gate becomes hated and then deleted.
  if (live?.sha && !s.gitActivity && claim.sha !== 'NONE' && claim.sha !== live.sha) {
    return say(CODE.STALE,
      `the block claims ${claim.sha} but HEAD is ${live.sha}, and nothing was committed this `
      + 'turn — so the block was carried over from an earlier turn rather than rendered for '
      + 'this one. A header that is reused stops describing anything.');
  }

  // A fresh sha with frozen prose is still a carried copy. This catches what the sha cannot.
  if (lastHash && contentHash(claim, createHash) === lastHash && (s.fileWrites > 0 || s.gitActivity)) {
    return say(CODE.CARRIED,
      'NOW / NEXT / DONE are byte-identical to the previously rendered block, but this turn '
      + 'changed files. The work moved and the summary did not.');
  }

  // The size marker is derived, so the gate can catch a light block on a turn that earned full.
  if (claim.size === 'L' && s.gitActivity) {
    return say(CODE.SIZE,
      'this turn committed, which is a FULL-block event, but the block is marked L. Re-render '
      + 'with `--full` so WHY, DONE and PROOF are present.');
  }

  // PROOF tokens are verified, not merely pattern-matched — this is the field where theater is
  // mechanically detectable, so it is where the teeth are.
  if (claim.fields.PROOF && live?.recentShas?.length) {
    const shas = [...claim.fields.PROOF.matchAll(/\b([0-9a-f]{7,40})\b/g)].map((m) => m[1].slice(0, 7));
    const bogus = shas.filter((h) => !live.recentShas.includes(h));
    if (shas.length && bogus.length === shas.length) {
      return say(CODE.PROOF,
        `PROOF cites ${bogus.join(', ')}, which is not among the last 50 commits on this branch. `
        + 'Cite evidence that exists.');
    }
  }
  return null;
}

/**
 * Record the content this turn actually got away with, so the NEXT turn can be asked whether
 * its summary moved. Runs only on ALLOW: a blocked block was never accepted, so remembering it
 * would let a rejected draft poison the comparison.
 *
 * Best-effort by construction — a failure here must never turn an allow into a block. The cost
 * of a missed write is one turn where carried-copy cannot be detected; the cost of throwing
 * would be a wedged session.
 */
function rememberAccepted(text) {
  try {
    const dir = '.ai-workflow/orientation';
    if (!existsSync(dir)) return;
    const yamls = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
    if (yamls.length !== 1) return;          // ambiguous owner — never guess whose ledger this is
    const claim = parseOrient(text);
    if (!claim) return;
    const p = join(dir, yamls[0]);
    const cur = readFileSync(p, 'utf8');
    const line = `last_block_hash: "${contentHash(claim, createHash)}"`;
    writeFileSync(p, /^last_block_hash:.*$/m.test(cur)
      ? cur.replace(/^last_block_hash:.*$/m, line)
      : `${cur.trimEnd()}\n${line}\n`, 'utf8');
  } catch { /* best effort only */ }
}

function main() {
  let hookInput = {};
  try { hookInput = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  if (hookInput?.stop_hook_active) return;
  let raw = '';
  try { raw = readFileSync(String(hookInput.transcript_path ?? ''), 'utf8'); } catch { return; }
  try {
    const reason = decide(hookInput, raw);
    if (!reason) rememberAccepted(analyzeTurn(parseTranscript(raw)).text);
    emit('orient-gate', reason);
  } catch { /* fail-open */ }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
