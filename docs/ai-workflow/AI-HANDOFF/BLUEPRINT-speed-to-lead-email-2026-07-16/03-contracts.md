# 03 — Contracts (signatures, endpoints, env, template schema)

## New module: `backend/services/emailTemplates.mjs` (S1)

```js
// Registry of automation email templates. Pure functions, no I/O, no env reads.
// Template vars are ALWAYS { firstName, unsubscribeUrl } — nothing else exists yet.

export const EMAIL_TEMPLATES = Object.freeze({
  stl_instant_reply: { subject: (v) => `Got your message — here's your next step, ${v.firstName}`, /* html, text fns */ },
  stl_followup_2d:  { subject: (v) => `Your free assessment is still open, ${v.firstName}`, /* ... */ },
  stl_followup_5d:  { subject: () => `No pressure — door's open when you're ready`, /* ... */ },
});

/**
 * @param {string} templateName  key of EMAIL_TEMPLATES
 * @param {{firstName?: string, unsubscribeUrl: string}} vars
 * @returns {{subject: string, text: string, html: string}}
 * @throws {Error} `Unknown email template: <name>` when the key is absent
 * firstName fallback when missing/empty: the literal string "there" (as in "Hey there,")
 */
export function renderEmailTemplate(templateName, vars) {}

export function listEmailTemplates() {} // -> [{name, subjectPreview}]  (for preview routes)
```

Copy comes VERBATIM from `02-wireframes.md`. HTML = 600px single-column table,
inline styles only. Each html output MUST contain `{{unsubscribeUrl}}`-rendered
link and the literal footer line `You're receiving this because you contacted SwanStudios.`

## New module: `backend/services/leadUnsubscribeToken.mjs` (S1)

```js
// HMAC-SHA256 unsubscribe tokens. Stateless — no table, no expiry storage.
// Secret: process.env.LEAD_UNSUB_SECRET (falls back to process.env.JWT_SECRET;
// if BOTH are unset, buildUnsubscribeUrl returns null and emails render the
// footer WITHOUT a link — fail-closed on secrets, fail-open on sending).

/** @returns {string} hex hmac of `lead:${leadId}` */
export function makeUnsubscribeToken(leadId) {}

/** @returns {boolean} constant-time compare */
export function verifyUnsubscribeToken(leadId, token) {}

/** @returns {string|null} `${baseUrl}/api/leads/unsubscribe?lid=${id}&tok=${token}`
 *  baseUrl: process.env.PUBLIC_BASE_URL || 'https://sswanstudios.com' */
export function buildUnsubscribeUrl(leadId) {}
```

## New module: `backend/services/emailAutomationSender.mjs` (S3)

```js
/**
 * The ONLY bridge between the drip processor and SendGrid.
 * @param {{log: AutomationLog, lead: Lead|null}} args
 *   log.templateName -> EMAIL_TEMPLATES key; log.recipient -> to-address;
 *   log.payloadJson -> {firstName} vars source
 * @returns {Promise<{success: boolean, error?: string}>}  NEVER throws.
 * Refusals (returned as {success:false, error:<literal>}):
 *   'missing_recipient'            log.recipient falsy or not containing '@'
 *   'unknown_template:<name>'      renderEmailTemplate threw
 *   'lead_email_unsubscribed'      lead?.tags includes 'email-unsubscribed'
 *   'sendgrid_not_configured'      isSendGridServiceConfigured() false
 *   'sendgrid_error:<message>'     sendGridEmail returned {success:false}
 */
export async function sendAutomationEmail({ log, lead }) {}
```

Imports: `renderEmailTemplate` (emailTemplates), `buildUnsubscribeUrl`
(leadUnsubscribeToken), `sendGridEmail, isSendGridServiceConfigured`
(`./sendgridService.mjs` — EXISTS, do not modify).

## Modified: `backend/services/automationService.mjs` (S3 + S4)

- In `processScheduledMessages`, the email branch currently fails with
  `channel_not_implemented`. Replace with: load lead when `log.leadId` set
  (`Lead.findByPk`), call `sendAutomationEmail({log, lead})`; map result to the
  EXISTING sent/failed handling — identical shape to the SMS branch. Touch
  NOTHING else in the function (gates, claiming, caps stay byte-identical).
- Add to `DEFAULT_SEQUENCES` (S4) one new entry:

```js
{
  name: 'speed_to_lead',
  triggerEvent: 'lead_captured',
  isActive: false, // seeded OFF — armed only by the S6 runbook
  steps: [
    { dayOffset: 0, channel: 'email', templateName: 'stl_instant_reply' },
    { dayOffset: 2, channel: 'email', templateName: 'stl_followup_2d' },
    { dayOffset: 5, channel: 'email', templateName: 'stl_followup_5d' },
  ],
}
```

- Fast-lane kick (S4): at the END of successful `triggerSequence` enrollment for a
  lead, schedule `setImmediate(() => processScheduledMessages({}).catch(() => {}))`.
  NO force flag — every gate still applies; if unarmed, the kick is a no-op. This
  turns "next cron tick" into "seconds after submit" without a new code path.
- **Recipient resolution (sanctioned automationService spot #4):** inspect how
  `triggerSequence`'s lead path (:169-217) sets `automation_logs.recipient`. For
  SMS it resolves the lead's phone. For `channel:'email'` steps it MUST set
  `recipient = lead.email`; if the current code doesn't branch by channel, extend
  the recipient resolution there — steps whose lead has no email are inserted as
  `status:'failed', error:'missing_recipient'` (visible, not silently skipped).
- **Template vars mapping (decided):** the sender builds vars as
  `{ firstName: log.payloadJson?.clientName || lead?.firstName || 'there', unsubscribeUrl: buildUnsubscribeUrl(lead?.id) }`
  — `clientName` is what `enrollNewLeadInNurture` already places in the trigger
  data; do not add new payload fields.

## New route: in EXISTING `backend/routes/leadRoutes.mjs` (S2)

```
GET /api/leads/unsubscribe?lid=<int>&tok=<hex>     AUTH: none (public link)
  MUST be registered BEFORE the router-wide `router.use(protect)` lines —
  i.e. add the handler ABOVE them in the file (leadRoutes.mjs applies
  router.use(protect); router.use(trainerOrAdminOnly); at :16-17).
  200 text/html always (both success and invalid-token pages — see 02 W1).
  On valid token: lead.tags = [...new Set([...tags,'email-unsubscribed'])];
    LeadActivity.create({leadId, type:'note_added', title:'Email unsubscribe',
    description:'Prospect unsubscribed via email link'});
  Idempotent: already-unsubscribed → same success page.
  Invalid lid/tok → the invalid page; HTTP 200; NEVER 500, NEVER reveal why.
```

## Modified: `backend/routes/automationSafetyRoutes.mjs` (S5)

- `GET /templates/preview` already previews SMS templates — extend response with
  `emailTemplates: listEmailTemplates()`.
- No other route changes. The status/preview/process endpoints already cover email
  rows because they read `automation_logs` generically.

## New component: `frontend/src/components/DashBoard/workspaces/marketing/SpeedToLeadStatusCard.tsx` (S5)

```ts
// styled-components only. ≤300 lines. Mimic LeadPipelinePanel.tsx's fetch/auth
// pattern (same folder). Reads:
//   GET /api/automation/status   -> { success, data: { armed: boolean } }
//   GET /api/automation/preview  -> filter rows to channel==='email'
// Renders per 02-wireframes W2 (armed badge, counts, masked recents, states).
export default function SpeedToLeadStatusCard(): JSX.Element {}
// Mount: MarketingWorkspace.tsx — lazy import beside LeadPipelinePanel (:31),
// render directly ABOVE <LeadPipelinePanel .../> (:170).
```

## Env var NAMES (never values; all read via process.env after dotenv.config())

| Name | Used by | Required? |
|---|---|---|
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | sendgridService (EXISTS) | yes, already set in prod |
| `LEAD_UNSUB_SECRET` | leadUnsubscribeToken | optional (falls back to `JWT_SECRET`) |
| `PUBLIC_BASE_URL` | buildUnsubscribeUrl | optional (default sswanstudios.com) |
| `SWAN_AUTOMATION_CRON_ENABLED` | arm gate (EXISTS) | the master switch — runbook only |
| `SWAN_AUTOMATION_MAX_PER_WINDOW` etc. | frequency caps (EXIST) | untouched |

## Error-handling doctrine (applies to every new function)
Best-effort, never-throw at the integration seams (mirror `captureLeadFromContact`):
a failed email must NEVER break contact submission, lead capture, or the processor
loop. Every failure lands as `automation_logs.status='failed'` + `error=<literal
reason>` — visible, never silent (fail VISIBLE, log the reason string exactly).
