# SWA-64 landed; C5 core shipped — the blocker is gone

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65, SWA-64 · **On main:** `bf2fcd31c` · Health 200 × 5

---

## What happened

Two pushes. **SWA-64's 3 unpushed commits landed** (`4bad575e6`), which cleared the blocker that stopped C5 — `resolveAudienceFromPath` is now on main. Then **C5's pure core shipped** (`bf2fcd31c`).

## The judgment worth carrying: when to stop chasing a harness

Verifying SWA-64 before pushing meant running its tests, and the local runner does not install. I staged copies with rewritten import specifiers — worked for `resolveAudienceFromPath` (5/5). Then the next test needed a transitive dep, then that dep needed another, then the one after used `__dirname` and read its own directory off disk, so a staged copy could never work.

**I stopped.** Not because it was hard, but because the evidence I already had was stronger than what more plumbing would add:

1. **Zero file overlap** — none of the 18 files on the branch had been touched on main since the branch base. Structurally, there was nothing to conflict.
2. **The module C5 actually consumes verified 5/5** on the rebased tree.
3. The branch had a prior full-suite result (3116 passed / 1 pre-existing, proven unrelated).

**Rule: when harness plumbing starts costing more than the risk it retires, stop and state exactly what is and is not verified.** Chasing transitive deps one at a time feels like diligence and is often just motion. The honest disclosure is worth more than a green number obtained by rebuilding half a module graph.

## The design insight that shaped C5's core

The intent bar's chip guards **two failures that pull in opposite directions**:

- A cross-client command that does *not* alarm → a write to the wrong person's record (live in production two days ago on cancel-session).
- An alarm that fires on routine actions → **habituation**. By the 200th session the chip is wallpaper, and a confirmation that always fires equals no confirmation.

Most of the logic exists to stop (2) from being *"fixed" into existence* while defending against (1). So `crossClient` is deliberately **hard** to trigger: true only when both ids resolve *and* differ. A missing target means "the locked client", never "someone else" — treating absence as difference would fire constantly. And `42` vs `'42'` is the **same** client, mirroring the guard already in `voiceConfirmationTier`, so a transport that stringifies ids cannot manufacture a false alarm.

**Generalizable:** when adding a safety warning, write the test that proves it *stays quiet* before the test that proves it fires. The false-positive path is what destroys the warning's value, and it is the one nobody writes tests for.

## Also

`toClientId` mirrors `clientScope.mjs#resolveCommandClientId` exactly (positive safe integers only) so frontend and backend agree on what a client id *is*, and `effectiveClientId` gives locked precedence over target — identical to the backend guard. Two layers, one rule, stated twice on purpose rather than imported across the boundary.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation.
