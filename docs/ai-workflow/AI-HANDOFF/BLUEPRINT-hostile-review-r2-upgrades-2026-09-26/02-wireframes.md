**Scope**

Change the existing checkout receipt state region and waiver submission-result region. Preserve their surrounding navigation and forms. Backend-only authorization, schema, and accounting slices have no new screens.

**Tokens**

All consumed names below are emitted by `frontend/src/utils/theme/themeUtils.ts:166–200`.

| Element | Exact token |
|---|---|
| Page | `var(--bg-base, #0A0A0F)` |
| Card | `var(--bg-surface, #1A1A24)` |
| Primary text | `var(--text-primary, #E0ECF4)` |
| Secondary text | `var(--text-secondary, #E0ECF4)` |
| Border | `var(--border-soft, #4070C0)` |
| Focus outline | `var(--accent-secondary, #8B5CF6)` |
| Status accent | `var(--accent-gold, #C6A84B)` |

Use existing `GlowButton` variants. Validate computed contrast; fallback colors are not proof.

**Checkout receipt — desktop, 1440px**

```text
                  ┌──────── max-width: 800px ────────┐
                  │ [status icon]                    │
                  │ Exact state title                │
                  │ Exact state explanation          │
                  │                                  │
                  │ Reference: {opaque receipt ID}    │
                  │ Purchased: {snapshot summary}     │
                  │ Granted: {confirmed credit count} │
                  │                                  │
                  │ [Primary action] [Return Home]    │
                  └──────────────────────────────────┘
```

**Checkout receipt — 375px**

```text
┌────────────── 343px ──────────────┐
│ [status icon]                    │
│ Exact state title                │
│ Exact state explanation          │
│                                  │
│ Reference:                       │
│ {opaque receipt ID, wraps}       │
│ Purchased: {snapshot summary}    │
│ Granted: {confirmed count}       │
│                                  │
│ [Primary action — full width]    │
│ [Return Home — full width]       │
└──────────────────────────────────┘
```

Each row below is a required instance of both drawings. Omit purchase/grant values unless verified.

| State | Exact title | Exact explanation | Primary action |
|---|---|---|---|
| Loading | “Checking your payment” | “Please wait while we confirm your order.” | None |
| Missing reference | “Checkout reference missing” | “Open the confirmation link from your checkout.” | None |
| Authentication required | “Sign in to view this order” | “Use the account that started checkout.” | “Sign in” |
| Not owned/not found | “Order unavailable” | “This order could not be found for your account.” | None |
| Payment incomplete | “Payment not complete” | “No session credits have been added.” | “Check again” |
| Paid, pending allocation | “Payment received” | “Your session credits are still being added. Do not pay again.” | “Check again” |
| Durable review | “Order needs review” | “Your payment was received. Your order is awaiting support review.” | “Check status” |
| Fulfilled | “Order complete” | “Your purchased session credits have been added.” | Existing activation CTA |
| Refunded | “Payment refunded” | “Your receipt reflects the confirmed refund.” | None |
| Network failure | “Could not check your order” | “Try again. Do not submit another payment.” | “Try again” |

A physical-only order uses “Your purchase is confirmed.” instead of claiming session credits.

**Waiver result — desktop**

```text
┌────────────────── existing form width ──────────────────┐
│ Exact result title                                      │
│ Exact result explanation                                │
│ [Return Home]                                           │
└─────────────────────────────────────────────────────────┘
```

**Waiver result — 375px**

```text
┌────────────── 343px ──────────────┐
│ Exact result title               │
│ Exact result explanation         │
│ [Return Home — full width]       │
└──────────────────────────────────┘
```

| State | Exact title | Exact explanation/action |
|---|---|---|
| Submitting | “Submitting waiver” | “Please wait while your submission is saved.” No enabled submit action. |
| Anonymous received | “Waiver received” | “Your submission has not been linked to an account. Staff must verify it before account requirements are marked complete.” |
| Authenticated self recorded | “Waiver recorded” | “Your waiver has been recorded for your account.” |
| Validation error | “Check your submission” | Show field-level errors; focus the first invalid field. |
| Version changed | “Waiver updated” | “Review the current waiver before submitting again.” Action: “Review waiver”. |
| Failure | “Waiver not submitted” | “Your submission could not be saved. Please try again.” Action: “Try again”. |

No new identity-verification wizard is introduced.

**Interaction contract**

- Controls: minimum `44×44px`; mobile gap at least `8px`.
- Reading/focus order: title → explanation → reference/details → primary action → home.
- Status updates use `aria-live="polite"`; errors use an alert region.
- No focus stealing during background refresh.
- Cancel/unmount aborts pending browser requests.
- No success animation, cart clearing, or success toast for pending/review/error states.
- Verify widths `375`, `414`, `1440`, `2560`, `3840`; test keyboard and reduced motion.
- Charts: N/A — these state regions contain no chart.
