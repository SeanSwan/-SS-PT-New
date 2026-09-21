/**
 * mega-blueprint-scope.mjs — the opt-in scope bound for a Mega Blueprint consult.
 * ==========================================================================
 * Its own module for the same reason the mandate is: `mega-blueprint-mandate.mjs` sat at 290
 * lines against Rule 4's 300-line cap, so this could not live there without either breaking
 * the cap or being golfed down until the measurement that justifies it was gone. The number
 * IS the justification, so it keeps its own file.
 */
/**
 * The opt-in scope bound.
 *
 * MEASURED 2026-09-20 by a CONTROLLED A/B: the same packet, same model, same effort, the only
 * variable being this flag.
 *
 *   unbounded   547,783 input tokens   520.5 s   (of a 600 s cap)
 *   --bounded    38,622 input tokens   321.9 s
 *                        14.2x fewer          1.6x faster
 *
 * An earlier figure of "18.4x / 7.5x" circulated briefly and was WRONG as a causal claim: it
 * compared two DIFFERENT packets, so it credited the bound with an effect that partly belonged
 * to the simpler question. The numbers above change one variable. Quality is retained — the
 * bounded run re-derived the same HIGH finding and added one the unbounded run missed.
 *
 * WHY. `codex exec` is an AGENT with filesystem read access, so under the mandate it hunts for
 * blueprints; each file read returns as a tool result and the conversation re-sends every turn,
 * so input compounds with exploration. Detail: `docs/ai-workflow/references/ASTRA-REVIEW-ROUTING.md` S7.
 *
 * The 1.6x wall figure matters more than it looks: 322 s sits comfortably inside the 600 s cap,
 * 520 s does not. Four dispatches died at that cap before a bounded one returned.
 *
 * DEFAULT OFF, deliberately: the hunt is what this mandate is FOR, and it caught a real HIGH
 * defect. This bounds SCOPE, never RIGOUR — both hostile reviews and the full PART A/B/C
 * contract survive, because the splitter depends on them.
 */
export const MEGA_BLUEPRINT_SCOPE_BOUND = `
=== SCOPE BOUND — ACTIVE (this call only) ===
Answer ENTIRELY from the packet below. It is the complete corpus for this consult.

Do NOT read, search, glob, list or open any file. Do not hunt for blueprints, skills,
instruction files, prior reviews or tests on disk. Do not inspect the repository.

This does NOT relax anything else. Both hostile reviews (A1 and A2) are still required, the
PART A / PART B / PART C contract is unchanged, and every required document heading must still
appear. Answer an artifact class you cannot research from the packet as
\`N/A — scope-bounded consult, no repository surface in scope\` rather than guessing at it or
going to look. A guess dressed as an artifact is worse than a declared N/A.
`;

