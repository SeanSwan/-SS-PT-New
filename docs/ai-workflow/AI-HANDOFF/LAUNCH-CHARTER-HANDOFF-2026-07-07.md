# Launch Charter — Fresh-Session Handoff (2026-07-07)

Paste the block below into a new chat to resume the SwanStudios launch loop with zero re-briefing.

---

## HANDOFF PROMPT (copy from here down)

You are Fable 5, Final Decider, resuming Sean's **SwanStudios launch loop** mid-flight. Do NOT restart — continue.

**Read these first, in order (nothing about this mission lives only in chat):**
1. `docs/ai-workflow/brainstorms/launch-readiness-master-prompt-2026-07-06.md` — the Launch Charter (mission file). Read §11 Mission Status Log LAST-first for current state.
2. `docs/ai-workflow/AI-HANDOFF/LAUNCH-READINESS-AUDIT-2026-07-06.md` — Phase 0 defect ledger (P0–P3) + receipts.
3. `docs/ai-workflow/brainstorms/blueprints-2026-07/01-workout-logger-planner-convergence.md` — Phase 2 blueprint already written.
4. `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md` (Rule 67).

**Where the work lives:** isolated worktree `c:/tmp/ss-launch-20260706`, branch `claude/launch-charter-20260706`, off `origin/main 6e730975d`. node_modules are junctioned from the shared tree (frontend/backend/root). If the worktree is gone, recreate: `git worktree add c:/tmp/ss-launch-20260706 -b claude/launch-charter-20260706 origin/main` then junction node_modules with `cmd //c 'mklink /J <wt>/node_modules <shared>/node_modules'` (×3: root, frontend, backend).

**7 code/doc commits are LOCAL and UNPUSHED** (Sean's rule: ONE push at the very end after a final all-phases hostile review — NOTHING before):
```
ed808aa04 Phase 0 audit doc
45d493e27 P0-1 remove simulated wearable vitals from live VideoRoom
20207a087 P0-2 scrub false "NASM-certified" -> NASM-protocol (14 sites + lock)
705563c93 P1-1 invitation-only training-package pricing, server-enforced (6 rails)
c172b677d P1-3 hero fallback backdrop + P1-4 per-card chart SafeChart boundaries
912ed3884 P1-7 Coach Draft two-click consent-override-trap fix
14edeff1b Phase 2 blueprint 01 (logger/planner convergence)
```

**Operating rules (Sean, this session):**
- Work CONTINUOUSLY, no ScheduleWakeup idle pacing (memory: no-wakeup-pacing-work-continuously). Slices back-to-back with a hostile review between each.
- Commit per slice locally; do NOT push per slice; ONE batch push at the very end (Rule 70).
- Loop does NOT stop until ALL phases built → final all-phases hostile review → clean → push to Render.
- Every slice: failing-first test where feasible → build → slice-internal hostile review + fixes (Rule 61) → targeted tests + `tsc --noEmit` 0 + `vite build` OK + `node --check` + import-exec smoke → commit local.
- Rule 52/56: verify pre-existing baseline fails via stash A/B before blaming your change. Money-path changes → Codex review mandatory (Rule 46).

**STATUS:** Phase 0 ✅ · Phase 1 ✅ except P1-2 (blocked on Sean's numbers) + P1-5 (trainer-logger, → Phase 3 build) · Phase 2 blueprint 01 ✅. Phases 3–8 NOT built. This is ~15-20% of the charter — NOT launch-ready; do not claim otherwise.

**BLOCKED ON SEAN (get these before closing Phase 1 / pushing):**
1. Real marketing numbers — clients transformed, satisfaction %, years, testimonial consent (fixes P1-2 stat contradictions: 500+ vs 1000+, 98% vs 97%, 840+ vs 900+ vs ~736).
2. AI provider key (OPENAI_API_KEY or ANTHROPIC_API_KEY) in Render env — THE reason Coach Draft "never works" (silent degrade to templates; providerRouter.mjs needs it; local .env has only GEMINI which that path doesn't use).
3. D-B direction pick: logger/planner CONVERGE (recommended) vs REBUILD.

**NEXT BUILDABLE (no Sean input needed) — do these:**
- Phase 2 blueprints: 02 nutrition-production (wire the orphaned camera BarcodeScanner + hydration server-sync + retire duplicates), 03 charts + Workout Rolodex + PR-celebration engine, 04 home/about refactor, 05 Mobility Board (Phase 4B — Sean's "real money" feature; engine already live-wired OHSA→MovementProfile→correctiveExerciseService→CorrectiveRecommendationsPanel, gap = tag backfill 32/~150 + Board view + myofascial-release/SMR content).
- Then Phase 3 build once Sean picks D-B.

**OPEN REVIEW:** Codex money-path hostile review of P1-1 price gating is OPEN in review-queue (his storefront/Stripe R8 lane) — do not push P1-1 until he weighs in.

**NEW P0 — PRODUCTION DATA RESET (Sean 2026-07-07, DESTRUCTIVE — DO NOT EXECUTE BLIND):** the prod DB is full of test/chatbot accounts. The ONLY real people are **Ron, Jesse, Jasmine, Sean, Vicky, Anand** (6). Sean wants everything else removed so new signups land in a clean, realistic dataset. This is production + PII + irreversible + heavy FK cascade (users → workout_logs/sessions, payments/orders, gamification, social posts, "Users" vs users dual-table). MANDATORY safe sequence, get Sean's explicit approval at each gate:
  1. READ-ONLY inventory (Rule 47 launcher): count all users, classify real-6 vs test by email/created pattern; enumerate every FK table that references a user and row counts per user. Map the 6 names → user IDs WITHOUT leaking PII into chat (Rule 8/49/59 — output IDs + counts only).
  2. Full DB backup / snapshot FIRST (Render PG) — no delete without a restore point.
  3. Dry-run: exact delete set + cascade preview (what rows in which tables die) → Sean approves the literal ID list.
  4. Decide semantics with Sean: hard-delete test accounts + their data, vs soft-deactivate; preserve the 6 real people's REAL data (Sean's own workouts, real client sessions). Also whether to wipe seeded demo/mock data (fake gamification, test storefront items) so charts start from real logs only (ties to charter data-truth rule).
  5. Execute inside a transaction with cascade awareness + the dual users/"Users" FK gotcha; verify counts after.
  This is launch-blocking (don't launch on fake data) — treat as Phase-1 P0 hygiene. Sean owes: the 6 real accounts' emails/IDs (or run the launcher to resolve), and the hard-delete-vs-deactivate + wipe-seed-data decisions.

**Sean also asked (charter asks 13-19, in the mission file):** Recovery/Mobility Board (myofascial release = "real money"), Level-1 "First Flight" emblem glow-up (animated), Plan Library upgrade, Build Plan keep/kill (verdict=MERGE), Coach Draft reliability (trap fixed; key pending), charts pulling nutrition+biometrics, continuity so any AI resumes seamlessly.

First action: read the 4 docs above, confirm the worktree + unpushed commits are intact (`git -C c:/tmp/ss-launch-20260706 log --oneline origin/main..HEAD`), then continue with Phase 2 blueprint 02 (nutrition) unless Sean redirects.

---
## END HANDOFF PROMPT
