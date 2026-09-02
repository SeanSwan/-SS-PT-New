# R4 — GPT-5.6 Sol filesystem hostile pass: arbitration record

- **Date:** 2026-09-02 · **Arbiter:** Claude Fable 5 (Final Decider) · **Seat:** GPT-5.6 Sol (Sean-driven, filesystem access to the worktree AND the real swan-taste-brain source)
- **Sol's verdict:** REVISE (branch as a whole). **Arbitration outcome: sustained in full — 10/10 findings verified REAL.** This is the strongest external pass of the workstream: it re-opened source files and the real API implementation, which the GLM rounds (by design of their prompts) never did.

## Finding-by-finding arbitration (each re-verified by the lead before repair)

| # | Sol's finding | Lead verification | Repair |
|---|---|---|---|
| P0-1 | `writeOffline()` destroyed the last-known-good snapshot | REAL — old code unconditionally overwrote `taste-profile.local.md` | Rewritten: outage → separate status file; snapshot preserved; atomic writes. Regression test proves the old behavior fails |
| P0-2 | Directions projected via nonexistent `name`/`codes` fields | REAL — live `compileProfile({write:false})` probe: fields are `id/tier/title/because/srefs/themeWords/prompts/note/evidenceEventIds`; `name`∉, `codes`∉. My mock test had "passed" because the mock shared my wrong assumption | Projection rewritten to real fields; fixture mirrors the probed shape; 12 node:test checks green |
| P0-3 | Identity check not authoritative (counts, not `sourceHash`) | REAL — real API ships `snapshot.schemaVersion === 'taste-snapshot/1'` + 64-hex `sourceHash` (taste-snapshot.mjs:13,73-77; routes-modes.mjs:185-199) | Validator requires schemaVersion + sourceHash; fingerprint = sourceHash; counts demoted to metadata |
| P0-4 | T4 (routed placeholder Videos tab) is FALSE | REAL — trainer `/videos` → `VideoLibraryPage` (routes.tsx:179,193); `TrainerVideosPage` is an unrouted lazy export (routeComponents.tsx:84) | T4 withdrawn in rev 3; orphan folded into X5; "gate the Videos tab" slice deleted; trainer verdict recomputed (REVISE on T2) |
| P1-5 | A1 "8th of 8 / last" is wrong — 8th of 11 | REAL — three bands follow Operations (Ops Intelligence, Community Safety, Telemetry; AdminOverviewPanel.tsx:198-292) | A1 corrected with lead-verified order; argument rebuilt on the real order |
| P1-6 | C1 overbroad — stat tiles distinguish error (`—`) from zero | REAL — `weeklyRecapError ? '—' : value` verified; real defect = WeeklyRecapCard collapses failure into "No weekly recap available yet." with no retry | C1 narrowed to the recap card |
| P1-7 | GLM PASS chain was prose-to-prose, not ground-truth | REAL — R2's prompt restricted evidence to the review's own quotes; R3 verified arbitration fidelity | Scope caveat added to the review log; future review-of-review prompts must grant file access or say what they cannot prove |
| P1-8 | Learning packet preserves false facts | REAL | Packet superseded-in-part with a correction banner + new ledger entries (same commit) |
| P1-9 | Governance drift: closeout-evidence-lock still cites dry-loop-gate as active; "Evidence gates (4)" heading over 6 rows | REAL (SKILL.md:108; CLAUDE.md:1037) | Both corrected; mirror re-synced |
| P2-10 | Router SKILL.md 357 lines | REAL — though the pre-branch baseline was already 304 (>300 before this work) | Step 3.5 detail extracted to `design-brain/style-intelligence.md`; router now 320. **Arbitrated-partial:** going <300 requires cutting pre-existing Kimi-redo canon — out of a repair slice's remit (surgical-change law); flagged as its own reviewed slice |

## What Sol exposed about the PROCESS (the durable part)

1. **[LIKELY] tags were load-bearing in a shipped verdict.** Two rev-2 verdict drivers (T4, A1-as-last) were agent receipts nobody re-opened. Corrected law for this artifact: no finding may DRIVE a verdict or a ranked slice while tagged [LIKELY].
2. **A mock that shares your assumption cannot falsify it** — recurred here (P0-2) despite an existing learning packet with that exact title-lesson. The fix that survives is procedural: fixture shapes must be derived from a probe of the real implementation, never typed from memory.
3. **Review-of-review passes validate editing, not truth.** The GLM chain did its assigned job; the assignment was too narrow to catch route-level falsehoods. Panel design now needs at least one seat with file access whose remit is receipts, not prose.

## External-model calibration (R4)

GPT-5.6 Sol: 10/10 findings real on verification (4 P0, 5 P1, 1 P2-partial), zero disproven, plus a correct process diagnosis. It also ran its own verification battery (node --check, mirror --check, git diff --check) and respected the no-push/no-edit boundary. Highest-precision hostile pass of the workstream; the filesystem access is what made the difference, not the model tier alone.
