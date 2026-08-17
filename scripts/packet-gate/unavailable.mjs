/**
 * unavailable.mjs — the one error class that means "the gate could not run".
 * ==========================================================================
 * Its own module so repo-io.mjs and citation.mjs can both raise it without importing each other.
 *
 * The distinction it carries is the oldest lesson in this gate: a tool that FAILED is not a check
 * that PASSED, and neither is a premise that is a phantom. Conflating the first two turned a missing
 * binary, a wrong cwd, or a safe.directory refusal into a finding about the operator's packet — a
 * false-refusal machine that trains people to bypass the gate. Every checker either answers cleanly
 * or raises this, and the CLI turns it into exit 2.
 *
 * @module packet-gate/unavailable
 */
export class GateUnavailable extends Error {}
