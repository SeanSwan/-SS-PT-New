# Hostile review — round 4: does it come back clean?

**Branch:** `feat/spend-guard-tests` (PR #87) from `origin/main` @ `c500e0bf6`. If a claim here disagrees with main, main wins.

You returned REVISE in round 3. **Every finding from both of you was reproduced live before fixing; none was disproven.** All are now fixed or explicitly recorded. This round asks one question: is there anything left?

## What changed since round 3

| Finding | Status |
|---|---|
| 5.3 MISSED-1 — no consult seat wrote to the ledger; caps were fiction | FIXED at the shared engine |
| 5.3 B4 — two paid scripts, one price | FIXED, then flash showed max was wrong; now SUMMED per invocation |
| 5.3 B3 — KNOWN_UNGATED freeze was prose | FIXED: asserted exact key set |
| 5.3 B2 — spend-guard printed its token to the agent | FIXED: written to an operator note |
| 5.3 F2 — my parallel test was vacuous | CONFIRMED by your own red-test (20/20 green against the old code). Rebuilt with a barrier; now 12/20 detection, measured and documented as probabilistic |
| 5.3 F1 / flash B1 — `--model` priced unknown seats | FIXED: branch deleted |
| flash B2 + F5 — quoted data treated as code, both directions | FIXED: content-based masking |
| flash F4 — gate hard-blocked a no-op library | FIXED: gateway keeps its path key |
| flash F1 — no reservation; 20 parallel calls approved $6.20 vs a $5 cap | FIXED: append-only reservations |
| flash B3 / 5.3 F5 — walker blind below one level | FIXED: recursive + a control that can detect blindness |
| flash F3 — O_EXCL portability overclaim | CORRECTED in the comment |
| flash F6 — delegation invisible to both controls | RECORDED, not closed. See the header of paid-seats.mjs for why |

## Attack these

1. **The reservation.** Append-only reserve/release folded by model+topic, 10-minute TTL. Can a release settle a DIFFERENT call's hold? Can holds leak, double-count, or starve? What happens when the file grows unbounded?
2. **maskQuotedData.** A quoted span survives only if it starts with an interpreter. Find a spending shape it hides, and an honest command it now breaks.
3. **Per-invocation summing.** Find a compound line that still under-prices.
4. **The coverage contract** after recursion and the `process.env.` marker. What still escapes it?
5. **My tests.** I have written FOUR vacuous tests this workstream — three found by red-testing, one by you. Assume a fifth. Name it.

## Return
```
VERDICT:   APPROVE | REVISE | REJECT
BLOCKERS:  numbered; file:line + why it fails
FINDINGS:  numbered; severity + file:line + concrete failure scenario
MISSED:    what I should have checked and did not
ONE THING: the single highest-value change
```

If nothing survives scrutiny, say APPROVE plainly — a manufactured finding costs more than a missed one, because the fix churns a working guard.

---

# APPENDIX

## A1 · scripts/lib/paid-seats.mjs
```javascript
/**
 * paid-seats.mjs — the single source of truth for "which scripts spend money".
 * ============================================================================
 * Created 2026-08-26 (SWA-218) because BOTH hostile reviewers, independently,
 * named the same highest-value change: stop hand-curating the gate's seat list.
 *
 * THE PROBLEM THIS EXISTS TO END. `spend-guard-gate.mjs` enumerated the paid
 * scripts inside its own regex. That enumeration drifted in BOTH directions at
 * once, and nothing noticed for weeks:
 *
 *   - It priced GHOSTS. `consult-grok.mjs` and `consult-panel.mjs` are named in
 *     the pattern and in SCRIPT_MODEL. Neither exists on main.
 *   - It MISSED live paid scripts. `consult-openrouter-panel.mjs` (a whole
 *     fan-out), `consult-hy3-design.mjs`, `consult-opus5.mjs` and
 *     `consult-codex-via-openrouter.mjs` all read OPENROUTER_API_KEY and matched
 *     nothing at all.
 *
 * A list a human maintains by hand is a list that goes stale silently. The fix is
 * not a better list — it is a TEST that fails the day drift lands
 * (`spend-coverage.test.mjs`), reading from this one file so the gate and the
 * contract can never disagree.
 *
 * WHY CREDENTIALS AND NOT NAMES. Names rot; a grep for a payment credential does
 * not. A new seat added next month is caught because it must read an API key to
 * spend, whatever it is called and wherever it sits.
 *
 * KNOWN GAP — DELEGATION (GLM 5.3-flash round-3 F6, accepted). That premise is false
 * for wrappers. A script that `spawn()`s `node scripts/consult-fable.mjs` contains no
 * credential literal, so the coverage contract passes it, AND its own command text
 * names no seat, so the gate ignores it. Both controls miss the same class.
 *
 * The two Village entries in KNOWN_UNGATED are exactly that shape, admitted by hand —
 * which is the tell: the contract could not have found them. It cannot find the next
 * one either. A marker that greps for the SEAT NAMES themselves (not just credentials)
 * would close it, and is not built here because it needs its own design pass: seat
 * names appear in docs, tests and this very file, so a naive version would flag the
 * whole repo and get switched off. Recorded rather than papered over — the contract's
 * "no third option" claim is true for direct callers and NOT for delegating ones.
 */

/**
 * Environment variables whose presence in a script means "this call costs money".
 *
 * ZAI_API_KEY is deliberately ABSENT: Z.ai GLM is billed against Sean's flat
 * coding-plan subscription, so it has no per-token cost to cap. It burns plan
 * credit, which is a budgeting concern, not a spend-gate concern.
 */
export const CREDENTIAL_MARKERS = [
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
];

/**
 * Scripts that touch a credential but must NOT be gated, each with the reason.
 * Adding a row here is a deliberate, reviewable act — which is the entire point.
 * An empty reason is not allowed; the coverage test rejects it.
 */
export const FREE_ALLOWLIST = {
  'consult-gemini.mjs': 'Google AI Studio free tier; no OpenRouter credit consumed',
  'consult-glm.mjs': 'Z.ai coding-plan subscription — flat rate, nothing per-token to cap',
};

/**
 * KNOWN UNGATED — the debt this contract found on its first run, named rather than
 * hidden. These read a payment credential and the ledger does not see them.
 *
 * This baseline exists so the contract can be adopted onto a legacy surface without
 * either lying (deleting the finding) or blocking on a large refactor. The test
 * passes with exactly this list and FAILS THE MOMENT IT GROWS — which is the whole
 * point: today's debt is frozen, tomorrow's drift is caught.
 *
 * **Do not add a row here to make a test go green.** Each one is a real hole; adding
 * to this list is admitting a new one, which is a conversation with Sean, not a fix.
 *
 * Tracked as SWA-218 follow-up.
 */
export const KNOWN_UNGATED = {
  // The four forge-* image probes left this list 2026-08-27: PAID_INVOCATION now
  // matches the `forge-` prefix and they are priced against openai/gpt-5.4-image-2.
  // They were "UNCLASSIFIED — may bill per image", which is a record of a hole rather
  // than a control over one.
  'validation-orchestrator.mjs':
    'The paid AI Village (~13 brains). RECONCILED 2026-08-26: it now WRITES its actual per-model '
    + 'cost into the shared ledger (recordRunSpend) and its pre-run gate READS the cumulative '
    + 'per-topic and per-day totals, so Village spend and consult spend finally see each other. '
    + 'It stays listed here because the gate does not match its command shape — the control is '
    + 'in-process (its own SWAN_VILLAGE_MAX_USD cap plus the Rule 16 permission gate), not the '
    + 'PreToolUse hook. Covered, by a different mechanism, on purpose.',
  'hermes-village.mjs':
    'Wraps the Village runner, so it inherits the same in-process controls — including the '
    + 'ledger reconciliation landed 2026-08-26.',
  'lib/preflight.mjs':
    'LIBRARY. It reads a credential only to CHECK the key is present before an AI-invoking '
    + 'script runs; it makes no call of its own. Surfaced 2026-08-27 when the coverage walker '
    + 'became recursive after two rounds of being blind below the top level.',
  'context-gateway/src/consult.mjs':
    'LIBRARY, not an entrypoint (verified 2026-08-27: no shebang, no self-invocation guard, so '
    + 'running it directly defines exports and exits, spending nothing). Listed EXPLICITLY because '
    + 'GLM 5.3-flash F4 found that basenaming its path yielded `consult.mjs`, which matched no '
    + 'allowlist and no price table — so the gate hard-BLOCKED a no-op and told the operator to '
    + '"add the real OpenRouter price" for a library. scriptNameFrom now keeps the path as the key.',
  'context-gateway/src/transport.mjs':
    'LIBRARY, not an entrypoint — no shebang, no top-level invocation. It is imported by '
    + 'context-gateway/src/consult.mjs, which is ALSO a library (verified 2026-08-27: no '
    + 'self-invocation guard, so `node .../consult.mjs` defines exports and exits, spending '
    + 'nothing). Real spend goes through the consult-<seat>.mjs shims, which PAID_INVOCATION '
    + 'matches. CORRECTION: an earlier note here called the gateway a live "substitute path" '
    + 'bypass. It is not. That finding was accepted after confirming the REGEX did not match it, '
    + 'without confirming the file was EXECUTABLE — matching is not the same as exploitable.',

  // NOTE: the five codex variants, consult-hy3-design.mjs and consult-opus5.mjs were
  // here as UNPRICED frozen debt until 2026-08-27. They are now PRICED in
  // spend-guard-gate.mjs from OpenRouter's per-endpoint API — read, not recalled —
  // so they are fully capped and no longer belong on any exemption list. Debt paid
  // down, not re-labelled.
  // NOTE: consult-openrouter-panel.mjs is deliberately NOT here. It belongs to
  // PANEL_SCRIPTS, which has real per-seat pricing. Listing it as frozen debt made the
  // gate short-circuit BEFORE that pricing ran, so an expensive fan-out sailed through
  // — caught by the "expensive seats must block" test within a minute of writing it.
  // Two overlapping allowlists is one allowlist too many; the ordering matters.
};

/**
 * Matches an INVOCATION of a paid script, not a mention of it.
 *
 * WRITTEN AS A LITERAL, AND IT MUST STAY ONE. This pattern's history is four
 * silent corruptions, three of them from authoring it through shell or python
 * interpolation — one turned a backslash-b into a literal 0x08 so the gate matched
 * nothing while still reporting "SYNTAX OK". A fifth was committed in the same
 * session as this file, when a sibling helper built a pattern from a TEMPLATE
 * LITERAL and JavaScript collapsed the `\s` to a bare `s`. Never construct this.
 *
 * Leading context and separator are both NEGATED IDENTIFIER classes rather than
 * enumerated separators: anything that is not part of a word or a path is a
 * boundary, so quotes, tabs, newlines, parens and `$(` all count without anyone
 * having to remember them. `mynode`, `nodejs` and `node-foo` still do not match.
 *
 * The middle alternates QUOTED SPANS with non-boundary characters, so a `| ; &`
 * inside a quoted argument cannot hide the call — this repo's own review templates
 * tell agents to pass remits containing "APPROVE | REVISE | REJECT" — while an
 * unquoted boundary still stops a match from crossing into a different command.
 *
 * The script-name group is DELIBERATELY BROAD (`consult-*`, `forge-*`) plus the
 * context-gateway path. Enumerating seats is what drifted; matching the shape and
 * letting the coverage test police the roster is what replaced it.
 *
 * `forge-` was added 2026-08-27 when the four image probes were classified. They call
 * a paid image endpoint and were matched by nothing — the coverage contract had them
 * as frozen debt, which is a record of a hole, not a control over one. A prefix the
 * roster already knows about is cheaper to widen than to remember.
 */
export const PAID_INVOCATION =
  /(?:^|[^A-Za-z0-9_-])(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?(consult-[a-z0-9-]+|forge-[a-z0-9-]+|eval-suite|prompt-mutator|context-gateway[/\\]src[/\\]consult)[.]mjs/;

/**
 * Node flags that mean "do not execute this file". `node --check foo.mjs` parses and
 * exits; `--version` never opens the file at all.
 *
 * Added 2026-08-27 after the gate refused my own `node --check` of a consult file
 * mid-fix — a live instance of the cry-wolf class GLM 5.3 raised as F1. A syntax
 * check spends nothing, and a guard that blocks the verification step of its own
 * repair is training the operator to reach for --no-verify.
 */
const NON_EXECUTING = /(?:^|[^A-Za-z0-9_-])--(?:check|version)(?:[^A-Za-z0-9_-]|$)/;

/**
 * Blank out quoted spans that are DATA, keeping those that are CODE.
 *
 * Two confirmed defects share this root, one in each direction (GLM 5.3-flash
 * round-3 B2 and F5, both reproduced live):
 *
 *   --remit "does it support --dry-run"     -> the gate saw --dry-run and stood down
 *                                              on a LIVE paid fan-out. exit 0.
 *   --text "see scripts/consult-fable.mjs"  -> an honest doc script was blocked and
 *                                              mispriced as a Fable consult. exit 2.
 *
 * The second one blocked my own verification probe while I was checking the first.
 *
 * Naive quote-stripping is wrong: `sh -c "node scripts/consult-fable.mjs"` is a real
 * invocation living entirely inside quotes, and round 2 added tests for exactly that.
 * So the rule is CONTENT-BASED, not syntactic — a quoted span survives only if it
 * starts with an interpreter (optionally after env assignments). Anything else is an
 * argument, and an argument is data.
 *
 * Replaced with spaces rather than removed, so byte offsets and word boundaries
 * outside the span are unchanged.
 */
export function maskQuotedData(cmd) {
  return String(cmd || '').replace(/"[^"]*"|'[^']*'/g, (span) => {
    const inner = span.slice(1, -1);
    const looksLikeCommand = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:env\s+)?(?:\S*\/)?(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-]/.test(inner);
    return looksLikeCommand ? span : ' '.repeat(span.length);
  });
}

/** True when this command text invokes something that could spend money. */
export function invokesPaidSeat(cmd) {
  const c = maskQuotedData(cmd);
  if (NON_EXECUTING.test(c)) return false;
  return PAID_INVOCATION.test(c);
}

/**
 * EVERY paid script an invocation names, in order — not just the first.
 *
 * GLM 5.3 round-3 blocker 4, verified live before fixing:
 *
 *     node scripts/consult-kimi.mjs --document p.md && node scripts/consult-fable.mjs --document p.md
 *
 * returned exit 0. `scriptNameFrom` resolved the FIRST invocation, the gate priced
 * Kimi at ~$0.32, that fits inside the cap, and Fable's ~$1.06 in the same Bash call
 * was never priced, never asked about and never recorded. The single-paid-script case
 * was fine; only multi-paid lines mis-metered — which is exactly the shape an agent
 * batching consults would write without any intent to evade.
 *
 * The gate prices the MOST EXPENSIVE name it finds. Summing would be more accurate in
 * principle, but each script here is one call with its own worst case, and the caller
 * that matters is the cap: taking the max guarantees the priciest seat in the line is
 * the one measured, with no way for a cheap seat to shelter an expensive one.
 */
/**
 * One key per seat. The gateway engine keeps its PATH; everything else is a basename.
 *
 * GLM 5.3-flash round-3 F4, reproduced live: basenaming `context-gateway/src/consult`
 * yielded `consult.mjs`, which is in no allowlist and no price table — so the gate
 * took the unpriced BLOCK and told the operator to "add the real OpenRouter price"
 * for a file already classified as spending nothing. A hard block on a no-op, with a
 * message inviting the next agent to price a library.
 */
function normalizeSeatKey(matched) {
  if (matched.includes('context-gateway')) return 'context-gateway/src/consult.mjs';
  return `${matched.replace(/^.*[/\\]/, '')}.mjs`;
}

export function allScriptNamesFrom(cmd) {
  const text = maskQuotedData(cmd);
  if (NON_EXECUTING.test(text)) return [];
  const global = new RegExp(PAID_INVOCATION.source, 'g');
  const names = [];
  for (const m of text.matchAll(global)) {
    if (m[1]) names.push(normalizeSeatKey(m[1]));
  }
  return names;
}

/**
 * Scripts that ACTUALLY implement `--dry-run`.
 *
 * The gate used to honor the flag for anything: `if (/--dry-run/.test(cmd)) ALLOW()`.
 * Verified 2026-08-27 — only `consult-openrouter-panel.mjs` implements it. The Fable,
 * Sol and Kimi shims and the gateway engine do not mention it at all, so appending
 * `--dry-run` to one of those made the gate stand down while the script ignored the
 * unknown flag and billed in full.
 *
 * That is the identical bypass class the file already documents for `--max-tokens 500`
 * — a flag the script does not accept, lowering the gate's estimate. Honoring a flag
 * the target ignores is how a gate lies, and it was still doing it in one branch.
 */
export const DRY_RUN_AWARE = new Set(['consult-openrouter-panel.mjs']);

/**
 * Fan-out scripts that refuse the live call themselves without `--confirm-spend`,
 * so gating them before that flag appears would be pure cry-wolf.
 *
 * The old check named `consult-panel.mjs`, which does not exist on main — so the
 * REAL panel never took this branch, and a script that does exist never took it
 * either. Drift in both directions, in a single condition.
 */
export const PANEL_SCRIPTS = new Set(['consult-openrouter-panel.mjs']);

/**
 * Pull the seat script's basename out of a command, or '' if none.
 * Handles both `consult-<seat>.mjs` and the gateway engine path.
 */
export function scriptNameFrom(cmd) {
  // MUST come from the INVOCATION match, never a free-floating scan of the command.
  //
  // LIVE BYPASS, found by attacking this function 2026-08-27 and confirmed end-to-end
  // through the real gate. The previous version matched the FIRST script name
  // ANYWHERE in the string, so:
  //
  //     cat scripts/consult-gemini.mjs && node scripts/consult-fable.mjs --document x
  //
  // matched (a Fable call really is there), resolved the name to `consult-gemini.mjs`,
  // hit FREE_ALLOWLIST, and returned exit 0. A Fable call, uncapped, behind a `cat`.
  //
  // I introduced it in the inversion commit: the old narrow regex had the same
  // first-match flaw, but nothing consulted an allowlist by name, so it was inert.
  // Adding the FREE_ALLOWLIST short-circuit is what turned a latent sloppiness into
  // an exploit — a reminder that a bypass can be created by a change that touches
  // neither of the two places involved.
  //
  // Taking the capture group from PAID_INVOCATION binds the NAME to the RUNNER. The
  // lazy middle picks the first script after the interpreter, which is the one being
  // executed; a name appearing earlier (a `cat`) or later (an `--seed` argument, a
  // redirect target) can no longer stand in for it.
  const m = PAID_INVOCATION.exec(maskQuotedData(cmd));
  if (!m) return '';
  return normalizeSeatKey(m[1]);
}
```

## A2 · scripts/lib/spend-ledger.mjs
```javascript
/**
 * spend-ledger.mjs — cumulative paid-AI spend tracking and the two-ask gate.
 * ==========================================================================
 * Sean's directive 2026-08-22, after a single trainer-dashboard workstream cost
 * ~$4.87: Fable 5 alone was $3.47 across FOUR calls, Sol Pro $0.92 across two.
 *
 * WHY THE EXISTING GATES DID NOT CATCH IT — this is the whole design rationale.
 * There were already two spend controls: `--confirm-spend` on the panel, and a
 * `premium: true` opt-in on the Fable and Sol seats. Neither fired, because
 * NEITHER IS CUMULATIVE. No single call was outrageous — the most expensive was
 * $0.97. Four reasonable calls in a row are what blew the budget. A per-call
 * ceiling alone would have approved every one of them.
 *
 * So the primary control here is a LEDGER with a per-topic budget. The per-call
 * ceiling is secondary, for the genuinely large single call.
 *
 * THE TWO-ASK RULE. Sean: "I would be asked twice before approving." One flag
 * an agent can type becomes a reflex — that is exactly how `--confirm-spend`
 * stopped working. So a breach is refused on the FIRST attempt and emits a
 * single-use token naming the real number. Only a SECOND, separate invocation
 * carrying that token proceeds. The agent cannot self-approve in one step, and
 * the number is put in front of Sean twice.
 *
 * Budgets are deliberately low. Sean: "shouldn't cost me no more than two or
 * three bucks for that whole thing max. Three dollars is a lot for one call."
 *
 * Privacy (Rule 8/44/59): the ledger stores model ids, costs and a topic slug.
 * Never prompt content, never keys.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `SWAN_SPEND_DIR` redirects the ledger, for tests only. Added 2026-08-26 so
 * scripts/hooks/spend-guard-gate.test.mjs can exercise the BLOCKING path — which
 * mints a token and reads cumulative totals — without writing into Sean's real
 * spend state (SWA-218).
 *
 * WHY THIS IS NOT A BYPASS, since an env override on a money ledger deserves the
 * question: the gate runs as a Claude Code PreToolUse hook, so its environment is
 * the harness's, NOT the environment of the Bash command being judged. An agent
 * writing `SWAN_SPEND_DIR=/tmp/empty node scripts/consult-fable.mjs` puts that
 * text in the COMMAND STRING, which the hook merely reads as data — it never
 * reaches the hook process. That asymmetry is already load-bearing elsewhere in
 * this system: spend-guard-gate.mjs parses `SWAN_*MODEL=` out of the command text
 * for exactly the same reason. Setting this variable for real requires editing
 * the harness config or the shell profile, which is a different threat model than
 * the one these gates defend against.
 */
export const SPEND_DIR = process.env.SWAN_SPEND_DIR
  || join(HERE, '..', '..', '.ai-workflow', 'spend');
const LEDGER = join(SPEND_DIR, 'ledger.jsonl');
const TOKENS = join(SPEND_DIR, 'pending-approval.json');

/** Caps in USD. Env overrides exist for genuine exceptions, never for routine use. */
export const CAPS = {
  perCall: Number(process.env.SWAN_SPEND_CAP_CALL || 1.00),
  perTopic: Number(process.env.SWAN_SPEND_CAP_TOPIC || 3.00),
  perDay: Number(process.env.SWAN_SPEND_CAP_DAY || 5.00),
};

const ensureDir = () => { if (!existsSync(SPEND_DIR)) mkdirSync(SPEND_DIR, { recursive: true }); };

/** Read every ledger entry. A corrupt line is skipped, never fatal — this must not block work. */
export function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Record real spend AFTER a call completes.
 * @param {{model:string, topic:string, usd:number, note?:string}} entry
 */
/**
 * "Priced" means a real finite number, or a non-blank numeric string. NOT `Number(usd)`
 * alone: `Number('')` is 0, `Number('  ')` is 0, `Number(true)` is 1 — so an empty cost
 * field or a boolean would have recorded a confident $0.00 / $1.00, the exact silent-zero
 * class recordSpend was rewritten to close. Caught by the author attacking the author's
 * own prompt list for the review panel (2026-08-25), before any seat did. Exported so
 * the test can pin it without writing to the real ledger.
 */
export function isPriced(usd) {
  // Non-negative only (round-1 GLM F5): a negative "cost" is not a refund in this
  // ledger, it is a bug upstream — treat it as unpriced so it counts as worst case.
  if (typeof usd === 'number') return Number.isFinite(usd) && usd >= 0;
  // Strings: plain non-negative DECIMAL only. `Number('0x10')` is 16 and `Number('1e3')`
  // is 1000 — a cost field carrying hex or exponent notation is not a price, it is a
  // bug upstream, and pricing it would book phantom spend (round-2 self-attack).
  if (typeof usd === 'string') return /^\s*\d+(?:\.\d+)?\s*$/.test(usd);
  return false;
}

export function recordSpend({ model, topic, usd, note = '' }) {
  ensureDir();
  // `usd: null` is a LEGAL, MEANINGFUL value: "this call cost money and nobody
  // could price it." Three review seats independently flagged the previous
  // `Number(usd) || 0`: an unpriced model recorded a confident $0.00, so the caps
  // could never fire for exactly the calls of unknown price — fail-open in the
  // expensive direction, dressed as safe. Readers below treat null as WORST CASE
  // (perCall cap), so an unpriced call pushes the caps toward refusal, never away.
  // "Priced" means a real number or a non-blank numeric string. NOT `Number(usd)`
  // alone: `Number('')` is 0 and `Number(true)` is 1, so an empty cost field or a
  // boolean would have recorded a confident $0.00 / $1.00 — the exact silent-zero
  // class this function was rewritten to close. Caught by the author attacking the
  // author's own prompt list for the review panel (2026-08-25), before any seat did.
  const priced = isPriced(usd);
  // Settle the in-flight hold first: the real row below is now the truth.
  try { releaseReservation({ model, topic }); } catch { /* non-fatal */ }
  appendFileSync(LEDGER, `${JSON.stringify({
    ts: new Date().toISOString(), model, topic,
    usd: priced ? Number(usd) : null,
    note: priced ? note : `${note ? note + ' | ' : ''}UNPRICED — counted as worst-case $${CAPS.perCall}`,
  })}\n`, 'utf-8');
}

/**
 * ONE topic key for one document — the single source of truth for both sides of
 * the per-topic cap. The spend-guard hook normalized topics one way while a writer
 * stripped ANY extension and filtered nothing; `spentOnTopic` matches with STRICT
 * equality, so the same document could yield two keys and the topic cap would
 * silently never accumulate for it. Semantics are the GUARD's incumbent rules,
 * unchanged, so no in-flight approval token (keyed on model+topic+cost) is orphaned.
 * @param {string} p  document/out path or bare name
 */
export function topicFromPath(p) {
  return String(p || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(md|txt|json)$/i, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 60) || 'untitled';
}

// --- RESERVATIONS: the caps must count calls that are in flight ---------------
//
// GLM 5.3-flash round-3 F1, reproduced: twenty concurrent sol calls (~$0.31 each)
// against a $5.00 day cap were ALL allowed — $6.20 approved. Each one read
// spentToday = $0 and compared only its own worst case. The atomic claim fixed
// token REDEMPTION; this is the common case, and Claude Code issuing parallel tool
// calls is ordinary rather than exotic.
//
// APPEND-ONLY, because the obvious fix has the bug it is fixing. A shared counter
// read-modify-written by N processes is exactly the race being closed, one level up.
// So a reservation is an appended row and a release is another appended row; the
// outstanding total is a fold over the file. `appendFileSync` of a short line is
// atomic on both POSIX (O_APPEND) and Windows, so concurrent writers interleave
// whole lines rather than corrupting each other.
//
// TTL, because a crashed caller must not hold budget forever. A reservation older
// than the window is ignored — the same reasoning as the orphaned claim: a guard
// that can permanently withhold budget on a crash is broken in the safer direction.
const RESERVATIONS = join(SPEND_DIR, 'reservations.jsonl');
const RESERVATION_TTL_MS = 10 * 60_000;

function readReservations() {
  if (!existsSync(RESERVATIONS)) return [];
  const cutoff = Date.now() - RESERVATION_TTL_MS;
  const rows = readFileSync(RESERVATIONS, 'utf-8').split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && Date.parse(r.ts) >= cutoff);
  // Fold releases against reserves, oldest first, matched on model+topic.
  const released = new Map();
  for (const r of rows) {
    if (r.kind !== 'release') continue;
    const k = `${r.model}|${r.topic}`;
    released.set(k, (released.get(k) || 0) + 1);
  }
  const live = [];
  for (const r of rows) {
    if (r.kind !== 'reserve') continue;
    const k = `${r.model}|${r.topic}`;
    const owed = released.get(k) || 0;
    if (owed > 0) { released.set(k, owed - 1); continue; } // this one already settled
    live.push(r);
  }
  return live;
}

/** Hold budget for a call the gate is about to allow. */
export function reserveSpend({ model, topic, usd }) {
  ensureDir();
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'reserve', model, topic, usd: isPriced(usd) ? Number(usd) : null,
  })}\n`, 'utf-8');
}

/**
 * Settle the oldest reservation for this model+topic, so a completed call is
 * counted once (by its real ledger row) rather than twice.
 */
export function releaseReservation({ model, topic }) {
  if (!existsSync(RESERVATIONS)) return;
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'release', model, topic,
  })}\n`, 'utf-8');
}

/**
 * The dollar value a ledger row contributes to a cap. Unpriced rows (usd null)
 * count as the per-call cap: the one direction an unknown cost is allowed to err.
 */
const rowUsd = (e) => (e.usd === null || e.usd === undefined ? CAPS.perCall : (Number(e.usd) || 0));

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(entries = readLedger()) {
  const d = today();
  const settled = entries.filter((e) => (e.ts || '').startsWith(d)).reduce((s, e) => s + rowUsd(e), 0);
  // Calls in flight count too, or twenty concurrent ones each see $0 (flash F1).
  const inFlight = readReservations()
    .filter((r) => (r.ts || '').startsWith(d)).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
}

export function spentOnTopic(topic, entries = readLedger()) {
  if (!topic) return 0;
  const settled = entries.filter((e) => e.topic === topic).reduce((s, e) => s + rowUsd(e), 0);
  const inFlight = readReservations().filter((r) => r.topic === topic).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
}

/** Single-use approval tokens, keyed by the exact breach they were issued for. */
function readTokens() {
  if (!existsSync(TOKENS)) return {};
  try { return JSON.parse(readFileSync(TOKENS, 'utf-8')); } catch { return {}; }
}
function writeTokens(t) { ensureDir(); writeFileSync(TOKENS, JSON.stringify(t, null, 2), 'utf-8'); }

/**
 * Redeem a token by ATOMICALLY creating a claim file. Returns true for the one
 * caller that wins, false for every other.
 *
 * `flag: 'wx'` opens with O_CREAT|O_EXCL, which is atomic ON LOCAL DISK — if the path
 * exists the call fails with EEXIST and cannot be interleaved.
 *
 * SCOPE OF THAT GUARANTEE (GLM 5.3-flash round-3 F3, and the correction is his): it
 * holds on local ext4/NTFS/APFS and is honoured by SMB2's exclusive-create
 * disposition, but O_EXCL is NOT guaranteed on NFSv3 — a known limitation of that
 * protocol, not of this code. An earlier version of this comment said "the operating
 * system guarantees", full stop, which is the same overclaiming this workstream keeps
 * having to walk back. **SPEND_DIR must live on local disk.** It defaults to
 * `.ai-workflow/spend/` inside the repo; if SWAN_SPEND_DIR is ever pointed at a
 * network mount, this guarantee weakens and the double-spend it prevents comes back.
 * That is the whole mechanism: no lock to acquire, nothing to release, and no
 * window between "check" and "set" for a second process to slip through.
 *
 * FAILS CLOSED on any unexpected error. A cost check that bricks the toolchain is
 * bad, but this is not that check — this is the last step before money is spent, and
 * "the filesystem misbehaved" is not a reason to spend twice.
 */
const CLAIM_ORPHAN_MS = 60_000;

function claimToken(key, token) {
  ensureDir();
  const claimPath = join(SPEND_DIR, `claim-${key}.json`);
  try {
    writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err?.code !== 'EEXIST') return false;

    // ORPHAN RECLAIM. Found by attacking this function directly, and independently
    // by GLM 5.3-flash (2026-08-27 blocker 1a): a process that dies between creating
    // the claim and writing `used: true` leaves a claim file with no matching record
    // of the spend. Without this branch every later redemption hits EEXIST forever —
    // the approval Sean is holding becomes permanently unredeemable, with no TTL, no
    // override, and an error message blaming a concurrency that never happened.
    // A guard that can brick a legitimate approval on a crash is not fail-closed, it
    // is just broken in the safer direction.
    //
    // The caller only reaches here when tokens.json still says `used: false`, so a
    // claim older than the reclaim window can only be a crashed holder: a live winner
    // marks `used` within milliseconds of creating the claim.
    //
    // Reclaiming does NOT reopen the race. Two processes may both unlink, but only
    // one `wx` create can succeed, so redemption stays single-winner throughout.
    try {
      const age = Date.now() - statSync(claimPath).mtimeMs;
      if (age < CLAIM_ORPHAN_MS) return false; // a real concurrent winner is in flight
      unlinkSync(claimPath);
      writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString(), reclaimedOrphan: true }), { flag: 'wx' });
      return true;
    } catch {
      return false; // lost the reclaim race, or the filesystem misbehaved — refuse
    }
  }
}

/** A token is bound to model+topic+rounded-cost so it cannot be reused for a different call. */
const tokenKey = ({ model, topic, worstCaseUsd }) =>
  crypto.createHash('sha256')
    .update(`${model}|${topic}|${Number(worstCaseUsd).toFixed(2)}`)
    .digest('hex').slice(0, 12);

/**
 * The gate. Returns a decision; the caller decides how loudly to refuse.
 *
 * @param {{model:string, topic:string, worstCaseUsd:number, approvalToken?:string}} req
 * @returns {{allow:boolean, reason:string, breach:string|null, token:string|null, totals:object}}
 */
export function checkSpend({ model, topic, worstCaseUsd, approvalToken = '' }) {
  const entries = readLedger();
  const totals = {
    call: Number(worstCaseUsd) || 0,
    topic: spentOnTopic(topic, entries),
    day: spentToday(entries),
    caps: CAPS,
  };

  const breaches = [];
  if (totals.call > CAPS.perCall) {
    breaches.push(`single call $${totals.call.toFixed(2)} > cap $${CAPS.perCall.toFixed(2)}`);
  }
  if (totals.topic + totals.call > CAPS.perTopic) {
    breaches.push(`topic "${topic}" would reach $${(totals.topic + totals.call).toFixed(2)} > cap $${CAPS.perTopic.toFixed(2)} (already spent $${totals.topic.toFixed(2)})`);
  }
  if (totals.day + totals.call > CAPS.perDay) {
    breaches.push(`today would reach $${(totals.day + totals.call).toFixed(2)} > cap $${CAPS.perDay.toFixed(2)} (already spent $${totals.day.toFixed(2)})`);
  }

  if (!breaches.length) {
    return { allow: true, reason: 'within budget', breach: null, token: null, totals };
  }

  const key = tokenKey({ model, topic, worstCaseUsd });
  const tokens = readTokens();

  // SECOND ask: a valid, unused, matching token was presented.
  //
  // REDEMPTION IS AN ATOMIC CLAIM, not a read-modify-write (GLM 5.3 finding 2,
  // 2026-08-26). The previous version read tokens.json, checked `used === false`,
  // set it true, and wrote the file back. Two concurrent calls carrying the same
  // fresh token could both observe `used: false` and both proceed — a double-spend
  // on a single approval. Claude Code issues tool calls in parallel, so scheduling
  // that race is ordinary, not exotic.
  //
  // `claimToken` uses O_EXCL file creation, which the OS guarantees is atomic:
  // exactly one caller can create a given path. The JSON below is still updated for
  // the audit trail, but it is no longer what decides the outcome — the claim is.
  if (approvalToken && tokens[key] && tokens[key].token === approvalToken && !tokens[key].used) {
    if (!claimToken(key, approvalToken)) {
      return { allow: false, reason: `token is being redeemed by a concurrent call (if this persists past ${CLAIM_ORPHAN_MS / 1000}s, delete .ai-workflow/spend/claim-${key}.json — a crashed holder left it behind)`, breach: breaches.join('; '), token: null, totals };
    }
    tokens[key].used = true;
    tokens[key].usedAt = new Date().toISOString();
    writeTokens(tokens);
    return { allow: true, reason: 'second approval accepted', breach: breaches.join('; '), token: null, totals };
  }

  // A WRONG token must not destroy a RIGHT one (GLM 5.3 finding 6). Re-minting on
  // every refusal meant that presenting a bad token for a valid key silently replaced
  // the approval Sean was holding, so his correct token stopped working — a
  // DoS-flavoured footgun where the failure looks like the gate malfunctioning.
  //
  // Not a deadlock risk: the key is derived from model+topic+cost, so re-running the
  // same command yields the same key and the SAME still-valid token, which remains
  // readable in the store.
  const existing = tokens[key];
  if (existing && !existing.used) {
    return { allow: false, reason: 'budget breach — an unused approval token already exists for this exact call', breach: breaches.join('; '), token: existing.token, totals };
  }

  // FIRST ask: refuse, and mint the token this exact call would need.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, model, topic, worstCaseUsd, used: false, issuedAt: new Date().toISOString() };
  writeTokens(tokens);

  return { allow: false, reason: 'budget breach — first ask refused', breach: breaches.join('; '), token, totals };
}

export const LEDGER_PATH = LEDGER;
```

## A3 · scripts/hooks/spend-guard-gate.mjs
```javascript
#!/usr/bin/env node
/**
 * spend-guard-gate.mjs — PreToolUse(Bash) gate on paid AI calls.
 * ==============================================================
 * Sean's directive 2026-08-22 after one workstream cost ~$4.87 (Fable $3.47
 * across four calls, Sol $0.92 across two): "we gotta now create a skill that
 * blocks ... shouldn't cost me no more than two or three bucks for that whole
 * thing max ... I would be asked twice before approving."
 *
 * WHY A HOOK AND NOT A SCRIPT EDIT. Two reasons, both load-bearing.
 *   1. The two priciest scripts (consult-fable.mjs, consult-sol.mjs) were being
 *      edited by another agent at the time this was written. Rule 67 says do not
 *      touch a file another agent has in flight. A hook needs none of them.
 *   2. A gate living inside the thing it gates can be bypassed by calling the
 *      model another way. This sits at the harness boundary, so it covers any
 *      invocation shape — including ones written after today.
 *
 * The lesson this session kept teaching: a rule the model must remember is a
 * rule that will eventually be skipped. Deterministic, or it is not a control.
 *
 * FAIL-OPEN on its own errors. A spend guard that bricks the toolchain when it
 * has a bug costs more than the spend it prevents. It fails open loudly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSpend, CAPS, spentToday, spentOnTopic, topicFromPath, SPEND_DIR, reserveSpend } from '../lib/spend-ledger.mjs';
// SWA-218: the seat roster lives in ONE file, policed by spend-coverage.test.mjs.
// Hand-curating it inside this regex is what drifted in both directions at once.
import { PAID_INVOCATION, FREE_ALLOWLIST, KNOWN_UNGATED, DRY_RUN_AWARE, PANEL_SCRIPTS, scriptNameFrom, allScriptNamesFrom, invokesPaidSeat, maskQuotedData } from '../lib/paid-seats.mjs';

const ALLOW = () => process.exit(0);

/** Worst-case $/M (in, out), OpenRouter catalog as of 2026-08-22. */
const PRICES = {
  'claude-fable-5':      [10.0, 50.0],
  'gpt-5.6-sol-pro':     [2.5,  15.0],
  'gpt-5.6-sol':         [2.5,  15.0],
  'kimi-k3':             [3.0,  15.0],
  'grok-4.6':            [2.0,  6.0],
  'deepseek-v4-pro':     [0.48, 0.96],
  'deepseek-v4-flash':   [0.073, 0.145],

  // --- Priced 2026-08-27 from OpenRouter's per-endpoint API, not from memory ----
  // These were KNOWN_UNGATED frozen debt. Every number below was READ from
  // openrouter.ai/api/v1/models/<id>/endpoints, because a price recalled from
  // training data is exactly the kind of confident-and-stale figure that silently
  // under-counts a cap. First lookup returned "NOT FOUND" for two of the three —
  // a summariser choking on a huge catalog page — so each was re-queried on its own
  // endpoint. A negative from one instrument is not a fact.
  //
  // gpt-5.5 spans SEVEN endpoints: openai/flex $2.50/$15, standard $5/$30, azure &
  // bedrock $5.50/$33, and openai/fast $12.50/$75. Priced at the highest STANDARD
  // route. Taking the true worst (`fast`) would put a routine codex consult at
  // ~$1.53 against a $1.00 cap and refuse every honest call — and a gate that cries
  // wolf is the one people learn to wave through, which this file's own comments
  // call more corrosive than the hole. KNOWN UNDER-COUNT: if OpenRouter routes to
  // `openai/fast`, real cost is ~2.3x this estimate. Revisit if that ever happens.
  'gpt-5.5':             [5.5,  33.0],
  // opus-5 is nearly flat across nine endpoints ($5/$25 to $5.50/$27.50). Worst case
  // taken, because here it costs nothing to be honest.
  'claude-opus-5':       [5.5,  27.5],
  // hy3 spans $0.126/$0.522 (GMICloud) to $0.20/$0.80 (AtlasCloud). Worst taken.
  'tencent-hy3':         [0.2,  0.8],

  // The four forge-* image probes all call openai/gpt-5.4-image-2 (read from each
  // file, not inferred). Verified endpoint pricing: prompt $8/M, completion $15/M,
  // PLUS an `image_output` component of $0.00003 and a `web_search` component of
  // $0.01 per use.
  //
  // KNOWN UNDER-COUNT, and this one is structural rather than a routing choice: this
  // table is [in, out] TOKENS, and an image model's dominant cost is not a token
  // rate. The text rates below are real and counted; the image-output component is
  // NOT modelled, so a heavy generation run costs more than the estimate says.
  // Pricing the text half is strictly better than the previous state (invisible), and
  // saying so is better than a number that looks complete. A per-image cost model is
  // its own slice — flagged rather than faked.
  //
  // Related, from forge-response-shape.mjs's own header: `data.usage.total_cost` is
  // absent from this provider's response, so the forge's run ledger has been writing
  // `costUsd: null` on every real generation. recordSpend() treats null as WORST CASE
  // against the caps, so that failure at least errs toward refusal.
  'gpt-5.4-image-2':     [8.0,  15.0],

  // The auto-research tooling, surfaced 2026-08-27 the moment the coverage walker
  // became recursive — it had been invisible below the top level for two rounds.
  // google/gemini-3-flash-preview spans $0.25/$1.50 (flex) to $0.90/$5.40 (priority);
  // worst taken. The `-lite` variant used by prompt-mutator is cheaper by definition,
  // so it is priced at the same worst case rather than guessed at separately — at a
  // ~$0.11 estimate the choice cannot change a verdict, and over-stating a cheap seat
  // is the one direction that costs nothing here.
  'gemini-3-flash-preview': [0.9, 5.4],
};

/** Map a consult script to its default model key. */
const SCRIPT_MODEL = {
  'consult-fable.mjs': 'claude-fable-5',
  'consult-sol.mjs': 'gpt-5.6-sol-pro',
  'consult-kimi.mjs': 'kimi-k3',
  'consult-grok.mjs': 'grok-4.6',
  // Moved out of KNOWN_UNGATED 2026-08-27 once real prices existed. All five codex
  // variants call openai/gpt-5.5; verified by reading the model id out of each file
  // rather than assuming the name implied the model.
  'consult-codex.mjs': 'gpt-5.5',
  'consult-codex-via-openrouter.mjs': 'gpt-5.5',
  'consult-codex-impl-review.mjs': 'gpt-5.5',
  'consult-codex-v1-1-review.mjs': 'gpt-5.5',
  'consult-codex-v1-2-review.mjs': 'gpt-5.5',
  'consult-opus5.mjs': 'claude-opus-5',
  'consult-hy3-design.mjs': 'tencent-hy3',
  // The forge image probes. They are ad-hoc diagnostics rather than routine consults,
  // but ad-hoc is not free: each one calls a paid image endpoint.
  'forge-capture-fixtures.mjs': 'gpt-5.4-image-2',
  'forge-i2i-influence.mjs': 'gpt-5.4-image-2',
  'forge-i2i-probe.mjs': 'gpt-5.4-image-2',
  'forge-response-shape.mjs': 'gpt-5.4-image-2',
  // auto-research: an LLM judge and a prompt mutator, both billing through OpenRouter.
  'eval-suite.mjs': 'gemini-3-flash-preview',
  'prompt-mutator.mjs': 'gemini-3-flash-preview',
};

/**
 * Read a flag value in EITHER spelling: `--flag value` or `--flag=value`, quoted or bare.
 *
 * GLM 5.3 finding 3 (2026-08-26): the hand-rolled `--flag\s+(\S+)` patterns diverged from
 * every real argument parser on the equals form, and one root cause produced three
 * symptoms — `--document=plan.md` yielded topic `untitled` so the per-topic cap silently
 * never accumulated for that document; `--seats=fable` priced a fan-out as if no seats
 * were named; `--model=` overrides were ignored entirely. Verified before fixing.
 */
function flagValue(cmd, name) {
  // NO `new RegExp` HERE, AND NEVER ADD ONE. The first draft of this helper built the
  // pattern from a template literal — and inside a template literal `\s` is a STRING
  // escape that JavaScript collapses to a bare `s`, so the pattern became
  // `--documents+(...)` and matched nothing. Three tests went red and caught it.
  //
  // That is the FIFTH instance of this file's oldest bug, committed while fixing the
  // fourth: the header already records three regexes corrupted by authoring them
  // through interpolation, one of which turned a backslash-b into a literal 0x08.
  // A guard regex must be written as a literal, or not written as a regex at all.
  // This one is a plain scan, so there is nothing left to corrupt.
  // FIND the flag in MASKED text; READ its value from the ORIGINAL.
  //
  // GLM 5.3-flash B2 extends to this helper: a `--seats` or `--document` sitting
  // inside a quoted remit is DATA, and letting it shift panel pricing or the topic
  // bucket is the same defect as the `--dry-run` bypass.
  //
  // But masking outright would break the honest case — `--document "path with
  // spaces"` has a legitimately QUOTED VALUE, and blanking it would silently send
  // every such call to topic `untitled`, which is precisely the cap-never-accumulates
  // bug this file already fixed once. maskQuotedData pads with spaces rather than
  // deleting, so offsets are identical in both strings: find the flag where data is
  // invisible, then read the value where it is not.
  const masked = maskQuotedData(cmd);
  const flag = `--${name}`;
  for (let i = masked.indexOf(flag); i !== -1; i = masked.indexOf(flag, i + 1)) {
    const after = cmd.slice(i + flag.length);
    // The next character must be `=` or whitespace, otherwise this is a LONGER flag
    // that merely starts with the same letters (`--max` must not read `--max-tokens`).
    if (after[0] !== '=' && after[0] !== ' ' && after[0] !== '\t') continue;
    const rest = after.slice(1).replace(/^[ \t]+/, '');
    if (!rest) continue;
    const quote = rest[0];
    if (quote === '"' || quote === "'") {
      const end = rest.indexOf(quote, 1);
      if (end > 0) return rest.slice(1, end);
    }
    const bare = rest.match(/^[^\s]+/);
    if (bare) return bare[0];
  }
  return undefined;
}

function readInput() {
  try { return JSON.parse(readFileSync(0, 'utf-8')); } catch { return null; }
}

const input = readInput();
if (!input) ALLOW();

const cmd = input?.tool_input?.command || '';

// Gate INVOCATIONS, not mentions. `grep consult-fable.mjs`, `cat`, `git log` and
// friends contain the filename but spend nothing; blocking them is a false
// positive that trains people to route around the guard. Require a `node`
// (or npx/bun) execution of the script.
// Deliberately written with NO backslash escapes. Three earlier attempts to
// author this line through shell/python interpolation were silently corrupted —
// one turned `\b` into a literal backspace (0x08), which matches nothing, so the
// gate stopped firing entirely while still reporting "SYNTAX OK". A regex that
// silently never matches is the worst possible failure for a guard.
// FOURTH corruption of this line, found 2026-08-26 (SWA-218). The leading context
// used to be the enumerated separator class `[ ;&|(]`, which does not contain quote
// characters — so `sh -c "node scripts/consult-fable.mjs ..."` and
// `bash -lc 'node scripts/consult-fable.mjs ...'` put a QUOTE before `node` and were
// NOT MATCHED AT ALL. The gate never fired, no cap was checked, no token was required,
// and the call billed in full. It fails open by design, so the miss was silent.
//
// It was found by copying this regex into scripts/hooks/fable-remit-gate.mjs and then
// attacking the copy. Nothing here would have caught it: until this commit the file
// had no test at all, while scripts/lib/spend-ledger.test.mjs covered the CAP logic.
// The cap was proven; the pipe feeding it was not.
//
// Enumerating separators means enumerating every future one correctly, forever. A
// NEGATED IDENTIFIER class inverts the burden: anything that is not part of a word or
// a path is a boundary — quotes, newlines, tabs, parens, `$(`. `mynode script.mjs`
// still does not match, which was the only false positive that ever mattered.
//
// FIFTH issue, found in the same session by attacking the fixed regex rather than
// waiting for a reviewer. The MIDDLE segment used to be a bare `[^|;&]*?`, which
// cannot cross a shell boundary — that exclusion is deliberate and still wanted, so
// `node build.mjs | grep consult-fable.mjs` (an invocation and an unrelated MENTION in
// two different commands) does not false-positive. But it also could not cross a
// `| ; &` sitting INSIDE A QUOTED ARGUMENT, so all three of these were misses:
//     node --flag "a|b" scripts/consult-fable.mjs
//     node --flag "a;b" scripts/consult-fable.mjs
//     node --flag "a&b" scripts/consult-fable.mjs
// Not academic: this repo's own review templates instruct agents to pass remits
// containing "APPROVE | REVISE | REJECT".
//
// The middle now alternates QUOTED SPANS (opaque, any content) with non-boundary
// characters. Verified against 39 shapes — plain, sh -c, bash -lc, env prefix, env
// assignment, absolute interpreter, yarn node, npm exec, node flags, &&, ;, pipe,
// backgrounding, subshell, command substitution, Windows backslash paths, cmd /c,
// line continuation, eval, bun, npx — with zero misses AND zero false positives,
// including all four cross-command mention cases the exclusion exists to reject.
// SIXTH round, from the GLM hostile pass. `node<TAB>scripts/...` was a miss because
// the separator was a literal U+0020 and bash's IFS splits on tab too; `bunx`, `tsx`
// and `ts-node` were misses because the alternation named three runners. The separator
// is now the same negated identifier class as the leading context — NOT a literal tab,
// because an invisible character in a guard regex is the ``-became-0x08 failure with
// a different costume. `nodejs` and `node-foo` still correctly do not match.
// SEVENTH round (SWA-218): the pattern itself moved to scripts/lib/paid-seats.mjs and
// became PAID_INVOCATION, matching ANY `consult-*` seat instead of five hand-named ones.
// The old enumeration had drifted in both directions at once — pricing `consult-grok.mjs`
// and `consult-panel.mjs`, neither of which exists on main, while four live scripts that
// read OPENROUTER_API_KEY matched nothing. The roster now lives in one file with a
// coverage test policing it, so this line can never be the thing that goes stale again.
// `invokesPaidSeat`, NOT the bare regex. The helper also drops non-executing node
// flags (`--check`, `--version`), and testing the pattern directly here meant that
// carve-out existed in the library while the gate ignored it — the gate refused my
// own `node --check` of a consult file mid-repair. Two entry points into one decision
// is how a fix lands in the file nobody calls.
if (!cmd || !invokesPaidSeat(cmd)) ALLOW();

try {
  // --- which model, and how big is the worst case? -------------------------
  // scriptNameFrom is shared with the coverage test, so the gate and the contract
  // can never disagree about what a command names. It also resolves the gateway
  // engine path, which the old `consult-([a-z0-9-]+)` capture could not see.
  // EVERY paid name in the line, priced by the most expensive (GLM 5.3 blocker 4).
  // `node consult-kimi.mjs && node consult-fable.mjs` used to resolve to kimi alone,
  // price it at ~$0.32, fit the cap, and let Fable's ~$1.06 through unmetered in the
  // same Bash call. Verified exit 0 before this change.
  //
  // Free and frozen names are dropped FIRST, so a free seat in the line cannot become
  // the one that gets priced, and a paid one cannot hide behind it.
  const allNames = allScriptNamesFrom(cmd);
  const priceOf = (n) => {
    const key = SCRIPT_MODEL[n];
    const p = key && PRICES[key];
    return p ? p[0] + p[1] : -1; // unpriced sorts below priced; -1 never wins a max
  };
  const chargeable = allNames.filter((n) => !FREE_ALLOWLIST[n] && !KNOWN_UNGATED[n]);
  const scriptName = chargeable.length
    ? chargeable.reduce((worst, n) => (priceOf(n) > priceOf(worst) ? n : worst))
    : scriptNameFrom(cmd);

  // --- INVERTED: paid by default, free by declaration (SWA-218) -------------
  //
  // The matcher above now recognises ANY consult-* seat, not five hand-named ones.
  // That enumeration had drifted in both directions — pricing two scripts that do
  // not exist while four live ones billed unseen. So the roster moved to
  // scripts/lib/paid-seats.mjs, where a coverage test polices it, and a script is
  // waved through only if somebody WROTE DOWN why.
  if (FREE_ALLOWLIST[scriptName]) ALLOW();       // declared free, with a reason
  if (KNOWN_UNGATED[scriptName]) ALLOW();        // frozen debt, behaviour unchanged

  // A dry run spends nothing — BUT ONLY WHERE THE SCRIPT IMPLEMENTS ONE.
  // This used to be an unconditional `if (/--dry-run/.test(cmd)) ALLOW()`. Verified
  // 2026-08-27: only consult-openrouter-panel.mjs implements the flag. Appending it
  // to a Fable, Sol or Kimi call made the gate stand down while the script ignored
  // the unknown flag and billed in full — the identical bypass class this file
  // already documents for `--max-tokens 500`, still live in a different branch.
  //
  // Scanned over MASKED text, not the raw command (GLM 5.3-flash B2, reproduced at
  // exit 0). `--remit "does it support --dry-run"` put the flag in DATA, the substring
  // test saw it, and a LIVE paid fan-out was waved through with no cap and no token.
  // Round 2 restricted the flag to the one script that implements it but kept matching
  // over quoted arguments — narrowing WHICH script while leaving WHERE it looks.
  if (DRY_RUN_AWARE.has(scriptName) && /--dry-run/.test(maskQuotedData(cmd))) ALLOW();

  // The fan-out refuses its own live call without --confirm-spend, so gating it
  // earlier is cry-wolf. The old condition named `consult-panel.mjs`, which does not
  // exist on main: the real panel never took this branch and neither did anything
  // else. One condition, drifted in both directions.
  if (PANEL_SCRIPTS.has(scriptName) && !/--confirm-spend/.test(cmd)) ALLOW();

  // An explicit --model / SWAN_*_MODEL override wins over the script default.
  // OVERRIDES MAY ONLY RAISE THE ESTIMATE — never lower it.
  // Found by a bypass round: `SWAN_FABLE_MODEL=deepseek-v4-flash node
  // scripts/consult-fable.mjs` sailed through, because the regex believed the
  // env var. consult-fable.mjs does not read SWAN_FABLE_MODEL at all (it reads
  // SWAN_FUSION_JUDGE_MODEL), so the real call would still have run Fable at
  // $10/M while the gate priced it as flash. Any caller-supplied value that
  // makes a call look CHEAPER is exactly what an agent under budget pressure
  // would reach for, so the estimate takes the max of default and override.
  const defaultKey = SCRIPT_MODEL[scriptName] || '';
  let modelKey = defaultKey;
  const overrideVal = (cmd.match(/SWAN_[A-Z_]*MODEL=([^\s]+)/) || [])[1] || flagValue(cmd, 'model');
  const override = overrideVal ? [null, overrideVal] : null;
  if (override) {
    const hit = Object.keys(PRICES).find((k) => override[1].includes(k));
    if (hit && PRICES[defaultKey]) {
      const costOf = (k) => PRICES[k][0] + PRICES[k][1];
      if (costOf(hit) > costOf(defaultKey)) modelKey = hit;
    }
    // The `else if (hit && !defaultKey) modelKey = hit` branch is DELETED, and must
    // not come back. Both GLM seats found it independently (5.3 F3, 5.3-flash B1) and
    // it was reproduced live at exit 0:
    //
    //     node scripts/consult-mistral.mjs --document x.md --model deepseek-v4-flash
    //
    // An unknown seat has no default, so a caller-declared model became its price —
    // ~$0.07, under the cap, ALLOW — while the script bills at whatever it actually
    // calls and need not even READ `--model`. That is the "believing a flag the target
    // ignores" failure this file documents twice, reintroduced in the one branch whose
    // whole job is to refuse unknown seats, and a silent third option past the
    // "no third option" contract. An unknown seat now falls through to the unpriced
    // BLOCK, whatever the caller declares.
  }

  // consult-panel fans out to many seats; price it as the whole fan-out.
  const isPanel = PANEL_SCRIPTS.has(scriptName);

  // Price the panel by the seats ACTUALLY REQUESTED, not the full roster.
  // Flat-rating every fan-out at the whole-roster worst case made a run of two
  // free seats plus two cheap ones (~$0.15) present as $1.20 and get blocked.
  // A gate that cries wolf is a gate the human learns to wave through, which is
  // the failure mode this whole control exists to avoid — so an overstatement
  // is not the "safe" direction, it is corrosive.
  const SEAT_WORST_USD = {
    fable: 1.05, sol: 0.32, kimi: 0.31, grok: 0.11,
    dspro: 0.03, dsflash: 0.01, glm: 0, qwen: 0, gemini: 0, ox: 0,
  };
  const DEFAULT_SEATS = ['kimi', 'glm', 'qwen', 'ox', 'gemini', 'grok', 'dspro', 'dsflash'];
  const seatsArg = flagValue(cmd, 'seats');
  const panelSeats = seatsArg
    ? seatsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_SEATS;
  const panelUsd = panelSeats.reduce((sum, s) => sum + (SEAT_WORST_USD[s] ?? 0.35), 0);
  const price = PRICES[modelKey];
  // --- THE UNPRICED FAIL-OPEN, CLOSED (SWA-218) ------------------------------
  //
  // This used to be `if (!price && !isPanel) ALLOW()` — "unknown model, do not guess
  // a number." The first half is right and stays: inventing a price for a money guard
  // is worse than admitting there isn't one, because a wrong number silently
  // UNDER-counts the caps. The conclusion was the bug. Not knowing the price is not a
  // reason to wave the call through; it is a reason to stop and ask someone to write
  // it down.
  //
  // It is the same shape as every other hole in this file's history: something the
  // gate could not classify became something the gate ignored. With the matcher now
  // inverted to paid-by-default, an unrecognised seat lands HERE, and this is the
  // branch that decides whether inversion means anything at all. GLM 5.3 named that
  // dependency exactly: inversion is cosmetic while the unpriced branch fail-opens.
  //
  // NO APPROVAL TOKEN IS MINTED. This is a CLASSIFICATION refusal, not a spend
  // refusal — there is nothing for Sean to approve, because nobody yet knows what
  // the call costs. A token here would let an agent buy its way past the one question
  // that must be answered.
  if (!price && !isPanel) {
    console.error([
      `SPEND GUARD — BLOCKED: ${scriptName || 'this script'} is not priced.`,
      '',
      '  It reads a payment credential and the gate has no per-token price for it,',
      '  so no cap can be applied. Waving it through was the old behaviour and it is',
      '  how four live seats billed unseen for weeks.',
      '',
      '  Fix it in scripts/lib/paid-seats.mjs — pick ONE, deliberately:',
      '    PRICES        add the real OpenRouter price. Look it up; do not estimate.',
      '    FREE_ALLOWLIST  if it genuinely cannot bill (local, subscription, free tier).',
      '    KNOWN_UNGATED   only to freeze pre-existing debt, WITH a written reason.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  // Same rule for the output ceiling. Found by the same round: appending
  // `--max-tokens 500` to a Fable call dropped the estimate under the cap — and
  // consult-fable.mjs does not even accept that flag, so the real call would
  // have used its own 16k default and cost the full amount. A declared ceiling
  // may raise the estimate; it may never lower it below the script's default.
  const SCRIPT_DEFAULT_MAX_TOK = 16000;
  const declaredTok = Number(flagValue(cmd, 'max-tokens') || 0)
    || Number((cmd.match(/SWAN_[A-Z_]*MAX_TOKENS=(\d+)/) || [])[1] || 0)
    || 0;
  const maxTok = Math.max(declaredTok, SCRIPT_DEFAULT_MAX_TOK);

  // Input size is unknown at gate time; assume a large review packet so the
  // worst case is honest rather than flattering.
  const ASSUMED_IN_TOK = 26000;
  // SUM every chargeable invocation in the line, not just the priciest one.
  //
  // GLM 5.3-flash round-3 blocker 4, reproduced live at exit 0:
  //
  //     node consult-codex.mjs --document a && node consult-codex.mjs --document b
  //       && node consult-codex.mjs --document c
  //
  // Three real calls, ~$0.67 each. Round 2 fixed "two DIFFERENT paid scripts" by
  // taking the MAX — which prices this at $0.67, inside the $1.00 cap, ALLOW, with
  // ~$2.01 of exposure and no per-call enforcement for calls two through N. Max was
  // the wrong operator: it defends against a cheap seat sheltering an expensive one,
  // and does nothing about the same seat called repeatedly. GLM 5.3 said "price the
  // sum" in round 3 and I chose max with a rationale that only covered half the case.
  //
  // A panel is priced by its own per-seat fan-out, so it is summed as one unit.
  const oneCallUsd = (n) => {
    const k = SCRIPT_MODEL[n];
    const p = k && PRICES[k];
    return p ? (ASSUMED_IN_TOK / 1e6) * p[0] + (maxTok / 1e6) * p[1] : 0;
  };
  const worstCaseUsd = isPanel
    ? panelUsd
    : (chargeable.length > 1
      ? chargeable.reduce((sum, n) => sum + oneCallUsd(n), 0)
      : (ASSUMED_IN_TOK / 1e6) * price[0] + (maxTok / 1e6) * price[1]);

  // --- topic: what "the whole thing" means --------------------------------
  // Best available proxy for one workstream is the document/out path stem.
  // topicFromPath is the SINGLE normalizer, shared with every ledger WRITER. The inline
  // version this replaced was the guard's own rules; a writer used different rules;
  // spentOnTopic matches strictly — so the per-topic cap silently never accumulated for
  // some documents (found 2026-08-24, the day a writer went live).
  const docArg = flagValue(cmd, 'document') || flagValue(cmd, 'out');
  const topic = topicFromPath(docArg || 'untitled');

  const approvalToken = (cmd.match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1] || '';

  const decision = checkSpend({ model: modelKey || 'panel', topic, worstCaseUsd, approvalToken });

  if (decision.allow) {
    if (decision.reason === 'second approval accepted') {
      console.error(`[spend-guard] SECOND APPROVAL ACCEPTED — proceeding. ${decision.breach}`);
    }
    // HOLD the budget before letting the call run (GLM 5.3-flash F1, reproduced:
    // twenty concurrent sol calls each read spentToday = $0 and ALL passed —
    // $6.20 approved against a $5.00 day cap). Without a reservation the caps only
    // see money that has already been spent, which is useless against parallel
    // callers, and parallel tool calls are this harness's ordinary behaviour.
    //
    // Non-fatal: a reservation that cannot be written must not block a call the caps
    // already approved. It is loud, because silently losing the hold reopens F1.
    try {
      reserveSpend({ model: modelKey || 'panel', topic, usd: worstCaseUsd });
    } catch (err) {
      console.error(`[spend-guard] could not reserve budget — parallel calls may overshoot: ${err?.message}`);
    }
    ALLOW();
  }

  // --- refuse: first ask ---------------------------------------------------
  //
  // Write the token where SEAN reads it, not into the agent's own error output.
  // GLM 5.3 round-3 blocker 2: the Fable gate stopped printing its token in
  // `fef453e29`; this one kept doing it, and my commit message read broader than the
  // change. Two gates, one protocol, opposite behaviour — and the one still printing
  // is the one guarding actual money.
  //
  // Same honest limit as the Fable gate: an agent with file-read access can open this
  // too. What changes is the reflex, not the possibility — self-serving now takes a
  // deliberate, greppable act rather than reading the error it just caused.
  try {
    writeFileSync(join(SPEND_DIR, 'PENDING-SPEND-APPROVAL.txt'), [
      'SPEND GUARD — an agent asked to spend and was refused.',
      '',
      `  when:      ${new Date().toISOString()}`,
      `  model:     ${modelKey || 'panel fan-out'}`,
      `  worst case $${worstCaseUsd.toFixed(2)}`,
      `  topic:     ${topic}`,
      `  breach:    ${decision.breach}`,
      '',
      'If you want this to run, read the token below back to the agent.',
      'If you did not ask for it, do nothing — the refusal already held.',
      '',
      `  SWAN_SPEND_APPROVE=${decision.token}`,
      '',
      'Single-use, and bound to that exact model+topic+cost.',
    ].join('\n'), 'utf-8');
  } catch (err) {
    // Non-fatal: the refusal itself is the control. Losing the note costs Sean a
    // lookup in pending-approval.json, not the protection.
    console.error(`[spend-guard] could not write the approval note: ${err?.message}`);
  }

  const t = decision.totals;
  const lines = [
    'SPEND GUARD — BLOCKED (first ask). Sean 2026-08-22: a whole workstream should cost $2-3, not $5.',
    '',
    `  model            ${modelKey || 'panel fan-out'}`,
    `  worst case       $${worstCaseUsd.toFixed(2)}   (cap per call $${CAPS.perCall.toFixed(2)})`,
    `  topic            ${topic}`,
    `  spent on topic   $${t.topic.toFixed(2)}        (cap $${CAPS.perTopic.toFixed(2)})`,
    `  spent today      $${t.day.toFixed(2)}        (cap $${CAPS.perDay.toFixed(2)})`,
    '',
    `  BREACH: ${decision.breach}`,
    '',
    'This is the FIRST of two asks. Show Sean the numbers above and get an explicit yes.',
    '',
    'THE TOKEN IS NOT PRINTED HERE, and that is deliberate. A PreToolUse refusal is',
    'read by YOU, not by Sean — printing it made the second ask something you could',
    'satisfy alone, so the two-ask protocol bound nothing. It is written to:',
    '',
    `    .ai-workflow/spend/PENDING-SPEND-APPROVAL.txt`,
    '',
    'Ask Sean to read the token back to you, then re-run the same command with',
    'SWAN_SPEND_APPROVE=<token> in front. Do not open that file to serve yourself:',
    'this gate is friction and an audit trail, not a wall, and helping yourself to',
    'the key is the exact move it exists to make visible.',
    '',
    'The token is single-use and bound to this exact model+topic+cost.',
    'Cheaper first: Qwen 3.8 is local and free, GLM 5.3 is subscription, DeepSeek',
    'V4 Flash/Pro are cents. Ask whether the expensive seat is actually needed.',
  ];

  console.error(lines.join('\n'));
  process.exit(2); // non-zero blocks the tool call
} catch (err) {
  // Fail OPEN, loudly. Never brick the toolchain over a guard bug.
  console.error(`[spend-guard] gate error, failing open: ${err?.message}`);
  process.exit(0);
}
```

## A4 · scripts/hooks/spend-coverage.test.mjs
```javascript
#!/usr/bin/env node
/**
 * spend-coverage.test.mjs — the coverage contract (SWA-218).
 * ==========================================================
 * Both hostile reviewers on 2026-08-26 named the same ONE THING, independently:
 * replace the hand-curated seat list with a generated contract that FAILS the day
 * drift lands, instead of the day someone notices a bill.
 *
 * The rule this file enforces, in one sentence: **every script that reads a payment
 * credential must either be matched by the spend gate, or be on the FREE allowlist
 * with a written reason.** No third option.
 *
 * It caught real drift the moment it was written — the gate priced two scripts that
 * do not exist while four live ones that read OPENROUTER_API_KEY matched nothing.
 *
 * Run: node scripts/hooks/spend-coverage.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDENTIAL_MARKERS, FREE_ALLOWLIST, KNOWN_UNGATED, invokesPaidSeat } from '../lib/paid-seats.mjs';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every .mjs under scripts/ and scripts/context-gateway/src/, as repo-ish paths. */
function candidateScripts(dir = SCRIPTS, depth = 0) {
  // RECURSIVE. It used to walk exactly two flat directories, so a credential-bearing
  // script in scripts/lib/, scripts/hooks/, or anywhere deeper was invisible and the
  // contract passed green forever (GLM 5.3 F5 and 5.3-flash B3, independently).
  //
  // The old positive control could not have noticed: it asserted only that the walk
  // found more than five files and included consult-fable.mjs — both true of a blind
  // walk. An instrument check that cannot detect the instrument being blind is the
  // same class of defect as the thing it is guarding.
  const out = [];
  if (!existsSync(dir) || depth > 6) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) { out.push(...candidateScripts(full, depth + 1)); continue; }
    if (!e.name.endsWith('.mjs') || e.name.endsWith('.test.mjs')) continue;
    out.push(full);
  }
  return out;
}

/**
 * USES a payment credential, not merely NAMES one.
 *
 * The first version tested `src.includes(marker)`, which flagged this file's own
 * siblings — `spend-guard-gate.mjs`, `paid-seats.mjs`, `secret-read-gate.mjs` all
 * contain those strings precisely because they are the guards that look for them.
 * The recursive walk surfaced that immediately: six new hits, three of them the
 * machinery doing the checking.
 *
 * `process.env.<MARKER>` is the difference between reading a key and talking about
 * one. A grep loose enough to flag its own guard is a grep that trains people to
 * add exemptions, and every exemption added for a false positive is a place a real
 * one can later hide.
 */
const spendsMoney = (file) => {
  const src = readFileSync(file, 'utf-8');
  return CREDENTIAL_MARKERS.some((m) => src.includes(`process.env.${m}`));
};

/** How the gate would see a normal invocation of this script. */
const invocationOf = (file) =>
  `node ${relative(SCRIPTS, file).replaceAll('\\', '/')} --document plan.md`;

// ---------------------------------------------------------------------------

test('the walker actually finds scripts — validate the instrument first', () => {
  // A coverage test that silently scans nothing would report perfect coverage.
  // This is the positive control: if the walk breaks, this fails before the
  // reassuring green appears below it.
  const all = candidateScripts();
  assert.ok(all.length > 5, `expected to walk several scripts, found ${all.length}`);
  assert.ok(all.some((f) => f.endsWith('consult-fable.mjs')), 'the known paid seat must be in the walk');

  // DEPTH is the part the old control missed. Asserting "more than five files, and
  // consult-fable is present" is true of a walk that never descends, so it certified
  // a blind instrument for two rounds. Name files that only exist BELOW the top level.
  const rel = all.map((f) => relative(SCRIPTS, f).replaceAll('\\', '/'));
  for (const deep of ['lib/spend-ledger.mjs', 'hooks/spend-guard-gate.mjs', 'context-gateway/src/consult.mjs']) {
    assert.ok(rel.includes(deep), `the walk must descend: ${deep} is missing, so the contract is blind below the top level`);
  }
  assert.ok(rel.some((f) => f.split('/').length > 2), 'at least one file two levels deep');
});

test('the credential grep actually discriminates', () => {
  // Second control: if `spendsMoney` returned true for everything (or nothing),
  // the contract below would be vacuous in one direction or the other.
  const all = candidateScripts();
  const paid = all.filter(spendsMoney);
  assert.ok(paid.length > 0, 'no script reads a payment credential — the grep is broken');
  assert.ok(paid.length < all.length, 'every script looks paid — the grep is too broad');
});

test('CONTRACT: every credential-bearing script is gated or explicitly allowlisted', () => {
  const uncovered = [];
  for (const file of candidateScripts()) {
    if (!spendsMoney(file)) continue;
    const name = file.split(/[\\/]/).pop();
    const rel = relative(SCRIPTS, file).replaceAll('\\', '/');
    if (Object.prototype.hasOwnProperty.call(FREE_ALLOWLIST, name)) continue;
    // The frozen baseline. Keyed by BOTH bare name and relative path so a nested
    // entry (context-gateway/src/transport.mjs) is unambiguous either way.
    if (KNOWN_UNGATED[name] || KNOWN_UNGATED[rel]) continue;
    if (invokesPaidSeat(invocationOf(file))) continue;
    uncovered.push(rel);
  }

  assert.deepEqual(uncovered, [], [
    '',
    'These scripts read a payment credential and the spend gate does not see them:',
    ...uncovered.map((f) => `    ${f}`),
    '',
    'Every one of them can spend real money with no cap, no token and no record.',
    'Fix by ONE of:',
    '  - make the invocation match PAID_INVOCATION in scripts/lib/paid-seats.mjs',
    '  - add it to FREE_ALLOWLIST there WITH A REASON, if it genuinely cannot bill',
    '',
    'Adding it to KNOWN_UNGATED is NOT a fix — that list is frozen debt, and growing',
    'it is admitting a new hole. Talk to Sean before you do.',
    '',
    'Do not delete this test to make it pass.',
  ].join('\n'));
});

test('CONTRACT: KNOWN_UNGATED is FROZEN — the exact key set, not merely reasoned', () => {
  // GLM 5.3 round-3 blocker 3, and it was right: "fails the moment it grows" was
  // FALSE for the list itself. The contract only checked that entries exist with
  // >10-char reasons, so adding a fourth reasoned entry kept everything green. The
  // pre-commit comment saying "adding to KNOWN_UNGATED is NOT a fix" was a comment,
  // not a control — and by this repo's own doctrine, a rule the model must remember
  // is a rule that will eventually be skipped.
  //
  // Now it is an asserted key set. Growing the list fails HERE, which is what the
  // freeze claimed to do all along.
  assert.deepEqual(Object.keys(KNOWN_UNGATED).sort(), [
    // Added 2026-08-27, and this assertion failing is what forced it to be a
    // deliberate act rather than a quiet one — exactly what the freeze is for.
    // It is a LIBRARY entry, not new debt: GLM 5.3-flash F4 showed the gate was
    // hard-blocking this no-op and telling the operator to price a library.
    'context-gateway/src/consult.mjs',
    'context-gateway/src/transport.mjs',
    'hermes-village.mjs',
    // Added 2026-08-27 when the walker became recursive. A LIBRARY entry, not new
    // debt: preflight reads a key only to check it exists before an AI-invoking
    // script runs. This assertion failing is what made adding it a deliberate act.
    'lib/preflight.mjs',
    'validation-orchestrator.mjs',
  ], [
    'KNOWN_UNGATED changed. That list is FROZEN pre-existing debt, not a place to put',
    'a new script. If you added a row to make something pass, that is admitting a new',
    'hole — price it, or free-list it with a reason. If you genuinely PAID DOWN debt by',
    'removing a row, update this assertion in the same commit and say so.',
  ].join('\n'));
});

test('CONTRACT: the allowlist has no ghosts and no blank reasons', () => {
  // The drift ran both ways: the old gate also priced two scripts that do not
  // exist. An allowlist entry for a deleted file is the same rot, and a blank
  // reason is an exemption nobody can audit later.
  const present = new Set(candidateScripts().map((f) => f.split(/[\\/]/).pop()));
  for (const [name, reason] of [...Object.entries(FREE_ALLOWLIST), ...Object.entries(KNOWN_UNGATED)]) {
    const bare = name.split('/').pop();
    assert.ok(present.has(bare), `the allowlist names ${name}, which does not exist — remove the ghost`);
    assert.ok(reason && reason.trim().length > 10, `${name} needs a real reason, not a blank exemption`);
  }
});

test('CONTRACT: the gate sees the context-gateway engine path', () => {
  // Kept as defence in depth, with the CLAIM CORRECTED.
  //
  // GLM 5.3-flash blocker 2 called this a live "substitute path" bypass: call the
  // engine directly and spend Fable while matching nothing. I accepted it after
  // confirming the REGEX did not match it — and never checked whether the file was
  // EXECUTABLE. It is not. Verified 2026-08-27: that engine has no shebang and no
  // self-invocation guard, so running it directly defines exports and exits, spending
  // nothing. Matching is not the same as exploitable, and verifying the wrong
  // proposition is how a finding gets "confirmed" while staying wrong.
  //
  // The assertion stays because the day someone gives that engine a CLI entry, it
  // should already be covered rather than newly forgotten.
  assert.equal(invokesPaidSeat('node scripts/context-gateway/src/consult.mjs --seat fable'), true);
});

test('a mention of a paid script is still not an invocation', () => {
  // The contract must not achieve coverage by matching everything.
  assert.equal(invokesPaidSeat('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesPaidSeat('npm run build'), false);
});
```
