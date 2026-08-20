---
decision: SwanGuard continuation — the creator catalog is complete and durable, but nothing connects it to a feed; the next work is the ingestion pipeline and the Netflix/YouTube-style home surface Sean asked for
status: open
supersedes: none
---

# SwanGuard — Continuation Handoff

**Date:** 2026-08-20 · **Outgoing:** Claude Opus 5 · **Linear:** SWA-70
**Predecessor:** `SWANGUARD-CM-CONTINUATION-HANDOFF-2026-08-19.md` — still accurate for §0.3–§0.4 traps, §2 laws, §5 traps, §8 working agreements. **Read that file's §0.3, §0.4, §5.1, §5.3 and §8; they are not repeated here.**

**Do §0 first. It takes four minutes.**

### Staleness legend
`🔒 STABLE` — decisions and laws. `⏳ PERISHABLE` — true at 2026-08-20; re-derive, never quote.

---

## 0. FIRST ACTIONS

### 0.1 🔒 Snapshot. Everything is still uncommitted, in both repos.

Three sessions of work now sit in the working tree with no commit behind any of it. The
guard files in SS-PT are untracked (`??`) — no `git checkout`, no stash entry.

```bash
cd C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom
git diff > ../swanguard-backup-$(date +%Y%m%d-%H%M).patch
mkdir -p ../swanguard-untracked-backup
cp -r apps/web/src/creators ../swanguard-untracked-backup/creators
cp apps/api/src/creatorCatalog*.ts apps/api/src/postgresCreatorCatalog*.ts ../swanguard-untracked-backup/
cp packages/database/migrations/0028_creator_catalog.sql ../swanguard-untracked-backup/

cd C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
mkdir -p ../ss-pt-guard-backup/exposure-set
cp scripts/hooks/db-blast-radius-gate.mjs scripts/lib/blast-radius-analyze.mjs \
   scripts/blast-radius-approve.mjs scripts/hooks/db-blast-radius-*.test.mjs ../ss-pt-guard-backup/
cp -r .ai-workflow/blast-radius ../ss-pt-guard-backup/
cp "C:/Users/BigotSmasher/Desktop/Swan Guard.cmd" "C:/Users/BigotSmasher/Desktop/Swan Guard.cmd.bak-20260817" "C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom/config/owner-seed.json" ../ss-pt-guard-backup/exposure-set/
```

Never `git clean -fd`, `git stash`, `git reset --hard`, or `git checkout -- .` in either repo
without Sean. **The commit decision is Sean's and it is now three sessions overdue** — raise it.

### 0.2 ⏳ Re-run the baseline. Use the repo's OWN aggregate, not a curated list.

```bash
cd C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom
npm test                       # the aggregate — a curated subset hid two red suites once
npm run type-check
npm run build -w @family-first/web
```

| Surface | At 2026-08-20 | Note |
|---|---|---|
| web | 374 passed / 8 skipped | |
| api | 399 passed / **1 pre-existing FAIL** / 3 skipped | `civicOfficialSourcesRoutes.test.ts` — **not ours**, different lane, still red |
| database | 76 / 76 | |
| scripts | 138 / 138 | |
| type-check | exit 0, **5** workspaces | |
| build | exit 0, ~301 KiB raw / ~90 KiB gzip | |

**A mismatch is information, not an error.** The `apps/api` failure is expected — see the row.

---

## 1. 🚨 THE HEADLINE: enabling a creator does nothing, and here is exactly why

**Sean's report (2026-08-20):** *"my creators aren't showing in the main section where all the
stuff is supposed to pop up… I should have a feed dashboard, the main dashboard it's always
looking at by default when the app starts up, and this stuff should pop into it. I wanted it
like Netflix and YouTube combined."*

**He is right, and it is not a bug — it is an unbuilt pipeline.** `[VERIFIED]` this session:

| Question | Answer | Evidence |
|---|---|---|
| What does the Feed tab render from? | `StoryService` → `GET /api/civic/official-sources` → the Federal Register civic-news connector. **Government records.** | `NewsroomShell.tsx:46,64` · `featureDispatchIntelEvidence.ts:33` · `Feed.tsx` blueprint |
| Does anything read the `creator` table to build feed content? | **No.** | `grep -rln creator apps/api/src` returns only auth/dispatch/store/registry files |
| Is there a table for creator videos or streams? | **No — in any migration.** | `grep -riE "create table.*(video\|creator_item\|creator_post\|creator_content)" packages/database/migrations/*.sql` → no match |
| Is there a YouTube/Twitch **content** fetcher? | **No.** Only `scripts/verify-creator-keys.mjs`, which checks credentials and fetches nothing. | grep over `apps/`, `scripts/` |
| Is there a Netflix-style shelf/rail UI? | **No.** `DesktopLedgerRail.tsx` is a wide-screen stats rail for the civic reader, not a media shelf. | its own blueprint header |

**So:** the Creator Manager and the Feed are two disconnected systems. CM1–CM4 built a
catalog — the owner's list of creators, with a law about who may enable them, durably stored.
Nothing was ever built that *reads the enabled set and fetches content*. Turning a creator on
does precisely what it says (marks it enabled, writes an audit event) and nothing more,
because nothing downstream is listening.

**Do not "fix" this by pointing the Feed at the creator table.** There is no content to point
at. The missing piece is an ingestion pipeline, and it is four slices, not one.

### 1.1 What Sean actually asked for, decomposed

> "a feed dashboard… the main dashboard it's always looking at by default… like Netflix and YouTube combined"

That is a **default landing surface** built from **shelves of creator media**, which today has
neither a data source nor a screen. Recommended order — each independently shippable:

| # | Slice | Why this order |
|---|---|---|
| **F1** | Migration `00XX_creator_item` — the content table. `creator_id` FK **on delete cascade**, `platform_item_id` unique per creator, `kind` (upload/short/live/premiere), `title`, `url`, `thumbnail_url`, `duration_sec`, `published_at`, `fetched_at`. **No bodies, no transcripts** (rule: headline + link-out only). | Everything else needs somewhere to put items. Cheapest to get wrong later. |
| **F2** | The fetcher — YouTube Data API `playlistItems` over `uploads_playlist_id` (already stored on every row from CM1), Twitch Helix `videos` + `streams`. **Reads only creators where `enabled = true`.** Owner-triggered first; scheduled later. | Credentials already exist and verify. This is where quota discipline lives. |
| **F3** | `GET /api/feed` — `enabled ∩ profile − snoozed`, then apply the CM3 settings that already exist and are already stored: `daily_cap`, `min/max_duration_sec`, `muted_keywords`, `priority`, `include_*`. | **CM3 shipped the knobs with nothing reading them.** This slice is what makes them mean something. |
| **F4** | The home surface — shelves/rails, thumbnails, "Continue", per-creator rows. Becomes the default section in `sectionRegistry.tsx`. | Last, because until F1–F3 exist it can only be a mock, and a mock home screen is the lying receipt at full size. |

**Design gates for F4** (from the app's own doctrine, not invented here): an empty shelf says
it is empty and never backfills with demo data; thumbnails come from the platform APIs
(no scraping); every item links out rather than embedding a body.

**Quota reality to confirm before F2:** YouTube Data API is 10,000 units/day by default;
`playlistItems.list` is 1 unit per call, ~50 items per call. 40 channels polled hourly is
~960 units/day — comfortable. Twitch Helix is rate-limited per-app by bucket. **Re-derive
these numbers; do not quote this table.**

---

## 2. What shipped in the last two sessions

### CM-probe (2026-08-19) — the default-off law is provable
`scripts/postgres-creator-law-smoke.mjs` + 19 unit tests. `npm run smoke:creator-law:postgres`
(needs `SWANGUARD_ALLOW_POSTGRES_SMOKE=true` + `DATABASE_URL`). Proves the live database
refuses **four** attack classes — born-enabled, direct-update, wrong-actor, and
stale-owner-event (an owner event committed in an *earlier* transaction). The fourth is the
one no text-matching test can reach and the reason the trigger says
`e.at >= transaction_timestamp()`.

### CM4 (2026-08-20) — the catalog is durable
API store (`creatorCatalog.ts`), Postgres impl (`postgresCreatorCatalog.ts`), owner-gated
routes (`creatorCatalogRoutes.ts`), HTTP client (`httpCreatorService.ts`), wired through
`featureStores` / `featureDispatchOwnerOperator` / `runtime`. A toggle survives a reload in
backend mode. **Zero UI files touched** — CM2's interface boundary paid off.

### CM3 (2026-08-20) — per-creator controls
`CreatorSettings.tsx` + `creatorSettingsForm.ts` + `creatorSettings.styles.ts`, opened by a
"Tune" disclosure per row. Priority, daily cap, duration floor/ceiling (**shown in minutes,
stored in seconds** — conversion is exported and round-trip tested), keyword mutes,
include-toggles, notify. **These settings are stored and currently read by nothing** — F3 is
what activates them. That is a known, deliberate ordering, not an oversight.

---

## 3. 🔒 The laws — unchanged, do not relax without Sean

The four laws in the predecessor handoff §2 stand. One addition earned this session:

**5. The actor is derived from the session, never from the request body.**
`enable_creator()` refuses any actor but `'owner'` — but *the database can only check the
string it is handed*. A route doing `enable(id, req.body.actor)` bypasses the law one layer
above the trigger: the DB would refuse a forged `'system'` and accept a forged `'owner'`, and
the audit trail would even say `owner`. The route therefore reads no `actor` field at all —
**absent, not ignored**, so a future edit cannot quietly start honouring one. Test:
`creatorCatalogRoutes.test.ts` posts `{"actor":"system"}` and asserts owner attribution.

**Generalised, and worth carrying to F2/F3:** a guard at layer N protects you from layers N+1
and below. It does not protect you from N-1. When you push enforcement down to make it
unforgettable, the layer above becomes the whole attack surface.

---

## 4. Traps this session paid for

### 4.1 A denylist protects the fields you thought of
`stripProtectedFields` removed `enabled` and passed everything else through, so
`{"title":"HACKED"}` rewrote the record. Worse: the Postgres store was accidentally safe (it
builds SQL from a column allowlist) while the **memory store — the default when no database is
configured** — was not. Two implementations of one contract with different safety properties,
weaker one as the default. Now a shared allowlist (`pickSettings` + `SETTINGS_KEYS`).
**When one contract has two impls, check which is the default; that one defines your real
guarantee.**

### 4.2 Green either side of an untested seam
Route tests ran on the memory store; store tests ran on Postgres. Both green, the wired
combination untested — a `creatorCatalog` never threaded through `createApiApp` would have
passed both. Fixed by a live test driving real routes over the real store, re-read with a raw
query. **This is the second consecutive session where the gap was *between* two verified
things.** Treat any "both halves pass" as unproven until the join is tested.

### 4.3 Swapping an infallible dependency activates dead code
The in-memory creator service could never fail, so `CreatorManager`'s catch branch had never
executed. Wiring in a network-backed service made it live — untested code, activated by
someone who did not write it. **When a swap makes a dead branch reachable, that branch needs a
test even though it is not yours.**

### 4.4 A form that cannot report success
CM3's dirty-check compared against a baseline derived from the `creator` prop. After a
successful save the prop had not changed, so the panel stayed permanently dirty: Save enabled,
Discard offered, no confirmation. The change *had* landed and the UI said it hadn't — the
lying receipt inverted. The baseline must advance on success.

---

## 5. Owner-owed

| Item | Detail |
|---|---|
| **Commit decision** | 🚨 **Three sessions of uncommitted work.** Snapshots exist but are not version control. This is the highest-priority owner action. |
| **Approval `be60fd2c92e5bc61`** | Guard's overclaiming deny message. `cd C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT` then `node scripts/blast-radius-approve.mjs be60fd2c92e5bc61 --reason "honest scope"` |
| **Migration `0028` collision** | The slice registry reserved `0028` for batch graduation (H2.5); CM took it and it is already applied to the live dev DB. `0030` **proposed** for H2.5 — Sean confirms, an agent must not assume. |
| **F1 migration number** | Depends on the above. Do not pick one without resolving `0028` first. |

---

## 6. Key file map (additions since the predecessor)

| Path | What |
|---|---|
| `apps/api/src/creatorCatalog.ts` | Store contract, memory impl, `pickSettings` allowlist, **the actor note** |
| `apps/api/src/postgresCreatorCatalog.ts` | Durable impl. `enable` delegates to `enable_creator()` — must never grow its own `update … enabled` |
| `apps/api/src/creatorCatalogRoutes.ts` | Owner-gated `/api/creators*` |
| `apps/web/src/creators/httpCreatorService.ts` | The durable `CreatorService` |
| `apps/web/src/creators/CreatorSettings.tsx` + `creatorSettingsForm.ts` | CM3 panel + its pure logic |
| `scripts/postgres-creator-law-smoke.mjs` | The law probe |
| `docs/11-slice-registry.md` | CM chain recorded; `0028` collision flagged |

---

## 7. Recommended next slice

**F1 — the `creator_item` table.** It unblocks F2–F4, it is the cheapest thing to get wrong
later, and it is the smallest reviewable unit. Resolve the `0028` collision with Sean before
choosing its number.

**Do NOT start F4 (the home surface) first**, however tempting — until F1–F3 exist it can only
be a mock, and a mocked home screen is exactly the dishonesty the rest of this app has spent
four slices refusing to ship.
