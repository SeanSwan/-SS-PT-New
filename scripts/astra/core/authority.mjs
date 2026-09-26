/**
 * authority.mjs — `T-P-01`'s AUTHORITY half (`AC5.4`), and §6.2 of the interface as DATA.
 *
 * THE REQUIREMENT, VERBATIM: *"no actor enables a REFUSED lane or spec mode"*. §6.2 adds
 * the sentence that makes it a rule rather than a preference: *"Activation requires signed
 * approval outside this surface."*
 *
 * WHY THIS IS A TRY-RATHER-THAN-A-STATEMENT MODULE. The cheap implementation of `AC5.4` is
 * a comment, or a test that greps the pane for an "enable" button. Both are the defect this
 * engagement keeps finding: a claim that cannot fail. A pane with no enable button proves
 * nothing about the MCP server, the CLI, or the next slice that adds a route. So the matrix
 * is data, `attemptEnable()` is the operation every consumer would have to go through, and
 * `auditEnable()` runs EVERY actor against EVERY enable-relevant target and reports what
 * actually happened. The claim under test is the resulting `enabled: []` — an empty list
 * produced by trying, not a sentence produced by believing.
 *
 * THE REFUSAL IS UNIFORM ON PURPOSE. A REFUSED lane is refused to Sean too. That is not an
 * oversight and not a missing feature: `corroborate`, `adjudicate` and `emit-vault` are
 * gated on a SIGNED authority adapter that does not exist, and a console that could switch
 * one on would be a console that can mint a claim into canon without review. The matrix's
 * `propose` is the honest alternative, and `propose` is NOT enable — it returns a different
 * code and names the artifact that has to be signed.
 *
 * `INCONCLUSIVE` IS REFUSED TOO, AND THAT IS THE SUBTLE ROW. A lane whose status could not
 * be sourced (`capabilities()` degrades it) is refused because nobody knows what would be
 * switched on. Treating "unknown" as "probably fine" is how a fail-closed guard becomes a
 * fail-open one.
 */

import { capabilities } from './capabilities.mjs';

/** The five actors §6.2 names. Order is the table's order. */
export const ACTORS = Object.freeze([
  'sean', 'astra-surface', 'astra-mcp', 'builder-agent', 'reviewer-agent',
]);

/** The eight columns §6.2 names. */
export const ACTIONS = Object.freeze([
  'read-corpus', 'read-tuning', 'write-tuning', 'compile',
  'preview-spend', 'write-taste', 'change-canon', 'enable-spec',
]);

// The cell vocabulary. ASCII only: these values are compared, printed and asserted, and a
// typographic arrow that differs between editors is a comparison that fails on CI.
export const YES = 'yes';
export const NO = 'no';
export const STAGED_COMMIT = 'staged-commit';
export const CONFIRM_REQUIRED = 'confirm-required';
export const PROBE_ONLY = 'probe-only';
export const PROPOSE = 'propose';

/**
 * §6.2, transcribed. Every cell is one of the six values above.
 *
 * `change-canon` and `enable-spec` are the two columns `AC5.4` is about, and note that the
 * STRONGEST cell either column contains is `propose`. No actor has `yes` there — so the
 * rule is not "Astra is more restricted than Sean", it is "this surface cannot enable these
 * for anybody".
 */
export const AUTHORITY_MATRIX = Object.freeze({
  'sean': Object.freeze({
    'read-corpus': YES, 'read-tuning': YES, 'write-tuning': YES, 'compile': YES,
    'preview-spend': YES, 'write-taste': PROBE_ONLY, 'change-canon': PROPOSE, 'enable-spec': PROPOSE,
  }),
  'astra-surface': Object.freeze({
    'read-corpus': YES, 'read-tuning': YES, 'write-tuning': STAGED_COMMIT, 'compile': YES,
    'preview-spend': CONFIRM_REQUIRED, 'write-taste': NO, 'change-canon': NO, 'enable-spec': NO,
  }),
  'astra-mcp': Object.freeze({
    'read-corpus': YES, 'read-tuning': YES, 'write-tuning': NO, 'compile': YES,
    'preview-spend': NO, 'write-taste': NO, 'change-canon': NO, 'enable-spec': NO,
  }),
  'builder-agent': Object.freeze({
    'read-corpus': YES, 'read-tuning': YES, 'write-tuning': NO, 'compile': YES,
    'preview-spend': NO, 'write-taste': NO, 'change-canon': PROPOSE, 'enable-spec': PROPOSE,
  }),
  'reviewer-agent': Object.freeze({
    'read-corpus': YES, 'read-tuning': YES, 'write-tuning': NO, 'compile': YES,
    'preview-spend': NO, 'write-taste': NO, 'change-canon': NO, 'enable-spec': NO,
  }),
});

/** One actor's cell. An unknown actor or action is `null`, never a default `yes`. */
export function authorityFor(actor, action) {
  return AUTHORITY_MATRIX[actor]?.[action] ?? null;
}

/**
 * The targets `AC5.4` is about: every lane, plus spec mode.
 *
 * DERIVED FROM THE LIVE BOARD, not from a list here. A hand-kept list of targets would stop
 * covering the lane someone adds next week — and a guard whose target set is stale is a
 * guard that reports a clean sweep of a smaller world.
 */
export function enableTargets(board = capabilities()) {
  return board.map((row) => row.lane);
}

/**
 * Attempt to enable a lane or spec mode. THE OPERATION `AC5.4` FORBIDS.
 *
 * Returns `{ ok: false, code, message, … }` for every input that exists, because the rule
 * is that this cannot succeed. `ok: true` is reachable only by a target that is ALREADY
 * active — and even then `enabled: false`, because enabling something already on did not
 * enable anything, and reporting otherwise would be a false claim about a control.
 *
 * @param {{actor: string, target: string, board?: Array}} args
 */
export function attemptEnable({ actor, target, board = capabilities() }) {
  const base = { actor, target, enabled: false };
  if (!Object.hasOwn(AUTHORITY_MATRIX, actor)) {
    return { ...base, ok: false, code: 'E_ACTOR_UNKNOWN',
      message: `${JSON.stringify(actor)} is not an actor in §6.2, so it has no authority here.` };
  }
  const row = board.find((r) => r.lane === target);
  if (!row) {
    return { ...base, ok: false, code: 'E_TARGET_UNKNOWN',
      message: `${JSON.stringify(target)} is not a lane or mode on the board — nothing to enable.` };
  }
  // The actor's own column, reported on EVERY path so the matrix is consulted rather than
  // decorative: a caller cannot get a verdict without also being told what their authority
  // was. `propose` is the strongest value either column holds, and it is not enable.
  const authority = authorityFor(actor, 'enable-spec');

  const verdict = (code, message) => ({ ...base, ok: false, code, message, authority, laneStatus: row.status });

  if (row.status === 'REFUSED') {
    return verdict('E_LANE_REFUSED',
      `${row.lane} is REFUSED. It is gated on ${row.gatedBy ?? 'an uninstalled authority'}, and `
      + 'activation requires signed approval outside this surface. No actor enables it here.');
  }
  if (row.status === 'RETIRED') {
    return verdict('E_LANE_RETIRED',
      `${row.lane} is RETIRED — the module throws on import, so it cannot be enabled by anyone.`);
  }
  if (row.status === 'INCONCLUSIVE') {
    return verdict('E_LANE_UNSOURCED',
      `${row.lane}'s status could not be sourced (${row.reason ?? 'no marker found'}). An `
      + 'unverifiable lane is refused rather than assumed safe.');
  }
  if (row.status === 'DISABLED') {
    // Spec mode. `propose` for two actors, `no` for the rest — and NEITHER is enable.
    const alternative = authority === PROPOSE
      ? ' You may draft a proposal for Sean; a proposal does not switch it on.'
      : '';
    return verdict('E_MODE_GATED',
      `${row.lane} is DISABLED — gated on ${row.gatedBy ?? 'a config flag'}. Astra offers no `
      + `control that enables it.${alternative}`);
  }
  // ACTIVE. There is nothing to enable, and saying otherwise would claim a control acted.
  return verdict('E_ALREADY_ACTIVE',
    `${row.lane} is already ACTIVE. Nothing was enabled — this operation has no effect on it.`);
}

/**
 * THE `AC5.4` PROOF: try every actor against every target, and report what happened.
 *
 * This is the whole point of the module. `enabled` is the list of attempts that switched
 * something on, and the requirement is that it is EMPTY. Because it is produced by running
 * the matrix rather than by reading it, a new lane, a new actor or a relaxed status cannot
 * slip past: the sweep grows with the board, and `attempts` grows with it.
 *
 * `attempts` is asserted against `ACTORS.length * targets.length` in the test, so the sweep
 * cannot pass by covering a subset — the same "a count is a claim about completeness" rule
 * the rest of this repo runs on.
 */
export function auditEnable(board = capabilities()) {
  const targets = enableTargets(board);
  const attempts = [];
  for (const actor of ACTORS) {
    for (const target of targets) {
      attempts.push(attemptEnable({ actor, target, board }));
    }
  }
  return {
    attempts,
    attempted: attempts.length,
    expected: ACTORS.length * targets.length,
    // The claim. Every entry here would be a violation of `AC5.4`.
    enabled: attempts.filter((a) => a.enabled).map((a) => `${a.actor}→${a.target}`),
    // And the attempts that reached a lane that is not ACTIVE — the set the rule is about.
    refused: attempts.filter((a) => !a.enabled).length,
    byCode: attempts.reduce((acc, a) => ({ ...acc, [a.code]: (acc[a.code] ?? 0) + 1 }), {}),
  };
}

/**
 * Routes that could enable something, by name.
 *
 * `AC5.4` at the TRANSPORT layer. `attemptEnable()` forbids the operation; this checks that
 * no route was ever added that would reach one. Both are needed — a fence in the domain and
 * a scan of the door handles — and this one is cheap enough to run in the smoke suite, where
 * the route table is already in hand.
 */
export const ENABLE_ROUTE_PATTERN = /enable|activate|unrefuse|force|override-refused|spec-mode-on/i;

/** The routes in `routes` that would name an enable action. Empty is the requirement. */
export function routesThatCouldEnable(routes) {
  return routes.filter((r) => ENABLE_ROUTE_PATTERN.test(r));
}
