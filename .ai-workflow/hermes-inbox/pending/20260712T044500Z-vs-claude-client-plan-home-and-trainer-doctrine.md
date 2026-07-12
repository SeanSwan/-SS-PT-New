---
surface: vs-claude
utc: 20260712T044500Z
topic: Trainer-indispensability doctrine locked + client full-plan read shipped; PDF Approval Vault now on all 3 client docs
tags: [workout-plans, client-dashboard, swan-coach, pdf-export, security, product-doctrine]
---

## What I did / learned
- **PRODUCT DOCTRINE (durable, applies far beyond this feature):** Sean 2026-07-11 — *"If we give the clients too much power, then what is the use of the trainer?"* Client surfaces are **read + do**, never **decide**. Client MAY view plans/history/progress, log workouts, and *request* changes. Client MAY NOT switch which plan is active, edit plan structure, or self-assign programming. Switching/editing stays **trainer/admin only**. Saved as memory `feedback_trainer_indispensability_doctrine`.
- **Shipped (backend):** `GET /api/workouts/:userId/plans/:planId` — client-scoped **read-only** full-plan read returning EVERY week→day→exercise. Needed because `/current` deliberately returns only the *current week*, so a client "plan view" would otherwise show one week and call it the whole program.
- **Security pattern worth reusing:** an authenticated client can always pass their **own** `:userId`, so `ensureClientAccess` alone is NOT enough — the only thing between them and a stranger's program is the **ownership predicate in the query** (`where: { id, userId }`). Returns **404, not 403**, so a foreign plan id is never confirmed to exist. A test asserts the where-clause itself, so "optimizing" to `findByPk()` fails CI.
- **Swan Coach gap (important for Hermes to know):** Coach has `build_workout_plan` / `create_nasm_program` / `delete_workout_plan` but **NO update/edit-plan command at all**. A client asking Coach to change their plan today only files a `request_plan_adjustment` **note** — it does not touch the plan. Any future edit capability must be **approval-gated** (Coach proposes → trainer approves → applies).
- **Also shipped this session:** the A3 **Approval Vault** now gates **all three** client-facing PDFs (plan, session log, progress report) — preview shows the EXACT bytes that download, with a brand chip, so a mis-tagged Move Fitness client is caught before a document reaches them.
- **Repo-health facts:** frontend baseline is **5780/5780 green, `tsc` 0 errors repo-wide**. Two *guard* tests were failing on prose, not code — a route description reading "log in **as any** client" tripped an `as any` **cast** guard, and a comment documenting the banned phrase tripped the **credential lock**. Lesson: when a source-contract guard fails, check whether the match is inside a **string/comment** before "fixing" the code.

## Why it matters to Hermes
- The doctrine is a **standing filter**: if Sean (or an agent) proposes any client self-service control over programming, Hermes should push back and route it to the trainer side. This is the product's moat, not a config choice.
- Hermes should not claim Swan Coach can *edit* a client's plan — it cannot. Say "Coach can draft a new plan or propose an adjustment for trainer approval."
- The IDOR pattern (ownership in the query, 404 not 403) is the house standard for any future client-scoped read.

## State right now
- Slice 1 (backend full-plan read + IDOR tests) **committed**, on branch `claude/client-plan-home-2026-07-11`, not yet pushed (batch push pending).
- Next: client **Plan Detail modal** (full weeks/days/exercises, "you-are-here" marker), then an **always-visible multi-plan card** on the real client home (`ClientDashboardHome`) showing ≥3 plans with Active/Paused/Ready status pills but **no switch control**.
- ⚠ A rich `ClientTrainingPlanVaultCard` (7 plan slots) **already exists but is mounted only on an UNROUTED page** (`ClientObservatoryHome`), whose docstring falsely claims to be the canonical client home. The real home chain is `ClientHomeTab → ClientDashboardHomeTab → ClientDashboardHome`. Sean chose to build **better than** the orphan, not reuse it.
- Handoff doc on main: `docs/ai-workflow/AI-HANDOFF/CLIENT-PLAN-HOME-VISION-HANDOFF-2026-07-11.md`.

## Sean owes / blockers (if any)
- **Design pick pending:** three card directions offered (Program Shelf / Vault Rail / Phase Timeline). Build resumes on his choice.
- **Hardware:** ghost keystrokes were root-caused to his **Corsair keyboard** (stuck/repeating paste replaying the clipboard) — NOT any AI agent, and NOT the browser extension (it reached a terminal, which no extension can). Fix = iCUE key assignments **and onboard/hardware profile** (Corsair burns macros into firmware, so they fire even with iCUE closed). Two Render API keys were exposed by this and **both have been rotated**. Standing lesson: never leave a fresh secret sitting in the clipboard.
