# Nine defects in code I shipped hours earlier — the vantages that found them

**When:** 2026-07-29 (UTC) · **Linear:** SWA-75 · **Shipped:** `14032c035`, `451e611f8` on `origin/main`

Two hostile probes against code written the same day. **Nine real defects.** None were found by reading — all nine came from *executing* the code against inputs I had not imagined when writing it.

## The reporter (6)

1. **Percent-encoded `?` bypassed the strip.** The fix cut on a literal `?` and `#`; `/api/x%3Ftoken=secret` sailed through intact.
2. **Matrix-param `;` likewise.**
3. **A secret can BE a path segment.** Magic-link and verification routes are `/verify/<jwt>` and `/claim/<token>` — the query-string fix did nothing for them.
4. **Unbounded message** — 200KB stored whole.
5. **Unbounded stack** — 500KB stored whole, in the group sample *and* forwarded to the sink. 200 groups of that is a memory event.
6. **`referer` is a URL and I whitelisted it.** It carries its own query string, so a token walked in through the header path immediately after I closed the URL path.

**My own fix for (3) did not fire**, and the probe caught that too: the JWT pattern required ≥8 chars on the *second* part, so `/verify/eyJhbGciOiJIUzI1NiJ9.abc.def` still passed. Anchor on the FIRST part — a JWT header is always ≥16 base64url chars — which also avoids matching `file.tar.gz`.

## The erasure service (3)

7. **Erasure ran with no actor.** The audit row recorded `actorId: null`. An irreversible operation must be attributable.
8. **The admin guard was case-sensitive.** `role === 'admin'` let a user stored as `'Admin'` be erased despite the protection.
9. **Export was unbounded** — 50,000 rows into memory. Now capped *in the query* and, critically, the truncation is **disclosed in the payload**: a partial export must never be mistaken for a complete one when the document is the answer to a legal request.

## The transferable rules

**Redaction has to cover every separator, not the obvious one.** `?`, `#`, `;`, `%3F`, `%23` — and then the case where the secret is a path segment with no separator at all.

**Over-matching is the real risk of path redaction, so test it explicitly.** `/api/files/report.tar.gz`, `/static/app.min.js`, `/api/v1/users` must survive untouched. Redaction that eats the route destroys the diagnostic value the route exists to provide.

**Any whitelisted field that is itself a URL needs the same treatment as the URL.** Whitelisting `referer` re-opened the hole I had just closed.

**Every captured string needs a bound.** Not for tidiness — a 500KB stack in 200 groups, forwarded to a third party, is an incident.

**Case-sensitivity in a protective comparison is a bypass.** Normalise before comparing role, status, or any enum a guard depends on.

**Disclose truncation.** A silently capped export reads as complete, which is worse than an obvious error.

## Verified clean and deliberately unchanged

Prototype pollution via a crafted `req` does not touch `Object.prototype`; the group map holds at 200 under 500 distinct routes; the event window holds at 500 under 800 events; self-erasure is still blocked when the actor id arrives as a string; and when the audit write throws, the entire erasure aborts rather than committing an unrecorded deletion — the behaviour that matters most in that file.

## Baseline note

The pre-existing failing baseline moved **21 → 23 during this session** because another agent pushed `dayBriefCommand` work. Verified on a pristine `origin/main` worktree. Always re-establish the baseline against a clean worktree before attributing a failure — in a repo with parallel agents it moves underneath you.

*IDs and roles only. No PII, credentials, or customer data.*
