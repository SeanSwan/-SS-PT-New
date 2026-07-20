---
surface: vs-claude
utc: 20260720T123500Z
topic: Gallery vNext — Kimi's 6 veto probes 6/6 GREEN; 4 real defects caught+fixed; flag-flip now waits ONLY on Lane-A activation + Sean
tags: [gallery, qa, probes, design-overhaul, flags]
---

## What I did / learned
- Built Kimi's 6 binding veto probes as a repeatable Playwright suite (flag-ON via mocked runtime flag +
  mocked /api/gallery/*, zero prod writes, a white-cover fixture purpose-built for the scrim-AA probe, and a
  TEST-ONLY simulated Lane-A activation injecting the shell attr + --world-* the app does not yet emit).
- The probes caught 4 REAL defects, all fixed and regression-locked (f29e6bdde):
  (1) sliver math — maxPerRow capped tile COUNT not WIDTH; a 2:3 beside a 16:9 justified to ~85px at 375vw
  → hard MIN_RENDER_WIDTH floor with row-splitting; (2) scrim MEASURED 3.96:1 on a white cover → Kimi's
  deepened numbers applied; (3) the checkout-return toast was eaten TWICE — the Suspense fallback mounted
  the old page live (it strips ?credits) AND the pre-flag-resolution window does the same → fallback null +
  ENTRY_SEARCH captured at route-chunk eval; (4) the focus ring was a zero-specificity :where() that global
  outline-none resets crushed → full-specificity longhands + fallback.
- Transferable gotchas: stylis-level debugging lies — a CSSStyleRule now HAS .cssRules (CSS nesting), so a
  sheet-walker that recurses on `rule.cssRules` truthiness skips every normal rule; and an !important
  SHORTHAND carrying var() can compute to 0px/black in Chromium — use longhands + fallback for must-render
  declarations. Programmatic .focus() never matches :focus-visible — keyboard probes need real Tab presses.

## Why it matters to Hermes
- Gallery flag-flip readiness: design probes GREEN. Remaining blockers for `GALLERY_VNEXT_ENABLED=true`:
  (a) THE PROGRAM-WIDE Lane-A activation (verified: nothing renders `data-style-lens-shell`, so ALL surface
  gates fail closed for every visitor — no flag does anything until Lane-A lands, FLAG-LIFECYCLE-DOCTRINE
  §BLOCKER); (b) one manual devtools item — headless computed outline-width reads 0px though the ring rule
  wins the cascade (P6, ship-and-iterate class); (c) Sean's flip.
- The probe suite doubles as the template for the other 7 surfaces' activation QA (same harness pattern).

## State right now
- Branch pushing to main (dark): probe suite + 4 fixes (f29e6bdde) + tracker/memos. Gates: tsc 0 ·
  eslint 0/0 · vitest 26/26 · firewall clean · build 0 · Rule 42 clean · secret scans CLEAN.
- Open board unchanged: Lane-A activation wave (the real unlock for all 8 dark flags) · dashboard
  CreativeGallery blueprint decision · gallery Phase 2 · OG slice · modal restyle.

## Sean owes / blockers (if any)
- Sean: nothing new — the flag flip stays gated on Lane-A activation + the one devtools ring check.
