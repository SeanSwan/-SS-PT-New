# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 86.7s
> **Files:** docs/ai-workflow/blueprints/SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md
> **Generated:** 4/4/2026, 11:51:48 PM

---

# Code Review: SUBSCRIPTION-STORE-MASTER-BUILD-PLAN.md

> **Reviewer Note:** This is an architectural planning document (Markdown), not executable TypeScript/React/styled-components code. Standard code-quality linting criteria (TypeScript types, React hooks, styled-components tokens, etc.) apply only where the document contains **embedded code snippets** or **specifies implementation contracts** that will directly govern what gets built. The review therefore covers: (1) embedded code quality, (2) architectural decisions that will produce code-quality problems downstream, and (3) planning gaps that guarantee future bugs or rework.

---

## Summary Scorecard

| Category | Rating | Notes |
|---|---|---|
| Embedded code quality | 🔴 CRITICAL issues | `any`-typed JS, no TS, hardcoded strings |
| Architectural contracts | 🟠 HIGH issues | Paywall bridge pattern underspecified |
| React/hook patterns | 🟠 HIGH issues | N+1 hook, stale closure risk unaddressed |
| Styled-components / theme | 🟡 MEDIUM issues | Hardcoded hex values in design spec |
| DRY / structure | 🟡 MEDIUM issues | Tier limit duplication across files |
| Error handling | 🔴 CRITICAL issues | 402 interceptor edge cases incomplete |
| Security | 🟠 HIGH issues | Frontend tier trust, trial check gap |
| Performance | 🟡 MEDIUM issues | Missing memoization guidance |

---

## CRITICAL Findings

---

### C-1 — Embedded `modelSelector.mjs` is Plain JavaScript, Not TypeScript

**Rating:** CRITICAL
**Location:** Section 4, `backend/services/ai/modelSelector.mjs` snippet

```javascript
// AS WRITTEN (plain JS, no types)
export function resolveModelForTier(subscription, user) {
  if (user?.role === 'admin' || user?.role === 'trainer') return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const tier = subscription?.tier || 'free';
  const amount = parseFloat(subscription?.amount) || 0;
  if (tier === 'elite') return 'gemini-2.5-flash';
  if (tier === 'pro' && amount >= 5) return 'gemini-2.5-flash';
  return 'gemini-2.0-flash-lite';
}
```

**Problems:**
- `subscription` and `user` are implicitly `any` — the compiler cannot catch callers passing wrong shapes
- `subscription?.amount` is a `string | number | undefined` — `parseFloat(undefined)` returns `NaN`, and `NaN >= 5` is `false`, silently routing Guardian $5+ donors to Flash-Lite (revenue-impacting bug)
- Model name strings are hardcoded literals with no union type — a typo (`'gemini-2.5-flahs'`) compiles silently
- `process.env.GEMINI_MODEL` is `string | undefined` — the `||` fallback is fine but the return type is inferred as `string`, hiding that it could be an empty string if the env var is set to `""`

**Corrected implementation to specify in the plan:**

```typescript
// backend/services/ai/modelSelector.ts

type GeminiModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash-lite';

type TierId = 'free' | 'pro' | 'elite';

interface SubscriptionContext {
  tier: TierId;
  amount: number | string | null | undefined; // Sequelize can return string from DECIMAL
}

interface UserContext {
  role: 'admin' | 'trainer' | 'client' | 'user';
}

const DEFAULT_ADMIN_MODEL: GeminiModel =
  (process.env.GEMINI_MODEL as GeminiModel | undefined) ?? 'gemini-2.5-flash';

export function resolveModelForTier(
  subscription: SubscriptionContext | null | undefined,
  user: UserContext | null | undefined,
): GeminiModel {
  if (user?.role === 'admin' || user?.role === 'trainer') {
    return DEFAULT_ADMIN_MODEL;
  }

  const tier: TierId = subscription?.tier ?? 'free';
  // Sequelize DECIMAL columns serialize as strings — always coerce safely
  const amount = Number(subscription?.amount ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (tier === 'elite') return 'gemini-2.5-flash';
  if (tier === 'pro' && safeAmount >= 5) return 'gemini-2.5-flash';
  return 'gemini-2.0-flash-lite';
}
```

**Action required:** Replace the JS snippet in the plan with the typed version above. All callers must pass typed objects — add this to the Phase 1C implementation checklist.

---

### C-2 — 402 Interceptor "Bridge Pattern" Is Underspecified — Circular Import Guaranteed

**Rating:** CRITICAL
**Location:** Section 9, Phase 4

The plan states:

> *"Add 402 response interceptor using bridge pattern (module-level callback registration to avoid circular imports)."*

This is named but never defined. The file change manifest shows `api.service.ts` importing from `PaywallContext.tsx` — a React context file — inside a plain service module. This **will** create a circular dependency at build time (`api.service.ts` → `PaywallContext.tsx` → `api.service.ts` via the hook) unless the bridge is explicitly architected.

**The plan must specify the bridge contract:**

```typescript
// frontend/src/services/paywallBridge.ts
// ─── ZERO React imports — plain module ───────────────────────────────────────

type PaywallHandler = (featureName: string, responseData: unknown) => void;

let _handler: PaywallHandler | null = null;

/** Called once by PaywallProvider on mount. */
export function registerPaywallHandler(handler: PaywallHandler): void {
  _handler = handler;
}

/** Called by api.service.ts interceptor — no React dependency. */
export function triggerPaywall(featureName: string, responseData: unknown): void {
  if (_handler) {
    _handler(featureName, responseData);
  } else {
    // PaywallProvider not yet mounted — queue for later
    _pendingQueue.push({ featureName, responseData });
  }
}

// Drain queue when provider mounts
const _pendingQueue: Array<{ featureName: string; responseData: unknown }> = [];

export function drainPaywallQueue(handler: PaywallHandler): void {
  _pendingQueue.splice(0).forEach(({ featureName, responseData }) =>
    handler(featureName, responseData),
  );
}
```

```typescript
// PaywallContext.tsx — registers on mount, drains queue
useEffect(() => {
  registerPaywallHandler(handlePaywall);
  drainPaywallQueue(handlePaywall);
  return () => registerPaywallHandler(() => {}); // cleanup
}, [handlePaywall]); // handlePaywall must be stable (useCallback)
```

**Add `paywallBridge.ts` to the New Files manifest.** Without this, Phase 4 will break the build.

---

### C-3 — Frontend Feature Gating Pattern Trusts Frontend State for Access Control

**Rating:** CRITICAL
**Location:** Section 10, Phase 5 — pattern snippet

```tsx
// AS WRITTEN IN PLAN
const { isPro, isElite, isTrial } = useSubscription();
<CrystallineLockOverlay
  isLocked={!isPro && !isElite && !isTrial}
  ...
>
```

The plan correctly states in Section 12:

> *"All tier checks happen on BACKEND. Frontend flags are display-only — never trust for access control."*

But the gating pattern shown gates **non-AI premium features** (Creator Economy, Live Streaming creation) using only frontend state. If `useSubscription()` data is stale, manipulated via DevTools, or the API call fails and falls back to a cached/default value, users bypass the gate.

**The plan must specify:**

1. Every locked feature that renders real content (not just UI chrome) must have a **backend authorization check** on the data fetch, not just a frontend overlay.
2. `CrystallineLockOverlay` should render `null` children (not hidden children) when locked — rendering locked content in the DOM and hiding it with CSS/overlay is a security anti-pattern for content that has value.
3. Add to the pattern:

```tsx
// REQUIRED addition to the pattern spec:
// The overlay must NOT render children when locked — use conditional rendering
<CrystallineLockOverlay isLocked={isLocked} ...>
  {/* Children only mount when unlocked */}
  {!isLocked && <LockedContent />}
</CrystallineLockOverlay>
```

4. For `CreatorEconomyPage` and `LiveStreamingPage` — the page-level data fetches must return 403 from the backend if the user lacks the tier, independent of frontend state.

---

### C-4 — Trial Abuse Check Is Incomplete and Has a Race Condition

**Rating:** CRITICAL
**Location:** Section 12, "Trial Abuse Prevention"

> *"Check if email has EVER had a trial (cross-account). Return 403 TRIAL_ALREADY_USED if found."*

**Problems:**

1. **Email-only check is bypassable** — disposable email services (Mailinator, 10-minute mail) trivially defeat this. The plan needs to specify additional signals: IP address, payment method fingerprint (Stripe's `customer.id` deduplication), device fingerprint.

2. **Race condition on concurrent trial starts** — if a user double-clicks "Start Trial" or two tabs fire simultaneously, both requests can pass the `SELECT` check before either `INSERT` completes. The plan must specify a **database-level unique constraint** or **atomic upsert**:

```sql
-- Migration must include:
ALTER TABLE "Users" ADD CONSTRAINT "unique_trial_email" 
  UNIQUE ("trialEmail"); -- or use the existing email field with a separate TrialHistory table
```

Or at the application level, use Sequelize's `findOrCreate` with a transaction and `SERIALIZABLE` isolation.

3. **No specification of what "has EVER had a trial" means in the data model** — is this a field on `User`? A separate `TrialHistory` table? The migration file listed (`2026XXXX-add-trainer-type.cjs`) only adds `trainerType`. A separate migration for trial tracking is missing from the manifest.

---

## HIGH Findings

---

### H-1 — `useSubscription` N+1 Problem Dismissed Too Casually

**Rating:** HIGH
**Location:** Section 15, Risks table

> *"Multiple useSubscription mounts — N+1 API calls — Tolerable with HTTP cache, optimize later."*

This is not tolerable at the architecture stage. The plan specifies `useSubscription()` is called in:
- `AscensionPage.tsx`
- `VaultCard.tsx` (potentially, for CTA state)
- `CrystallineLockOverlay` (called at every gated feature)
- `ClientProgressDashboardPage.tsx`
- `NutritionWorkspace.tsx`
- `GenerationWizard.tsx`

That is 6+ simultaneous fetches on first render of the dashboard. "HTTP cache" only helps if the cache layer is explicitly configured — browser default cache for authenticated API calls with `Authorization` headers is typically `no-store`.

**The plan must specify one of:**

```typescript
// Option A: React Query / TanStack Query (recommended)
// Single cache key, automatic deduplication of in-flight requests
const { data: subscription } = useQuery({
  queryKey: ['subscription', userId],
  queryFn: fetchSubscription,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Option B: Context-level singleton fetch
// SubscriptionProvider fetches once, all consumers read from context
// useSubscription() reads context, never fetches independently
```

The current plan implies Option B (there's a `useSubscription` hook) but doesn't enforce that the hook **never fetches** — it only reads from a provider. This must be made explicit in the hook's implementation spec.

---

### H-2 — `CrystallineLockOverlay` Component Has No Specification

**Rating:** HIGH
**Location:** Section 10, Phase 5

The component is used throughout the gating pattern but has no entry in the New Files or Modified Files manifest. It either already exists (not mentioned) or needs to be built (not planned). 

**Required additions to the manifest:**

```
frontend/src/components/Subscription/CrystallineLockOverlay.tsx
```

**Required interface specification:**

```typescript
interface CrystallineLockOverlayProps {
  isLocked: boolean;
  featureName: string;
  requiredTier: 'pro' | 'elite';          // drives CTA copy automatically
  ctaLabel?: string;                       // override if needed
  onUpgrade: () => void;                   // not onConfigure — name the intent
  children: React.ReactNode;
  /** 
   * When true, renders null instead of overlay UI when locked.
   * Use for content with real value (not just UI chrome).
   * Default: false (shows overlay with blurred content behind)
   */
  hardGate?: boolean;
}
```

---

### H-3 — `DonationSlider` Has No Debounce Spec — Will Spam Stripe Price Calculations

**Rating:** HIGH
**Location:** Section 7, Phase 2, `DonationSlider.tsx`

The Guardian tier uses a donation slider ($1–$50). If this slider triggers any API call (price preview, Stripe PaymentIntent creation, or even just a re-render of the checkout CTA), every pixel of drag will fire events.

**The plan must specify:**

```typescript
// DonationSlider.tsx implementation requirement:
// 1. Local state for display value (updates on every change — no API calls)
// 2. Debounced value (300ms) for any API side effects
// 3. onCommit callback only fires on mouseup/touchend — not onChange

interface DonationSliderProps {
  min: number;           // 1
  max: number;           // 50
  suggested: number;     // 5
  onChange: (value: number) => void;  // debounced — for parent state
  onCommit: (value: number) => void;  // fires on release — for API calls
}
```

Additionally, the slider thumb color (`Gilded Fern`) must use the theme token, not a hardcoded hex. See M-1.

---

### H-4 — Paywall `onUnlocked` Retry Callback Has Stale Closure Risk

**Rating:** HIGH
**Location:** Section 9, Phase 4

> *"`onUnlocked(callback)` — retry failed request after upgrade"*

If the retry callback captures the original `axios` config from the interceptor, and the user's auth token has been refreshed between the 402 and the upgrade, the retry will use a stale token and get a 401.

**The plan must specify:**

```typescript
// PaywallContext.tsx — retry must re-read current token
interface PaywallState {
  pendingRetry: AxiosRequestConfig | null; // store config, not a closure
}

// On unlock:
async function retryPendingRequest(): Promise<void> {
  if (!state.pendingRetry) return;
  // Re-execute through the axios instance — interceptors re-run, 
  // including the auth header injection interceptor
  await apiClient.request(state.pendingRetry);
}
```

The retry must go through the full axios interceptor chain, not call a stored closure directly.

---

### H-5 — `GenerationWizard.tsx` Has No Loading/Error State Specification

**Rating:** HIGH
**Location:** Section 3, AI Generation Confirmation Flow; Section 14, New Files

The 4-step wizard is described in detail for the happy path but has no specification for:

1. **Step 3 failure** — what happens if the AI generation API call fails? Does the user lose their Step 1 form data? The plan must specify that form state persists across the error boundary.
2. **Network timeout** — AI generation can take 10–30 seconds. The plan mentions a "progress indicator" but

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
