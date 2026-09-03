---
lesson: "Running a failing check against the baseline proves only 'my change did not cause this.' It does NOT prove the failure is real. A shared broken INSTRUMENT fails identically on both sides — which is exactly what a real pre-existing defect looks like. Before reporting an absence or a breakage as real, prove the instrument can find the thing when it IS present."
originating_model: claude-opus-5
date: 2026-08-27
surface: vs-claude
linear: SWA-212, SWA-222
status: durable
models_used:
  - model: claude-opus-5
    role: builder of the acquisition slice, then hostile reviewer of its own work
    did: "Built referral-attributed milestone shares (PR #90). Hostile review of own slice found the feature would have shipped INERT. Then wrongly reported main's frontend build as broken for two days, propagated it to a PR body, a Linear comment and a Hermes memo, and retracted it on verification."
    cost: subscription
  - model: claude-fable-5
    role: prior-turn arbitration that set the direction
    did: "Ruled STOP hardening the cancellation workstream and move to acquisition. That ruling is why this slice exists and why it was scoped small."
    cost: subscription
skills_touched:
  - id: instrument-check skill / feedback_validate_probe_before_absence_claim
    change: amended
    failure: "The existing rule says validate the instrument before believing a NEGATIVE. It did not cover this shape: a POSITIVE failure signal (a red build) that is also an instrument artifact. I ran the baseline comparison, saw identical red, and treated 'not caused by me' as 'therefore real.' Amendment: a baseline comparison is a negative control only. To call a breakage real, resolve WHY it breaks, not just WHERE."
  - id: rule-73 (Proof-Before-Done)
    change: reinforced
    failure: "I reported a two-day production-impacting breakage with no positive proof — no Render deploy log, no failing deployment, no successful counter-build. 'It fails on baseline too' felt like evidence and was not."
  - id: rule-52 (Anti-Rework Burden of Proof) — adjacent
    change: reinforced
    failure: "The claim implicated another agent's committed, gate-passed work (Codex's Forge). Rule 52 sets a HIGH bar to re-flag recently-passed work. I cleared 'file:line evidence' but never asked the cheaper question: does main declare this dependency? It did — one `git show origin/main:frontend/package.json` away."
---

## The lesson

`vite build` failed on my branch. I ran it on the `origin/main` baseline: it failed
identically, same file, same missing import. I concluded main's frontend build had been
broken for two days and said so in a PR body, a Linear comment, and a Hermes memo.

It was not broken. `origin/main` declares `"@swan/forge": "file:../packages/swan-forge"`
in `frontend/package.json`, and the package's exports map exposes the exact path the error
named. My scratch worktrees junctioned `node_modules` from the local repo — which sits on
a branch **2293 commits behind**, where that dependency does not exist. Both worktrees
borrowed the same wrong `node_modules`, so both failed the same way.

A real `npm install` in the worktree created `node_modules/@swan/forge`, and the build
succeeded in 24.77s.

## Why it generalises

The baseline comparison is the workhorse of "is this mine?" and it is genuinely good at
that. What it cannot do is distinguish these two states, because they produce identical
output:

- a real defect present on both branches
- a broken instrument shared by both branches

Anything hoisted, junctioned, cached, or inherited — `node_modules`, a lockfile, a global
CLI, an env var, a DB fixture, a stale registry — is shared by both sides of a baseline
comparison and therefore invisible to it. The check has a blind spot exactly where shared
state lives.

The fix is cheap and it is not "run the check again." It is: **resolve the mechanism.**
For a missing import, that is one command — does the manifest declare it? I ran the
expensive check (a full build, twice) and skipped the two-second one.

Second-order lesson: I made the claim worse by reading `frontend/package.json` from the
**working tree** rather than from `origin/main`. On a repo 2293 commits behind, the working
tree is a different codebase. Any claim about what main contains must be read with
`git show origin/main:<path>`.

## Who did what

**Opus 5 (me)** built the slice, caught a genuine ship-stopping defect in it by hostile
review, then produced this false finding and propagated it to three artifacts before
catching it. Both facts belong in the record: the same adversarial pass that saved the
feature also manufactured a two-day phantom outage.

**Fable 5**, the prior turn, ruled STOP on the cancellation workstream and redirected to
acquisition. That ruling held up — the acquisition slice was small, shipped in one session,
and the scope discipline is why the false finding was caught before it cost anything.

**Codex** was implicated by the false claim and had done nothing wrong. Its Forge work
(`c53ba55dc`, `886266688`) was correct and complete, dependency declared.

## Skills created or changed

`instrument-check` amended: the existing "validate before believing a negative" rule did
not cover a positive failure signal that is itself an artifact. Added: *a baseline
comparison is a negative control only.*

## Mistakes I made

- **Reported a two-day production breakage that did not exist**, based on a baseline
  comparison, and propagated it to a PR body, a Linear comment, and a Hermes memo before
  verifying the mechanism.
- **Read `frontend/package.json` from a working tree 2293 commits stale** instead of from
  `origin/main`, which is what turned a suspicion into a confident claim.
- **Shipped-inert bug in my own feature**: `readAcquisitionParams()` ran only at form
  submit, so a visitor landing on `/?ref=` and navigating in-app to signup lost the code.
  Caught by hostile review asking "does this survive the real user path?" — not by any
  test, because the tests were written from the implementation and inherited its blind spot.
- **Destructured `User` from a `getModels()` that never returned it** — the name lookup
  would have silently never run.
- **Asserted on an object shape I had not read** (a test helper's return value) — the
  second occurrence of this exact class in one session.
- A bash heredoc quoting error silently aborted an edit block; I nearly continued as if it
  had applied.

## Error → fix → repeat ledger

| error class | recurrences this session | already written up before it recurred? | what actually stopped it |
|---|---|---|---|
| believed an instrument instead of validating it | 2 (ANSI-broken grep → false "0 failures"; baseline build → false "main is broken") | **YES** — `feedback_validate_probe_before_absence_claim` was already in the corpus | resolving the mechanism (read the manifest), not re-running the check |
| asserted on a shape I had not read | 2 (`billingOptions` return; `getModels()` return) | no | reading the callee before writing the caller |
| trusted a number/file from a stale tree | 2 (packet's baseline figures; local `package.json`) | partially — stale-check memory | `git show origin/main:<path>` for every claim about main |

**The first row is the one that matters.** That lesson was already written down, and I
repeated it twice in one session anyway. That proves the write-up was not the fix. What a
prose reminder cannot do, a procedure can: the correction that survives is *"resolve the
mechanism before reporting a breakage"* — a concrete next command — not *"be more careful
about instruments."*

## External-model calibration

None consulted this session. The two findings that mattered — the inert-feature bug and the
false breakage — were both found and both caused by the same self-review pass, at $0.
