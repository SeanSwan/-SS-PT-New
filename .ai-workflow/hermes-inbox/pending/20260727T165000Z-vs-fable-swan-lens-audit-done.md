# Hermes Inbox Memo

- **Surface:** vs-claude (Fable 5)
- **UTC:** 2026-07-27T16:50:00Z
- **Slice:** Swan Lens audit COMPLETE + fork decided + taxonomy canon shipped (SWA-69)

## What / why
Sean asked to audit + upgrade the Swan Lens. 3-lens hostile audit synthesized
(`AI-HANDOFF/SWAN-LENS-AUDIT-AND-UPGRADE-2026-07-27.md`, `d302dadc6`). Sean picked **HONEST first, then
WORLDS**. Phase-1 step 1 shipped: `references/SWAN-LENS-OS.md` (`2686ade07`) — the unified taxonomy canon.

## Durable findings (transferable — the Swan Lens truth)
- **"Swan Lens" = 3 unreconciled systems:** doc World Engine (18 cinematic recipes, DOC-ONLY, drives zero runtime)
  · doc mkt/pro/ops model (design.md §5) · the CODE engine (27 lenses + ~42 colorways). None mapped to each other
  until SWAN-LENS-OS.md.
- **The v2 world engine is fully built but STRANDED behind a 1-line id mismatch** (`v2/recipeResolution.ts:12-15`
  keys by recipe-id, fed style-lens-id → always null → every user gets crystalline default). `catalogV2Map.ts:13`
  has the correct map. Fixing it lights up the 2 authored worlds on ~15 mounted gates.
- **28 lenses → 1 crystalline world** (per-lens worlds = unbuilt "Slice-3"; only 2/27 have recipes). Lens names
  over-promise.
- **Two parallel theme systems** (structure vs palette) reconciled in ONE component → latent "commit-changed-no-
  palette" bug.
- Dead code on main: `gateTelemetry` (0 callers, observes DELETED gates), `lensViewport/Surface` CSS (tested,
  never mounted). `--world-*` means 3 things. §C13 aesthetic-ceiling ref is dangling (grep=0).
- **Engine BONES are excellent** (deterministic compiler, fail-closed validation, zero-PII telemetry, a11y floors,
  <250-line files). Upgrade = reconcile + unlock, NOT a rewrite.

## Board
SWA-69 (In Progress). Related: SWA-30 (de-gate), SWA-53, SWA-55, SWA-50.

## Next
Phase-1 remaining: doctrine drift + aurora-console fix + resolver regression test (safe) → 1-line resolver fix
(verified) → collapse theme systems (triangle-reviewed) → dead-code delete (Rule 34). Then Phase-2 HONEST.
