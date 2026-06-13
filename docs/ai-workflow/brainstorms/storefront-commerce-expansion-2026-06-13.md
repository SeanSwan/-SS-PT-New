# Storefront Commerce Expansion — Plan & Architecture

**Date:** 2026-06-13 · **Status:** plan (ready to execute Phase 0) · **Owner:** Sean (CEO) · **Lane:** revenue/storefront (Codex-free; Codex is on Social/Coach)

> Build ON the working storefront, don't replace it. The PT-package purchase path is verified working today; this adds physical products alongside it.

## Vision (Sean)
The SwanStudios storefront should sell three things from one trusted store, and let Sean add new items easily:
1. **Training packages** — services, **not** CA-taxable, grant session credits. *(EXISTING + working.)*
2. **Supplements** — physical, taxable, **dropshipped** (AGI supplement partnership, to be set up).
3. **Merch / clothing** — physical, taxable, **self-stocked + shipped** by Sean.

**#1 brand factor = community + trust.** Honest pricing, no hidden fees, tax shown clearly + compliantly on goods, shipping cost shown upfront.

## Decisions locked (2026-06-13)
- **Fulfillment = MIX (per-product):** supplements → dropship (AGI); merch → self-ship (Sean's inventory). The model must carry a per-item fulfillment type.
- **Tax = Stripe Tax:** auto-computes CA state+district sales tax by the buyer's shipping address; handles reporting; ~0.5%/txn. Requires enabling Stripe Tax + CA registration in the Stripe dashboard (Sean, ops step).

## Tax architecture (the important correction)
Personal training is a **service → not** sales-taxed in California. Physical goods **are** taxable. So taxability is **per-item**, never store-wide:
- Training packages: `isTaxable = false` → no tax line (the all-inclusive promise already on the packages section stays correct).
- Supplements + merch: `isTaxable = true` → Stripe Tax computes the CA rate at checkout from ship-to address.
- **Mixed cart** (a package + a shirt): tax applies only to the taxable line items; the package stays tax-free; shipping applies only to physical items.

## Current state we build on (verified)
- `frontend/src/pages/shop/StoreV3.tsx` — canonical store (mounted `/store`,`/shop`,`/swanstudios-store`).
- `backend/models/StorefrontItem.mjs` — catalog (`packageType` fixed|monthly|custom; price/sessions; DECIMAL currency after the 2026-06-13 alignment migration).
- `/api/cart` (cartRoutes) — cart; `/api/v2/payments` — Stripe checkout; `SessionGrantService` — grants credits for packages (row-locked, idempotent).

## Catalog model design — Phase 0 foundation
Extend `StorefrontItem` (additive, defaulted, back-compat — existing packages unaffected):
- `itemKind` STRING — `'training_package'` (default) | `'physical_product'`.
- `isTaxable` BOOLEAN — default `false` (packages); `true` for products.
- `fulfillmentType` STRING — `'none'` (services, default) | `'dropship'` | `'self_ship'`.
- `stockQuantity` INTEGER null — self-ship inventory (null = not tracked / dropship).
- `sku` STRING null, `shippingWeightOz` INTEGER null — physical logistics.
- Variants (merch sizes/colors) → separate `ProductVariant` table in **Phase 1** (one item → many variants, each with own SKU/stock).

## Phased build
- **Phase 0 — catalog foundation:** model fields above + idempotent migration + drift-guard test. Data layer "prepared" so a product row can exist. *(small, additive, backend-only)*
- **Phase 1 — product catalog UI:** product cards (image, price, variant picker, add-to-cart) in StoreV3 alongside package cards; a clear "Train" (packages) vs "Shop" (products) split; `ProductVariant` model for merch; inventory display for self-ship.
- **Phase 2 — checkout for goods:** Stripe Tax on taxable items; shipping-address collection (physical items only); shipping rates for self-ship merch; mixed-cart handling; product images on R2 (existing R2 pattern).
- **Phase 3 — AGI supplements:** dropship routing per the partnership's fulfillment API/process (order forwarded to AGI; no Sean inventory).

## Build-on / canonical surfaces
StoreV3 (frontend), StorefrontItem + new ProductVariant (catalog), cart + v2 payments (checkout). Reuse the proven add-to-cart + Stripe checkout; extend, don't fork.

## Risks / ops notes
- Stripe Tax: enable + register CA in Stripe dashboard (Sean) before Phase 2 ships.
- Self-ship merch: real shipping logistics (rates, packing) — keep Phase 1 lean (flat or weight-based rate) before carrier-calculated.
- Product images: host on R2 (existing video/asset pattern), not in-repo.
- Keep services tax-free: a regression here (taxing a package) would erode trust — covered by a per-item taxability test.
- Variants add real complexity (stock per size/color) — isolate to Phase 1.

## Trust guardrails (Sean's #1)
Honest, all-inclusive package pricing (no tax line on services); compliant, clearly-shown tax on goods (never hidden); shipping cost shown before payment; no surprise fees at checkout.

## Product Catalog v1 (first products — 2026-06-13)

### FLAGSHIP (first physical product): "Buddy Fat Skin" recovery drink
Organic anti-inflammation / recovery drink (formerly a personal regimen). Ingredients:
organic green tea, lemon, ginger, honey (preferred) or a little agave, cinnamon, cayenne.
Optionally a steeping tea bag in-bottle. **Freshness is the priority.**
- `itemKind=physical_product`, `isTaxable=true` (CA beverage — set the right Stripe Tax
  product code), `fulfillmentType='local_delivery'` (local-first in 92807; pickup option;
  shipping only considered later because freshness).
- **Sizes:** hero **1.5L "day bottle"** (Sean's normal serving — sip through the day,
  re-water/refresh later) + optional **16oz "trial"**.
- **Tiers (variants):** **Organic** (premium) + **Everyday** (lower-priced, clean but
  non-certified-organic ingredients — for buyers who want it cheaper). So 4 variants =
  tier × size, modeled via ProductVariant. Recommended prices: Organic 1.5L $24 / 16oz $9;
  Everyday 1.5L $17 / 16oz $6.50 (adjust to real ingredient costs). Seed (inactive until
  permit + Stripe Tax): `backend/seed-buddy-fat-skin-drink.mjs`.
- **Pricing rec** (validate vs real Costco/Sprouts organic costs): est. COGS ~$5–8 per
  1.5L (organic honey is the cost driver; lemon/ginger/tea/spices modest; + bottle/label/
  prep). Recommended: **1.5L ≈ $22–26**, **16oz trial ≈ $8–10**. Consider a weekly
  **local-delivery subscription** (e.g. 3×/week) — recurring revenue + recovery-routine +
  community fit.
- **⚠ REGULATORY GATE (resolve before selling):** a fresh tea/citrus/honey beverage likely
  does NOT qualify under CA Cottage Food law and may require a permitted commercial kitchen
  + county health permit + proper labeling. Confirm with the local health dept first. (Not
  legal advice — a gating real-world step, like Stripe Tax CA registration.)

### Supplements (dropship — AGI partnership): `fulfillmentType='dropship'`
protein powder, glutamine, amino acids, multivitamin. Needs AGI fulfillment process + product list.

### Recovery gear (self-ship — Sean's inventory): `fulfillmentType='self_ship'`
foam rollers, stability balls, vibrating foam rollers, vibrating recovery pads ("rumbler"
0–40 Hz). Needs SKUs, weights, shipping origin + rate model.

### Fulfillment types (updated)
`none` (training package) · `dropship` (AGI supplements) · `self_ship` (merch/gear) ·
`local_delivery` (the drink — local-first) · `pickup`.

## Admin Store Control (2026-06-13 — Sean: "100% full control with buttons I can slide on/off")

### What already exists (verified 2026-06-13)
The admin store backend + a management UI are already live — this was a discovery, not a gap:
- **Backend CRUD (complete):** `adminPackageRoutes.mjs` (`protect` + `requireAdmin`) — `GET /` (lists ALL items incl. inactive when no `isActive` filter), `POST /`, `PUT /:id` (full update → toggles `isActive`), `DELETE /:id`, `GET /:id`. Mounted at `/api/admin/storefront` (legacy) + `/api/admin/packages` (new). A second admin CRUD also exists in `storeFrontRoutes.mjs` (`POST/PUT/DELETE`, admin-role-gated) with a `pricePerSession ≥ $140` guard — that guard is route-only, NOT on the model.
- **Admin UI (mounted):** `admin-packages-view.tsx` at `/dashboard/admin-packages` ("Store & Revenue" tab) — stats cards, searchable/filterable product table, Create/Edit/Delete dialogs, Send-Special-Offer, and an Active/Visible switch (it was inside the Edit dialog).

### Gap Sean named → DONE this slice
The on/off switch existed but was **buried in the Edit dialog** (open → flip → Save = 3+ clicks). Sean wants "buttons I can just slide on and off." **Built: a one-click inline row toggle** in the Status column (reuses the house 44px switch; optimistic update + revert-on-error; concurrency-guarded; keeps the active-count stat in sync). Now: **1 click to take a product live or hide it.**

### Deeper admin feature set (recommended, ranked by value)
*Tier 1 — control & safety (next):*
1. **Inline toggle — DONE.** One-click product on/off from the table.
2. **Surface product fields in the admin table + dialogs.** The admin mapper (`adminPackageRoutes` GET) omits `itemKind / isTaxable / fulfillmentType / stockQuantity / sku`. Add them so Sean can see/edit "is this a package or a product," "is it taxable," "how does it ship," and stock. *(Backend mapper + dialog fields; additive.)*
3. **Product (vs package) create/edit mode.** The Create/Edit dialogs are package-shaped (sessions/months/price-per-session). Add a product mode (name, price, image, taxable, fulfillment, SKU, stock, variants) so physical products are managed from the same screen.
4. **Destructive-action confirms + "deactivate, don't delete" nudge.** Delete already warns; enforce a typed/explicit confirm for delete, and steer toward toggle-off for anything that may have been purchased.

*Tier 2 — merchandising & ops:*
5. **Variant management** (the drink's tier/size; merch size/color) - first admin CRUD slice is in place; remaining polish is richer attributes, order controls, and live visual QA.
6. **Drag-to-reorder / `displayOrder` control** — Sean controls the order products appear in the store (the `displayOrder` column exists).
7. **Inventory view + low-stock flags** for self-ship gear (foam rollers, etc.).
8. **Image management** — upload/set product image (R2), per the existing R2 asset pattern.
9. **Store-open master switch** — a single "store accepting orders" flag (maintenance / pre-launch) above per-product toggles.

*Tier 3 — intelligence & trust:*
10. **Order/fulfillment ops** — view orders, mark fulfilled, print/export (some lives in `adminOrdersRoutes`; wire to UI).
11. **Tax control panel** — per-item `isTaxable`, Stripe Tax status, CA-registration health.
12. **Sales analytics** — units, revenue, conversion per product (feeds the "Store & Revenue" tab).
13. **Admin audit log** — who changed/toggled/deleted what, when (accountability; pairs with the destructive confirms).

### Workflow & protocol (guardrails)
- **Toggle = soft, instant, reversible.** On/off is non-destructive and 1-click; it never deletes data.
- **Delete = hard, confirmed.** Requires explicit confirm; warns about purchased-package impact; prefer deactivate.
- **Consumable go-live gate.** The recovery drink (and any ingestible) stays `isActive:false` until the **county health permit + Stripe Tax CA registration** are confirmed. The toggle can flip it on — but the protocol is: don't, until the real-world gates clear. (Same discipline as the Stripe Tax registration gate.)
- **Taxable products need Stripe Tax live** before activation, or CA sales tax won't be collected on goods.
- **Audit-worthy actions** (delete, price change, activation of a consumable) should be logged once the audit log lands.
- **Mobile check** the admin table at phone width before calling the admin surface done (rule 24).

### Admin Store Control - slice sequence
- **AS-1 (DONE):** one-click inline on/off toggle.
- **AS-2 (DONE):** admin mapper exposes the product fields; table shows a product meta line (kind/fulfillment/tax/stock); a "Products" filter. Item type carried on the admin model.
- **AS-3 (DONE — except image):** product create/edit mode — Item Kind selector + flat-price/tax/fulfillment/SKU/stock fields in BOTH dialogs; product-aware backend POST validation (a product's `pricePerSession: 0` no longer rejected); save logic branches product (flat price) vs package (price×sessions). **Image upload deferred → AS-3b.** Both dialogs extracted to `admin-packages-view.dialogs.tsx` to stay under the rule-4 / style-extraction line budget.
- **AS-3b (DONE):** product/package image upload - reusable `ProductImageField` (upload to R2 via `POST /api/admin/storefront/upload-image`, or paste a URL, with sanitized preview) in both dialogs; `RowThumb` thumbnail in the admin table; backend endpoint reuses `photoStorageService.uploadPhoto` (category `products`, 5MB, JPG/PNG/WEBP, clean 413 on oversize); `'products'` added to the serve-photo allowlist. Adversarial review caught and fixed the ProductDetail raw `imageUrl` CSS sink plus the multer oversize 500.
  - **Deployment-QA note (R2 image URLs):** before relying on uploaded images in production, confirm production `R2_PUBLIC_URL` is either **unset** (uses the `/api/serve-photo` proxy - allowlist-safe) OR equals an allowlisted origin in `frontend/src/utils/imageUrl.ts` (currently `media.sswanstudios.com`, per `backend/utils/imageUrl.mjs`). If `R2_PUBLIC_URL` is changed to any other domain such as raw `*.r2.dev`, that origin MUST also be added to `VITE_PHOTO_ORIGINS` at frontend build time, or both the admin thumbnail and the public store card silently render the gradient fallback.
- **AS-4 (FIRST SLICE DONE):** variant management - admin CRUD endpoints plus inline edit-dialog UI for physical products. Remaining polish: richer attributes UI, display ordering, and production-auth visual QA with real product rows.
- **AS-5:** displayOrder reorder + store-open master switch.
- **AS-6:** orders/fulfillment ops + analytics + audit log.

> Tech-debt note: `admin-packages-view.tsx` is ~1357 lines (still over the rule-4 300-line target, but under the file's style-extraction guard of 1525). The SendOffer + Delete dialogs and the table row are candidates for further extraction in a dedicated cleanup pass (rule 37) — not mixed into a feature slice.

## Open items for Sean
- AGI supplement partnership: fulfillment API/process + product list (needed for Phase 3).
- Merch line: SKUs, sizes/colors, shipping origin + rate model (needed for Phase 1/2).
- Stripe Tax: enable + CA registration in Stripe dashboard (before Phase 2).
