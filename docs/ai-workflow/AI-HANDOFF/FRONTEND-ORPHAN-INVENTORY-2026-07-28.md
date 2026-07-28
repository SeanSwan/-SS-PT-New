---
decision: Classify the 236 unreferenced frontend modules before any deletion; nothing is removed in this pass.
status: open
supersedes: none
---

# Frontend Orphan Inventory — classification, not cleanup
**Date:** 2026-07-28 · **Linear:** SWA-75 · **Author:** Claude (Opus 5)
**Pass type:** NON-DESTRUCTIVE. Zero files moved, renamed, or deleted (Rules 33/34/37).

## Why this is an inventory and not a cleanup

Sean asked the loop to keep removing dead files. This pass deliberately stops at classification, for one concrete reason learned earlier in the same audit:

`backend/middleware/trainerPermissionMiddleware.mjs` was 563 lines wired into zero routes — indistinguishable from junk by every automated signal. It was a **complete granular permission system**, and deleting it would have thrown away real work. It got a semantic fix instead.

`NASMAdminDashboard.tsx` is 1,128 lines with no importer. By signal alone it looks identical to junk. NASM is core to this product. **Signal alone is not sufficient evidence to delete.**

## Scope

- 4,922 frontend modules scanned
- **236 with no importer** (~41,610 lines)
- Detection counts static imports, dynamic `import()`, `require`, barrel re-exports, and `lazy()` references; commented-out references do NOT count

## Verified by hand (not by sweep)

| File | Lines | Importers | Note |
|---|---:|---|---|
| `components/Admin/NASM/NASMAdminDashboard.tsx` | 1128 | none | **Do not delete without Sean.** NASM is core product; likely built-not-wired, the `trainerPermissionMiddleware` pattern |
| `.../admin-dashboard/components/AdminSocialManagementView.tsx` | 873 | none | Admin moderation surface — check against the live social admin route before any action |
| `.../admin-dashboard/UsersManagementSection.tsx` | 834 | none | A live `EnhancedUserDataManagement` route exists; this is plausibly its superseded predecessor |
| `components/Checkout/OrderSummaryComponent.tsx` | 828 | none | Checkout is money-path. Verify against the live `NewCheckout` tree before touching |
| `components/PremiumParallax/PremiumParallax.tsx` | 657 | none | Presentational |
| `components/NewsletterSignup/NewsletterSignup.jsx` | 579 | none | `.jsx` in a `.tsx` codebase — likely genuinely superseded |
| `components/TestimonialSlider/TestimonialSlider.tsx` | 701 | **doc comment only** | Sole hit is `<TestimonialSlider />` inside a comment in `V1ThemeBridge.tsx`. Not a usage |

Two sweep results were **false**: `TestimonialSlider` (comment, above) and `FeaturesSection` (the hit was `FeaturesSection.V2.tsx`, a different file whose *name contains the string*). Substring matching is not reference detection.

## Explicitly cleared: these are NOT the parked design work

Sean parked the design-overhaul program and said not to touch it. The parked concepts live under `pages/DesignPlayground/concepts/`, loaded by `playgroundRegistry` via dynamic `import()`. **None of the candidates above appear anywhere in that registry tree** (verified: 0 references each). Deleting them would not disturb the parked program — but that is an argument for safety, not for deleting.

## Classification (Rule 33)

1. **Superseded predecessor** — a live sibling does the same job. Safest class; still needs the live surface named as evidence.
2. **Built-but-unwired feature** — substantial, coherent, no live equivalent. `NASMAdminDashboard` is the archetype. **Sean's call: wire, park deliberately, or archive.** Never a silent delete.
3. **Genuinely dead** — superseded, no equivalent, no value. `.jsx` leftovers in a `.tsx` codebase are the strongest members.
4. **Ambiguous** — leave alone and say so (Rule 33).

## Recommended sequence

1. Sean rules on class 2 (the big ones) — one sentence each: wire / park / archive.
2. Class 1 and 3 removed in **small batches**, each with: the live replacement named, a broad path-and-string reference sweep (not just imports), `tsc --noEmit`, and `npm run build`.
3. Never a bulk delete. The earlier backend pass proved the cost — a test read a deleted file via `readFileSync`, invisible to import-graph checks.

## What this pass changed

Nothing. Inventory only.
