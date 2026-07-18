# STORE V4 reground seed — REAL substrate (correct the blueprint against this)

You (Kimi) are the design architect. Reground your STORE V4 "Crystal Case" blueprint against the REAL
shipped code below. Keep the Crystal Case DESIGN intact (jeweler's-case vault, chrome-edged crystal
cards, ice/wing refractions, gold twice, the flagship Crystallize). Correct ONLY what's wrong vs reality.
Output the corrected token contract + any file/binding fixes. DESIGN-ONLY — never touch the money path.

## CORRECTION 1 — token names were blind-authored. Bind to REAL emitted slots.

The Swan Lens (surface #1) is SHIPPED. These are the ONLY `--world-*` / `--lens-*` names that actually
exist at runtime (verified: the shipped Dashboards theme maps against exactly these):

REAL world slots: `--world-bg`, `--world-panel`, `--world-text`, `--world-muted`, `--world-accent`,
`--world-action`, `--world-title-font`, `--world-target-size`, `--world-panel-radius`,
`--world-row-radius`, `--world-dial-radius`, `--world-letter-spacing`.
REAL lens slots: `--lens-canvas`, `--lens-elev-0..4`, `--lens-main-padding`, `--lens-panel-radius`,
`--lens-z-base/raised/sticky/overlay/modal/toast`, `--lens-fx-glow-primary`, `--lens-fx-glow-secondary`,
`--lens-fx-glow-strength`, `--lens-fx-atmosphere`, `--lens-fx-hover-lift`, `--lens-ease-standard`,
`--lens-ease-crystallize`, `--lens-crystallize-charge-ms`, `--lens-crystallize-settle-ms`.

Your blueprint invented these — they DO NOT EXIST, remap them:
- `--lens-ice` → derive from `var(--world-accent)`. `--lens-wing` → `var(--world-action)`.
- `--lens-gold` → a store-LOCAL literal (`#C6A84B`/`#E3C878`) in the tokens file ONLY (there is no world gold slot; the shipped Dashboards theme sets status hexes locally the same way). Gold "twice" rule stays.
- `--lens-chrome-edge` → `color-mix(in oklab, var(--world-accent) NN%, transparent)`.
- `--world-bg-deep` → `var(--world-bg)`. `--world-surface-1/2` → `var(--world-panel)` (+ color-mix tiers).
- `--world-card-hi/lo` → color-mix on `var(--world-panel)`/`var(--world-accent)`.
- `--world-text-primary/secondary/muted` → `var(--world-text)` / `var(--world-muted)`.
- `--world-font-display/ui` → `var(--world-title-font)` (+ inherit body font from the lens shell).
- `--world-shadow-1/2` → `var(--lens-elev-1)` / `var(--lens-elev-2)`.

PROVEN PATTERN (do this): the shipped Dashboards uses ONE theme file mapping `--dash-*` → real
`--world-*`/`--lens-*`, and that is the ONLY file naming world/lens tokens or holding hex. Mirror it:
`storeV4.tokens.ts` is the ONLY file that names `--world-*`/`--lens-*` or holds hex; every component uses
bare `var(--store-*)`. No component/test/comment names a world/lens token outside that file.

## CORRECTION 2 — Crystallize is the SHIPPED lens controller, NOT a reimplementation.

Consume `useCrystallizeTransition({surfaceId:'store.flagship'})` + `<CrystallizeOverlay {...overlayProps}/>`
from the lens (re-exported via a store lensBindings file, mirroring DashBoard/v2/lensBindings.ts).
VERIFIED: `CrystallizeOverlay` takes NO children (props: phase/variant/chargeMs/settleMs/announcement);
it is a self-contained body portal. Do NOT author a CrystallizePanel-with-children. The flagship card's
first-reveal Crystallize plays the overlay; no hand-rolled timeline.

## CORRECTION 3 — feature-flag file was assumed. Use the REAL house pattern.

`frontend/src/config/featureFlags.ts` / `resolveFlag()` DO NOT EXIST. The real, shipped pattern is the
DashBoard/v2 gate: a `flags.ts` resolving runtime `/api/config/public-flags` → build-time `VITE_*` env →
`false` (fail-closed), + a lazy gate with an ErrorBoundary → previous version. `StoreGate` must mirror
`DashboardV2RouteGate` + `DashboardGate` + `flags.ts`. Add the store flag key to the existing
`/api/config/public-flags` backend endpoint (already built) rather than a new flag system.

## CORRECTION 4 — Vite flags are BUILD-TIME. Side-by-side must be lazy.

"Flip the flag" = rebuild/redeploy, but the runtime `/api/config/public-flags` override gives instant
revert WITHOUT rebuild (already solved for Dashboards). StoreGate must `React.lazy()` StoreV4 so the
bundle doesn't double. The ONE router seam is `main-routes.tsx:148-153` (the `SwanStudiosStore`
lazyLoadWithErrorHandling binding → StoreV3→StoreV2); all of `/store`, `/swanstudios-store`, `/shop`
gate together from that single binding.

## CORRECTION 5 — de-Galaxy must catch DISGUISED channel literals.

Store is a named Galaxy-DNA carrier. The CI de-Galaxy grep must reject not just hex `#0a0a1a`/`#00FFFF`/
`#7851A9` but channel forms `rgba(0,255,255, …)`, `rgb(120,81,169)`, etc.

## REAL money-path bind surface (READ/BIND ONLY — confirm your bindings match):

- Packages: `GET /api/storefront` → `{success, pricesVisible, items, data:{packages, activeSpecials}}`.
  StorefrontItem fields: `id, packageType, name, description, price(DECIMAL), sessions, pricePerSession,
  months, sessionsPerWeek, totalSessions` + Stripe/isActive (NO `theme` column in prod).
  Today StoreV3 fetches this inline via `api.get('/api/storefront')` + maps via `storeCatalog.ts`
  (`mapStorefrontItemToStoreItem`). Your `useStorePackages` is the clean extraction of exactly that.
- Cart: `useCart()` (`context/CartContext.ts`) → `addToCart/updateQuantity/removeItem/clearCart`
  hitting `/api/cart/*`. Price-gating predicate lives in `services/store/priceVisibilityService.mjs`.
- Stripe/checkout (`v2PaymentRoutes.mjs`, `NewCheckout/`) = OUT OF SCOPE, never touched.

Return: the corrected `storeV4.tokens.ts` token map (store→real-slot), the corrected StoreGate/flags
wiring, and a short list of any other blueprint items that were blind-authored vs the real substrate.
