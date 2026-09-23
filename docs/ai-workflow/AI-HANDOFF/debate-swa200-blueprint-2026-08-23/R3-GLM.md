# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/debate-swa200-blueprint-2026-08-23/R3-PACKET.md
**Tokens:** 5892 in / 14144 out (reasoning: 13178) | total 20036
**Wall:** 177.9s

---

**Not converged — round 2's fixes left three artifacts behind. Two are mechanical, one is the pattern you predicted.**

## 1. New defects from the round 2 fixes

**The shape renumbering wasn't propagated.** The mermaid's `locked:false` branch reads "concurrent deploy raced — **shape 4**, see 7.1." Round 2's fix made that shape **3**; shape 4 is now "PRE present, POST absent." Worse: the new shape 4 has **no branch in the flowchart at all** — A3 exits on line-absent / `locked:false` / `lockVerified:false` / verified-twice. The one failure shape round 2 created is in the autopsy table but has no owner in the plan. An agent whose child migration died on the first deploy finds no branch, and the mislabeled cross-reference that does exist points them at "concurrent deploy — treat as urgent" for the wrong failure. Fix: relabel A5 as shape 3, add a shape-4 exit (child died or A1 unwired → investigate, don't assume the deploy migrated).

**The guard's path disagrees with itself.** Section 2's table: `backend/scripts/pre-migrate-guard.mjs` (and the tests live in `backend/scripts/`). Section 0.2 and the 3.1 diff: `scripts/pre-migrate-guard.mjs`. One is a typo, and if it's 3.1's, applying the corrected choreography's one-liner *verbatim* produces exactly the outcome 3.0's table row 1 describes — every deploy dead at `Cannot find module`. The deadlock fix and the path that would retrigger it live four sections apart. Ten seconds to resolve, but a zero-context agent applying the diff as printed bricks deploys while following every instruction.

Smaller, same family:
- 7.1's target PRE line emits `"recovery":"render-snapshot"` — the quotable, unverified recovery claim that 3.4 itself calls "an assertion, not a plan" until Monday's number exists. B0's text permits "omit the field"; the canonical wireframe shows it emitted. Take the omit option until 3.4 answers.
- 3.0's "either in the merge itself" quietly reverses section 1's "deliberately not in that PR." And the two variants aren't equivalent — the follow-up-commit path leaves one unguarded deploy (status-quo risk, acceptable, but say so rather than "either").
- B2-as-PR-check silently upgraded B2's requirements: CI must now *programmatically* fork and restore a snapshot — the exact credential the runbook's known-unknowns list as unresolved. B1 can pass by hand while B2 stays unrunnable, and the plan doesn't connect those.

## 2. Handoff-ready?

After the two fixes above: **yes.** A day-one agent has real ungated work (A1, B0) that touches no DB and waits on no one. The single sentence that stops-or-misleads them is the 3.1 diff, for the path reason above. No other hard stop found.

## 3. The thing neither round caught: data custody

B1 and B2 copy a **production snapshot — client data, classes A/Q in this document's own vocabulary — out of the managed environment** into an ephemeral instance, and for B2 into CI that runs on every PR, with derived values (row counts, error strings) printed in PR-check logs. Both rounds argued *when* the rehearsal runs and *how fresh* the artifact is. Neither asked whether copying production client data out of the managed boundary is sanctioned at all. The document's own precedent is that client-data decisions are Sean's — runbook step 5 escalates a restore for precisely this reason — yet B2 makes the exfiltration decision by default. B1 (dashboard-forked, stays inside Render) and B2 (automated pull into CI) are different exposure classes and the plan treats them as one.

(Same family, one line: runbook step 4 states "T−up to 23h **on nightly snapshots**" as fact — nightly cadence is exactly what 3.4 says is unverified, and the incident runbook is the worst place in the document for an unverified number stated flatly.)

Everything above is edits, not architecture. Fix the mermaid, resolve the path, gate the `recovery` field and B2 on 3.4/Sean respectively — then stop.
