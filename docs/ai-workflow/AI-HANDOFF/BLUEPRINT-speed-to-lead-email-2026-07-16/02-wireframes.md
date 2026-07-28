# 02 — Wireframes & Exact Copy

The PRODUCT SURFACE of this epic is the email itself. Treat each email as a screen.

## E1 — Instant reply (day 0, template `stl_instant_reply`) — EXACT COPY

Subject (exact): `Got your message — here's your next step, {{firstName}}`

```
┌────────────────────────────────────────────────────────────┐
│  SWANSTUDIOS                                    (wordmark)  │
│  ──────────────────────────────────────────────────────    │
│                                                            │
│  Hey {{firstName}},                                        │
│                                                            │
│  Thanks for reaching out — you just did the part most      │
│  people put off for years.                                 │
│                                                            │
│  Here's what happens next: I personally read every         │
│  message, and I'll get back to you within one business     │
│  day. If you asked about the free movement & performance   │
│  assessment, we'll set up a time that fits your schedule.  │
│                                                            │
│  In the meantime, one question worth thinking about:       │
│  what's the ONE thing you want your body to do better      │
│  six months from now? Have that answer ready — it's        │
│  where we'll start.                                        │
│                                                            │
│  — Sean Swan                                               │
│  26+ years experience · NASM-protocol training             │
│  SwanStudios · https://sswanstudios.com                    │
│                                                            │
│  ──────────────────────────────────────────────────────    │
│  You're receiving this because you contacted SwanStudios.  │
│  Unsubscribe: {{unsubscribeUrl}}                           │
└────────────────────────────────────────────────────────────┘
```

## E2 — Follow-up (day 2, template `stl_followup_2d`)

Subject: `Your free assessment is still open, {{firstName}}`

```
│  Hey {{firstName}},                                        │
│                                                            │
│  Quick nudge — your free movement & performance            │
│  assessment is still open. It takes about 30 minutes,      │
│  there's nothing to prepare, and you leave knowing         │
│  exactly what your body needs next. No obligation, no      │
│  hard sell — that's not how I work.                        │
│                                                            │
│  Reply to this email with two times that work this week    │
│  and we'll lock one in.                                    │
│                                                            │
│  — Sean                                                    │
│  (footer + unsubscribe identical to E1)                    │
```

## E3 — Last touch (day 5, template `stl_followup_5d`)

Subject: `No pressure — door's open when you're ready`

```
│  Hey {{firstName}},                                        │
│                                                            │
│  I'll leave you be after this one. Life gets busy — I get  │
│  it. When you're ready to work on how you move, perform,   │
│  and feel, the assessment offer stands. Just reply to      │
│  this email, any time.                                     │
│                                                            │
│  Until then: train smart, and don't let the perfect plan   │
│  stop the good workout.                                    │
│                                                            │
│  — Sean                                                    │
│  (footer + unsubscribe identical to E1)                    │
```

**Email rendering rules (all three):** single-column, max-width 600px table layout,
system font stack, dark text `#1a1a24` on white `#ffffff` (emails are LIGHT — inbox
convention; the dark-first rule applies to the APP, not email), one link color
`#0066cc`. Plain-text part = same copy minus layout. NO images (deliverability +
nothing to break). NO emoji in subjects.

## W1 — Unsubscribe landing (returned as HTML by GET /api/leads/unsubscribe)

```
┌──────────────────────────────────────────┐
│            SWANSTUDIOS                   │
│                                          │
│   ✓ You're unsubscribed.                 │
│                                          │
│   You won't receive marketing emails     │
│   from SwanStudios anymore. If this was  │
│   a mistake, just reply to any previous  │
│   email and we'll fix it.                │
│                                          │
└──────────────────────────────────────────┘
```
(Exact copy above. Plain inline-styled HTML string from the route — no React,
no template engine. Invalid/expired token variant: heading `Link expired or
invalid.` body `No changes were made. If you need help, reply to any email
you've received from SwanStudios.` — SAME 200 response shape, never a stack
trace, never an email address hardcoded in the page.)

## W2 — SpeedToLeadStatusCard (MarketingWorkspace, desktop ≥1024px)

```
┌─ Speed-to-Lead ────────────────────────────────────────┐
│  ● ARMED          Sequence: speed_to_lead (email)      │   ← green dot #10b981 when
│                                                        │     armed, gray #6b7280 off
│  Pending emails:  3        Sent (7d):  12   Failed: 1  │
│                                                        │
│  Recent                                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ✉ stl_instant_reply → j***@gmail.com   2m ago  ✓ │  │
│  │ ✉ stl_followup_2d  → m***@yahoo.com   1h ago  ✓ │  │
│  │ ✉ stl_instant_reply → k***@aol.com    3h ago  ✗ │  │
│  └──────────────────────────────────────────────────┘  │
│                                     [ Open Preview ]   │   ← 44px min height btn
└────────────────────────────────────────────────────────┘
```

Mobile 375px: stat trio stacks vertically; recent list rows wrap to two lines;
button full-width. Card uses house tokens: surface `var(--card-dark, #141419)`,
text `var(--text-primary, #E0ECF4)`, accent `var(--accent-primary, #60C0F0)`,
armed-green is data-state color (allowed for status dots). Recipient emails are
MASKED as shown (first char + `***@domain`) — full addresses never render in
the admin card. Loading state: three skeleton bars. Error state: single line
`Couldn't load automation status — refresh or check /api/automation/status.`
Empty state: `No email sends yet. Arm the sequence to start.`
