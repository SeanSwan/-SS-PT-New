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

## Open items for Sean
- AGI supplement partnership: fulfillment API/process + product list (needed for Phase 3).
- Merch line: SKUs, sizes/colors, shipping origin + rate model (needed for Phase 1/2).
- Stripe Tax: enable + CA registration in Stripe dashboard (before Phase 2).
