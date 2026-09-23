# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-DIRECTION-PANEL-ROUND2-PACKET-2026-08-24.md
**Tokens:** 1610 in / 29238 out (reasoning: 22813) | total 30848
**Wall:** 546.9s

---

# Panel packet — ROUND 2 — RESPONSE — 2026-08-24

Round-1 decisions treated as input. Three amendments survived contact with what was built; everything else below builds on the ratified shape. Seat markers appear only where the panel actually split.

---

## Amendments to round 1 (the only disagreements)

1. **"Agent gets catalog+archive tools" was too loose as written.** The dump-dir tightening proved that on this box the law is *grants, not conventions*. Amend: the agent DB role gets `EXECUTE` on five functions and **zero table grants anywhere**; archive depth is single-fetch-by-id through a `SECURITY DEFINER` function (spec in O3).
2. **DNS auth as item #1 stands only if stapled to a validator.** It is first by minutes, not by importance. As built, *nothing running depends on it* — an unvalidated or typo'd edit is a silent no-op (see O5).
3. **The 30-day substitute-tier clock has no start condition.** All 39 sources are seeded default-off, so "30 days of lateness data" can elapse on an empty corpus. Attach the clock to *first-enabled-source date* and surface `enabled_source_count` in the daily heartbeat.

---

## O1 — "Hot," as a score over fields the pipeline can populate

**Rank clusters, not items.** Cross-source velocity is a cluster property, so the front page ranks stories; each story renders its best item (highest source weight, earliest `first_seen_at`) plus a distinct-source count.

### Data shape (news schema)

```sql
ALTER TABLE items ADD COLUMN cluster_id  bigint;        -- assigned at ingest (URL key) and 23:45 (title key)
ALTER TABLE items ADD COLUMN url_canonical text NOT NULL DEFAULT '';
-- sources.weight smallint CHECK (1..5) assumed present; add if not
CREATE TABLE owner_interest (
  entity_id bigint, topic text, weight smallint CHECK (weight BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, topic), CHECK (entity_id IS NULL OR topic IS NULL)
);
```

Clustering v1: key = `url_canonical` (UTM/fragments stripped) assigned at ingest; otherwise lower-cased alphanumeric title, first 80 chars, within a 24h first-seen bucket, assigned nightly. **Stated limitation:** same-day velocity only counts syndicated identical URLs; full velocity accrues at the 23:45 pass. Cluster detail always shows the distinct source list, so six outlets carrying one wire story is *visible*, not hidden.

### The score

```
age_h     = (now() - cluster.first_seen_at)/1h          -- cluster.first_seen = min(items.first_seen_at)
freshness = exp(-age_h/6)                                -- ~4h half-life
velocity  = ln(1 + distinct_sources_24h) / ln(7)         -- caps at 6 sources; the 20th outlet adds nothing
sourceq   = (max_source_weight_in_cluster - 1) / 4
interest  = least(1, Σ owner_interest.weight over cluster entities / 3)
hot       = round(100 × (0.30·freshness + 0.25·velocity + 0.25·sourceq + 0.20·interest))
```

- Scoring uses **`first_seen_at`, never `published_at`** — feeds can backdate; the box's own clock cannot be lied to by a source. `published_at` is display-only.
- While `owner_interest` is empty, the interest term is dropped and the score renormalizes to /0.80; the page header states `interest_weighting: off`. No silent defaults.
- The response payload carries the four components per item. An opaque score is undebuggable by a solo operator at 23:00; a decomposed one is a `psql` query.

### Front page = a definition, not a vibe

- N = **20 clusters**, eligibility `first_seen_at` within trailing 48h, max 3 clusters per source.
- Tie-breaks, in order: `hot` DESC → `first_seen_at` DESC → `source_weight` DESC → `url_canonical` ASC. Total order; re-renders are deterministic.
- Header meta: `generated_at`, `data_as_of = max(items.fetched_at)` (proof we *went looking*), `enabled_source_count`, last ingest job `{exit, finished_at}`, `degraded`.

### Degradation (the no-fabricated-presence law, made mechanical)

- `degraded = true` when `now() - data_as_of > 6h`. Banner: *"Collection stopped 13h ago — last successful fetch 22:14 yesterday. Items below are as last seen; times are absolute. Next: `systemctl status news-ingest.timer`."*
- Timestamps render **absolute date+time always** — never a relative age, never a "Today" heading.
- Under-fill is truthful: `filled: 11/20`, `withheld_stale: 3`. No padding.
- `fetched_at` proves collection presence; `first_seen_at` is the story clock. They are never mixed.

**Refuses loudly:** the feed endpoint composes `generated_at` at serve time; DB unreachable → HTTP 503 with the error envelope, never yesterday's JSON under a fresh timestamp. Ingest that fetches 0 items across all enabled sources exits nonzero; a run with successful fetches but 0 new items stays green with `items_new: 0`, and a 7-day zero-item streak escalates to yellow in the heartbeat.

**One test:** `test_degraded_after_stall` — seed fixtures with all `fetched_at`/`first_seen_at` = now−13h; `GET /feed`; assert `degraded: true`, correct `data_as_of`, banner copy present, every rendered age > 12h and absolute, no present-tense wording.

**First night:** page empty or all-zero → (1) `box-status news-ingest` (exit? `items_new`?); (2) `psql news -c "select count(*), max(first_seen_at) from items"` — NULLs in `first_seen_at` mean a backfill miss: the ranker excludes them into a reported `unprocessable` count, never guesses; (3) flat scores → run the component SQL by hand (the debug query is the formula above, one `GROUP BY cluster_id`).

---

## O2 — Local news, honest v1

**"Local" is one config value plus a fixed allowlist — never inference.** `news.locality = "<owner's metro>"`; sources carry a `locality` tag; the local surface filters on it. No geo-inference from content, IP, or coordinates. The agent may *propose* local feeds; only a human runs `newsctl source enable`. All sources stay default-off, matching built state.

### Source classes (v1)

1. **Municipal/county feeds** — council and planning agendas/minutes, police log. Meeting-portal software usually exposes per-body RSS; where it doesn't, the browser allowlist covers the portal HTML (see Also-answered). Why first: agendas precede press coverage by days; this is primary-source "as it comes out."
2. **Local outlets** — 2–5 metro paper/radio/TV RSS feeds; headline + summary + link only. Paywalled bodies are never fetched.
3. **Public agencies** — transit service alerts, school district, county health, emergency management, NWS forecast-office feed for the locality.
4. **Fixed-query aggregator RSS** — one or two news-aggregator feeds with a literal, fixed `<locality>` query string. Inference happens on *their* side; our side is a fixed URL in an allowlist. Weight 1–2 and the O1 max-3-per-source rule keep one aggregator from flooding the page.
5. **Institutional** — library/events calendars, university newsroom, local public-radio program feed.

### Explicitly not in v1

No social/community platforms (round-1 ban). No paid local-news APIs. No content geolocation, mapping, or radius search. No scraping of paywalled text. No auto-discovery of local sources. **No completeness claim** — the surface shows the enabled-local count and the class mix, because "local" with one aggregator and zero primary outlets is a presence claim the law forbids.

**Refuses loudly:** locality set, zero local sources enabled → the local surface renders the named empty state with the next action (copy below). Aggregator-only coverage → header discloses the class mix.

**One test:** `test_local_empty_state_names_gap` — with locality set and zero local sources enabled, `GET /local` returns 200 with the empty-state block naming the count and the enable command; enabling two seeded sources and ingesting once flips it to items with a real `data_as_of`. Both phases, one test.

**First night:** municipal feeds rot. Per-source failure is recorded and the run stays green; `newsctl sources --failing` lists failures with `last_success`; a source failing >14d self-flags "rotted" on the status surface for human disable — the operator edits the allowlist, not the code.

---

## O3 — The corpus → personal-agent contract

### Principals (sharpened per Amendment 1)

- `agent_reader` DB role: `EXECUTE` on the five functions below. **No table grants in any schema. No writes.** `CONNECTION LIMIT 2`.
- Everything else runs as `news_owner`. The digest job (not the agent) is what writes proposals and calls delivery.

### Artifacts

```sql
CREATE SCHEMA agent_face AUTHORIZATION news_owner;
-- all SELECT-able by nobody directly; consumed via functions

front_pages(day date PRIMARY KEY, generated_at timestamptz, data_as_of timestamptz,
            degraded bool, items jsonb);                          -- cap 120 rows (one/day)
entity_cards(entity_id bigint PRIMARY KEY, name text, kind text, aliases jsonb,
             card jsonb, as_of timestamptz, last_mention_at timestamptz,
             mentions_7d int, mentions_30d int);                  -- cap 800
pointers(id bigint PRIMARY KEY, cluster_id bigint, url_canonical text,
         title text, source_id int, first_seen_at timestamptz,
         entities jsonb);                                         -- cap 1000, evict oldest
interest_proposals(id serial, entity_or_topic text, delta smallint, reason text,
                   status text, created_at timestamptz);           -- cap 50
budgets(key text PRIMARY KEY, cap int);
```

**Row budget: 120 + 800 + 1000 + 50 + overhead = ≤ 2,000 schema-wide.** The written threshold holds for the *entire enumerable agent catalog*. The regen job asserts the total and exits 1 with the counts if exceeded — the cap is an invariant, not a hope. Depth does **not** live in the catalog; it lives in search:

**Functions** (`SECURITY DEFINER`, owner `news_owner`):

| call | returns |
|---|---|
| `get_front_page(date)` | one frozen front-page row |
| `get_entity_card(id \| name)` | one card row |
| `search(q text, lim int DEFAULT 20)` | pointers + `ts_headline` snippets, FTS over the full items GIN index; **refuses lim > 20** |
| `get_pointer(id)` | one pointer |
| `get_article_body(id)` | one body, truncated 8 KB, with provenance (source, url, fetched_at) |

**Banned, and *how*:** raw-archive scans and table reads are impossible — there are no grants; `search` is the only bulk path and it returns capped pointers. Send tools don't exist in the agent's tool registry, and delivery runs under a different principal reading only the digest tables. Writes are impossible — no `INSERT` grants; `interest_proposals` is written by the nightly digest job, never by the agent.

**File exports** (debug surface + reader-side staleness): `/var/lib/news/agent-face/<date>-front-page.json`, `entity-cards.json` (rewritten whole), `pointers.jsonl` (append + trim), mode 0640. Export failure = regen exit 3 — generalizing the proven convention: *a job that cannot record itself did not happen.*

### Cadence — the "gets smarter" loop, concretely

1. **23:45 `agent-face-regen`** (news_owner): freeze today's front page from the O1 ranker; refresh pointers (evict to cap); rebuild entity aggregates (mentions 7d/30d, top sources, ≤10 recent pointers per card); delete cards with no mentions in 30d; write files; assert budget; write status.
2. **06:30 `digest-gen`**: reads yesterday's frozen page + changed cards + open proposals → **one model invocation** (per round 1) → briefing section + new `interest_proposals` (cap-enforced).
3. **06:47**: the *existing* briefing job delivers one chat message — training digest (existing read-only role) + news section + proposals. One ping, not two.
4. **Approval** (the human gate, same law as sources): v1 `newsctl interest apply --approve <id>`; applied weights feed the next night's card selection and the next day's live-page interest term.

Mentions → cards → digest → proposals → approval → weights → ranking. That is the whole loop, and every arrow is a job in the O4 manifest.

**Stale card, detectable by the reader — as a rule, not a judgment:** a card is stale iff `as_of < today 00:00 local`. Every card rendering includes `as_of` and `last_mention_at`; the digest prompt instructs the model to state "card as of \<date\>" whenever `as_of` isn't yesterday/today; the UI badges the same condition. Front pages carry the identical rule via `generated_at`.

**One test:** `test_agent_reader_cannot_touch_base_tables` — connect as `agent_reader`: `SELECT * FROM news.items LIMIT 1` → permission denied; `SELECT count(*) FROM agent_face.pointers` → ok, ≤ cap; `INSERT INTO agent_face.interest_proposals …` → denied; `SELECT agent_face.search('x', 9999)` → error. One test proves the entire contract, because the contract *is* the grants.

**First night:** briefing empty or stale → `box-status agent-face-regen digest-gen`; then `psql news -c "select day, degraded, generated_at from agent_face.front_pages order by day desc limit 3"` — a missing row means regen never ran (chase the timer); a present row with `degraded=true` means an ingest gap (chase O1). Cards frozen → check regen exit; a budget-assertion failure prints the per-table counts in the status file — lower a cap in `budgets` or shorten the pointer window; never "just raise 2,000."

---

## O4 — The timers manifest

**Source of truth:** `ops/timers.toml` in the repo. `/etc/systemd/system/*` is *generated output*, stamped `# rendered from timers.toml @ <sha256> — do not edit`.

```toml
[[job]]
id             = "db-dump"
purpose        = "nightly pg_dump of training DB"
schedule       = "02:30"          # OR interval + window:
# interval      = "2h"
# window       = "08:15-22:15"    # rendered as an explicit OnCalendar hour list
owner          = "postgres"
memory_max     = "1G"
runtime_max    = 3600
jitter         = 300              # RandomizedDelaySec
mutex          = "backup"         # shared flock set = the must-not-overlap set
status_path    = "/var/lib/box/status/db-dump.json"
persistent     = true             # catch up missed daily runs after downtime
health_max_age = "26h"
enabled        = true
blocked_on     = ""               # "offsite credential" etc. → rendered but disabled
```

**Generator** (`render-timers`, stdlib-only): renders `<id>.service` (`User=`, `MemoryMax=`, `RuntimeMaxSec=`, `Type=oneshot`, `ExecStart=/opt/box/bin/box-run <id> -- <cmd>`) + `<id>.timer` (`OnCalendar` from schedule or explicit hour list from interval+window — `08,10,12,…,22:15:00` — so the window is inherent, not a runtime check; `Persistent=` only for daily batch jobs, never for windowed fetch jobs). `--check` renders to a temp dir and diffs against installed units: CI fails on drift; hand-edits are caught the same way. Drift = red heartbeat.

**`box-run` wrapper** generalizes the proven convention: writes `{job, started_at}` → runs payload → writes `{exit, finished_at, detail}`; either status write fails → **exit 3**. Every job on the box inherits "refuses to run if it cannot record itself." Mutexes: shared-set jobs wrap the payload in `flock -n /run/box/mutex/<set>.lock`; collision → exit 75 recorded as `skipped:mutex` (yellow — expected serialization).

**Heartbeat** `box-heartbeat`, daily 06:25 (after the backup set, before digest/briefing): reads every status file, compares against `health_max_age`, and posts one chat line:

```
box 9/9 green · 2 blocked (offsite: credential · dead-man: credential)
box 7/9 — news-ingest yellow (0 items 5d) · browser-fetch red 1d
```

States: **green** (fresh, exit 0) / **yellow** (mutex-skip, zero-item streak, stale within 2× age) / **red** (missing file, nonzero exit, over age) / **blocked** (disabled with `blocked_on` — counted, named, never silently absent). It reads *last completed* status, so a still-running offsite at 06:25 is not a false red. It also stamps `/var/lib/box/vitals` (`chrony` sync state, `briefing_last_delivered_at`) — every timestamp the honesty law depends on is a clock claim, so clock discipline is a heartbeat check. The heartbeat is itself a manifest job; its own absence is the external dead-man's problem (see Also-answered).

**Seed manifest (built jobs encoded):**

| id | schedule | mutex | MemoryMax | RuntimeMaxSec | enabled |
|---|---|---|---|---|---|
| db-dump | 02:30 | backup | 1G | 1800 | ✓ |
| restic-retain | 05:30 | backup | 512M | 1800 | ✓ |
| offsite | 06:00 | backup | 768M | 7200 | blocked: credential |
| browser-fetch | 08–22/2h @ :15 | browser | 768M | 600 | ✓ |
| dead-man-push | 5m | — | 64M | 30 | blocked: credential |
| box-health | 5m | — | 64M | 60 | ✓ |
| news-ingest | 08:00–22:30/30m | ingest | 512M | 900 | ✓ new |
| agent-face-regen | 23:45 | — | 512M | 900 | ✓ new |
| digest-gen | 06:30 | — | 512M | 600 | ✓ new |
| owner-briefing | 06:47 | — | 128M | 120 | ✓ existing |
| box-heartbeat | 06:25 | — | 64M | 120 | ✓ new |

**One test:** `test_heartbeat_detects_absence` — delete one status file (or stop one timer), run the heartbeat manually with dry-run output, assert the report names that job red/missing. *Absence*-detection, not just failure-detection, is the property that matters; a scheduler without it lies by omission.

**First night:** `box-status` (all status files + `systemctl list-timers` side by side) → `journalctl -u <job> -n 100` → manifest edit → `render-timers && systemctl daemon-reload`. A drift alarm means someone hand-edited a unit: diff, revert, re-render.

---

## O5 — Does the sequence survive a real week?

**Attack list — things that silently block the step after them:**

1. **The 30-day clock isn't running.** Every source default-off means green ingest jobs over an empty corpus forever; "30 days of lateness data" silently never starts (Amendment 3). Fix: "enable ≥3 sources, incl. 2 local" *is* a sequence step, and the heartbeat carries `enabled_source_count`.
2. **Empty briefings train the owner to ignore briefings.** Turn the news section on before front pages carry real content and the 06:47 ping becomes noise within a week — at which point the channel that carries *all* alerts is behaviorally dead. Fix: digest generates to a file until 3 consecutive days with ≥5 front-page items; gate content, not the job.
3. **Offsite green ≠ offsite restorable.** A credential can admit writes while making restores impossible (write-only bucket scope, remote-side lifecycle deletion). The step after "enable offsite" must be *restore one file from offsite and diff it*. Otherwise leg 2's defining failure is invisible until the disaster it exists for.
4. **DNS done ≠ DNS correct.** A 10-minute owner edit with no validator in the sequence; every consumer of it is in the future (see ruling below). The evening that owns the edit also owns the probe: `dig` + the dependent service's own verify command.
5. **The manifest becomes load-bearing the moment it exists.** Any ad-hoc `systemctl edit` bypasses it; hence `render-timers --check` in CI and drift = red. The sequence must install the check the same evening it installs the manifest.
6. **The dump-dir hole has a sibling nobody audited: the restic hub path.** Same one-liner, standing step: `sudo -u agent find <path> -readable -print` for hub, dump dir, status dir, and agent-face exports.

**The single step whose failure the owner would not notice for a month:**

- **Ox Alpha:** the offsite restore drill — green uploads, unusable repo, discovered at disaster time.
- **GLM 5.3:** the DNS record — nothing running depends on it; no job goes red; its consumers haven't been built.
- **Fable ruling: the DNS record.** Offsite at least *fails loudly* when uploads break; DNS never fails at all — a typo'd or missing record is a perfectly quiet no-op, the heartbeat has nothing to watch, and by the time the dependency arrives the "done" checkbox is months cold. The fix is not resequencing; it is stapling validation to the edit the same evening (Attack 4).

**The surviving week (evenings, 60–90 min):**
- **E1:** DNS edit + probe (owner, 15 min incl. validator); enable 3–5 sources incl. 2 local; manual `newsctl ingest --bootstrap` (asserts day-count > 0, exit 4 if not).
- **E2:** owner's browser click (assumed: offsite credential) → enable offsite → forced run → **restore-one-file drill**; record exits in the status files.
- **E3:** dead-man credential → enable → pull-the-wire: stop the pusher 10 minutes, confirm the external alert lands in chat.
- **E4:** feed endpoint behind the shared envelope; mock-import guard in CI; flip the ~8 modules to `useFeed()`; screenshot empty + filled states.
- **E5:** agent-face-regen dry-run; digest to file; review first interest proposals; set the content-gate (≥5 items × 3 days) and let the following week be the first live one.

---

## Also answered

### Mock-data kill path, precisely

**One envelope, one hook.** All ~8 modules consume `useFeed()`; module-level mock imports are replaced by that hook — one change, because the shape is shared:

```json
{
  "generated_at": "2026-08-24T06:30:00Z",
  "data_as_of":   "2026-08-24T06:12:00Z",
  "degraded": false,
  "enabled_source_count": 12,
  "last_job": {"job": "news-ingest", "exit": 0, "finished_at": "2026-08-24T06:12:00Z"},
  "interest_weighting": "on",
  "items": [{ "id": 0, "cluster_id": 0, "title": "", "url": "",
              "source": {"id": 0, "name": "", "weight": 3, "locality": null},
              "published_at": null, "first_seen_at": "",
              "score": {"total": 72, "freshness": 0.8, "velocity": 0.6, "sourceq": 0.5, "interest": 0.3},
              "entities": [] }],
  "page": {"n": 20, "filled": 11, "withheld_stale": 3}
}
```

Item detail goes through `GET /items/:id` with the same envelope. **Then `git rm` the mock module files** — dead files invite re-import.

**CI guard:** eslint `no-restricted-imports` with patterns `**/mocks/**`, `**/fixtures/**` (allowed only under `tests/` and `src/test-utils/`), plus the raw belt: `grep -rnE "from ['\"][^'\"]*mocks?['\"]" src/` exits nonzero on any hit. Both run in CI; the grep is deliberately dumb so it survives refactors.

**Runtime assert:** `newsctl ingest --bootstrap` asserts day-count > 0 and exits 4 on failure (distinct code, distinct remediation). Ongoing: zero-new-item streaks escalate via the heartbeat (O1), so "green on nothing" is impossible.

**Empty-state copy, written now, exactly:**
- Never-ingested: *"No stories yet. 0 of 39 sources enabled — collection is ready but switched off. Next: `newsctl sources propose`, then `newsctl source enable <id>`."*
- Degraded: *"Collection stopped 13h ago (last fetch 22:14, exit 1). Showing last-known items with absolute times. Next: `box-status news-ingest`."*
- Local-empty: *"No local sources enabled for \<locality\>. Next: `newsctl sources propose --locality`."*

### Browser allowlist — five more lines (credential-free, substitute tier, light enough for one tab in 600s)

| URL class | why |
|---|---|
| Hosting + object-storage provider status pages | JS-rendered, RSS-less; explains ingest/backup failures *before* we debug them; 2-hourly cadence matches the job |
| Distro/stack security-announce page (where RSS-less) | the box's own patch horizon is "news that matters to this system" |
| Municipal meeting portal, "upcoming agendas" HTML (O2 locality) | primary-source, days ahead of press; the browser exists precisely because these portals have no usable RSS |
| Local outlet's public headlines page (no login) | headline + link only, never paywalled bodies — keeps the substitute tier honest |
| Public industry procurement/tender board | business-critical "as it comes out," typically JS-only, credential-free |

Each line keeps the built format's required `why` field and gains a `class` tag so O2's local count stays honest.

### The thing nobody asked about, round 2

**Channel-death is a third failure class, and nothing in the design catches it.** Round 1 killed SMS; the chat bot is now the box's only voice; the external dead-man watches the *box*, not the *bot*. If the bot token is revoked or the chat platform silences the bot, the box is alive and 9/9 green — heartbeats written, briefings generated, nothing delivered — for as long as nobody mourns one missing 06:47 ping on a busy week. Box-death: dead-man catches it. Job-death: heartbeat catches it. Channel-death: invisible. Fix is one field: the bot's send call stamps `briefing_last_delivered_at` into `/var/lib/box/vitals`, the dead-man pushes it, and the external watcher alerts not only on push-absence but on **"pushes present, briefings absent >26h."** One rule closes the alerting system under its own failure modes.

---

*Synthesis: round 1 drew the boundaries; the built state proved the enforcement style — exit codes, grants, caps, status files. Round 2's job was to make every remaining surface behave like that: scores that decompose, catalogs that cap, timers that render from one file, empty states that name the next action, and an alert path that can see its own death. No step above requires a decision a builder cannot make alone.*
