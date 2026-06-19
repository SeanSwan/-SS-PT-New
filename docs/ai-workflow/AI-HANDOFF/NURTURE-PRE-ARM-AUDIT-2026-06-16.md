# Nurture Pre-Arm Audit + Arm-Readiness Gate — 2026-06-16

**Status:** pre-arm safety layer built (slices 1–5 shipped to `main`); **NOT yet safe to arm.**
**Verdict (adversarial Workflow audit, 6 finder lenses + per-finding verify + synthesis):** `arm-with-fixes`.
**Cron:** `SWAN_AUTOMATION_CRON_ENABLED` still **default-OFF**. `lead_nurture` sequence seeded **isActive:false**.

This doc is the load-bearing artifact for the decision to arm the outbound automation engine.
Re-read it before flipping `SWAN_AUTOMATION_CRON_ENABLED=true` or before activating `lead_nurture`.

## 2026-06-18 Codex Supersession Check

Current code has closed the original BLOCKER 2 and the mechanical pieces of BLOCKER 3:
- BLOCKER 2 is now code-closed by `AutomationLog.status='processing'`, an atomic `pending|stale-processing -> processing` claim before send, and frequency-cap counting of in-flight `processing` peers.
- BLOCKER 3 phone suppression is now code-closed by `sms_suppressions`, `smsWebhookRoutes` mounted at `/api/sms/webhooks/inbound`, and `resolveMarketingSuppression({ email, phone, leadId })`.
- BLOCKER 3 positive lead SMS consent is now fail-closed by `Lead.smsConsentStatus/smsConsentAt/smsOptOutAt`; a lead SMS send is suppressed unless the lead is explicitly `opted_in` with a timestamp.
- Raw admin SMS sends are also gated while disarmed and require suppression identity, suppression verification, and the manual frequency cap before Twilio.

Live activation gate remains: do not activate `lead_nurture` or any phone-capturing nurture source until the source explicitly captures SMS consent into the Lead fields, `TWILIO_WEBHOOK_PUBLIC_BASE_URL` is correct in Render so STOP signatures validate, and an email-channel sender exists for email-only prospects. The seeded `lead_nurture` sequence must stay `isActive:false` until those operator/product gates are satisfied.

---

## What shipped (slices 1–5)
| Slice | Commit | Summary |
|---|---|---|
| 1 | `d82d83e6b` | `leadId` on `automation_logs` + lead recipient in `triggerSequence` |
| 2 | `3c97b1b7e` | Unified marketing-suppression (fail-closed) + lead-aware recipient resolution |
| 3 | `93d3f643f` | Rolling per-recipient frequency cap (defer, anti-spam) |
| 4 | `44c37d47f` | Lead-capture → nurture enrollment (best-effort) + idempotent `ensureDefaultSequences`; `lead_nurture` seeded OFF |
| 5 | `96e9724da` | **Audit fixes:** kill-switch gate at the send chokepoint (`automationArmState.mjs`) + XOR soft-delete + env-parse guard + recovery-save guard + scheduler `.catch()` |

Tests: 92/92 automation+lead pass. `node --check` clean. Each commit secret-scanned + Rule-42 audited.

## Verified SAFE (audit, evidence-backed)
- `evaluateScheduledMessage` gate order is correct: channel → suppression(cancel/fail-closed) → sms_disabled → quiet_hours(defer) → no_phone(fail) → frequency_capped(defer) → send.
- Suppression **fails closed**: an unverifiable lookup → `checked:false` → `suppression_unverified` fail. A DB/model error does NOT send.
- Suppression query keys on the real column + literal (`Subscriber.status='unsubscribed'`).
- **No schema drift** on the armed path: `AutomationLog` is camelCase (no `underscored`/`field:`); `leadId` migration matches; `Lead.phone/email`, `User.*`, `Subscriber.*` all resolve to real columns.
- `previewScheduledMessages` runs the SAME decision logic with **no sends / no mutation** and is PII-safe.
- Lead-nurture enrollment is genuinely best-effort (swallows errors, fired after the lead persists) — cannot break/mask capture.
- **Slice-5 fix:** the send chokepoint now no-ops when disarmed (`processScheduledMessages` → `{skipped:'disarmed'}`), so `POST /api/automation/process` can no longer flush the live queue while disarmed.

---

## BLOCKING before arming the cron (for the ACTIVE `new_client_*` sequences)

### ✅ BLOCKER 1 — FIXED in slice 5 (`96e9724da`)
Kill-switch only gated the scheduler, not the sender; `POST /api/automation/process` flushed the live queue with no arm check. **Fixed:** `automationArmState.isAutomationArmed()` now gates `processScheduledMessages` itself. Regression tests added.

### ⛔ BLOCKER 2 — Frequency-cap TOCTOU (NOT fixed; needs a migration)
**Problem:** `resolveFrequencyCap` counts only `status='sent'`; a log stays `pending` through the actual send, with no atomic claim / row lock / transaction. Two concurrent runners (cron tick + admin `/process`, or multiple Render instances) both read the same stale count and both send → exceed the per-recipient cap; the same `pending` log can be double-sent. The in-memory `dripTickInFlight` guard only covers the cron's own re-entry, not cross-caller/cross-instance overlap.
**Fix (next slice):**
1. Add `'processing'` to the `AutomationLog.status` ENUM (model + Postgres `ALTER TYPE ... ADD VALUE` migration — test carefully).
2. Atomically claim each log before sending: `AutomationLog.update({status:'processing'}, {where:{id, status:'pending'}})` — proceed only if exactly 1 row claimed; flip to sent/failed/cancelled afterward.
3. Count `status IN ('sent','processing')` in `resolveFrequencyCap`.
4. (Or) serialize via a pg advisory lock / route the admin POST through `runAutomationTick` to share the guard.
5. Regression test: two concurrent runners do not exceed the cap and do not double-send one log.
**Note:** slice-5's arm gate makes `/process` a no-op while disarmed, so this is only exploitable once armed — but it MUST be fixed before arming.

### ⛔ BLOCKER 3 — SMS consent infrastructure (gates ACTIVATING `lead_nurture`, not the active client sequences)
The active `new_client_*` sequences target Users (existing clients with `notificationPreferences.sms` + a relationship) — acceptable. The gaps below are about **leads** via `lead_nurture` (currently OFF). Close ALL before flipping `lead_nurture` isActive:true or wiring any phone-capturing nurture source:
1. **Phone-keyed suppression** — `resolveMarketingSuppression({email, phone})` with a fail-closed phone do-not-contact lookup. Today suppression is email-only; a phone-only lead has zero consent representation.
2. **Inbound STOP webhook** — none exists (only Stripe + PLAUD webhooks are mounted). A recipient who replies STOP is carrier-blocked but the log keeps re-attempting. Add a Twilio inbound route → record STOP → suppressed-by-phone.
3. **Positive SMS consent record** — no `smsConsent`/`marketingConsent` field on Lead/User/Subscriber. Capture consent (timestamp + source) at lead creation; gate the SMS branch fail-closed on it. (Email-newsletter unsubscribe is NOT SMS consent.)
4. **Per-lead opt-out flag** — leads get `notificationPreferences:null` so the `sms_disabled` cancel gate never fires for them; surface a real per-Lead opt-out through `resolveAutomationTarget`.
**Latency note:** these are latent today — `lead_nurture` is OFF, and the only nurture-enrolling capture paths (contact/newsletter) create **phone-less** leads that die on the `no_phone` gate. But they are the exact switches an owner flips to "turn on lead nurture."

> **Also:** lead nurture is **SMS-only**, and contact/newsletter prospects are **email-only** → an **email-channel sender** is the real unlock for lead nurture. Until it exists, `lead_nurture` delivers to nobody even if armed.

---

## Done in slice 5 (audit "recommended", non-blocking)
- user-XOR-lead soft-delete dual-stamp → keyed off resolved user.
- frequency-cap env parse → `Number.isFinite` + `>=0` (cap=0 honored).
- per-log recovery-save wrapped in try/catch.
- scheduler fire-and-forget ticks get terminal `.catch()`.

## Backlog (info-level, non-blocking)
- Register the `AutomationLog`→`Lead` `as:'lead'` association inline in `associations.mjs` (declared in model, never wired — a future eager-load would throw).
- Align the `leadId` index name between model (auto) and migration (`_idx`).

---

## Arm-readiness checklist
- [x] BLOCKER 1 — sender gated on the arm switch.
- [ ] BLOCKER 2 — frequency-cap TOCTOU atomic claim **(before arming the cron at all)**.
- [ ] BLOCKER 3 — SMS consent infra **(before activating `lead_nurture` / any phone-capturing nurture source)**.
- [ ] Email-channel sender **(before `lead_nurture` can deliver to email-only prospects)**.
- [ ] One manual armed test send to a known-good owner number, verified received.

**Arming the cron for the active client sequences needs BLOCKER 2.** **Activating lead nurture additionally needs BLOCKER 3 + the email channel.** Owner decision (Sean) + content review still required per prior consensus.
