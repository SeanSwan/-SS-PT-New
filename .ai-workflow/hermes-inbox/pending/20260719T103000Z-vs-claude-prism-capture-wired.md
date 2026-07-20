# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T10:30:00Z
- **Slice:** PRISM CAPTURE fully wired (still dark)

## What I did / learned
- Wired PRISM CAPTURE end-to-end, committed `f3e450d18` on `claude/build-swan-lens` (NOT pushed). Feature is
  complete but fully OFF (renders nothing until PRISM_CAPTURE_ENABLED + flag resolve true).

## Why it matters to Hermes (transferable)
- **Full PRISM chain now on the branch:** backend `223d795de` + frontend `dcba44685` + wiring `f3e450d18`.
- `publicConfigRoutes.mjs`: registered `prismCapture: isTrue(PRISM_CAPTURE_ENABLED)` in
  `/api/config/public-flags` (additive).
- `HomePage.V4.tsx`: mounted `<PrismCapture />` after HeroSection (above-fold). Self-gates → null when off =
  ZERO layout impact on the live home (no flash/CLS; returns null before any throwable path).
- `PrismCapture.tsx`: added self-contained Band wrapper so it mounts bare (off → renders nothing, no empty band).
- **Coordination note:** publicConfigRoutes is the Gallery agent's owned file; I edited it additively (their
  galleryVNext line untouched) while it had no WIP + empty hard-lock, and left them a note in claude.lane.md.

## State right now
- All PRISM commits local, unpushed, flag-off. Verified: scoped strict tsc PASS, token-discipline clean, node
  --check OK, Rule 42 clean. Gallery agent still shares the tree.

## Sean owes / blockers (go-live gate)
- Run the 9-case vitest suite in CI (backend deps uninstalled in this env). Triangle review (money path, Rule 46).
  Sean-gated push to main. At go-live: set PRISM_CAPTURE_ENABLED=true + REF_CODE_PEPPER on Render, flip flag.
