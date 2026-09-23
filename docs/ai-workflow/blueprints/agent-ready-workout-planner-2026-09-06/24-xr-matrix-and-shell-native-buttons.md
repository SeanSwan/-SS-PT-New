# Bucket-1 extension: full 20-viewport XR matrix + shell native-button cleanup

Date: 2026-09-13 (session). Layered on receipts 19–23; worktree `codex/rolodex-bootcamp-planner-20260913`,
base `c0cbe538d…`, **still no commit**. Pain gate untouched (H07 remains Sean's call).

## 1. The config PR

`playwright.coach-mobile.config.ts` pinned `testMatch: 'coach-command-center-mobile.spec.ts'`, which
locked the whole XR/matrix rig to one spec. It is now an array:

```
testMatch: ['coach-command-center-mobile.spec.ts', 'sprint-planner-*.spec.ts']
```

The coach spec is untouched and still runs exactly as before; the sprint specs join the same
projects via tags (`@xr` on the keyboard/focus test, `@matrix` on the viewport-matrix test).
Verified live: the XR Chromium and iPhone XR **WebKit** projects both pass the tagged sprint test —
the a11y gate now has cross-engine proof, not just Chromium.

## 2. The 20-viewport matrix spec

New `e2e/sprint-planner-matrix.spec.ts` — the exact coach viewport table (12 phone incl. P10 SE
375×667 and the P12 320×568 floor; 8 tablet/desktop up to 4K). Per viewport, against the real bundle
with route-stubbed API: no horizontal page overflow (`scrollWidth − clientWidth ≤ 1`), **zero**
`div[role="button"]` on the settled page (retried via `expect().toPass()` because late-mounting
shell pieces can flash a stale frame mid-hydration), and the 44px floor re-measured on the sprint
card and the create-modal toggles. Final run: **all 20 viewports green**.

Two real findings surfaced by the matrix that unit tests could never see:

- **`DevLoginPanel`'s minimized dev-tools FAB was a 50×50 `role="button"` div** with an Enter/Space
  shim, floating app-wide at `#root` level. Now a native `styled.button` (UA chrome reset,
  `:focus-visible` ring, `aria-label="Open developer tools"`); the shim is deleted. Identified by
  React-fiber inspection in the live page (`DevToolsProvider → DevLoginPanel`).
- **The site header logo (`ReforgedGalaxyHeader` → `Logo.tsx`) rendered as a `motion.div` with
  `role="button"`** + a keyboard shim — it visibly FLASHED as a fake button during first hydration
  (caught at ~500ms in a timed probe; gone by 1500ms). Now `motion.button` (appearance/border/
  background/padding reset) — the whileHover/whileTap animation and visuals are unchanged, and
  Enter/Space come from native semantics.

One spec-side lesson recorded rather than hidden: Playwright's auto-scroll parks a control under the
fixed app header, whose own buttons then intercept pointer clicks at some widths (`scrollTo(0,0)`
did not clear it). The matrix activates the create-modal via **keyboard** (focus + Enter), which is
interception-proof and is the accessibility path this gate exists to protect.

## 3. Verification after this extension

- Playwright (coach-mobile config): **3 passed / 0 failed** — matrix (20 viewports, Chromium) +
  keyboard/focus test in XR Chromium AND iPhone XR WebKit.
- hooks + SprintPlanner suite and `tsc --noEmit` at 16384MB re-run after the header/devtools edits:
  green (counts in the closeout).
- Transient artifacts: `test-results/` removed; vite dev server stopped after the run.

## 4. Deliberately open

- The coach spec itself was NOT re-run (it belongs to the coach lane; only the config's match list
  changed, and the sprint specs' tags cannot affect its selection).
- The full-dashboard `role="button"` census beyond the pages mounted at `/sprint-planner`
  (BodyMap, SavedPlanCard, PlannerLensSwitcher, ConversationItem, PhotoUploader, etc. all still
  carry divs) — each needs its own surface slice with the same browser-verified treatment.
- Severe-pain 422 gate: untouched — H07 remains the single blocker to a fully dry packet.

## Label

BUCKET-1 EXTENSION VERIFIED: the sprint route now holds a11y + geometry across all 20 coach-matrix
viewports in real Chromium, with cross-engine (WebKit) keyboard/focus proof, and both shell fake
buttons (dev-tools FAB, header logo) are native buttons. NOT DRY (dashboard census + H07 remain),
NOT DEPLOYED, no commit, no push, no production DB contact, no paid calls.
