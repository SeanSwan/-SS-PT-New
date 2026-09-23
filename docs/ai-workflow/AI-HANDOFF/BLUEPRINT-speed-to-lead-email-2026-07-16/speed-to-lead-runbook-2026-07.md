# Speed-to-Lead Drip — Activation Runbook (2026-07)

**Blueprint:** `BLUEPRINT-speed-to-lead-email-2026-07-16` (S6)
**Audience:** Sean. Every step below is executable without reading any code.
**HARD GATE (06-bans.md #4):** the builder never activates the sequence, never sets env
vars, never sends real email. Activation is Sean-executed. This document is the
procedure, not a licence for an agent to run it.

---

## 0. READ THIS FIRST — the feature is NOT activatable today

This runbook describes the intended activation. **It cannot be executed as written
yet**, and pretending otherwise would be the most dangerous thing in this document.
Two blockers are open:

| Blocker | State | Consequence |
|---|---|---|
| **The email branch is unreachable** | `automationDecisionService.mjs:86` fails every non-SMS channel with `channel_not_implemented` **before** recipient logic runs, so no email log ever reaches the send branch (`automationService.mjs:312`). Recorded in `BLUEPRINT-master-reconciliation-2026-09-20/24-l5-s3-specification-gap.md`. | **Arming the engine today sends nothing** for email rows; every one lands `failed`. |
| **The `speed_to_lead` sequence does not exist** | It is a `DEFAULT_SEQUENCES` entry that slice S4 has not yet added. Only `lead_nurture` exists. | There is nothing to activate. |

**What DID land (S1/S2/S5):** the email templates + unsubscribe tokens, the public
unsubscribe endpoint, and the admin status card. Those are the *parts*, not the feature.

**Therefore: do not start at §3.** First confirm §1's pre-flight shows the sequence
present and the email channel deliverable. Until then this runbook is a plan.

---

## 1. Pre-flight checklist (run this every time, before §2)

Do not proceed unless **every** line answers as shown.

### 1.1 Is the sequence present and seeded off?

```sql
SELECT name, "triggerEvent", "isActive"
FROM "AutomationSequences"
WHERE "triggerEvent" = 'lead_captured';
```

- `speed_to_lead` **must be listed**, and **`isActive` must be `false`** before you start.
  (Seeded `false` by design — `automationService.mjs:48`.)
- `lead_nurture` must also be listed and `isActive = false`. See §4's double-messaging rule.

### 1.2 Is the master switch off?

```bash
# In Render → Environment, check the value (do NOT change it yet):
#   SWAN_AUTOMATION_CRON_ENABLED
```

- Must be **absent or anything other than the literal `true`**. Only the exact string
  `true` arms anything (`automationArmState.mjs:14`).
- Confirm via the API instead of trusting the dashboard:

```bash
curl -s https://<host>/api/automation/status -H "Authorization: Bearer <ADMIN_JWT>" | jq
# expect: { "success": true, "data": { "armed": false } }
```

### 1.3 Is the email transport configured?

Env vars required (names only — values are never committed):
`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`. `LEAD_UNSUB_SECRET` and `PUBLIC_BASE_URL` are
optional (the token module falls back to `JWT_SECRET`; the URL falls back to
`https://sswanstudios.com`).

> **Fail-closed note:** if **both** `LEAD_UNSUB_SECRET` and `JWT_SECRET` are unset,
> emails still render but carry the footer **without an unsubscribe link**. Do not arm
> in that state — a marketing email with no working opt-out is a compliance problem,
> and §5's kill switch assumes the link works.

### 1.4 What would actually go out?

This is the dry-run surface. It mutates nothing.

```bash
curl -s https://<host>/api/automation/preview -H "Authorization: Bearer <ADMIN_JWT>" | jq
```

Read the `summary` buckets (`wouldSend` / `wouldDefer` / `wouldCancel` / `wouldFail`)
and `byReason`. **If `wouldFail` is dominated by `channel_not_implemented`, stop** — that
is §0's first blocker and arming would produce a queue of failures, not emails.

---

## 2. Owner-only live test (Sean's own address only)

Purpose: prove delivery + the unsubscribe link end-to-end, with zero exposure to real
prospects. **Use your own email address as the lead.** Never use a client's or a
prospect's address.

1. **Ensure the engine is still disarmed** (§1.2). Everything below is safe to do disarmed.
2. **Create yourself as a manual lead** with your own email, through the normal admin
   lead-creation flow (not SQL, so the capture path is exercised too).
3. **Activate the sequence** (§3.1) and **arm the cron** (§3.2). Both, in that order.
4. **Trigger capture** by submitting the public contact form with your own address, or by
   allowing the admin lead-creation flow to fire `lead_captured`.
5. **Wait up to 60 seconds** and check:
   - The inbox for your own address: the day-0 `stl_instant_reply` message.
   - `/api/automation/preview` shows the row leaving `pending`.
   - `automation_logs` for that lead shows `status='sent'` and a `sentAt`.
6. **Click the unsubscribe link in the received email.** Expect the page
   *"✓ You're unsubscribed."*
7. **Verify the effect, not just the page:**
   - The lead's `tags` now include `email-unsubscribed`, **exactly once**.
   - A `LeadActivity` exists with title `Email unsubscribe`.
   - **Click the same link again:** the page is identical, the tag is still present
     exactly once, and **no second activity row is created** (idempotent).
8. **Deactivate.** §5 — disarm the cron, then set the sequence `isActive = false`.
9. **Re-run §1.4** and confirm the queue is quiet again.

**If any step fails, go straight to §5 and leave it disarmed.** A failed live test is a
reason to stop, never a reason to retry harder — there are no retry loops by design
(06-bans.md #9).

---

## 3. Activation steps (only after §1 is clean and §2 has passed once)

### 3.1 Turn the sequence on

```sql
UPDATE "AutomationSequences"
SET "isActive" = true
WHERE name = 'speed_to_lead';
```

Verify:

```sql
SELECT name, "isActive" FROM "AutomationSequences" WHERE "triggerEvent" = 'lead_captured';
```

- `speed_to_lead` → `true`
- `lead_nurture` → **`false`** (see §4 — this is not optional)

> **Before this UPDATE, verify `lead_nurture` is inactive.** Both sequences trigger on
> `lead_captured`. A lead enrolled in both receives **doubled messaging** — the two
> sequences use different spacing (0/2/5 vs 0/3/7) so the duplication looks intentional
> in the logs, which makes it harder to notice. 06-bans.md #11.

### 3.2 Arm the engine

In Render → Environment, set:

```
SWAN_AUTOMATION_CRON_ENABLED=true
```

Exactly the lowercase literal `true`. `True`, `TRUE`, `1`, and `yes` all leave it
**disarmed** (`automationArmState.mjs:14`).

Redeploy. Then confirm:

```bash
curl -s https://<host>/api/automation/status -H "Authorization: Bearer <ADMIN_JWT>" | jq
# expect: { "success": true, "data": { "armed": true } }
```

### 3.3 Confirm the scheduler actually started

Check the deploy logs for the inverse of the disarmed line:

```
[AutomationCron] Disabled - set SWAN_AUTOMATION_CRON_ENABLED=true ...
```

If that line is **absent**, the cron started. If it is **present**, it did not — the env
var did not take effect.

---

## 4. The double-messaging rule (permanent)

**`speed_to_lead` and `lead_nurture` may never be armed at the same time.** Both fire on
`lead_captured`; a lead enrolled in both gets every message twice.

- Activating `speed_to_lead` **requires** verifying `lead_nurture.isActive = false`.
- The reverse is equally true, **forever** — this is not a one-time migration note.
- Check before every activation (§1.1 covers it) and after every rollback.

---

## 5. Kill switch — three ways, fastest first

| # | Action | Effect | Use when |
|---|---|---|---|
| 1 | **Sequence off** — `UPDATE "AutomationSequences" SET "isActive" = false WHERE name = 'speed_to_lead';` | New leads stop being enrolled. **Already-queued rows still send.** | You want to stop *growth* of the queue. |
| 2 | **Cron off** — set `SWAN_AUTOMATION_CRON_ENABLED` to anything other than `true`, redeploy | **Zero delivery**, immediately and completely. The gate is at the send chokepoint, so it also blocks the admin `POST /api/automation/process` route. | **This is the real stop button.** Use it first in an incident. |
| 3 | **Revoke the SendGrid key** in SendGrid → Settings → API Keys | Transport fails; rows land `failed` with `sendgrid_error:`. | A compromised key, or you want a hard external stop. |

**Recommended incident order: 2 → 1 → 3.** Disarming the cron is instant, reversible, and
stops all delivery without touching data. Revoking the key is the blunt instrument and
requires a new key to resume.

> **Do not** rely on deleting pending `automation_logs` rows as a kill switch. That
> destroys the audit trail and the frequency-cap accounting.

---

## 6. Monitoring — what to watch, and where

**The admin card** (Marketing → Leads, `SpeedToLeadStatusCard`): the ARMED/DISARMED badge,
Pending / Sent (7d) / Failed counts, and the three most recent email rows with **masked**
recipients (`j***@gmail.com` — full addresses never render in the card).

**The API:**

```bash
# Am I armed?
curl -s https://<host>/api/automation/status -H "Authorization: Bearer <ADMIN_JWT>" | jq

# What is queued and what would happen?
curl -s https://<host>/api/automation/preview -H "Authorization: Bearer <ADMIN_JWT>" | jq
```

**The database, for failures by reason:**

```sql
SELECT error, COUNT(*)
FROM "AutomationLogs"
WHERE status = 'failed' AND channel = 'email'
GROUP BY error ORDER BY 2 DESC;
```

Read the reason strings literally:

| `error` | Meaning | Owner action |
|---|---|---|
| `missing_recipient` | Lead has no usable email address | Data-quality issue, not a bug. Worth a count, not a page. |
| `lead_email_unsubscribed` | Recipient opted out — **working as designed** | None. This is consent being honoured. |
| `unknown_template:<name>` | A step names a template that does not exist | **Stop.** Code/config defect. |
| `sendgrid_not_configured` | Key or from-address missing | Re-check §1.3. |
| `sendgrid_error:<msg>` | Transport rejected the send | Read `<msg>`. `Unauthorized` = bad/revoked key. |
| `channel_not_implemented` | §0's blocker | **Stop.** Do not arm until resolved. |

**Watch for:** a `sent` count that stops rising while `pending` climbs (the cron is not
running — see §3.3), and any appearance of `unknown_template:` or
`channel_not_implemented` after a deploy.

---

## 7. Rollback

**Fast (delivery stops, data preserved):**

1. §5 method 2 — disarm the cron. Delivery stops immediately.
2. §5 method 1 — set `speed_to_lead.isActive = false`.
3. Leave the `automation_logs` rows alone. They are the audit trail; `cancelled` and
   `failed` rows are evidence, not garbage.

**Full (back to pre-activation state):**

1. Both steps above.
2. Confirm `automation_logs` contains no `pending` email rows for `speed_to_lead`.
3. Confirm `lead_nurture` is still `isActive = false` (§4).
4. **No code revert is needed.** The sequence ships seeded `isActive: false`, so an
   unmodified deploy plus the two toggles above is the pre-activation state. There is no
   migration to undo — none was ever created (06-bans.md #1).

**If you rolled back because of `channel_not_implemented`:** do not re-arm after a
redeploy. That reason means §0's blocker is still open; re-arming reproduces the failure.

---

## 8. Standing owner actions (not builder work)

- **Branch merge to main:** Sean-gated one-push (joins the queue with
  `claude/contact-cta-type`).
- **Sequence activation + env flips:** Sean-only, via this runbook.
- **SendGrid domain authentication (SPF + DKIM) and DMARC:** still pending in Namecheap.
  This is **deliverability hardening, not a send blocker** — sequence it, do not gate the
  launch on it.
