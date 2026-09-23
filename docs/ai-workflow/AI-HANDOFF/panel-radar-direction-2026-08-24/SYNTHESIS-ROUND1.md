# Round 1 synthesis — always-on box direction — 2026-08-24

**Final Decider:** claude-opus-5 (Fable-tier). **Seats read:** GLM 5.3 (`GLM-5.3.md`),
Grok 4.6 (`GROK-4.6-unintended.md` — served instead of Ox because the model is chosen by
`SWAN_GROK_MODEL`, not `--model`; $0.05), my own blind seat (`FABLE-SEAT-ROUND1.md`).
**Ox Alpha:** landed on retry attempt 4 (`OX-ALPHA.md`, $0, 195s). Verdict **REVISE**.
Its headline is the sharpest single catch of the whole round and is folded in below (§4 B1).

**Calibration flags before anything else:**
- **GLM roleplayed the other seats.** Its "Ox Alpha:" and "Fable:" paragraphs are GLM's
  invention. Only GLM's own words are attributed to GLM here.
- **Grok's "bots cannot originate push" doubt is disproven:** the Morning Ops Briefing is
  a live Hermes cron job, `deliver=telegram, enabled=True`, firing daily at 06:47.
- **Grok's schema-drift warning is confirmed and now grounded:** the T1 fields the packet
  named in prose do not exist under those names. Real columns: `User.availableSessions`,
  `User.lastActive`, `Session.sessionDate`, `Session.status`, `Session.trainerId/userId`.

---

## 1. Consensus (all three seats, independently)

| Decision | Status |
|---|---|
| **Kill the 24/7 agent.** It is a cron job built the most expensive way. Collect on timers; invoke a model per digest window. | **DECIDED** |
| **App collects, agent judges** — with two amendments: the agent also *audits collection* (dead sources, zero-item runs) and *proposes* new sources; a human enables. | **DECIDED** |
| **Do not scrape or pay for the social platform at volume.** Substitute tier first (company blogs/RSS, release notes, YouTube channel RSS, aggregators, newsletters, Bluesky firehose). Measure lateness for 30 days; buy only on data. | **DECIDED** |
| **Telegram for alerts to Sean. SMS killed.** | **DECIDED** |
| **DMARC is item #1 of the whole roadmap**, not evidence. Every seat put it first. | **DECIDED — Sean-only, ~10 min** |
| **The motivational nudge system for the partner: killed as specified.** Build the *work* half (drafts, research, a demand log of parent asks with zero child data); motivation is a side effect of visible progress. Her goals in her words only. | **DECIDED** |
| **No RAG re-decision now.** Archive ≠ recall surface. Agent-facing index = day front-pages + entity cards + Postgres FTS for depth. Stays under the written threshold by construction. | **DECIDED** |
| **`MemoryMax` on every non-Postgres unit is a mechanism, not a policy.** Browser is the first OOM risk. | **DECIDED — already applied to retain/offsite/browser units** |

## 2. Contradictions, arbitrated

**Browser automation on the box — GLM "extraction tool only," Grok "defer."**
Ruling: **build the read-only class now, under the cgroup guardrails, because Sean stated
it as the box's original purpose and it is the only item that improves his daily working
experience.** Grok's objection (OOMs postmaster) is answered by `MemoryMax=768M`,
`RuntimeMaxSec=600`, one tab, serial, silent 23:00–07:00 so it never overlaps the DB
dump/prune/offsite windows. The *authenticated* class stays deferred and governed.

**Partner lane on this box — Grok "off this box until she asks," GLM "separate user/schema/token."**
Ruling: **Grok.** Nothing for her lands on radar until she asks for something specific.
When it does, GLM's mechanism applies (separate Unix user, DB, bot token, no tool that can
reach a roster). The child-data rule must be a *mechanism*; this is it.

**News product priority — Grok says the packet "recenters news after the owner deprioritized it."**
Ruling: **partially right.** Sean clarified mid-session that the architecture is
radar=scheduler → SwanGuard=scraper/archive → Hermes=consumer, and that his *time* should go
to the training business. Both are true. Sequence below honours it: business-money items
first, then the one news slice he is actually waiting on (mock data gone), then the rest.

## 3. Unique insights worth keeping (one per seat)

- **GLM — "the system may never fabricate presence."** Sean's mock-data anger generalised
  into a law: every surface renders data-as-of, enabled-source count, last job status;
  empty states say what is missing and the next action; CI bans mock imports outside
  fixtures. This is the immune system against dead collectors and silent job failures.
- **Grok — three principals, not one.** `training_ro` Postgres role (SELECT on training,
  nothing else) for T1; a separate `news` DB/user for ingest/archive/catalog; the news agent
  gets catalog+archive tools only — never `send_message`, never training tables. This is
  what makes "T1 is near-zero blast radius" actually true instead of asserted.
- **Fable seat — the restic password is inside the backup it protects.** A from-scratch
  restore needs the password to decrypt the archive containing the password. Must live in a
  password manager tonight. All three copies are noise without it.

## 3a. Correction to the packet's own evidence (found after all seats reported)

The round-1 packet said "~51 creators / ~39 sources seeded, all default-off." That is true
of the repo's seed CLIs and the desktop DB. **On radar it is false: `creator`,
`news_rss_sources`, `content_items`, `creator_item`, `feed_profile` are all 0 rows.** The
seed has never been run on the box. So the newsroom-on-radar path has *three* gates, not
two: seed → enable → ingest, before the feed endpoint has anything to serve. Every seat
reasoned from the stale number; none could have caught it — it required a query.

## 4. Blind spots none of us caught until now

- **Nobody defined "hot."** The product's promise has no ranking function. Until it is a
  number (recency × source-velocity × interest weight), the newsroom is a sorted list.
- **Local news** was asked for and has no viable API. Needs a named strategy or an honest
  "not in v1."
- **B1 (Ox, the round's best catch): the corpus → personal-agent leg has no host that can
  run it.** The box is banned from inference, the 5090 is off and unwakeable, and even the
  RAG-free greppable-catalog design still needs *something* to execute the grep and the
  model call. "Underspecified" was the wrong word — it is **unhosted**. Resolution:
  **episodic invocation** — the box (or Hermes on the 5090 when it happens to be up)
  *triggers* a hosted-API agent run on schedule/event and holds no resident model process.
  That converts "24/7 agent" into "24/7 trigger," which the box can host, and is consistent
  with the already-decided kill of the resident agent. This is now a round-2 build item (O3).
- **C1 (Ox): the owner digest is a zero-PII-rule collision waiting for its first prompt.**
  The instant any *judgement* step in T1 is model-mediated, client identities flow to an
  external model. Compliant design, now mandatory: deterministic SQL computes the candidate
  IDs; only IDs leave the DB; names are resolved locally at render time into the chat
  message; **no model is invoked in the T1 path at all.** Round 1 already put T1 on a
  read-only role — this adds "and no LLM."
- **C4 (Ox): Chromium next to Postgres is the most probable real outage.** Already
  pre-empted this session — the browser unit ships `MemoryMax=768M` and enforcement is
  proven by an oom-kill at 64M. Ox's warning is real and already answered; every *future*
  co-tenant unit inherits the same rule.

## 5. The fused sequence (solo operator, evenings)

1. **DMARC** — Sean, ~10 min, Namecheap. Unblocks all client email. *(Sean-only.)*
2. **Dead-man pinger + Tailscale** — trust layer, ~35 min. *(Pinger scripted; blocked on
   `hc-url.txt`.)*
3. **Offsite leg 2 + prove an offsite restore** — 3-2-1 closed. *(Scripted; blocked on
   `r2-creds.env`.)* **Then the password into a password manager.**
4. **Read-only browser fetch on radar (Tier 0)** — *(installing now.)*
5. **`/api/feed` + 3–5 sources from a written allowlist + ingest timer on radar + CI assert
   no mock imports + `count(*) > 0` gate** — mock data gone, *structurally*.
6. **T1 digest: cron SQL on `training_ro` → Telegram template, zero LLM, IDs only, unique
   `(digest_date, kind)` send ledger.** Fields: `availableSessions`, `lastActive`,
   `sessionDate`. Expect the first run to expose data hygiene.
7. **Timers manifest + job-log table + daily "N/N green" heartbeat** in the same Telegram.
8. Editorial brief v1 → daily 5-item brief → collection auditor → weekly source discovery.
9. T2 drafts with `/send /edit /drop` approval in Telegram — after email warm-up has history.
10. Partner lane: only when she asks; then GLM's mechanism.

**Killed, not deferred:** 24/7 agent (all flavours), SMS, social-platform timeline
scraping, coding agents on the box, the nudge engine, an embedding re-decision under
pressure.

## 6. Carried into round 2

The decisions above are input, not open questions. Round 2 should attack: the definition
of "hot"; the local-news strategy; the exact Hermes ↔ SwanGuard contract (front-page +
entity cards + FTS) as a build spec; the timers manifest as an artifact; and whether the
sequence above survives contact with a solo operator's real week.
