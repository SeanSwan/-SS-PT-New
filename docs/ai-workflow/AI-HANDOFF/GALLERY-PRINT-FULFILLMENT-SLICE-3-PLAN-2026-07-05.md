# Gallery Print Fulfillment — Slice 3 Plan (Prodigi Drop-Ship)

> **AI Village review packet + build spec.** Status: PLAN — awaiting Village review, then triangle ratification, then build.
> **Privacy (Rule 8/64):** IDs / roles / architecture patterns only. No PII, no client data, no secrets, no API keys anywhere in this doc.
> Author: Claude Opus 4.8 (VS-Claude) · Date: 2026-07-05 · Feature loop: Photography deals-gallery (Slice 3 of 3).

---

## 0. Decision (locked by Sean 2026-07-05)
- **Fulfillment model:** Prodigi drop-ship — client pays → Prodigi prints & ships direct to the client (blind white-label). Least manual effort; fits the existing `PrintOrder` schema.
- **Review depth:** Paid AI Village → triangle ratify → build.
- **Deferred alternative (not this slice):** Sean-orders-locally-and-resells (Bay Photo / OC lab). The design keeps a provider seam so a manual-fulfillment path can be added later without rework.

## 1. Current state (from the Slice-0 discovery, file:line verified there)
**Exists but DORMANT / incomplete:**
- `PrintOrder` model (`print_orders` table): `productType` ENUM(print|canvas|metal|photobook|poster), `size`, `quantity`, `priceUsd`, `commissionUsd`, `status` ENUM(pending|paid|processing|shipped|delivered|cancelled default pending), `stripeSessionId`, `idempotencyKey`, `printProviderOrderId` (comment: "Printful/Gelato/etc"), `shippingAddress` (JSONB), `trackingNumber`, `paidAt`, `shippedAt`. Has a real migration + unique idempotency index + race-guard tests. **NOT registered in `associations.mjs`.**
- Backend `/api/gallery/print-*` on `galleryRoutes.mjs`: `GET /print-products` (catalog + pricing + commission), `POST /print-order` (claimIdempotentRecord(PrintOrder) → Stripe Checkout session with `metadata.type='print_order'`), `GET /print-orders` (visitor history).
- `frontend/src/pages/gallery/PrintStore.tsx`: full product/size/qty picker + checkout drawer — **UNREACHABLE** (`setShowPrintStore` never set true; the gallery "Order prints" affordance is a disabled "Coming Soon" card).

**MISSING (this slice):**
- No `metadata.type==='print_order'` case in `stripeWebhook.mjs` → paid print orders never leave `pending`; `paidAt` never set.
- No print-lab integration → `printProviderOrderId` / `trackingNumber` / `shippedAt` never written.
- No admin surface to view / manage / fulfill print orders.
- No un-watermarked print-asset path (see §5 — the biggest open risk).

## 2. Sub-slices (build order; each gets slice-internal hostile review per Rule 61)
- **3a — Enable storefront (frontend-only, low risk):** un-gate the "Order prints" card; wire `setShowPrintStore(true)`; keep it behind a feature flag default-OFF until 3b–3e land.
- **3b — Close the money loop (HIGH-STAKES billing):** add the `print_order` case to `stripeWebhook.mjs` — signature-verified, idempotent, `pending → paid` + `paidAt`, fail-closed.
- **3c — Prodigi fulfillment:** on `paid`, submit order + high-res asset to Prodigi; store `printProviderOrderId`; consume Prodigi's status webhook → `processing → shipped` + `trackingNumber`. Idempotent both directions.
- **3d — Admin fulfillment view:** list/manage `print_orders` (status, product, amount, provider id, tracking; actions: retry Prodigi, mark shipped, refund). Register `PrintOrder` associations.
- **3e — Tax + go-live prereqs:** Stripe Tax on the print checkout (NOT a hardcoded rate — note the pre-existing hardcoded-8% product tax gotcha in v2PaymentRoutes); operational: CDTFA seller's permit + resale certificate (Sean's side).

## 3. Billing/security design — the high-stakes core (3b)
- **Signature verification:** reuse the existing Stripe webhook signature-verification pattern in `stripeWebhook.mjs` (do NOT add a second unverified entry point).
- **Idempotency:** reuse `claimIdempotentRecord` / `buildGalleryPrintAttemptKey` (already used by `/print-order`). The webhook handler must be safe against Stripe's at-least-once delivery (same event twice → no double-fulfill, no double-charge).
- **Mapping:** resolve the `PrintOrder` by `stripeSessionId` (from the session object) — never trust client-supplied ids. Flip `pending → paid` + set `paidAt` inside a transaction; if already `paid`/beyond, no-op (idempotent).
- **Fail-closed ordering:** mark `paid` FIRST (money is captured), THEN trigger Prodigi submission (3c) as a separate step. If Prodigi submission fails, the order stays `paid` (not `processing`) and surfaces in the admin view — money captured, product pending, visible, retryable. Never leave a captured order invisible.

## 4. Prodigi integration (3c)
- **Trigger:** only on `status === 'paid'` and only if `printProviderOrderId` is null (idempotent — never resubmit).
- **Order create (REST):** map `PrintOrder.productType`+`size` → Prodigi SKU (a small server-side lookup table); recipient = `shippingAddress`; asset = high-res image URL (see §5); quantity. Store the returned Prodigi order id in `printProviderOrderId`. Sandbox first.
- **Status inbound:** Prodigi status webhook (verified) → advance `processing → shipped`, store `trackingNumber` / `shippedAt`. Idempotent.
- **Blind ship:** white-label to the client (no Prodigi/SwanStudios-internal branding leakage beyond intended).
- **Failure handling:** Prodigi 4xx/5xx → log, keep order `paid`, alert in admin view, allow manual retry. Consider a bounded auto-retry.
- **Secrets:** Prodigi API key in env only (never repo). Separate sandbox vs live keys.

## 5. ⚠ BIGGEST OPEN RISK — the print asset is watermarked
The gallery watermarks images BEFORE the R2 PUT, so `storage_key` (and `photo.url`) are **watermarked**. A paid print must NOT ship watermarked. Options for the Village to weigh:
- (a) Store an **un-watermarked original** at upload (new storage key / bucket path), gated so only the paid-print path can read it. Requires an admin-uploader change + model field.
- (b) Use the existing `enhancedUrl` / an "original" variant if one is retained un-watermarked (verify whether any un-watermarked asset currently persists — discovery suggests NOT).
- (c) Prints only for galleries the admin uploads with watermark OFF (operational workaround; weak).
**This likely expands Slice 3 to touch the admin uploader (Slice 1's surface).** Flag for explicit decision.

## 6. Admin fulfillment view (3d)
- New admin route family on `adminGalleryRoutes.mjs` (admin|trainer gated) + a UI panel (extend the new Photo Gallery Studio, or a sibling). Register `PrintOrder` in `associations.mjs` for eager-load of photo/visitor/event.
- Shows: order status lifecycle, product, amount, `commissionUsd` (Sean's markup), client (ID/role — PII handling), provider order id, tracking. Actions: retry Prodigi, manual mark-shipped, refund (Stripe).

## 7. Tax & commerce (3e)
- **Stripe Tax** on the print checkout, computed by ship-to address — do NOT reuse the hardcoded flat product-tax rate. Decide who remits (Sean vs a marketplace-facilitator provider); with a resale certificate on file, Prodigi shouldn't tax the wholesale and Sean charges the client at checkout.
- **Pricing:** `PrintOrder.priceUsd` (retail) − Prodigi wholesale = margin; `commissionUsd` tracks Sean's cut. Confirm the markup model.

## 8. Open questions for the Village to pressure-test (ranked)
1. **Un-watermarked print asset** (§5) — the load-bearing gap. Best option?
2. **Paid-but-unfulfilled failure** — order captured money but Prodigi submission failed. Auto-retry vs manual vs auto-refund? SLA?
3. **Webhook race/idempotency** — Stripe `paid` webhook vs a duplicate delivery vs the Prodigi submit; any double-fulfill window?
4. **Minor's data (COPPA/PIPEDA)** — sports galleries can include minors; a shipping address for a minor's family is sensitive PII. Consent + handling?
5. **Refund/cancellation policy** — client cancels after Prodigi is in production?
6. **Tax remittance responsibility** — Sean vs facilitator; double-collection risk.
7. **Feature-flag + rollout** — default-off until sandbox + tax + resale cert verified?

## 9. Verification plan (TDD, Rule 50/55/61)
- Webhook unit/contract tests: signature required, idempotent replay, `pending→paid` transition, unknown/duplicate event no-op, no PII echoed in errors.
- Prodigi client tests (mocked): SKU mapping, idempotent submit (no resubmit when `printProviderOrderId` set), failure → order stays `paid`.
- Admin view tests: auth-gate, status render, action payloads.
- Integration: Stripe **test mode** + Prodigi **sandbox** end-to-end before any live key.

## 10. Rollout
- Feature flag `print-storefront` default OFF. Enable per Sean only after: Prodigi sandbox order verified, Stripe Tax live, resale cert on file, un-watermarked asset decision implemented.

## 11. Privacy & security posture (Rule 8)
- No PII/secrets in this doc or any Village packet. Client shipping address = PII → never sent to LLMs; stored server-side only; consider encryption-at-rest. Prodigi/Stripe keys in env only. Zero client data leaves the server to any review model.

---

## 12. Free Triangle Fusion Review — verdict (Claude + Gemini + Codex-async)
> Ran 2026-07-05 (Tier-2 free triangle, no spend). Gemini via consult-gemini API. Codex leg posted to review-queue (async; synthesis proceeded with the ≥2 present per fusion doctrine).

**CONSENSUS (Claude + Gemini):** backend/systems architecture (fail-closed webhook, idempotency reuse, Prodigi seam) is sound → APPROVED to proceed. The §5 un-watermarked-asset gap is THE critical prerequisite (Claude: architecture; Gemini: reframe as a trust feature). Feature-flag + sandbox-first is right.

**CLAUDE unique (security/billing lens):**
1. §5 is bigger than stated — the only robust fix (store an un-watermarked master) **modifies the admin uploader (Slice 1's surface)**: dual R2 PUT (watermarked preview kept public + un-watermarked original to a PRIVATE path never served to the public gallery/zip) + new `GalleryPhoto.originalStorageKey`. Storage ~doubles for print-selling galleries. RETROACTIVE gap: already-uploaded (watermarked-only) galleries can't sell prints without re-upload — a Sean decision.
2. Prodigi must fetch the original via a **short-lived SIGNED R2 URL**, never a public URL (a public un-watermarked URL defeats the paywall).
3. The Prodigi-submit needs its OWN **atomic compare-and-set** on `printProviderOrderId` (or SELECT…FOR UPDATE) — a read-then-write idempotency check has a double-submit race → double print/ship.
4. **Refund LOGIC** (not just Gemini's "cancelled" badge): captured-but-Prodigi-failed orders need an admin Stripe-refund action + status→cancelled; decide auto vs manual.
5. **Sequence correction: build backend money-loop FIRST, enable the UI LAST** (flag-off until the whole chain is sandbox-verified) — don't let a client pay for a print that can't fulfill.

**GEMINI unique (design lens):** full PrintStore decomposition (Drawer/Preview/TypeSelector/SizeSelector/QuantityStepper/PriceSummary/CheckoutButton), un-watermarked-preview-as-trust-feature, admin StatusBadge system, Vault checkout drawer, Framer-Motion enter/exit, a11y/responsive directives.

**CONTRADICTION (resolved):** Gemini directs `${theme.colors.X}` + "no raw hex", but the gallery pages use `var(--token, #hex)` (no styled-components theme object) → TRANSLATE Gemini's specs to the gallery token pattern (Rule 6). Gemini's new hexes (#C92A54, #4A4A54) aren't Crystalline palette → tokenize to Swan danger (var(--danger,#E5484D)) + a palette gray.

**BLIND SPOTS (neither fully covered; carry forward):** Codex's idempotency/route-ownership/Stripe-event lens (async review pending); retroactive back-fill for existing galleries; Prodigi exact SKU catalog mapping; Stripe-shipping-address → Prodigi-recipient schema fit + country coverage.

**FUSED RECOMMENDATION — reordered/expanded sub-slices:**
1. **3a — un-watermarked master pipeline** (backend + admin uploader; private R2 original + `originalStorageKey` + signed-URL delivery) ← load-bearing prerequisite.
2. **3b — webhook money loop** (signature + ATOMIC idempotency + pending→paid).
3. **3c — Prodigi fulfillment** (atomic CAS submit, signed-URL asset, status webhook, refund path).
4. **3d — admin fulfillment view** (Gemini StatusBadge spec, tokenized).
5. **3e — Stripe Tax** on print checkout (not the hardcoded rate).
6. **3f — enable storefront UI** (Gemini design spec, tokenized), flag-OFF until the whole chain is sandbox-verified; flip on Sean's go.
Each sub-slice: slice-internal hostile review + Codex review; 3b/3c/3e are the high-stakes billing units. **Two Sean decisions gate the start:** (1) un-watermarked master = new-galleries-only vs retroactive re-upload; (2) refund on Prodigi-failure = auto vs manual (recommend manual for v1).
