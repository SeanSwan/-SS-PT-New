# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: medium)
**Document:** .g2-packet.md
**Seed:** (none)
**Tokens:** 3522 in / 11645 out · **Cost:** ~$0.0769 · **Wall:** 188.9s · **finish:** stop

---

**(a) VERDICT: REVISE** — `leadRoutes.mjs:139` (`order: [['createdAt','DESC']]` on `underscored: true`), `leadRoutes.mjs:155` (`sampled = total > channelRows.length` across two non-snapshot queries), `leadCaptureShared.mjs` `aggregateLeadIntents` (allowlist/`seen`/`Object.create(null)` hold; zeros and tie-break do not).

**(b) Correctness attacks**

`HIGH | leadRoutes.mjs:155 | sampled = total > channelRows.length is wrong under concurrency, not only at exactly 5000 |` `total` is a separate `Lead.count({ where })` issued **before** `findAll`, not in one transaction/snapshot. Near the cap this lies in the direction they claimed to eliminate. Example: `count` returns 4999, two public captures land, `findAll` `LIMIT 5000` returns 5000 of 5001 → `4999 > 5000` is false → payload says complete while the newest-5000 window dropped a row. Symmetric false-negative: `count===5000`, one insert, `findAll` still returns 5000 → `sampled===false` on a real sample. False-positive: `count===5001`, a delete, `findAll` returns ≤5000 remaining rows → `sampled===true` on a complete set. They optimized away the harmless “exactly 5000 and complete” qualifier and re-opened silent undercount at the only volume this code exists for.

`HIGH | leadRoutes.mjs:139 | ORDER BY createdAt without a unique tie-break is still a nondeterministic LIMIT |` Same-timestamp inserts (second precision, batch captures) rotate in/out of the 5000 window across vacuums/plans. The comment “newest-first makes the bias stable” is false. Need `created_at DESC, id DESC` (or equivalent unique key) or the “trainer funnel died” scan-window bug remains at the boundary.

`HIGH | leadRoutes.mjs:136-141 + leadCaptureShared aggregateLeadIntents | byIntent omits intents with count 0 |` Acc starts empty; unknown/empty tags `continue`. If the newest 5000 have no `prism:intent:trainer`, `byIntent` has **no trainer key**, not `{intent:'trainer', count:0}`. That is the same dashboard disappearance this work is supposed to kill. Seed from `CAPTURE_INTENTS` (always three buckets).

`MEDIUM | leadRoutes.mjs:128-155 | same payload mixes full-population totals with sampled breakdowns |` `total`/`conversionRate`/`new`/… are from the count query; `byChannel`/`byIntent` are from the capped fetch. One `sampled` boolean on the object does not say **which** fields are sampled. A consumer summing `byIntent[].count` vs `stats.total` will “catch” a lie that is actually two grains.

`MEDIUM | leadRoutes.mjs:138-139 | attributes omit the ORDER BY field |` `attributes: ['tags','source','status']` + `order: createdAt`. Postgres allows it **if** the identifier is a real column. If Sequelize wraps a subquery/limit (versions, paranoid, includes later), the outer select has no `createdAt`/`created_at` and `/stats` 500s. Not proven in this diff.

`LOW | aggregateLeadIntents | sum(byIntent) can exceed lead count |` Documented, but no `multiIntent`/`leadsWithIntent` denominator. Ops will treat counts as a partition and “prove” the aggregator is double-counting.

`LOW | aggregateLeadIntents | non-array / missing tags silently skip |` `row?.tags` not-an-array → no intent. JSONB-as-string or admin-shaped objects undercount with no log.

Allowlist ∩ per-row `seen` ∩ `Object.create(null)`: **those three hold.** `__proto__`/`constructor` sliced keys miss `CAPTURE_INTENTS` and cannot land on `Object.prototype`. Duplicate tags on one row count once. Multi-intent rows count in each allowlisted bucket. Do not re-litigate the old `.find()` bug.

**(c) Security attacks**

`MEDIUM | leadRoutes.mjs:128 | /stats handler as shown is `router.get('/stats', async …)` with no `protect`/`trainerOrAdminOnly` on the registration |` Imports exist; this hunk does not apply them. `byIntent` is recruitment-volume intel. If auth is only on other routes, this is a public CRM funnel leak (IDOR-by-omission). Confirm `router.use` / route-level guards with a test, do not assume.

Aggregator pollution / injection / SSRF / secrets / replay: **clean for the fix surface.** Prefix strip + `CAPTURE_INTENTS.includes` + null-prototype acc closes the `__proto__` path they re-opened in round 1.

`LOW | findAll tags | admin-writable ~1MB tags still enter Node on 5000 rows |` Allowlist drops unknown keys from the **response**, not from the fetch. Stats DoS remains an admin-tag memory bomb (pre-existing, still live).

Multi-tenant scope: **not visible** — if `where` is global, `byIntent` is an org-wide leak to any caller who can hit `/stats`. Same as `byChannel`; adding intent makes it worse, not new.

**(d) Data-truth / schema-drift (Rule 58)**

`HIGH | leadRoutes.mjs:139 | PascalCase attribute `createdAt` vs `underscored: true` → DB `created_at` |` This is the load-bearing clause they just added. If QueryGenerator emits `ORDER BY "createdAt"` (happens when the key is not mapped through `rawAttributes.field`), Postgres: `column "createdAt" does not exist` → `/stats` 500. If it silently ignores order, LIMIT is planner-arbitrary again. **No generated-SQL assertion in the diff.** This is unverified column mapping, not a style nit.

`MEDIUM | aggregateLeadIntents status === 'converted' |` Converted increment is a raw string. If the Lead enum/column is `Converted`/`converted_at` presence/snake `converted`, `converted` stays 0 forever while `count` looks healthy. Model not in the diff; this is caller-field vs column drift until proven.

`MEDIUM | response shape |` New `stats.byIntent`, `stats.sampled`, `stats.sampleCap`. Additive, camelCase matches `byChannel`. **No caller in this diff** consumes them. Frontend still cannot tell “3 trainers” from “3 in newest 5000”. Shape drift is not a break; it is an unused contract.

`LOW | CAPTURE_INTENTS claimed as the single vocabulary |` Capture routes are not in this fix pass. If `leadCaptureRoutes` / `captureLeadFromContact` still have a second list, Rule 58 is unpaid. `intentTag()` is defined here and unused in the aggregator (aggregator re-slices). Prefix constant is shared — OK — but the “one definition” claim is not evidenced by this diff.

**(e) House-rule violations / speculative-success**

`HIGH | leadRoutes.mjs comments ~145-154 | “Callers should render the qualifier whenever sampled is true.” |` No UI, no contract test, no named verified path. Speculative success. The silent-undercount failure they describe still ships if the dashboard is unchanged.

`MEDIUM | leadRoutes.mjs ORDER BY comment | “Newest-first at least makes the bias stable and explainable.” |` Untrue without a unique tie-break. Speculative.

`MEDIUM | sampled comment | “Comparing to the real total is also self-correcting if the cap ever changes.” |` Self-correcting only if count and findAll see one snapshot. They do not. Speculative.

`MEDIUM | “the off-by-one showed up when I went back and tested the boundary” |` That test is not in the diff. Unverified path.

House palette/MUI/Recharts/yoga/NASM/PII: **N/A (backend-only).** Check `leadCaptureShared.mjs` still `<=300` lines after +81.

**(f) SINGLE highest-risk item**

**`sampled` is a cross-query lie at the cap, and `byIntent` drops zero buckets — together they recreate “the trainer funnel died” with a green `sampled: false`.**

De-risk **before** build/ship (named path, not vibes):
1. Replace count+findAll with **one** statement: `COUNT(*) OVER() AS total` (or `REPEATABLE READ` transaction around both). Set `sampled = total > STATS_SAMPLE_CAP` from **that** `total`, not from `channelRows.length` vs a stale count.
2. `order: [[sequelize.col('created_at'), 'DESC'], ['id', 'DESC']]` (or mapped attributes **plus** `id`) and a test that asserts the SQL contains `"created_at"` (or the real `field`) not `"createdAt"`.
3. `aggregateLeadIntents` pre-seeds `{book,trainer,spectrum}` at `{count:0,converted:0}` so missing trainer is a zero, not an omitted key.
4. Contract test: 5000 vs 5001 rows, duplicate tags, `prism:intent:__proto__`, unknown suffix, multi-intent row, `sampled` true/false, and `/stats` 401/403 without trainer/admin.
5. Do not ship the flag until the stats UI actually renders `sampled`/`sampleCap` (or drop the comment that pretends it does).
