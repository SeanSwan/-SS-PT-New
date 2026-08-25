# Hostile Review Panel — 2026-08-25

**Document under review:** `docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET-R2.md`
**Seed context:** (none)
**Seats run:** ox, glm, hy3, kimi, dspro · **Estimated spend:** ~$0.1274
**Coverage:** PARTIAL — 5 of 11 seats ran (sol, qwen, gemini, grok, fable, dsflash not requested).

> Fable 5 is the FINAL SEAT and the Final Decider (CLAUDE.md Co-Orchestrator
> Hierarchy, Rule 46). These seat replies are ADVISORY INPUT. Fable reads all
> of them, arbitrates contradictions against the house rules, and owns the
> verdict. A seat reply is a HYPOTHESIS until verified (Rule 30) — findings
> must be checked against the real code before any of them is acted on.

| Seat | Model | Status | Wall | Reply |
|---|---|---|---|---|
| ox | Ox Alpha | ❌ failed | 0.6s | — |
| glm | GLM 5.3 | ✅ ok | 271.8s | [reply](./GLM-PANEL-REVIEW.md) |
| hy3 | HY3 (Tencent) | ✅ ok | 239.4s | [reply](./HY3-PANEL-REVIEW.md) |
| kimi | Kimi K3 | ✅ ok | 139.8s | [reply](./KIMI-PANEL-REVIEW.md) |
| dspro | DeepSeek V4 Pro | ✅ ok | 600.5s | [reply](./DEEPSEEK-PRO-PANEL-REVIEW.md) |

## Failures
- **ox** — exit 75 (no output): mit_source":"upstream_provider_shared_pool","remedy_hint":"Retry shortly, add your own provider key (https://openrouter.ai/settings/integrations), or route to another provider with provider routing: https://openrouter.ai/docs/features/provider-routing"}},"user_id":"user_331bflPEvr7vdrTesenqnZ2lBdC"}

## Fable synthesis

Full synthesis: [FABLE-SYNTHESIS.md](./FABLE-SYNTHESIS.md). **Ox retried once after the 429 → [ox-retry/OX-ALPHA-PANEL-REVIEW.md](./ox-retry/OX-ALPHA-PANEL-REVIEW.md) (REVISE, $0).** Actual spend: Kimi $0.0918 · DeepSeek $0.0239 · HY3 $0.0076 · Ox/GLM $0 → ≈ $0.12.

1. **Consensus** — minting on a GET behind a POST-only gate (4 seats) → `POST /api/intent`; pair replay escaped never-show-twice (3) → writer guard covers every judgement kind; `tasteSource` mislabel (2) → one vocabulary; renders count 0 toward style, not 0.5 (2) → built that way; generated picks must not feed keywords → filtered; render URLs must be absolute + namespace-bound (2) → `/renders/<profile>/<project>/<token>/<n>`.
2. **Contradictions** — "one floor" (Kimi): measured against Sean's real memory a per-code floor of 2 leaves zero endorsements → ruling: two floors, documented, not merged. HMAC / server sessionId: still rejected for a two-user loopback tool.
3. **Unique insight** — Ox: content-hash intents (adopted), kept cap, symlink refusal; Kimi: undo storms → idempotent reversal; GLM: non-atomic import → all-or-nothing with `/api/judged`; DeepSeek: ingest must not write on GET → on-demand scan.
4. **Blind spots** — mine: a packet law wider than the code (grid-only replay guard); a GET write called "gated"; a reviewer's floor adopted without measuring; a first importer that refused legitimate re-imports. **Two seats independently misread `keptFor` as `keepFor`** — a naming bug on my side, fixed by renaming, recorded as calibration.
5. **Verified verdict** — REVISE was right; laws fixed in taste-brain `6be20b8`; P2 v1 then built under the corrected contract (the two `feat(renders)` commits after it). Proof: `test-renders` 38 · tie-in 26 · modes 71 · bundle 28 · probe 81 · test 52 PASS; headless-Chromium 53/53 incl. the Python node.
