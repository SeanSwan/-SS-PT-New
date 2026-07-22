---
name: swan-gate
description: Validation Gate for substantial build slices (Rule 73). An INDEPENDENT validator agent writes an executable pass/fail gate.mjs BEFORE the build from the acceptance criteria; the builder never edits the gate (hash-diff enforced); failures loop back mechanically (max 3) then escalate. Converts "goal-driven execution" from discipline into machinery. Invoke via /swan-gate, "gate this", or when the orchestrator routes a Workflow build stage through gating. Not for trivial edits or doc-only slices.
---

# Swan Gate — validation before construction

**Origin:** SWA-32 / `docs/ai-workflow/AI-HANDOFF/MASTER-PROMPT-ADW-FUSION-UPGRADE-2026-07-21.md` (IndyDevDan auto-validate pattern, Fable-adapted). **Doctrine:** Rule 73.
**Why:** builders grade their own homework generously. A gate written *before* the build, by a *different* context, from the *acceptance criteria alone*, is the cheapest honest examiner we have. The gate is the contract; the build satisfies it or loops.

## When to invoke
- Any substantial build slice (same bar as Rule 61's hostile-review requirement).
- Sean says "gate this" / `/swan-gate`.
- A Workflow script's build phase (see the ready-to-copy pattern below).

**Exempt:** trivial edits, doc-only slices, pure exploration. State the exemption in closeout (`Gate Evidence: exempt — <reason>`).

## The procedure (exact — no step is optional)

**1. VALIDATOR writes the gate (before ANY build work).**
Spawn a separate validator subagent (Agent tool; `effort: high` for the validator even when the builder runs cheaper — judging is the hard job). Input: ONLY the slice's acceptance criteria + relevant file paths. Output: `.ai-workflow/gates/<task-slug>/gate.mjs`.
Before writing fresh, the validator greps `.ai-workflow/gates/` for a matching task-slug family and reuses/extends `_lib/` helpers where they exist.

**2. Gate contract (what a legal gate.mjs is):**
- Plain Node ESM. **Zero LLM calls, zero network calls to model providers, zero new dependencies, deterministic.**
- May run anything Tier-A: `tsc`, `vitest`, `node --check`, grep/file-existence/line-count checks, local HTTP probes.
- Exits `0` pass / `1` fail. Prints one `PASS:`/`FAIL:` line per check. **Every `FAIL:` line must be actionable feedback** — it becomes the builder's next prompt.
- Checks target the acceptance *criteria*, never the builder's implementation choices.

**3. BUILDER builds. The builder MUST NOT edit, rewrite, or delete the gate file.**
Enforcement is structural, not honor-system:
- Gate author and builder are **different subagent contexts** — one context never plays both roles.
- The orchestrator records `sha256(gate.mjs)` (or `git hash-object`) immediately after step 1 and re-checks it after the build. **Changed hash = the slice FAILS closeout automatically**, regardless of gate output.

**4. Orchestrator runs the gate.**
- Fail → feed the FULL gate output back to the builder as its next prompt. Loop.
- **Max 3 iterations.** Still failing → STOP. Escalate to Sean/Fable with the last gate output. Never loop forever; never quietly weaken a check to get green (that is gate-tampering by proxy).

**5. On pass — Gate Evidence.**
Paste the passing gate output into the closeout under **Gate Evidence**, with the gate path + its hash. `closeout-evidence-lock` requires this for substantial slices; a hash mismatch there = automatic REVISE.

## Workflow-tool pattern (copy-ready)

```js
export const meta = { name: 'gated-build', description: 'validator-gated build slice',
  phases: [{ title: 'Gate' }, { title: 'Build' }, { title: 'Verify' }] }
phase('Gate')
const gate = await agent(`Write .ai-workflow/gates/${SLUG}/gate.mjs per the swan-gate contract for these acceptance criteria:\n${CRITERIA}\nReturn the file path + its sha256.`, { effort: 'high', phase: 'Gate' })
phase('Build')
let feedback = ''
for (let i = 0; i < 3; i++) {
  await agent(`Build the slice. Acceptance criteria:\n${CRITERIA}\n${feedback ? `Previous gate failures to fix:\n${feedback}` : ''}\nBAN: you may not read, edit, or delete anything under .ai-workflow/gates/.`, { phase: 'Build', isolation: 'worktree' })
  const run = await agent(`Run: node .ai-workflow/gates/${SLUG}/gate.mjs — verify the gate file hash matches ${'{'}gateHash{'}'} FIRST (fail the slice if not). Return raw output + exit code.`, { effort: 'low', phase: 'Verify' })
  if (run.includes('exit 0')) break
  feedback = run
}
```

## Retention & hygiene
- `.ai-workflow/gates/*` is **gitignored** except `_lib/` (shared helpers are tracked). `coordination-prune.mjs` removes task-gate dirs idle > 30 days; `_lib/` is never pruned.
- A gate that earns reuse across 2+ slices → promote its checks into `_lib/` (Rule 73 twice-=-codify applied to gates themselves).

## Failure modes this skill exists to kill
- Builder "fixes" the gate instead of the code → hash-diff catches it; closeout REVISEs it.
- Vague criteria produce a vacuous gate → validator must refuse criteria it cannot express as executable checks and bounce the slice back to planning (that bounce is a *feature*).
- Infinite pass-chasing → the 3-loop cap converts a stuck slice into a visible escalation instead of token burn.
