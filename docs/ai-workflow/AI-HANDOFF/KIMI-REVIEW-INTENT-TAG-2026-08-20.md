# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** .review-packet.md
**Seed:** (none)
**Tokens:** 8069 in / 2335 out | **Cost:** ~$0.0592 | **Wall:** 97.4s | **finish_reason:** stop

---

# HOSTILE REVIEW — SWA-178 option C

## HIGH

**H1. C7 is FALSE — an unrelated user-visible change is smuggled into this diff.**
`frontend/src/pages/contactpage/ContactV3.tsx:755` changes `AlertBox` color from `#fff` to `var(--text-on-accent, #ffffff)`. That is a live, user-visible style change with zero relation to intent tagging, zero test coverage, and zero mention in the claims. If `--text-on-accent` is undefined or defined to something unexpected in a theme context, success/error alerts change color in production. Either revert it or stop claiming C7. As written, C7 ("No live user-visible behaviour changed") is false on its face.

**H2. `byIntent` is silently wrong past 5000 leads, and wrong in a biased way before that.**
`backend/routes/leadRoutes.mjs:132` — `findAll({ ..., limit: 5000 })` has **no `ORDER BY`**. Postgres returns an arbitrary subset (physical/scan order, unstable across vacuum/index changes). So past 5000 matching rows, `byIntent` (and pre-existing `byChannel`) is a tally of a non-random, non-deterministic sample. The comment acknowledges the cap but not the missing ORDER. A silently-wrong count **is** worse than no count for the exact use case named ("did trainers stop knocking?") — a trainer-heavy older cohort falling outside the scan window reads as "trainer funnel died." Minimum: `order: [['createdAt','DESC']]` so the bias is at least stable and documented, plus a `capped: true` flag in the response when `channelRows.length === 5000`.

## MEDIUM

**M3. `seedRef` intent is stale on client-side param change — your own attack list item, and it's real.**
`ContactV3.tsx:932` / `ContactForm.tsx:192` read `seedRef.current.intent`, captured once at mount. In an SPA, navigating `/contact?intent=trainer` → `/contact` (or trainer → book) without remount submits the **stale** intent. Result: a lead tagged `prism:intent:trainer` who never clicked a trainer link on this visit — a direct answer to your first attack question: yes, that path exists. It's low-harm (marketing data, C2 holds), but it means the tag overstates trainer knocks. Fix: read `prefillFromUrl()` (or just the intent param) at submit time, not mount.

**M4. C1 is TRUE for `intentTag` and FALSE as a statement about the CRM.**
`leadCaptureShared.mjs:80-85` is correctly allowlisted; nothing arbitrary comes through the public path. But the aggregator (`aggregateLeadIntents`) buckets **any** `prism:intent:*` tag, and `Lead.tags` is admin-writable — your own test at `leadCaptureShared.test.mjs` asserts `[{ intent: '__proto__', count: 1 }]` as a *feature*. So `byIntent` can contain arbitrary, unbounded distinct keys sourced from the admin lead-update API. That's (a) a stats-pollution vector, (b) an unbounded-key memory/response-size vector (authenticated, so low severity), and (c) it contradicts the spirit of C1. The aggregator should intersect with `CAPTURE_INTENTS` — there is no legitimate reason to tally an intent the vocabulary doesn't know.

**M5. Multi-intent leads are undercounted silently.**
`leadCaptureShared.mjs` (`aggregateLeadIntents`): `tags.find(...)` counts only the **first** `prism:intent:*` tag. A lead tagged both `trainer` and `book` (possible via repeat submissions through both funnels + `mergeLeadTags` union) counts toward one, arbitrarily by array order. Sum of `byIntent` ≠ number of intent-declaring leads. Either count all matches or document "first tag wins."

## LOW

**L6. `findOrCreate` race is real but pre-existing, not introduced here.**
`leadCaptureService.mjs:88` — two concurrent submissions, same email: both miss the find, one wins the insert, the other hits the unique constraint (if one exists on `Lead.email` — unverified in this diff) and the intent tag is lost on the retry path, or 500s. Not caused by this change; the change just rides it. Flag for the backlog, don't block.

**L7. C3's "convergence would be harmless" is unverified, not established.**
The claim that the repeat-submission path merges `contactTags` (including the new intent tag) via `mergeLeadTags` is asserted in prose; the diff shows only the `findOrCreate` callsite. Your own verification section admits: no DB write, no HTTP request, no vitest run. The merge-path behavior for the new tag is therefore untested end-to-end. C3 is *probably* true; it is not *shown*.

**L8. Committed test file has never been executed by a runner.**
`leadCaptureShared.test.mjs` — assertions were run ad-hoc in node, but a typo in imports/describe structure fails CI on first real run. Low risk, nonzero. State it in the PR; don't claim "tested."

**L9. No import cycle from the shared-module move — checked, clean.**
`leadCaptureShared.mjs` is a leaf (no route/service imports); `leadCaptureRoutes`, `contactRoutes`→`leadCaptureService`, and `leadRoutes` all import it one-directionally. `new Set(CAPTURE_INTENTS)` at `leadCaptureRoutes.mjs:33` is module-eval-time on a frozen array — no load-order hazard. This attack fails.

## CLAIMS VERDICT

- **C1** — TRUE for `intentTag`; FALSE as a guarantee about tags in the DB (see M4).
- **C2** — TRUE. Nothing in the diff authorizes on the tag; grep-confirm no consumer reads `prism:intent:*` for access before merge.
- **C3** — PROBABLY TRUE, unverified on the merge path (L7).
- **C4** — TRUE. `Object.create(null)` + `Object.values` + `res.json` is safe; no prototype to pollute, serialization doesn't reintroduce one. The remaining vector is unbounded keys via admin API (M4), not pollution.
- **C5** — TRUE mechanically (no extra query), but the shared query is unordered and capped (H2) — "free" and "correct" are different claims.
- **C6** — TRUE. Skipping untagged leads is the right call; no attack found.
- **C7** — FALSE (H1).

## MISSED ENTIRELY

- **No `ORDER BY` on the stats `findAll`** (folded into H2 — affects `byChannel` too, pre-existing).
- **No test that `contactRoutes` actually forwards `intent` to the service** — the route change (`contactRoutes.mjs:213`) is covered by zero tests; a future refactor dropping that one property silently reverts the entire feature to the pre-fix state, which is the exact failure mode this packet exists to kill. This is the biggest coverage hole given the stated motivation.
- **`intent` is not stripped from logs**: `contactRoutes.mjs:150` logs at route entry; verify `req.body` isn't dumped anywhere downstream (non-PII, so low, but confirm).

**Block on H1, H2. Fix M4 (aggregator allowlist) before this ships — it's two lines.**
