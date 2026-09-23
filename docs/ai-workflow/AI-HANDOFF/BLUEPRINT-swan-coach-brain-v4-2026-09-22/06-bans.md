# 06 — Bans

Each ban names the finding that earned it. A slice that breaks a ban fails its checkpoint,
however green its tests are.

## Lineage and process

1. **No coach-path edits outside the canonical branch.** After P0, a commit that touches `backend/services/ai/**`, `backend/services/coach-brain/**`, `coach-assistant/**`, `coach-workspace/**`, `useAIChat*` or `useCoachCommand*` on any other branch is refused by `scripts/check-lane-lock.mjs` (C1, H8).
2. **No two agents in one worktree.** A lane lock names one owner. A second agent reads it, and does not write (C3; the 11:43 worktree deletion).
3. **No hostile review of a non-canonical branch** is filed as authority for coach work. Rounds 1–6 on the fork are the precedent (C1).
4. **No new coach planning document outside this package.** Append a dated section here or add a numbered companion file here. There are 114 coach doc files already (H8).
5. **No push from the damaged repo.** Push from the verified-clean clone named by `2026-09-21-221624-git-object-store-round-3` until a clean `git fsck` is recorded (C3).
6. **No Linux-side git write** against the Windows repo from a VM or WSL seat. Read-only runs with `GIT_OPTIONAL_LOCKS=0` (L2).

## Brain

7. **No client-side routing of intent.** `shouldRouteToCommandLane` / `isCommandLaneCandidate` must not gate v4 turns (H1).
8. **No model-visible write execution.** A write tool returns `approval.required` and nothing else. No streamed delta, tool result or model text can cause a mutation (J06).
9. **No hard-coded model identifier** in `coach-brain/**`. Model IDs live in the registry (H5).
10. **No second provider-selection path.** All coach inference goes through `brainRouter` (H5; round-1 S5 intent).
11. **No regex as the privacy admission gate.** Regex is defence-in-depth only. Admission is roster aliasing, ID-only structure and the provider allowlist (H7, §P).
12. **No unbounded loop.** Every turn carries round, tool, wall-time and token budgets, and a timeout **aborts** its request (M4).
13. **No second approval store.** Proposals and commands share `approvalLedger` (H2).
14. **No activating memory without a human.** `factProposer` writes `proposed` rows only (`CoachFact.mjs` invariant).

## UX

15. **No silent terminal state.** Every refusal, failure or loss renders a sentence and a next step (C2, M5).
16. **No second composer.** One input per workspace (M1).
17. **No duplicated client selector.** The client exists once: the composer chip, mirrored read-only in the header (M1).
18. **No hard-coded colour literal** in `coach-workspace/**`. Use lens tokens via `workspaceTokens.ts` (J14; 210 literals today).
19. **No press-and-hold-only microphone.** Toggle semantics with a visible state (live blueprint §8).

## Code

20. **No addition to a file over 300 lines.** Split it first, along a real seam. This covers `aiChatService.mjs` 2,406, `useAIChat.ts` 1,398, `aiChatRoutes.mjs` 1,343, `commandExecutor.mjs` 1,282 and `aiCommandRoutes.mjs` 904. No compressing code onto 200-character lines to pass the count (M3).
21. **No test that supplies the precondition its shipped caller omits** without a paired test through the real caller. See `useAIChat.retirement.test.tsx` vs the staff binding (C2) and R7-08.
22. **No "green" claim without the mounted smoke.** The unit suites passed while the mounted chat was dead (C2, M6).
23. **No new `.mjs` migration.** Use `.cjs` only (`retired-mjs-20260804/README.md`). No editing of historical migrations in place: forward migrations only (A1-05).
