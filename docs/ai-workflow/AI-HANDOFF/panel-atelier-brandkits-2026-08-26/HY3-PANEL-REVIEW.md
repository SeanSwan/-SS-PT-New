# Review packet — brand kits · 2026-08-26 (loop iteration 4) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-BRAND-KITS-REVIEW-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 2138 in / 6296 out | **Cost:** ~$0.0036 | **Wall:** 104.8s | **finish_reason:** stop

---

## VERDICT
REVISE — the taste-generation path omits brand-kit application for non-Swan sites, silently leaking Swan art direction and defeating the core multi-brand requirement, and this open question must be closed before merge.

## BLOCKERS
1. P0 — Brand-scope leak on taste path. Inputs: generation request with `workspaceId` for a non-Swan site and `brandKitId: 'universal'` (or omitted) routed through the taste corpus -> `applyBrandKit` is never called (only invoked on brief path at `composeStills.mjs:206` per doc) -> Swan-trained taste prompts emit Swan brand cues -> output violates the stated separation of brand art direction from filing label. Evidence: doc §2 “applyBrandKit runs only on the brief path (composeStills.mjs:206)” and Open Question 1.

## ATTACKS
- Correctness: 
  - Happy-path-only: Test suite covers refusal and brief-path application, but the taste path (Open Q1) has no kit applied; no test asserts non-Swan taste output is brand-neutral. 
  - Unverified model-behavior claim: `applyBrandKit` prompt ordering (operator first, brand after) assumes diffusion front-weighting (Open Q4) — never measured, could under-weight brand anchors.
  - Null/undefined: Default behavior when `brandKitId` is absent is undocumented; if it defaults to `swanstudios`, same leak as above.
  - Stale concept: Previously merged `workspaceId` (filing label) with kit (art direction) — fixed, but callers still pass `ws-1` style ids; ensure no residual mapping.
  - House-rule compliance not evidenced: Document claims `<=300 lines` (satisfied) but does not show styled-components-only, Crystalline Swan palette `var(--token,#fallback)`, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1 in `AtelierCompose.tsx`; cannot confirm UI conforms.

- Security:
  - Multi-tenant scope leak: Taste-path brand leakage (above) is a brand authz failure — non-Swan tenant receives Swan brand.
  - `lawProfile` override (Open Q3): Explicit request overrides kit laws and records `lawProfileOverridden:true`; if not gated by role/claim, any caller can bypass brand protection.
  - Free-text `workspaceId` is stored unvalidated; if later rendered in UI without escaping, stored XSS risk (not shown).
  - IDOR / authz: Not evidenced that `workspaceId` is scoped to authenticated tenant in asset queries; could allow cross-tenant filing reads.

- Data-truth / schema drift:
  - Frontend response-shape drift: `AtelierCompose.tsx` (267) builds picker from `/limits` endpoint; doc asserts options come from server not bundle, but no schema contract shown — if `/limits` shape changes, picker breaks silently.
  - Kit schema vs law: Palette words in kit were initially rejected by LAW2 (gold allowlist) — indicates drift between CSS palette facts and art-direction schema; fixed by test but highlights tight coupling.
  - No FK/table drift because kits are code allowlist, but if future “trigger” makes them per-tenant table (Open Q2), migration surface unplanned.

## HIGHEST RISK
The taste-path brand leakage (Blocker 1) is most dangerous: it directly contradicts the primary product mandate (serve other sites without Swan branding) and will ship invisible if unanswered. Cheapest de-risk: implement explicit refusal (option c from Open Q1) — add a guard in the taste route that returns `400 E_TASTE_KIT_MISMATCH` when `brandKitId !== 'swanstudios'`, plus a unit test asserting the refusal; this costs ~10 lines and removes ambiguity before any real render.

## CONFIDENCE
Could NOT verify from document alone: (1) Actual rendered image effect of kits — no ComfyUI/R2/DB present (doc admits). (2) UI house-rule adherence in `AtelierCompose.tsx` (styled-components, palette vars, glow, 44px, dark-first, WCAG) — only line count shown. (3) Default `brandKitId` resolution when omitted. (4) `/limits` response schema vs picker props. (5) Whether `lawProfile` override is role-gated. (6) Baseline 2 failures / 31 uncollectable files impact. Evidence to settle: read repo at `feat/atelier-v2-compose`, run `AtelierCompose` a11y tests, inspect `composeStills.mjs` lines 100-210 and taste handler, curl `/limits`, and perform a staged taste render with `universal` kit. I am confident the documented refusals and test counts are as stated (generated at write time), but my judgment on taste-path impact is inferred from the open question, not from code.
