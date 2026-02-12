# Alerting Status — Launch Week

**Assessed:** 2026-02-12

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

## What's Missing (no external alerting)

| Gap | Impact | Quick Fix |
|-----|--------|-----------|
| No APM (Sentry/Datadog) | 500 errors only visible in log files | Sentry free tier — 5 min setup |
| No Slack webhook for errors | Team not notified of critical failures | Custom Winston transport — 15 min |
| No external uptime monitor | Downtime discovered by users | UptimeRobot free tier — 5 min setup |
| No payment failure alerts | Failed purchases unknown until customer reports | Admin Socket.IO notification — 30 min |
| No 5xx threshold alerting | Error spikes invisible | Render health check + Sentry |

---

## Recommended Quick Wins (priority order)

### 1. Enable Render Notifications (0 min — just toggle)
- Go to Render Dashboard > Integrations > Notifications
- Set to "All notifications" (success + failure)
- Connect Slack workspace if available
- This covers: deploy failures, service unhealthy, service recovery

### 2. External Uptime Monitor (5 min — free)
- [UptimeRobot](https://uptimerobot.com) or [Betterstack](https://betterstack.com)
- Monitor: `https://sswanstudios.com/api/health`
- Interval: 5 minutes
- Alert: email + Slack/SMS on failure

### 3. Sentry Integration (15 min — free tier)
- `npm install @sentry/node` in backend
- Init in server.mjs before routes
- Captures: unhandled exceptions, 500 errors, performance traces
- Free tier: 5K errors/month

### 4. Payment Failure Email Alert (30 min dev)
- In stripeWebhook.mjs, on `payment_intent.payment_failed`
- Send email via existing SendGrid to admin
- Template: "Payment failed for cart {id}, user {email}, amount {amount}"

---

## Launch Week Mitigation (without adding code)

Since we're not adding alerting infrastructure mid-launch, the mitigation is **manual monitoring**:

1. **Render dashboard logs** — check after every deploy
2. **Post-deploy smoke loop** — run the 5-check verification (see POST-DEPLOY-SMOKE-RESULTS.md)
3. **Periodic health check** — `curl https://sswanstudios.com/api/health` every few hours
4. **Admin dashboard** — check for purchase notifications, session counts, user activity
5. **Error log spot-check** — Render dashboard > Logs > filter for "error" or "500"

---

*Post-launch week: implement Sentry + UptimeRobot as P2 priority.*
