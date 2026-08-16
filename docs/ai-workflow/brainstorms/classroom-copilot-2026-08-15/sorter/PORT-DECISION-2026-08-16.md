# Step 5(b) — Port decision: GATE FAILED

**Run:** 2026-08-16 · `node model-heldout-run.mjs` · qwen3:14b (temp 0, think off) + `contract-14b.md`
(the ~90-line production `coachActionProposalPromptContract.mjs` compressed to ~30 lines) vs the
20-case held-out corpus. Executed once on O's machine (5090); T's Mac would only be slower, not different.

| Metric | Rules baseline | 14B + compressed contract |
|---|---|---|
| Recall | 53.3% (8/15) | **66.7% (10/15)** |
| False positives | 0 | **5** |
| Child-link violations | 0 | **1** ← gate killer |
| Unflagged child items | 0 | 0 |
| Parse failures | — | 0 |

**The violation:** `child-name-in-supply` — "need more of the dinosaur blocks Kai likes" →
`supply, child=c4`. Type correct; link forbidden. The production contract carries this nuance
in its evidence/PII rules; the 30-line compression lost it, and the model followed the
compressed contract faithfully into the violation. **This is the finding, not an artifact:**
the test's exact question was whether a compressed frontier contract survives a 14B, and the
answer is that compression sheds precisely the nuanced privacy rules that matter most, while
the headline metric (recall) *improves* — a pass-the-average, fail-the-invariant shape.

**Also real:** 5 false positives (invented items — the expensive error class the rules sorter
had at zero), including a fabricated self-care task from the pure-emotion trap.

**Why there is no retry on this corpus:** tuning `contract-14b.md` against these 20 cases
un-holds the held-out set (the 53.3%-vs-100% lesson of this workstream). Any retry needs a
fresh blind corpus written by someone who has not read the failure output above.

**Standing per the handoff:** step 9 (coach port slice 1) is now BLOCKED on its own gate.
The port hypothesis stays downgraded. If O wants a second attempt, the price is a new
blind held-out corpus + a revised compression that restores the link-suppression rules —
and the invariant bar stays zero.
