# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 31.6s
> **Files:** frontend/src/App.tsx, frontend/src/components/Checkout/PaymentMethodSelector.tsx, frontend/src/components/Checkout/methods/ACHPayment.tsx, frontend/src/styles/tokens.css, AI-Village-Documentation/validation-prompts/archive/2026-03-14T19-39-32/01-ux-accessibility.md, AI-Village-Documentation/validation-prompts/archive/2026-03-14T19-39-32/02-code-quality.md
> **Generated:** 3/14/2026, 1:06:36 PM

---

# Deep Code Review — SwanStudios

## Executive Summary

This review identifies **4 CRITICAL**, **3 HIGH**, **4 MEDIUM**, and **5 LOW** severity issues across the provided frontend files. The backend documentation references critical issues that must be addressed before production.

---

## 1. Bug Detection

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **CRITICAL** | `App.tsx:101-127` | **Stale Closure / Missing Dependencies**: The initialization `useEffect` has an empty dependency array `[]` but references `dispatch`, `clearMockTokens`, `initializeMockData`, etc. If these utilities change, the effect won't update. More critically, the `deviceCapability` state (line 96) is used in JSX but the `detectDeviceCapability()` call isn't in the dependency array — could cause hydration mismatches. | Add proper dependencies or use `useCallback` for the initialization function: `useEffect(() => { init(); }, [dispatch]);` |
| **CRITICAL** | `PaymentMethodSelector.tsx:58` | **Hardcoded PII**: Phone number `'3239968153'` is hardcoded as the Zelle recipient. This is a production data leak and violates PCI-DSS if this is a real payment account. | Remove hardcoded value. Ensure all payment settings come exclusively from `/api/admin/payment-settings/public` with proper fallback to environment variables, never hardcoded defaults. |
| **CRITICAL** | `ACHPayment.tsx:32` | **Silent Failure**: If `VITE_STRIPE_PUBLIC_KEY` is missing, `getStripe()` returns `Promise.resolve(null)` and logs a warning. The payment flow will fail later with a confusing "Stripe failed to load" error instead of failing fast with a clear message. | Throw an error or return a strongly-typed result that forces UI to show a proper error state: `throw new Error('Stripe is not configured. Please contact support.')` |
| **CRITICAL** | `ACHPayment.tsx:103-108` | **Idempotency Key Regeneration Bug**: On any error, `idempotencyKey.current = uuidv4()` is called. If the error is a network timeout where the server actually processed the request, this creates a duplicate order with a new key. The previous documentation confirms this is a known backend issue. | Only regenerate the key on specific retryable errors, not all errors. Store the original key and check for existing orders before creating new ones. |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **HIGH** | `App.tsx:108` | **setTimeout Race Condition**: Using `setTimeout(..., 500)` to "prevent conflicts" with `initializeApiMonitoring()` is a code smell. This suggests there's an initialization order dependency that isn't properly synchronized. | Remove the setTimeout. If there's a conflict, fix the root cause — use proper async initialization with `await` or event-based sequencing. |
| **HIGH** | `PaymentMethodSelector.tsx:56` | **Initial State Flash**: `idempotencyKey` starts with a UUID, but the settings state (lines 57-61) has hardcoded defaults that flash before the API fetch completes. The Zelle recipient shows `'3239968153'` briefly before being overwritten. | Use `useState<PaymentSettings | null>(null)` and show a loading skeleton until settings are fetched. |
| **HIGH** | `ACHPayment.tsx:67-117` | **Status in Dependency Array**: `handleACHPayment` includes `status` in its dependency array. Since `status` changes frequently, this causes the callback to be recreated on every status change, defeating the purpose of `useCallback`. | Remove `status` from dependencies. The guard `if (status !== 'idle') return;` at line 67 handles the race condition without needing `status` in deps. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **MEDIUM** | `App.tsx:89-93` | **Global Side Effect**: Setting `window.__ROUTER_CONTEXT_AVAILABLE__ = true` modifies a global object. While there's cleanup in the return function, if the component errors before cleanup runs, this flag could be stuck. | Use a more robust mechanism like a React Context to communicate router availability, or ensure the flag is set in a way that doesn't persist on error. |
| **MEDIUM** | `PaymentMethodSelector.tsx:79` | **Stale Closure Risk**: `handleOfflineSubmit` depends on `cart`, `selectedMethod`, `user`, `total`, and `toastSuccess`. If the cart updates while the user is on the payment screen, the closure could capture stale cart data. | Use a ref for cart data or fetch fresh cart data inside the callback: `const currentCart = useCart()` inside the callback or use `useMemo` to derive the items. |
| **MEDIUM** | `ACHPayment.tsx:27` | **Module-Level Mutable State**: `stripeInstance` is a module-level variable. If `getStripe()` is called and fails, subsequent calls will keep returning the failed promise. There's no way to retry after a failure without a page reload. | Cache the result but allow reset on error, or use a different pattern that allows retry. |
| **MEDIUM** | `App.tsx:94` | **Ref Initialization Logic**: `initializationRef` is set to `true` immediately at the start of the effect (line 107), before any async operations complete. If an error occurs during initialization, the app is broken but the ref thinks it's initialized. | Set `initializationRef.current = true` only after all initialization completes successfully, or handle the error state explicitly. |

### LOW

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **LOW** | `App.tsx:109,113,123` | **Debug Console Logs**: Multiple `console.log` statements in production code. While they check `process.env.NODE_ENV` in some places, these should be replaced with a proper logging utility. | Replace with `logger.info()` or remove for production. |
| **LOW** | `PaymentMethodSelector.tsx:123` | **Inline Fee Calculation**: `const fee = calculateFee(selectedMethod, total)` is computed on every render. This should be memoized with `useMemo`. | Wrap in `useMemo(() => calculateFee(selectedMethod, total), [selectedMethod, total]);` |
| **LOW** | `ACHPayment.tsx:150` | **Missing Loading State for Settings**: Unlike PaymentMethodSelector, ACHPayment doesn't fetch any settings but assumes `total` and `fee` are valid. If parent passes invalid values, no validation occurs. | Add PropTypes or TypeScript validation for `total` and `fee`. |

---

## 2. Architecture Flaws

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **CRITICAL** | `App.tsx:157-193` | **Provider Hell / God Component**: App.tsx nests 14+ providers directly inside the component. This violates the single responsibility principle — App should compose the app, not configure every provider. This makes testing impossible and causes unnecessary re-renders. | Extract provider compositions into separate files: `providers/AppProviders.tsx`, `providers/AuthProviders.tsx`, etc. Compose them as: `<AuthProviders><AppContent /></AuthProviders>` |
| **CRITICAL** | `PaymentMethodSelector.tsx:1-200` | **God Component**: This component handles payment method selection, fee display, offline payment submission, price mismatch handling, AND renders children. At ~200 lines, it does too much. | Split into: `PaymentMethodSelector` (just grid UI), `OfflinePaymentHandler` (submit logic), `PriceMismatchModal` (already separate, good). |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **HIGH** | `App.tsx:4-12` | **Module-Side Effect Imports**: Imports like `./utils/pageViewTracker`, `./utils/initTokenCleanup`, `./utils/clearCache` run at module load time. This creates hidden dependencies and makes tree-shaking/SSR impossible. | Convert these to explicit initialization calls or use a proper initialization system that can be awaited. |
| **HIGH** | `ACHPayment.tsx:1-50` | **Tight Coupling**: ACHPayment directly imports Stripe and makes payment decisions. This should be abstracted behind a payment service that can be mocked for testing. | Create `PaymentService` interface with `createIntent()`, `confirmPayment()` methods. Inject via context or props. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **MEDIUM** | `App.tsx:96` | **Device Capability Detection in State**: `deviceCapability` is stored in React state but computed once with `useState(() => detectDeviceCapability())`. This is what `useMemo` is for. | Use `const deviceCapability = useMemo(() => detectDeviceCapability(), []);` or just compute it outside the component if it doesn't depend on props. |
| **MEDIUM** | `PaymentMethodSelector.tsx:17-24` | **Prop Drilling**: `PaymentMethodSelector` receives `total` and `children`, but `children` is the Stripe checkout. The component doesn't pass `total` to the offline payment methods — it passes computed `fee` and `items`. This inconsistency makes the API confusing. | Normalize the interface: pass `total` to all payment methods and let them compute fees if needed, or pass all required data consistently. |

---

## 3. Integration Issues

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **CRITICAL** | `PaymentMethodSelector.tsx:68-110` | **Frontend-Backend Contract Mismatch**: The component sends `items` with `storefrontItemId || item.id` — this fallback suggests the API and frontend have mismatched data models. The backend documentation confirms `PRICE_MISMATCH` errors should return `updatedSubtotal`, `updatedFee`, and `updatedTotal`, but the frontend only handles `expectedTotal` and `updatedTotal`. | Standardize the data model. Remove `|| item.id` fallbacks. Update error handling to match backend contract: expect `updatedSubtotal`, `updatedFee`, `updatedTotal`. |
| **CRITICAL** | `ACHPayment.tsx:67-117` | **Missing Error Boundary**: If `handleACHPayment` throws an unhandled error, there's no error boundary around the payment flow. The component just shows `status === 'error'` but doesn't catch React-level errors. | Wrap the payment button/action in an error boundary, or ensure the parent component has proper error handling. |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **HIGH** | `PaymentMethodSelector.tsx:64-66` | **No Loading State for Settings**: The `useEffect` that fetches payment settings has no loading indicator. Users see hardcoded values (including the hardcoded phone number) before the real settings load. | Add `settingsLoading` state and show a skeleton until settings are fetched. |
| **HIGH** | `ACHPayment.tsx:140-145` | **Inconsistent Data Transformation**: In `PaymentMethodSelector`, items are mapped with `storefrontItemId || item.id` (line 130). In `ACHPayment`, the same pattern is used (line 140). This duplication suggests the transformation should be centralized. | Create a utility function `normalizeCartItems(items)` used by both components. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|-------------|-----|
| **MEDIUM** | `App.tsx:141` | **Conditional Rendering with Enabled Prop**: `ThemeStatusIndicator` receives `enabled={process.env.NODE_ENV === 'development'}`. In production, this renders a hidden

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
