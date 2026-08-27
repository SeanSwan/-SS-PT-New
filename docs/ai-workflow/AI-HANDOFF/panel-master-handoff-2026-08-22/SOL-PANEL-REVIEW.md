# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md
**Seed:** (none)
**Tokens:** 61741 in / 44919 out · **Cost:** ~$0.5540 · **Wall:** 386.4s · **finish:** stop

---

# Severity-ranked review

The record is not an auditable handoff. It mixes two repository states, calls source-text scans proofs, leaves a directly relevant red test unresolved, and schedules bulk activation before the UI, authorization, legal metadata, observability, and downstream path exist.

Exact implementation line numbers cannot be supplied honestly because the document does not identify the changed files beyond three basenames. Use the `rg -n` and `git diff --unified=0` commands below to obtain them. The handoff’s failure to record changed paths and lines is itself part of the proof gap.

## S1 — Blockers

### 1. SwanGuard slice B is not one slice and is not executable

**Location:** handoff §7, slice B; §7 owner-role warning; §10 decision 6; `config/verified-feed-candidates.json`; `apps/api/src/**`; `apps/web/**`.

Slice B says “merge the 107 feeds, enable in batches,” while the same section admits:

- `listStatuses()` cannot enumerate per-outlet connectors.
- `apps/web` cannot represent a `news_rss` `OfficialConnectorKey`.
- The UI has no activation phrase.
- No owner-role user exists.
- `termsUrl` and `ownership` are absent.
- `civicOfficialSourcesRoutes.test.ts:55` is red.
- The 107 records are feed candidates, not necessarily 107 normalized outlets.
- No batch size, canary rule, rollback, rate limit, quota, duplicate-content policy, or failure threshold is defined.

“Both gates are signed, so further outlets are just enable + sync” is false on the document’s own evidence. At minimum, terms metadata, owner identity, listing, activation, and the red route test remain.

“Pre-existing red” is not a waiver. `civicOfficialSourcesRoutes.test.ts` is directly in the surface being expanded.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/SwanGuard-Newsroom

rg -n "listStatuses|OfficialConnectorKey|news_rss|activation|setOwnerEnabled" \
  apps/api apps/web

rg -n '"termsUrl"|"ownership"' config/verified-feed-candidates.json

git ls-files '*civicOfficialSourcesRoutes.test.ts'
npm test -- civicOfficialSourcesRoutes.test.ts
```

Also inspect whether “107 feeds” collapse to fewer outlet/domain/owner identities:

```bash
jq -r '.. | objects | .feedUrl? // empty' config/verified-feed-candidates.json \
  | sed -E 's#https?://([^/]+).*#\1#' | sort | uniq -c | sort -nr
```

**Required decomposition:**

1. B0: resolve the red official-source route test and migration/approval ambiguity.
2. B1: normalize feed versus outlet identity; add terms and ownership.
3. B2: import all records dormant, with row-level invariants.
4. B3: make API listing dynamic and add a full-stack connector-key contract.
5. B4: create a usable owner identity and UI activation path.
6. B5: run one end-to-end canary through the news wiki module.
7. B6: enable bounded batches with rollback and observability.

Bulk enabling before those steps is reckless.

---

### 2. Deleting local taste files does not prove the agent-written taste was deleted from Hermes

**Location:** addendum; §3 commits `b45d12c` and `0b23f7f`; §5 `prompter/export-to-hermes.mjs`; `taste/kept.md`; `taste/loved-srefs.md`.

The addendum says agent-written taste data was “deleted.” The ledger says kept prompts and taste had already been exported to the Hermes brain-vault. Deleting the source Markdown does not necessarily retract prior exported documents. The vault is explicitly not Git, so a Git deletion cannot prove purge.

The document also does not say:

- `export-to-hermes.mjs` was rerun in deletion/reconciliation mode.
- The exporter supports deletion.
- Previously running Prompt Studio/server processes were restarted.
- Generated caches or indexes were invalidated.
- The remaining rejected code, themes, and avoid terms received a provenance audit.

The local generator may now report `kept 0`, while Hermes still returns the three agent-authored exemplars.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/swan-taste-brain
git show 4f4999d:taste/kept.md
git show 4f4999d:taste/loved-srefs.md
git diff 4f4999d b36697e -- taste/ prompter/export-to-hermes.mjs
```

Take a distinctive phrase from each deleted entry, then:

```bash
cd /c<HOME>/Desktop/quick-pt/SS-PT
node scripts/swan-brain.mjs "<distinctive deleted phrase>"
```

Also inspect exporter deletion semantics:

```bash
cd /c<HOME>/Desktop/swan-taste-brain
rg -n "delete|remove|unlink|upsert|document|kept|loved" \
  prompter/export-to-hermes.mjs
```

Until those searches return nothing and a running server is restarted, “deleted” means only “deleted from the current Git worktree.”

---

### 3. §12, which readers are explicitly told to trust first, contains actively stale expected state

**Location:** handoff introduction, addendum, §2.1, §2.2, §3, §9, §12.

The introduction says to read §12 first. §12 expects:

- taste HEAD `4f4999d`
- 38 checks
- SwanGuard HEAD `670dccd`

The addendum says current state is:

- taste HEAD `b36697e`
- 40 checks
- SwanGuard HEAD `ea76189`

§2 still labels the old taste state “VERIFIED THIS TURN.” §3 bolds the old SHA as current. §9 calls already-completed work the first actions. The commit ledger omits both shipped commits.

A new agent following §12 exactly will be told that the correct current state is unexpected. A less careful agent may reset or rebuild completed work.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/swan-taste-brain
git log --oneline -1
node prompter/test.mjs | tail -2

cd /c<HOME>/Desktop/SwanGuard-Newsroom
git log --oneline -1
```

The contradiction is already established by the document; no repository access is needed.

---

### 4. The unauthenticated localhost write API has no recorded browser-origin defense

**Location:** §5; likely `prompter/serve.mjs`; endpoints `POST /api/keep` and `POST /api/rate`.

Binding to `127.0.0.1` does not make unauthenticated mutation safe. A hostile browser page may be able to submit a simple cross-origin request, exploit permissive body parsing, or use DNS rebinding if `Host` and `Origin` are not checked. The response need not be readable for a state-changing request to succeed.

The document treats “must not be exposed off-machine” as the control, but records no enforcement beyond bind address and no CSRF/origin token.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/swan-taste-brain
rg -n "Origin|Host|Access-Control|csrf|token|Content-Type|api/keep|api/rate" \
  prompter/serve.mjs
```

With the server running:

```bash
cp taste/kept.md /tmp/kept.before

curl -i \
  -H 'Origin: https://attacker.example' \
  -H 'Content-Type: text/plain' \
  --data '{"prompt":"DRIVE_BY_SENTINEL"}' \
  http://127.0.0.1:7331/api/keep

diff -u /tmp/kept.before taste/kept.md
```

Also retry with an attacker-controlled `Host` header. If either changes taste state, the “local-only” design is drive-by writable.

---

## S2 — Major defects and false proofs

### 5. The connectorKey tripwire is lexical theater, not a union-exhaustiveness proof

**Location:** addendum; law 2; `apps/api/src/**/officialConnectorKeyUnionSweep.test.ts`; `apps/web/**` `OfficialConnectorKey`.

The addendum claims the tripwire “fails on any new one.” A source-text sweep cannot establish that. Equivalent omissions can be written through:

- an alias of `connectorKey`
- a constant instead of a literal
- `switch`
- `Set.has`
- array `includes`
- object dispatch
- destructuring/renaming
- helper predicates
- normalization before comparison
- a comparison outside `apps/api/src`

The scope is already disproved by the document: `apps/web` lacks `news_rss` entirely. Slice A can therefore be “complete” while the full product still has a stale union.

Law 2 also says “OPEN: nobody has swept deliberately,” contradicting the addendum that the sweep is done.

**Adversarial reproduction:**

```bash
cd /c<HOME>/Desktop/SwanGuard-Newsroom
TEST=$(git ls-files '*officialConnectorKeyUnionSweep.test.ts')
printf '%s\n' "$TEST"
```

Temporarily add a file under `apps/api/src` containing variants such as:

```ts
const k = request.connectorKey;
if (k === "creator_import") return true;

const CREATOR = "creator_import";
if (request.connectorKey === CREATOR) return true;

return new Set(["creator_import"]).has(request.connectorKey);

return Boolean({ creator_import: true }[request.connectorKey]);
```

Run the exact tripwire test. Any passing mutation disproves “any new one.”

The correct control is a single typed dispatch over the complete connector-key union, with an `assertNever`/`satisfies Record<OfficialConnectorKey, ...>` check shared or generated for API and web. A regex test can supplement that; it cannot replace it.

The addendum also records no post-`ea76189` full-suite result. Run:

```bash
npm test
```

The old-head baseline does not verify the new commit.

---

### 6. The kept parser regression proves one exact heading case, not structural Markdown parsing

**Location:** addendum; law 8; likely `prompter/swan-prompt.mjs` and `prompter/test.mjs`; `taste/kept.md`.

The only recorded case is a `## Killed` entry following `## Kept`. Missing cases include:

- `# Killed` or `### Killed`
- `## Rejected`
- repeated `## Kept` sections
- ATX closing hashes: `## Kept ##`
- headings inside fenced code
- `## Killed` text inside a multiline kept prompt
- CRLF input
- empty `## Kept`
- content before the first section
- malformed or duplicate bullets

“Scoped to `## Kept`” may still mean regex slicing, which would violate law 8’s own demand to parse structure.

The failing→passing claim is also not recorded with a broken source revision or test output. Because `b36697e` combines parser, data deletion, and stats changes, reverting the whole commit is not an isolated mutation test.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/swan-taste-brain
git show --name-only --format= b36697e
git diff --unified=0 b36697e^ b36697e -- prompter/
```

Keep the new test but restore only the parser implementation from the parent, then run the test:

```bash
git checkout b36697e^ -- <actual-parser-file>
node prompter/test.mjs
git restore <actual-parser-file>
node prompter/test.mjs
```

Add fenced-heading and alternate-heading fixtures. Also generate across many deterministic seeds and assert that a unique killed sentinel is never emitted, rather than merely asserting a parser count.

The empty-state change needs explicit tests for:

- zero rated codes
- zero kept prompts
- no `NaN` or divide-by-zero weighting
- deterministic seeded generation
- `themes-only` confidence propagation through CLI, server, and ComfyUI
- no stale in-memory taste after file deletion

“40/40” does not identify whether those cases exist.

---

### 7. The `--stats` change relabels a bad metric instead of fixing or removing it

**Location:** addendum; law 7; likely `prompter/swan-prompt.mjs`; `prompter/test.mjs`.

Changing “407 styles” to “article headings 407 (NOT a styles count)” does not make 407 useful. It still does not define:

- whether headings are raw or unique
- which articles
- whether duplicates and navigation headings are included
- why this source-shape count belongs in product stats
- whether existing scripts parse the old human-readable output

The new negative parenthetical is an admission that the metric is misleading. Remove it or expose a precise provenance/debug statistic separately.

**Reproduction:**

```bash
cd /c<HOME>/Desktop/swan-taste-brain
rg -n "407|style handles|article headings|catalog entries|--stats" .
git diff --unified=0 b36697e^ b36697e -- prompter/
rg -n -- "--stats|style handles|article headings" \
  /c<HOME>/Desktop 2>/dev/null
```

If any launcher, test, script, or documentation parses the old text, this was an unversioned output-contract break. The CLI should provide stable JSON for machine consumers and reserve labels for humans.

---

### 8. Taste-brain build order starts with a blocked, noncritical dependency and omits foundation work

**Location:** §6; `docs/PROMPT-STUDIO-SPEC.md`; `prompter/serve.mjs`.

`S0 → S1` puts blocked SREF acquisition ahead of a browser already said to have 9,521 entries. S0 should be parallel or deferred.

More importantly, current server endpoints do not include catalog browsing, search, filtering, lineage, rounds, restore, diff, or suggestions. S1 is not “build a browser”; it first requires API/data contracts, pagination or virtualization, provenance, and safe rendering of third-party content.

S3 is oversized. “Up to 100 rounds” requires decisions about:

- in-memory versus persisted sessions
- stable version IDs
- crash recovery
- concurrent tabs
- branching after restoring an old version
- hand edits and autosave
- maximum enforcement
- schema migration
- deletion/export
- diff normalization

S4 restore/diff cannot be designed independently from S3’s lineage semantics.

S4b is also oversized: “brain and guides,” contextual ranking, randomization, and “realistic and beautiful” need source attribution, ranking rules, deduplication, and an evaluation corpus.

A safer order is:

1. Purge agent data from all stores and test empty-state behavior.
2. Define catalog/search/lineage API contracts and local-origin protection.
3. Build paginated/virtualized browser plus click-to-insert as one thin vertical slice.
4. Define and persist lineage, restore, and branching semantics together.
5. Define a formal deterministic director command subset.
6. Build and evaluate idea ranking.
7. Add model-backed free-language rewriting with secrets, cost, timeout, and injection controls.
8. Pursue missing SREF codes in parallel.

---

### 9. “Rules-first” contradicts the Director box’s plain-language contract

**Location:** §6 items 3–4; §10 decision 2.

The spec promises a plain-language instruction that rewrites the prompt. Arbitrary plain language is not mechanically decidable. “Rules-first; model only when not mechanically satisfiable” leaves unspecified how the system detects satisfiability without misinterpreting the instruction.

A rule engine is appropriate only for a declared command grammar such as:

- remove parameter
- replace artist
- increase/decrease weight
- append subject
- change aspect ratio

For everything else, the product must either:

1. reject the command as unsupported, or
2. use a model with preview/confirmation.

Silently applying approximate rules would corrupt lineage while pretending to honor the instruction. Decision 2 is the clearest wrong recommendation.

---

### 10. SwanGuard W0 and W1 are badly mis-sized and ordered around unresolved decisions

**Location:** §7 slices C–D; §10 decisions 3–5; `intelligenceWiki.ts`.

“Wire news as a third `WikiSourceModule`” is not “one line” unless the module already exists and all contracts are generic. The handoff records no proof for:

- mapping `official_connector_items` into wiki documents
- source IDs and revisions
- idempotency
- deletion/update semantics
- attribution and terms
- retry behavior
- scheduling
- observability
- backfill
- tests

W1 claim extraction cannot start responsibly while decision 3—the target schema—is unresolved. Retention/volume is also not merely a pre-W3 concern: W1 creates stored claims and source text, and 107-feed activation multiplies that volume.

Run one complete news canary through W0 before bulk enabling feeds. Resolve schema, licensing, and retention before W1 writes production-shaped claim data.

---

## Audit of the 12 “laws”

| Law | Defect |
|---|---|
| 1 | `coalesce(excluded.col, table.col)` cannot distinguish omitted from explicitly cleared `NULL`. It makes legitimate clearing impossible. JSON merge order also needs per-field ownership, not the vague “owner state from existing.” The enforceable rule is to preserve omitted fields using presence information. |
| 2 | Internally stale: it says nobody swept, while the addendum says the sweep is done. The lexical tripwire cannot enforce union exhaustiveness, and its `apps/api/src` scope misses the admitted `apps/web` failure. |
| 3 | “Never write `enabled` or `lifecycle` in `DO UPDATE`” is too broad. An explicit owner reconciliation may need to update them. Aggregate enabled/live counts are weak invariants because one row can be enabled while another is disabled with no net count change. Compare row identities and states. |
| 4 | A live run proves behavior in one environment at one time, not “the answer.” It does not replace deterministic database integration tests, migration tests, concurrency tests, or failure injection. |
| 5 | Revert-fail/restore-pass is necessary but not sufficient. The reverted version may fail for an unrelated compile or fixture reason. The test must fail on the intended assertion and pass under an isolated mutation. The parser addendum records no such output. |
| 6 | The 25% exploration floor is an unsupported policy constant, not a law. No evaluation shows 25% is better than 5%, 50%, uncertainty-driven exploration, or per-category exploration. With zero current ratings, its behavior is especially undefined by the record. |
| 7 | Relabeling 407 does not define or justify the metric. There is no schema, provenance, or assertion for what “article headings” counts. |
| 8 | “Never grep text” is false as a general rule; some inputs are unstructured. The actual rule should be “prefer authoritative structured fields when available.” The kept parser may itself still be regex slicing rather than structural Markdown parsing. |
| 9 | This is a disclosure reminder, not an enforceable law. It needs test names and a component-boundary matrix showing which implementations are fake versus live. |
| 10 | “The cold path is the product” is an overcorrection. Both cold and warm paths are product paths. The enforceable requirement is separate cold-start and already-running tests under interactive and redirected stdin. |
| 11 | “Verify” is non-falsifiable without naming an authoritative source and expected failure mode. §12 demonstrates the problem by supplying stale expected SHAs. |
| 12 | “Use an editor” attacks a tool category rather than the defect. Editors can write broken strings too. The enforceable control is structured transforms, atomic writes, diff inspection, syntax validation, and tests. |

The claim that every law corresponds to “a real, reproduced bug” is not supported by reproductions. Laws 6, 9, 11, and 12 are mostly process aphorisms; no failing command, fixture, or revision is supplied.

---

## Open decisions

### Decision 1 — Midlibrary recommendation overclaims and ignores licensing

“Asking Midlibrary” may determine availability, but one email does not “remove the question.” It does not establish:

- redistribution permission
- automated extraction permission
- provenance
- completeness
- update rights
- whether codes are obtainable outside rendered pages

The recommendation should be: obtain an authorized export/API or written permission defining allowed storage and redistribution. A subscription and donation are not a license.

### Decision 2 — Wrong recommendation

Rules-first is incompatible with an unrestricted plain-language rewrite box. Either narrow the UI to a formal deterministic command language or make model-backed interpretation explicit, previewed, and rejectable.

### Decision 3 — Not merely Sean’s product preference

Reusing comment tables versus creating news tables affects schema semantics, retention, source provenance, licensing, migrations, and coupling. Engineering must present concrete schemas and migration consequences. It must be resolved before W1, not left as an abstract fork.

Defaulting to new news-specific tables is safer unless the existing claim tables are genuinely source-agnostic in schema and naming.

### Decision 4 — False P1/P0 binary

Hermes write tools are not the sole prompt-injection risk. A read-only system may still leak copyrighted vault content, secrets, internal paths, or sensitive prompts, or poison later decisions through retrieved text. Capability inventory affects severity but does not create the boundary by itself.

### Decision 5 — Timed too late

Retention and volume are owed before bulk feed activation or W1 extraction, not merely before W3 clustering. Storage begins earlier than clustering.

### Decision 6 — Not a decision

It bundles three unrelated defects:

- approval `be60fd2c92e5bc61`
- migration 0029 numbering
- `civicOfficialSourcesRoutes.test.ts:55`

Each needs an owner, required outcome, and blocking relationship. The red route test should block slice B because it concerns the same official-source activation surface.

---

## Claims marked verified that the recorded evidence does not support

### Live database state

The only command recorded in §12 returns three counts:

- creator
- news sources
- official connector items

It does not prove:

- zero enabled creators
- one live RSS source
- 39 outlets
- NPR content identity
- one state row
- `owner_enabled = true`
- `quota_spent = 1`
- two specific signed gates

**Reproduction of the proof gap:** run the literal §12 query; it cannot emit those facts.

Those claims require explicit queries including row identities and status fields, not aggregate counts.

### SwanGuard test health after `ea76189`

The addendum does not report a full test run after the connector tripwire commit. §12’s baseline belongs to old HEAD `670dccd` and already contains one red API test. Slice A is therefore not recorded as integration-verified.

### “Every one fetched and confirmed live”

A successful probe at an unstated time does not establish that 107 feeds are live now, are genuine publisher feeds, remain parseable, or may legally be ingested. “Verified feed candidate” is a narrower claim than “verified source.”

“Zero overlap” is also undefined: URL overlap, domain overlap, outlet overlap, owner overlap, GUID overlap, or article overlap.

### Missing SREF codes require browser rendering

The evidence described is:

- all 4,016 local API fields are empty
- three live detail API slugs were checked

That supports “the checked API fields were empty.” It does not prove browser rendering is the only acquisition path. Embedded page JSON, another endpoint, an authorized export, or a data partner may exist.

### Generator quality and frequency claims

No evaluation supports:

- “output reads like a practitioner wrote it”
- “realistic and beautiful”
- kept prompts steering “roughly a quarter” of batches
- 123 “on-taste” subjects
- 25% as an appropriate exploration floor

These need a reproducible corpus calculation and human-rated evaluation, not prose.

### “Only S5 spends money”

S0 may involve subscription/export costs or browser acquisition labor; local AI consumes compute; OpenRouter is not the only cost source. The claim is at best “S1–S4b require no paid inference under the current local-data assumption.”

### “Sources are replaceable”

`sources/` being Git-ignored does not make it replaceable. Replacement requires acquisition manifests, upstream locations, versions, checksums, licenses, and deterministic rebuild commands. None are recorded here.

### “Both contract gates are signed, so further outlets are just enable + sync”

The same document says every candidate still needs a real terms URL, no owner user exists, listing is broken, web cannot represent the key, and an official-source route test is red. The conclusion is contradicted by its premises.

---

## Required evidence before either next slice starts

```bash
# Taste: isolate changed files and prove purge
cd /c<HOME>/Desktop/swan-taste-brain
git diff --unified=0 b36697e^ b36697e
git status --porcelain
node prompter/test.mjs
node prompter/swan-prompt.mjs --stats
rg -n "Origin|Host|csrf|token" prompter/serve.mjs

# SwanGuard: identify the tripwire and full-stack key gaps
cd /c<HOME>/Desktop/SwanGuard-Newsroom
git diff --unified=0 ea76189^ ea76189
git status --porcelain
git ls-files '*officialConnectorKeyUnionSweep.test.ts'
rg -n "OfficialConnectorKey|connectorKey|listStatuses|news_rss" apps/api apps/web
npm test

# Directly relevant existing failure
npm test -- civicOfficialSourcesRoutes.test.ts
```

Do not start “merge and enable 107 feeds” until that red test, the legal metadata, outlet normalization, owner path, dynamic listing, full-stack key contract, canary, and rollback policy are resolved.
