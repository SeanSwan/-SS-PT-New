# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T10:00:00Z
- **Slice:** PRISM CAPTURE frontend shipped (flag-off)

## What I did / learned
- Built + committed the PrismCapture frontend `dcba44685` on `claude/build-swan-lens` (NOT pushed; flag-off).
  10 files in `frontend/src/components/marketing/PrismCapture/`. Kimi's "one beam in / spectrum out" vision.

## Why it matters to Hermes (transferable)
- **PRISM CAPTURE now has both halves** (backend `223d795de` + frontend `dcba44685`), all flag-off. The frontend
  self-gates (house pattern → null when off), is NOT mounted anywhere yet, and calls `POST /api/leads/capture`.
- Component set: `PrismCapture` (gate+ErrorBoundary+state machine), `PrismBeam` (real form, AA), `PrismSpectrum`
  (decorative, transform/opacity only), `PrismRefraction` (Book/Trainer/Share rays), `usePrismCapture` (fetch +
  ?ref=/UTM), `prismTokens` (bridge w/ Crystalline hex fallbacks — renders today, re-skins when worlds land),
  `flags`, `prismMotion` (reduced-motion in JS), `prismCopy`.
- **Dogfood win:** the check-token-discipline firewall I shipped this session caught my own `color:#041019` on the
  primary button → tokenized `--prism-on-ice`. The CI firewall works.
- **Verify:** scoped strict tsc PASS (frontend deps ARE installed here, unlike backend); token-discipline +
  de-galaxy clean; all <300 lines.

## State right now
- Both PRISM commits local, unpushed. Frontend NOT mounted (does nothing yet). Gallery agent still shares tree.

## Sean owes / blockers (to go live)
- Mount `<PrismCapture/>` in HomePage.V4 hero (mine). Register `prismCapture` in publicConfigRoutes (Gallery
  agent holds that file — coordinate). Run vitest suite in CI (backend deps uninstalled here). Triangle review
  (money path). Sean-gated push. Then flip PRISM_CAPTURE_ENABLED + the flag at go-live; set REF_CODE_PEPPER.
