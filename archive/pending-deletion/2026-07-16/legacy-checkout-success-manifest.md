# Legacy Checkout Success Archive - 2026-07-16

## Purpose

This companion manifest records three zero-caller checkout-success leftovers moved during the pre-launch audit. Original paths remain recoverable; no source file was permanently deleted.

## Evidence

- `frontend/src/routes/main-routes.tsx:228-230` lazy-loads `components/NewCheckout/SuccessPage` as the Genesis success page.
- `frontend/src/routes/main-routes.tsx:683-687` renders that Genesis success page at `/checkout/success`.
- Exact path, filename, symbol, import, route, entrypoint, and package-script searches found no runtime consumer for the archived files.
- The only reference to `pages/checkout/CheckoutSuccess.tsx` was its own source-reading truth test, archived with it.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/CheckoutSuccessAnimation.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/CheckoutSuccessAnimation.jsx` | callerless standalone checkout animation |
| `frontend/src/pages/checkout/CheckoutSuccess.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/checkout/CheckoutSuccess.tsx` | unmounted legacy checkout-success page |
| `frontend/src/pages/checkout/CheckoutSuccess.truth.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/checkout/CheckoutSuccess.truth.test.ts` | source-only contract for the legacy page |

## Canonical surface retained

`frontend/src/components/NewCheckout/SuccessPage.tsx` remains the route-mounted `/checkout/success` surface. Current checkout handlers, providers, cancel flow, API services, and payment routes remain unchanged.

## Restore procedure

Restore only after proving a distinct mounted product need and reconciling it with the Genesis success page. Then rerun checkout truth tests, typecheck, build, full frontend tests, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
