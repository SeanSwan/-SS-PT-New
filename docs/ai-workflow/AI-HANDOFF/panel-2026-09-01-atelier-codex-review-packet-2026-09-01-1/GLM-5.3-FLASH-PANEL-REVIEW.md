# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 6954 in / 23980 out (reasoning: 20511) | total 30934
**Wall:** 544.9s

---

## VERDICT

REVISE — the falsification discipline is real and rare, but three load-bearing contracts are unverified on live paths (agent-route mass-assignment closure, legacy key-shape enforcement on the unauthenticated permalink, and a self-contradictory index-migration deletion), and the packet's own method demands those be settled before merge.

## BLOCKERS

1. **P1 — Legacy video key shapes silently break public permalinks and permanently lose posters.**
   Scenario: a pre-convention video `MediaAsset` whose `r2Key` does not match `jobs/<jobId>/…` is published and a visitor hits `GET /api/atelier/public/:id` -> `keyOwnedByRow` refuses -> `resolvePublic` returns null -> 404; the same asset completed today has its caller-supplied poster silently dropped with only a `logger.warn`. Yesterday both worked.
   Evidence: packet §7b admits `r2KeyForJob` is dead in production (`videoRenderJobService.mjs:55`) and calls this "the single unquantified risk"; the guard is applied at `publishAsset.resolvePublic`, mounted without auth.
   Reproducible: not from this document — that is the defect; no database has ever been consulted.
   Correction: ship enforcement in audit mode (log-and-allow) behind a flag. Vector: one read-only query against a production replica (or replay of the JS predicate over a dump): count video assets where `r2Key` fails the predicate against its own row; flip to enforce only when the count is 0 or the rows are migrated.

2. **P1 — Mass-assignment closure is asserted nowhere; `...meta` may still write `provenance` and arbitrary columns.**
   Failure mode: POST to the complete route with `r2Key`, `mime`, a valid poster, and `provenance: "<forged>"` plus any other `MediaAsset` column name -> if the spread at `renderAgentRoutes.mjs:176` is not allowlisted, attacker/agent-controlled values land in an integrity field. §2 names **two** writable fields (`posterR2Key` and `provenance`); §3's fix list (a)–(d) validates only the poster. The document is also silent on whether this route requires a <TOKEN> at all — if it does not, this is P0 remote write, not P1.
   Evidence: §2 exposure text vs §3 change list; the asymmetry is in the document itself.
   Test: POST complete with `provenance` and a foreign `ownerUserId` in body; assert columns unchanged (or 400); assert 401 without <TOKEN>.

3. **P1 — §7's three claims are mutually inconsistent; the migration deletion rests on an unverified column-type assumption.**
   Failure mode: if `MediaAssets.created_at` is `timestamptz` (Sequelize `DataTypes.DATE` default), then `created_at::timestamp` in an index expression is a STABLE cast and `CREATE INDEX` **must fail** — so "creates cleanly" cannot be a measurement against the real table. If `created_at` is plain `timestamp`, then `date_trunc(text, timestamp)` is IMMUTABLE, so the original migration was creatable, and a same-type cast collapses to the bare column, so the "expression index" **is** a plain column index that `buildAssetQuery`'s bare `created_at` (`assetLibrary.mjs:140`) does use — "never used" is false and the deletion destroyed a working fix. Under every branch, one stated claim is wrong.
   Evidence: §7 ("Casting only the index (created_at::timestamp) creates cleanly and is then never used"); §0 item 4; §7's own admission that the module header and handoff prescribed the index.
   Reproducible: the deciding fact (column type) is absent from the document.
   Test: `\d+ "MediaAssets"` for the actual type; scratch Postgres: attempt both index variants, then `EXPLAIN` the exact `buildAssetQuery` predicate; restore or permanently kill the migration on measured planner output, not reasoning.

4. **P2 — Adoption asymmetry: `completeJob` binds a key by `(r2Key, ownerUserId)` while the signing guard binds it by `(jobId)` — two different definitions of ownership for one column.**
   Scenario: agent completes job B while supplying job A's key (same owner, agents "supply r2Key freely") -> `findOrCreate where {r2Key, ownerUserId: job.userId}` finds and adopts asset A, stamps B's poster onto it, no 409 — and the signing guard then refuses that key for row A anyway, so the stamp is dead data. The invariant the guard asserts at sign time is never enforced at write time.
   Evidence: §3(a) adds `ownerUserId` but not `jobId` to the where-clause; §2's guard checks `seg[1] === String(row.jobId)`.
   Test: complete job B with `jobs/<A>/…`; assert 409 KEY_COLLISION (include `jobId` in the find or assert on the found path).

5. **P2 — Money-path transaction semantics verified only by fakes; the 409 mapping may be unreachable, and soft-deleted rows may be adopted.**
   Failure mode: two concurrent completes of one job -> both SELECT-miss -> both INSERT; Sequelize `findOrCreate` internally catches `UniqueConstraintError` against the partial index `ma_r2_key_live_uniq` and re-SELECTs inside the transaction, so whether the explicit `err.name === 'SequelizeUniqueConstraintError'` catch ever fires (and whether a foreign/soft-deleted row gets adopted) is exactly where a fake and Postgres diverge. §10 records hitting the wrong unique-error handler as a real past mistake in this very file's domain.
   Evidence: §3 ("fakes end to end… no Postgres has ever run them"), §10.
   Reproducible: unproven either way — that is the gap.
   Test: integration vs real Postgres, `Promise.allSettled` of two completes: assert one 200, one 409-or-idempotent success, exactly one live asset row, and that a replay **without** a poster does not null an existing `posterR2Key`.

6. **P2 — Equal-timestamp cursor pagination can silently drop Compose batch rows; only documented, never evidenced.**
   Failure mode: Postgres `now()`/`CURRENT_TIMESTAMP` is transaction-constant, so all rows of a four-up Compose batch inserted in one transaction share an identical `created_at`; a strict `created_at > cursor` boundary falling inside the batch drops the siblings. §7 acknowledges the class ("mismatch silently drops the rows of a four-up Compose batch") but shows only edited headers/handoffs, no tiebreak implementation or test.
   Evidence: §7 final paragraph; `assetLibrary.mjs:140`.
   Test: seed rows with identical `created_at` spanning a page boundary; paginate with the production query; assert zero drops and zero duplicates (or move to a `(created_at, id)` keyset).

7. **P2 — Binding house-rule violation: ≤300 lines per file.**
   Evidence: §8 table — `videoRenderJobService` at 466 and `rateLimiter` at 357, shipped as "deferrals with reasons." The rule is non-negotiable; a disclosed violation is still a violation.
   Correction: extract the signing/completeJob concern from `videoRenderJobService` and the store from `rateLimiter`; track the cap breach as an owner-sanctioned exception only if the owner explicitly grants one.

## ATTACKS

**Correctness**
- The `attempted >= 2` gate contradicts the packet's own corrected reasoning. If presigning is a local HMAC that cannot fail per-object, then a lone failure on a **single-asset page** is signer-side with certainty — and the gate means the banner can never fire on single-asset pages. The gate and the round-7 reasoning cannot both be the design basis.
- The partial-failure scenario (credential scoped to `atelier/*` refusing clips) cannot manifest as presign failures under the current local-HMAC signer; it produces browser-side 403/404 that no banner logic ever sees. Both the gate and the no-banner-on-partial policy are calibrated to different `readUrl` implementations; semantics float with the injected seam.
- `parseMissingPackages` grouped attribution: any reporter shape where one error block precedes multiple unrelated FAILs converts a real regression into "environment" — the packet's own named worst case. Attribute only when the FAIL file executed zero tests **and** the package is named inside that file's error block; fixture-test canned ANSI reporter outputs, including the grouped shape.
- Exit code 3 is a new contract with unenumerated consumers (CI, push hooks). List them or don't change the code.
- `.nodetest.mjs`: the glob reasoning is actually sound (`*.test.mjs` cannot match it); the real gap is no detector for a **future** `node:test` file accidentally named `*.test.mjs` — vitest collects it, and the rot detector can never see it pass. Add a grep-based drift test for `node:test` imports inside vitest-globbed files. Also: the rot detector watches vitest only, so stale node:test baseline entries are invisible to it forever — feed it `node --test` output too.
- The `invokedDirectly` guard can silently no-op on Windows (drive-letter case, symlinked scripts): `import.meta.url === pathToFileURL(process.argv[1]).href` goes false, the script prints success doing nothing — the precise trap class §10 self-diagnoses. Compare `realpathSync`-normalized paths.
- `pinnedVersion` installs *this checkout's* pinned version into a folder owned by *another checkout's* manifest — a cross-worktree downgrade delivered by a repair script. The untested half of `deps-restore` is the only half with side effects.
- Check 10's whole-body `catch { /* fail-open */ }` swallows its own bugs, and there is no success heartbeat, so "never ran" is indistinguishable from "ran clean." Log "ran, found N" unconditionally. Same for `ownerManifestFor` returning null on an unreadable owner manifest: the dangerous `atRisk` class silently degrades to empty — fail-quiet in exactly the wrong direction.

**Security**
- Chokepoint gap: the guard lives at four call sites, but `generateThumbnailUrl` "presigns whatever key it is handed." Any fifth presign path — present or future — bypasses all four. Move enforcement inside the signer; keep call-site checks only for messaging.
- Route authn on `renderAgentRoutes.mjs:176` is unestablished (see blocker 2). If it accepts requests without a <TOKEN>, everything in §2 is remotely exploitable and this escalates.
- `req.ip` rate limiting is topology-dependent in both bad directions: without correctly configured trust proxy behind a real proxy, all users collapse into one 600/15min bucket (self-DoS of the embed); with naive trust proxy, spoofable <URL> headers defeat it. Pin to the measured deployment and test both.
- 404-vs-502 oracle reasoning is sound (UUIDv4, null-vs-throw separation); residual is a timing side channel — 404 short-circuits while 502 pays a network round-trip — letting a valid-UUID holder distinguish "unpublished" from "storage down." Marginal; document it. Ensure the 502 body carries no upstream detail and is not negatively cached.
- `keyOwnedByRow` coercion: every surprise I can construct (bigint, numeric string, leading zeros) fails **closed**; the dangerous direction requires a job UUID equal to a user integer. Hold the author to his own ask: verify `media_jobs.id` is UUID in every environment, not just this one.
- The new `resolvePublic` refusal log on an unauthenticated endpoint: ensure the logged id/key are structured/escaped — attacker-controlled `:id` in an unstructured log line is log injection.

**Data-truth / schema drift**
- Dual-write residue: §3(b) says the poster previously "belongs to `job.update` — the job, not the asset." If any reader still consumes the job-side poster field, truth now diverges between two columns and the frontend response shape. Grep all readers; delete the job-side write or derive it.
- Soft-delete drift: if `MediaAsset` is paranoid and `ma_r2_key_live_uniq` is partial on live rows, `findOrCreate` can adopt a soft-deleted row with a matching `r2Key` and resurrect stale ownership. Confirm the fakes model the partial predicate.
- Guard refusal and unpublish both collapse to `null` → 404 on the permalink path; the log distinguishes them internally but the wire semantics still conflate "broken" with "unpublished." Keep the public 404 if you must, but emit a distinct internal signal.
- `resolvesFrom`'s 6-level cap: Node itself has no cap; the cap manufactures false "missing" (noise) on deep worktrees. Walk to the filesystem root — the same algorithm Node uses.

## HIGHEST RISK

The legacy-key enforcement (blocker 1): a guard correct by construction, applied to a key format that no production writer enforces, on the only unauthenticated signing path, with both failure modes silent (dead permalink, dropped poster) and zero database evidence behind it — the author says so himself. Cheapest de-risk before ship: replay the `keyOwnedByRow` predicate over a production dump or one read-only replica query counting failing video assets, and ship the guard in audit/log-allow mode behind a flag until that count is zero. That is one query and one boolean; it converts the packet's only admitted unknown into a number.

## CONFIDENCE

Confidence: high on blocker 3's internal contradiction — it follows arithmetically from PostgreSQL's volatility classifications regardless of which branch is real. Confidence: high on the adoption asymmetry (blocker 4) and the single-asset-page banner contradiction; both are visible in the document's own logic.

Uncertainty: I could not execute anything; every finding is document-derived. I could not verify: (a) whether `created_at` is `timestamptz` or plain `timestamp` — one `\d+` output settles blocker 3's branch; (b) whether the complete route authenticates agents and whether `...meta` is allowlisted — one router read and one curl settle whether blocker 2 is P1 or P0; (c) whether the cursor tiebreak was implemented or only documented; (d) Sequelize version and `findOrCreate`-under-partial-index behavior, which needs a real Postgres I do not have; (e) whether the shared `node_modules` on this Windows worktree (`c:/tmp/ss-atelier-v2`) is a symlink or a junction — if `lstatSync` does not report junctions as symlinks in the runtime in use, `ownerManifestFor` returns null and the entire `atRisk` class silently never fires on the platform this code actually runs on; a three-line Node check settles it; (f) the consumers of baseline-gate exit 3.

Per the review-topology rule I have treated the three-seat topology as fixed and do not flag the seat lineup or the builder's authorship as defects; I note only that I cannot see the other two seats' outputs, that eleven slices were solo-reviewed, and that the author's own prior (fabricated findings, proxy-trust errors) was used to weight my skepticism, not to dismiss claims. House rules: the only violation found is the 300-line cap (blocker 7); no PII appears in this packet beyond integer IDs (compliant), and no "yoga/meditation" phrasing or credentials misstatement is present to check. If any of (a) or (b) resolves against the author, the verdict should drop to REJECT.
