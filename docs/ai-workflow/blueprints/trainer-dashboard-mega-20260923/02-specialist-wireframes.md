**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [02-wireframes.md](02-wireframes.md); same scope, bindings, and pending approvals.

**Video Assessment — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ Video Assessment                              [Select session ▾]│
│ Review movement together. Video is not recorded.                 │
├──────────────────────────────────────────┬───────────────────────┤
│ {Local preview before joining}           │ Session               │
│ [Enable camera and microphone]           │ {authorized client}   │
│ ☐ I agree to use live camera and         │ Trainer observations  │
│   microphone for this assessment.        │ {trainer-only editor} │
│ [Join assessment]                        │ [Save observations]   │
│                                         │ Client summary        │
│ {Remote video after joining}             │ {shared summary}      │
│ [Microphone] [Camera] [Leave assessment]  │                       │
└──────────────────────────────────────────┴───────────────────────┘
```

**Video Assessment — 375px**

```text
┌─────────────────────────────────┐
│ Video Assessment                │
│ Video is not recorded.          │
│ {local preview / remote video}  │
│ [Enable camera and microphone] │
│ ☐ I agree to use live camera    │
│   and microphone for this      │
│   assessment.                   │
│ [Join assessment]               │
│ [Mic] [Camera] [Leave]           │
│ {trainer: Observations editor}  │
│ {trainer: [Save observations]}  │
│ Client summary                  │
│ {shared summary}                │
└─────────────────────────────────┘
```

Client mode never receives private trainer notes in its response. `[Leave]` has accessible name “Leave assessment.” Trainer additionally receives `[End assessment for everyone]` with a confirmation dialog.

**Intake & Devices — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ Intake & Devices                              {authorized subject}│
│ [Audio] [Devices] [History]                                      │
├──────────────────────────────────────────┬───────────────────────┤
│ Devices                                 │ Data history          │
│ {provider} {connection state}            │ {metric} {value/unit} │
│ Last received {time / "Never"}           │ Source {source}       │
│ [Connect device] [Import device export]  │ Measured {time}       │
│                                         │ Received {time}       │
│ {existing audio workspace in Audio tab}  │ [View source details] │
│                                         │ [Review for Coach]    │
└──────────────────────────────────────────┴───────────────────────┘
```

**Intake & Devices — 375px**

```text
┌─────────────────────────────────┐
│ Intake & Devices                │
│ {authorized subject}            │
│ [Audio] [Devices] [History]      │
│ {provider} · {connection state} │
│ Last received {time / "Never"}  │
│ [Connect device]                │
│ [Import device export]          │
│ {metric} {value/unit}           │
│ Source {source}                 │
│ Measured {time}                 │
│ [View source details]           │
│ [Review for Coach]              │
└─────────────────────────────────┘
```

Import review and Coach review use separate dialogs:

```text
Desktop                                      375px
┌─────────────────────────────────────┐      ┌────────────────────────────┐
│ Review import                   [×] │      │ [Back] Review import       │
│ Source {source} · {date range}      │      │ Source {source}            │
│ Valid {n} Duplicate {n} Rejected {n}│      │ Valid {n} · Duplicate {n}  │
│ {rejection reasons, no raw secrets} │      │ Rejected {n} · {reasons}   │
│ [Discard] [Import valid readings]   │      │ [Discard] [Import valid]  │
└─────────────────────────────────────┘      └────────────────────────────┘

┌─────────────────────────────────────┐      ┌────────────────────────────┐
│ Review for Coach                [×] │      │ [Back] Review for Coach    │
│ {minimized summary and date range} │      │ {minimized summary}        │
│ Sources {source labels}            │      │ Sources {source labels}    │
│ [Cancel] [Use in Coach]             │      │ [Cancel] [Use in Coach]    │
└─────────────────────────────────────┘      └────────────────────────────┘
```

**My Earnings — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ My Earnings                         [Period ▾] [Currency ▾]       │
│ {period} · Updated {time}                                        │
├────────────────────┬────────────────────┬────────────────────────┤
│ Earned {amount}    │ Available {amount} │ Paid {amount}          │
├─────────────────────────────────────────┬────────────────────────┤
│ Statement                               │ Payout history         │
│ Date | Service | Earned | Adjustment     │ {amount} {status}      │
│ {entry} [View calculation]               │ {date}                 │
│                                         │ [Load more]            │
└─────────────────────────────────────────┴────────────────────────┘
```

**My Earnings — 375px**

```text
┌─────────────────────────────────┐
│ My Earnings                     │
│ [Period ▾] [Currency ▾]          │
│ Earned {amount}                 │
│ Available {amount} · Paid {sum} │
│ Statement                       │
│ {date} · {service reference}    │
│ Earned {amount}                 │
│ Adjustment {amount}             │
│ [View calculation]              │
│ Payout history                  │
│ {amount} · {status} · {date}    │
│ [Load more]                     │
└─────────────────────────────────┘
```


**Required contract-state labels**

- Import review uses the server preview's source/date range/counts and hidden preview hash. Discard cancels the server import before commit; a commit/discard race shows the reconciled state.
- While validating or committing, closing the dialog does not announce cancellation. Reopening polls the same import/operation ID. Failed work offers Retry only when the server marks it retryable; expired previews require a fresh upload and review.
- Coach review renders the exact allowlisted content from the server preview. Changed sources, consent, assignment, expiry, or deletion clears approval and returns to review. Cancel sends nothing to Coach.
- Deletion shows queued/running/failed/completed from the job receipt. Show “Deletion in progress” while reads and new intake are fenced; never show completion from the request's 202 alone.
- Unknown payout reconciliation displays “Status not verified” and omits the Paid total. Unknown availability displays “Availability is not verified” and omits Available. Pending is reserved for a positively verified pending payout.
- Calculations may be reviewed only from an authorized statement entry; pagination preserves the server statement snapshot. No sum of visible pages substitutes for authoritative full-period totals.
