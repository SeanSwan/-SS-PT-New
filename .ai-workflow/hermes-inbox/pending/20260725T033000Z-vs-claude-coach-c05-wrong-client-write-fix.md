# Swan Coach C0.5 — wrong-client write fixed (2 live defects, one destructive)

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 · **Commit:** `57a2c0322` on `claude/coach-hive-mind-20260724` — **not pushed, not merged**
**Prior:** C0 locate memo `20260725T024500Z-vs-claude-coach-hive-mind-c0-locate.md`

---

## The defect class (worth carrying — it recurs)

Swan Coach dispatchers receive **two competing client identities**:
- `params.clientId` — what the intent classifier extracted from speech
- `ctx.resolvedClient.id` — the client the trainer actually has selected

The selected client must win. `services/ai/dispatchers/clientScope.mjs#resolveCommandClientId` encodes that precedence once and validates the id is a positive safe integer. **It is advisory — a dispatcher must choose to call it.** 21 of 49 did. Four did not.

## Two live defects fixed

1. **`scheduleWriteDispatchers.mjs:115,157`** — `dispatchScheduleSession` + `dispatchRescheduleSession` read `params.clientId` while `ctx` was in scope and used two lines away (`:113`, `:120`). Writes at `:131` `Session.create` and `:161`.
2. **`sessionDispatchers.mjs:61`** — `dispatchCancelSession` **destructured** `clientId` from params and fed it to `Session.findAll({ where: { userId: clientId } })` — the query deciding **which session gets cancelled**. In-file docs call it the *"first live destructive trainer slice."* This is the more serious of the two.

Two further files (`workoutSessionCommandDispatchers.mjs:33`, `briefClientDispatcher.mjs:112`) hand-rolled the precedence inline. Not live defects, but strictly worse than the helper: `Number(resolvedClient?.id ?? params.clientId)` yields **NaN** for a malformed id, and no downstream NaN guard exists (verified). Converged.

## The lesson that generalizes: regex blind spots

C0's sweep used `grep 'params\.clientId'` and reported **2** unguarded. Reality was **4**. Two shapes escaped:
- `params?.clientId` — **optional chaining**
- `const { sessionId, clientId, date } = params` — **destructuring**, no property access at all

The destructuring form is how the *destructive* cancel path escaped both the original project-wide sweep and my own C0 pass. **A guard regex written for the shape you expect will miss the shapes that exist.** This is the second instance of the same class in this program — C0 §7 also had a false negative where a file aliased `window` to `speechWindow` before reading `SpeechRecognition`.

**Takeaway for any future sweep:** enumerate access *shapes* (property, optional-chained, destructured, bracket, signature-destructured, aliased) before trusting a count.

## The durable fix

`backend/tests/unit/dispatcherClientScopeInvariant.test.mjs` — an executable law with an **empty allowlist**, matching both access shapes. Every other dispatcher family already had a hand-written guard test; nothing enforced the rule *across the set*, so a new dispatcher could regress it silently — and did. Adding a dispatcher that reads the classifier id without the helper now fails CI.

Plus `scheduleWriteCommandClientScope.test.mjs` — 5 behavioral cases (schedule / reschedule / cancel prefer the selected client; params fallback preserved when nothing is resolved).

## Verification constraint worth remembering

`backend/node_modules` is **empty in every local tree** (main tree and worktrees alike) — backend vitest cannot run locally at all. Same baseline SWA-59 records. Workaround used: a dependency-free Node harness that imports the zero-dep helper for a real truth table and re-implements the invariant scan, proving **RED against pre-fix source via `git show <base>:<path>`** → **GREEN against the working tree**. 21/21. The committed vitest files are CI-deferred and were **not** run locally — disclosed, not claimed.

## Status / next

C0.5 complete and committed, awaiting Sean's call on whether to cherry-pick to `main` as a standalone security hotfix or batch per Rule 70. Next slice is **C1 — informed mind (SWA-63)**; note `coachIntakeContextService.mjs` (322 ln) and `coachContextEngine.mjs` (316 ln) both already exist and both breach the 300-line cap, so C1 inherits a decomposition obligation.

**Provenance:** Opus 5 (sub-Fable). Working memo only — **not** eligible for the durable Fable-tier learning corpus (Rule 68).