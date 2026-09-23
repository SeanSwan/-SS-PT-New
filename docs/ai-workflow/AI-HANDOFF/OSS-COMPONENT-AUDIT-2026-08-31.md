---
decision: Adopt 12 open-source replacements/consolidations across SwanStudios, ranked by value-per-line; explicitly keep 8 current choices
status: open
supersedes: none
---

# SwanStudios — Open-Source Equivalence Audit

**Date:** 2026-08-31 · **Author:** Claude Opus 5 · **Scope:** `origin/main` (frontend + backend) · **Type:** read-only audit, zero code changed

## 0. Read this first — the tree you are sitting in is not the app

The working tree is on `wip/comms-notifications-2026-07-05`, **2,303 commits behind `origin/main`** (528 ahead). Its `frontend/package.json` already disagrees with main's: this branch has `@mediapipe/tasks-vision` + `barcode-detector` and Vite 5; main has `three`, `@zxing/browser`, `@swan/forge`, and Vite 6.

**Every finding below was gathered against `origin/main`** via `git grep <pattern> origin/main -- <path>`, because main is what Render deploys. Auditing this branch would audit a ghost.

**Surface size:** 5,403 files under `frontend/src`; 2,822 `.mjs/.js` under `backend/` (703 services, 232 routes, 220 models); 2,832 test files.

---

## 1. What is already right — do not touch these

| Choice | Evidence | Verdict |
|---|---|---|
| `victory` charts | 37.3.6 = latest; 47 files; already lazy behind `components/Charts/SafeChart.tsx` | **KEEP** (Rule 10) |
| `sequelize` 6.37.8 | latest v6; v7 still alpha; 220 model files | **KEEP** |
| `styled-components` 6.1.6 | house standard, Rule 1 | **KEEP** |
| `react-window` 2.2.7 | latest is 2.3.0 — current | **KEEP** |
| `packages/swan-forge` | your own token/primitive system with drift-lint + contrast-audit scripts | **KEEP** |
| `frontend/public/spa-sw.js` | deliberate kill-switch SW, documented, no fetch handler | **KEEP as-is** (but see §5) |
| `backend/utils/clientExportCsv.mjs` | already neutralizes formula-leading cells + BOM + CRLF | **KEEP** — better than most CSV libraries' defaults |
| Redux Toolkit *and* React Query coexisting | 13 files vs 16 files, different jobs | **KEEP both** |

Test discipline is genuinely strong (2,832 test files). The error middleware, the PII-sanitization middleware, and the money-path rate-limit file all carry honest self-documented limitations. This is not a sloppy codebase — what follows is consolidation and leverage, not rescue.

---

## 2. TIER 1 — Adopt now (high value, near-zero breakage)

### 2.1 `rate-limit-redis` — ~15 lines, the biggest value-per-line in this audit
**Now:** `backend/middleware/moneyPathRateLimits.mjs:27` documents its own gap verbatim: *"No `store:` is configured, so…"*. `express-rate-limit` (39 files) runs on the default in-memory store. On multi-instance Render, N instances = N× the intended limit, and every restart resets the counters.
**Adopt:** `rate-limit-redis@6` pointed at the `ioredis` connection that already exists (11 files).
**Breakage:** none — it is a `store:` option on limiters that already exist.

### 2.2 One Stripe client, one `apiVersion` constant
**Now:** `apiVersion: '2023-10-16'` is hardcoded in **10+ separate route files**, each with its own `new Stripe(...)`: `cartRoutes.mjs:297`, `sessionPackageRoutes.mjs:49`, `subscriptionRoutes.mjs:41`, `v2PaymentRoutes.mjs:213`, `achPaymentRoutes.mjs:47`, `adminChargeCardRoutes.mjs:33`, `adminOrdersRoutes.mjs:74`, `adminDataVerificationRoutes.mjs:53`, `admin/analyticsRevenueRoutes.mjs:70`, `services/analytics/StripeAnalyticsService.mjs:40`.
**Adopt:** route all of them through the `backend/utils/stripeConfig.mjs` that already exists. Not an OSS swap — a consolidation that turns the SDK upgrade (17.7 → 22.6, **five majors behind**) into a one-file change instead of a ten-file one.

### 2.3 ~~`decimal.js` on every money path~~ — **WITHDRAWN 2026-09-01: DISPROVEN, do not build**

> **This recommendation was wrong and is retracted.** Attempting to build it produced the evidence that killed it. Kept in place, struck through, because a deleted bad recommendation teaches nothing.
>
> **1. The money-taking paths are ALREADY on decimal.js.** `offlinePaymentRoutes.mjs:218` builds totals with `new Decimal(...).plus(...)` under an explicit comment — *"Exact decimal equality — no tolerance (9-Brain Phase 2 consensus)"* — i.e. this exact question was already reviewed and settled. `achPaymentRoutes.mjs` runs `resolveUnitPrice(dbItem).toNumber()`, `serverTotal.minus(clientTotal)`. The "only 10 files use decimal.js" framing was another file-count masquerading as coverage: those 10 are the ones that take money.
>
> **2. The flagged float math provably does not drift.** Empirical probe (200,000 two-dp prices; 60,000 random 5-item carts):
> - `Math.round(price * 100)` — the `StripeCheckoutStrategy.mjs:112` line I called "the classic float→cents rounding bug" — was **wrong in 0 of 200,000 cases**. `Math.round` absorbs the representation error. The claim was false.
> - 5-item cart totals mis-rounded in **0 of 60,000** random carts.
> - Raw `price * qty` *does* differ from exact in ~24k cases (`0.05 * 3 = 0.15000000000000002`), but every such value is written to a `DECIMAL(10,2)` column, which rounds it back on write. The drift never persists.
> - Sean's live catalog (175, 110, 8400, 16800, 33600) is all integers — exact under float regardless.
>
> **3. The two `!==` money comparisons are not money decisions** — `cartHelpers.mjs:518` is inside `debugCartState` (a logger) and `adminDataVerificationRoutes.mjs:392` is a diagnostic.
>
> **Verdict:** building this would have churned already-correct code on the revenue path — a net risk for zero benefit. **Residual (minor, not this slice):** `orderController.createOrderFromCart` carries no price revalidation and no limiter, but cart prices are server-derived (`cartRoutes.mjs:521` `price: snapshot.price`), so the trust boundary holds. Note it; do not rush it.

**Original text, retained for the record — float math on money:**
- `backend/controllers/orderController.mjs:43` — `total + (item.price * item.quantity)`
- `backend/controllers/orderController.mjs:65` — `subtotal: cartItem.price * cartItem.quantity`
- `backend/controllers/creditsController.mjs:107` — `parseFloat(storefrontItem.totalCost) * quantity`
- `backend/services/payment/strategies/ManualPaymentStrategy.mjs:78` — `sum + (item.price * item.quantity)`
- `backend/services/payment/strategies/StripeCheckoutStrategy.mjs:112` — `Math.round(item.price * 100)`

At $175/session and $33,600 packages, this is where the cart total, the Stripe charge, and the order record silently disagree by a penny. `decimal.js` is installed. Use it.

### 2.4 Delete (or properly declare) the inert shadcn/Tailwind layer — it is a build landmine
`frontend/src/components/ui/*.tsx` are **verbatim shadcn/ui files** importing **13 distinct `@radix-ui/*` packages** plus `react-day-picker` — and `frontend/package.json` declares exactly **one** of them (`@radix-ui/react-toast`). There is **no `tailwind.config`** anywhere in the repo, so every utility class inside them is inert.

They survive only because nothing imports them: Vite never resolves an unreferenced module. The moment anyone writes `import { Dialog } from '@/components/ui/dialog'`, the build dies — and the hostile review confirmed the Radix packages are absent from `package-lock.json` even transitively (**0 hits** for `react-dialog`/`react-select`/`react-popover`/`react-avatar`/`react-progress`/`react-day-picker`), so there is no accidental resolution path.

**Resolved by the hostile review:** the five legacy `.jsx` cards that import `ui/card`/`ui/avatar`/`ui/progress` (`ClockInOutCard`, `CommunicationCard`, `GamificationCard`, `PerformanceCard`, `WorkSummaryCard`) have **zero importers** — they are dead code too. Main's build is not at risk today; the landmine is armed only for the next person who imports from `components/ui/`.

**Action:** either declare the Radix deps properly (§2.5) or delete the unreferenced files **and** the five orphaned cards. Do not leave them in this state.

### 2.5 `@radix-ui/*` behind one `<SwanDialog>` — the single biggest duplication in the app
**Now:** **93 hand-rolled modal/dialog components** (`.tsx`, non-test), 117 files hand-writing `role="dialog"` + `aria-modal`, 94 files hand-writing `key === 'Escape'`, 37 files hand-writing `createPortal`, plus manual focus-trap `querySelectorAll` in `BootcampDemoVideoModal.tsx`, `PriceMismatchModal.tsx`, `CreateClientModal.tsx`, `ClientPlanDetailModal.tsx` and more.

Each of those 93 is a separate chance to get focus return, scroll lock, background inerting, or Escape wrong — and a11y regressions stay invisible until a keyboard user hits one.

**Adopt:** `@radix-ui/react-dialog`, wrapped **once** in a styled-components `<SwanDialog>` that keeps the Crystalline Swan chrome and the current prop shape. Radix ships no styles and no DOM opinions — it does **not** conflict with Rule 1 (it is not MUI and not a styling framework) and composes with styled-components via `asChild`.
**Breakage:** zero if new dialogs use it and existing ones migrate opportunistically, highest-traffic first (admin-sessions, admin-clients, checkout).

### 2.6 Subtract four duplicate libraries — pure deletion, near-zero risk

| Duplicate | Evidence | Action |
|---|---|---|
| `moment` alongside `date-fns` | 6 files total — but only **1 is live** (`ClientSessionHistory.tsx`): the other 3 frontend files sit in the orphaned `components/Schedule/` dir + zero-importer `measurementMilestoneService.mjs`; 2 backend routes | Delete `moment`; fix 1 live file + 2 backend routes |
| **`react-big-calendar` — dead** *(hostile-review find)* | Its only real import is `{ Navigate }` in `Schedule/CustomToolbar.tsx` — which itself has **zero non-test importers**. No `<Calendar>` is mounted anywhere; no `momentLocalizer`/`dateFnsLocalizer` exists in the repo. The 17-file `components/Schedule/` dir, plus its CSS overrides in `GlobalStyle.ts` and `responsive-fixes.css`, orbit a calendar that is not there | Delete dep + orphaned dir + CSS overrides (Rule 34 pass) |
| `react-icons` alongside `lucide-react` | **1 file** vs **964** | Delete `react-icons` |
| `uuid` alongside `crypto.randomUUID` | 29 files vs **47** already native | Delete top-level `uuid` for API consistency — note it stays in `node_modules` transitively (sequelize dep; the `overrides` block pins it to 11.1.1), so the win is consistency, not tree size |
| **`@emotion/react` + `@emotion/cache` alongside styled-components** *(hostile-review find)* | Used by exactly **1 file**: `main.jsx:7-16` wraps the app in an emotion `CacheProvider` under a comment claiming it is "for styled-components v6" — **styled-components does not use emotion**; the provider is inert cargo-cult from the MUI era | Delete both deps + the `CacheProvider` wrapper (keep `StyleSheetManager`); verify with build + smoke |
| Three icon shims | `utils/globalIconShim.jsx` + `globalIconShim.tsx` + `iconFix.tsx` | Collapse to one |

### 2.7 **Two live** toast systems (plus one dead), **one live** realtime stack (plus one dead file), **four** HTTP transports
*(counts corrected by the 2026-08-31 hostile review — see Addendum)*

- **Toasts:** hand-rolled `hooks/use-toast.tsx` (**74 importers**, framer-motion, brand-correct) + `react-toastify` (**34 importers**, `ToastContainer` mounted in `App.tsx`) are both live. The third, `@radix-ui/react-toast`, is imported only by `components/ui/toast.tsx` — which has **zero importers** — so the *only* Radix package `package.json` declares is itself dead and removable. **Keep the hand-rolled one** (it wins on both design-system fit *and* churn, 74 > 34); migrate the 34 toastify call sites; delete both other deps.
- **Realtime:** `hooks/useSocket.ts` (socket.io-client — matches the backend's `socket.io@4.8.1`) is the live stack. `hooks/use-socket.ts` (357 lines of **raw `new WebSocket`**, hand-rolled availability probing, module-global mutable flags, a 100 ms `setInterval` poll) has **zero production importers** — one truth test references it — and the backend runs **no raw-WS server** (`ws` appears nowhere). It is dead code wearing a filename one hyphen away from the live hook. **Delete it** and update `AdminSessionsRealtimeSocket.truth.test.ts` accordingly.
- **HTTP:** `services/api.service.ts` (339 files — canonical), `utils/axiosConfig.ts` (6 files, and it **hardcodes `https://sswanstudios.com`** for prod), bare `import axios` (23 files), raw `fetch('/api…')` (37 files). The last three bypass the token manager, paywall trigger, timezone header, and 401 handling in `apiClientFactory.ts`. Consolidate onto `api.service.ts`.

---

## 3. TIER 2 — Adopt next (real work, real payoff)

### 3.1 `react-hook-form` + `zod` on the frontend — and **share the schemas with the backend**
**Now:** **zero** form libraries on the frontend — no react-hook-form, no formik, no yup, no zod. The backend has `zod@3.22` in **31 files** plus a `backend/schemas/` directory.
**Why this is the highest-leverage Tier-2 item:** adopting zod on the frontend lets one schema validate both ends. That directly attacks Rule 58's drift class #7 ("frontend response-shape drift") and class #6 ("wrong field name in caller") — the recurring root-cause family in this codebase — by making the shape a shared artifact instead of two hand-maintained copies. `react-hook-form` is uncontrolled-by-default, which matters on the large admin/trainer forms.
**Note:** backend zod is v3, latest is v4.5. Do the frontend adoption on v3 to match; upgrade both together later.

### 3.2 `@tanstack/react-table` (headless) + `@tanstack/react-virtual`
**Now:** 58 files carrying hand-rolled `sortConfig` / `sortDirection` / `sortOrder`, 26 files with hand-rolled `currentPage` / `itemsPerPage` pagination, 31 files with tables. Zero TanStack Table.
**Why headless matters here:** TanStack Table ships no DOM, so you keep 100% of your styled-components markup and Swan card chrome. You replace only the sort/filter/group/paginate *state math* — which is exactly the part duplicated 58 times and subtly different each time.

### 3.3 `pino` replacing winston + three hand-rolled redaction layers
**Now:** `backend/utils/logger.mjs` (141 lines, winston, hand-written regex redaction of env values and JWT shapes) — plus `utils/consoleRedaction.mjs`, `utils/redactionRules.mjs`, and `utils/monitoring/piiSafeLogging.mjs`. **Four places that all have to agree**, or Rule 59 fails silently. Raw `console.log` appears in 438 backend files, but scoped to runtime dirs (`routes/`, `services/`, `controllers/`, `middleware/`, `models/`) it is **19 files** — the rest are CLI scripts/seeders where console is legitimate. *(Count corrected by the hostile review; the runtime sweep is 19 files, not 438.)* One of the 19 is `PaymentService.mjs`, which logs Stripe account details to console at boot.
**Why pino:** path-based `redact: ['req.headers.authorization', '*.password', …]` is declarative and cannot miss a nested field the way a message-string regex can; 5–10× faster; structured JSON that Render parses natively.
**Non-breaking shape:** put pino *behind the existing `logger` export surface* so no call site changes. Port the redaction rules to `redact` paths. Sweep the 438 `console.log` files as a **separate** pass (Rule 37).

### 3.4 BullMQ repeatable jobs replacing 11 `setInterval` "crons"
**Now:** `services/automationCron.mjs`, `checkoutReconciliationCron.mjs`, `nutritionLogNudgeCron.mjs`, `renderLeaseSweeperCron.mjs`, `sessionReminderCron.mjs`, plus 6 workers in `backend/jobs/` — **all on `setInterval`**. No `node-cron` dependency exists.
`setInterval` drifts, dies with the process, has no retry/backoff/dead-letter, and **fires once per instance**. The codebase already knows this: `sessionReminderCron.mjs:77` hand-rolls a DB row-claim lock to survive double-fire.
**Adopt:** `bullmq@5.80.5` is **already a dependency** and Redis is already connected — but BullMQ is used only by `services/videoJobQueue.mjs`, lazily, behind an optional-import guard. Repeatable jobs give persistence, retries, exponential backoff, dead-letter, and single-fire across instances for free.
**Cheaper alternative:** `node-cron@4` gets correct schedules but *not* the multi-instance guarantee. On Render with a paid plan that can scale, **BullMQ is the right call.**

### 3.5 `react-error-boundary` replacing three parallel boundaries
`utils/error-boundary.tsx`, `components/ui/ErrorBoundary.tsx`, `components/ui/PanelErrorBoundary.tsx` → one well-tested OSS boundary with `resetKeys` / `onReset` / `FallbackComponent`, and three styled fallbacks.

### 3.6 Drop `frontend/src/utils/circuit-breaker.ts` — do not replace it, *relocate* it
152 lines, global `Map` registry, no per-call timeout, no half-open jitter. A browser tab is the wrong place for a circuit breaker — each tab has its own private view of failure. **Frontend:** delete it; use TanStack Query's `retry` + `retryDelay`, already a dep in 16 files. **Backend:** if you want real breakers on the AI / Stripe / R2 calls, use `opossum` there.

---

## 4. Version and security posture (each "latest" verified against the npm registry on 2026-08-31)

| Package | Installed (main) | Latest | Call |
|---|---|---|---|
| `multer` | 1.4.5-lts.1 | **2.3.0** | **UPGRADE** — the npm registry itself now marks 1.x deprecated: *"Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x."* (`npm view multer@1.4.5-lts.1 deprecated`, verified 2026-08-31); 26 files; file upload is attack surface |
| `stripe` | 17.7.0 | **22.6.0** | UPGRADE **after** §2.2 lands |
| `bcryptjs` | 2.4.3 | **3.0.3** | UPGRADE — small, isolated |
| `eslint` | 8.57.1 | 10.9.1 | UPGRADE to flat config — 8.x is EOL and the Tier-A gate depends on it |
| `zod` (backend) | 3.22.4 | 4.5.4 | Upgrade together with the frontend adoption (§3.1) |
| `react-toastify` | 9.1.3 | 11.1.0 | Moot — being deleted (§2.7) |
| `@google/generative-ai` | 0.24.1 | frozen at 0.24.1 | Successor SDK is `@google/genai` 2.20.0 — plan the move |
| `express` | 4.21.2 | 5.2.1 | **DEFER** — most breakage, least gain, 232 route files |
| `framer-motion` | 10.16.5 | 13.1.1 (now `motion`) | **DEFER** — 339 files, high churn, low payoff |
| `react-router-dom` | 6.20.1 | 7.18.3 | **DEFER** |
| `react-simple-maps` | 3.0.0 (= latest) | — | **WATCH** — needs four `overrides` pinning `d3-zoom` / `d3-transition` / `d3-interpolate` / `d3-color`. That is an unmaintained-project smell. Only 1 file uses it; `visx/geo` or raw `d3-geo` is the exit. |

---

## 5. Bundle, plus one product opportunity

**`vite.config.ts:85` `manualChunks`** splits react / styled-components / framer-motion / react-query / redux / date-fns / lucide. Of the heavy libraries outside that list *(corrected by the hostile review)*: `three` is **already fine** — `SwanGlobePanel.tsx:30` lazy-imports it, with truth tests asserting the lazy boundary; `leaflet` is dynamic-only; `victory` sits behind `SafeChart`; `react-big-calendar` is dead (§2.6). The real remaining candidates are **`jspdf` (static in 8 files, dynamic in 2)**, `html2canvas` (static, 1 file), `@ffmpeg/ffmpeg` (static, 1 file — multi-MB wasm payload), and `react-simple-maps` (static, 1 file). Whether those statics land in the entry chunk or an already-lazy route chunk needs a `dist/` analysis before acting — treat "bundle drag" as unproven until measured.

**Opportunity — `vite-plugin-pwa` / Workbox.** PWA is deliberately killed (`spa-sw.js` is a cache-draining no-op). That was the right call for a cache-bust incident, but it leaves a Product-Core-Loop gap: **a trainer logging sets in a basement gym with no signal cannot save the workout.** Workbox with an explicit versioned precache plus a background-sync queue for workout POSTs is the OSS answer, and it fixes the "users see cached old bundles" gotcha properly instead of by disabling caching. This is the one item here that adds revenue-relevant capability rather than tidying.

---

## 6. Recommended order

> **RE-RANKED 2026-09-01** after the first build attempt disproved two of the top four. See §9.

1. **`multer` 1→2** — §4. Now the only item with an *external authority* confirming a live defect: `npm install` on this repo prints `npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x.` Bounded (26 files), testable, genuinely security-relevant.
2. Dead-code sweep — §2.4 / §2.6 / §2.7. Every member independently mount-verified; pure subtraction; no runtime risk.
3. Stripe client factory + single `apiVersion` — §2.2 → then `stripe` 17→22.
4. `rate-limit-redis` — §2.1, **downgraded**: render.yaml carries no `numInstances`, so the "N× the limit" framing was wrong; the live defect is only counter-reset-on-deploy. Still worth doing (correct-before-scale, and `config/session.mjs` has a proven ioredis client pattern to reuse) but it is **not ~15 lines** — it needs explicit **fail-open** handling, because a naive Redis store turns a Redis blip into a checkout outage, which MemoryStore cannot do.
5. ~~`decimal.js`~~ — **WITHDRAWN, disproven.** §2.3.
5. Delete dead + duplicate code: moment, react-icons, uuid, icon shims, raw-WS `use-socket.ts`, react-toastify + `@radix-ui/react-toast`, `@emotion/*` + the inert `CacheProvider`, `react-big-calendar` + the orphaned `components/Schedule/` dir, the five orphaned `.jsx` cards, `DirectAppRoutes.tsx` — §2.4 / §2.6 / §2.7 (each deletion gets the Rule 34 grep-before-delete pass)
6. Resolve the inert shadcn/Radix layer — §2.4
7. `<SwanDialog>` on Radix; migrate the top ~10 dialogs — §2.5
8. `react-hook-form` + shared zod schemas, one form first — §3.1
9. BullMQ repeatable jobs, one cron first (`checkoutReconciliationCron`) — §3.4
10. `@tanstack/react-table` on the busiest admin table — §3.2
11. pino behind the existing logger surface — §3.3
12. `vite-plugin-pwa` offline workout logging — §5

Then the structural items (unaffected by the 2026-09-01 findings): `<SwanDialog>` on Radix (§2.5), react-hook-form + shared zod (§3.1), BullMQ repeatable jobs (§3.4), TanStack Table (§3.2), pino behind the existing logger surface (§3.3), vite-plugin-pwa (§5). Each wants its own slice with a Rule 26 receipt and a hostile pass.

---

## 9. Build-Attempt Findings — Round 2 (2026-09-01)

Sean said go on Slice 1. Building it produced findings that killed one item and downgraded another. Recorded because the *attempt* was the instrument that exposed what static reading could not.

**Blocker (process):** the primary working tree (`wip/comms-notifications-2026-07-05`) does not contain `moneyPathRateLimits.mjs` at all — it is 2,303 commits behind. Build location moved to the `C:/tmp/ss-forge-variantrun` worktree, fast-forwarded from `ebcbfb17e` → `2269cd4d4` (origin/main), branched `claude/decimal-money-math-20260901`, `npm install` clean (791 packages).

**Disproven — §2.3 `decimal.js`, WITHDRAWN.** The money-taking routes already use decimal.js under a documented 9-Brain consensus; the flagged `Math.round(price*100)` is correct in 200,000/200,000 cases; DECIMAL(10,2) columns absorb raw multiplication drift. Building it would have churned correct revenue-path code.

**Downgraded — §2.1 `rate-limit-redis`.** `render.yaml` has no `numInstances` (verified), so the "N instances = N× the limit" claim was a conditional risk stated as a live one. Also **corrected**: the Redis *cache* wrapper (`services/cache/redisWrapper.mjs`) is hard-disabled — `this.enabled = false; // Always disabled for production`, an in-memory `Map` wearing a Redis name — so "ioredis is already connected" was wrong about *that* client. The real, working ioredis path is `config/session.mjs` (lazyConnect, retryStrategy, maxRetriesPerRequest: 3), gated by `USE_REDIS_SESSIONS`, which `render.yaml` sets to `true`. Reuse that pattern, not the wrapper. **New requirement:** fail-open error handling, or the limiter becomes a new revenue outage mode.

**Confirmed by an external authority — §4 `multer`.** The repo's own `npm install` prints the deprecation notice citing vulnerabilities patched in 2.x. Promoted to slice 1.

**Root-cause note.** All three of this session's corrections — Fable's five, and these two — are one failure mode: **a file count treated as a coverage claim.** "10 files use decimal.js" hid that those 10 are exactly the ones that take money. The standing fix is in the learning packet: a count may not carry a recommendation until its members are checked for liveness *and* the claim is checked against a runnable probe. `Math.round(price*100)` looked like a textbook bug and was provably not one; four lines of Node settled in seconds what reading could not.

---

## 7. Method and limits

**How gathered:** `git grep -l/-n <pattern> origin/main -- <path>` for every count; `npm view <pkg> version` for every "latest"; direct file reads via `git show origin/main:<path>`.

**Not proven here — do not treat as verified:**
- ~~Whether the five legacy `.jsx` cards importing `ui/avatar` / `ui/progress` are actually mounted~~ — **resolved 2026-08-31 by the hostile review: zero importers, dead code** (see Addendum).
- No build, `tsc`, or test run was executed. This is a static read of `origin/main`; nothing was compiled or run.
- Bundle-size claims are inferred from dependency identity and `manualChunks` contents, not from a measured `dist/` analysis.

---

## 8. Hostile-Review Addendum — Round 1 (Fable, 2026-08-31)

Independent re-verification of the Opus pass, one round to dry. Method: mount/importer checks on every "N files use X" claim before letting a recommendation stand; lockfile greps; registry queries.

### Confirmed (spot-re-verified, held)
- Baseline freshness: `origin/main` ref = 2026-08-28 commit, fetched 2026-08-31 — the audit ran against a current main, not a stale ref.
- Float-math money paths are **live**: `orderRoutes` mounted at `/api/orders` (`core/routes.mjs:385`), `creditsRoutes` at `/api` (`:745`); `ManualPaymentStrategy` is always registered and is the fallback whenever Stripe init fails (`PaymentService.mjs:179`).
- `moneyPathRateLimits` memory-store gap, the 10× hardcoded Stripe `apiVersion`, the 93-dialog duplication, the 11 `setInterval` crons, zero frontend form library / 31-file backend zod: all held.
- `multer` 1.x: upgraded from inference to **registry-verified deprecation** (§4).

### Corrected (the Opus pass overstated; doc now fixed in place)
1. **"Three toast systems" → two live + one dead.** `use-toast` has 74 importers (not fewer than toastify's 34 — the keep-hand-rolled call now also wins on churn); the Radix toast lives only in zero-importer `ui/toast.tsx`.
2. **"Two realtime stacks" → one live + one dead file.** Raw-WS `use-socket.ts` has zero production importers and the backend runs no raw-WS server. Deletion, not migration.
3. **"438 files call console.log" → 19 in runtime dirs.** The 438 counted CLI scripts and seeders where console is legitimate.
4. **`three` listed as un-split bundle weight → already lazy** behind `SwanGlobePanel.tsx:30`, with truth tests asserting the boundary.
5. **"moment: 6 files" → 1 live file.** Three of the four frontend files are in dead code.

### New findings (missed by the Opus pass)
6. **`react-big-calendar` is dead** — only-import is `{ Navigate }` in an orphaned toolbar; no `<Calendar>`, no localizer anywhere; 17-file `components/Schedule/` dir + `GlobalStyle.ts`/`responsive-fixes.css` overrides orbit nothing. (§2.6)
7. **`@emotion/react` + `@emotion/cache` are inert** — one file (`main.jsx`) mounts an emotion `CacheProvider` under a comment claiming it serves styled-components v6, which does not use emotion. (§2.6)
8. **The five legacy `.jsx` cards are orphans** — resolves §2.4's open question in the safe direction. (§2.4)
9. `DirectAppRoutes.tsx` at src root: zero importers — add to the dead-code sweep.
10. Access **and refresh** tokens live in `localStorage` (`productionTokenManager.ts:17-45`) — XSS-exfiltratable by design. Standard SPA tradeoff, not a defect to rush; the eventual OSS-pattern fix is httpOnly-cookie refresh flow. Flagged for a future security slice, deliberately **not** added to the adoption list.

### Attacked and disproven (suspicions raised, evidence cleared them)
- `trust proxy` misconfiguration → **set** (`core/app.mjs:44`) and explicitly reasoned about in both rate-limit files.
- `auth.mjs` vs `authMiddleware.mjs` competing implementations → `auth.mjs` is a documented re-export shim (50 vs 158 importers, one implementation).
- `jose` vs `jsonwebtoken` duplication → defensible split: `jose` serves OIDC/JWKS in `oauthProviderClient.mjs`, `jsonwebtoken` serves HMAC sessions.
- Stale lockfile axios/styled-components → resolved 1.18.1 / 6.4.3, both current.
- `momentLocalizer` migration risk for the moment deletion → moot; no localizer exists because no calendar is mounted.

**Verdict: the ranked plan in §6 stands**, with item 5 widened into a dead-code sweep (react-big-calendar, Schedule dir, emotion, five cards, `DirectAppRoutes.tsx`). No Tier-1/Tier-2 recommendation was overturned; five claims were corrected in place per Rule 53. Dry-pass rounds: 5, with round 5 producing only disproven suspicions.
