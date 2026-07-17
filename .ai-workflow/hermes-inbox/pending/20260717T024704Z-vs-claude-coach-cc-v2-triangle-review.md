---
surface: vs-claude
utc: 20260717T024704Z
topic: Coach CC v2 — triangle review found the batch is fully built but shipped 2 verified draft bugs; a scary security finding was FALSE
tags: [coach-command-center, fusion-triangle, tooling-debt, review-doctrine]
---

## What I did / learned
- **Coach CC v2 has nothing left to build.** Fable forged the v2 plan (de958f58b) AND built ~all of it AND self-hostile-reviewed it AND shipped to auto-deploying main. Only P0.2 (Sean's on-device XR — human gate) and P1.1 (streaming, parked on the B1b SSE spike) remain. P2.2 metrics shipped (b3fc86f97). The "unpushed prod 500 fix" cf24f563d is ALREADY on main.
- **Two premises went stale mid-session** — origin/main moved 2a9c60bee → f54b5a6aa while I worked. A session-start fetch is NOT a durable fact. Re-fetch before judging. (The standing "verify branch freshness before auditing" lesson fired for real.)
- **B1 [VERIFIED ×2 RED probes] — the batch's own features cancel each other.** `useCoachComposerDraft` keys drafts on thread only (`swan-coach-draft:${threadKey ?? 'new'}`) — no user, no client — while the composer is client-scoped and `useCoachClientNotebook.ts:66-71` clears it unconditionally on clientId change. Both hooks mount 3 lines apart (controller.ts:174/:177). Result: (a) tapping a recent-client chip DESTROYS a dictated draft; (b) a note typed for client A can surface in a composer pinned to client B via new→thread→new navigation — wrong-client record contamination on the Core Loop. Gemini predicted (b) blind; a probe proved it.
- **Root cause of the whole class:** all 9 v2 features were unit-tested IN ISOLATION; nothing tested them COMPOSED. That is exactly how "1026/1026 green" coexisted with a broken product.
- **A panelist's top finding was FALSE and I retracted it before it spread:** "/api/ai-chat/tts is an UNAUTHENTICATED public Gemini proxy billing Sean's key." Probe → 401; a NONEXISTENT route under /api/ai-chat also 401s (gate precedes route matching); /api/health → 200. Cause: `router.use(protect)` at aiChatRoutes.mjs:305. Its Rule-31 walk checked per-route + mount-level middleware and missed ROUTER-level. Same agent cited a line number for `expiresAt` that lives in a different file.
- **A subagent edited a worktree despite an explicit read-only instruction**, corrupting two test runs before I noticed (the "failures" I saw were its own half-finished tests, not main's). Rule 67 read-before-edit needs to cover subagents, not just Claude↔Codex.

## Why it matters to Hermes
- **Do NOT repeat the "/tts is open to the internet" claim.** It is false and would trigger a pointless fire drill. If it resurfaces from any agent, the counter-evidence is aiChatRoutes.mjs:305.
- **Rule 30 (subagent skepticism) + Rule 55 (probe, don't prescribe from a file read) are load-bearing, not ceremony.** Three curls killed the scariest finding of the review in five seconds. Treat ANY panel/subagent output — including mine — as hypothesis until probed.
- **A builder self-reviewing does not satisfy Rule 52's "recently-passed gate."** Rule 52 has exactly two triggers (a *CLOSEOUT* artifact, or a dated OPUS-CODEX-DEBATE containing APPROVE). Neither existed for this batch, so verification is not re-litigation. Claude, Gemini, and an independent Claude panelist agreed independently.
- **Tooling debt Hermes should route around:** `scripts/fusion-triangle.mjs` returns `synthesized=false brains=[]` (0 answers, needs ≥2) while EXITING 0 — the free-triangle launcher is effectively down. Gemini's CLI is auth-dead: `gemini -p` returns empty with exit 0, though `--version` (0.17.1) answers — **a version check is not a liveness check** (I wrongly called the 2026-06-19 continuity note stale on that basis; the note was right). Working path: `scripts/consult-gemini.mjs` (API key), but it resolves --file relative to repo root and returns "File not found" with exit 0.
- **Lying gates hit 4× in one session** (tsc OOM read as 0 errors via `grep -c`; vitest from a worktree root loading the wrong config; wrappers exiting 0 on real failure ×3; an unknown-flag crash reported as success). Standing rule: echo the REAL exit code; never trust a piped/wrapped status.

## State right now
- Plan committed: `docs/ai-workflow/AI-HANDOFF/COACH-CC-V2-FINISH-PLAN-TRIANGLE-2026-07-17.md` (73d385397). Two RED probes at 31c446a60. Branch `claude/coach-cc-v2-20260717`. **Local only — nothing pushed, nothing fixed.**
- Plan is 5 phases, zero new features: P1 fix the draft root cause (composite user:client:thread key + reconcile the TWO pre-existing draft systems + a composition test harness) → P2 three smaller truth bugs (confirm card counts 120s from mount and ignores the server's real expiresAt; Read-aloud inert by default; recent chips render out-of-scope clients) → P3 /tts paywall+PII parity → P4 the missing rule-48 audit record + Codex review → P5 Sean's XR gate.
- Codex REQ posted in review-queue; its seat in the triangle is still empty.
- An unreviewed candidate fix from the rogue subagent is preserved as a patch (input to P1, NOT accepted work).

## Sean owes / blockers
- **GO decision on Phase 1** — no build starts without it.
- **Decision on Read-aloud:** wire it to a real enable path, or cut the button. A silent no-op button is worse than none.
- P0.2 on-device XR pass (keyboard inset while typing; mic waveform during real dictation) — only Sean can do this.
- Confirm cf24f563d actually recovered the admin surface in prod (on main ≠ deployed ≠ working).
