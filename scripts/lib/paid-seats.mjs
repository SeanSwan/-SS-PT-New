import { invokedScripts } from './shell-parse.mjs';
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
 * Does this source USE a payment credential — in any idiom, not just one?
 *
 * The detector tested exactly `process.env.<MARKER>`, and GLM 5.3 (F3) and
 * 5.3-flash (finding 7) both landed on the same consequence: a new paid script
 * written in the most ordinary modern style sails through the contract green, with
 * no failure prompting anyone to classify it. One linter-driven refactor to
 * destructuring silently empties the roster. `KNOWN_UNGATED`'s key set is frozen
 * against exactly that kind of quiet drift while the instrument reading it was not.
 *
 * WHAT IT STILL WILL NOT SEE, said plainly rather than implied by silence:
 *   - a key assembled at runtime (`process.env['OPEN' + 'ROUTER_API_KEY']`)
 *   - a key reached through a helper in another module (the delegation gap, F6)
 *   - a credential injected by a framework the source never names
 * Those need the seat-name marker the file header already records as unbuilt. This
 * closes the idioms a HONEST author would plausibly write, which is what a
 * drift-catcher is for; it is not an adversarial control and does not claim to be.
 *
 * Deliberately still narrower than `src.includes(marker)`: that flagged this file's
 * own siblings, because a guard that greps for credentials necessarily contains
 * their names. A grep loose enough to flag its own guard trains people to add
 * exemptions, and every exemption added for a false positive is a place a real one
 * can later hide.
 */
export function readsCredential(src) {
  const text = String(src || '');
  // An alias (`const env = process.env`) makes `env.MARKER` a real read.
  const aliased = /=\s*process\.env\s*[;\n]/.test(text) || /\bBun\.env\b/.test(text);
  return CREDENTIAL_MARKERS.some((m) => {
    if (text.includes(`process.env.${m}`)) return true;              // process.env.X
    if (new RegExp(`process\\.env\\s*\\[\\s*['"\`]${m}['"\`]`).test(text)) return true; // env['X']
    if (new RegExp(`Bun\\.env\\s*[.\\[]\\s*['"\`]?${m}`).test(text)) return true;       // Bun.env.X
    // `const { X, Y } = process.env` — the marker inside a destructuring pattern
    // whose right-hand side is process.env. Multiline, because prettier wraps these.
    if (new RegExp(`\\{[^{}]*\\b${m}\\b[^{}]*\\}\\s*=\\s*(process|Bun)\\.env`, 's').test(text)) return true;
    if (aliased && new RegExp(`\\benv\\s*[.\\[]\\s*['"\`]?${m}\\b`).test(text)) return true;
    return false;
  });
}

/**
 * Scripts that touch a credential but must NOT be gated, each with the reason.
 * Adding a row here is a deliberate, reviewable act — which is the entire point.
 * An empty reason is not allowed; the coverage test rejects it.
 */
export const FREE_ALLOWLIST = {
  'consult-gemini.mjs': 'Google AI Studio free tier; no OpenRouter credit consumed',
  'consult-glm.mjs': 'Z.ai coding-plan subscription — flat rate, nothing per-token to cap',

  // --- LIBRARIES, moved out of KNOWN_UNGATED 2026-08-27 (GLM 5.3 round-4 F5) ------
  // These read a credential and CANNOT BILL, which is this list's definition. They
  // sat in the frozen debt list only because that list was the only one that
  // accepted path keys — an accident of plumbing, not a judgement. Parking non-debt
  // in the debt baseline inflates the number this workstream is trying to drive to
  // zero, and makes the two real entries harder to see. Debt list: 5 -> 2.
  'lib/preflight.mjs':
    'LIBRARY. Reads a credential only to CHECK the key exists before an AI-invoking script '
    + 'runs; it makes no call of its own. Verified 2026-08-27.',
  'context-gateway/src/consult.mjs':
    'LIBRARY, not an entrypoint (verified 2026-08-27: no shebang, no self-invocation guard, so '
    + 'running it directly defines exports and exits, spending nothing). Kept keyed by PATH '
    + 'because basenaming it yields `consult.mjs`, which matched no allowlist and no price '
    + 'table — so the gate hard-BLOCKED a no-op and told the operator to price a library '
    + '(GLM 5.3-flash F4).',
  'context-gateway/src/transport.mjs':
    'LIBRARY, not an entrypoint — no shebang, no top-level invocation. Imported by '
    + 'context-gateway/src/consult.mjs, itself a library. Real spend goes through the '
    + 'consult-<seat>.mjs shims, which the gate matches. CORRECTION kept from the debt list: '
    + 'an earlier note called the gateway a live "substitute path" bypass. It is not — that '
    + 'finding was accepted after confirming the REGEX did not match it, without confirming '
    + 'the file was EXECUTABLE. Matching is not the same as exploitable.',
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
 * Which seat names count as paid. The GATE no longer pattern-matches command text —
 * `shell-parse.mjs` parses it — so this is a NAME test on an already-parsed script
 * path, not a shell matcher.
 *
 * Kept broad on purpose (`consult-*`, `forge-*`, the two auto-research entrypoints,
 * the gateway engine). Enumerating individual seats is what drifted in both
 * directions for weeks; matching the shape and letting spend-coverage.test.mjs police
 * the roster is what replaced it.
 */
const SEAT_NAME = /^(consult-[a-z0-9-]+|forge-[a-z0-9-]+|eval-suite|prompt-mutator)[.]mjs$/;

/** One key per seat. The gateway engine keeps its PATH; everything else is a basename. */
function normalizeSeatKey(path) {
  const p = String(path).split('\\').join('/');
  if (p.includes('context-gateway/src/consult.mjs')) return 'context-gateway/src/consult.mjs';
  if (p.includes('context-gateway/src/transport.mjs')) return 'context-gateway/src/transport.mjs';
  if (p.includes('lib/preflight.mjs')) return 'lib/preflight.mjs';
  return p.replace(/^.*\//, '');
}

/** True when a parsed script path is a paid seat. */
function isSeatPath(path) {
  const p = String(path).split('\\').join('/');
  if (p.includes('context-gateway/src/consult.mjs')) return true;
  return SEAT_NAME.test(p.replace(/^.*\//, ''));
}

/**
 * EVERY paid seat a command line would actually execute, in order.
 *
 * Replaced a regex + a quote-mask + two extraction helpers, all of which were
 * position-blind. Round 4 found FIVE live bypasses that were themselves created by
 * rounds 2 and 3 patching that design; the parser makes those classes not exist
 * rather than enumerating them. See shell-parse.mjs for the full account.
 */
export function allScriptNamesFrom(cmd) {
  return invokedScripts(cmd)
    .filter((s) => !s.nonExecuting && isSeatPath(s.path))
    .map((s) => normalizeSeatKey(s.path));
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
  return allScriptNamesFrom(cmd)[0] || '';
}

/** True when this command text invokes something that could spend money. */
export function invokesPaidSeat(cmd) {
  return allScriptNamesFrom(cmd).length > 0;
}

/** The argv of the seat this command prices — parsed, not scanned. */
export function seatArgsFrom(cmd) {
  const hit = invokedScripts(cmd).find((s) => !s.nonExecuting && isSeatPath(s.path));
  return hit ? hit.args : [];
}
