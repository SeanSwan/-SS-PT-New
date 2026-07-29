# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/ss-launch-audit-20260727/docs/ai-workflow/AI-HANDOFF/OPEN-SLICES-PACKET-2026-07-29.md
**Seed:** (none)
**Tokens:** 1742 in / 3560 out | **Cost:** ~$0.0586 | **Wall:** 73.7s

---

## 1. Sequencing — six slices ranked by harm reduction per hour

1. **Observability (2.1).** Not close. A silent 500 on a client-facing route is invisible churn — the client just leaves and Sean finds out from a cancellation, if ever. The fix is hours, not days. Do it first, today.
2. **Error/empty/loading states (2.4), scoped hard.** Every signup's first session is an empty account. But don't "audit the app" — audit the day-one path only: client home, schedule/booking, session credits, payment state, messaging. That's a defined list, maybe 15 screens. The rest of the app waits.
3. **Mobile (2.5), scoped to three flows.** Trainer checks roster, trainer logs/adjusts a session, client books from a phone. One iOS Safari pass, one Android Chrome pass, fix what's broken. A full device matrix is a project; this is an afternoon.
4. **Docs-truth (2.3), security/finance paths only.** The demonstrated cost is wasted fix cycles by parallel agents. Sweep comments on auth, payments, webhooks, permissions, throttling — the files agents touch most. Repo-wide sweep is not week-one work.
5. **Orphans (2.2).** Zero client harm. The only urgent piece is Sean's ruling on `NASMAdminDashboard.tsx`, which is a decision, not engineering — get it in one sitting, then shelve the rest.
6. **House-style compliance (2.6).** Zero harm reduction. Defer entirely; enforce the cap only on files touched by other work.

One correction to your own framing: **the backup/restore drill in 2.7 outranks everything except observability.** An unverified restore is not a backup, and "tooling shipped, never executed against production" means you currently have no recovery story in week one of a paid product. It's owner-gated and a few hours. Do it this week, before states and mobile. Stripe key rotation is also this-week: the keys were exposed to repo-root scripts, so rotate — that's a 30-minute task with a known procedure, not a slice.

## 2. Observability shape — SDK, not bespoke aggregation

Install the SDK (Sentry free tier is fine at this volume). Here's the decisive reason: a homegrown 5xx counter tells you *that* something is broken at 6am; it doesn't tell you *what*. You'd still be SSHing into Render logs to grep stack traces while a client waits. The SDK gives you the grouped exception, the route, the release, and the stack in the alert itself. The counter is a pager with no diagnosis attached.

Concretely:
- Server: Express error middleware before your global handler, `beforeSend` hook that strips request bodies, headers beyond a whitelist, and any field matching email/name/phone patterns. **This PII scrubbing config is the only real work, and it's non-negotiable given minors' data — write a test that feeds a PII-laden fake error through `beforeSend` and asserts the payload is clean.**
- Frontend: React ErrorBoundary + SDK, same scrubbing, so render crashes (which your server-side 5xx counter would never see at all) are covered.
- Alerting: Sentry's native new-issue and spike alerts to email/phone. Do **not** build dashboards, do **not** extend `alertEngine` beyond maybe a one-line 5xx counter increment in the error handler if you want a Render-side signal. Bespoke aggregation is the over-engineered path here, not the SDK.

Add one thing neither option covers: an **external uptime probe** (UptimeRobot free tier hitting a health endpoint every 5 minutes). Internal alerting cannot detect a dead process, a failed deploy, or a Render outage. This is 20 minutes and catches the worst-case failure class.

## 3. The 236 orphans — split the ruling, timebox the rest

Inventory-then-owner-ruling is right for exactly one class and wrong for the others.

- **Superseded-predecessor and genuinely-dead: delete now, no ruling needed.** Git history *is* the archive. "Park/archive" as a distinct step is a fiction that produces a second graveyard directory. The inventory document is the record; deletion is one commit and fully reversible. With 5+ agents reading this repo, 41,600 lines of plausible-looking dead code is an active tax on every future task — the trainerPermissionMiddleware episode proved agents will burn cycles reverse-engineering junk.
- **Built-but-unwired: Sean rules, timeboxed to 14 days.** The `NASMAdminDashboard` precedent justifies the caution — but caution has a deadline. Anything unruled after 14 days gets tagged in a commit (`git tag orphans-pre-purge`) and deleted from main. "Undecided" cannot be a permanent state; it's the most expensive option because it keeps the misleading code *and* spends the inventory effort.
- **Ambiguous: fold into the 14-day bucket.** Ambiguity is resolved by the owner or by deletion, not by a third inventory pass.

Sequencing note: none of this happens before observability, the restore drill, and the day-one states pass. Dead code has never churned a client.

## 4. Missing entirely

- **Account deletion and data export.** You hold minors' data and PII. There is no slice anywhere — shipped or open — for a parent requesting deletion or export of their kid's data. This is legal exposure, not polish, and retrofitting it after you've accumulated clients is much worse than building the admin-gated path now. Minimum: an owner-triggered deletion that cascades and is audited, and a documented export procedure.
- **Auth-endpoint throttling.** You throttled messaging sends and left login, signup, and password reset unthrottled (none of the shipped items mention it). Credential stuffing against a trainer platform with payment data is a week-one-relevant attack, and the fix is the same throttle primitive you already built.
- **Transactional email failure visibility.** Password reset is verified strong *as code* — but if the email silently bounces, the client is locked out and Sean hears about it via churn. Log send failures with alerting, or wire the provider's webhook. This pairs naturally with the observability slice.
- **A client-facing problem-report channel.** One "Report a problem" link that emails Sean. Without it your only bug telemetry from real users is the SDK, which can't catch "the button works but the behavior is wrong."
- **Deploy rollback story.** Batch-push cadence with one deploy verification is fine, but what's the move when a migration breaks prod at 7pm? Render rollback plus a rule of "no irreversible migrations without a tested down path" is a policy, not code — write it down before you need it.

## 5. Over-engineering for week one

- **2.6 house-style compliance, in full.** Splitting `AiConsentScreen.tsx` (770 lines) into compliant files is a pure regression-risk exercise with zero client benefit. Enforce the 300-line cap only on new files and files already being edited.
- **Repo-wide docs-truth sweep.** Narrow to security/finance/permissions comments as above. The rest is a vanity sweep this week.
- **The full mobile matrix.** Three flows, two browsers, one afternoon. A device matrix for a handful of clients is theater.
- **Bespoke 5xx aggregation/alerting infrastructure** if you install the SDK — pick one. Building both is duplicate paging.
- **Any deletion ruling on the ambiguous orphan class beyond the 14-day timebox mechanism.** A second classification pass is process for its own sake.
- **The $1 live charge→webhook→refund proof** can wait a week. The webhooks are signature-verified and paid-only-fulfilling with idempotent credit grants; the marginal information from a live $1 is small relative to the restore drill, which proves something you currently do not know.
