# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/ss-jarvis-audit-20260821/.panel/PACKET.md
**Seed:** (none)
**Tokens:** 5894 in / 2069 out | **Cost:** ~$0.0487 | **Wall:** 23.6s | **finish_reason:** stop

---

# Hostile Review: Swan Coach Jarvis Readiness Audit

## 1. Findings the evidence proves FALSE or STALE

**P0 #1 — "Confirmation is not yet a security-grade approval protocol" — FALSE.**
This is the audit's headline finding and it describes a vulnerability that does not exist at the audited commit. The evidence is unambiguous:

- `aiCommandRoutes.mjs:365-378` — the `/confirm` route accepts **only** an `operationId`. There is no `confirmation.confirmed` field anywhere in the request contract.
- A repo-wide grep for `confirmed === true | confirmation.confirmed | req.body.confirmed` returns exactly one hit, in an unrelated session list filter.
- `destructiveOperations.mjs` already implements **everything the audit proposes as the fix**: server-side canonicalization and HMAC signing of `{id,type,endpoint,commandType,params,createdBy}`, `timingSafeEqual` verification, 120-second TTL, actor-bound retrieval, one-time consumption with replay protection (`pendingOps.delete` on every retrieve path), params frozen at mint, bulk caps, unscoped-DELETE rejection, and a kill-switch re-check at execution time.

The audit's own proposed replacement — "server creates a pending approval with expiry and nonce; user approves the approval ID; one-time token; params cannot change after approval; no replay" — is a description of the code that already ships. The auditor apparently read the frontend countdown UI, assumed the boolean flowed to the backend, and never read the confirm route. The hedge "appears to accept" is doing all the work. This P0 should be struck entirely, and with it goes a chunk of Phase 0 and the "completion gate" item "no sensitive command may execute from a client-authored boolean" — already true.

**P1 — "premium TTS simulates speaking duration with a timer" — STALE/FALSE.**
`usePremiumTTS.ts` calls real `window.speechSynthesis` — `getVoices()`, `speak()`, `cancel()` — at lines 130–171. Grep for `simulat|setTimeout|disabled` in that file: zero matches. The audit's "Voice behavior is internally contradictory" P1 rests partly on this claim, and the Phase 0 item "Remove or rename simulated TTS" prescribes work on code that isn't simulated. The broader fragmentation point (four voice paths, no unified state machine) survives, but its centerpiece example is wrong, and the "no hook should indicate speaking unless audio is playing" requirement may already be satisfied — the audit didn't check.

## 2. Findings that are REAL and correctly ranked

- **P0 — Branch protection off / eval gate unenforced.** Fully corroborated by E6: `protected: false`, zero required checks, and the gate runs only `npm run eval` — no tsc, no vitest, no frontend build, no E2E, no secret scan. This is the audit's strongest finding and arguably should be the sole P0. Correctly ranked.
- **P1 — In-memory transcription rate counter + localStorage quotas.** Real (E2 confirms the in-memory pattern exists), correctly ranked, but incomplete — see misses.
- **P1 — Surface-authored context.** Consistent with the four-lane fragmentation evidence; reasonable.
- **Registry count 134 and execution-class taxonomy.** Corroborated (E5), and the repo self-documents the 119-vs-134 doc drift.
- **UI authority limited to four allowlisted workout events.** Corroborated (E7). The audit's characterization is accurate.

## 3. What the audit MISSED

**The actual P0 in the confirmation lane (E2).** While inventing a fake confirmation bypass, the audit walked past the real one:

1. `OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY || crypto.randomBytes(32)...` — if the env var is unset in production, the HMAC key is random **per process**. Every restart silently invalidates in-flight approvals. Worse, the repo's own design doc (`GOD-LEVEL-AI-UPGRADE-PROMPT-V3.md:599, :806`) mandates the strict no-fallback form and lists the key in `REQUIRED_ENV` — the shipped code silently degrades from its own spec.
2. `pendingOps` is a per-process `Map` with Redis disabled in production. Mint-on-instance-A / confirm-on-instance-B fails under horizontal scale. The destructive-confirm lane is non-deterministic exactly where determinism matters most.
3. The audit flagged in-memory Maps **only** for the transcription rate counter (P1) and missed that the identical defect sits in the **security-critical approval store**. That's a severity inversion: the cosmetic quota counter got flagged, the approval store didn't.

**The capability truth report is half-built (E4).** `commandExecutionLane.mjs` already classifies every command into six lanes deterministically, and `commandRegistryCoverage.test.mjs` already **locks** it — asserting zero raw `not_wired` commands and pinning exact lane membership so new undispatched commands fail CI. The audit's P1 "generate a capability truth report" proposes greenfield work. The correct scope is narrow: promote the existing lane lock into a generated, versioned, UI-consumed manifest. An auditor proposing to build what exists signals they didn't run or read the test suite.

**Secondary inference:** because the eval gate is the *only* workflow touching AI code and branch protection is off, the existing `commandRegistryCoverage` lock also blocks nothing on merge — the audit noted the missing CI breadth but didn't connect that its own P1 truth-report mechanism already exists *and is unenforced*.

## 4. Verdict on the proposed architecture

**Directionally right, substantially over-engineered for the actual gaps, and in places it discards working code.**

- **Discards working code:** Phase 0's confirmation rewrite would replace a functioning HMAC two-phase commit with a redundant reimplementation. The real fix is ~10 lines (fail-fast on missing key, Redis-backed store), not a new approval engine. Similarly, `approvalEngine.mjs` in the Phase 1 runtime duplicates `destructiveOperations.mjs` instead of hardening it.
- **Over-engineered:** The full SwanRuntime / SwanUiIntent union / event engine / six-tier memory stack is a coherent end-state, but the audit's own evidence shows the binding constraints are (a) nothing enforces CI on main, (b) the approval store is per-process, (c) voice is fragmented. None of those require a turn-orchestration runtime to fix. Phases 1–2 are a multi-quarter re-platforming justified largely by "drift" symptoms (one-shot vs continuous recognition, per-surface context) that a shared context envelope and one voice service — both achievable without the runtime — would address.
- **Right:** The UI intent bus philosophy (typed, allowlisted, undoable, no direct DOM/CSS) correctly generalizes the existing four-event pattern rather than replacing it. The Phase 5 sandboxed-design-authority gate is appropriately conservative. Sequencing memory/proactivity last (Phase 4) is correct.

## 5. Corrected, dependency-ordered, severity-ranked fix list

**P0 — Security/integrity (do first, all small):**
1. **Enable branch protection on main.** Require the eval gate plus, at minimum, backend unit tests (which include the existing `commandRegistryCoverage` lock), tsc, and frontend build. This single change makes every subsequent fix enforceable. *(Audit had this right.)*
2. **Fail fast on missing `OPERATION_SIGNING_KEY`.** Remove the `randomBytes` fallback; throw at boot if unset. Add to required-env validation. Matches the repo's own design doc.
3. **Move `pendingOps` to Redis (or DB) with the same TTL and one-time-consumption semantics.** This is the real confirmation-lane fix — not the audit's protocol rewrite.
4. ~~Replace boolean confirmation with server-issued approvals~~ — **DELETE. Already implemented.**

**P1 — Truthfulness:**
5. **Promote the existing lane-classification lock into a generated, versioned capability manifest** consumed by the UI; do not build a new reporting system. Wire the existing coverage test into required CI (depends on #1).
6. **Move transcription rate limiting and AI usage quotas to Redis/DB** (tenant/user/feature/cost dimensions); keep localStorage for UI feedback only.
7. **Re-verify TTS claims before acting.** `usePremiumTTS` is real; drop "remove simulated TTS." Consolidate the four voice paths behind one voice-state service with the audit's explicit state machine — that part of the finding survives.

**P2 — Consolidation (only after P0/P1):**
8. Versioned `SwanContextEnvelope` consumed by all assistant surfaces — fixes the actual drift without a full runtime rebuild.
9. Incrementally extend the frontend dispatch allowlist using the existing typed-event pattern (the audit's "UI intent bus," scoped to what the product needs).
10. Defer the unified SwanRuntime, memory tiers, and proactive event engine until 1–7 land and are enforced in CI. Re-evaluate then whether the full runtime is warranted or whether hardened adapters suffice.

**Net assessment:** The audit's CI/branch-protection work is excellent and its architecture is a reasonable north star, but its headline security finding is fabricated from an unread route, it missed the real approval-store defect sitting in the same file, it proposed rebuilding two things that already exist, and its stale TTS claim undermines confidence in its frontend evidence-gathering generally. Trust E6; strike E1/E3 claims; re-scope everything else downward.
