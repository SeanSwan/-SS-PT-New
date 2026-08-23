# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-ROADMAP-PANEL-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2837 in / 10979 out · **Cost:** ~$0.0714 · **Wall:** 161.4s · **finish:** stop

---

# 1. Hostile review of §2–§4

Findings ranked by damage if you act on the wrong mechanism. Marks are about the *claim in this writeup*, not vibes. I do not have `b58459f` checked out; CERTAIN means the document already proves it. Do not file a mechanism I did not name.

**1. “Shipped” includes an owner console no production bundle mounts.**
`apps/web/src/App.tsx` imported only from `src/testAppHarness.ts`; prod is `AuthGate` + `NewsroomShell`. B1a/B1b are a green suite around a dead surface. Same bug class as B1a’s “news card was a dead control,” now one layer up. **CERTAIN.**

**2. Live fetch is already on, under a licence story that is a URL column.**
Live DB: `official_connector_states` has `news_rss:npr_news` `owner_enabled`, `quota_spent 2`. `terms_acknowledged_at` is 0/39. S2’s gate is “row has `termsUrl`.” A researcher-filled URL is not an attestation. You already spent quota. **CERTAIN.**

**3. Three flags, one control, two of them lie.**
`news_rss_sources` 39/`lifecycle=dormant`; `creator` 51/0 enabled; one connector `owner_enabled`. Nothing in `officialConnectors.ts` reads `lifecycle`. “Born dormant” is a caption. An owner will treat dormant as a safety interlock. It is not. **CERTAIN.**

**4. Contract approvals are family-scoped (2 rows) while enable is per-outlet.**
Approve `news_rss` once, then grow 39 → 107 without a new signature. `feed_set_hash` is listed as open *after* a live key exists. The terms gate “narrows exposure” only if the set cannot grow. It can. **CERTAIN.**

**5. Perf and “constant read cost” are claimed beyond the measurement.**
B0: “Read cost constant in outlet count.” S6: every perf claim to date was 1 state row and 10 items. Those two sentences cannot both be operationally true. Listing = registry ∪ orphaned state keys is *O(keys you load)*, not a proven constant. **CERTAIN** the evidence does not support the claim.

**6. Ten `official_connector_items` already exist before provenance/evidence/independence.**
§5 calls items-without-provenance the irreversible step, then lists that step as future S4. The 10 rows and `quota_spent 2` say S4’s accident already started. If those rows are headline+snippet+link and the HTTP body is gone, syndication detection cannot be backfilled. **CERTAIN** as sequencing; **LIKELY** the 10 rows are already useless for S8/S9.

**7. 107 stamped probe rows vs 39 registry outlets vs 10 items vs 1 live key.**
S3a, S2, and the live DB are three different populations. “Zero overlap with the existing 39 was measured by URL equality” is in S3b as future work, which means the 107 were already treated as 107 things. URL equality is the identity bug S3b exists to kill, and it has already shaped the manifest. **CERTAIN.**

**8. S3a back-stamps a 2026-08-23 spec onto 2026-08-21 probes.**
`probedAt`/`specVersion` “required, never defaulted” is the rule. The spec did not exist on the 21st. Putting today’s contract on Tuesday’s fetches is the exact failure you say this replaces, applied to the seed corpus. Liveness is a property of the probe; these 107 are now attributed to a probe that did not run. **CERTAIN** from the dates in §3.

**9. `build-probe-manifest.mjs` has no network. S3a is a filing cabinet.**
Spec + classifier + differ + a JSON file. The only writer that could enforce UA/timeout/retries/liveness is missing. Anyone can stamp. The 107 were gathered under an undocumented runner. **CERTAIN.**

**10. Percent-encoded path `/official-connectors/out%6Cets` → 405, house-wide.**
Literal-route matching. Owner batch-enable sitting behind that router is a footgun, and you already know it. **CERTAIN.**

**11. Unknown vs not-ready both HTTP 409 for family keys.**
Operators cannot tell “typo” from “gates unsigned.” Per-outlet 404 is the correct shape; family keys were left inconsistent. **CERTAIN.**

**12. `test:scripts` globbed `scripts/*.test.mjs` only.**
`scripts/lib/*.test.mjs` (the new classifier/differ) would never have run in CI. Local green, suite blind. You found it. The mechanism is “glob is the test plan.” **CERTAIN** it happened; **LIKELY** other globs (`api`/`web`/`domain`) still hide files the same way.

**13. Slice A is a lexical tripwire sold as a sweep.**
Eight bug shapes, `connectorKey` string compares. Will not see constructed keys, decoded paths, case-folded hosts, or `news_rss:` + user input assembled off the comparison site. Treat it as a lint, not coverage. **LIKELY.**

**14. Batch enable is sequential per-key PUTs.**
Ledger that “cannot round a partial batch up” is not a transaction. Mid-batch crash + a second operator + filter-hidden selection (you already warn about this) is split-brain enablement. Phrase-once / apply-many without a single DB transaction is the mechanism. **LIKELY.**

**15. Clock bug was “diagnosed, not quarantined.”**
Civic route `new Date()` vs injected connector clock; fixture expired 2026-08-13 and sat as “pre-existing red.” Root clock defaulted later. Any remaining `new Date()` / `Date.now()` in retention, staleness, probe age, quota windows, or civic routes will reprint this. **LIKELY** stragglers exist; the failure mode is certain.

**16. `listKillSwitches()` did nine INSERTs per read.**
GET that writes. Tests did not catch it. Any other “ensure row exists” on a list path will do the same under load. **LIKELY** the pattern remains elsewhere; do not hunt it by rereading kill-switch code.

**17. Bundle-markers do not match what you call shipped.**
Both arms fail the build, but B1a/B1b are in the shipped table while the production graph cannot reach them. Marker is either lying or the surface is unnamed. **LIKELY.**

**18. 39/39 `termsUrl` “verified against the live registry.”**
Presence check. Not: URL fetches, names the legal entity that owns the feed, covers scripted collection under your pinned UA, or is current. **SPECULATIVE** that any of the 39 actually licence this product. Do not “fix” this by scraping terms HTML.

**19. Phrase-in-logs is a S5 acceptance item, which means it is not a test now.**
Activation phrase in request logs / error reports / client analytics. **SPECULATIVE** it already leaks; **CERTAIN** you have no gate.

Do not act on 18–19 until reproduced. Act on 1–12; they are already in your own numbers.

---

# 2. Attack S3a

It is a day old and it is already laundering Tuesday’s fetches as if they were run under Wednesday’s contract.

**Three-valued outcome.** `blocked_by_policy ≠ dead` is the right *refusal* (do not “fix” a 403 by impersonating a browser). It is the wrong *closed set*. A merge decision is not live/dead/blocked. You will see 401, 429, 451, 503, Cloudflare-challenge 403 vs publisher 403, 200 + empty channel, 200 + HTML interstitial, 301 off the registered domain, valid XML with zero items, soft-404 feeds, and one-shot success that fails the next three hours. Collapsing those into three buckets will send S5’s “first cohort of 10 live” to whoever happened not to bot-gate your UA on 2026-08-21. That biases the disagreement map toward polite publishers. Record status, final URL, parse result, item count, and policy bit separately; derive a label last. Do not store only the label.

**Cross-spec-version diff refuse.** Correct for attribution, too strict as a hard error. First timeout/UA bump makes 107 rows incomparable and the tool becomes a brick. Someone will then copy `specVersion`, which is worse than a loose diff. Emit `incomparable_spec` with both sides visible and fail CI only if a *merge* or *enable* tries to use a mixed-spec set as one corpus. Never `--force`. Never copy the version forward.

**What the manifest still fails to capture that a merge needs:**

- Registrable domain, publisher identity, overlap with the existing 39. Liveness of 107 URLs is not independence of 107 sources.
- Redirect chain and final host. A 200 after a hop to another publisher is a silent identity change.
- Whether the body parsed as a feed, and cardinality. “Live” that yields 0 items is not a source.
- Content hash of the fetched bytes. Without it you cannot later prove syndication or even that the probe saw the same resource.
- `termsUrl` / ownership / acknowledgement. Dead/live is not “may we ingest.”
- Runner identity. Spec pins UA/timeout/retries; the builder cannot enforce them. A manifest row without `runnerCommit` + `specVersion` + raw status is not evidence.
- Intermittency. One `probedAt` is a sample, not a property of the publisher.

**Retroactive specVersion on the 107 is a poisoned baseline.** Diff-against-previous will compare a real reprobe to fiction. Mark `specVersion=unspecified` on every 2026-08-21 row and do not use them for enable decisions.

**Classifier risk.** If liveness is “HTTP 200” (the spec body is not in the writeup), the rule is wrong for feeds. If 403 is always `blocked_by_policy`, you cannot distinguish “publisher forbids you” from “CDN forbids this POP.” Policy must be a rule you wrote, not a status code.

**The glob bug is the real S3a process tell.** The new code’s tests were invisible to `test:scripts`. A day-old module whose suite was not in CI is not “verified.” Re-run after the glob fix is the minimum; it is not a review of the classifier.

Three-valued: keep the inequality, drop the pretence that three is enough. Cross-version refuse: keep the warning, stop making the differ unusable. Manifest: not merge-ready. Treat S3a as an unenforced schema for a probe you have not shipped.

---

# 3. The road (§5) — the decomposition is wrong

**Wrong order.**

Identity (S3b) and provenance/evidence columns belong *before* any probe corpus is treated as a set, and *before* any `sync()`. You probed 107, enabled one key, stored 10 items, *then* scheduled identity and schema freeze. S4 “freeze” before S8/S9 is incoherent: you cannot freeze a schema that does not yet have claim, evidence, span, cluster, or independence tables, unless you plan to violate the freeze or to fake S8 on snippets. S5 live cohort before S8/S9 writes the poison. S6 scale-proves the connector control plane (1 state row → 146) before a single disagreement-map query exists; you will certify the wrong SQL. S7 (`news` as `WikiSourceModule`) is a different product. It is not on the path to a disagreement map. S10’s “system-written verdict refused by a trigger” is an invariant for the first item insert, not a last slice.

Correct order: evidence/provenance schema + independence on the outlet row + verdict trigger + S9 fixture trio, *then* probe runner, *then* identity merge of 107 against 39, *then* terms ack bound to `feed_set_hash`, *then* a single dormant seed with ingest off, *then* one live outlet, *then* scale the queries you actually run.

**Missing slice.**

Source-byte evidence store. Architecture: syndication keys on source-side evidence, never LLM-restated text; ingestion: RSS headline + snippet + link-out; S8: verbatim span offsets into a primary document. Those three cannot be true together unless you *keep* fetched source bytes (or a hash + the exact span text you extracted from those bytes) at ingest. “Nothing is republished” was allowed to mean “nothing is stored.” If nothing is stored, S8 is either impossible or becomes the LLM restatement you forbade. Also missing: the actual probe runner; `feed_set_hash` binding; house-wide clock lint; owner-role routing (or deletion); item normalizer that produces a stable `source_item_id` from GUID/permalink, not from title text.

**A slice that is secretly three.**

S3b is three: (1) registrable-domain / publisher identity, (2) `independence_group_id`, (3) terms+ownership required on merge. Those fail independently and have different rollback costs.

S4 is three and you already wrote the list: provenance columns; retention/volume job; lifecycle decision. The job is a deletion engine. Do not ship it in the same slice as the columns it will prune.

S9 is three: GUID syndication edge; same-publisher non-corroboration; genuine two-position cluster. One fixture trio is fine; one “clustering slice” will ship the easy GUID case and slip the other two.

S5 is three: idempotent dormant seed; live 10; mid-batch abort drill. Live 10 is the point of no return. Do not bundle it with a merge script.

**First thing that becomes impossible to fix, and where it becomes irreversible.**

Not “S4” as a blob. Two locks:

*Political lock:* S4 “schema freeze” without evidence blob/hash, span columns, independence FK, and cluster tables. After you call it frozen, S8/S9 become “out of scope migrations” and someone will extract claims from snippets.

*Data lock (the real one):* the first S5 `sync()` that commits an `official_connector_items` row (or equivalent) with link-out + headline/snippet, no `content_hash` of source bytes, no evidence row, and discards the HTTP body. At that moment syndication detection, verbatim spans, and “primary document attached” cannot be reconstructed. S4’s retention job then deletes receipts and makes it un-debuggable.

It is already half-turned: 10 items, `quota_spent 2`. If those bodies are gone, you have a preview of the failure. Proceeding as written, it becomes irreversible at S5 live cohort #1, first successful item insert, current schema. That is the line. Not the freeze meeting. The insert.

---

# 4. The four open calls

**1. Owner console not in the production bundle.**
Keep it out. Mark the surface non-shipping in `bundle-markers.json`. Do not mount it in `NewsroomShell` this week. Enablement is already ahead of terms ack, feed-set binding, and lifecycle. A dead console that tests green is how B1a happened; wiring it now just puts a batch-enable button on that mistake. Owner path is API + phrase until the gates in (2)–(4) exist. Delete the fiction that B1a/B1b shipped.

**2. `feed_set_hash`.**
Bind it. Approval row must hash `{family, sorted outlet ids, termsUrl per outlet, probe specVersion}`. Enable and `sync()` 409 if the live set does not match a signed hash. Family-scoped approval is a blank cheque; refuse it. Do this before any new outlet, including the 107. Rotate: new set → new phrase → new row. Do not migrate the existing 2 rows into “covers everything”; expire them.

**3. Terms acknowledgement.**
Gate on `terms_acknowledged_at`. Yes, that disables `npr_news` and blocks 39/39. Do it. `quota_spent 2` without an ack is already the wrong side of the line. Acknowledgement is an owner action naming the outlet id and the terms URL hash, not a checkbox on the family. URL-present remains a blocker; it is not sufficient.

**4. `lifecycle`.**
Make it a gate or delete it. I would make it a gate: `sync()` and enable require `lifecycle=active` AND `owner_enabled` AND terms ack AND feed-set match. `dormant → active` is a phrase action, one outlet or a hashed batch, never implied by enable. Until that ships, strip “dormant” from any UI that looks like a control. A display-only safety label is an enablement bug.

(§4 items 5–6 are not decisions. Fix the literal-route matcher; split unknown 404 / not-ready 409 for family keys the same as per-outlet.)

---

# 5. One week: what ships, what I delete

**Ships**

- Disable `npr_news` until ack + feed-set hash + lifecycle gate exist. Spend the week going to zero live, not to ten.
- `feed_set_hash` on approvals; expire the two family rows.
- `lifecycle` as a real predicate in `officialConnectors.ts`, not a caption.
- Evidence columns and a DB trigger: no item row without `content_hash` + fetch receipt; no claim row (when it appears) without `source_item_id` + evidence id + spans. System-written verdict rejected by trigger *now*, on whatever verdict column exists or on a stub.
- Probe *runner* as the only writer of manifests. Relabel 2026-08-21 rows `specVersion=unspecified`. Differ emits `incomparable_spec`. Glob fixed and `scripts/lib/*.test.mjs` in CI.
- Clock lint: fail CI on `new Date()` / `Date.now()` outside approved seams.
- Route matching for encoded paths; 404/409 split.
- S9 fixture trio against empty tables, ingest off. GUID≠corroboration, same-publisher≠independent, two real positions stay two. This is the product. It ships before any seed.

**Deleted**

- Owner console from the shipped table and from any “lane progress” count. Leave the code if you want; unmark it shipped.
- S7 from this lane. Wiki module mapping is someone else’s compile error.
- “Schema freeze” as a slice title until evidence/claim/cluster/independence exist.
- The 10 items if they have no source hash. They are not a corpus; they are a lure.
- Lexical tripwire as a safety claim. Keep as a lint or kill it.
- Any S5 live batch, any S6 146-outlet theater, any UA change to flip `blocked_by_policy` to live.
- The sentence “born dormant” as an interlock.

**Refuse:** more outlets, LLM claim extraction, republishing bodies into the UI, freezing schema, scale proofs of list endpoints, treating the 107 as 107 sources.

---

# 6. Endgame

**Single biggest reason this lane never reaches a working disagreement map:** the control plane is the product. You ship connectors, phrases, kill switches, probes, and consoles because those close in a PR. A disagreement map needs independence-aware sources, source-side bytes, claims that are spans into those bytes, and clusters that refuse syndication and same-publisher doubles. Ingestion as RSS headline+snippet+link-out, plus “nothing republished” read as “nothing stored,” plus “not RAG / no LLM-restated text,” leaves S8 with no legal input. S9 then clusters headlines. That is a news river, not a disagreement map. Identity-by-URL and family-scoped approval make the river also lie about corroboration. Connector theater will consume the calendar through S6; S8 will arrive after retention has dropped the only evidence.

**Build step that prevents it:** a CI gate in the same shape as `bundle-markers.json` — both arms fail — that will not go green unless (1) the S9 fixture trio passes, (2) a trigger rejects item insert without source `content_hash` + evidence row, (3) a trigger rejects claim without `source_item_id` + spans into that evidence, (4) a trigger rejects a system-written verdict, (5) enable/`sync()` refuse unless `independence_group_id`, terms ack, and `feed_set_hash` match, (6) two feeds that share a publisher cannot increment an independence count. Put that gate in front of `sync()`, not in S10. If it is not in the build, this lane stays a connector admin tool with a manifesto.
