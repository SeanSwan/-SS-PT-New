# Marketing Brain — Manual Finalization Checklist (2026-07-10)

**What this is:** the list of things ONLY Sean can finish (external accounts, DNS, arming, env,
review/push). Everything buildable in code was built; this is the "come back and flip the switches"
list. Ordered by the locked sequence. Nothing here is armed or live yet — the code is safe/off.

Plan: `docs/ai-workflow/brainstorms/marketing-brain-fusion-plan-2026-07-10.md` ·
Epic 1 code: branch `feat/marketing-speed-to-lead` (worktree `c:/tmp/ss-marketing-epic1`, commit `998926038`, **NOT pushed**).

---

## ✅ Already done (this session)
- SendGrid key ROTATED → `SwanStudiosMainMail` (Mail-Send-only). SPF ✅ + DKIM ✅ verified.
- Epic 1 **email nurture channel** built + tested (58/58 automation tests pass), committed locally, **not armed**.

## ⏳ MANUAL — DNS / deliverability (gates arming)
1. **DMARC record (deferred at your request — you had Namecheap setup to do first).**
   Namecheap → Domain List → Manage `sswanstudios.com` → Advanced DNS → Add New Record:
   `TXT` · Host `_dmarc` · Value `v=DMARC1; p=none; rua=mailto:dmarc@sswanstudios.com; fo=1` · TTL Automatic.
   Then tell Claude "done" → auto-verify propagation.
2. **Confirm `SENDGRID_FROM_EMAIL`** is set on Render + `backend/.env` to a verified `@sswanstudios.com`
   sender (the email sender fails if the from-address is missing/invalid). Confirm SendGrid dashboard →
   Settings → Sender Authentication shows the domain **verified**.
3. **Inbox deliverability test** (the real proof): submit the live contact form → confirm the email lands
   in **Gmail/Outlook/iCloud inbox (not spam)** → open "Show original" → **SPF/DKIM/DMARC = pass**.

## ⏳ MANUAL — env vars for the email nurture channel (set on Render + backend/.env before arming)
| Var | Purpose | Notes |
|---|---|---|
| `PUBLIC_APP_URL` (or `FRONTEND_URL`) | base URL for consult + unsubscribe links in emails | e.g. `https://sswanstudios.com` |
| `SWAN_CONSULT_URL` | the "book a free consult" CTA target | falls back to `{base}/contact` if unset |
| `SWAN_BUSINESS_ADDRESS` | CAN-SPAM-required physical postal address in every email footer | **required** — email footer shows a placeholder until set |
| `SWAN_UNSUBSCRIBE_SECRET` | HMAC secret signing per-lead unsubscribe tokens | falls back to `JWT_SECRET` if unset |
| `OWNER_EMAIL` / `OWNER_WIFE_EMAIL` | new-lead owner alert recipients | already used by contactRoutes |

> Safety: if `PUBLIC_APP_URL` + a signing secret aren't set, the nurture email **fails closed** (won't send
> without a working unsubscribe link). So nothing sends improperly — but nothing sends at all until these are set.

## ⏳ CODE follow-up BEFORE arming (next slice — Claude can build on your go)
4. **Lead unsubscribe endpoint** — a `GET /unsubscribe?lead=&token=` route that calls
   `verifyUnsubscribeToken(leadId, token)` (already built in `emailTemplateService.mjs`) and, on success,
   adds the lead to marketing suppression. The nurture emails link to it; it must exist + honor opt-outs
   before arming (CAN-SPAM). **Not yet built.**
5. **Consult-request CTA surface** — Fable's "book a free consult → creates `Lead(status:'scheduled')` +
   a consult *request* pending your one-tap confirm" (NOT an auto-`Session`, to avoid double-booking).
   Backend endpoint + a simple CTA. **Not yet built** (also touches the marketing UI = competing surface
   with the `hr007` branch — reconcile carefully).

## ⏳ MANUAL — ARM the drip (LAST, only after 1-5 above pass)
6. Flip the seeded `lead_nurture` AutomationSequence row **`isActive = true`** (the DEFAULT is email
   channel now, but the existing prod row was seeded SMS+inactive — update it to the email steps or
   re-seed). Confirm via the PII-safe dry-run (`previewScheduledMessages`) FIRST.
7. Set **`SWAN_AUTOMATION_CRON_ENABLED = true`** on Render. Confirm SMS stays gated on
   `smsConsentStatus='opted_in'` (`SELECT count(*) FROM leads GROUP BY smsConsentStatus` first).
8. **Epic 1a — referral seeding (zero code):** personally ask your ~6 clients + 10-20 warm contacts for a
   referral into the contact form, the week you arm — so the funnel has real traffic (Fable's key catch).

## ⏳ MANUAL — review / merge decisions
9. **Review + push the `feat/marketing-speed-to-lead` branch** (Epic 1 email channel). It's committed
   locally only. Recommend a hostile review (Codex/triangle) before it lands on main.
10. **Custom-deals `hr007` branch** (171 behind main, entangled with the marketing UI) — pick the merge
    approach and reconcile vs main's marketing surface. See the plan doc §8.
11. **835-dirty-tree cleanup** — see `DIRTY-TREE-HYGIENE-REPORT-2026-07-10.md`: it's a big WIP to PRESERVE
    (Enterprise Comms + Notification Center), not purge. Snapshot to a salvage branch FIRST, then purge only
    the ~32 named scratch files, then replay onto fresh main. **No destructive action taken; awaits your approval.**

---
## UPDATE 2026-07-10 (end of autonomous build+review session)

**Epic 1 is BUILT + hostile-reviewed** on branch `feat/marketing-speed-to-lead` (worktree `c:/tmp/ss-marketing-epic1`),
8 commits, **NOT pushed**, **101/101 tests pass**. Three slices:
1. **Email nurture channel** (`emailTemplateService.mjs` + `automationService`/`automationDecisionService`) — the drip can now reach email-only leads. Still `isActive:false` (arming is yours).
2. **Public lead unsubscribe** (`marketingUnsubscribeRoutes.mjs`, `/api/marketing/unsubscribe`) — CAN-SPAM one-click (GET-confirm / POST-act, RFC-8058 header).
3. **Public consult-request** (`consultRequestRoutes.mjs`, `/api/consult-request`) — book-a-free-consult → `Lead(scheduled)` + owner alert (NEW leads only), no auto-Session.

**5 hostile-review rounds** (via workflow) found + fixed **42 issues** — incl. 1 critical (email nurture was universally
cancelled by an SMS-centric consent gate), 3 high (IDOR on consult, HTML injection in email, broken owner-alert), and
a one-click-unsubscribe regression. Converged at 0 critical / 0 high (rounds 2-5).

**Updated env vars to set before arming** (superseded/added to the table above):
`PUBLIC_APP_URL`/`API_URL` (**must be https://** — unsubscribe URL is https-only), `SWAN_UNSUBSCRIBE_SECRET`
(dedicated — NOT JWT_SECRET), `SWAN_BUSINESS_ADDRESS` (**required — email fails closed without it**),
`SWAN_CONSULT_URL`, `SWAN_REPLY_TO` (monitored inbox for nurture replies), `SENDGRID_FROM_EMAIL`,
`OWNER_EMAIL`/`OWNER_WIFE_EMAIL`.

**⏳ DEFERRED — follow-up HARDENING slice (non-blocking, no crit/high; from the review rounds):**
- Shared rate-limiter store (Redis) + Map eviction — `authMiddleware.mjs` rateLimiter is in-memory/per-process (whole-app infra).
- Global new-lead owner-notify cap / CAPTCHA (email-rotation flood defense) beyond the per-IP + created-only gate.
- SMS transient-failure retry (email already defers; extend to `twilioService`).
- Recipient-PII redaction in `sendgridService` success log.
- Unsubscribe POST replay short-circuit (already-unsubscribed) + `List-Unsubscribe` mailto: alternate.
- Recipient-local timezone for quiet-hours (currently server UTC; affects only Users with quietHours on SMS).
- Send idempotency key (at-least-once double-send window if two saves fail).
- `automationService.mjs` >300 lines — extract the send-dispatch (Rule 4; pre-existing + this branch).

**Bottom line:** the email drip + unsubscribe + consult are built, tested, hostile-reviewed, and OFF. To turn on:
add DMARC → prove inbox delivery → set the env vars above → flip `lead_nurture` `isActive:true` + `SWAN_AUTOMATION_CRON_ENABLED` → seed referrals. Review/push the branch when ready.
