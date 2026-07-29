# The app was telling clients "our team has been notified" — nobody was

**When:** 2026-07-29 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `237828793` + `869060486` on `origin/main`
**Consult:** Kimi K3, $0.0586 — sub-Fable tier, so this is an inbox memo only, never the durable corpus.

## The finding

`core/middleware/errorHandler.mjs` returned, in production, to real users:

> "An unexpected error occurred. Our team has been notified."

Nothing notified anyone. A rule-75 violation in **user-facing copy** — the most expensive kind, because the client believes it and waits.

Fixed by making the sentence true rather than softening it: a scrubbed 5xx capture now runs before the response.

## Correcting my own repeated claim

I had said "there is no observability" across several closeouts. **Imprecise.** AI features ARE monitored: `services/monitoring/alertEngine.mjs` evaluates `AI_MONITOR_*` thresholds, persists alerts, and is wired through `monitoringService` + `aiMonitoringRoutes`. The real gap was narrower — general HTTP 5xx had no tracking, grouping or alert anywhere.

**A repeated claim is not a verified claim.** I carried "no observability" for three turns without checking, and it was wrong in a way that would have led to duplicating an alert engine that already existed.

## Verify a paid consult's premises before building on them

Kimi made two factual claims. One was false.

- **"login, signup and password reset are unthrottled"** — FALSE. Register 10/hr, login 100/15min plus a per-account 10-per-15min limiter, refresh 20/15min, password reset 5/15min on both routes, change-password 10/15min. Kimi inferred the gap from *absence in my summary*, not from the code. Building on it would have added redundant throttling and claimed a fix for a non-problem.
- **"no account deletion or data export exists"** — TRUE. Only an unrelated social-integration `deleteAccount`. Real legal exposure on a platform holding minors' data.

**A consult reads the packet you give it, not the repo.** Anything it asserts about code state is a hypothesis (rule 30). Its *judgement* — sequencing, what's missing, what's over-engineering — is where the value is, and that held up well.

## Error reporters are a PII leak vector by default

The containment that matters is refusing to capture, not scrubbing after:
- request **bodies are absent** — not truncated, not redacted, never read
- headers whitelisted to `user-agent/referer/content-type/accept`; authorization, cookie and x-api-key dropped
- identity is id + role only, never name or email (rule 8)
- everything still passes through the repo's EXISTING `redactLogValue` (`utils/redactionRules.mjs`, SWA-71) — reuse, do not write new scrubbing
- 4xx ignored entirely: a client mistake is not an outage
- ids and uuids collapse in the fingerprint, so a flood reads as ONE problem

Mutation-proven: removing the scrub and capturing `req.body` fails exactly 3 of the 18 tests.

## Design note worth keeping

Kimi's ruling was "install an SDK, do NOT build bespoke aggregation or dashboards." Correct — but an SDK needs a DSN only the owner can create. So what shipped is the **thin seam an SDK plugs into** (`registerErrorSink`), with zero new dependencies and inert until a sink is registered. No dashboards, no second pager. When the DSN exists, one function call replaces the sink and nothing else changes.

That is the general shape for "the right answer needs something only the owner has": build the part that must exist either way, leave a one-line seam, do not build a substitute.

## Baseline, so nobody chases it

`tests/unit` + `tests/api` now shows **21 failures across 10 files**, verified identical on a pristine `origin/main` worktree. It grew 7 → 11 → 16 → 21 across two days, entirely from other agents' in-flight SWA-71 logging and session/support work. Not regressions.

*IDs and roles only. No PII, credentials, or customer data.*
