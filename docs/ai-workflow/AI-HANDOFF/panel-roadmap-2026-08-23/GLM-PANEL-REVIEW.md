# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-ROADMAP-PANEL-PACKET-2026-08-23.md
**Tokens:** 2606 in / 14963 out (reasoning: 11623) | total 17569
**Wall:** 244.5s

---

## 1. Hostile findings, §2–§4, ranked

**F1 — The reachability control attests the wrong artifact.** `config/bundle-markers.json` shipped in S0 as a per-surface shipping control, and the owner console is still unreachable in production (§4.1, your own verification: `App.tsx` imported only by `testAppHarness.ts`). Either the control passes while the surface is unreachable — i.e., it validates test-harness reachability, not `dist/` — or the markers file declares the console "test-only," which codifies the failure. Execution: production build, grep `dist/` for a console-only marker string; read what the reachability receipt actually attests. **CERTAIN** the surface is unreachable; **LIKELY** the control checks the wrong bundle.

**F2 — Batch enable converts per-outlet consent into family-scope consent with no boundary.** One phrase authorizes N sequential `setOwnerEnabled` calls; with `feed_set_hash` unbound (§4.2), the attested set is mutable after attestation. Add an outlet to the registry, re-run the batch, same phrase, no re-attestation. Execution: approve family phrase → batch-enable → mutate registry → batch again; observe no refusal boundary exists. **CERTAIN** from the described mechanism.

**F3 — Partial batch is reachable today with no compensator.** Sequential PUTs; abort mid-batch leaves half-enabled state. The ledger can't round up — fine — but nothing rolls back, and the abort drill is deferred to S5. Execution: kill the client mid-batch against a scratch DB, inspect states. **CERTAIN** non-atomic by design; **LIKELY** no compensating disable exists.

**F4 — The licence gate is a string-presence check.** `terms_not_recorded` fires only on missing `termsUrl`; `"https://example.com/x"` clears it, and 0/39 acknowledgements exist. Calling it a licence gate overstates a null-check. Execution: set a placeholder URL on a scratch outlet, enable. **CERTAIN** per the shipped description.

**F5 — The clock fix was a point fix, not a class fix.** The 9-day red came from one `new Date()` among decision paths. Nobody has audited the rest. Execution: `grep -rn "new Date(\|Date.now(" --include="*.ts" apps/ src/ scripts/ | grep -v test`, classify each hit decision-vs-display. **LIKELY** residual instances.

**F6 — "107 new, zero overlap" was measured by URL equality — the exact method S3b exists to bury.** The candidate count is an upper bound, and worse: the S3b merge rule as specified — *registrable domain* — collapses every multi-tenant host. All of Substack (`*.substack.com` → eTLD+1 `substack.com`), Medium, WordPress.com, Blogspot become **one independence group**: "two feeds of one publisher must never read as two confirmations" inverts into "forty publishers read as one." Symmetrically, Sinclair-style station networks on distinct domains under-merge unless `ownership` is recorded at parent-entity granularity, not station LLC. Execution: run the proposed rule over the 107 with a public-suffix list; count groups. **CERTAIN** the collapse follows from the rule as written.

**F7 — The probe manifest is born nearly stale.** Probed 2026-08-21, reviewed 2026-08-23, merge decision (S5) arrives after S3b identity work + S4 schema freeze — weeks out. No S5 entry criterion requires re-probe freshness, so the seed decision will run on expired evidence waved through because a manifest exists. Execution: check whether any gate reads manifest age at seed time. **LIKELY** consequential; **CERTAIN** no such gate is described.

**F8 — Path 405 house-wide, authz implication unexamined.** A 405 (not 404) on `out%6Cets` means raw-path and decoded-path matching disagree somewhere — mixed canonicalization. If any middleware compares raw while the router decodes, this is a route-guard bypass, not a nuisance. Execution: fire encoded variants (`%6C`, `%256C`, `..%2f`) at an owner-only route unauthenticated; expect 401/403 on all; anything else is P0. **LIKELY** decode-order mismatch; **SPECULATIVE** exploitable — execute before dismissing.

**F9 — All prior suite counts were measured under broken discovery.** The `scripts/lib` glob hole means "153 pass" was true of a suite that silently excluded a directory. The class is glob-under-collection; only one instance was fixed. Execution: per package, assert `find *.test.*` count == discovered count in CI. **CERTAIN** the class exists; instances unknown.

**F10 — Manifest "previous" persistence is unclear.** A single `config/probe-manifest.json` diffed against "the previous" — if the builder overwrites in place, the cross-version refusal depends on git state or a regeneration path that can't refuse. Execution: run the builder twice against a fabricated verdict change and a fabricated spec bump; confirm refusal survives. **SPECULATIVE** mechanics, cheap to settle.

---

## 2. S3a under attack

**Three-valued outcome: right direction, under-resolved.** `blocked_by_policy` needs *whose* policy (publisher 403 vs robots.txt vs your egress rules vs legal) — a merge decision and any future "fix it" decision need the cause, and collapsing all dead-into-one conflates transport failure (timeout at your pinned budget) with semantic death (200 serving an HTML park page). If the liveness rule keys on HTTP status rather than feed parseability, parked domains count live. Execution: read the `liveness rule` field in `probe-spec.json`; probe a known-parked domain. **SPECULATIVE** it lacks body validation — likely.

**The spec's own principle is under-applied.** You versioned the spec because liveness is a property of the probe — correct. But liveness is a property of the probe *and its network position*. A publisher blocking datacenter ASNs yields `blocked_by_policy` from CI and 200 from elsewhere. The spec pins UA and not egress/AS. Same verdict-flips-without-publisher-change failure you built versioning to prevent. **LIKELY** missing; **CERTAIN** the principle demands it.

**The manifest discards identity evidence it already paid for.** Redirect behavior is captured as a count; the *final URL* is the valuable part — two candidate URLs converging on one redirect target is duplicate-feed detection for free, and it feeds S3b directly. Also missing for a merge decision: stable key beyond URL (registrable domain at minimum — post-S3b, URL-keyed manifest rows won't join identity-resolved outlets), per-feed verdict history (dead 1-of-1 ≠ dead 5-of-5), and cheap content signals (content-type, ETag/Last-Modified) that S5+ change-detection will want and can never backfill. Execution: check whether the runner records final URL and response headers; if not, that's the gap. **LIKELY**.

**Cross-version refusal: keep it.** At 107 feeds with per-host delay, re-probe on spec change costs minutes; the refusal buys attribution. Two fixes: the refusal must emit a machine-actionable "re-probe required" state, not a red build people learn to route around; and the prior manifest must be an immutable dated artifact (see F10). **CERTAIN** re-probe is affordable at this scale.

**The backfilled `probedAt` smells.** "Never defaulted" launched with 107 entries all carrying 2026-08-21. If the original runs recorded no timestamps — the failure being replaced — where did the date come from? One uniform date across 107 feeds is either a single real run's log (fine, cite it in the manifest) or a default in a date costume. Execution: check whether the 107 values vary at all; if uniform, name the source in the file. **LIKELY** worth executing.

**Runner/builder TOCTOU.** The builder is offline and pure — good — but the network runner must stamp `specVersion` from the spec it *ran*, read once, not from the file at build time. A spec edit between probe and build mislabels evidence. Execution: trace the runner's spec read. **LIKELY** fine; verify.

**And the meta-finding:** S3a's tests are one day old *in effect* — they never executed until the glob fix. Treat the whole slice as unreviewed, which is why this section exists.

---

## 3. The road

**Wrong order #1 — retention enforcement is scheduled before anything defines what evidence is needed.** S4 sets the retention/volume budget and ships the enforcement job; S9 (syndication detection) is four slices later. A pruning policy written before syndication's evidence requirements are known is guesswork, and its first run on real rows is deletion under guesswork. Split S4, ship enforcement dark (dry-run emits a would-delete report), and gate the first real prune on S9's fixture trio passing. The enforcement job's first production run against non-synthetic `official_connector_items` is your real point of no return — later than you think, and more precise than "S4."

**A second, quieter irreversibility sits before that:** enabling live ingestion under an unscoped family attestation fixes the *consent record* for everything ingested. Rows can be deleted; a log of what was authorized cannot be un-logged. Bind `feed_set_hash` before the first live enable, not after S4.

**Wrong order #2 — S6 proves scale against the wrong data.** Synthetic 146/3k measures read cost and triggers, and teaches nothing about feed rot, snippet mutation under stable GUIDs, or redirect churn — the actual failure modes. Put a minimal live cohort (3–5 manually-verified outlets) before S6 and run scale-proof on live+synthetic mix.

**Slices that are secretly several.** S4 is four: provenance schema / retention+enforcement / lifecycle decision / volume budget. S3b is two: identity resolution and licence registry — different failure modes, and bundling them risks freezing identity wrong while chasing licence completeness. S5 is two: bulk seed (idempotent merge) and live-cohort ops (the abort drill belongs to the latter).

**Missing slices.** (a) Manifest↔registry reconciliation — 107 probed vs 39 registered, no step joins them under stable keys. (b) Multi-tenant domain carve-out inside S3b, or F6 sinks the independence model at birth. (c) Ingest continuity — receipts exist, but no slice owns "sync keeps succeeding," which at 146 outlets is the operational norm, not the exception.

---

## 4. The four calls

1. **Ship the console into the production bundle, owner-route-gated.** Zero enabled creators plus an unreachable console means this lane cannot ingest *by construction*. It's read-mostly, mutations behind auth+phrase, and S5's drills need it. Ship it, and fix F1 so the reachability control tests `dist/`. The alternative — delete it — loses work S5 depends on.
2. **Bind `feed_set_hash` now.** Hash over ordered `(outletKey, termsUrl, ownership_entity)`; recompute at enable, refuse on mismatch. Two approval rows exist; the migration is a two-row UPDATE today and a 146-row backfill after S6. It also makes the one-phrase batch (F2) semantically sound.
3. **Gate on acknowledgement at enable time, not retroactively.** Don't brick the live outlet and the dormant 39 over historical backfill — dormant means no ingestion, no exposure. At enable: record `terms_acknowledged_at = now`, hash the `termsUrl`, require re-acknowledgement when it changes. The gate moves from "exists" to "acknowledged-at-enable."
4. **Delete `lifecycle` as stored state; derive it.** `owner_enabled AND recent success → live; owner_enabled AND stale → degraded; else dormant` — a view. Nothing reads it (you verified), 39 rows, zero migration cost. A stored field nothing enforces is documentation that looks like state. This also removes "the lifecycle decision" from S4's critical path entirely.

Items 5–6 are fixes, not decisions: normalize percent-encoding once in middleware before routing with a corpus-driven test, plus the F8 authz audit; split 409s into 428 (approvals missing) / 409 (kill switch) / 422 (terms) while exactly one client exists.

---

## 5. One week

**Ships:** Console into prod behind owner gate + F1 fix (day 1–2). Test-discovery count guard in CI (day 1, hours). **S4a — provenance-only slice:** source-item provenance columns, `content_hash`, `first_seen_at`/`last_changed_at`, `snippet_text`+hash so S8's span offsets index a pinned text version, licence ref; enforcement job merged dark with dry-run report only (day 2–4). Enable 3–5 verified-independent live outlets with bound attestation + enable-time acknowledgement + hard per-outlet caps; ingest-continuity CI gate: no >24h gap in successful sync receipts, green required for every later merge (day 3–5). Percent-decode normalization + F8 audit (day 4–5). Manifest additions: reason codes, final URL post-redirect, egress field, dated immutable archive (day 5–6).

**Deletes:** the `lifecycle` column (after the derived view lands). The unused `App.tsx`/harness double-entry — one entry point, not two. The 409 string-coupling. And reclassify B1a/B1b in the changelog from "shipped" to "landed-unreachable" until the console ships; the ledger shouldn't carry the fiction.

**Refuse:** S6 on pure synthetic data. Any new control-plane polish before the continuity gate exists. Retention pruning on real rows before S9 fixtures pass. Embeddings, LLM restatement anywhere near syndication keys, system-written verdicts — already law; the refusal list stays closed.

---

## 6. Endgame

**The single biggest reason this lane never reaches a working disagreement map: the coverage clock never starts.** Every shipped slice governs ingestion — gates, consoles, manifests, sweeps — and the DB holds 10 items after months. A disagreement map over news is a function of continuous, provenance-clean ingestion history; if the clock starts after S9/S10 are built, the map launches empty and stays empty for a quarter while the control plane is polished. S4-as-bundled is the mechanism of death: provenance (which must precede ingest) is held hostage behind retention and lifecycle decisions (which don't), so ingest waits on the slowest irrelevant question.

**The build step that prevents it: split S4a out and start the clock this week** — provenance columns only, first verified-independent live cohort enabled under bound attestation and enable-time acknowledgement with hard caps, and a CI ingest-continuity gate that no later slice is allowed to break. The map is months of evidence plus four slices of code. The code is on schedule. The evidence is at zero, and nothing in §5 as written starts it.
