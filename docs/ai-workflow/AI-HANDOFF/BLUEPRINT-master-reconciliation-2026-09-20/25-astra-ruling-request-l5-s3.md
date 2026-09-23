# 25 — Astra ruling request: L5 S3 email-channel gate

**Purpose:** one decision, asked precisely. Everything below is measured against the
repository at `f2fa0a36f`, not inferred.

## The question

**May `automationDecisionService.mjs:86` be widened to admit `channel === 'email'`?**

If yes, specify how the recipient check downstream should treat email versus phone
(today the only recipient check is `if (!recipient?.phone) return fail 'no_phone'` at
`:99`, which is SMS-specific and would wrongly fail an email-only lead).

## Why the builder will not decide this alone

Three authorities collide, and each one alone would give a different answer:

1. **`05-slices.md:33-45` (S3)** declares exactly three files:
   `emailAutomationSender.mjs`, `automationService.mjs` (MOD — *email branch ONLY*),
   `automationService.emailChannel.test.mjs`. `automationDecisionService.mjs` is
   **not** among them.
2. **`06-bans.md:22-25` (ban #2)** permits edits to `automationService.mjs` at
   *"the email branch swap ONLY (one `if` block) + the DEFAULT_SEQUENCES entry + the
   setImmediate kick. Diff outside those three spots = REVISE."* The decision service
   is outside all three.
3. **`03-contracts.md:155-159` (error doctrine)** requires every failure to be
   *"visible, never silent."* Leaving S3's criteria unmet without a record would
   violate this; so would shipping code that makes email logs fail by construction.

## The measurement

`automationDecisionService.mjs:86`:

```js
if (channel !== 'sms') return { action: 'fail', reason: 'channel_not_implemented', channel };
```

Executed directly:

```
$ node --input-type=module -e "
  import { evaluateScheduledMessage } from './services/automationDecisionService.mjs';
  const log = { channel:'email', templateName:'stl_instant_reply', recipient:'a@b.com' };
  const target = { email:'a@b.com', phone:null, notificationPreferences:null, leadId:7 };
  console.log(JSON.stringify(evaluateScheduledMessage(log, target, new Date(), null, null)));"

{"action":"fail","reason":"channel_not_implemented","channel":"email"}
```

Consequence in the processor: `automationService.mjs:276` obtains that decision,
`:299-308` handles `action === 'fail'` with `continue` — so control never reaches the
send branch at `:312`. **Every one of S3's seven acceptance behaviours presupposes
reaching that branch.** S3 therefore cannot be satisfied by its own declared file set.

## What the package itself implies

The pre-existing comment the builder did **not** write, `automationService.mjs:43-45`:

> *"email-only prospects need an email-channel sender (not yet built). Until that lands
> this stays inactive so capture creates NO undeliverable logs. Sean flips isActive=true
> (and arms SWAN_AUTOMATION_CRON_ENABLED) when the channel is deliverable."*

So the blueprint's author already treats the email channel as *"not yet built"* and
gates activation on it. The open question is only **where** that build is permitted to
land — which the slice's file list does not answer.

## Options with their real consequences

**A. Widen the gate (admit `channel === 'email'`).**
- Unblocks S3 immediately and S4 (which reads a deliverable channel).
- Requires an email-aware recipient check; the existing `no_phone` check at `:99` must
  not be the one applied to email rows.
- **Cost:** breaches ban #2's letter. `automationDecisionService.mjs` is shared by
  **both** the live path (`:276`) and the admin dry-run (`:387`), so the change alters
  what `previewScheduledMessages` reports too — which is arguably correct, but it is a
  second consumer the slice never mentions.

**B. Move the channel gate into `automationService.mjs`** (the declared file).
- Keeps the decision service byte-identical and satisfies ban #2 literally.
- **Cost:** the dry-run at `:387` calls the same decision function and would keep
  reporting `channel_not_implemented`, so **preview would diverge from reality** — the
  exact property `automationService.mjs:360-365` says preview exists to guarantee
  (*"the SAME decision logic ... so the preview cannot diverge from reality"*). This
  trades a ban breach for a correctness breach.

**C. Amend the slice, not the code.** Declare `automationDecisionService.mjs` as a
fourth S3 file and let the work proceed as ordinary scope.
- Satisfies both the ban (by removing the conflict at its source) and correctness.
- **Cost:** the package is the authority; the builder amending it is the thing the
  ban exists to prevent. This needs the architect, which is why this is being asked.

## Builder's recommendation (non-binding)

**C, then A.** C resolves the actual defect — the slice's file list is incomplete for its
own deliverable — without either breach. A is then a normal implementation detail with a
named reviewer. B should be rejected on the grounds above: it is the only option that
breaks a property the code explicitly documents.

## Scope discipline held while waiting

No file outside S3's declaration was modified. `automationDecisionService.mjs`,
`automationService.mjs`, `sendgridService.mjs`, `leadCaptureService.mjs`,
`contactRoutes.mjs` and `automationCron.mjs` all carry their original mtimes. The only
S3 artifact produced is the new, self-contained `emailAutomationSender.mjs`
(16 tests, 0 fail) plus its test — both named in S3's own file list.
