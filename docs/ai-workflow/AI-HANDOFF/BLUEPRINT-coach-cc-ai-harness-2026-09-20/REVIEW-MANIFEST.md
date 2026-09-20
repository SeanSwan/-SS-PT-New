# REVIEW MANIFEST — files the round-1 review actually read

**Reviewed at HEAD:** `ffe4f805e` on `creator-brains-engine-r2-20260915` · **tree:** DIRTY (~1,254 entries)
**Re-verified:** 2026-09-20, HEAD now `e2ec7c562` (two commits from other lanes landed during remediation —
neither touches this surface; see below)

**Why this exists (A1-15):** a commit hash cannot identify the reviewed bytes when most of them are modified
or untracked relative to it. Hash each file instead, and re-check the hash before trusting this review.

**Re-verification result (2026-09-20):** **15 of 16 hashes unchanged.** Only `useCoachCommand.ts` moved
(225 → 235 lines, `34edab791272f31f…` → `fcfbbbde6e303341…`), which is this round's own F-1 comment fix and
nothing else. That the other 15 are byte-identical across two intervening commits from other lanes is the
evidence that the reviewed surface was not concurrently edited.

| File | Lines | SHA-256 (first 16) | Changed since review? |
|---|---|---|---|
| `frontend/src/hooks/useCoachCommand.ts` | 235 | `fcfbbbde6e303341` | **yes — F-1 comment fix** |
| `frontend/src/hooks/useAIChat.ts` | 567 | `5e0782e860820deb` | no |
| `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts` | 244 | `3d614e37ed22f6e0` | no |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts` | 296 | `b12fba2ac4d59183` | no |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.commandLane.ts` | 105 | `124699e311399ab9` | no |
| `backend/services/ai/intentClassifier.mjs` | 254 | `9fde749d1754ebe5` | no |
| `backend/services/ai/commandExecutor.mjs` | 885 | `603981a9f455a9bd` | no |
| `backend/services/ai/commandLaneControls.mjs` | 37 | `b6f952a428df45d8` | no |
| `backend/services/ai/destructiveOperations.mjs` | 300 | `bd4cff9740ffbfed` | no |
| `backend/services/ai/inputSanitizer.mjs` | 96 | `e837c9cfd46f8602` | no |
| `backend/services/ai/phiScanner.mjs` | 188 | `1c2f37fe70716e34` | no |
| `backend/services/ai/commandAudit.mjs` | 153 | `ed40df1941a38e36` | no |
| `backend/services/ai/commandDispatcher.mjs` | 376 | `556a1507b6f65455` | no |
| `backend/routes/aiCommandRoutes.mjs` | 391 | `71f4bca8d6f37b80` | no |
| `backend/routes/aiChatRoutes.mjs` | 1090 | `52379170c272b5ae` | no |
| `backend/middleware/piiSanitizationMiddleware.mjs` | 330 | `4ca37b53f0fa1f97` | no |

**Intervening commits, checked for reachability into this surface:**

```
$ git log --oneline -- backend/services/ai/ backend/routes/aiCommandRoutes.mjs frontend/src/hooks/useCoachCommand.ts
```

- `026458dc6 fix(creator-brains-console): execute D7, close A1-09/10/11/12/15` — `packages/creator-brains-console/**`
  and docs. Does not reach the coach CC AI wiring.
- `e2ec7c562 fix(security): close four guard false negatives found by hostile review` — `backend/utils/startupMigrations.mjs`,
  email guard tests, mutation tests. Does not reach the coach CC AI wiring.

**Rule 4 note, recorded because it is the reason §0's scope error was easy to make:** `commandExecutor.mjs`
is **885 lines** against a 300-line cap. The guard for the classifier lives in that file, 20 lines above the
call it guards. A module this large is where "the guard is in the caller" stops being visible.
