# 24 — L5 S3 specification gap: the email branch is unreachable

**Status: BLOCKED — requires a ruling. No scope was widened to work around it.**

## 1. What S3 asks for

`05-slices.md:33-45` declares three files:

- `emailAutomationSender.mjs` (new)
- `automationService.mjs` (MOD — **email branch ONLY**)
- `automationService.emailChannel.test.mjs` (new)

and seven acceptance behaviours, all of which presuppose that a due email log
**reaches the send branch**.

`06-bans.md:22-25` (ban #2) is equally explicit: the processor edit is
*"the email branch swap ONLY (one `if` block) + the DEFAULT_SEQUENCES entry + the
setImmediate kick. Diff outside those three spots = REVISE."*

## 2. The blocker, measured rather than assumed

`automationDecisionService.mjs:86`:

```js
const channel = log?.channel || 'sms';
if (channel !== 'sms') return { action: 'fail', reason: 'channel_not_implemented', channel };
```

Every scheduled message is routed through `evaluateScheduledMessage` at
`automationService.mjs:276`, and any decision of `action: 'fail'` is handled at
`:299-308` — `continue`, i.e. the log never reaches the send branch at `:312`.

Direct measurement (not inference):

```
$ node --input-type=module -e "import { evaluateScheduledMessage } from
    './services/automationDecisionService.mjs';
  const log = { channel:'email', templateName:'stl_instant_reply', recipient:'a@b.com' };
  const target = { email:'a@b.com', phone:null, notificationPreferences:null, leadId:7 };
  console.log(JSON.stringify(evaluateScheduledMessage(log, target, new Date(), null, null)));"

email log decision: {"action":"fail","reason":"channel_not_implemented","channel":"email"}
REACHES SEND BRANCH? false
```

## 3. Why this is a gap and not a task

The one line that must change to make email deliverable is in
`automationDecisionService.mjs` — **a file S3 does not declare**, and which ban #2's
"three spots" enumeration does not cover. So:

- S3's **declared file set cannot satisfy S3's own acceptance criteria.**
- Widening the diff to include the decision service would violate ban #2 as written.
- Narrowing the slice to skip those criteria would violate the error doctrine
  (*"fail VISIBLE, never silent"*) by leaving the criteria silently unmet.

Both available readings are wrong, which by construction makes this a **ruling**,
not a builder choice. It is the same defect class the reconciliation already
tracks for other lanes: *a slice whose permitted file changes cannot reach the
slice's own deliverable.*

## 4. What was built instead (unambiguously in scope)

`backend/services/emailAutomationSender.mjs` — the new sender module, fully
specified in `03-contracts.md:50-71` and named in S3's file list. It is
self-contained: it imports only `emailTemplates`, `leadUnsubscribeToken`, and
`sendgridService`, and touches no shared file.

`backend/__tests__/emailAutomationSender.test.mjs` — **16 tests, 0 fail.**

All five contract refusals are asserted on their **exact literal**, because those
strings land in `automation_logs.error`:

| Refusal literal | Test |
|---|---|
| `missing_recipient` | absent recipient; non-address recipient |
| `lead_email_unsubscribed` | lead carrying the tag — and SendGrid NOT called |
| `unknown_template:<name>` | unknown name; undefined name |
| `sendgrid_not_configured` | transport off |
| `sendgrid_error:<message>` | transport failure; failure with no message |

Plus: never-throw (transport that *throws* becomes a visible failure; `null` log
survives; `null` lead still sends per the soft-`leadId` note) and the PII rule
(the log line carries `m***@example.com`, never the full address).

## 5. Two incidental findings, both pre-existing, neither mine to fix

1. **`automationDecisionService.mjs` also fails email for the *wrong reason*.**
   Its line 86 fires before any recipient logic, so an email log with a perfectly
   good address is rejected as `channel_not_implemented` rather than being
   evaluated on its merits. Whatever the ruling, that ordering is worth a look.
2. **The test environment can reach the live SendGrid API.** `backend/.env`
   carries a `SENDGRID_API_KEY`, `dotenv.config()` loads it inside
   `sendgridService.mjs`, and `tests/setup.mjs` has **no outbound-send guard**.
   This surfaced as a genuine `sendgrid_error:Unauthorized` from the real API
   during a first, wrongly-pathed test run. Ban #4 ("no SendGrid calls in tests —
   mock it") protects only tests that *do* mock; nothing enforces it globally.
   My test mocks the transport and passes identically with the key blanked, which
   is the isolation proof. A repo-level guard would be a separate, worthwhile slice.

## 6. What is needed to unblock

A ruling on exactly one question: **may the email-channel gate at
`automationDecisionService.mjs:86` be widened to admit `channel === 'email'`
(and, if so, how should its recipient check treat email vs phone)?**

Until that ruling exists, S3 stops here and S4/S5 (which depend on a deliverable
email channel) remain correctly blocked.
