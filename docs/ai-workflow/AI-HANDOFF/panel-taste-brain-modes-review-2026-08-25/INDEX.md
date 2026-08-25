# Hostile Review Panel — 2026-08-25

**Document under review:** `docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET.md`
**Seed context:** (none)
**Seats run:** ox, glm, hy3, kimi, dspro · **Estimated spend:** ~$0.1140
**Coverage:** PARTIAL — 5 of 11 seats ran (sol, qwen, gemini, grok, fable, dsflash not requested).

> Fable 5 is the FINAL SEAT and the Final Decider (CLAUDE.md Co-Orchestrator
> Hierarchy, Rule 46). These seat replies are ADVISORY INPUT. Fable reads all
> of them, arbitrates contradictions against the house rules, and owns the
> verdict. A seat reply is a HYPOTHESIS until verified (Rule 30) — findings
> must be checked against the real code before any of them is acted on.

| Seat | Model | Status | Wall | Reply |
|---|---|---|---|---|
| ox | Ox Alpha | ✅ ok | 197.4s | [reply](./OX-ALPHA-PANEL-REVIEW.md) |
| glm | GLM 5.3 | ✅ ok | 244.4s | [reply](./GLM-PANEL-REVIEW.md) |
| hy3 | HY3 (Tencent) | ✅ ok | 141.3s | [reply](./HY3-PANEL-REVIEW.md) |
| kimi | Kimi K3 | ✅ ok | 242.4s | [reply](./KIMI-PANEL-REVIEW.md) |
| dspro | DeepSeek V4 Pro | ✅ ok | 94.8s | [reply](./DEEPSEEK-PRO-PANEL-REVIEW.md) |

## Failures
- none — all seats returned.

## Fable synthesis

Full synthesis: [FABLE-SYNTHESIS.md](./FABLE-SYNTHESIS.md). Actual spend: Kimi $0.1248 · DeepSeek $0.0273 · HY3 $0.0052 · Ox/GLM $0 → ≈ $0.16.

1. **Consensus** — partner Midlibrary opt-in breaks the licence law (4 seats) → removed, full pool = Sean only from the profile, brief picks filtered; replay/overlap double counting (4 seats) → never-show-twice enforced at the writer; no undo (3 seats) → `reversal` wired, Undo on page + bundle; pool exhaustion (2) → stated with a hint; P1 empty for partner/client + generator ignores the profile (2) → tie-in built with tiered confidence; P2 `file://` contradicts the schema (3) → P2 contract corrected, not built.
2. **Contradictions** — HY3 "styled-components/Victory violated" vs Ox "outside the SaaS rules": **ruling = outside** (local no-build tool; the judging well stays neutral gray by design). Kimi "server-issued sessionId" and GLM "HMAC bundles": rejected for a two-user loopback tool; the origin gate + writer laws bound the risk.
3. **Unique insight** — Ox: `appendEvent(dir)` seam (kept, documented; no server caller uses it); GLM: bundle inlines a `probe.js` snapshot → refusal reasons must surface (they do); Kimi: generator bias becomes taste bias in the render loop → partition generated provenance in `tally`; DeepSeek: Who-select mis-click → pill + Done label + undo.
4. **Blind spots** — mine, not theirs: the packet quoted `validateEvent` without its first guard (two seats spent a P1 on a hole that does not exist); my P2 sketch said `file://` after quoting the schema that refuses it; I had documented a licence relaxation as "Sean's call".
5. **Verified verdict** — REVISE was right. **Refuted** with evidence: unknown-source bypass (guard precedes the branch), `/api/event` ungated (gate runs before every POST route — now proven by route: 403 on `/api/event`, `/api/keep`, `/api/projects`), append race (sync fs). **Fixed** in taste-brain `7f1850d` (laws) · `322dc0d` (tie-in) · `d6a58d7` (undo/UX); proof: modes 69 · tie-in 23 · bundle 25 · probe 81 · test 52 PASS; headless-Chromium 41/41.
