# Health & Uptime Monitoring Runbook

- **Created:** 2026-07-28 (SWA-71, pre-launch audit)
- **Status:** CANONICAL for health-probe configuration
- **Read when:** configuring uptime monitoring, debugging a "site looks up but nothing works" report, or changing anything under `backend/routes/healthRoutes.mjs`

---

## The two probes answer different questions — do not swap them

| | `/health` | `/health/ready` |
|---|---|---|
| **Question** | Is the process up? (**liveness**) | Can it actually serve? (**readiness**) |
| **HTTP status** | **Always 200** (except a server-level exception → 503) | **200 or 503** |
| **Point this at** | Render's health check | **Your external uptime monitor** |
| **Allowed to fail** | No | **Yes — that is its job** |

### Why `/health` always returns 200

Render restarts a service whose health check fails. If `/health` returned 503 during a transient
database blip, Render would kill an application server that is running perfectly well — converting
a database problem into a full outage. So `/health` answers only "the process is alive", and its
**body** carries the truth:

```json
{ "status": "degraded", "ready": false,
  "checks": { "store": "unknown" },
  "message": "Server process is up but the database is unreachable — requests will fail" }
```

> Before 2026-07-28 this endpoint reported `status: "healthy"` and `message: "Server healthy"` even
> with the database completely unreachable. During an incident an operator curling `/health` was
> told everything was fine while every request failed. That is why the body is now explicit.

### Why `/health/ready` is allowed to 503

It fails **closed**: if readiness cannot be established for any reason, it reports NOT ready.
Reporting ready on an error is how a broken deploy gets marked healthy. It returns 503 when:

- the database is unreachable, or
- the database is reachable but there are no active priced packages (the store cannot transact).

---

## ⚠ ACTION REQUIRED — this cannot be done from the repo

**Point your external uptime monitor at `https://<backend-host>/health/ready`.**

This is a dashboard setting in whatever service you use (UptimeRobot, Better Uptime, Pingdom,
Checkly, Render's own notifications). There is no repo file that configures it — that is why it is
called out here rather than "handled in code".

**Do NOT set Render's `healthCheckPath` to `/health/ready`.** It would restart the service on a
readiness failure, which is the exact outage this design avoids. Render stays on `/health`.

Suggested alert rule: page on **two consecutive 503s** from `/health/ready`. A single 503 can be a
cold start or a momentary connection reset; two in a row means real requests are failing.

---

## Interpreting a probe result

| `/health` | `/health/ready` | Meaning | Action |
|---|---|---|---|
| 200 `healthy` | 200 `ready:true` | Normal | none |
| 200 `degraded` | 503 | Process alive, **database unreachable** | check `DATABASE_URL`, DB host, connection limits |
| 200 `degraded` store `degraded` | 503 | DB fine, **no active priced packages** | storefront seed/pricing — customers cannot buy |
| 503 `unhealthy` | 503 | Server-level exception in the handler itself | check application logs, likely a boot/runtime fault |
| **anything** returning the SPA fallback | — | **The deploy has not landed yet** | wait and re-probe — see the trap below |

### Trap: a 503 from a not-yet-deployed endpoint looks identical to a failing one

When `/health/ready` was first shipped, probing it immediately after push returned
`503 {"error":"Frontend not available"}` — the SPA catch-all, because the old build was still
serving. **Confirm the deploy landed before interpreting a post-push probe.** Poll until the
response contains the `checks` field, which only the real endpoint emits.

---

## Where the logic lives

- `backend/routes/healthStatus.mjs` — pure, dependency-free status derivation. Extracted precisely
  so it is unit-testable: health-check logic that can only be exercised by booting a server is the
  last place to leave untested code.
- `backend/routes/healthRoutes.mjs` — the Express wiring for `/health`, `/health/store`, `/health/ready`.
- `backend/tests/unit/healthStatus.test.mjs` — the regression suite.

**Before changing the response body**, check who consumes it. As of 2026-07-28 both `/api/health`
consumers (`frontend/src/components/PWA/NetworkStatus.tsx`, `frontend/src/hooks/useBackendConnection.tsx`)
branch on the **HTTP status code only** and never read the body — which is what made the body-truth
fix safe. `universal-master-schedule-service.ts` does check `data.status === 'healthy'`, but it
calls a **different** endpoint, `/api/sessions/health`.

---

## Known drift in `render.yaml` (flagged 2026-07-28, NOT corrected)

`render.yaml` does not appear to be the live configuration — it disagrees with reality in ways that
suggest the service was created from the dashboard rather than this blueprint:

- `plan: starter` (×3), while `CLAUDE.md` states Render is on **PAID Professional (~$60/mo)**.
- `FRONTEND_URL: https://swanstudios-frontend.onrender.com`, while the live site is **sswanstudios.com**.
- No `healthCheckPath` key at all.

Left uncorrected on purpose: editing a config file that may or may not be authoritative is a good
way to change production by accident. **Confirm in the Render dashboard whether this blueprint is
actually applied before touching it.** If it is not, consider deleting or clearly marking it — a
stale config file that looks authoritative is the same trap Rule 77 exists to remove.
