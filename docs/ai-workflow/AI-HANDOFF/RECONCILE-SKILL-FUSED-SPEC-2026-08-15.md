# `recon` — Pre-Audit Reconciliation Skill · FUSED SPEC

**Date:** 2026-08-15
**Panel:** GLM-5.3 (Z.ai, subscription) · Kimi K3 (`moonshotai/kimi-k3`, $0.1351) · HY3 (`tencent/hy3`, $0.0040)
**Synthesis:** Claude Opus 5
**Source designs:** `RECONCILE-SKILL-{GLM,KIMI,HY3}-2026-08-15.md`
**Status:** design complete, NOT built. Phase 1 awaiting Sean's go.

---

## 0. Why this exists (measured, not assumed)

| Measurement | Value |
|---|---|
| Local branches | **409** |
| Branches ahead of upstream | 40+ |
| Branches never pushed anywhere | 30+ |
| Unpushed commits, current branch | 121 |
| Uncommitted working-tree files | 419 |
| Current branch behind `origin/main` | 1,947 |

**The founding measurement.** `claude/store-inquiry-button` reports `[ahead 68]`.
`git cherry -v origin/main` reports **1** commit genuinely absent. 67 of 68 already
shipped via squash-merge; the branch was never deleted.

> **Commit counts lie. Only content comparison tells the truth.**
> A version of this skill built on `ahead` counts would report ~40 branches of phantom
> work, drown the owner in noise, and be dead by week two.

---

## 1. Consensus across all three models

All three independently converged on:

1. **Three-layer architecture** — deterministic engine script, judgment skill, one-line hook.
   Never parse 409 branches of git output through an LLM context; that is how hallucinated
   verdicts happen.
2. **Read-only by default.** Recommends; never merges, pushes, rebases, deletes, or checks out.
3. **Layered content-equivalence, cheapest-first, short-circuiting** — ancestry → tree identity
   → `git cherry` → reverse-apply (finalists only).
4. **Rank-then-deep-pass.** Cheap classification on all 409; expensive analysis on top ~15.
5. **Verdict taxonomy richer than upgrade/downgrade.** All three rejected the binary.
6. **Phase 1 = the truth filter**, ships alone, independently useful.
7. **`unknown` is a legitimate verdict.** Never guess.
8. **All three named "false confidence" as the top-severity failure** — independently.

---

## 2. Contradictions resolved

| Issue | HY3 | Kimi | Resolution |
|---|---|---|---|
| The 419 uncommitted files | "stashed to `recon-stash-2026-08-15`" | `git stash create` → dangling commit, tree untouched | **Kimi.** HY3's version *writes to the live working tree mid-session*. `git stash create` produces the same preservation pointer with zero mutation. Violating read-only in the very first run would end the skill's credibility. |
| Trust in patch-id | "360 of 409 filtered as already-landed via patch-id" | names squash-merge as patch-id's specific failure mode | **Kimi.** Squash-merge defeats patch-id — the exact merge style that produced this repo's 68→1 case. HY3 over-trusts a signal that fails in the dominant local pattern. |

---

## 3. Unique contributions kept from each

**From GLM — two verdicts the others missed, both structural:**
- **`regression-risk`** — branch re-adds lines main removed (pickaxe), or reverts a later fix
  commit. **Merge forbidden by construction**, not merely discouraged. This is the disaster
  case given its own quarantine state rather than being a footnote on `genuine-upgrade`.
- **`active-lane`** — live worktree, lane lock held, or commits < 48h old. **Untouchable.**
  A branch an agent is on *right now* is in flight, not stranded.
- **Sensitivity-weighted aging:** P0/safety/auth/payment items **never age out** — they escalate.
- **The self-snitch line:** `parked: 29 · finished: 0 ⚠ 3 weeks` printed when park-rate exceeds
  finish-rate. The skill reports its own failure to produce outcomes.

**From Kimi — the correctness machinery:**
- **Cache key is `(tip_sha, main_sha)`**, not tip alone. Keyed on tip only, stale verdicts
  survive across runs because branches didn't move even though main did.
- **Hard-fail if `origin/main` fetch is >24h old** unless `--stale-ok`. A reconciliation tool
  describing last Tuesday's main is worse than no tool.
- **Reverse-apply layer** specifically to catch squash-merges that defeat `git cherry`.
- **Measure before building:** if Phase 1 shows >20% false-absent on this actual repo, fix
  merge hygiene *first* — do not build Phase 3 on a broken foundation.
- **Multi-signal completeness:** ≥2 agreeing signals; commit messages lie.

**From HY3 — the information design (its assigned emphasis, and it won):**
- **Group by ACTION, not by branch.** `[PUSH]` / `[ARCHIVE]` / `[HUMAN]` / `[RISK]` markers.
- **Priority-ordered "WHAT TO DO"** list above any data.
- **Negative confirmation is a feature:** `payments/ : verified NO unpushed changes (safe)`.
  Telling the owner where there is *no* risk is as valuable as flagging risk.

---

## 4. The design tension neither Sean nor I had named

GLM stated it most precisely:

> *The fix for Failure 3 — more gates, more flags, more mandatory runs — directly worsens
> Failure 2, the boredom death.*

- **Failure A (false confidence):** a clean-looking merge re-introduces a vulnerability main
  fixed later. Defence = more gates.
- **Failure B (abandonment):** the skill becomes tab #11; hard items reappear every run;
  "park" becomes silent death with paperwork. Defence = fewer gates, less friction.

These pull in opposite directions and **there is no complete solution — only a dial.**
Tuning it is the real work of Phase 3.

The bitterest version, from GLM: `claude/equipment-p0-safety` — the exact branch this skill
exists to rescue — gets ticketed, aged, and buried, and the skill *facilitates the abandonment
while feeling productive about it.* The sensitivity-weighted aging rule (P0/auth/payment never
age out) exists specifically to prevent that.

---

## 5. Blind spots the panel shared (my additions)

None of the three addressed:

1. **Duplicate work across branches.** With 409 agent-generated branches, the same fix likely
   exists on several. Merging one makes the others `superseded` — but only if detected.
   Cluster by touched-path + patch similarity before ranking, or the same decision gets made
   three times.
2. **The skill's own running cost.** GLM burned **18,889 reasoning tokens** on *designing*
   this. A deep pass over 15 finalists is not free. The engine must stay deterministic
   (zero model calls); only finalist judgment may spend.
3. **Age-first mass triage.** Nobody asked whether 300 of 409 branches could be archived on
   age alone (>8 weeks + behind >1,000) before any content analysis. That is the cheapest
   possible filter and would shrink the expensive problem by an order of magnitude.

---

## 6. Fused verdict taxonomy

| Verdict | Signal | Action | Merge? |
|---|---|---|---|
| `already-landed` | ancestry, or empty tree-diff, or cherry-empty + reverse-apply clean | archive-tag, offer branch delete | n/a |
| `superseded` | overlaps hunks main changed differently; same intent | archive-tag + pointer to superseding commit | no |
| `genuine-upgrade` | absent + clean sim-merge + zero unresolved overlap + tests pass rebased on main + deps not regressed | propose via `push-blast-radius.mjs`, per-item approval | **human-gated only** |
| `regression-risk` | pickaxe: re-adds lines main removed, or reverts a fix commit | **quarantine** | **FORBIDDEN by construction** |
| `incomplete-WIP` | ≥2 of: WIP markers, tests fail on branch, lane ≠ delivered, slice N-of-M | park → `linear-todo` | no |
| `conflicting` | sim-merge conflicts, or touches sensitive hunk main changed | escalate with both versions | no |
| `unmergeable-by-cost` | behind >500 + high conflict density + small real delta | archive + "rewrite cheaper than rebase" | no |
| `active-lane` | lane lock held, or commits <48h | defer, notify lane owner | **never archive** |
| `experimental` | name signals (`spike/`,`poc/`), no tests, never pushed | park | no |
| `unknown` | methods disagree, or confidence low, or budget exhausted | escalate; **never round to convenient** | no |

**Minimum evidence to recommend merge (all six):** absent at confidence ≥ medium · clean
`git merge-tree` simulation or fully enumerated conflicts · security-overlap scan clear or
each overlap human-approved · tests pass in scratch worktree rebased on current `origin/main` ·
lockfiles not regressed · `push-blast-radius.mjs` passes. Missing any → downgrade to
`conflicting` or `unknown`.

**Language rule (all three models converged here):** the report must never say *"safe to merge."*
It says **"no detected regression"** and shows evidence, never a green checkmark. A checkmark
displaces the vigilance a scary unknown would have provoked.

---

## 7. Phased build

| Phase | Ships | Useful alone because | Success metric |
|---|---|---|---|
| **0 · Census** | inventory of all refs, worktrees, stashes, dirty counts; age-sorted | replaces "ten tabs" terror with one list | owner sees all 409 with dates |
| **1 · Truth filter** | equivalence layers 1–4, rank score, report v0, `(tip,main)` cache | the 68→1 problem *is* the ballgame | `store-inquiry-button` classifies "1 real, not 68"; **false-absent rate measured** |
| **2 · Verdicts** | ranking, top-N gate, full taxonomy, audit-delta memo, resume | the originating purpose goes live | memo attached to a real audit |
| **3 · Judgment** | regression gates, completeness heuristics, evidence packets, `--deep` tests | merge recommendations become evidence-backed | a **planted** regression caught in dry run |
| **4 · Habitability** | delta-only reports, sensitivity-weighted aging, self-snitch, hook | survives contact with week three | <60s read, ≤3 decisions/run, debt declining |

**Phase 1 gate (Kimi's rule, adopted):** if false-absent >20% on this repo, stop and fix merge
hygiene before building Phase 3.

---

## 8. A SECOND trap, found while writing this spec — and it is worse

Mid-synthesis I flagged `claude/equipment-p0-safety` (`[ahead 77]`, 5 weeks old, "P0 safety")
as possible unshipped safety work outside the pre-launch audit. **That was wrong.** Measured:

```
git rev-parse claude/equipment-p0-safety   -> 7b1b54d1e…
git merge-base origin/main <branch>        -> 7b1b54d1e…   (IDENTICAL)
git rev-list --left-right --count origin/main...<branch>  ->  1552   0
git cherry origin/main <branch>            -> exit 0, 0 lines
```

The merge-base **is the branch tip** — the branch is an ancestor of `origin/main`.
**Zero commits ahead of main. Fully landed. Nothing stranded.**

**So what is `[ahead 77]`?** It comes from `%(upstream:track)`, which measures the branch
against **its own remote** (`origin/claude/equipment-p0-safety`) — *not* against main. It means
"77 commits never pushed to that branch's own copy," which is irrelevant once the work landed
in main via PR or squash-merge.

### Two distinct traps, both fatal, both must be designed against

| # | Trap | Example | Real value |
|---|---|---|---|
| 1 | Squash-merge inflates content-absence | `store-inquiry-button` `[ahead 68]` | **1** commit absent |
| 2 | `upstream:track` measures the wrong target entirely | `equipment-p0-safety` `[ahead 77]` | **0** — fully in main |

Trap 2 is more dangerous than trap 1: it is not an *overcount*, it is a **category error**.
The number is measuring a relationship the owner does not care about, while *looking* like the
number they do care about. Every branch whose remote copy is stale reports "ahead" forever,
regardless of whether its work shipped.

**Design rule (elevated to non-negotiable):** every equivalence question is asked against
`origin/main` explicitly. `%(upstream:track)` output is **display-only, always labelled
untrusted**, and never feeds ranking, verdicts, or counts. The report shows the correction
(`reported ahead 77 → 0 real`) precisely because the owner thinks in those numbers.

**Live demonstration of the skill's value:** this spec's own author produced a false
launch-blocking alarm from `[ahead 77]`, then retracted it after four git commands. That is the
exact failure the skill exists to prevent, committed while designing the skill.
