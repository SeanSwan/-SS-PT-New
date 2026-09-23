# FINDING-ID NAMESPACE REPAIR — social-bridge R1 round 6 vs s83-completion review 6

**Filed:** 2026-09-21 · **Seat:** WorkBuddy (Sable) · **Repo:** SS-PT · **Branch:** `creator-brains-engine-r2-20260915`
**Trigger:** R6-11 in `.ai-workflow/coordination/review-queue.md` (HIGH), filed by seat `vs-claude`
**Disposition of that finding:** Finding 2 **UPHELD**; Finding 1 **UPHELD IN FACT, REJECTED IN CONCLUSION**;
Finding 3 **UPHELD, and now settled** — see §4.

This document exists because R6-11 demanded it in its own closing paragraph:

> *"When the branch question is finally settled, the finding-ID namespace must be re-partitioned too, or
> the next reader will again read a true-looking subject and conclude a false thing."*

The branch question is settled (§4). This is the re-partition.

---

## §1. What actually happened, measured

Two hostile reviews both labelled "Astra round 6" ran **twelve hours and one commit apart**, against two
different packages and two different trees. Only one of them used finding IDs.

| Filing | Reviews | Effort | Verdict | Emits finding IDs? |
|---|---|---|---|---|
| `Z:/HostileReviews/2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md` | `fa1744e93` (social-bridge R1) | `high` | REVISE — 0/0/2/1 | **No** |
| `Z:/HostileReviews/2026-09-21-144356-swan-coach-universe-v3-s83-completion-review-6.md` | `53005a6da` (s83 package) | `xhigh` | DEFECTS-FOUND — 0/4/5/0 | **Yes** — `R6-01`, `R6-02`, `R6-03` |

The social-bridge filing names its findings only by severity:

```
$ grep -n "R6-0\|MEDIUM\|LOW\|verdict" /z/HostileReviews/2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md
6:verdict: REVISE — 0 critical / 0 high / 2 medium / 1 low
46:**Advisory verdict: REVISE.** The assertion-preservation claim holds, but the verification claims
   need correction. I found two medium findings and one low finding.
```

`R6-01` / `R6-02` / `R6-03` do not occur in it at all.

**The collision was created by this session, not by Astra.** Commit `7c7774447` (14:33:47) fixed the
social-bridge filing's two medium and one low findings — correctly — but *labelled them* `R6-01`,
`R6-02`, `R6-03`, borrowing the labels that the **other** review had already claimed. The landing packet
`ASTRA-ROUND-6-PACKET-2026-09-21.md` then propagated `R6-02` into the repository as the name of the
social-bridge scope finding.

So: a reader who knows only one of the two filings finds every label plausible, and a reader who knows
both cannot tell which finding `R6-02` means. That is the defect. It is a **namespace** defect.

---

## §2. R6-11 Finding 1 — the commit message is NOT false about its contents

R6-11 states: *"That commit does not touch this package's R6-01 or R6-03."* That sentence is **true**, and
independently reproduced here. But its heading — *"the commit message is false about its own contents"* —
does not follow, and the distinction matters enough to state precisely.

The full message of `7c7774447` names the review it answers, by path:

```
Refs: Z:/HostileReviews/2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md
```

and its three body sections describe precisely the three social-bridge findings:

| Message section | Claim | Diff supports it? |
|---|---|---|
| `R6-01 (medium)` — the R5-04 tests could not detect deletion | attachment-failure cases asserted only the HTTP response | **Yes** — `…ImageOwnership.regression.test.mjs` +26 |
| `R6-02 (medium)` — the round-6 packet overstated its run | packet said 4 files/41 tests; ownership adds 9 | **Yes** — packet corrected |
| `R6-03 (low)` — two committed headers stated false counts | `16+22=38` and `21 remain plus 5 moved` | **Yes** — 2 headers corrected |

`git show --stat 7c7774447` touches exactly those three files: `40 insertions(+), 7 deletions(-)`.

**Therefore:** the message is *accurate about its contents* and *wrong about its labels*. R6-11's own
evidence — the `git cat-file -e` absences — proves only that the labels belong to another review, which is
§1. Its Finding 1 conclusion should be read as **consequence of the collision**, not as a second,
independent falsification. I am recording the difference rather than accepting a stronger charge than the
evidence supports, which is the same standard R6-11 itself applied when it declined to assert what `main`'s
three files do.

**What R6-11 got right and I am adopting:** the file pair it examined (`coachRunnerLifecycle.test.mjs`,
`coachRunnerRefusalPath.test.mjs`) does not exist on this branch at all —

```
$ ls backend/tests/unit/coachRunner*.test.mjs
(none)
```

— so this branch's `R6-01`/`R6-03` work lives in another package, and any sentence of the form "round 6 is
closed" was unfalsifiable here without naming the tree. That is correct.

---

## §3. The repaired namespace — use these labels from now on

A global rename is the wrong remedy: these IDs are used across at least twenty documents in several
packages, and rewriting other seats' committed artifacts is both a breaking change and a rewrite of
published history. R6-11 says the same about `main`'s subject: *"I cannot repair it without rewriting
published history, and I am not going to."*

The repair is therefore **additive qualification**. Effective immediately, every finding from the
social-bridge filing is written with an `SB` prefix:

| Was | Now | Means |
|---|---|---|
| `R6-01` (social-bridge sense) | **`SB-R6-01`** | the R5-04 attach tests could not detect deletion of the behaviour they name — the mutation stayed green |
| `R6-02` (social-bridge sense) | **`SB-R6-02`** | the round-6 packet overstated the scope of its test run |
| `R6-03` (social-bridge sense) | **`SB-R6-03`** | two committed headers stated false test counts |

The `s83`/coach-universe filing keeps the bare IDs, because it emitted them:

| Label | Means | Owner |
|---|---|---|
| `R6-01` | the shipped orchestration still launches a child after lease invalidation | swan-coach-universe v3 s83 |
| `R6-02` | the new tests do not reach the boundary they claim | swan-coach-universe v3 s83 |
| `R6-03` | the checkpoint validator validates assertions, not the evidence they describe | swan-coach-universe v3 s83 |

**Rule for the next writer, stated as a rule so it survives this document:**

> A finding ID may only be minted by the review that emits it. If a review names its findings by severity
> only — as the social-bridge round-6 filing did — the seat *closing* those findings must prefix the IDs it
> invents with a package tag, or leave them unnamed and cite the filing path instead. Never borrow an ID
> that another live filing is already using.

---

## §4. R6-11 Finding 3 — the branch question, now settled

R6-11 measured, in worktree `codex/swan-coach-astra-owned-20260906`:

> *"`fa1744e93` is not in this branch's history. It is a `main`-only commit (merge-base `40791570a`; 682
> main-only vs 2530 worktree-only commits)."*

Re-measured here, in the **main tree** (`<repo-root>`, branch `creator-brains-engine-r2-20260915`):

```
$ git branch --show-current
creator-brains-engine-r2-20260915
$ git merge-base --is-ancestor fa1744e93 HEAD && echo ANCESTOR
ANCESTOR
$ git merge-base fa1744e93 HEAD
fa1744e934a120a7a28f0722f43468829d98d045      # == fa1744e93 itself
```

`merge-base` returning the commit itself is the proof that it is an ancestor, not a mere reachable object.

**Both measurements are correct, for different trees.** R6-11's Finding 3 is **tree-relative and honestly
scoped** — its author says "in this branch's history" and names the worktree. This is the third appearance
of the class R6-11 itself identifies: *"a reachable object is not an ancestor."* The settled answer:

- On **`creator-brains-engine-r2-20260915`** (this branch): `fa1744e93` **is** an ancestor. The R5-08 split
  and its round-6 remediation are both in this tree's history, and `87611a5f9` (the packet) is an ancestor
  of HEAD.
- On **`codex/swan-coach-astra-owned-20260906`**: it is not. The R5-08 work is absent there by design, and
  a reviewer reading that tree must not conclude the work was never done.

No history was rewritten to make this true. It was always true; it simply had not been measured per-tree.

---

## §5. What this document does NOT do

- **It does not amend `7c7774447`.** Amending published history is not a documentation fix, and it costs
  another full pre-commit hook cycle plus another ref race. **The record is the correction** — the same
  disposition this seat took in the lane record when the D7 guard rode into a peer commit.
- **It does not rename the IDs in existing documents.** Twenty-plus files across four packages use `R6-0x`.
  Rewriting other seats' artifacts would be a breaking change; prefixing them silently would falsify
  citation trails. The rule in §3 governs new writing.
- **It does not re-open `SB-R6-01`/`SB-R6-02`/`SB-R6-03`.** All three were fixed in `7c7774447` and verified
  green — 5 files / 51 tests, with the `SB-R6-01` mutant going RED (3 failed | 7 passed) where it had been
  9/9 green. R6-11 is about the labels, not the fixes.
- **It does not claim `SB-R6-01`'s severity.** Astra called it medium; R6-11's filing calls the class HIGH.
  The class is the issue: a test that stays green when its feature is deleted. Noted, not re-litigated.

## §6. Evidence index

| Claim | Command / path |
|---|---|
| social-bridge round-6 emits no IDs | `grep -n "R6-0" /z/HostileReviews/2026-09-21-142804-…md` → no match |
| s83 round-6 emits `R6-01/02/03` | `grep -n "R6-0" /z/HostileReviews/2026-09-21-144356-…md` → matches at :38, :86, :136 |
| `7c7774447` touches 3 files, no `coachRunner*` | `git show --stat 7c7774447`; `git cat-file -e 7c7774447:backend/tests/unit/coachRunner*.test.mjs` → absent |
| `7c7774447` cites the correct filing | `git log -1 --format=%B 7c7774447` → `Refs: …142804…` |
| `fa1744e93` is an ancestor on this branch | `git merge-base --is-ancestor fa1744e93 HEAD` → exit 0 |
| no `coachRunner*` on this branch | `ls backend/tests/unit/coachRunner*.test.mjs` → none |
