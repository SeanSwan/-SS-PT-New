---
surface: vs-claude
utc: 20260712T051113Z
topic: Hostile review — a throttle's 429 must stay human-recoverable; response-shape mismatch silently broke every public form
tags: [rate-limit, contact, orientation, lead-capture, error-ux]
---

## What I did / learned
- **Bug class (will recur): limiter response shape vs. consumer read shape.** The public-form rate
  limiters in `backend/middleware/rateLimiter.mjs` put their text in `data.error`, but **every**
  frontend consumer reads `data.message`. Net effect on a 429: `ContactV2` / `ContactV3` /
  `EnhancedContactPage` all do
  `setError(\`Failed to send message: ${data?.message || axiosErr.message}\`)` → the prospect saw
  **"Failed to send message: Request failed with status code 429"**; `OrientationForm` fell back to
  "Failed to submit orientation"; the new `PricingInquiryModal` fell back to a generic error.
- **Fix (one place, five consumers):** limiters now send the SAME text in **both `message` and
  `error`** (`contactLimiter`, `orientationLimiter`, `waiverLimiter`). No frontend edits were needed
  for the contact pages / orientation / waiver. The inquiry modal additionally reads
  `data.message || data.error` so it can't regress if a limiter shape changes.
- **Design principle worth carrying:** on a public *lead* form, a **false-positive throttle must stay
  recoverable**. A blocked genuine prospect who sees a generic/technical error hammers the form or
  leaves. The asymmetry is extreme — a lost lead is worth up to the top training package, while the
  handful of messages the cap saves costs pennies. Tune caps AND make the 429 copy actionable
  ("try again in a few minutes"), and leave the form usable for retry.
- **Sibling sweep is what caught the blast radius:** grepping every consumer of the throttled
  endpoints revealed 3 additional contact-page components beyond the one I built for. Never assume
  a public endpoint has a single caller.

## Why it matters to Hermes
- Any future "add a rate limit / add a guard" task on a public surface must check what the EXISTING
  consumers read from the error body, or the guard silently degrades UX on forms nobody was
  thinking about.
- Reinforces: protect the money path (cost/abuse), but **never at the cost of a real lead**. If a
  protection can bite a genuine prospect, the failure mode must be self-explanatory and retryable.

## State right now
- Live on main: both public lead forms throttled (5/15min per IP, verified via `ratelimit-policy:
  5;w=900`), and the 429 body now carries a human-recoverable `message` for all five consumers.
- Verified: backend 5/5 + frontend 11/11 tests, tsc exit 0 (zero errors), Rule-42 backend audit
  clean on every push.
- **Known limitation (not a defect):** `express-rate-limit` uses an in-memory store → counters are
  per-instance and reset on restart. Fine for a single Render backend instance; a shared store is
  only needed if the backend is scaled horizontally. Do not "fix" this with Redis prematurely.

## Sean owes / blockers (if any)
- Pre-existing competing surfaces (Rule 27, NOT touched, cleanup candidate): **three** contact page
  components — `ContactV2`, `ContactV3`, `EnhancedContactPage` — all POST the same endpoint.
- Still open from the prior memo: confirm the owner-gate status line flips to "ready"; decide the
  dual entry point / label for account access; whether to fire one real test inquiry to prove the
  notification actually lands (deferred — it fans out to a second owner recipient).
