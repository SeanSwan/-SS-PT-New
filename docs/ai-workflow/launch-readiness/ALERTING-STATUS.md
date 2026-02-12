# Alerting Status — Launch Week

**Assessed:** 2026-02-12
**Last updated:** 2026-02-12

---

## Alerting Enablement Checklist

These must be **enabled before high traffic**, not just recommended.

| # | Alert Channel | Status | Owner Action |
|---|---------------|--------|--------------|
| 1 | Render notifications (deploy fail + unhealthy) | **ACTION REQUIRED** | Render Dashboard > Settings > Notifications > "All notifications" |
| 2 | External uptime monitor on `/api/health` | **ACTION REQUIRED** | Sign up UptimeRobot free tier, add HTTPS monitor for `https://sswanstudios.com/api/health`, 5-min interval |
| 3 | Sentry error tracking | Deferred (post-launch) | `npm install @sentry/node`, init in server.mjs |
| 4 | Payment failure email alert | Deferred (post-launch) | SendGrid alert on `payment_intent.payment_failed` |

**Rule:** Items 1 and 2 must show **ENABLED** before opening traffic. Items 3-4 are post-launch P2.

When you enable each one, update the Status column to **ENABLED (date)**.

---

## What Exists Now

### Application-Level Logging (file-only)
- **Winston logger** — writes to `error.log` + `combined.log` on Render disk
- **P0 monitoring middleware** — detects SQL injection, XSS, suspicious patterns, slow responses (>5s), memory alerts (>50MB)
- **Express error middleware** — catches all 4xx/5xx with stack sanitization in production
- **Stripe webhook logging** — logs payment events, signature failures, cart mismatches
- **Process handlers** — `unhandledRejection` + `uncaughtException` logged

### Platform-Level (Render)
- **Deploy notifications** — email/Slack for build failures, deploy failures, service unhealthy
- **Health check** — `/api/health` endpoint exists, Render can poll it for service health
- **Log stream** — Render dashboard shows live logs

### Real-Time (internal)
- **Socket.IO notifications** — purchase alerts to admin dashboard
- **SendGrid** — configured for transactional email (not used for alerting yet)

---

## Remaining Gaps (no external alerting beyond Render)

| Gap | Impact | Fix |
|-----|--------|-----|
| No APM (Sentry/Datadog) | 500 errors only visible in log files | Sentry free tier — 15 min setup (post-launch) |
| No Slack webhook for errors | Team not notified of critical failures | Custom Winston transport — 15 min (post-launch) |
| No payment failure alerts | Failed purchases unknown until customer reports | SendGrid alert in stripeWebhook.mjs — 30 min (post-launch) |
| No 5xx threshold alerting | Error spikes invisible | Sentry + Render health check (post-launch) |

---

## How to Enable (step-by-step)

### 1. Render Notifications (0 min — toggle in dashboard)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your service > **Settings** (or **Integrations > Notifications** at workspace level)
3. Set notification level to **"All notifications"** (success + failure)
4. Optionally connect a Slack workspace for real-time alerts
5. This covers: deploy failures, service unhealthy/healthy transitions

### 2. External Uptime Monitor (5 min — free tier)
1. Sign up at [UptimeRobot](https://uptimerobot.com) (free, no credit card)
2. Add new monitor: **HTTPS**, URL: `https://sswanstudios.com/api/health`
3. Monitoring interval: **5 minutes**
4. Alert contacts: your email (add SMS if available)
5. This covers: full outages, health endpoint failures, SSL expiry

---

## Launch Week Monitoring Protocol

Until Sentry is added, combine automated alerts (Render + UptimeRobot) with manual checks:

1. **Render notifications** — immediate alert on deploy failure or service crash
2. **UptimeRobot** — immediate alert on downtime or health check failure
3. **Post-deploy smoke loop** — run the 5-check verification after every deploy (see POST-DEPLOY-SMOKE-RESULTS.md)
4. **Periodic log spot-check** — Render Dashboard > Logs > filter for "error" or "500" (1-2x daily during launch week)
5. **Admin dashboard** — check purchase notifications, session counts, user activity

---

*Post-launch: implement Sentry (P2) + payment failure email alerts (P2).*
