# Arc 3 — Stripe/Session Purchase Readiness: Audit Record (2026-07-03)

## 1. Phase header
- **Phase:** Arc 3 of the 2026-07-02/03 recursive build loop — Stripe/session purchase READINESS (scout + refutation + purchase-surface beautification).
- **Scope shipped:** full buy-path Rule-26 receipt, `/api/cart/add` prod-404 refutation, Crystalline retheme of the cart modal. Backend Stripe logic deliberately untouched (Rule 16/50 gate).
- **Dates:** 2026-07-03 (single session, SESSION-N in `claude.lane.md`).
- **Reviewed by:** builder hostile pass (Rule 61) + theme-contract test lock; Codex hostile-review REQ appended to `review-queue.md` (OPEN, targets `cdc7a5b3d`).
- **Verdict:** SHIPPED + LIVE-VERIFIED.

## 2. Files involved
| File | Lines | Purpose |
|---|---|---|
| `frontend/src/components/ShoppingCart/ShoppingCart.tsx` | 297 (was 1052) | Modal shell: hooks, handlers, dialog frame |
| `frontend/src/components/ShoppingCart/ShoppingCart.styles.ts` | NEW 219 | Modal chrome (tokens-only, signature Ice-Wing→Wing-Purple edge beam) |
| `frontend/src/components/ShoppingCart/ShoppingCart.summaryStyles.ts` | NEW 114 | Summary rows (gilded total), status/loader styles |
| `frontend/src/components/ShoppingCart/ShoppingCartItem.tsx` | NEW 132 | Line-item card renderer |
| `frontend/src/components/ShoppingCart/ShoppingCartItem.styles.ts` | NEW 228 | Item card styles, 44px stepper/remove |
| `frontend/src/components/ShoppingCart/ShoppingCartFooter.tsx` | NEW 79 | Summary + Clear/Checkout actions |
| `frontend/src/components/ShoppingCart/ShoppingCart.motion.ts` | NEW 113 | Variants factory (fade-only under reduced motion) + `useViewportSize` |
| `frontend/src/components/ShoppingCart/ShoppingCart.themeContract.test.ts` | NEW 84 | 9 source-locks (palette/motion/targets/CTA routing) |

Commit: `cdc7a5b3d` on `main`. No backend, migration, or env changes.

## 3. Architecture & runtime flow (canonical buy path, Rule-26 receipt)
1. `/store` (+ `/shop`, `/swanstudios-store`) → `main-routes.tsx:468/476/484` mounts `<SwanStudiosStore />` = **StoreV3.tsx** (StoreV2 = error-fallback only; OptimizedGalaxyStoreFront = dormant).
2. StoreV3 fetches `GET /api/storefront`; `PackageCard.tsx:588` → `handleAddToCart` (StoreV3:703) → **CartContext.tsx:270 `POST /api/cart/add`** — the SINGLE frontend caller of that path.
3. Cart modal = `components/ShoppingCart/ShoppingCart.tsx`, rendered by **`Header/header.tsx:217`** (canonical, every page). CinematicNavbar mount = dormant cinematic homepage tree.
4. Cart ops: `GET /api/cart`, `PUT /api/cart/update/:id`, `DELETE /api/cart/remove/:id`, `DELETE /api/cart/clear` (all CartContext).
5. Checkout: `/checkout` (protected, `main-routes.tsx:644`) → Genesis `CheckoutView.tsx:167` `POST /api/v2/payments/create-checkout-session` → Stripe redirect → `/checkout/success` → `SuccessPage.tsx:79` `POST /api/v2/payments/verify-session` → `GET /api/v2/payments/activation-status`.
6. Backend: `/api/cart` mounted ONCE at `core/routes.mjs:308` → `cartRoutes.mjs` (`POST /add` at :340, per-route `protect`). No shadow mounts. Legacy `POST /api/cart/checkout` = intentional 410 pointing at the v2 route. Webhook `POST /api/cart/webhook` grants sessions idempotently via `grantSessionsForCart`.

### /api/cart/add prod-404 — REFUTED (Rule 55 probe, 2026-07-03)
- `POST /api/cart/add` → **401** (route matched, auth rejected)
- `POST /api/cart/nonexistent-probe` → **404** (proves unmatched `/api/cart/*` paths DO 404 — the 401 is route-level, not a blanket wall)
- `POST /api/v2/payments/create-checkout-session` → 401 (mounted); `/api/health` → 200
- The 2026-04-11 "cart/add 404" open item (CLAUDE.md Storefront section) is **stale — closed**. `cartRoutesSecurity.test.mjs` source-locks the mount.

## 4. Security logic & posture
- **No auth/billing logic touched.** The slice is frontend design/a11y only; API path literals unchanged (theme-contract test does not permit URL drift silently — checkout/login/store navigations are locked).
- Cart routes remain `protect`-gated per route; webhook remains signature-verified; verify-session/webhook idempotency (SessionGrantService) untouched — verified solid 2026-07-02, not rebuilt (Rule 52).
- **How it breaks if done wrong:** a future edit that swaps `navigate('/checkout')` for a raw URL or adds an external redirect would bypass the protected route — the theme-contract "checkout handoff intact" lock fails on removal, not on addition; reviewers should still eyeball navigation changes in this file class.
- Secret scan: pre-commit hook CLEAN on all 8 staged files.

## 5. Best practices applied
Rule 2 (44px close/quantity/remove — were 40/32/28px) · Rule 3/6 (tokens-only, `var(--token, #fallback)`, matched Genesis checkout token vocabulary) · Rule 4 (all 8 files ≤300) · Rule 17/61 (hostile pass caught close-button glyph shrink + missing focus restoration; both fixed in-slice) · Rule 22/23 (signature moments: chrome edge beam, gilded total; emoji tells removed for lucide) · Rule 25 (CSS `prefers-reduced-motion` gates + framer variants collapse to fades via `useReducedMotion`; celebrations suppressed) · Rule 26/31/55 (receipt + route walk + executed probes) · Rule 51 (claims tagged in lane) · WCAG 2.4.3 (focus restored to opener on close).

## 6. Known limitations / non-goals
- **Backend Stripe changes: none** — gated on plan + triangle review per the standing order; no evidence any are needed.
- StoreV3/PackageCard NOT rethemed: their hexes are `theme.colors?.x || '#fallback'` theme-prop fallbacks with correct palette — compliant pattern, no-touch under Rule 52.
- AnimatePresence exit animations were dead before this slice (parent conditionally renders the modal) and remain so — restructuring `header.tsx` was out of scope.
- SmartTooltip remains hover-only (informational hints only; all actions have labels and work without hover).
- `MealPlanTab`-style legacy `#1e1e3f` app-wide drift NOT fixed here (see §10).

## 7. Performance & UX
- Modal is in the entry chunk (header-owned) — no new lazy boundary added; bundle delta negligible (+~0.1 kB entry).
- Empty-cart CTA now actually routes to `/store` (was a silent close) — one tap from empty cart to catalog.
- Reduced-motion users: checkout redirect delay drops 300ms→0ms; no infinite loops run.
- Mobile: bottom-sheet behavior preserved; 480px stacks price/stepper row; 44px floors throughout.

## 8. Test coverage
- `ShoppingCart.themeContract.test.ts` — 9/9: raw-color ban in components, hex==token-fallback parity in style files, retired-palette ban (`#1e1e3f/#00e6e6/#00FFFF/#7851A9/#0a0a1a`), reduced-motion gates (CSS + framer), 44px floors, lucide-not-emoji, `/store` CTA routing, checkout/login handoff intact.
- Gates: `npm run type-check` exit 0 · `npm run build` PASS · mojibake scan clean. Baseline disclosure (Rule 56): full-repo tsc baseline was clean at `b3637b889` and remains clean; vitest run scoped to the slice + NewCheckout theme contracts (11 more pass) — full frontend suite NOT run this slice.
- NOT tested: render-level interaction tests for quantity/remove (pre-existing gap; the handlers are thin passthroughs to CartContext, which has its own coverage).

## 9. Rollback plan
`git revert cdc7a5b3d` → push to main → Render auto-deploys. Single additive commit; no migrations, no env, no API changes. The old monolith returns intact.

## 10. Future review hooks
1. **#1e1e3f legacy drift class (~20 files)** — `GlobalStyles.ts:19/28` ships it app-wide in the entry chunk; also About/Contact pages, `FoodScannerPage`, 3 UniversalMasterSchedule Analytics files, `error-boundary.tsx` (uses it AS a `--bg-elevated` fallback). Propose one focused slice: bless it as a real token or migrate to Graphite `#1A1A24`. Needs visual QA across pages — do NOT sweep blindly.
2. **Dashboard sweep next targets by evidence:** admin-packages-view (1193L debt), legacy progress V1 (1178L), About/Contact raw-gradient shells. Client home / user home / trainer home audited HEALTHY (tokenized, recent) — don't churn them.
3. `ClientDashboardHome.layoutStyles.ts` = 311 lines (11 over cap) — trivial split when next touched.
4. Verify the theme-contract regex locks still bind after any styled-components v6 upgrade (template-literal formatting changes could silently loosen `toMatch` patterns).
5. Auth-error copy arc (scout G3, deferred): needs backend error-code distinctions — plan + triangle review before code.
6. Re-run the cart-modal viewport matrix on a real device pass (414px + 2560×1440) during the next QA session; this slice verified via code contracts + build, not screenshots.

## 11. AI review log
- Builder hostile pass (Rule 61): caught (a) close-button glyph lost its font-size in extraction → replaced with lucide `X`; (b) missing WCAG 2.4.3 focus restoration → added opener-refocus; (c) 3 files initially over the 300 cap → extracted summaryStyles/Footer/viewport hook; (d) theme-contract 44px lock initially referenced pre-split identifiers → fixed (test failed, then 9/9).
- Codex hostile review: REQ appended 2026-07-03T15:05 (OPEN). Codex's earlier REQ targeting `b3637b889` now also covers this commit's branch history.

## 12. Sign-off
- Shipped: `main @ cdc7a5b3d`, Render live-verified on entry chunk `index.BLUn-lIF.js` (new CartSummary `color-mix` CSS + `Loading cart` aria-label present; old `#1e1e3f` absent from cart code — remaining entry-chunk hit traced to `GlobalStyles.ts`).
- Sean sign-off: pending (autonomous loop under standing authorization 2026-07-02/03).
- Next action pointer: §10 hooks 1–2 = the dashboard beautification sweep backlog; hook 5 = the gated auth-error arc.

---

# ADDENDUM — Arc 4: Theme-System Ultra-Upgrade (same session, 2026-07-03)

Sean's directive (~15:40): make everything compatible with the header theme changer, refactor/enhance it, add animations + an on/off switch, clearer picker with more options, +10 polished themes, themes truer to their names. Standing permission: beautify any UX/UI along the way. Run as /loop, hostile review + fixes for all slices.

## Slices shipped (all on main, each gated by tests + tsc + build + secret scan)
1. **A `3555fdf98` — brand-token RGB bridge.** [VERIFIED finding] tokens.css pinned the brand-token family (--wing-purple, --midnight-sapphire, …) statically, so checkout/cart/dashboard surfaces IGNORED theme switches; 24 more semantic names (--error 80×, --status-*, --feedback-*, --card-bg, --focus-ring, …) were never defined anywhere and always rendered fallbacks. generateCSSVariables now re-points the --*-rgb roots per theme (solids + alpha derivatives re-theme together; fail-soft on non-hex) and injects the missing aliases. Default theme emits byte-identical values (test-locked).
2. **B `9b3a60df7` — ten identity themes**: sakura-midnight, indigo-pulse, sunset-mirage, steel-tempest, vapor-dream, burgundy-noir, tron-grid, orchid-veil, deep-jade, midnight-mango. All dark-first; auto-wired through bridge/registry/metadata (contract locks all 20 premium colorways).
3. **C/C2 `a170c5b75` — picker + animations switch.** 640L toggle monolith (hardcoded switches skipped all 20 premium themes) → 186L shell + data-driven styles + grouped panel (Signature/Worlds/Jewels/New Wave + automatic More bucket: registry⊇groups is contract-locked). Site-wide Animations On/Off: localStorage `swanstudios-motion` → `html[data-motion]` → tokens.css kill-switch mirror + framer `MotionConfig reducedMotion`.
4. **D `d89b1ac84` — identity polish.** Frozen Aurora converted light→dark arctic night (#060B14, aurora glow accents) per THEME-CHANGER-COMPAT's one-light-theme rule; getAnimationConfig switch (7 themes) → derived from every theme's own effects block.

## Cross-slice hostile review (Rule 61, run at arc close)
- **Checked + cleared:** header `overflow:hidden` clipping the panel (it's on icon buttons, not containers; panel z 1260 > header 1250) · injected-style cascade ordering (proven by pre-existing --font-heading behavior) · orphaned imports of removed toggle internals (none) · adjacent suites green (31/31: login-claim, StoreV3 fallback, ClientHomeTab).
- **Pass-with-note (handed to Codex REQ):** --frost-white flips dark under crystalline-light on fixed-dark surfaces (same exposure class as pre-existing --text-primary); MotionConfig collapse vs framer layout/drag consumers; 414px panel width uses min(340px, 100vw-24px).
- **Fixed in-arc:** orchid-veil mangled hex literal; test identifiers after file split; frozen-aurora light-theme violation; getAnimationConfig coverage gap.

## Verification
12/12 theme contract locks + 31/31 adjacent · tsc 0 · build 0 · mojibake clean · secret scans CLEAN ×4 · line caps: toggle 186/240/151 (was 640). Live chunk verification: pending Render serial queue at write time — markers: `--wing-purple-rgb` (A), `Sakura Midnight` (B), `Animations O` (C), `#060B14` (D), all entry-chunk.

## Rollback
Each slice reverts independently: `git revert d89b1ac84 a170c5b75 9b3a60df7 3555fdf98` (reverse order for clean apply). No migrations, no env, no API changes.

## Future review hooks (adds to §10)
7. When adding a theme: registry + themeToggleMetadata are contract-forced, group placement optional (More bucket catches strays) — confirm the More bucket stays empty in normal state.
8. Audit remaining `getGlowButtonVariant` switches (context + themeUtils duplicates, 4-5 theme coverage) for the same effects-derivation treatment.
9. Consider a visual QA pass cycling all 38 themes on /store + /dashboard at 414px (contrast spot-checks are code-level only so far).
