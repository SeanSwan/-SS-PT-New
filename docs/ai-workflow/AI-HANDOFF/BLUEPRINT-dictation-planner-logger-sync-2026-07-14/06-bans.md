# 06 — Bans (do NOT)

## House rules (restated for a context-free builder — violations = automatic REVISE)
- NO Material-UI. styled-components only, `var(--token, #fallback)` colors, dark-first.
- NO hardcoded hex outside fallbacks. Palette in 02. WCAG 4.5:1.
- 44px minimum touch targets; keyboard focus-visible on every control; no hover-only actions.
- ≤300 lines per file; blueprint header on components >100 lines.
- Victory only for charts (none expected here). No yoga/meditation wording anywhere.
- Zero PII to LLMs beyond what the existing coach lanes already send (Rule 8). Never put client
  health notes in command context.
- styled-components shared fragments with `${}` interpolation → the `css` helper (error-12 class).
- No `git add -A`. Commit style `type(scope): description`. ONE push at end (Rule 70).
- No `git commit --amend`/rebase/force-push. No secrets in code, tests, or docs.
- Tests first where feasible; never claim green without pasting output (Rule 19/51).

## Feature-specific bans
1. **Do NOT create a new chat lane, socket, WebRTC, or streaming channel.** The command lane
   (`/api/ai-command/execute`) + `useAIChat` fallback is the ONLY transport.
2. **Do NOT execute planner edits server-side.** `planner_*` commands are `FRONTEND_DISPATCH`
   only — the server never touches `workout_plans` for these; state changes happen in the open
   planner via events. (Persistence stays behind Sean's existing Save/Update buttons.)
3. **Do NOT auto-save or auto-activate a plan after a dictated edit.** Dirty-state lights up; the
   human clicks Save/Update. (Trainer-indispensability + review-before-persist doctrine.)
4. **Do NOT import `CoachConsoleDock` or Command-Center hooks wholesale** into the planner —
   mimic their patterns in the new slim dock (they are page-shaped, carry ops-rail deps).
5. **Do NOT touch** `useWorkoutPlanLoading.ts` internals, `useWorkoutAiEvents.ts`,
   `workoutBuilderService.mjs` selection logic, `waiverGate.mjs`, auth routes, or the PDF
   attachment services. This feature composes them; it does not edit them (S6 adds tests only).
6. **Do NOT give the `planner_*` commands to the `client` role.** Admin + trainer only. Clients
   keep `request_plan_adjustment`.
7. **Do NOT put interim dictation text into the editable textarea value** — interim renders as a
   hint below (established voice UX law from the 2026-07-14 Coach voice rewrite).
8. **Do NOT add chat fallback inside the Workout Logger strip** — logger dictation is
   command-or-honest-failure only (chat belongs to Coach surfaces and the planner dock).
9. **Do NOT auto-commit suggested weights** (S5) — placeholder + tap-to-fill chip only.
10. **Do NOT re-implement swap/remove logic** — reuse `workoutPlannerHorizonSwap.helpers.ts` and
    the existing builder-row setters. One source of truth for plan mutations.
11. **Do NOT rename or repurpose the existing `AI_*` logger events** — additive `AI_PLANNER_*`
    family only. `frontendDispatchReceipt` honesty must keep working for both families.
12. **Do NOT exceed +6 net lines in `WorkoutPlannerPage.tsx`** — it sits at the 300-line
    extraction-test cap. Extract to hooks instead.
