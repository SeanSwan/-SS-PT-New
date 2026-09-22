---
decision: "Each slice boundary is an evidence review against pasted output; A2 self-check is never independent approval."
status: open
supersedes: none
---

# 07 — Checkpoints

## 1. Protocol

At every STOP line the builder posts:

1. `git diff --stat` plus the full diff of the slice.
2. **Pasted output** for every acceptance criterion in `05-slices.md` — actual stdout, not a summary.
3. `wc -l` for every touched file.
4. Anything built that the package did not specify, and anything specified that was not built.
5. Any criterion that could not be executed, marked **`NOT RUN`** with the reason.

The architect returns exactly one verdict:

- **PASS** — every criterion has pasted evidence and no drift.
- **REVISE (list)** — enumerated defects; the builder fixes and re-posts the same slice.
- **HALT** — a package assumption is wrong; the package is revised before any more code.

**Drift is returned to the builder, never patched by the architect** — otherwise the token
economics of the whole arrangement invert.

## 2. Verdict ledger

| Slice | Verdict | Date | Evidence |
|---|---|---|---|
| S0 | — | — | pending |
| S1 | — | — | blocked on D-3 |
| S2 | — | — | pending |
| S3 | — | — | pending |
| S4 | — | — | partial by design (D-4) |
| S5 | — | — | pending |
| S6 | **NOT AUTHORISED** | — | blocked on D-1 / D-2 |

## 3. Reusable review remit

> Review this slice against `BLUEPRINT-swan-coach-live-2026-09-20`. For every acceptance criterion
> in `05-slices.md`, confirm pasted output exists and matches. Check `06-bans.md` line by line.
> Confirm `wc -l` ≤ 300 on every touched file. Report anything built but unspecified and anything
> specified but unbuilt. Treat any criterion without pasted output as `NOT RUN`, never `PASS`.
> Return PASS / REVISE (list) / HALT.

## 4. PART A and PART C — where they live

**PART A** (A1 findings + A2 self-check) and **PART C** (remaining decisions) are filed under
Rule 86 at:

```
Z:\HostileReviews\2026-09-20-<HHMMSS>-swan-coach-live-blueprint-revision.md
```

filed by the repo-owning Opus session and reindexed with `reindex.mjs`. The archive is the
authority; this section is a pointer, not a copy.

**A2 is a self-check, not approval.** The same author who wrote PART B wrote A2. It reduces obvious
error; it does not constitute independent review. **This package has not been independently
approved**, and no slice may cite A2 as its review gate.

## 5. Status vocabulary — keep these separate

| Term | Means | True here? |
|---|---|---|
| **PLAN READY** | documents exist, decisions recorded, criteria written | **YES** (revised) |
| **IMPLEMENTATION VERIFIED** | slices built, criteria pasted and passing | **NO** — every planned test is `NOT RUN` |
| **DEPLOYED** | running in production, verified there | **NO** — nothing pushed |

The S4-minimal code described in `01-architecture.md` §7 **already exists uncommitted** in the
working tree with `[SUPPLIED]` green results. That is **not** IMPLEMENTATION VERIFIED against *this*
package, because this revision changed the contract underneath it: it now owes the binding
(`S1`/`S3`), the functional append (`S2`), and the split receipts (`S4`). Treat the existing code as
a **starting point that this package supersedes**, not as a completed slice.

## 6. Rollback

| Level | Action |
|---|---|
| Slice | `git revert` the slice commit; each slice is independently revertible by construction. |
| Milestone | Revert S0–S5 and remove `showFreestyle` from `CoachCommandCenterPage.tsx`. The dock prop defaults to `false`, so the surface returns to current behaviour. |
| Data | None required — M1 writes nothing to any server, database, or migration. |

Every slice leaves the app bootable; there is no intermediate state that requires a forward fix.

## 7. Operational notes

- **Shared worktree.** Another agent holds uncommitted work in `CoachConsoleDock.tsx` `[SUPPLIED]`
  and `HEAD` moved four times during this package's authoring. Read the Rule 67 lane files before
  every slice, claim files in your own lane, and stage explicit paths.
- **No push in M1.** Batch-push cadence applies; the operator decides when.
- **Metrics worth emitting** (local only, no transcript): capture duration, word count, handoff
  outcome by `RejectReason`, capture-lock refusals. These make the reject paths observable instead
  of invisible.
- **Performance budget for M1:** stop → draft in composer ≤ 150 ms p95. M3 budgets in
  `03-contracts.md` §6.
