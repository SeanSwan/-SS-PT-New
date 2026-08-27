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
  /(?:^|[^A-Za-z0-9_-])(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?(consult-[a-z0-9-]+|forge-[a-z0-9-]+|context-gateway[/\\]src[/\\]consult)[.]mjs/;

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

/** True when this command text invokes something that could spend money. */
export function invokesPaidSeat(cmd) {
  const c = String(cmd || '');
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
export function allScriptNamesFrom(cmd) {
  const text = String(cmd || '');
  if (NON_EXECUTING.test(text)) return [];
  const global = new RegExp(PAID_INVOCATION.source, 'g');
  const names = [];
  for (const m of text.matchAll(global)) {
    if (m[1]) names.push(`${m[1].replace(/^.*[/\\]/, '')}.mjs`);
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
  const m = PAID_INVOCATION.exec(String(cmd || ''));
  if (!m) return '';
  return `${m[1].replace(/^.*[/\\]/, '')}.mjs`;
}
