**Re-derivation rule**

For any source citation in this package:

```powershell
$p = '<cited path>'
$a = <first cited line>
$b = <last cited line>
$s = Get-Content -LiteralPath $p
$a..$b | ForEach-Object { '{0}: {1}' -f $_, $s[$_-1] }
git diff ad268c2d4 -- $p
```

Replace the three values with the citation being checked. This is a read-only source command, not a behavioral acceptance test.

**Registry bindings**

| Fact | Source | Re-derivation |
|---|---|---|
| Workout shadow order | `backend/core/routes.mjs:356–357`; `backend/routes/workoutRoutes.mjs:201–236` | `rg -n 'workoutRoutes|workoutSessionRoutes' backend/core/routes.mjs` |
| Actual trainer CRUD gates | `backend/controllers/workoutController.mjs:270–386` | `rg -n "req.user.role.*trainer" backend/controllers/workoutController.mjs` |
| Cart/v2/order mounts | `backend/core/routes.mjs:316,334–335` | `rg -n 'cartRoutes|v2PaymentRoutes|orderRoutes' backend/core/routes.mjs` |
| Webhook aliases | `backend/core/routes.mjs:704–706`; webhook handler registration | `rg -n 'stripeWebhookRouter|router.post' backend/core/routes.mjs backend/webhooks/stripeWebhook.mjs` |
| Private media aliases | `backend/core/routes.mjs:549`; middleware `:110,117` | `rg -n 'serve-photo|/uploads|/photos/' backend/core/routes.mjs backend/core/middleware/index.mjs` |
| Success JSX mount | `frontend/src/routes/main-routes.tsx:671–675` | `rg -n 'checkout/success|<SuccessPage' frontend/src/routes/main-routes.tsx` |
| Success API consumer | `SuccessPage.tsx:79–81` | `rg -n 'verify-session' frontend/src/components/NewCheckout/SuccessPage.tsx` |
| Waiver JSX mount | `main-routes.tsx:408–411` | `rg -n "path: 'waiver'|<PublicWaiverPage" frontend/src/routes/main-routes.tsx` |
| Waiver consumer | `frontend/src/services/publicWaiverService.ts` | `rg -n 'api/public/waivers|post.*submit' frontend/src/services/publicWaiverService.ts` |
| Emitted tokens | `frontend/src/utils/theme/themeUtils.ts:166–200` | `rg -n -- '--bg-base|--bg-surface|--text-primary|--text-secondary|--border-soft|--accent-secondary|--accent-gold' frontend/src/utils/theme/themeUtils.ts` |
| Existing table identities | `Order.mjs:89`; `ShoppingCart.mjs:107`; `Session.mjs:337`; `User.mjs:552` | `rg -n 'tableName' backend/models/Order.mjs backend/models/ShoppingCart.mjs backend/models/Session.mjs backend/models/User.mjs` |
| Accounting identity | `backend/models/financial/FinancialTransaction.mjs:195–215,322` | `rg -n 'orderId:|cartId:|stripePaymentIntentId:|tableName:' backend/models/financial/FinancialTransaction.mjs` |

**Surface classification**

| Surface | Classification |
|---|---|
| `workoutRoutes → workoutController` common CRUD | Canonical first-mounted handler |
| `workoutSessionRoutes` same CRUD paths | Shadowed/legacy for overlapping paths |
| Later `/start`, `/:id/end`, statistics paths | Separately reachable candidates; test exact matching in S1 |
| V2 checkout and success page | Canonical source mount verified |
| Legacy cart webhook | Mounted compatibility path; retain as adapter |
| Both order allocators | Active callers exist; converge implementation |
| Private media aliases | Competing active access paths; unify policy |
| Waiver V3 and V2 fallback | Primary and compatibility surfaces; identical security result contract |

**Name registry**

New repeated state strings live in `frontend/src/components/NewCheckout/checkoutStatusCopy.ts`, keyed by receipt state. Waiver result strings live in `frontend/src/services/waiverStatusCopy.ts`. No global renaming of existing navigation.

**Token parity**

Consumed set:

```text
--bg-base --bg-surface --text-primary --text-secondary
--border-soft --accent-secondary --accent-gold
```

It is contained in the inspected emitter. Computed browser values and contrast remain unverified.

**Page shell**

Reuse existing checkout shell; state card max width `800px`, mobile width `calc(100% - 32px)`. No new dashboard grid. Preserve waiver form shell.

**Mode matrix**

| Surface | Client/user | Trainer | Admin |
|---|---|---|---|
| Receipt | Owned purchase only | Owned purchase only | Own receipt; administrative operations remain separately gated |
| Workout record | Self | Self or active assigned client | Existing administrative access |
| Private measurement media | Self | Active assigned client | Existing administrative access |
| Waiver public form | Unlinked if anonymous; self-bound if authenticated | Cannot impersonate a client using body fields | Separate audited staff workflow |
