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
  'validation-orchestrator.mjs':
    'The paid AI Village (~13 brains). It is NOT unmetered — it carries its own hard cap via '
    + 'SWAN_VILLAGE_MAX_USD plus the Rule 16 permission gate. But that cap is SEPARATE from the '
    + 'cumulative ledger, so Village spend never counts toward the per-topic or per-day budget '
    + 'that exists precisely because four reasonable calls are what blow it. Reconciling the two '
    + 'is the single highest-value item left.',
  'hermes-village.mjs':
    'Wraps the Village runner; inherits the same separate-cap situation as validation-orchestrator.',
  'context-gateway/src/transport.mjs':
    'The gateway is network-capable module, NOT an entrypoint. It is reached through '
    + 'context-gateway/src/consult.mjs, which PAID_INVOCATION does match. Listed for the record '
    + 'so a future reader does not mistake it for an uncovered seat.',
  'forge-capture-fixtures.mjs': 'Image-forge probe. UNCLASSIFIED — needs a spend review; may bill per image.',
  'forge-i2i-influence.mjs': 'Image-forge probe. UNCLASSIFIED — needs a spend review; may bill per image.',
  'forge-i2i-probe.mjs': 'Image-forge probe. UNCLASSIFIED — needs a spend review; may bill per image.',
  'forge-response-shape.mjs': 'Image-forge probe. UNCLASSIFIED — needs a spend review; may bill per image.',
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
 * The script-name group is DELIBERATELY BROAD (`consult-[a-z0-9-]+`) plus the
 * context-gateway path. Enumerating seats is what drifted; matching the shape and
 * letting the coverage test police the roster is what replaced it.
 */
export const PAID_INVOCATION =
  /(?:^|[^A-Za-z0-9_-])(?:node|npx|bunx?|tsx|ts-node)[^A-Za-z0-9_-](?:"[^"]*"|'[^']*'|[^|;&])*?(?:consult-[a-z0-9-]+|context-gateway[/\\]src[/\\]consult)[.]mjs/;

/** True when this command text invokes something that could spend money. */
export function invokesPaidSeat(cmd) {
  return PAID_INVOCATION.test(String(cmd || ''));
}
