---
decision: SwanGuard continuation — F0 landed 2026-08-21 and the catalog now holds Sean's 51 creators, all disabled; the next slice is F2b, a trigger for the fetcher that nothing currently calls
status: open
supersedes: SWANGUARD-FEED-GAP-HANDOFF-2026-08-20.md
---

# SwanGuard — Make It Usable

**Date:** 2026-08-20 · **Outgoing:** Claude Opus 5 · **Linear:** SWA-70
**Sean's goal, in his words:** *"make sure SwanGuard is able to be used — I can pull the videos and start pulling news articles."*

**Read §0 and §1 before touching anything. §1 is the whole point of this document.**

---

## 0. FIRST ACTIONS

### 0.1 🚨 The working tree moved after this work was committed. Verify where you are.

The SwanGuard checkout is on `merge/newsroom-mainline-v2` (tracking `origin/main`) with ~436
modified files. **That branch does NOT contain this session's commits in its history**, though
the files are present in the working tree as uncommitted changes. Someone is mid-merge onto
mainline.

**The committed, pushed, safe source of truth is:**

| Repo | Branch | Head | Contains |
|---|---|---|---|
| SwanGuard | `codex/swanguard-newsroom-recovery-20260801` | `7a4cff6` | CM1-CM4, CM3, F1, F2 |
| SS-PT | `wip/comms-notifications-2026-07-05` | `fadfe26c0` | blast-radius guard + handoffs + packets |

```bash
cd <HOME>/Desktop/SwanGuard-Newsroom
git branch --show-current
git merge-base --is-ancestor b47ea52 HEAD && echo "F2 present" || echo "F2 ABSENT from this branch"
```

**Do NOT check out another branch, stash, or reset without asking Sean** — you would be
discarding someone else's in-progress merge. If you need the committed state, read it with
`git show 7a4cff6:<path>`; do not switch branches to get it.

### 0.2 Re-measure. Use the repo's OWN aggregate, not a curated list.

```bash
cd <HOME>/Desktop/SwanGuard-Newsroom
npm test            # the aggregate — a curated subset once hid two red suites
npm run type-check
npm run build -w @family-first/web
```

Measured on `7a4cff6` (2026-08-20): api **437 passed / 12 skipped / 1 PRE-EXISTING FAIL**
(`civicOfficialSourcesRoutes.test.ts` — not ours, officialConnector lane, red since before
this work began) · web 379/8 skipped · database 88/88 · domain 229/229 · scripts 138/138 ·
type-check exit 0 across **5** workspaces · build exit 0.

**On the current merge branch these numbers will differ.** A mismatch is information.

---

## 1. 🚨 THE HEADLINE: the database has ZERO creators, and nothing puts any in it

`[VERIFIED 2026-08-20]` against the live dev database:

```
creator: 0      creator_item: 0
outlets: 0      news_rss_sources: 0     official_connector_items: 0
official_connector_states: (no rows — no connector has ever been owner-enabled)
```

Sean's 51 follows live in `config/owner-seed.json`. **Only two things read that file:** the
frontend's in-memory service (`apps/web/src/creators/creatorService.ts`) and one test. There
is **no importer** that writes them into the `creator` table.

`grep -rln "owner-seed" --include=*.ts --include=*.mjs apps scripts packages` → two hits,
neither an importer.

### What that means concretely

| Mode | Catalog source | Result |
|---|---|---|
| **Demo** | the JSON, in memory | 51 creators visible, toggles **do not persist** |
| **Backend** | the `creator` table | **EMPTY LIST — nothing to switch on** |

So CM4 made toggles durable *over an empty table*. Everything downstream is correct and
proven and cannot produce a single video, because the pipeline starts with a set that is
empty. This is the true missing link, and it outranks every other item below.

**Do not "fix" this by pointing backend mode at the JSON.** That rebuilds the in-memory
problem CM4 existed to solve. The seed must be imported into the database, once, with every
creator born disabled.

---

## 1b. ✅ F0 IS DONE (2026-08-21, Opus 5) — start at F2b

`[VERIFIED 2026-08-21]` The catalog is no longer empty. Commit `41ed295` on
`merge/newsroom-mainline-v3` (**not pushed** — that branch has no upstream; Sean owns how the
merge resolves). §0.1's branch warning is resolved: the merge completed, and
`git merge-base --is-ancestor b47ea52 HEAD` now reports F2 present.

Live dev Postgres: first run inserted 51, second inserted 0 / updated 51 · 51 unique
identities · **0 enabled** · 51 `added`/`system` audit rows · 40 YouTube channels + 5 Twitch
channels + 6 Twitch game categories, matching the seed exactly.

Run it with:
```bash
cd <HOME>/Desktop/SwanGuard-Newsroom
DATABASE_MODE=postgres DATABASE_URL=<dev> npm run seed:creators -w @family-first/api
```

What landed: `packages/domain/src/creatorSeed.ts` (the mapper, moved out of the web service so
one implementation feeds both consumers; the web keeps a typed pass-through so drift becomes a
compile error), `apps/api/src/creatorSeedImport.ts`, `creatorSeedImportRunner.ts`,
`creatorSeedImportCli.ts`, plus 23 tests including a mutation test and 4 gated live ones.

**Two traps this slice added to §5 — read them before writing any runner:**

- **5.8 — `isDirectExecution` is UNDECIDABLE under vite-node.** vite-node consumes the script
  argument, so `process.argv` is exactly `[node, vite-node/cli.mjs]` and the target path is
  absent entirely — not at argv[1], not at argv[2]. Any path-based self-detection is always
  false, so the runner exits 0 having done nothing, which at a shell is indistinguishable from
  success. The fix is structural: a thin CLI entry file that only the operator invokes, with
  the logic module kept side-effect-free so tests can import it.
  **`npm run retention:command-receipts` still has this bug and is currently inert** — left
  alone deliberately, because fixing it turns a dormant data-purging job live. Sean's call.
- **5.9 — `cmd | tail` reports tail's exit code.** A backgrounded `npm test | tail` said
  exit 0 while the api workspace had a failing suite inside it. Use `PIPESTATUS` when the exit
  code is the thing being claimed.

**Also pre-existing, found here:** `apps/api`'s esbuild step cannot run in this Windows
checkout — `node_modules/esbuild/bin/esbuild` is a Linux ELF binary (installed from WSL). It
fails identically on a one-line file, so it is unrelated to any source change.
`@esbuild/win32-x64` is present, so a targeted reinstall fixes it. Note §0.2's "build exit 0"
baseline was `npm run build -w @family-first/web` — the web build only, which still passes.

### F2b wiring map (traced 2026-08-21 — do not re-derive)

The ingest capability has to reach the route through the existing feature registry. The chain:

| Step | File | What to add |
|---|---|---|
| 1 | `apps/api/src/featureStores.ts` (`FeatureStores`, ~L41 / L79) | a `creatorIngest` capability beside `creatorCatalog` |
| 2 | `apps/api/src/runtime.ts` (~L183, and the factory list ~L319) | construct it from the catalog store + `createPostgresCreatorItemStore` + the platform clients |
| 3 | `apps/api/src/featureDispatchOwnerOperator.ts` (~L20-22) | pass it into `handleCreatorCatalogRoute` |
| 4 | `apps/api/src/creatorCatalogRoutes.ts` | handle `POST /api/creators/ingest` **before** the `parseCreatorPath` branch — that regex would otherwise read `ingest` as a creator id and 404 |

Two safety notes for that route: it is already owner-gated by the `requireRole(user, 'owner')`
at the top of the handler, and it must **not** accept `itemsPerCreator` from the body (a caller
could turn one poll into a full-channel backfill — the catalog's two largest channels carry
~24k videos each). Accept at most an optional `creatorIds` array, which can only narrow, since
`runCreatorIngest` intersects it with the enabled set. Wrap it as an injected runner interface
rather than handing the route the platform clients, so API keys never reach the route layer.

Still owed at F2b: add `creator_item`'s load-bearing columns to `requiredSchemaChecks` in
`packages/database/src/schemaVerification.ts`.

---

## 2. What to build, in order

### F0 — seed importer ✅ DONE 2026-08-21 — see §1b

Import `config/owner-seed.json` into the `creator` table. **Every row born disabled**, which
the database enforces anyway: `creator_reject_enabled_insert` refuses an INSERT carrying
`enabled = true`, so a poisoned seed cannot switch anything on. Idempotent — re-running must
update metadata, never duplicate (`unique (platform, platform_channel_id)` is already there).
`creatorsFromSeed()` in `apps/web/src/creators/creatorService.ts` already does the JSON→row
mapping and deliberately ignores any inbound `enabled`; reuse that shape rather than writing
a second mapper that could drift.

**Gate:** backend mode shows all 51 creators, all off. Sean can switch one on and it sticks
across a reload.

### F2b — trigger the ingest

F2's fetcher works and is proven live, but **nothing calls it**. Add an owner-gated route
(`POST /api/creators/ingest`, mirroring `/api/creators*` in `creatorCatalogRoutes.ts`) and
later a schedule. Also owed here: add `creator_item`'s load-bearing columns to
`requiredSchemaChecks` in `packages/database/src/schemaVerification.ts`, now that a store
reads them.

**Gate:** Sean presses something, and videos appear in the database for his enabled creators.

### F3 — `GET /api/feed`

`enabled ∩ profile − snoozed`, then apply the CM3 settings that are **already stored and
currently read by nothing**: `daily_cap`, `min/max_duration_sec`, `muted_keywords`,
`priority`, `include_uploads/shorts/live/premieres`. This slice is what makes CM3 mean
something.

### F4 — the home surface

Netflix/YouTube-style shelves, and the default landing section in
`apps/web/src/newsroom/sectionRegistry.tsx`. **Build this LAST.** Until F0-F3 exist it could
only be a mock, and a mocked home screen is the lying receipt at full size.

### N1 — the NEWS lane (Sean asked for this too, and it is a separate problem)

The news feed is blank for a different reason than the creator feed was. Schema 0022-0027 is
applied, but:
- `outlets` = 0 and `news_rss_sources` = 0 — the registry was never seeded
- no connector has ever been owner-enabled (`official_connector_states` is empty), and a
  connector is dormant until it is configured, its contract is signed, the owner enables it,
  and it is unsuspended

`httpStoryService.listSources()` reports the connector's ACTUAL state, so the Sources wall
says "dormant" rather than lying — that part is already honest. Remaining acceptance criteria
live in `docs/266-h0-5-hostile-review-corrected-acceptance-matrix.md`; **read its §A first**,
Sean restated criterion 4 and the restatement narrowed what must be proven but did not waive
the owed test. Sean's locality for T1 local news: **Anaheim Hills / Orange County / CA**.

---

## 3. 🔒 The laws — do not relax without Sean

1. **Default-off is absolute.** Every creator is born disabled. `enabled` goes true through
   exactly one route: `enable_creator(id, 'owner', reason)`, which writes an owner-attributed
   `creator_event` and flips the flag in the SAME transaction. Enforced by DB trigger.
2. **The actor comes from the session, never the request body.** The trigger can only check
   the string it is handed. A route doing `enable(id, req.body.actor)` bypasses the law one
   layer above enforcement and still writes `owner` into the audit trail. The routes read no
   `actor` field at all — absent, not ignored.
   **Generalised: a guard at layer N protects layers N+1 and below, never N-1.**
3. **Anything that shapes the feed FILTERS the enabled set; nothing but the owner WRITES to
   it.** Snooze is a read-time `snooze_until` filter — expiry writes nothing. Profiles are
   lenses: `feed = enabled ∩ profile`, so a lens can only subtract.
4. **One protected field, not two.** `creator_item` has no `enabled` column on purpose.
   Visibility derives from the creator. A second flag would need a second fence.
5. **Delete cascades; disable does not.** Disabling is reversible and re-fetching costs
   quota, so cached items survive a disable and the feed simply stops selecting them. A
   future "tidy up on disable" would look like housekeeping and cost a full re-fetch.
6. **Never fabricate to fill a gap.** Empty lanes say they are empty. A failed write never
   renders as success. "Fetched 0 items" and "the fetch threw" must never look the same.
7. **Legal-only acquisition.** Official APIs, publisher RSS, owner-authenticated OAuth. No
   scraping. Headline + link-out; never a stored body, transcript, or caption.
8. **A correct block is answered by fixing the input, never by spending an approval.**

---

## 4. What exists now (all committed at `7a4cff6`)

| Slice | What | Where |
|---|---|---|
| CM1 | schema + the default-off law | `0028_creator_catalog.sql` |
| CM-probe | the law proven on live Postgres, **4 attack classes** | `scripts/postgres-creator-law-smoke.mjs` + 19 tests · `npm run smoke:creator-law:postgres` |
| CM2 | Creator Manager, 4th Newsroom tab | `apps/web/src/creators/CreatorManager.tsx` |
| CM4 | durable catalog: store, Postgres impl, owner-gated routes, HTTP service | `creatorCatalog.ts`, `postgresCreatorCatalog.ts`, `creatorCatalogRoutes.ts`, `httpCreatorService.ts` |
| CM3 | per-creator controls (Tune panel) | `CreatorSettings.tsx` + `creatorSettingsForm.ts` |
| F1 | `creator_item` content table | `0029_creator_items.sql` + 12 contract tests + 7 live |
| F2 | fetcher: pure mapping, upsert, ingest run, real YouTube/Twitch clients | `creatorFetch.ts`, `creatorItems.ts`, `creatorIngest.ts`, `creatorPlatformClients.ts` + 38 tests + a live end-to-end |

**F2 is proven live**, not mocked: real YouTube Data API → real Postgres, three items from a
seeded channel, second run inserted 0 / updated 3, shorts heuristic classified a 24s clip
`short` and a 1908s video `upload`. `npx vitest run src/creatorIngestLive.test.ts` with
`SWANGUARD_ALLOW_POSTGRES_SMOKE=true` and a `DATABASE_URL`.

---

## 5. Traps this workstream paid for

### 5.1 Doubles prove your branching, not the world
Every F2 unit test passed against injected fetch. Only the live run proved YouTube still
returns the field names being mapped. **And a live test that silently `skipIf`s to false
looks exactly like a pass** — the live run finished in 1.12s, which was suspicious for four
API round trips, so it was re-checked by printing what came back. It was real. Validate the
instrument in both directions: this session produced a false POSITIVE from a guard harness
missing a `_repoRoot` stamp, a false "table does not exist" from querying singular table
names when the real ones are plural (`outlets`, `official_connector_states`), and this.

### 5.2 A denylist protects the fields you thought of
`stripProtectedFields` removed `enabled` and let `{"title":"HACKED"}` through. Worse: the
Postgres store was accidentally safe (column allowlist) while the **memory store — the
DEFAULT with no database configured** — was not. When one contract has two implementations,
check which is the default; that one defines your real guarantee.

### 5.3 Green either side of an untested seam
Route tests ran on the memory store, store tests on Postgres, both green, the wired
combination untested. This recurred **three sessions running** in different shapes. Make
"test the join" an explicit round, not something to remember.

### 5.4 Tests do not type-check
A new test broke the build while vitest ran 55/55 green. Tests, type-check and build are
three independent pieces of evidence. This trap is documented in the handoff that preceded
this one, and was walked into one turn after quoting it.

### 5.5 A curated baseline is greener than the repo's own aggregate
A five-command "green baseline" once hid two red suites. Run `npm test`.

### 5.6 The blast-radius guard is repo-relative
It validates against SS-PT's `backend/schema-snapshot.json` (~152 tables). SwanGuard tables
are not in it and never will be. Class B (referential drift) **abstains** for files outside
the snapshot's repo — verified this session in both directions: a SwanGuard migration
abstains, a foreign-repo `DROP` is still caught. Classes A/C/D are universal. If Class B
fires on a SwanGuard file, suspect your harness before the guard.

### 5.7 Migration numbers are assigned at creation, never reserved
The registry had reserved `0028` for batch graduation; the creator catalog took it and was
applied before anyone noticed. `0029` (reserved for reader verdicts) went to `creator_items`
for the same reason: **a gap is worse than a displaced note**, because a later lower-numbered
migration would run after a higher one and `schema_migrations` cannot express that. Reversible
by rename while it is only on the local dev DB — Sean has not ruled on it.

---

## 6. Owner-owed

| Item | Detail |
|---|---|
| **Approval `be60fd2c92e5bc61`** | Text-only fix to the guard's overclaiming deny message. **The agent cannot mint this — that is the design.** `cd <REPO>` then `node scripts/blast-radius-approve.mjs be60fd2c92e5bc61 --reason "honest scope"` |
| **The merge branch** | `merge/newsroom-mainline-v2` has ~436 modified files and does not contain this work's commits. Sean decides how that merge resolves. |
| **Migration `0029` numbering** | Displaced a reservation. Reversible by rename while local-only. |
| **`apps/api` pre-existing failure** | `civicOfficialSourcesRoutes.test.ts`, officialConnector lane, red before this work started, deliberately untouched. |

---

## 7. Key commands

```bash
# creator law, live DB — 4 attack classes
SWANGUARD_ALLOW_POSTGRES_SMOKE=true DATABASE_URL=<dev> npm run smoke:creator-law:postgres

# F1 schema behaviour + F2 end-to-end (F2 spends ~2 YouTube quota units)
cd apps/api && SWANGUARD_ALLOW_POSTGRES_SMOKE=true DATABASE_URL=<dev> \
  npx vitest run src/postgresCreatorItems.test.ts src/creatorIngestLive.test.ts

# migrations (dev DB is not a fixture DB, hence the second flag)
SWANGUARD_ALLOW_POSTGRES_SMOKE=true SWANGUARD_ALLOW_NON_FIXTURE_POSTGRES_SMOKE=true \
  DATABASE_URL=<dev> npm run db:migrate:postgres

# credentials — prints presence and verdict, never a key
node scripts/verify-creator-keys.mjs
```

Dev Postgres is `docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d`, port
`5434`. Credentials live in `docker-compose.dev.yml` and `.env` — **never restate them in a
doc, a commit, or chat.** All three API keys were present and working on 2026-08-20.

---

## 8. Working agreements Sean expects

- **Proof, not assertion.** No "done/fixed/passing" without current-session evidence in the
  same message. Mutation-test any assertion guarding an invariant: break the rule, confirm
  exactly one test fails, revert.
- **Hostile review until it runs dry**, then one confirming round. Each round from a NEW
  vantage — re-reading code is not a round.
- **Plain-English summary first**, technical second.
- **Every command ships with its `cd`.**
- **Say what you did NOT do.** Sean values a named gap over a smooth omission.
- **Never `git add -A`.** Stage explicit paths; other agents share this tree.
- **State an acceptance bar only after measuring the baseline.**

---

## 9. What this session got wrong

| Finding | Fix |
|---|---|
| Reported the catalog "durable" without checking the table had rows. It was durable over an empty set. | §1 — F0 is now the first slice. |
| Built F2's fetcher and nearly closed out with nothing calling it | Split out as F2b rather than marking F2 done with the gap implicit. |
| Wrote a denylist and shipped the weaker of two implementations as the default | Shared allowlist (`pickSettings`). |
| Threw synchronously from a `Promise`-typed method; used `this` in an object-literal method | Both fixed; the interface now fails identically in both implementations. |
| Duration parser returned `0` for "unknown" — `P0D` is how YouTube reports a live stream | Zero total now means unknown. A "min 2 minutes" filter would have excluded every live stream. |
| Queried singular table names and nearly wrote "the outlet table does not exist" into this document | Real names are plural. Third instrument-trust failure in one session. |
| Started F2's live smoke as a `.mjs` that cannot import TypeScript, and wrote workarounds before admitting it | Deleted; used the gated-vitest pattern already established twice in the same session. |
