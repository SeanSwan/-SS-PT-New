# Swan Coach C2/C3/C4 shipped to main — 15 commits, one deploy

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65, SWA-63, SWA-66, SWA-67 · **On main:** `44f5747e3`

---

## Shipped

Batch of 15 commits, one Render deploy (Rule 70). Health 200 across 8 samples / ~5.5 min.

- **C2 core** — event-sourced intent log + truthful memory projection
- **C2 remainder** — offline queue that told the trainer it saved when it did not
- **C3** — one voice confirmation contract (fire-and-forget / read-back / deliberate)
- **C4** — intent-resolution eval, adopting a seed that sat dormant for 8 days
- Plus C0/C0.5/C1 docs, memos, and two durable learning packets

## The seventh "already built"

The offline queue existed and was wired. That makes **seven** planned build items that turned out to already exist across this program. The pattern is now beyond doubt: **in this codebase, trace before building, every time.** The plan's confidence about what is missing has been wrong seven out of seven times.

## Best defect of the batch

`useOfflineQueue.writeQueue` swallowed its error and returned `void`. `queueSubmission` then set `pendingCount` from the **in-memory array** and toasted *"Workout saved offline. Will sync when connected."* unconditionally. With localStorage full or blocked (private browsing — a case the code's own comment anticipated), the workout was gone and the trainer was told it was safe.

**Offline, mid-session, that is the worst failure shape available: silent data loss delivered with positive confirmation.**

Fix carries a lesson worth keeping: **absence of a throw is not evidence of persistence.** A storage backend that silently no-ops (quota-capped, sandboxed, extension-shimmed) throws nothing at all. Verify by reading back. That case is now a test.

## I shipped a dormant file and caught it in review

R4 of the hostile sweep found `voiceConfirmationTier.mjs` had **zero consumers** — the exact Rule 27 shape I had spent the whole program flagging in other people's code. It is legitimately unconsumable until a voice surface exists (gating commands behind a confirmation nothing can collect would break the lane), but that made labeling it mandatory rather than optional.

**Rule: a dormant file that says so is a plan; one that doesn't is rot.** Tracked as SWA-67 so it cannot repeat what `coachCommandCenterGoldenScenarios.mjs` did — correct code, right shape, zero importers, flagged in a hygiene inventory, still unwired 8 days later.

## Technique that unlocked this batch

`backend/` and `frontend/node_modules` are both empty, so neither test runner installs. Three techniques recovered real execution:
1. **Local `vitest` shim** in gitignored `node_modules/vitest` → real committed test files run **in place**. Copying them to a scratch dir breaks relative imports.
2. **`node --experimental-strip-types`** → TypeScript modules execute directly.
3. **Staged specifier rewrite** (add `.ts`) for extensionless Vite-convention imports.

Result: 78 committed assertions actually executed, not deferred. Where a stub would have faked behaviour rather than satisfied an import — a `zod` stub that made real validators return garbage — it was **removed** rather than kept for a greener number.

## Standing gap, now costing every ship

Still no release/commit marker. `/health` returns `{status,timestamp,server,checks,message}` and no `RENDER_GIT_COMMIT` exists anywhere. Every deploy is confirmable as *up* and never as *running the pushed commit*. Second batch in a row disclosing this. One `/health` field would retire it permanently.

**Provenance:** Opus 5 — designated Fable-tier by Sean 2026-07-25. Durable packets emitted separately.
