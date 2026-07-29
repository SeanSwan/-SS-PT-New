# Cleanup Loop — Iteration 3: three hypotheses disproven, one real backlog

- **Linear:** SWA-71 · **Lane:** dirty trees / config drift / root hygiene (backend)
- **Outcome: no fix shipped, because there was nothing safe and real to fix.** That is the finding.
- Recorded so the next agent does not re-run these three sweeps.

---

## Disproven — do not re-investigate these

### 1. "The tree is dirty" — FALSE
Down from **1,717 uncommitted files to 3**, and two of those three belong to the other agent
(SWA-75 Hermes learning packets). The preservation snapshot plus the existing ignore rules already
resolved this. `git status --porcelain` on the main tree: `2 ?? , 1 M`.

### 2. "Root is cluttered with QA artifacts" — FALSE on `main`
The local tree shows 46 loose root files, but **34 are gitignored local-only** and the remaining
12 include three artifacts (`swan-lens-review-packet.tmp.md` 97 KB, `apex-branch.diff` 27 KB,
`swanguard-mobile-metrics.json` 3 KB) that **do not exist on `main` at all** — they live only on
the stale `wip/comms-notifications-2026-07-05` branch where the preservation snapshot committed them.

`origin/main`'s root holds exactly **9 loose files, all legitimate**: `CLAUDE.md`, `AGENTS.md`,
`ACTIVE-INDEX.md`, `README.md`, `package.json`, `package-lock.json`, `render.yaml`,
`render.env.example`, `skills-lock.json`. **No Rule 35 violation on the branch that ships.**

> **Method trap worth naming:** inspecting the local working tree and concluding something about
> `main` is invalid when the tree sits on a branch 1,181 commits behind. Check `git ls-tree
> origin/main`, not `ls`.

### 3. "`.gitignore` needs a rule for root QA screenshots" — ALREADY DONE
Lines 280-283 already root-anchor `/*.png`, `/*.jpg`, `/*.jpeg` with a comment pointing at
`docs/qa/baseline/`. All 31 root images were already ignored and never tracked.

> **And the anchoring matters:** the repo has **216 legitimately tracked `.png` files**. A bare
> `*.png` rule — the obvious thing to write — would have hidden every one of them. The existing
> rule is correct; adding to it would have been damage.

---

## The one real finding: 196 backend files exceed the 300-line cap

196 of 999 backend runtime files (~20%) are over Rule 4's limit.

| Lines | File |
|---:|---|
| **5,294** | `routes/sessionRoutes.mjs` |
| 4,065 | `controllers/gamificationController.mjs` |
| 3,047 | `routes/sessions.mjs` |
| 2,998 | `services/sessions/session.service.mjs` |
| 2,580 | `routes/dailyWorkoutFormRoutes.mjs` |
| 2,307 | `services/aiChatService.mjs` |
| 2,295 | `routes/adminGalleryRoutes.mjs` |
| 2,049 | `controllers/adminClientController.mjs` |

**The top entry sharpens an earlier finding.** `routes/sessionRoutes.mjs` is the router
`core/routes.mjs` described as "REMOVED". It is not merely still mounted — at 5,294 lines it is the
**single largest file in the backend**. The retired thing is the biggest thing.

### Not fixed, deliberately
A 20% systemic backlog is not a loop-iteration task, and refactoring 5,000-line route files during
a launch is the drive-by this discipline exists to prevent. Recorded as data, sequenced for later:
the retired router is the natural first target, since shrinking it overlaps with deciding whether it
should exist at all.

---

## Iteration note

Three of four hypotheses were wrong, and each was disproven cheaply — by checking `origin/main`
rather than the local tree, and by reading `.gitignore` before proposing a rule for it. **An
iteration that ships nothing is a valid outcome**; manufacturing a change to justify the loop is how
a cleanup pass becomes a source of defects.
