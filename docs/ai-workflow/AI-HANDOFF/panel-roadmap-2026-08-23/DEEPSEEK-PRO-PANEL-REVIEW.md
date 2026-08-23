# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-ROADMAP-PANEL-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2656 in / 7605 out · **Cost:** ~$0.0202 · **Wall:** 559.2s · **finish:** stop

---

## 1. Hostile review of §2–§4

**Finding 1 — Dead control shipped, zero production reach**
- **File:** `apps/web/src/App.tsx` (imported only by `src/testAppHarness.ts`), plus all B1* slices.
- **Symptom:** Owner console (list, batch enable/disable, family cards) is unreachable in production. Every B1a/B1b fix, test, and typed phrase map guards a code path no user can exercise.
- **Reproduction:** Build the production bundle; the owner console routes are absent. Any bug in those slices will never surface in prod.
- **Confidence:** CERTAIN. The document itself states the console is not in the production bundle.

**Finding 2 — `listOutletStatuses()` read-cost claim is overbroad**
- **File:** Slice B0 (`0622ca8`).
- **Symptom:** “Read cost constant in outlet count” is false if interpreted as response size or total rows scanned. The endpoint returns all outlets plus orphaned state keys; the number of orphaned keys is unbounded. If the claim means “constant number of SQL queries,” it is unremarkable and misleadingly phrased.
- **Reproduction:** Insert 10k orphaned state rows; response time and size grow linearly.
- **Confidence:** LIKELY. The claim as written is incorrect; the intended meaning is not validated.

**Finding 3 — `feed_set_hash` missing allows feed substitution after approval**
- **File:** Contract approval schema (2 rows, family-scoped).
- **Symptom:** An approval for a family (e.g., `news_rss`) does not bind to a specific set of feed URLs. A publisher could change their feed list after approval and still be treated as approved, because the gate only checks family + termsUrl existence.
- **Reproduction:** Approve family with feed set A; replace feed set with B; `sync()` still proceeds.
- **Confidence:** LIKELY. The terms gate narrows exposure but does not prevent substitution.

**Finding 4 — `lifecycle` column is a lie**
- **File:** Database schema, `news_rss_sources.lifecycle`.
- **Symptom:** “Born dormant” implies a control; no code reads `lifecycle` for gating. The real gate is `owner_enabled`. The field is display metadata that misleads operators into thinking dormant outlets are blocked.
- **Reproduction:** Set an outlet to `lifecycle=dormant`, `owner_enabled=true`; ingestion works.
- **Confidence:** CERTAIN. Confirmed by the document: “nothing in `officialConnectors.ts` reads it.”

**Finding 5 — Percent-encoded path causes 405 house-wide**
- **File:** Routing layer (all surfaces).
- **Symptom:** A literal route `/official-connectors/outlets` does not match the percent-encoded request `/official-connectors/out%6Cets`, returning 405. This is a systemic routing bug, not limited to one endpoint.
- **Reproduction:** `curl /official-connectors/out%6Cets` → 405.
- **Confidence:** CERTAIN. Documented as known-open #5.

**Finding 6 — 409 conflation for family keys**
- **File:** API handlers for family-scoped keys.
- **Symptom:** “Unknown” and “not-ready” both return 409, while per-outlet keys correctly return 404 for unknown. Clients cannot distinguish “this family doesn’t exist” from “exists but not ready.”
- **Reproduction:** Request a non-existent family key → 409; request a known family with missing terms → 409.
- **Confidence:** LIKELY. The inconsistency will cause client error-handling bugs.

**Finding 7 — S0 “pre-existing red” was diagnosed but not quarantined**
- **File:** Civic route test fixture.
- **Symptom:** The test used `new Date()` while the connector used an injected clock, causing a 9-day-old expiration. The fix injected the clock, but the document says “diagnosed, not quarantined” — meaning the flaky test was left in the suite without isolation, risking future clock-related regressions.
- **Reproduction:** Run the suite with a system clock set 10 days ahead; the test may fail again if any path still uses `new Date()`.
- **Confidence:** SPECULATIVE. The fix may be complete, but the phrase “not quarantined” implies no defensive layer (e.g., lint rule against bare `new Date()` in test paths) was added.

---

## 2. Attack S3a — probe spec + dated manifest

**Three-valued outcome is correct but incomplete for operations.**
`blocked_by_policy` vs `dead` is a necessary distinction. However, the manifest records only the final classification, not the evidence. A feed that returns 403 with a policy block page is `blocked_by_policy`; a feed that times out after retries is `dead`. Without the raw HTTP status, redirect chain, or response snippet, an operator cannot verify the classification without re-probing. This makes the manifest a trust-me artifact, not an auditable record. **CERTAIN**: the manifest lacks raw response evidence.

**Refusing cross-version diff is too strict and will paralyze operations.**
The spec version is a blunt instrument. If the User-Agent string changes but the liveness rule (e.g., “200 OK within 5s”) stays identical, a diff between manifests is still meaningful — any status change is attributable to the publisher, not the probe. Refusing the diff forces manual reconciliation of 107 feeds every time the probe agent is updated. **LIKELY**: this will cause operators to bypass the diff and eyeball changes, reintroducing the very error the versioning was meant to prevent. The diff should be allowed when the liveness rule is unchanged, or a migration map should be provided.

**The manifest fails to capture the effective URL after redirects.**
A feed registered as `http://example.com/rss` may redirect to `https://example.com/feed`. The manifest keys on outlet ID, not the final URL. If the redirect target changes, the outlet’s identity may drift without detection. The manifest should include the final effective URL and a hash of the redirect chain. **LIKELY**: this gap will cause silent identity shifts that break independence grouping later.

**Probe implementation version is not versioned.**
The spec is versioned, but the probe script (`scripts/build-probe-manifest.mjs` and its dependencies) is not. A change to the HTTP client library or retry logic could alter outcomes without a spec version bump. The manifest should record a content hash of the probe implementation. **SPECULATIVE**: this is a real risk, but the current team size may catch it manually.

---

## 3. Challenge the road (§5)

**Wrong order:** S7 (news as a third `WikiSourceModule`) is placed after scale proof and before claim extraction. This is a configuration change that should happen immediately after S3b (identity registry) so that the new family is part of all subsequent schema, seeding, and scale work. Delaying it risks schema mismatches and rework.

**Missing slice:** There is no slice for **item lifecycle** — updates, corrections, and retractions. RSS feeds often republish items with updated content. Without an `updated_at` and a mechanism to link versions, the disagreement map will treat a corrected article as a new claim, or worse, retain stale text. This must be designed before S4 (schema freeze).

**A slice that is secretly three:** S9 “Clustering + syndication” bundles three hard problems:
- S9a: Syndication detection (shared GUID → edge, not corroboration).
- S9b: Independence group enforcement (two feeds of one publisher ≠ two sources).
- S9c: Deterministic clustering of claims across outlets.
Each requires its own fixture set and failure modes. Treating them as one slice guarantees a tangled, untestable mess.

**First irreversible mistake and exactly where it becomes irreversible:**
If the schema frozen in S4 lacks `updated_at`, `retracted_at`, and a `supersedes_item_id` column, then **the moment the first item is ingested in S5, the system permanently loses the ability to handle updates and retractions without a lossy backfill.** The document says S4 is “the only irreversible step,” but it does not specify these columns. The irreversible point is the `INSERT` of the first item with a schema that cannot represent change over time. This happens in S5 when the first live cohort ingests items.

---

## 4. Calls on the four open decisions

1. **Owner console not in production bundle:** Delete it. The code is dead, reviewed, and tested, giving a false sense of progress. If the owner later wants it, it can be resurrected from git. Keeping it in the main branch wastes maintenance and review cycles.

2. **`feed_set_hash`:** Add it now. Extend the contract approval record with a hash of the feed set for that family. On `sync()`, recompute and compare. This closes the substitution window before any live ingestion depends on approvals.

3. **Terms acknowledgement:** Do not gate on `terms_acknowledged_at`. The legal requirement is likely display, not click-through. Keep the existing `termsUrl` presence gate. Add a UI indicator for unacknowledged outlets, but do not block ingestion. If legal demands acknowledgement later, it can be added as a non-blocking flag.

4. **`lifecycle` column:** Drop it. Replace with a single `status` column with values `unactivated`, `active`, `disabled` that directly controls behavior, or simply rely on `owner_enabled` and remove the column entirely. The current column is actively harmful because it suggests a control that does not exist.

---

## 5. What ships in a week, what gets deleted

**Ships:**
- Fix the percent-encoded path 405 (house-wide routing patch).
- Add `feed_set_hash` to contract approvals and enforce on `sync()`.
- Schema migration adding `updated_at`, `retracted_at`, `supersedes_item_id` to item tables (S4 with lifecycle columns).
- Identity registry (S3b) with independence groups for the existing 39 outlets.
- Seed the 107 dormant outlets with proper identity and terms.
- Make 10 outlets live, ingest items, and verify the pipeline stores source-side evidence and respects independence groups.
- A minimal liveness probe that stores raw HTTP response evidence alongside the classification.
- An integration test that ingests from 3 real feeds and asserts the disagreement map can be built (even if manually verified).

**Deleted:**
- The entire owner console UI (`apps/web/src/...` owner paths) from the production bundle and main branch.
- The `lifecycle` column; replace with a boolean `is_activated` or nothing.
- The `listKillSwitches()` old write-path code if still present (already fixed, but verify no dead branches remain).
- Any reference to “born dormant” in docs or UI.

**Refuse to do:**
- Refuse to add embeddings or RAG unless deterministic clustering demonstrably fails on real data.
- Refuse to gate on terms acknowledgement.
- Refuse to run scale proof (S6) until the schema includes update/retraction support and the first 10 live feeds have been running for 48 hours.

---

## 6. The endgame

**Single biggest reason this lane never reaches a working disagreement map:**
The system never ingests a sustained, diverse stream of real news items with complete provenance and source-side evidence. Without that, clustering and the disagreement map have no fuel. The current state is 10 items and 1 state row; the road plans seeding and scale proofs, but there is no automated, continuously verified ingestion pipeline.

**The build step that prevents it:**
The absence of a CI job that runs a live ingestion smoke test — pulling from a representative set of feeds, asserting that items are stored with non-null `source_item_id`, verbatim spans, and source-side evidence rows, and that independence groups are correctly assigned. Without this gate, every merge can silently break ingestion, and the team will never trust the data enough to build the map. Add a `test:ingestion-smoke` target that fails the build if any feed in a curated list returns zero items or items missing required fields.
