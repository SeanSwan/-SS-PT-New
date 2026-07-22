---
decision: Activation runbook for the speed-to-lead instant reply (SWA-40 trial 2, shipped dark). Sequence = confirm SendGrid domain auth → DMARC (SWA-13) → flip SPEED_TO_LEAD_REPLY_ENABLED → live test. The flag is independent of DMARC; DMARC is inbox-placement hardening, not a hard blocker.
status: open
supersedes: none
---

# Speed-to-Lead Activation Runbook

**What this turns on:** the moment a prospect submits a consult request, contact form, or email capture on sswanstudios.com, they instantly receive a branded SwanStudios reply ("Got your message — here's what happens next" + book-a-consult button). Shipped **dark** on main (`a63f1f567`); this runbook flips it live. **Owner alerts already work** (they've been sending via SendGrid), so the sending stack is proven — only the flag and deliverability polish remain.

Everything Sean does here is in **Render** (env vars) and **Namecheap** (one DNS record). No code changes.

---

## Step 0 — Pre-flight (2 min, no changes)
1. **Confirm the sender stack is already live.** You already receive owner-alert emails when someone books a consult — that proves `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` are set and working. Nothing to do if those arrive.
2. **Self-check via the readiness cockpit** (admin-authed): `GET https://ss-pt-new.onrender.com/api/admin/marketing-readiness`. Look for `email.sendgridConfigured: true`. If `false`, set `SENDGRID_API_KEY` before going further.

## Step 1 — Deliverability: land in the inbox, not spam (do BEFORE the flip, ideally)
The flag works without this — but a cold from-address without alignment risks the spam folder. Three layers, weakest-first:
1. **SendGrid domain authentication (SPF + DKIM).** In SendGrid → Settings → **Sender Authentication**, confirm `sswanstudios.com` shows **Verified** (CNAME records in Namecheap). If owner alerts land in inboxes today, this is likely already done. This is the single biggest inbox-placement lever — more than DMARC.
2. **`SENDGRID_FROM_EMAIL` must be on the authenticated domain** (e.g. `hello@sswanstudios.com`, **not** a yahoo/gmail address). A from-address off the verified domain fails alignment and drops to spam.
3. **DMARC record (SWA-13)** — add ONE DNS record in Namecheap → Advanced DNS:
   - **Type:** `TXT`
   - **Host:** `_dmarc`
   - **Value:** `v=DMARC1; p=none; rua=mailto:<your-dmarc-reports-inbox>; fo=1; pct=100`
   - **Start with `p=none`** (monitor-only — reports where mail is failing, rejects nothing). After ~2–4 weeks of clean aggregate reports, tighten to `p=quarantine`, then `p=reject`. Never start at `p=reject` — you can bounce your own mail.
   - Use a dedicated inbox for `rua=` (the reports are noisy). Don't put a personal address in the record if you can avoid it.

## Step 2 — The flip (1 min)
In **Render → the backend service → Environment**, add/confirm:

| Var | Required? | Value | Effect if unset |
|---|---|---|---|
| `SPEED_TO_LEAD_REPLY_ENABLED` | **YES — the switch** | `true` | Feature stays dark (fail-closed) |
| `SENDGRID_API_KEY` | YES (already set) | your key | Nothing sends |
| `SENDGRID_FROM_EMAIL` | YES (already set) | `hello@sswanstudios.com` | Send fails validation |
| `SWAN_BUSINESS_ADDRESS` | Recommended | your business postal address | Footer shows a placeholder (still sends) |
| `SWAN_CONSULT_URL` | Optional | e.g. `https://sswanstudios.com/contact` | Falls back to `/contact` on the app domain |

Save → Render redeploys automatically (~2–5 min). **`SPEED_TO_LEAD_REPLY_ENABLED=true` is the only truly new one.**

## Step 3 — Live test (3 min)
1. After the redeploy, open sswanstudios.com and submit a **real consult request to an inbox you control** (not your owner address — use a personal test address so you see the *lead's* view).
2. Confirm within seconds you receive the **branded "Got your message" email** — check the from-address, the book-a-consult button, and that it did **not** land in spam.
3. Confirm you (owner) still got the internal alert, and the lead appears in the admin CRM. (Both were already working; this verifies the new send didn't disturb them.)
4. If it landed in spam → revisit Step 1 (domain auth is the usual cause), not the flag.

## Rollback (instant)
Set `SPEED_TO_LEAD_REPLY_ENABLED=false` (or delete it) in Render → save. The instant reply stops immediately; owner alerts and CRM capture are unaffected (separate paths). No code revert, no redeploy of code — just the env flip.

## Known follow-ups (not blockers)
- `marketingReadinessService` does not yet report `SPEED_TO_LEAD_REPLY_ENABLED` — the readiness cockpit won't show this feature's on/off state. Small addition; filed separately. (`backend/services/marketingReadinessService.mjs`)
- The nurture drip (day 1/3/7 follow-ups) is a *separate* switch (`SWAN_AUTOMATION_CRON_ENABLED` + arming `lead_nurture`) and is intentionally still off — this runbook is only the instant first-touch reply.

## Provenance
Speed-to-lead built + shipped dark 2026-07-22 (SWA-40 gate trial 2, main `a63f1f567`); env chain verified against shipped source (`speedToLeadService.mjs`, `emailTemplateService.renderInstantReplyEmail`, `sendgridService.mjs`). DMARC record per SWA-13.
