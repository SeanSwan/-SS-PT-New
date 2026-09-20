**Scope:** Existing Talk, Review, and History surfaces, with harness-specific states. Transcription, onboarding, and intake screens are unchanged and excluded from this visual update.

**Exact tokens**

```css
--coach-harness-bg: var(--bg-base, #030712);
--coach-harness-panel: var(--bg-card, #141419);
--coach-harness-text: var(--text-primary, #E0ECF4);
--coach-harness-secondary: var(--text-secondary, #E0ECF4);
--coach-harness-primary: var(--color-primary, #002060);
--coach-harness-focus: var(--accent-focus, #8B5CF6);
--coach-harness-accent: var(--accent-primary, #60C0F0);
--coach-harness-border: var(--border-default, #4070C0);
```

These are **proposed local aliases** with approved palette fallbacks. S0 must reconcile upstream token names with the actual theme. Text uses full-opacity Frost White; meaning is never conveyed through color alone.

Controls have minimum dimensions `44px × 44px`. No new chart is needed. No animation is needed for status changes. Existing decorative animation must not block the composer and must respect reduced motion.

**Desktop shell — 1440 × 900**

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Swan Coach Floor Mode                 [Client selector ▾]             │
│ [Talk] [Review] [History]                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Talk                                          │ Current action       │
│                                               │ No action selected.  │
│ Ask a question or describe an action.          │                      │
│                                               │                      │
│ [bounded, independently scrolling transcript] │                      │
├───────────────────────────────────────────────┴──────────────────────┤
│ [Type a question or action…                                      ]   │
│ [More]                                               [Send]          │
└─────────────────────────────────────────────────────────────────────┘
```

The shell fits the viewport using `min-height: 0` in scrolling grid/flex children. The transcript scrolls; the composer does not move below a long conversation. Existing authorized client display names may remain inside the application UI; they are not provider payloads.

**375px mobile shell — 375 × 812**

```text
┌─────────────────────────────────────┐
│ Swan Coach Floor Mode               │
│ [Client selector ▾                 ]│
│ [Talk]     [Review]     [History]    │
├─────────────────────────────────────┤
│ Talk                                │
│ Ask a question or describe an       │
│ action.                             │
│                                     │
│ [bounded transcript]                │
│                                     │
├─────────────────────────────────────┤
│ [Type a question or action…        ]│
│ [More]                       [Send] │
└─────────────────────────────────────┘
```

Use `100dvh` with safe-area padding and a working fallback. Validate with the virtual keyboard open. Mobile has no required side rail and no horizontal page scrolling.

**Review — desktop and mobile**

```text
DESKTOP
┌─────────────────────────────────────────────────────────────────────┐
│ Review action                                                       │
│ Action: {server-provided action label}                               │
│ Client: {authorized application display label}                       │
│ Changes: {server-provided structured summary}                        │
│ Review this action before continuing.                               │
│ Expires: {localized server expiry}                                   │
│ [Cancel action]                                   [Confirm action]  │
└─────────────────────────────────────────────────────────────────────┘

375px
┌─────────────────────────────────────┐
│ Review action                       │
│ Action: {label}                     │
│ Client: {authorized label}          │
│ Changes: {structured summary}       │
│ Review this action before          │
│ continuing.                         │
│ Expires: {localized expiry}         │
│ [Confirm action                   ] │
│ [Cancel action                    ] │
└─────────────────────────────────────┘
```

Action-specific summary fields come from a reviewed presenter allowlist, not raw registry parameters. Destructive actions use exact button copy **“Confirm destructive action”** and visible text **“This action changes stored data.”**

**History — desktop and mobile**

```text
DESKTOP
┌─────────────────────────────────────────────────────────────────────┐
│ History                                                             │
│ {time}  {action label}  {authoritative receipt title}    [View details]│
│ {time}  {action label}  Action cancelled                 [View details]│
└─────────────────────────────────────────────────────────────────────┘

375px
┌─────────────────────────────────────┐
│ History                             │
│ {time}                              │
│ {action label}                      │
│ {authoritative receipt title}       │
│ [View details                     ] │
└─────────────────────────────────────┘
```

History uses authorized server records. Refreshing or opening another thread must not manufacture history from optimistic messages alone.

**All state variants**

Every row defines the text and action region for both layouts above. On mobile, listed buttons stack full width; on desktop, they form a wrapping row. Empty button cells mean no action button.

| Surface/state | Exact visible copy | Controls |
|---|---|---|
| Talk, initial loading | “Loading conversation…” | Send disabled |
| Talk, empty | “Ask a question or describe an action.” | Send enabled only for valid nonempty input |
| Talk, submitting | “Checking your request…” | Send disabled |
| Talk, input invalid | “Enter a question or action.” | Focus composer |
| Talk, read success | “Result” followed by authorized result | None |
| Talk, validated answer | “Swan Coach” followed by validated answer | None |
| Talk, local clarification | “Please describe one action at a time.” | Composer retained |
| Talk, provider admission unavailable | “This request cannot be sent to AI in its current form.” | “Edit request” |
| Talk, access denied | “You do not have access to this action.” | “Dismiss” |
| Talk, write paused | “Swan Coach actions are temporarily paused by the administrator. Read-only questions still work. No data was changed.” | “Dismiss” |
| Talk, lane paused | “Swan Coach commands are temporarily disabled. Please try again later.” | “Dismiss” |
| Talk, unsupported | “This action is not available in Swan Coach.” | “Dismiss” |
| Talk, subscription blocked | “This question requires an eligible AI chat subscription.” | Existing verified paywall control |
| Talk, rate limited | “Too many requests. Please wait before trying again.” | Retry disabled until server retry time, if supplied |
| Talk, failed before execution | “The request could not be processed. No action was executed.” | “Try again” only when server confirms no effect |
| Talk, provider unavailable | “AI is unavailable right now. No action was executed.” | “Try again” as a new explicit provider request |
| Review, empty | “No actions waiting for review.” | None |
| Review, details loading | “Loading action details…” | Confirm disabled |
| Review, confirmation pending | “Review this action before continuing.” | Confirm action; Cancel action |
| Review, confirming | “Applying action…” | Both buttons disabled |
| Review, cancelling | “Cancelling action…” | Both buttons disabled |
| Review, null/invalid legacy ID | “This preview cannot be confirmed. Create a new preview.” | “Create a new preview” |
| Review, expired | “This preview has expired. Create a new preview.” | “Create a new preview” |
| Review, changed client | “Client context changed. Create a new preview.” | “Create a new preview” |
| Review, stale data/policy | “The action details changed. Create a new preview.” | “Create a new preview” |
| Review, cancelled | “Action cancelled. No data was changed.” | None |
| Review, cancel lost race | “This action was already completed.” | “View details” |
| Any command, outcome unknown | “Outcome unknown. Check status before trying again.” | “Check status” |
| Any command, checking status | “Checking action status…” | Check status disabled |
| Status lookup unavailable | “Status is unavailable. Do not repeat this action yet.” | “Check status” |
| Frontend delivery only | “Sent to the active workout surface. Saving is not confirmed.” | None |
| No frontend receiver | “No active workout surface was open. No form was changed.” | None |
| No workout-submit receiver | “No active Workout Logger was open. No workout was submitted.” | None |
| History, loading | “Loading action history…” | None |
| History, empty | “No actions recorded.” | None |
| History, partial | “Some action details are unavailable.” | “Try again” |
| History, unavailable | “Action history could not be loaded.” | “Try again” |
| Committed mutation | “Action completed.” plus verified structured result | “View details” |

A server-committed receipt may use more specific approved copy, such as “Workout saved,” only when its effect kind and authoritative identifier support that statement.

**Accessibility and recovery**

- One labeled tab list; arrow-key tab navigation; selected tab exposed programmatically.
- Native buttons and labels; no hover-only actions.
- Status uses `aria-live="polite"`; actionable errors use an appropriate alert.
- Changing status does not steal focus. Opening a review dialog moves focus to its heading; closing restores the invoking control.
- Escape closes a dialog; it does **not** imply server cancellation.
- Stale cards disable confirmation immediately. The server remains authoritative.
- Session expiry preserves the draft in memory. Do not introduce raw-message persistence in local/session storage.
- Required widths: 375, 414, 768, 1280, 1920, 2560, and 3840 CSS pixels; explicit 2560×1440 and 3840×2160 checks; 200% text zoom.
