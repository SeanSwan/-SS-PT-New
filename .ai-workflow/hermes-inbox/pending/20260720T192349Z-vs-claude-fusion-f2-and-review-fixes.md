# Hermes memo — vs-claude

- **What:** FUSION F2 built (Crown Header + Looks Carousel on the user-dashboard Home: band-as-preview-stage, Wear-this commit + exact chip copy, order law worn→v2-by-family→chrome, 148px short-viewport collapse) AND all 12 findings from the F0/F1 hostile review fixed. Local commit 8826c65b2; push gated on the round-2 DRY verdict.
- **Transferable lessons:**
  1. **The mocked-dead-module lying-gate:** the offline-receipt test mocked `context/ToastContext` — an orphan provider mounted NOWHERE — so the test proved copy while production no-opped silently. When a test mocks a module, first prove the module is the one production actually mounts (trace the provider import in App).
  2. **SVG data-URI double-encoding class:** bodies containing `%23` + `encodeURIComponent` → `%2523` → parser sees invalid paints (3/8 assets rendered empty/black/none). Write literal `#`, encode exactly once, and gate with a decode-assert test.
  3. **Free-form JSONB endpoints need unknown-key rejection + a size cap** even when "validated" — field-checking 6 known keys still stored arbitrary 10MB blobs beside them.
  4. Reduced-motion paths must never AMPLIFY (stillPoster at opacity 1.0 inverted the restraint intent); inherit the loudest validated layer instead.
- **State:** backend 11/11, frontend 242/242, tsc 0, build green; F2 receipts in worktree qa-receipts/f2/. Round-2 dry-gate review in flight; ONE push (F2+fixes) follows DRY.
