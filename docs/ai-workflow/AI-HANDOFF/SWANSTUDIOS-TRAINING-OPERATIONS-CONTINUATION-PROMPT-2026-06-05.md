# SwanStudios Training Operations Continuation Prompt - 2026-06-05

## Purpose

This handoff gives the next AI enough context to continue SwanStudios from the current point without rereading the entire prior conversation. Use it to continue the highest-value work: making the app usable for Sean's real training business, especially onboarding clients, logging workouts, preserving workout history, showing progress charts, managing sessions, and using Swan Coach AI as a hands-free assistant.

## Fresh-Session Prompt

Use this prompt when starting a new AI session:

```text
You are continuing SwanStudios in the SS-PT repo at C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT. Read AGENTS.md/CLAUDE.md first, then ACTIVE-INDEX.md, docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md, and this handoff. SwanStudios is a workout-progress-first personal training SaaS. The core product loop is: onboard the client -> assign or generate the right plan -> log the workout through manual forms or Swan Coach voice/text -> save the workout diary entry -> deduct or preserve paid sessions according to schedule/session policy -> show progress charts and next actions -> make milestones shareable.

Continue from the current priority: make the app useful for Sean's daily training operations. Prioritize client onboarding/account readiness, workout logging, saved workout plans, progress/chart truth, session deduction rules, and Swan Coach AI dictation flows over decorative polish. The app must support Move Fitness clients as free/internal tracked clients and SwanStudios clients as paid clients whose purchased sessions are deducted when eligible workouts/sessions are completed. Trainers/admins need mobile-first, low-tap workflows: find client, start/log session, dictate or type notes, save, show charts, and choose the next workout plan.

Follow all protocol rules. Before UI/data-truth code, produce a Canonical Surface Receipt. Use TDD when feasible. After each implementation slice, run verification, run hostile review, fix concrete findings, then report with plain-English and technical summaries. Use the new static intelligence gate: run npm run code-health:audit for local working-tree checks and report whether findings are clean, warn, or deferred. Do not run broad auto-fix or delete files without evidence and Sean approval. Push only with Sean's explicit permission.

Recommended next slice: Client Training Operations Readiness Audit. Trace the canonical admin/trainer/client surfaces for Clients & Team, Coach Command Center, Workout tab/workout builder, Workout Logger, Universal Master Schedule, session purchase/deduction, saved plans, and progress charts. Classify canonical vs legacy/dormant surfaces. Identify the shortest implementation path so Sean can onboard clients, log workouts, persist plans/history, deduct sessions correctly, and show professional progress proof to clients. Then implement the highest-value narrow fix from that audit.
```

## What Just Changed

- `AGENTS.md` and `CLAUDE.md` now include Rule 63: Static Intelligence Gate for AI Code Quality.
- Root `package.json` now includes Fallow code-health scripts.
- `.fallowrc.json` was added with conservative ignores and warning-level startup rules.
- `.gitignore` now ignores `.fallow/`.
- `package-lock.json` was created at the root because Fallow is installed as a root dev dependency.

## New Code-Health Gate

Use these commands from the repo root:

- `npm run code-health:audit` - local working-tree audit against `HEAD`.
- `npm run code-health:audit:main` - branch audit against `main`; currently noisy because this branch has large drift from `main`.
- `npm run code-health:dead` - focused dead code / unused exports / dependency check.
- `npm run code-health:dupes` - duplication check.
- `npm run code-health:health` - complexity/file health check.
- `npm run code-health:fix-preview` - dry-run preview only. Do not run blind auto-fix.

Current known Fallow baseline:

- Local `HEAD` audit exits with `warn`.
- It reports 20 inherited unused-dependency warnings across existing frontend/backend package manifests.
- It does not show current-slice introduced duplication or complexity.
- Do not remove dependencies from those warnings without proof because some may be runtime, optional, CLI, or integration-only dependencies not visible to static analysis.

## Unfinished High-Value Slices

### P0 - Client Training Operations Readiness Audit

Goal: make the admin/trainer workflow immediately usable for real clients.

Scope:

- Canonical route/surface audit for Admin Dashboard, Trainer Dashboard, Client Dashboard, Clients & Team, Coach Command Center, Workout tab, Workout Logger, Universal Master Schedule, client progress views, and store/session purchase flow.
- Classify duplicate or competing surfaces: workout builder vs workout logger vs coach command actions.
- Find the shortest path for Sean to onboard a client, choose/generate a workout, log the actual workout, save history, and show progress charts.

Expected output:

- Canonical Surface Receipt.
- Surface Classification Table.
- Top 5 fixes ranked by revenue/use value.
- First implementation slice chosen and completed.

### P0 - Client Onboarding and Account Readiness

Must support:

- Add/onboard client quickly from admin/trainer flow.
- Assign correct role/account state.
- Mark client type: `move_fitness_internal` vs `swanstudios_paid`.
- Client can log in and see current next workout, past workouts, and progress.
- Trainer/admin can quickly find the client on mobile.
- Client cards should show glanceable vital info, not just decorative identity data.

### P0 - Workout Logging Persistence and Diary

Must support:

- Manual workout logging and Swan Coach dictated logging.
- Logs save reliably to the canonical workout history.
- Saved workouts remain available by day, week, month, 3-month plan, and reusable templates.
- Workout summaries can be generated after enough real sets/reps are entered, but the UI should explain or guide missing required data.
- Cancel/exit from unsaved workout state should require confirmation.

### P0 - Progress Proof Charts

Must support:

- Victory-based charts from real workout logs.
- A mega stats view similar to a game hero/stat page: most-performed exercises, least-performed exercises, volume, reps, intensity, streaks, improvements, and history.
- Client-facing proof-of-value: "here is what changed since last week/month."
- Admin/trainer intervention signals: stale clients, missed sessions, plateau risk, next best action.

### P0 - Session Purchase, Schedule, and Deduction Logic

Must support:

- SwanStudios paid clients buy sessions from the store.
- Move Fitness clients can use the app free/internal without paid session deduction.
- Universal Master Schedule tracks attended, no-show, canceled, late-canceled, and comped sessions.
- Trainer/admin can choose whether a session deducts or is preserved.
- Workout Logger should be reachable from the schedule in client context.
- Deduction should happen only through explicit eligible session completion/lock rules, with auditability.

### P1 - Swan Coach AI Hands-Free Operations

Must support:

- Voice/text AI assistant for onboarding clients, logging workouts, summarizing sessions, and pulling client history.
- Zero PII sent to LLMs unless privacy proxy rules are satisfied.
- AI-generated workouts should use client history, pain/injury context, equipment profile, goals, and previous adherence.
- Manual form flow remains available and simple.

### P1 - Dashboard Flow Consolidation

Problem:

- Coach Command Center, Clients & Team, Workout tab, and Workout Logger feel overlapping and overworked.

Desired direction:

- One clear training operations flow.
- Coach Command Center can be the AI/control layer.
- Clients & Team can be the roster and client context layer.
- Workout Builder can be planning/template generation.
- Workout Logger can be actual completed-session record.
- Cross-links should preserve client context and minimize clicks.

### P1 - Professional UX Polish Needed

Carry forward from prior findings:

- Theme synchronization across dashboards/components.
- PDF export failure in Workout Logger.
- Workout recommendation 500s and NaN chart/SVG errors.
- Exercise rolodex text overflow and card overlap.
- Boot Camp Creator should produce smarter low-impact/joint-friendly alternatives through AI context.
- Nutrition/store/revenue/dashboard backgrounds should stay dark-first and theme-token aligned.
- Client cards should use the premium Ultra Machine/glow card style where appropriate and include vital operating info.

### P2 - Broad Cleanup / Static Intelligence Backlog

Fallow branch-vs-main audit currently produces broad findings:

- Large dead-code and unused-export noise.
- Complexity findings.
- Duplication clone groups.
- Package-manifest unused-dependency warnings.

This is not a single auto-fix task. Treat as a separate cleanup workstream:

1. Start with current-slice regressions only.
2. For package dependencies, verify actual imports, runtime usage, scripts, dynamic imports, Render needs, and optional integration needs before removing.
3. For unused files, classify active runtime, script-only, migration/seed history, legacy referenced, dormant, planned, or archive candidate.
4. Get Sean approval before deletion or archiving.

## Hostile Review of This Handoff

Findings fixed before finalizing:

- Risk: prompt could trigger broad destructive cleanup. Fix: scope cleanup to current-slice regressions and require evidence/approval for deletion.
- Risk: prompt could bury revenue-critical work behind tooling. Fix: tooling is framed as a gate, not the product priority.
- Risk: duplicate surfaces could be patched without proof. Fix: next slice starts with Canonical Surface Receipt and Surface Classification Table.
- Risk: AI dictation could ignore privacy. Fix: Swan Coach work calls out zero-PII/privacy proxy requirements.
- Risk: session deduction could charge clients incorrectly. Fix: deduction logic is explicit, auditable, and trainer/admin-discretion based.

## Immediate Next Move

Run the Client Training Operations Readiness Audit, then implement the first narrow P0 fix that directly helps Sean onboard clients, log workouts, persist history, deduct sessions correctly, or show progress proof.
