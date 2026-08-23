# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-ROADMAP-PANEL-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2722 in / 7748 out · **Cost:** ~$0.0000 · **Wall:** 283.5s · **finish:** stop

---

# 1. Hostile review of §2–§4

Ranked worst-first. Every finding is written so you can execute it against `b58459f`.

**1.1 — The 107-entry baseline manifest is provenance-false at birth. LIKELY.**
`config/probe-manifest.json` carries 107 entries stamped 2026-08-21 "with the date they were actually probed." Under what `specVersion`? Those probes predate the pinned contract. If they carry `v1`, the manifest asserts evidence gathered under an ad-hoc process was produced under the contract — precisely the retroactive-stamping failure §3 says it replaces. Repro: read `specVersion` on any of the 107 rows and ask whether the agent, timeout, and retry policy on 2026-08-21 match the pinned spec byte-for-byte. They cannot, because the spec didn't exist. Fix: `specVersion: null` (or `"pre-spec"`) and cross-version rules treat them as incomparable — which means admitting your entire baseline is undiffable until first re-probe.

**1.2 — `specVersion` pins config, not classifier semantics. CERTAIN as designed.**
The liveness rule is interpreted by code in `scripts/lib/probe-manifest.mjs`. Change the classifier (e.g., tighten the redirect-following logic) and outcomes move with `specVersion` unchanged. A version that doesn't hash the builder/classifier code is decorative. Fix: `specVersion` = hash(spec.json ⊕ classifier source), or add a separate `classifierVersion` the differ also refuses across.

**1.3 — Batch enable has no partial-failure story beyond honest bookkeeping. LIKELY.**
B1b does sequential per-key PUTs with a ledger that won't round up. But: (a) two concurrent batch operations interleave PUTs with last-write-wins on `owner_enabled`; (b) a crash mid-batch leaves a half-state that the ledger records honestly but nothing reconciles; (c) unclear whether quota is checked per-key inside the loop or once up front — if once, a 39-outlet batch can blow past quota at row 20. Repro: fire two overlapping batch-disables on overlapping selections; inspect final state vs. both ledgers.

**1.4 — The bundle-reachability control currently blesses dead code. CERTAIN tension.**
§2 ships a control that fails the build if a surface declared shipping isn't reachable. §4.1 admits the owner console is reachable only from a test harness. Therefore `bundle-markers.json` either declares the console non-shipping (the control has permanently ratified unreachable, tested code) or the control is not actually wired to `App.tsx`. One of these is true; both are bad. Resolve before adding one more line to the console.

**1.5 — Orphan factory closed; existing orphans' disposition unstated. LIKELY.**
S0 closes the mint path (DISABLE on a `news_rss:*` string). It does not say the already-minted orphan rows were deleted. `listOutletStatuses()` unions orphaned state keys, so any survivor still pollutes the listing. Repro: `SELECT * FROM official_connector_states WHERE key NOT IN (SELECT key FROM registry)` — expect zero; if not, the factory was closed but the shop wasn't cleaned.

**1.6 — The test-glob bug invalidates prior "self-tested" claims retroactively. CERTAIN.**
`scripts/lib/*.test.mjs` never ran until the fix. Every §2 row claiming self-tested lib code written before that fix has unknown suite coverage. Also: this glob shape is rarely unique. Audit every test glob in the repo (domain, database, scripts) for the same defect in the same week; assume there is a second one.

**1.7 — "Read cost constant in outlet count" is linear by construction. CERTAIN.**
Listing = registry ∪ state keys. That is O(outlets) unless paginated. At 39 outlets nobody notices; at S6's 146 + growth it degrades. The claim should be "linear, acceptable," not "constant." Re-run the read-cost assertion with pagination designed in, not bolted on after S6 embarrasses it.

**1.8 — Clock hygiene fixed by patch, not by rule. LIKELY recurrence.**
The 9-day red was `new Date()` vs injected clock. The fix defaulted the clock at root — it did not ban direct clock access. Grep `new Date(` and `Date.now(` across api/domain today; anything found is the next fixture time bomb. Add the lint rule; stop playing whack-a-mole.

**1.9 — 409-for-everything on family keys vs 404 on per-outlet keys leaks and confuses. Minor, CERTAIN.**
Clients cannot distinguish "family exists, not ready" from "family unknown" at HTTP level, while per-outlet keys distinguish them. Pick one convention; document it; stop letting the two key namespaces disagree about epistemology.

# 2. S3a, attacked

**Three-valued outcome is the right instinct and the wrong cardinality.**
`blocked_by_policy ≠ dead` is correct. But the taxonomy conflates at least four things inside `blocked_by_policy`: anti-bot 403, robots.txt disallow, ToS prohibition, and rate-limit responses caused by *your own* concurrency/per-host-delay settings. The last is self-inflicted misclassification — the probe punishes the publisher for your burst. And there is no home for transient infrastructure failure (DNS blip, timeout-after-retries): a feed that times out once lands where? Either a fourth value (`indeterminate`, excluded from liveness counts and requiring re-probe) or an explicit rule that retry-exhaustion yields `dead` with the retry transcript attached. As written, one bad network day mass-flips feeds to dead and someone "fixes" it by loosening the spec.

**Cross-version diff refusal creates the incentive to lie about version.**
Right diagnosis, wrong mechanism. The day a publisher blocks your UA, your options become: eat mass `blocked_by_policy`, or bump the spec and go blind. Refusal means the only way to keep diff continuity is to change behavior without bumping `specVersion` — falsifying the exact field the required-fields guard exists to protect. Replace refusal with attribution: allow the diff, annotate every delta with the version transition, and support a **dual-probe overlap window** (one full cycle under both versions) so deltas decompose into tool-attributable vs publisher-attributable. That requires old spec versions to remain executable — nothing in the design guarantees that, and it's the practical hole refusal was papering over.

**What the manifest fails to capture that a merge decision needs:**
- **Body hash / canonical content fingerprint at probe time.** S3b's independence grouping and S9's syndication edges need content identity. If the probe records only liveness, fingerprints come solely from shadow-ingestion snippets — thin, mutable, and useless for detecting that two "independent" feeds served byte-identical content on Tuesday.
- **Final URL after redirects.** You're recording liveness of whatever the redirect hit, not the feed URL. Syndication detection across a CDN that varies by geography will produce phantom non-corroboration.
- **HTTP status, ETag/Last-Modified, observed feed format, item-GUID sample.** Cheap columns; each answers a merge dispute later.
- **Probe wall-clock budget.** retries × timeout × backoff × concurrency slots is unbounded as specified. S6's 146 outlets could take hours; nothing says who notices.

**Staleness is warn-only.** A stale manifest should be a hard input-blocker for merge and clustering decisions, not a warning in build output. Warnings get `-f`'d.

**And execute this:** the same commit range fixed the test glob that would have hidden `scripts/lib/*.test.mjs`. Verify in CI, not locally, that `probe-manifest.mjs`'s tests actually run. Given 1.6, assume they didn't until proven.

# 3. The road, challenged

**Wrong order:** S7 (`news` as a `WikiSourceModule`) blocks nothing downstream — S8 claim extraction doesn't need wiki mapping. Move it after S9 or fold it into S10's display work. It sits early because it's easy, which is how roads fill up with easy things.

**Missing slice — the probe/liveness runtime.** S3a builds a manifest builder and a dated snapshot. Nothing in S3b–S10 runs a probe on a schedule, refreshes the manifest, or alerts when a live outlet goes dark. By S9 you'd compute syndication edges against liveness from 2026-08-21. There is also no production health-monitoring slice anywhere: who notices when NPR stops responding after launch?

**Missing slice — evidence snapshotting.** The product promises "the primary document attached." Ingestion is headline + snippet + link-out. Link-out rots; publishers edit pages; snippets are truncated. Nowhere does the road store an immutable, content-addressed copy of source-side evidence at ingest. Without it, S8's "verbatim span offsets" point into text whose original is unrecoverable, and S10's map links to corpses.

**The slice that is secretly three: S4.** "Schema freeze" bundles (a) a provenance-column migration, (b) a retention/volume *policy*, (c) an automated enforcement job, and (d) the lifecycle decision. These have unrelated risk profiles and unrelated review needs. Worse, the framing "the only irreversible step" hides that retention pruning is *also* irreversible and fires *automatically and continuously* from the moment the enforcement job runs — not at one checkpoint. Split S4 into S4a (migration), S4b (retention policy, human-approved), S4c (enforcement job, with a dry-run mode that reports what it *would* prune for a full cycle before it prunes anything). S9 is arguably also three (syndication-edge detection, independence-group resolution, cluster formation) — split it when you get there.

**Where it becomes irreversible — the document is wrong about this too.**
Not S4. It's **S5, the first live cohort**, conditional on one schema decision nobody has made: does the ingested item store `independence_group_id` denormalized, or `outlet_id` with the group resolved at read/cluster time? If denormalized, then the first S3b ownership mistake (two feeds of one publisher mapped apart — and URL-equality overlap measurement says you haven't actually measured ownership overlap yet) is frozen into every item from its first ingest, and every subsequent corroboration count is quietly inflated with no repair path short of rewriting history. If normalized through `outlet_id`, ownership errors are a relabeling — correctable forever. **Make the normalization call explicitly in S3b, before S5 seeds a single live feed. That is the exact commit where this lane becomes unfixable as currently written.** Secondarily: S4c's retention job makes evidence destruction continuous and unrecoverable from day one of enforcement — which is why snapshotting (above) must precede it.

# 4. The four calls

**4.1 — Console not in production: ship it, gated.** Wire the owner console into production routing behind AuthGate + a feature flag default-on for the owner role, and flip `bundle-markers.json` to declare it ships. Tested-but-unreachable is the worst of the three states: owner operations continue via raw API calls that bypass the phrase/confirm UX, which guts the point of the activation ritual and the ledger. If you won't ship it, delete it — but you will ship it, because S5's live cohort needs owner controls a human can actually use.

**4.2 — `feed_set_hash`: implement now, before S5.** Approval rows gain a deterministic hash of the sorted outlet keys (plus registry revision). Enable path recomputes and compares; mismatch forces re-approval. Reason: S3b's merge script mutates the registry, and without binding, a merge that swaps feeds under an existing approval silently inherits a human attestation it never received. Doing this after seeding means re-consenting 39 outlets twice. Cost is a column and a comparison; do it in the same slice as 4.3.

**4.3 — Terms acknowledgement: gate on it, block all 39, including the live one.** An enable path that treats absence-of-refusal as consent is structurally identical to stamping old probes with today's date — the exact failure class this repo keeps fixing. Sequence it before S5 so the live cohort is born clean. Mitigate the friction with a batch-acknowledge flow that displays the per-outlet terms list and requires one explicit confirmation — the B1b pattern already exists.

**4.4 — `lifecycle`: delete it.** Not gate it, not document it. `owner_enabled=false` by default already enforces "born dormant"; a second field that reads as a control but gates nothing is the dead-control class B1a was shipped to kill. Replace with a derived display value computed from the state table ("never enabled"), and drop the column at the S4a migration. Keeping it as "why disabled" metadata is a rationalization — nothing writes reasons to it today and nothing will tomorrow.

# 5. One week: what ships, what gets deleted

**Ships, in order:**
1. **Days 1–2:** Calls 4.2 + 4.3 together — `feed_set_hash`, acknowledgement gate, one batch re-consent pass over the 39. Registry is then born clean for S5.
2. **Day 2:** Call 4.1 — console in production, marker flipped, flag on.
3. **Days 3–4:** The missing runtime — a scheduled probe runner producing manifests under the pinned spec, with the manifest schema extended (body hash, final URL, status, ETag/Last-Modified, GUID sample) and the fourth outcome value. Include the dual-version overlap mechanism so spec changes don't blind you.
4. **Day 5:** Hygiene sweep — lint rule banning direct clock access in api/domain; audit of every test glob in the repo; orphan-row cleanup plus a standing suite assertion that orphan count is zero (a one-time observation is not a control); the S4a-vs-S5 normalization decision written down as an ADR with the `outlet_id`-resolution answer.
5. **Weekend:** Split S4 into S4a/b/c on paper; write the snapshot-at-ingest design so S4a's migration includes the content-addressed evidence table.

**Deleted or refused:**
- The `lifecycle` column and every sentence written about it.
- Warn-only staleness — stale manifests become hard blockers.
- Any start on S8 claim extraction until one live cohort has ingested under the frozen schema with snapshots landing.
- S6 "scale proof" until the probe runner exists — load-testing 146 outlets against a system with no liveness runtime proves nothing you'll use.
- Any renewed embeddings discussion, permanently, absent the demonstrated clustering failure the architecture doc already requires.

# 6. The endgame

**The single biggest reason this lane never reaches a working disagreement map: source-side evidence rots faster than the map accrues value.** The product's entire differentiation is "here is who claims what, with the primary document attached." Ingestion stores a headline, a truncated snippet, and a link-out. Publishers edit, retract, and 404. Retention prunes. By the time deterministic clustering surfaces a genuine conflict worth showing — months in, given the pace of this road — the primary documents behind the positions are gone or silently altered, and every position on the map is an unverifiable assertion. Independence-group errors are detectable and correctable before display; missing evidence is undetectable until someone clicks, and then it's just gone. A disagreement map without durable evidence is a rumor graph.

**The build step that prevents it:** extend S4a so that every ingested item is written in one transaction with (a) a content-addressed immutable snapshot of the raw payload, (b) fetch provenance (URL, timestamp, probe spec version, outlet reference — group resolved at read time per §3), and (c) a NOT NULL constraint plus a trigger refusing any row lacking them — mirroring the S10 pattern of triggers refusing system-written verdicts. Retention prunes derived layers, never the snapshot layer. And ship one adversarial test with it: delete or mutate the upstream page, then assert the map still renders its evidence intact. If that test passes at S10, the product exists. If it can't be written, nothing else on this road mattered.
