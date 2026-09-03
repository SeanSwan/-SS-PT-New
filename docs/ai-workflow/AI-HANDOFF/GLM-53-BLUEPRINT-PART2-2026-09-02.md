# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 13319 in / 32707 out (reasoning: 19023) | total 46026
**Wall:** 889.7s

---

> ## ⚠ CRITICAL CORRECTION — READ BEFORE ANYTHING BELOW
>
> The completed portion of this document (including the **C.2 ERD**) specified FKs to `Users` as `UUID`. **That is wrong and would fail at migration time.** VERIFIED against the codebase: `backend/models/User.mjs` declares `id` as `DataTypes.INTEGER`, primaryKey, autoIncrement — and `backend/models/Session.mjs` carries the comment *"Updated to INTEGER to match User.id primary key."*
>
> **Therefore, everywhere in this document, every foreign key to `Users` is INTEGER:**
> - Blueprint C: `external_schedule_sources.owner_id`, `booking_conflict_overrides.trainer_id`, `booking_conflict_overrides.actor_user_id` — **INTEGER**
> - Blueprint C: `booking_conflict_overrides.session_id` → **INTEGER** (Session.mjs's own comment records the INTEGER alignment; C0 prove command below confirms, with a one-line substitution if it returns `uuid`)
> - Blueprint D: `client_comm_drafts.trainer_id`, `client_comm_drafts.client_id`, `client_comm_drafts.decided_by_user_id`, `trainer_notify_prefs.trainer_id` — **INTEGER**
>
> The C.2 ERD's `uuid` markers on those columns are **superseded by this banner**. UUIDs remain only as PKs of *our own new tables* (`external_schedule_sources.id`, `external_schedule_blocks.id`, `booking_conflict_overrides.id`, and D's tables) and in API responses for those entities. Side observation that strengthens the plan: **A.4's diagnosis D-1 (cart FK left behind by the Users INTEGER canonicalization) just became materially more likely** — `ensureNumericCartUser` [F4] is a fossil of exactly that migration. A0 exists to prove it; no change to Blueprint A is needed.
>
> Resume from the truncation point: C.6 was cut mid-`CREATE TABLE`. Full corrected C.6 follows.

---

## C.6 — Migration SQL (complete, corrected, forward + reverse)

Files `[NEW]`:
- `backend/migrations/20261007120000-create-ghost-schedule.mjs` — runner-compatible wrapper exporting `up`/`down` (runner + exact dir pinned by C0; the raw `.sql` files below are the source of truth, so proving never depends on the runner)
- `backend/migrations/sql/20261007120000_ghost_forward.sql`
- `backend/migrations/sql/20261007120000_ghost_reverse.sql`

**Forward** (PostgreSQL 16 [F1]; `gen_random_uuid()` built-in; additive DDL only — no existing row is read or mutated, satisfying constraint 7):

```sql
-- 20261007120000 create ghost schedule — FORWARD
-- FK TYPES (correction banner): owner_id / trainer_id / actor_user_id -> Users(id) = INTEGER
--   (VERIFIED: backend/models/User.mjs — id DataTypes.INTEGER PK autoIncrement)
-- session_id -> Sessions(id) = INTEGER (Session.mjs comment records the alignment).
--   C0 PROVE:
--   psql "$DATABASE_URL" -Atc "SELECT data_type FROM information_schema.columns
--     WHERE table_name='Sessions' AND column_name='id';"   -- expected: integer
--   If it returns 'uuid': change the word INTEGER to UUID on
--   booking_conflict_overrides.session_id ONLY. Nothing else in this blueprint moves.

BEGIN;

CREATE TABLE IF NOT EXISTS external_schedule_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  label                 VARCHAR(120) NOT NULL,
  feed_url_encrypted    TEXT NOT NULL,                 -- AES-256-GCM "iv.tag.ct" base64
  feed_url_host         VARCHAR(255) NOT NULL,         -- display-only; URL never stored in clear
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  import_titles         BOOLEAN NOT NULL DEFAULT FALSE, -- privacy constraint 9: times-only default
  poll_interval_minutes INTEGER NOT NULL DEFAULT 30
                        CHECK (poll_interval_minutes BETWEEN 15 AND 1440),
  last_synced_at        TIMESTAMPTZ,
  last_sync_status      VARCHAR(20) CHECK (last_sync_status IN ('ok','error','partial')),
  last_error_code       VARCHAR(60),                   -- OUR enum codes only (see C.5)
  last_error_message    VARCHAR(500),                  -- whitelisted template text only;
                                                        --   raw upstream text can embed the feed URL
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ghost_sources_owner_label_key UNIQUE (owner_id, label)
);

CREATE TABLE IF NOT EXISTS external_schedule_blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    UUID NOT NULL REFERENCES external_schedule_sources("id") ON DELETE CASCADE,
  external_uid VARCHAR(255) NOT NULL,                  -- instances: "${UID}#YYYYMMDDTHHMMSSZ"
  title        VARCHAR(500),                           -- NULL unless source.import_titles
  starts_at    TIMESTAMPTZ NOT NULL,                   -- UTC
  ends_at      TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  tzid         VARCHAR(64),                            -- original IANA id, retained for re-sync rebase
  all_day      BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ghost_blocks_source_uid_key UNIQUE (source_id, external_uid)
);

CREATE TABLE IF NOT EXISTS booking_conflict_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        Integer NOT NULL REFERENCES "Sessions"("id") ON DELETE CASCADE,
  trainer_id        Integer NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  conflict_snapshot JSONB NOT NULL,
                    -- {sourceLabel, blockExternalUid, blockStartsAt, blockEndsAt,
                    --  bookedStartsAt, bookedEndsAt} — denormalized ON PURPOSE:
                    -- blocks are volatile derived data; an FK to them would
                    -- cascade-delete audit history on every re-sync
  actor_channel     VARCHAR(20) NOT NULL CHECK (actor_channel IN ('app','coach','api')),
  actor_user_id     Integer REFERENCES "Users"("id") ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ghost_sources_owner_idx      ON external_schedule_sources (owner_id);
CREATE INDEX IF NOT EXISTS ghost_blocks_source_start_idx ON external_schedule_blocks (source_id, starts_at);
CREATE INDEX IF NOT EXISTS ghost_blocks_source_end_idx   ON external_schedule_blocks (source_id, ends_at);
CREATE INDEX IF NOT EXISTS ghost_blocks_purge_idx        ON external_schedule_blocks (ends_at);
CREATE INDEX IF NOT EXISTS booking_overrides_session_idx ON booking_conflict_overrides (session_id);
CREATE INDEX IF NOT EXISTS booking_overrides_trainer_idx ON booking_conflict_overrides (trainer_id); -- metrics query (absence-first gap #9)

COMMIT;
```

**Reverse** (run only via the runbook below; drops override audit rows — acceptable pre-traffic; if rows exist, dump first):

```sql
-- 20261007120000 create ghost schedule — REVERSE
BEGIN;
DROP INDEX IF EXISTS booking_overrides_trainer_idx;
DROP INDEX IF EXISTS booking_overrides_session_idx;
DROP INDEX IF EXISTS ghost_blocks_purge_idx;
DROP INDEX IF EXISTS ghost_blocks_source_end_idx;
DROP INDEX IF EXISTS ghost_blocks_source_start_idx;
DROP INDEX IF EXISTS ghost_sources_owner_idx;
DROP TABLE IF EXISTS booking_conflict_overrides;
DROP TABLE IF EXISTS external_schedule_blocks;
DROP TABLE IF EXISTS external_schedule_sources;
COMMIT;
```

**Staging-parity gate (constraint 7, absence-first gap #11) — exact commands, run before production:**

```bash
# 1. Snapshot production schema (read-only) and build a local twin
pg_dump "$PROD_DATABASE_URL" --schema-only --no-owner --no-privileges -f /tmp/prod-schema.sql
createdb ghost_fwd
psql -d ghost_fwd -v ON_ERROR_STOP=1 -f /tmp/prod-schema.sql

# 2. FORWARD -> REVERSE -> FORWARD (idempotency + reversibility proof)
psql -d ghost_fwd -v ON_ERROR_STOP=1 -f backend/migrations/sql/20261007120000_ghost_forward.sql
psql -d ghost_fwd -v ON_ERROR_STOP=1 -f backend/migrations/sql/20261007120000_ghost_reverse.sql
psql -d ghost_fwd -Atc "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('external_schedule_sources','external_schedule_blocks','booking_conflict_overrides');"   # -> 0
psql -d ghost_fwd -v ON_ERROR_STOP=1 -f backend/migrations/sql/20261007120000_ghost_forward.sql
psql -d ghost_fwd -Atc "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('external_schedule_sources','external_schedule_blocks','booking_conflict_overrides');"   # -> 3

# 3. Production gate: dump, then migrate
pg_dump "$PROD_DATABASE_URL" -f /tmp/pre-ghost-$(date +%F).dump
```

Sequelize models mirror this exactly (C1): `backend/models/ExternalScheduleSource.mjs`, `backend/models/ExternalScheduleBlock.mjs`, `backend/models/BookingConflictOverride.mjs` `[NEW]`, with `ownerId: DataTypes.INTEGER`, quoted table names `"Users"`/`"Sessions"`, `timestamps: true` mapping to `created_at/updated_at` on sources only (blocks/overrides use `synced_at`/`created_at` — `timestamps: false` + explicit column defs). Registered in the model index `[path pinned by C0; fallback backend/models/index.mjs]`.

---

## C.7 — Numbered, independently-shippable slices

Deploy order = C0→C1→C2→C3→C4→C5→C6→C7→C8; each is its own PR with its own green tests. Tables exist after C1 but are unused until C5 — production is never mid-slice. `GHOST_CONFLICT_MODE=off` is the shipped default until C6's runbook flips it.

**C0 — Pin audit (read-only). Blocks C1.**
Files: `docs/audit/GHOST-C0.md` `[NEW]`; zero code changes.
Pins, each with file:line or pasted command output: (1) session create route+handler; (2) update/reschedule route; (3) `BulkSessionCreator` write path (API vs direct DB); (4) `Users.id` **and** `Sessions.id` data types (psql output — the C.6 prove command); (5) trainer role values the auth guard checks; (6) migration runner + dir; (7) UMS calendar fetch (endpoint, shape, where TZ conversion happens); (8) frontend test runner — **decision made here: if none exists, C7/C8 add Vitest as a devDependency; no question returns to me**; (9) Coach's write path + how Coach authenticates (maps `actor_channel` to `'coach'` vs `'api'`); (10) trainer timezone source (Users tz column, else env `GHOST_TZ_DEFAULT`); (11) rate-limiter pattern used by `cartMutationLimiter` [F4] (C5 reuses it).
Acceptance: every `[LOCATED-IN-C0]`/`[ASSUMPTION]` in Blueprint C resolves to a path, or is re-listed as still-unknown with the blocking slice named.
Prove: `grep -cE ":[0-9]+" docs/audit/GHOST-C0.md` → ≥ 11.

**C1 — Schema + models. Depends: C0.**
Files: the three C.6 files + three model files + `backend/models/__tests__/ghostModels.test.mjs` `[NEW]`.
Acceptance: forward→reverse→forward green on the local prod-snapshot twin (commands above); app boots with models loaded; a raw insert/delete round-trip honors the UNIQUE constraints (duplicate `(owner_id,label)` rejected).
Prove: the C.6 command block, then `node --test backend/models/__tests__/ghostModels.test.mjs`.

**C2 — Secret box. Ships alone (no C1 dependency).**
Files: `backend/core/lib/crypto/secretBox.mjs` + `secretBox.test.mjs` `[NEW]`.
Acceptance: roundtrip; tampered ciphertext → `{ok:false, code:'DECRYPT_FAILED'}` (never a throw, never a wipe); wrong key → `DECRYPT_FAILED`; key of wrong length fails fast at boot with `GHOST_FEED_KEY_INVALID`; optional `GHOST_FEED_KEY_CHECK` canary value decrypts at boot or sync refuses to start (C.9 #1).
Prove: `node --test backend/core/lib/crypto/secretBox.test.mjs`.

**C3 — iCal library + fixture corpus. Ships alone.**
Files: `backend/core/lib/ical/parseIcal.mjs`, `expandRrule.mjs`, `tzMap.mjs` `[NEW]`; fixtures `backend/core/lib/ical/__fixtures__/` `[NEW]`: `daily-count.ics`, `weekly-byday.ics`, `rrule-unsupported-bysetpos.ics`, `rrule-unsupported-bymonthday.ics`, `unmapped-tzid.ics`, `folded-lines.ics`, `exdate-mixed-tzid.ics`, `status-cancelled.ics`, `rdate.ics`, `allday.ics`, `floating-time.ics`, `dst-spring-la.ics`, `dst-fall-la.ics`, `oversized.ics` (generated by test); tests `parseIcal.test.mjs`, `expandRrule.test.mjs`, `tzMap.test.mjs`.
Acceptance: every fixture in the C.8 matrix produces exactly its coded result; DST fixtures produce the exact UTC instants listed in C.8; unsupported tokens abort with `RRULE_UNSUPPORTED_<TOKEN>` — never a silent partial import.
Prove: `node --test backend/core/lib/ical/`.

**C4 — Sync service + job + CLI. Depends: C1, C2, C3.**
Files: `backend/core/services/ghostSyncService.mjs`, `backend/core/jobs/ghostSyncJob.mjs`, `backend/scripts/ghost-sync-once.mjs`, `backend/scripts/ghost-rotate-key.mjs` `[NEW]`; `ghostSyncService.test.mjs`.
Acceptance: happy-path sync of a locally-served `fixtures/mindbody-sample.ics` inserts expected blocks; **re-sync produces zero uid churn**; stale rows (`synced_at < txStart`) deleted; parse/fetch failure keeps prior blocks and sets a coded `last_error_code`; backoff 2ⁿ cap 60 min; `ETag/If-None-Match` 304 short-circuits; `pg_try_advisory_lock(hashtext('ghost-sync'))` prevents double-run; retention purge removes `ends_at < now()-30d`; DML bounded ≤ 5,000 rows/tx.
Prove: `node --test backend/core/services/ghostSyncService.test.mjs` then, against staging: `node backend/scripts/ghost-sync-once.mjs --source "$SOURCE_ID"` → exit 0 and `psql "$STAGING" -Atc "SELECT last_sync_status FROM external_schedule_sources WHERE id='$SOURCE_ID'"` → `ok`.

**C5 — REST API. Depends: C1 (+ C4 for sync endpoint).**
Files: `backend/routes/ghostRoutes.mjs` `[NEW]` mounted in the routes file [F4], `backend/middleware/requireTrainer.mjs` `[NEW]`, limiters per C0-pinned pattern, `backend/routes/__tests__/ghostRoutes.test.mjs`.
Acceptance: all seven C.4 contracts byte-shape-true, including: every response **provably lacks `feedUrl`/`feed_url_encrypted`**; 401/403 guard chain; label-uniqueness 409; window validation; rate limits.
Prove: `node --test backend/routes/__tests__/ghostRoutes.test.mjs`.

**C6 — Booking-path conflict gate. Depends: C1, C5.**
Files: `backend/core/services/ghostConflictService.mjs` + test `[NEW]`; modify session create/update handlers and bulk write path `[C0 paths]`; env `GHOST_CONFLICT_MODE`.
Acceptance: the C.1 BOOK subgraph exactly — mode `off` never calls the check (spied); `warn` overlap → 201 + `ghostWarning`; `enforce` overlap without `overrideGhost:true` → 409 shape exact; with flag → 201 + `booking_conflict_overrides` row **in the same transaction**; overlap uses strict inequality (touching endpoints clean); all queries owner/trainer-scoped (H3-h).
Prove: `node --test backend/core/services/ghostConflictService.test.mjs` then staging: `curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/api/sessions/$SID" -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "$OVERLAP_BODY"` → `409`.

**C7 — Frontend calendar overlay. Depends: C5.**
Files: `frontend/src/components/Schedule/GhostOverlay.jsx`, `GhostToggle.jsx`, `useGhostBlocks.js`, `ghostStyles.ts` `[NEW]` (+ `.tsx` spelling if C0 pins TypeScript — match repo convention; the decision is made, only the extension is contingent); wired into UniversalSchedule [F7 path from C0]; Vitest tests.
Acceptance: wireframe states LOADING/EMPTY/ERROR exact; fetch parallel to session fetch and sessions render even when ghost fetch fails; toggle persists via `localStorage['ss.ghost.visible']`; every interactive element ≥44×44 px; all colors via `var(--…)` tokens (constraint 2).
Prove: `npx vitest run frontend/src/components/Schedule`.

**C8 — Source manager + conflict modal + rollout + metrics. Depends: C7.**
Files: `frontend/src/components/Schedule/GhostSourceManager.jsx`, `GhostConflictModal.jsx` `[NEW]` + tests; `docs/runbooks/ghost-rollout.md` `[NEW]`; `backend/scripts/ghost-metrics.mjs` `[NEW]`.
Acceptance: every state in the C.3 source-manager wireframe renders (synced / failing with coded error copy / add / edit / delete-confirm / URL-error); "Book anyway" re-POSTs with `overrideGhost:true`; runbook steps: deploy C6 with `off` → flip `warn` for 24 h while watching `ghost-metrics` → flip `enforce`; metrics script emits the four numbers from absence-first gap #9.
Prove: `npx vitest run frontend/src/components/Schedule/GhostSourceModal.test.jsx && node backend/scripts/ghost-metrics.mjs --since 7d`.

---

## C.8 — Test matrix (RRULE fixture and DST boundary included verbatim)

**The two load-bearing fixtures, in full:**

`backend/core/lib/ical/__fixtures__/dst-spring-la.ics` — *the case rrule.js gets wrong by construction (H3-a): recurrence defined in local wall time, crossing US spring-forward **Sun 2026-03-08** (2:00→3:00 PST→PDT).*

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SwanStudios//GhostSync Fixture//EN
BEGIN:VTIMEZONE
TZID:America/Los_Angeles
BEGIN:STANDARD
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
TZNAME:PST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:fixture-dst-0001@sswanstudios
DTSTART;TZID=America/Los_Angeles:20260306T090000
DTEND;TZID=America/Los_Angeles:20260306T100000
RRULE:FREQ=DAILY;COUNT=6
SUMMARY:Gym floor shift
END:VEVENT
END:VCALENDAR
```

Assert (exact UTC instants): 2026-03-06T17:00Z, 2026-03-07T17:00Z (PST), **2026-03-08T16:00Z** (PDT — 9:00 wall time survives the skipped hour), 03-09…03-11T16:00Z. **Anti-assert: no instance at 17:00Z on 2026-03-08** — that is the UTC-arithmetic failure signature; its absence is the proof luxon wall-time iteration is actually in the path. Companion `dst-fall-la.ics` (DTSTART 20261030T090000, COUNT=4, crossing fall-back Sun 2026-11-01): asserts 10-30/10-31 → 16:00Z, **11-01 → 17:00Z**, 11-02 → 17:00Z.

`backend/core/lib/ical/__fixtures__/weekly-byday.ics` — *the MindBody shift-pattern case [F11]:* `DTSTART;TZID=America/Los_Angeles:20260106T090000` (a Tuesday) with `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6`. Assert: first occurrence **2026-01-07** (DTSTART itself does not match BYDAY and is not emitted), sixth = 2026-01-19, exactly 6 instances, all at 17:00Z.

**Matrix:**

| File `[NEW]` | Asserts | Fixture |
|---|---|---|
| `parseIcal.test.mjs` | Unfolds RFC 5545 folded lines (CRLF + space/tab) before field parse | `folded-lines.ics` |
| 〃 | `RRULE:FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR` → abort, code `RRULE_UNSUPPORTED_BYSETPOS` (token named), **zero instances emitted** | `rrule-unsupported-bysetpos.ics` |
| 〃 | `BYMONTHDAY`/`BYMONTH` → `RRULE_UNSUPPORTED_BYMONTHDAY`/`_BYMONTH` | `rrule-unsupported-bymonthday.ics` |
| 〃 | `TZID:Custom/Corp-HQ` → `UNMAPPED_TZID`, source-level fail-safe | `unmapped-tzid.ics` |
| 〃 | Two VEVENTs, same UID, second `STATUS:CANCELLED` → UID skipped (stale-deletion semantics) | `status-cancelled.ics` |
| 〃 | `RDATE` adds a one-off instance outside the pattern; each instance gets `UID#YYYYMMDDTHHMMSSZ` | `rdate.ics` |
| 〃 | `VALUE=DATE` all-day → `allDay:true`, date-bounded instants in feed tz, `ends_at` = next midnight (exclusive) | `allday.ics` |
| 〃 | Floating DTSTART (no TZID) → trainer-local interpretation via `GHOST_TZ_DEFAULT` | `floating-time.ics` |
| 〃 | Body > 2 MB → `BODY_TOO_LARGE` **before** parse | generated 3 MB buffer |
| `expandRrule.test.mjs` | DST spring/fall instants + anti-assert exactly as above | `dst-spring-la.ics`, `dst-fall-la.ics` |
| 〃 | BYDAY weekly semantics, COUNT, INTERVAL=2, `UNTIL` inclusive-boundary | `weekly-byday.ics` + inline |
| 〃 | `EXDATE;TZID=America/New_York:20260106T120000` removes the 09:00-LA instance on that date (instant **or** wall-time match — producers emit mixed TZIDs) | `exdate-mixed-tzid.ics` |
| 〃 | `COUNT=1000000` within window → abort `EXPANSION_OVERFLOW` at 5,001st | inline |
| 〃 | Expansion window strictly `[now-14d, now+60d]`; UIDs stable across two calls (no churn) | inline |
| `tzMap.test.mjs` | `"W. Europe Standard Time"→Europe/Berlin`, `"Eastern Standard Time"→America/New_York`, miss → fail-safe | inline table |
| `secretBox.test.mjs` | Roundtrip; tamper → `DECRYPT_FAILED`; wrong key → `DECRYPT_FAILED`; no throw escapes | inline |
| `ghostSyncService.test.mjs` | Re-sync of identical feed: `count(*)` unchanged, uid set identical, `synced_at` advanced (no flicker, H3-f) | local HTTP server + `mindbody-sample.ics` |
| 〃 | Rows absent from new feed but `synced_at ≥ txStart` survive; only pre-txStart rows deleted | mutated fixture |
| 〃 | `PARSE_FAILED` mid-sync → transaction rolls back, prior blocks intact, coded `last_error_code` set | corrupted fixture |
| 〃 | HTTP 500 streak → `consecutive_failures` 1,2,3 → alert emitted at 3; backoff 2,4,8… capped 60 min | mock fetch |
| 〃 | `ETag` replay → 304, no parse, `last_synced_at` still advanced | mock fetch |
| 〃 | Purge deletes `ends_at < now()-30d` only | seeded rows |
| `ghostConflictService.test.mjs` | Strict overlap: block [10:00,12:00) vs booking [12:00,13:00) → clean; [11:59,13:00) → conflict | inline |
| 〃 | Multi-source union; owner scoping (trainer A never sees trainer B's blocks, H3-h) | seeded |
| 〃 | Mode matrix: `off` (service never called — spy), `warn` (201+warning), `enforce` (409 / 201+audit row); `actor_channel` maps app/coach/api per mock identity | inline |
| `ghostRoutes.test.mjs` | Response JSON **string-contains no `feedUrl`** on any endpoint; 401/403; 409 `LABEL_EXISTS`; `WINDOW_TOO_LARGE` at 63 d; limiter trips | supertest-style via app export [C0] |
| `ghostSyncJob.test.mjs` | Advisory lock: second concurrent pass exits without syncing; due-check honors interval+jitter | mocked clock |
| `GhostOverlay.test` / `GhostSourceManager.test` / `GhostConflictModal.test` | States per wireframes; toggle persistence; error banner leaves sessions rendered; buttons ≥44 px; "Book anyway" re-POST carries `overrideGhost:true` | Vitest + pinned runner |

---

## C.9 — Production failure modes & guards (five; ≥ three required)

1. **`GHOST_FEED_KEY` lost or rotated without re-encryption** → every source decrypt fails; a naive sync would wipe all blocks (calendar empties — the exact "ghost schedule silently disappears" catastrophe). *Detection:* `DECRYPT_FAILED` codes on all sources; boot-time canary. *Guard:* fail-safe semantics (decrypt failure never deletes); boot check `GHOST_FEED_KEY_CHECK` — sync loop refuses to start on mismatch and logs `GHOST_KEY_MISMATCH`; `backend/scripts/ghost-rotate-key.mjs` does dual-key read → re-encrypt → verify → flip; runbook `docs/runbooks/ghost-key-rotation.md` `[NEW, ships in C4]`. *Blast radius if unguarded:* total ghost-calendar loss, double-books resume silently.
2. **Gym regenerates/revokes the subscribable link** (MindBody staff links are revocable; the F11 gotcha implies link churn is normal) → 401/404 streak. *Detection:* `consecutive_failures ≥ 3`. *Guard:* email alert to trainer + amber UI chip with copy "That link stopped working — paste a fresh one (staff login, not owner)"; prior blocks kept and `last_synced_at` frozen so the UI honestly shows "Synced 3d ago"; **no deletion on any fetch error, ever.** *Blast radius:* silent staleness → false confidence in free slots.
3. **Render scales past one instance** → two sync loops, double polling, double alerting; same class threatens the draft-expiry loop and money canary. *Detection:* sync-pass overlap in logs; duplicate `draft_notifications`. *Guard:* `pg_try_advisory_lock` with distinct keys (`ghost-sync`, `draft-notify`, `draft-expiry`, `money-canary`) around each pass; non-holders skip; tested in C4/C8. *Blast radius:* rate-limit bans against the gym's calendar host, duplicate texts to Sean.
4. **Hostile or degenerate feed self-DOS** (`COUNT=1000000`, 50 MB body, pathological RRULE) → dyno wedged → the whole app down, not just the calendar. *Detection:* sync-pass duration alarm. *Guard:* 2 MB body cap enforced on the stream (not after buffering), 15 s timeout, 5,000-occurrence abort with `EXPANSION_OVERFLOW`, ≤5,000 DML rows/tx, circuit-break at 3 consecutive failures with backoff cap 60 min. *Blast radius:* full-outage of the money path — the worst possible failure launched by a calendar feature.
5. **Privacy regression: employer's client names leak** into SwanStudios UI or logs via imported titles or raw upstream error text. *Detection:* C.8 route test asserting no `feedUrl` anywhere; parser test asserting raw HTTP error bodies are never persisted. *Guard:* `import_titles` default OFF with per-source opt-in + confirm copy; titles truncated to 500; `last_error_message` populated **only** from whitelisted templates keyed to our error codes — upstream text can embed the capability URL (H3-e); UI renders "Busy" for untitled blocks. *Blast radius:* constraint-9 breach + Sean's B2B relationship damage — the one failure that can cost him the gym contract itself.

---

# DELIVERABLE 3 — BLUEPRINT D: THE APPROVAL BRIDGE (FULL)

**Scope:** client-communication drafts (composed by Sean in-app, or by Coach/Hermes via relay) are held as `pending_approval`; Sean is notified (email always; Telegram via Hermes relay when enabled; SMS via no-op adapter until Open Question 1); a decision from **either door** — app or Telegram — resolves the draft exactly once through a single guarded `UPDATE`. Nothing in D depends on miniswan or the 5090's power state (H6/H7); Hermes only needs outbound HTTPS.

**Decisions made here (zero return to builder):** idempotency = the draft's own state machine (`UPDATE … WHERE id=$1 AND status='pending_approval' AND notified_at > now()-interval '48 hours'`); decisions valid only on pending drafts tethered to a real outbound notification ≤ 48 h old; expiry at 7 days; delivery on approval = client email **plus** in-app message if D0 finds an existing message API, else email-only with the stored draft as the record; quiet hours default 08:00–20:00 trainer-local (queued, never dropped); resend cooldown 10 min; digest option default off; Telegram text PII-free by construction; one shared `RELAY_TOKEN` v1 with rotation runbook; `short_id` = `crypto.randomBytes(6).toString('base64url')` (10–12 chars, unique index, collision → regenerate).

## D.1 — Runtime flow

```mermaid
flowchart TD
  subgraph CREATE["Draft creation (two doors in)"]
    A1["Trainer composes in app"] -->|"POST /api/drafts — protect, requireTrainer, draftMutationLimiter"| S1[("client_comm_drafts: status=pending_approval, notified_at=NULL")]
    A2["Coach / Hermes (5090 or anywhere)"] -->|"POST /api/internal/relay/drafts — relayAuth bearer token, relayLimiter"| S1
  end
  S1 --> N0{"notify job (advisory-locked 'draft-notify')"}
  N0 -->|"in quiet hours 20:00–08:00 trainer-local"| Q1["queue → send at 08:00 (draft_notifications: queued_quiet; UI chip 'Queued — sends 8:00 AM')"]
  N0 -->|"trainer notified < 10 min ago"| Q2["hold until cooldown expires (queued_cooldown)"]
  N0 -->|"ok"| E1["email via SendGrid to trainer (full body — trainer is the recipient)"]
  N0 -->|"ok AND RELAY_ENABLED"| T1["POST {RELAY_URL}/notify — PII-free text + Approve/Reject + deep link"]
  N0 -->|"SMS_PROVIDER=noop"| S0["log only; UI badge 'SMS not configured'"]
  E1 --> NR[("draft_notifications rows: channel, status, provider_ref")]
  T1 --> NR
  NR --> S2["draft.notified_at = now() — starts the 48 h decision tether"]
  S2 --> DEC{"decide (two doors out)"}
  S2 -->|"App: POST /api/drafts/:id/decide — protect, requireTrainer"| G["UPDATE client_comm_drafts SET status, decided_at, decided_channel, decided_by_user_id WHERE id=$1 AND status='pending_approval' AND notified_at > now()-48h"]
  S2 -->|"Telegram button → Hermes → POST /api/internal/relay/decide — relayAuth"| G
  G -->|"rowCount = 1"| W["winner: approved | rejected (first writer wins; race-safe)"]
  G -->|"rowCount = 0"| R["re-read: same final state → 200 alreadyApplied:true · pending-but-stale → 410 DRAFT_STALE · other → 409 DRAFT_NOT_PENDING"]
  W -->|"approved"| DL["delivery job: client email (+ in-app if D0 pins a message API); idempotent on delivered_at + provider idempotency key"]
  W -->|"rejected"| X["terminal; rows retained 90 d"]
  DL --> M["delivered_at=now(); metrics: created→notified, notified→decided, decided→delivered"]
  subgraph BG["Background (each advisory-locked)"]
    B1["expiry job: pending > 7 d → expired"]
    B2["anomaly monitor: >5 decisions/hour → email Sean + APPROVAL_ANOMALY"]
    B3["delivery retry: 2^n backoff cap 30 min; badge on failure"]
  end
```

## D.2 — ERD (correction applied: all Users FKs INTEGER)

```mermaid
erDiagram
    "Users" ||--o{ client_comm_drafts : "trainer_id (approver) INTEGER"
    "Users" ||--o{ client_comm_drafts : "client_id (recipient) INTEGER"
    "Users" ||--o{ client_comm_drafts : "decided_by_user_id INTEGER SET NULL"
    "Users" ||--o{ trainer_notify_prefs : "trainer_id INTEGER"
    client_comm_drafts ||--o{ draft_notifications : "draft_id ON DELETE CASCADE"

    client_comm_drafts {
        uuid id PK "gen_random_uuid()"
        varchar_12 short_id UK "PII-free, Telegram-visible"
        integer trainer_id FK "NOT NULL -> Users(id) CASCADE"
        integer client_id FK "NOT NULL -> Users(id) CASCADE"
        varchar_20 kind "CHECK message,checkin,session_note — v1 UI: message"
        varchar_200 subject "NULL"
        text body "NOT NULL <=4000 chars"
        jsonb deliver_channels "NOT NULL default app,email"
        varchar_24 status "CHECK pending_approval,approved,rejected,expired"
        varchar_20 created_by "CHECK trainer,coach,api"
        varchar_60 idempotency_key "NULL — relay replay guard, partial UNIQUE"
        timestamptz notified_at "NULL — tether start"
        integer notify_attempts "NOT NULL DEFAULT 0"
        varchar_20 decided_channel "CHECK app,telegram,sms,api NULL"
        integer decided_by_user_id FK "NULL SET NULL"
        timestamptz decided_at "NULL"
        timestamptz delivered_at "NULL — delivery idempotency"
        varchar_60 delivery_error_code "NULL our codes only"
        timestamptz expires_at "NOT NULL DEFAULT now()+7d"
        timestamptz created_at "NOT NULL DEFAULT now()"
    }
    draft_notifications {
        uuid id PK
        uuid draft_id FK "NOT NULL CASCADE"
        varchar_20 channel "CHECK email,telegram,sms"
        varchar_120 recipient_hint "masked only e.g. s***@g***.com"
        varchar_24 status "CHECK sent,failed,queued_quiet,queued_cooldown,skipped"
        varchar_255 provider_ref "NULL"
        timestamptz created_at "NOT NULL DEFAULT now()"
    }
    trainer_notify_prefs {
        integer trainer_id PK "FK -> Users(id) CASCADE"
        varchar_5 quiet_start "NOT NULL DEFAULT 20:00 trainer-local"
        varchar_5 quiet_end "NOT NULL DEFAULT 08:00"
        boolean digest_daily "NOT NULL DEFAULT false"
        varchar_64 tz "NOT NULL DEFAULT from TRAINER_TZ_DEFAULT env"
        timestamptz updated_at "NOT NULL DEFAULT now()"
    }
```

Indexes: `drafts_short_id_key UNIQUE(short_id)`; `drafts_trainer_status_idx(trainer_id, status)`; `drafts_client_idx(client_id)`; partial `drafts_idem_key UNIQUE(trainer_id, idempotency_key) WHERE idempotency_key IS NOT NULL`; partial `drafts_pending_idx ON (notified_at) WHERE status='pending_approval'`; `draft_notif_draft_idx(draft_id)`; `draft_notif_created_idx(created_at)`.

## D.3 — Wireframes

**Desktop ≥1024 — Approvals inbox (all states):**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ SWAN STUDIOS — APPROVALS     Pending (2)                    SMS: not set ⚠      │ ← amber chip; tooltip
│ [Pending 2][Approved][Rejected][Expired]     Notify: (●) Immediate ( ) Digest   │   "Wire texting — Q1"│
│ ──────────────────────────────────────────────────────────────────────────────│
│ LOADING: 3 skeleton cards (Ice Wing @0.15 shimmer)                             │
│ EMPTY:  "Nothing waiting — you're caught up."                                  │
│ ┌──────────────────────────────────────────────────────────────────────────┐   │
│ │ #K3QX7Z2P · message · client #214                    received 12:41 PM   │   │
│ │ "Can we move Thursday to 6pm? Also loved the last plan — the…" (280 ch)   │   │
│ │ Notified 12:41 PM · via Email + Telegram · tether closes Wed 12:41 PM    │   │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐                                 │   │
│ │ │ ✔ Approve │ │ ✕ Reject  │ │ View draft│  ← each min-height 44px;        │   │
│ │ └───────────┘ └───────────┘ └───────────┘    Approve purple/cyan glow     │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│ QUEUED state:   chip "Queued — sends 8:00 AM" (Gilded Fern on Obsidian)        │
│ DECIDED state:  chip "Approved 12:44 PM · via Telegram · Delivered 12:44 PM"   │
│ DELIVERY-FAILED: "Client email bounced (EMAIL_BOUNCE)  [Retry] [View]" 44px    │
│ STALE state:    chip "Tether expired — draft can no longer be approved"        │
│ ERROR state:    banner "Couldn't load approvals [Retry]" — nav badge persists  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Draft detail modal (shared desktop/mobile content):** full subject/body, client #, timeline (created → notified → decided → delivered), Approve/Reject pinned at bottom (44px), SUBMITTING disables both with spinner, ERROR shows inline + Retry.

**Mobile 375 — inbox + the Telegram door (part of the product surface):**

```
┌───────────────────────────┐        ┌───────────────────────────┐
│ ‹ Approvals      Pending 2│        │ SwanStudios Approvals  bot│
│ (●) Immediate  ( ) Digest │        │ ┌───────────────────────┐ │
│ ┌───────────────────────┐ │        │ │ Draft K3QX7Z2P        │ │
│ │ #K3QX7Z2P · client 214│ │        │ │ message · client #214 │ │ ← PII-free by
│ │ "Can we move Thu…"    │ │        │ │ — approve?             │ │   construction:
│ │ 12:41 PM   [✔][✕] 44px│ │        │ │ [ Approve ] [ Reject ] │ │   no names, no
│ └───────────────────────┘ │        │ │ View → sswstudios.com/ │ │   emails, no body
│ ┌───────────────────────┐ │        │ └───────────────────────┘ │   leaves SwanStudios
│ │ #M8WD4RT · client 187 │ │        │ bot reply: "Approved ✓    │   except to final
│ │ Queued — sends 8:00 AM│ │        │  K3QX7Z2P"                │   recipient
│ └───────────────────────┘ │        └───────────────────────────┘
└───────────────────────────┘
```

**Telegram failed / Hermes down:** bot silent; email still arrived; app door unaffected — Telegram is a convenience door, never a dependency (D.7 #5).

## D.4 — API contracts (guard chains exact)

Trainer router `backend/routes/draftRoutes.mjs` `[NEW]`, mounted `/api/drafts` in the F4 mount file. Relay router `backend/routes/relayRoutes.mjs` `[NEW]`, mounted `/api/internal/relay` — **the relay token is valid on exactly these two routes and nothing else, by router construction.**

1. **`GET /api/drafts?status=&limit=&cursor=`** — `protect, requireTrainer` → `200 {"drafts":[{id, shortId, clientId, clientName, kind, subject, bodyPreview, status, createdAt, notifiedAt, decidedAt, decidedChannel, deliveredAt, deliveryErrorCode}]}` (owner = `trainer_id` = auth user) · `401 UNAUTHENTICATED` · `403 FORBIDDEN`.
2. **`GET /api/drafts/:id`** — `protect, requireTrainer` → `200` full draft incl. body · `404 NOT_FOUND` (owner-scoped — another trainer's id 404s, never leaks).
3. **`POST /api/drafts`** — `protect, requireTrainer, draftMutationLimiter [30/h/user]`. Body `{clientId:int, kind="message", subject?:str(≤200), body:str(1..4000), deliverChannels?:["app","email"]}` → `201` draft shape · `400 VALIDATION {fields[]}` · `404 CLIENT_NOT_FOUND`.
4. **`POST /api/drafts/:id/decide`** — `protect, requireTrainer, draftDecideLimiter [60/h/user]`. Body `{decision:"approve"|"reject"}` → `200 {draft, alreadyApplied?:true}` · `409 {"error":"DRAFT_NOT_PENDING","status":cur}` · `410 {"error":"DRAFT_STALE","hint":"Re-notified? no — compose fresh"}` · `404`.
5. **`GET/PUT /api/drafts/prefs`** — `protect, requireTrainer`. GET → `{quietStart:"20:00", quietEnd:"08:00", digestDaily:false, tz}`; PUT same shape → `200` · `400 VALIDATION`.
6. **`POST /api/internal/relay/drafts`** — `relayAuth, relayLimiter [30/h]`. `relayAuth` = constant-time Bearer compare vs `RELAY_TOKEN`, else `401 {"error":"RELAY_UNAUTHORIZED"}`. Body `{trainerId:int, clientId:int, kind, subject?, body:str(≤4000), createdBy:"coach"|"api", idempotencyKey?:str(≤64)}` → `201 {draftId, shortId}` · replay with same `(trainerId, idempotencyKey)` → `201` **same draftId** (H4 idempotency) · `404 TRAINER_NOT_FOUND|CLIENT_NOT_FOUND` · `400` · `429 RATE_LIMITED`.
7. **`POST /api/internal/relay/decide`** — `relayAuth, relayLimiter`. Body `{shortId, decision:"approve"|"reject"}` → `200 {status, alreadyApplied?:true}` · `404` · `409` · `410 DRAFT_STALE` (tether: `pending_approval` **and** `notified_at > now()-48h` — a replayed approval of a stale draft dies here).
8. **Outbound SS→Hermes (Hermes side honors this contract):** `POST {RELAY_URL}/notify`, `Authorization: Bearer <same token>`, body `{shortId, kind, clientNum:int, deepLink:"https://sswanstudios.com/approve/{shortId}"}` — 5 s timeout, 3 retries, then `draft_notifications.status='failed'`; buttons callback to `POST /api/internal/relay/decide`.

Decision SQL (both doors, one code path — `draftService.decide`):

```sql
UPDATE client_comm_drafts
   SET status=$decision, decided_at=now(), decided_channel=$channel,
       decided_by_user_id=$uid        -- NULL for the telegram door
 WHERE id=$1 AND status='pending_approval'
   AND notified_at > now() - interval '48 hours'
RETURNING *;   -- rowCount 0 → re-read for idempotent 200 / 409 / 410
```

## D.5 — Migration SQL (forward + reverse, correction applied)

Files: `backend/migrations/20261007130000-create-approval-bridge.mjs` + `backend/migrations/sql/20261007130000_approval_forward.sql` / `..._reverse.sql` `[NEW]`. Same pre-dump and forward→reverse→forward gate as C.6, verbatim.

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS client_comm_drafts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id           VARCHAR(12) NOT NULL,
  trainer_id         Integer NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  client_id          Integer NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  kind               VARCHAR(20) NOT NULL DEFAULT 'message'
                       CHECK (kind IN ('message','checkin','session_note')),
  subject            VARCHAR(200),
  body               TEXT NOT NULL CHECK (char_length(body) <= 4000),
  deliver_channels   JSONB NOT NULL DEFAULT '["app","email"]'::jsonb,
  status             VARCHAR(24) NOT NULL DEFAULT 'pending_approval'
                       CHECK (status IN ('pending_approval','approved','rejected','expired')),
  created_by         VARCHAR(20) NOT NULL DEFAULT 'trainer'
                       CHECK (created_by IN ('trainer','coach','api')),
  idempotency_key    VARCHAR(64),
  notified_at        TIMESTAMPTZ,
  notify_attempts    INTEGER NOT NULL DEFAULT 0,
  decided_channel    VARCHAR(20) CHECK (decided_channel IN ('app','telegram','sms','api')),
  decided_by_user_id Integer REFERENCES "Users"("id") ON DELETE SET NULL,
  decided_at         TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  delivery_error_code VARCHAR(60),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drafts_short_id_key UNIQUE (short_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS drafts_idem_key
  ON client_comm_drafts (trainer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS drafts_trainer_status_idx ON client_comm_drafts (trainer_id, status);
CREATE INDEX IF NOT EXISTS drafts_client_idx ON client_comm_drafts (client_id);
CREATE INDEX IF NOT EXISTS drafts_pending_idx ON client_comm_drafts (notified_at)
  WHERE status = 'pending_approval';

CREATE TABLE IF NOT EXISTS draft_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id      UUID NOT NULL REFERENCES client_comm_drafts("id") ON DELETE CASCADE,
  channel       VARCHAR(20) NOT NULL CHECK (channel IN ('email','telegram','sms')),
  recipient_hint VARCHAR(120),
  status        VARCHAR(24) NOT NULL
                  CHECK (status IN ('sent','failed','queued_quiet','queued_cooldown','skipped')),
  provider_ref  VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS draft_notif_draft_idx ON draft_notifications (draft_id);
CREATE INDEX IF NOT EXISTS draft_notif_created_idx ON draft_notifications (created_at);

CREATE TABLE IF NOT EXISTS trainer_notify_prefs (
  trainer_id  Integer PRIMARY KEY REFERENCES "Users"("id") ON DELETE CASCADE,
  quiet_start VARCHAR(5) NOT NULL DEFAULT '20:00',
  quiet_end   VARCHAR(5) NOT NULL DEFAULT '08:00',
  digest_daily BOOLEAN NOT NULL DEFAULT FALSE,
  tz          VARCHAR(64) NOT NULL DEFAULT 'America/Los_Angeles',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
```

```sql
-- REVERSE
BEGIN;
DROP INDEX IF EXISTS draft_notif_created_idx;
DROP INDEX IF EXISTS draft_notif_draft_idx;
DROP INDEX IF EXISTS drafts_pending_idx;
DROP INDEX IF EXISTS drafts_client_idx;
DROP INDEX IF EXISTS drafts_trainer_status_idx;
DROP INDEX IF EXISTS drafts_idem_key;
DROP TABLE IF EXISTS trainer_notify_prefs;
DROP TABLE IF EXISTS draft_notifications;
DROP TABLE IF EXISTS client_comm_drafts;
COMMIT;
```

## D.6 — Slices (D0–D7, independently shippable; app door live before Telegram door per build-order gate)

**D0 — Pin audit.** Files: `docs/audit/APPROVAL-D0.md` `[NEW]`. Pins: SendGrid adapter + exact env names/sender `[ASSUMPTION from H4-ext.1]`; existing in-app message send path (route + model) or its absence (decides `deliver_channels` behavior — both branches pre-written above); `Users` email/name columns; app-shell nav path for the badge; Hermes egress host + who holds `RELAY_URL`. Prove: `grep -cE ":[0-9]+" docs/audit/APPROVAL-D0.md` → ≥ 5.
**D1 — Migration + models.** `backend/models/ClientCommDraft.mjs`, `DraftNotification.mjs`, `TrainerNotifyPrefs.mjs` `[NEW]` + `__tests__/draftModels.test.mjs`. Prove: C.6-style fwd/rev/fwd block + `node --test backend/models/__tests__/draftModels.test.mjs`.
**D2 — Notify adapters + prefs.** `backend/core/services/notify/emailAdapter.mjs`, `smsNoopAdapter.mjs`, `telegramRelayAdapter.mjs`, `quietHours.mjs` + tests `[NEW]`. Prove: `node --test backend/core/services/notify/`.
**D3 — Draft service + relay endpoints.** `backend/core/services/draftService.mjs`, `backend/middleware/relayAuth.mjs`, `backend/routes/relayRoutes.mjs` + tests incl. the concurrency race. Prove: `node --test backend/core/services/draftService.test.mjs` then staging `curl -s -X POST "$API/api/internal/relay/drafts" -H "Authorization: Bearer $RELAY_TOKEN" -H 'Content-Type: application/json' -d '{"trainerId":1,"clientId":2,"body":"relay smoke"}'` → `201 {"draftId":…}`.
**D4 — Trainer API + notify/expiry jobs.** `backend/routes/draftRoutes.mjs`; `backend/core/jobs/draftNotifyJob.mjs`, `draftExpiryJob.mjs` `[NEW]` (advisory locks `draft-notify`, `draft-expiry`). Prove: `node --test backend/routes/__tests__/draftRoutes.test.mjs && node backend/core/jobs/draftExpiryJob.mjs --once`.
**D5 — Delivery executor.** `backend/core/jobs/draftDeliveryJob.mjs` + email send + in-app hook per D0; idempotent on `delivered_at` + provider idempotency key. Prove: `node --test backend/core/jobs/draftDeliveryJob.test.mjs`.
**D6 — Frontend.** `frontend/src/pages/Approvals.jsx`, `frontend/src/components/Approvals/DraftCard.jsx`, `DraftDetailModal.jsx`, `NotifyPrefsPanel.jsx`, `useApprovals.js` `[NEW]` + nav badge `[D0 path]` + Vitest tests. Prove: `npx vitest run frontend/src/pages/Approvals.test.jsx frontend/src/components/Approvals`.
**D7 — Metrics + runbooks.** `backend/scripts/approval-metrics.mjs` (median created→notified, notified→decided, decided→delivered; pending aging; alert if decided-median > 2 h), `backend/core/jobs/approvalAnomalyJob.mjs` (>5 decisions/h → email + `APPROVAL_ANOMALY`), `docs/runbooks/relay-token-rotation.md` `[NEW]`. Prove: `node backend/scripts/approval-metrics.mjs --since 7d && node backend/core/jobs/approvalAnomalyJob.mjs --once`.

## D.7 — Test matrix

| Test `[NEW]` | Asserts | Fixture |
|---|---|---|
| `draftService.test.mjs` — race | Two concurrent decides (app + relay) → exactly one wins; both return the **same final status**; loser carries `alreadyApplied:true`; one `decided_at` | `Promise.all` of two decides |
| 〃 — tether | `notified_at` 49 h old + pending → `410 DRAFT_STALE`; 47 h → succeeds | clock mock |
| 〃 — expiry | pending > 7 d → job flips `expired`; decide then → `409` | seeded |
| 〃 — idempotency key | Relay replay with same key → same `draftId`, one row | two POSTs |
| `relayAuth.test.mjs` | Wrong/missing token → 401; token on any non-relay route → 404 (router scope); compare is constant-time | route table |
| `relayRoutes.test.mjs` | 30/h limiter trips at 31st; `short_id` never decodable to client identity | burst loop |
| `telegramRelayAdapter.test.mjs` | Payload for client "Jane Doe / jane@x.com" matches `^Draft [A-Za-z0-9_-]{8,12} · \w+ · client #\d+ — approve\?$` and contains **no** `Jane`, `Doe`, `@`, `jane` — PII-free proven by fixture | client with juicy PII |
| `quietHours.test.mjs` | 21:00 create → `queued_quiet`, sends 08:00; 07:59 boundary; cooldown: second draft <10 min → `queued_cooldown`; digest: 3 drafts → **1** Telegram, 1 email | clock mocks |
| `draftNotifyJob.test.mjs` | Advisory lock `draft-notify` blocks second concurrent pass | lock harness |
| `draftDeliveryJob.test.mjs` | Approved → exactly one client email; retry after success sends **nothing** (`delivered_at` + provider key); SendGrid 500 → backoff, `delivery_error_code='EMAIL_RETRY'`, badge state | mock sender |
| `emailAdapter.test.mjs` | Trainer notify subject `Approval needed — {kind} for client #{n}`; full body in email (trainer is recipient — permitted channel) | inline |
| `smsNoopAdapter.test.mjs` | Logs `SMS_NOOP`; returns `{ok:false, code:'SMS_NOT_CONFIGURED'}`; UI badge flag exposed | inline |
| `approvalAnomalyJob.test.mjs` | 6th decision inside rolling hour → alert fired exactly once | seeded decisions |
| `draftRoutes.test.mjs` | 401/403 chains; owner-scoping (trainer B's draft 404s to trainer A); body 4,001 chars → 400; prefs CRUD | supertest-style |
| `Approvals.test.jsx` | Inbox states per wireframe; queued chip; approve flow → decided chip + delivery line; badge count; all buttons ≥44 px | Vitest |

## D.8 — Failure modes & guards (five)

1. **Hermes compromised → relay token misuse** (approve drafts → send to Sean's clients — the token is a send capability, H4-ext.2). *Guards, chained:* router-scoped token (valid nowhere else); decisions only on `pending_approval` **and** `notified_at ≤ 48 h` (stale-draft replay dead); 30/h limiter; anomaly alert >5/h; full `decided_channel` audit; rotation runbook; app door keeps working if relay is disabled (`RELAY_ENABLED=false`). *Blast radius if unguarded:* attacker-driven client comms in Sean's name.
2. **Double-delivery on approval retry** (decide succeeded, delivery crashed, retry re-sends). *Guard:* `delivered_at` as idempotency gate **plus** provider idempotency key on every send; at-least-once with dedupe, tested. *Blast radius:* duplicate client emails — minor, but trust-eroding.
3. **SendGrid outage / key rotation mid-flight.** *Guard:* delivery job backs off (2ⁿ, cap 30 min), sets `delivery_error_code`, UI "Delivering — retrying" chip; drafts remain approved-and-queued, nothing lost; email-to-trainer failure falls back to badge + in-app inbox. *Blast radius:* latency, not loss.
4. **Notification fatigue kills the rail** (unbatched texts on the gym floor → Sean mutes → approvals age → the whole bridge silently dies). *Guard:* 10-min cooldown + quiet hours (queued) + digest option; D.7 metric alerts if decided-median > 2 h. This is a guard, not a nicety — the rail's value is exactly its trust.
5. **Hermes host down (5090 powered off — expected per H6).** *Guard by architecture:* Telegram is a convenience door; email + app deep link always suffice; SS marks telegram `failed` and moves on; no D component polls Hermes. *Blast radius:* one channel quiet, zero decisions lost.

---

# DELIVERABLE 5 — OPEN QUESTIONS THAT ARE GENUINELY SEAN'S (PRODUCT/SPEND/PREFERENCE ONLY)

Every technical unknown above is owned by an audit slice (C0/D0) with a pre-written branch — none of these seven blocks any slice, and each ships with a default encoded, so an answer changes config or copy, never schema:

1. **SMS spend (the H4 gap):** approve a provider + monthly cap (~$10–20 at current volume) to light up the SMS adapter, or keep the honest "SMS not configured" badge? *(Default: badge.)*
2. **Notification temperament:** immediate-per-draft by default, or digest-while-on-the-gym-floor? Quiet hours 08:00–20:00 PT correct? *(Default: immediate, 08–20.)*
3. **Ghost-gate rollout date:** confirm the 24 h `warn`→`enforce` flip after C6, or hold `warn` through a heavy gym week first? *(Default: 24 h.)*
4. **Titles-import policy:** keep OFF permanently (recommended — the gym's feed carries *its* clients' names), or permit per-source ON once he has his gym's okay? *(Default: OFF.)*
5. **Trainer timezone for floating iCal times and quiet hours:** confirm `America/Los_Angeles`. *(Default: env `TRAINER_TZ_DEFAULT=America/Los_Angeles`; one word changes it.)*
6. **Hermes placement:** stay on the 5090 (fine — outbound HTTPS only, no power-state dependency) or move to a small VPS? *(Default: stays put.)*
7. **Approved-message delivery taste:** email-only, or email + in-app copy if D0 finds the message API? *(Default: both when available.)*

— End of document. Sections A, B, C.0–C.5, the gap analysis, and Deliverables 1–2 stand as previously delivered, amended only by the INTEGER-FK correction banner at the top.
