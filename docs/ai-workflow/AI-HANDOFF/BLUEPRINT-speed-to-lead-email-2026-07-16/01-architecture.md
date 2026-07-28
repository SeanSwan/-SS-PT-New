# 01 — Architecture

## A. The whole funnel (flowchart)

```mermaid
flowchart TD
    YT[YouTube video CTA<br/>contact?type=assessment&utm_source=youtube] --> CP[Public /contact page<br/>ContactV3.tsx]
    WEB[Organic site visitor] --> CP
    CP -->|POST /api/contact<br/>name,email,message,consultationType,utm*| CR[contactRoutes.mjs :76]
    CR --> DB[(contacts table)]
    CR --> AN[createAdminNotification<br/>admin bell]
    CR --> LC[captureLeadFromContact<br/>leadCaptureService.mjs:66]
    LC -->|findOrCreate by email| LEAD[(leads table<br/>status:new, tags, utm sourceDetail)]
    LC -->|new lead only| ENR[enrollNewLeadInNurture<br/>triggerSequence 'lead_captured']
    ENR --> LOGS[(automation_logs<br/>one row per step,<br/>status:pending, scheduledFor)]
    ENR -.->|NEW S4: fast-lane kick<br/>setImmediate, still fully gated| PROC
    CRON[automationCron.mjs<br/>armed via SWAN_AUTOMATION_CRON_ENABLED] --> PROC[processScheduledMessages]
    PROC -->|gates: armed? due? claim 'processing'?<br/>frequency cap? suppression? consent?| CH{channel}
    CH -->|sms| SMS[sendTemplatedSMS - EXISTS, untouched]
    CH -->|email - NEW S3| ES[sendAutomationEmail<br/>emailAutomationSender.mjs]
    ES --> TPL[renderEmailTemplate<br/>emailTemplates.mjs - NEW S1]
    ES --> SG[sendGridEmail<br/>sendgridService.mjs:32 - EXISTS]
    SG --> INBOX[Prospect inbox<br/>within ~5 min of submit]
    INBOX -->|clicks unsubscribe| UNSUB[GET /api/leads/unsubscribe?lid&tok<br/>NEW S2] --> SUP[lead.tags += email-unsubscribed<br/>+ LeadActivity row]
```

## B. Speed-to-lead send (sequence diagram — the critical path)

```mermaid
sequenceDiagram
    participant P as Prospect
    participant C as POST /api/contact
    participant L as leadCaptureService
    participant A as automationService
    participant Q as automation_logs
    participant E as emailAutomationSender (NEW)
    participant SG as SendGrid

    P->>C: submit form (assessment, utm_source=youtube)
    C->>L: captureLeadFromContact(...)
    L->>L: Lead.findOrCreate(email)
    L->>A: triggerSequence('lead_captured', null, {leadId, clientName})
    A->>Q: INSERT rows: step0 scheduledFor=now,<br/>step2 now+2d, step5 now+5d (channel:email)
    L-->>C: {leadId, created} (never throws)
    C-->>P: 200 success (user never waits on email)
    Note over A: fast-lane: setImmediate(processScheduledMessages)<br/>+ cron sweep as backstop
    A->>Q: claim due row (status pending→processing)
    A->>A: gates: armed? suppression? email-unsubscribed tag?
    A->>E: sendAutomationEmail({log, lead})
    E->>E: renderEmailTemplate(templateName, vars)
    E->>SG: sendGridEmail({to, subject, text, html})
    SG-->>E: {success:true}
    E-->>A: {success:true}
    A->>Q: status→sent, sentAt=now
    A->>Q: on failure: status→failed, error=<reason> (never retry-loop)
```

## C. Data model (ER — touched tables only; NO new tables)

```mermaid
erDiagram
    leads ||--o{ automation_logs : "leadId (soft ref, no FK)"
    leads ||--o{ lead_activities : "leadId"
    automation_sequences ||--o{ automation_logs : "sequenceId"
    contacts {
        int id PK
        string name
        string email
        text message
        uuid userId "nullable"
        enum priority "low|normal|high|urgent"
    }
    leads {
        int id PK
        string first_name
        string email
        enum source "gallery|walk_in|website|referral|social_media|other"
        string source_detail "carries utm e.g. youtube/golf"
        enum status "new|contacted|qualified|scheduled|converted|lost"
        int score
        jsonb tags "ARRAY - add 'email-unsubscribed' here"
        date last_contacted_at
        int contact_count
    }
    automation_sequences {
        int id PK
        string name "NEW row: speed_to_lead"
        string triggerEvent "lead_captured"
        boolean isActive "seed FALSE - armed by runbook"
        jsonb steps "dayOffset+channel+templateName"
    }
    automation_logs {
        int id PK
        int sequenceId FK
        int leadId "soft ref"
        enum channel "sms|email|push - email NOW IMPLEMENTED"
        enum status "pending|processing|sent|failed|cancelled"
        string templateName
        string recipient "email addr"
        jsonb payloadJson "template vars"
        date scheduledFor
        date sentAt
        string error
    }
```

**Schema deltas: ZERO migrations needed.** `automation_logs.channel` already has
`'email'` in its enum; `leads.tags` is JSONB. Unsubscribe = a tag + LeadActivity,
not a column. (If the builder believes a migration is needed, STOP — that's drift.)

## D. State machine — one automation_log row

```mermaid
stateDiagram-v2
    [*] --> pending: triggerSequence inserts
    pending --> processing: atomic claim (optimistic lock)
    processing --> sent: sendGridEmail success
    processing --> failed: gate refused / send error<br/>(error field says why)
    pending --> cancelled: cancelSequence / lead converted
    sent --> [*]
    failed --> [*]: NO auto-retry (Sean triages via preview route)
```

## E. Component tree (frontend touch — S5 only)

```
MarketingWorkspace.tsx (route /dashboard/marketing — EXISTS)
└── SpeedToLeadStatusCard.tsx (NEW, ≤300 lines, styled-components)
    ├── ArmedBadge        (reads GET /api/automation/status)
    ├── PendingCount      (reads GET /api/automation/preview — email rows)
    └── RecentSendsList   (last 5 sent/failed email logs, relative time)
```
