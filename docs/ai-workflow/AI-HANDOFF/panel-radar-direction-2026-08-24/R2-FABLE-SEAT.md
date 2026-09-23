# Fable-tier seat — round 2, written BEFORE reading GLM-r2 or Ox-r2

**Model:** claude-opus-5 (Fable-tier), Final Decider. Blind, so it is an independent third
view. Build specs, not opinions.

---

## O1 — "Hot", as a number

```
hot(item) = recency × velocity × interest

recency  = exp(-age_hours / H)            H = 18 for creator/tooling, 48 for world/politics
velocity = 1 + ln(1 + distinct_sources_seen_within_6h)      # cross-source echo
interest = 1 + Σ weight(entity|topic matched)   weight ∈ {0, 0.5, 1, 2}, owner-set per row
```
All three fields are populatable from the pipeline today: `first_seen_at`, a `(canonical_url
→ source_id)` join for velocity, and an `interest_weights` table keyed by entity/topic id.
No model needed to rank. **Front page** = top 20 by `hot`, window 48h, ties broken by
`first_seen_at` desc, one item per canonical URL, max 3 per source (diversity floor).

**Degradation, per the no-fabricated-presence law:** the front page carries
`generated_at` and `newest_item_at`. If `now - newest_item_at > 6h` the page header renders
**"Ingest stale: newest item Nh ago"** in place of the timestamp, and the API returns
`stale: true`. Never render yesterday as today silently. **Test:** stop the ingest timer, wait
7h in a fixture clock, assert `stale: true` and the header string.

## O2 — Local news, honest v1

`local` is **a fixed allowlist of outlets**, not geo-inference. Source classes that exist
for essentially every US metro: (1) the local paper's RSS (nearly all have one, often
unadvertised at `/feed` or `/rss`); (2) the local TV station RSS; (3) city/county press
release RSS; (4) the regional aggregator subreddit's `.rss`; (5) a Google News geo-query
RSS as backstop (`https://news.google.com/rss/search?q=<city>` — free, no key). Five lines
in the allowlist, each with the *why*. **Not in v1:** neighbourhood-level, police scanner,
NextDoor-class sources (auth-walled), and anything requiring geo-inference from article
text.

## O3 — Corpus → agent contract

Three artifacts, all generated nightly by one job, all under the catalog's row cap:

| Artifact | Path | Rows | Regenerated from |
|---|---|---|---|
| Front page | `catalog/front/YYYY-MM-DD.md` | ≤20 | `hot()` over last 48h; keep 30 days → ≤600 rows |
| Entity cards | `catalog/entities/<id>.md` | 1 card per tracked entity (~90) | last 10 items + 3-line gist per entity |
| Topic pages | `catalog/topics/<id>.md` | ~40 | same shape |

Total pointer rows ≈ 600 + 90 + 40 = **~730, flat over time** — well under the ~2,000
threshold indefinitely, because rows scale with *entities and days retained*, never items.

**Agent may call:** `front(date)`, `entity(id)`, `topic(id)`, `search(q, limit≤20)` (Postgres
FTS over the archive — returns pointers + 200-char snippets, never full text).
**Agent may NOT call:** raw-archive scans, anything that sends, anything on the training DB.
**Staleness detectable by the reader:** every card carries `regenerated_at`; a consumer treats
`> 26h` as stale and says so.
**"Gets smarter" concretely:** nightly, `entity_cards` regenerate from the archive; the
*gist* is the one place a model is invoked (one call per entity with new items, so cost
scales with activity). The agent's context never grows; the cards do.

## O4 — Timers manifest

`/srv/radar/timers.yaml`, one entry per job:

```yaml
- job: db-dump        schedule: "*-*-* 02:30"  user: root        mem: 1G   max_sec: 900   status: /srv/radar/logs/db-backup.json
- job: restic-retain  schedule: "*-*-* 05:30"  user: resticbk    mem: 1G   max_sec: 1800  status: /srv/radar/logs/restic/retain.json
- job: offsite        schedule: "*-*-* 06:00"  user: resticbk    mem: 2G   max_sec: 3600  status: /srv/radar/logs/restic/offsite.json   after: [restic-retain]
- job: browser-fetch  schedule: "*-*-* 08,10,12,14,16,18,20,22:15"  user: radaragent  mem: 768M  max_sec: 600  status: /srv/radar/logs/browser/last.json  never_overlap: [db-dump, restic-retain, offsite]
- job: deadman        schedule: every 5m       user: root        mem: 64M  max_sec: 60    status: (external)
- job: health         schedule: every 5m       user: root        mem: 64M  max_sec: 60    status: /srv/radar/logs/health.json
```
*(Ground truth as of writing: `db-dump`, `restic-retain`, `browser-fetch`, `health` are
**installed and ticking** on radar; `offsite` and `deadman` are **scripted and validated but
not installed** — blocked on credentials. The manifest must carry an `installed:` boolean so
the heartbeat reports "scripted, never ran" as red, not as absent.)*

A generator emits `.service`/`.timer` pairs from it (systemd `MemoryMax`, `RuntimeMaxSec`,
`RandomizedDelaySec`, `After=`), and **refuses** if two jobs' windows overlap after jitter or
if any job lacks a `status` path. The daily **"N/N green"** heartbeat reads every `status`
file, treats `missing`, `stale > 2× period`, `status != ok` as red, and posts one chat
message at 07:00: `radar 6/6 green` or `radar 5/6 — offsite: degraded (prune failed)`. This
message *is* the dead-man for the scheduler itself.

## O5 — Does the sequence survive a real week?

The step whose failure the owner would not notice for a month: **#6, the owner digest.** A
digest that quietly stops (bot token rotated, DB role revoked, timer disabled during a
debug session) looks exactly like "a quiet week." Fix: the heartbeat's N/N includes the
digest; and the digest itself carries `data as of <ts>` so a stale one is visibly stale.

Silent blockers in the order: #5 (feed) is blocked on a *build session*, not a credential —
it is the only step that needs an evening of code, and it sits in front of #6. **Reorder:
#6 (digest) before #5 (feed).** The digest is SQL + a template, one evening, and it is the
business-money item. The feed is the product item and can wait a week.

## §5 answers

**Mock-data kill path.** *(Grounded after writing: the real tables are `content_items`,
`creator_item`, `creator`, `news_rss_sources`, `feed_profile` — and on radar **all five are
0 rows.** The "51 creators / 39 sources seeded" from the handoff live in the repo's seed CLIs
and the desktop DB; the seed has never run on radar. So the empty state below is the literal
current truth, not a hypothetical.)* Envelope: `{ generated_at, newest_item_at, stale,
enabled_sources, items: [{ id, title, url, source_id, first_seen_at, hot, gist }] }`. The ~8
modules change once to this. CI: `rg -l "mockData|MOCK_|sampleArticles" apps/web/src --glob
'!**/*.test.*' --glob '!**/fixtures/**'` must return nothing. Runtime: the API health route
asserts `select count(*) from content_items > 0` or reports `status: empty` — and the UI's
empty state reads **"No items yet. Ingest has never run · 0/0 sources seeded · Seed catalog
→"** (the count is live, so after seeding it becomes `0/39 enabled · Enable sources →`),
never a placeholder card.

**Five more allowlist lines** — reachability **probed from radar** before recommending:
`https://huggingface.co/papers` (200; daily AI papers front page, JS-rendered);
`https://github.com/trending/python?since=daily` (200; tooling adoption);
`https://lobste.rs/` (200; curated, low-noise tech);
`https://www.reddit.com/r/StableDiffusion/new/.rss` (200; generative-video community — use
the `.rss`, it is a plain feed and does not even need the browser);
`https://news.google.com/rss/search?q=<topic>` (200 after one redirect — fetch with `-L`;
free, keyless; this is also the local-news backstop from O2).
**Dropped:** Product Hunt — **403** to a headless fetch from radar; bot-blocked. Not worth
fighting for launch signal that HN and HF already carry.

**The thing nobody asked about, round 2:** **the allowlist file is the product's real
config and it is not in git.** `targets.txt`, `interest_weights`, the source enable flags —
all of it lives only on the box. A box rebuild loses the owner's taste. The timers manifest
and every allowlist must live in a repo and be *deployed* to the box, never edited in place.
Otherwise the rebuild runbook (round 1 G10) restores a machine with no opinions.
