# Panel packet — ROUND 2 — always-on box: from decisions to build specs — 2026-08-24

**Seats:** Ox Alpha, GLM 5.3, Fable-tier synthesis. Same panel as round 1.
**Privacy:** roles only. No personal names, organisation names, or client identifiers.

**What changed since round 1:** the owner ratified round 1's decisions, and two of the
sequence items were *built* between rounds. Round 2 does not re-litigate; it turns the
open items into things a builder can execute with zero further questions.

---

## 1. Round 1 decisions — INPUT, not open (do not re-argue)

- Kill the 24/7 agent. Collect on timers; invoke a model per digest window.
- The app collects; the agent judges, audits collection, and *proposes* sources; a human enables.
- No social-platform timeline scraping or paid tier until 30 days of substitute-tier lateness data.
- Chat-app alerts to the owner; SMS killed.
- The DNS authentication record is roadmap item #1 (owner-only, ~10 min).
- Partner nudge engine killed; build the work half only, her goals in her words, nothing on the box until she asks; when it lands: separate Unix user / DB / bot token / no roster-reaching tool.
- No vector/RAG re-decision. Archive ≠ recall surface. Agent-facing index = day front-pages + entity cards + full-text search for depth.
- `MemoryMax` on every non-database unit — a mechanism, not a policy.
- Three principals: a read-only training DB role for the owner digest; a separate news DB/user for ingest/archive/catalog; the news agent gets catalog+archive tools only, never send or training tables.
- Law: **the system may never fabricate presence.** Empty states name what is missing and the next action; every surface shows data-as-of + enabled-source count + last job status; CI bans mock imports outside fixtures.

## 2. Built between rounds (verified, not planned)

- **Backup hub leg 1** live: nightly workstation → box copy over a restricted sftp-only key; retention prunes daily; both jobs **refuse to run if they cannot write their own status** (exit 3). Convergence proven (no prune/re-copy thrash).
- **Read-only headless browser job** live on the box: allowlist file with a *why* per URL; `User=agent`, `MemoryMax=768M`, one tab, serial, `RuntimeMaxSec=600`, timer only 08:15–22:15 so it never overlaps dump/prune/offsite windows. **Cap enforcement proven** — at `MemoryMax=64M` a real run ends `oom-kill`.
- Found and fixed: the agent user could read the DB-dump directory. Tightened to root-only; the dump job still writes.
- Offsite leg 2 and the external dead-man pinger are **scripted, validated on the box's own shell, and blocked only on credentials**.

## 3. Ground truth the specs must use (verified this session)

- Owner-digest fields that actually exist: `User.availableSessions`, `User.lastActive`,
  `Session.sessionDate`, `Session.status`, `Session.trainerId`, `Session.userId`. The
  packet's earlier prose ("stale", "low on sessions") maps to these or to nothing.
- The chat bot **does** originate outbound push: a daily briefing job already delivers
  via it at 06:47 (`deliver=chat, enabled=true`). Round 1's doubt is closed.
- The news product has **no scheduler** and **no feed endpoint**; ~51 creators / ~39
  sources seeded, all default-off; ~8 web modules bound to mock shapes.
- The box: 16GB, ~15GB free at idle, 185GB disk, no usable GPU, Postgres holding one
  product's 61-table schema, restic hub, headless Chromium now present.

## 4. The five open items — produce BUILD SPECS, not opinions

For each: exact data shapes, the failure it must refuse loudly, the one test that proves
it, and what a solo operator does the first night it misbehaves.

**O1 — Define "hot."** The product promises "the hottest information as it comes out" and
has no ranking function. Propose a concrete score over fields the pipeline can actually
populate (fetched_at, first_seen_at, source weight, cross-source velocity, owner interest
weight per entity/topic). Say what a *front page* is (N items, window, tie-breaks) and how
it degrades when ingest has been down for 12 hours (it must say so, not show yesterday as
today — the no-fabricated-presence law).

**O2 — Local news.** Owner asked for it; no good API exists. Give an honest v1: which
source classes (municipal RSS, local outlet RSS, public-agency feeds, aggregator
geo-filters), what "local" means as data (a fixed allowlist of outlets, not geo-inference),
and what is explicitly *not* in v1.

**O3 — The corpus → personal-agent contract, as a spec.** Round 1 decided the shape
(front-page + entity cards + FTS). Now: exact artifacts (paths, regeneration cadence, row
caps that keep the pointer catalog under the written ~2,000-row threshold), what the agent
may call, what it may *not* (no raw-archive scans, no send tools), and how a stale card is
detectable by the reader. Include the "gets smarter" mechanism concretely: what regenerates
nightly, from what, into what.

**O4 — The timers manifest as an artifact.** The box is the scheduler; the scheduler has no
source of truth. Propose the file (format, fields: job, schedule, owner, lock, `MemoryMax`,
`RuntimeMaxSec`, jitter, must-not-overlap set, status path), the generator that turns it
into systemd units, and the daily "N/N green" heartbeat that reads every job's status file.
Existing jobs to encode: db-dump 02:30, restic-retain 05:30, offsite 06:00, browser every
2h 08–22, dead-man every 5 min, health every 5 min.

**O5 — Does the sequence survive a real week?** Solo operator, evenings only, one browser
click and one DNS edit owed by the owner. Attack round 1's ten-step order for anything
that silently blocks the step after it, and name the single step whose failure the owner
would not notice for a month.

## 5. Also answer

- **Mock-data kill path, precisely.** The feed endpoint's response envelope so the ~8
  mock-bound modules change once; the CI grep that fails on mock imports outside fixtures;
  the runtime assert `count(*) > 0` after first ingest; the empty-state copy.
- **What the read-only browser job should fetch first** beyond the 2 starter targets — 5
  allowlist lines with the *why*, all credential-free, all inside the substitute tier.
- **The thing nobody asked about, round 2.** One new observation, not a repeat of round 1's.

Disagree where the round-1 decisions are wrong *in light of what was built*. Otherwise
build on them.
