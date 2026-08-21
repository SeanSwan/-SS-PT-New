---
surface: vs-claude
slug: absent-and-zero-must-not-look-alike
date: 2026-08-21
worktree: c:/tmp/sspt-atelier-studio @ feat/front-page-atelier-run
commits: 77bff5e13, aa4188291
board: SWA-178
---

# Grok re-ran and found the thing four of us missed

Re-ran Grok at `effort=medium` on a focused packet after diagnosing why it had
"failed" (it hadn't — see mistakes). 3522 in / 11645 out, 189s, $0.0769, REVISE.
Three findings survived checking, three were disproved.

**The one that matters: `aggregateLeadIntents` omitted zero buckets.** It only ever
gained keys for intents that actually occurred, so a window containing no trainer
leads returned no trainer key at all — a dashboard renders blank, and "no trainers
knocked this month" becomes indistinguishable from "the counter broke". That is the
disappearance this entire feature was built to eliminate, rebuilt one layer up. All
three published intents now seed at zero.

**`sampled`, version four.** Grok worked the boundary: count=4999, two captures land,
findAll returns 5000 of 5001, `total > rows` reports COMPLETE over a truncated window.
My v3 cap-gate had fixed the deletion direction and left insertion lying. Two
non-snapshot queries cannot be reconciled by rearranging the comparison. Now fetches
CAP+1 and slices — one query, one snapshot.

**ORDER BY tie-break.** `created_at DESC` alone is not a stable window; same-timestamp
rows rotate across vacuums. Now `createdAt DESC, id DESC`.

Disproved on checking, recorded so calibration stays honest: `/stats` IS guarded
(`router.use(protect)` + `trainerOrAdminOnly` at :16-17); `'converted'` IS the exact
`Lead.status` enum; file is 233 lines under the cap; and its `createdAt`-mapping HIGH
is weakened because lines 230 and 278 of that same file already ship that ordering.

## Mistakes I made

- **I blamed the model for my own tooling's timeout.** Reported Grok as producing
  nothing on two attempts. They were `DOMException [TimeoutError]` against
  `consult-grok.mjs:104`'s hardcoded `AbortSignal.timeout(600_000)`. Grok at
  `effort=high` on a 12k-token document reasons longer than the client waits; attempt 1
  returned in 7.2s *because* it bailed early. The stderr naming the cause was one
  command away and I reached for the explanation that fit the story I was already
  telling. **Sixth instrument-blame this session**, and the second I had already written
  a durable packet about.
- **I wrote off a reviewer on one bad sample.** Called Grok "unusable in this shape
  today" after one preamble and two timeouts. One config change (`effort=medium`, a
  smaller doc) produced the best finding of the entire four-model panel. A null result
  from a misconfigured harness is not a verdict on a model.
- **I shipped three wrong versions of one boolean.** `rows >= CAP`, then `total > rows`,
  then `rows >= CAP && total > rows` — each fixing the previous one's direction while
  preserving the root cause, which was that the two inputs come from different queries.
  I kept rearranging a comparison instead of asking whether the comparison could ever
  be correct.
- **My tests only covered windows containing the data I was looking for.** The zero
  bucket was invisible to all of them, and to three other reviewers, for the same
  reason. I never wrote a test for the empty case of the metric whose whole purpose is
  reporting emptiness honestly.

## External-model calibration

- **grok-4.6** — $0.0769, 189s, 12 findings, **6 real**. Lowest precision of the four
  and the single highest-value finding. Needs `effort=medium` + a focused document or it
  exceeds the 600s client timeout.
- kimi-k3 — $0.0592, 9/9 real. The one to trust unreviewed.
- glm-5.3 — subscription, 7/8. Sole business-level find (the backfill).
- qwen3.8 local — $0, 5/7. Corroboration only.

**Panel total $0.14.** Routing conclusion: precision and originality are different axes
and do not correlate. Kimi is who you believe; Grok is who you run when you can afford
to check the answer. Both earn a seat, for opposite reasons.

## Operational

`consult-kimi.mjs` exposes `SWAN_KIMI_TIMEOUT_MS`; `consult-grok.mjs` hardcodes 600s.
Closing that asymmetry would have saved this whole detour.
