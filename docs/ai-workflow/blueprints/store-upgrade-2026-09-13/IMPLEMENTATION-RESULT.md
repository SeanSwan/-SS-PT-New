# Store upgrade implementation handoff

Version 3, 2026-09-13. This is the current implementation status supplement to
README.md version 1 (the preserved plan), APPROVED-CONTINUATION.md, and original
review packets. The plan and prior rejected/failed evidence remain unchanged.

**Status: IMPLEMENTED AND VERIFIED LOCALLY; final independent Astra review APPROVED.**
The frozen candidate digest is
`bf1121ee6f4e0d03f59231bdecd5fe582cc4a24237d9eb2fd276cde4928b22cd`.
Worktree: `tmp/worktrees/store-upgrade-20260913`, branch
`codex/store-upgrade-20260913`, base `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`.
No commit, main push or deployment has been performed.

## Plain-English Summary

The mounted store now has a clear sequence: a cinematic introduction, an
explanation of the training method, memberships, a featured commitment, a
comparison, and separate training/recovery-product shelves. The existing hero
poster and video references are preserved, with pause/play and motion/data
preferences respected. Catalog failures keep consultation and membership paths
available. Prices, features and comparisons come from live catalog contracts.

The purchasing logic was the priority. Display prices now follow the same
resolver as checkout. Physical products show public prices but require a valid
stocked option. Training prices retain the existing individual access grant;
guests and users without access can inquire. Product detail no longer crashes
on redacted prices, invents recommendations, or loses its purchase controls
through long descriptions. Rapid cart clicks are serialized and every outcome
has visible feedback. Membership prices/savings come from the API, and checkout
has a useful empty state, guarded submission and sanitized diagnostics.

The review rejected several incorrect assumptions in the pasted chat: V4
already exists but is unmounted; the specials and manual-session routes are
mounted; the claimed startup cart race was unproven; and the referenced
"checkout privacy" audit concerned a Git checkout. Unsupported promotional
bonuses were suppressed because the purchase/grant path did not implement them.
We preserved the supported individual custom-package rail.

## Technical Summary and traceability

| Requirement | Implemented surface | Local evidence / scope |
|---|---|---|
| R1 / T1 price parity | storefrontDisplayService + actual route DTO | Real charge resolver with synthetic list/detail/conflict/null/variant fixtures; backend tests PASS |
| R2 / T2 promotions | public storefront serialization | Assigned/expired/unsupported AdminSpecial data suppressed; security/contract tests PASS; no admin record mutation |
| R3 / T3 access truth | useStorefrontCatalog, cards, ProductDetail | Guest/granted/ungranted cases and stale request ownership tests PASS; real account grant not exercised |
| R4 / T4 catalog detail | shared mapper, ProductVariantPicker, cards/detail | Cents, null metadata, variants, stock precedence, quantity clamping and inquiry tests PASS |
| R5 / T5 cart safety | StoreV3, checkoutDiagnostics, CheckoutView | A/B/A lock, success/failure recovery, pending controls and primitive-only diagnostics tests PASS |
| R6 / T6 memberships | useSubscription, MembershipSummary, Ascension | API price/features/annual savings, identity ownership, StrictMode, retry and pending tests PASS |
| R7 / T7 checkout | CheckoutView, SuccessPage | Empty/loading/error/recovery, guarded redirects, verified-success response and reduced-motion component tests PASS; no Stripe/webhook execution |
| R8 / T8 store experience | StoreStory, StoreSpotlight, StoreComparison, PackagesGrid | Mounted sections and catalog ready/empty/error cases PASS; no fabricated customer results |
| R9 / T9 access/responsive | all scoped storefront UI | Six widths 320–3840, keyboard variants/inquiry, unique anchor, zero reduced/save-data media requests, long-detail sticky positions PASS |
| R10 / T10 compatibility | final combined candidate | 162 frontend + 82 backend tests, full tsc, Vite build and guest mounted flows PASS; final independent review APPROVED, all six findings resolved |

Final repair evidence root: `.mega-blueprints/artifacts/44866dbf60f0c9c9/`
(relative to the worktree root). Key files:
- `final-r3-frontend-green.txt` — 40 files / 162 tests PASS.
- `final-r2-backend-green.txt` — 10 files / 82 tests PASS.
- `final-r3-typecheck-exit.txt` — full TypeScript exit 0 (12 GB heap).
- `final-r3-build-output.txt` + exit receipt — production Vite build PASS.
- `final-r2-final-browser.json` — six widths and error/empty/detail states PASS.
- `final-r2-interactions.json` — inquiry/variant/login/annual billing flows PASS.
- `final-r2f-repairs-browser.json` — long-description sticky controls, poster
  decode, media references/fallback/pause and reduced/save-data requests PASS.
- `final-repair-red.txt` and earlier browser outputs preserve real failures.
- `FINAL-R2-REVIEW-PACKET.md` maps the first five final-review findings to repairs.
- `FINAL-R3-REVIEW-PACKET.md` and `final-a6-production-inquiry-browser.json` prove
  the sixth repair: long-detail pricing inquiries portal to the viewport without
  opening scroll jumps, offscreen close controls, or lost focus restoration.
- Backend source hashes match the prior 82-test passing snapshot.
- The local production build also renders the store at 375/1440 without the
  development-only theme overlay (`production-preview.json`).

Commands (from frontend):
```powershell
node node_modules/vitest/vitest.mjs run src/pages/shop src/components/Shop src/components/NewCheckout src/hooks/useSubscription src/pages/AscensionPage --reporter=dot
node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --pretty false
node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build
node ../.mega-blueprints/artifacts/44866dbf60f0c9c9/store-browser-check.mjs <unused-evidence-tag>
node ../.mega-blueprints/artifacts/44866dbf60f0c9c9/store-browser-interactions.mjs <unused-evidence-tag>
node ../.mega-blueprints/artifacts/44866dbf60f0c9c9/store-browser-repairs.mjs <unused-evidence-tag>
```
Backend command: run Vitest on storefrontDisplayTruth, storefrontDisplayRoutes,
storefrontPriceGating, storefrontRoutesSecurity, storefrontCommerceFields.contract,
storefrontSpecialMoneyPath, storefrontRecoveryAndSorting,
storefrontCurrencyPrecision.contract, storefrontPublicSpecialHiddenContract, and
itemPricingParity under `backend/tests/api/` (each `.test.mjs`). All requests in
browser fixtures are intercepted; no commerce/contact submission is performed.

## Final review and readiness

The final independent Astra review approved the exact frozen digest above,
resolved FINAL-A1 through FINAL-A6, and found no new blocking issues. The reviewer
independently verified all 63 hashes, ran 31 focused tests, and exercised the
production-build dialog at mobile/desktop widths including forward/backward
Tab trapping. The workflow controller is COMPLETE with seven cumulative review
admissions and all original evidence retained. See final-r3-astra-review.json.

The separate implementation-readiness.json preserves the original plan receipt
and binds the completed workflow, current local results and scope limitations.
Its structural integrity check does not prove real provider or deployed behavior.

## Boundaries, operations and rollback

Local verification is complete for the implemented scope, with mocks explicitly
identified above. Real DB persistence, account grants, Stripe redirect/webhooks,
fulfillment, actual production R2 video playback, and deployment remain NOT RUN.
Video reference and 404 fallback tests do not prove real production video decode.
The existing poster did decode at 1376x768. New promotional media and consented
customer evidence were not fabricated. No migration or new dependency is needed.

The separate full-site task owns the admin special caller, manual-grant
atomicity, sitemap and shared auth/API account-switch repairs. Integrate this
isolated candidate onto fresh main after those changes and preserve them; rerun
its combined checks before any release. Never replace the dirty original tree.

Rollback is a scoped revert of this candidate after integration; no database
restore is needed. Before release, verify the existing custom-package and
membership rails, price grant changes and physical order lifecycle against an
isolated real provider/DB environment. Sean owns release authorization. This
packet does not authorize a main push, charge, provider spend or deployment.

The original ten-category packet includes requirements, contracts, desktop and
mobile wireframes, Mermaid flow, state/sequence/data/permission/privacy diagrams,
linked tests, slices and rollback. Preservation: the original 904-file snapshot
and two restore/hash checks are retained in the baseline evidence. No automated
vault/native-hook protection is claimed beyond the observed controller receipts.

Mermaid source is preserved in flow.mmd. A native app diagram-rendered preview
was not verified; this does not alter the tested application behavior.
