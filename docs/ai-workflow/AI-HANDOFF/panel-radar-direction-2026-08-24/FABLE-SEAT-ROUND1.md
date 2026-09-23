# Fable-tier seat — round 1, written BEFORE reading Ox or GLM

**Model:** claude-opus-5 (Fable-tier by Sean's 2026-08-10 designation), Final Decider role.
**Discipline:** written blind so it is a third independent view, not a reaction. Synthesis
happens after all three land.

---

## 1. Absence-first — what is missing that should exist

Ranked by value left on the table.

1. **A definition of "hot."** The whole product promises "the hottest information as it
   comes out" and nothing in the plan defines the ranking function. Recency? Velocity
   across sources? Sean's stated interests? Until this is a number, the newsroom is a
   chronological list wearing a nicer name. **Missing, and load-bearing.**
2. **The Hermes-facing contract.** "SwanGuard connects to agent harnesses" is stated as a
   goal with no interface. What does Hermes call? What comes back? How big? Without this
   the archive compounds into something nobody reads.
3. **The admin digest to Sean (T1).** The single highest-value thing on the box for the
   business, and the cheapest — read-only production query, one Telegram message a day.
   It appears in no plan as a first-class item.
4. **A kill switch per timer.** Every scheduled job on radar needs a one-line way to stop
   it without SSH. Nothing has it.
5. **Local-news sourcing.** Sean asked for it explicitly. Local news has no good API and
   is the hardest source class in the list. It needs a named strategy, not a checkbox.

## 2. Attacking "app collects, agent judges"

Where it breaks: **discovery.** A pipeline can only watch sources it has been told about.
The one job an agent genuinely does better is *finding the next source* — "this creator
just moved platforms," "this new lab started a blog." So the rule survives with one
amendment: **the app collects, the agent judges, and the agent also proposes new sources —
but proposes only.** A human enables. The default-off law already encodes this.

Second break: **paywalled and JS-rendered pages.** A fetch pipeline cannot read them; a
browser can. That is the read-only browser-job class from Tier 0, and it belongs to the
*collection* side even though it runs a browser. Browser ≠ brain.

## 3. The 24/7 agent, costed honestly

What would a continuously-running agent actually do between events? **Poll.** That is the
entire answer. Polling is what timers are for and costs nothing. Every token spent by an
idle agent waiting for news is waste. **The correct shape is event-driven:** the pipeline
collects on a timer, and an agent is *invoked* once per digest window (or on a threshold —
"N new items from watched sources") to judge. Agent runtime scales with editorial volume,
not wall-clock. A 24/7 agent is the single most expensive way to build a cron job.

## 4. Sequencing for a solo operator

**Kill, not defer:**
- X/Twitter API monitoring at volume. Price it once, then treat it as out unless a
  specific creator is provably only there. Company blogs + release notes + a handful of
  aggregators capture the substance; latency loss is minutes to hours, which is fine for a
  daily digest.
- SMS alerts. Telegram already reaches the same phone for free.
- A 24/7 agent. See §3.

**Order:**
1. DMARC record (10 min, Sean-only, unblocks all client email).
2. Dead-man pinger + Tailscale (trust layer, ~35 min).
3. `/api/feed` + enable 5 sources + ingest timer on radar → **mock data gone.** This is the
   one Sean is actually waiting on.
4. T1 admin digest to Telegram (read-only production → Sean).
5. Read-only browser jobs off the 5090 (Tier 0).
6. Hermes ↔ SwanGuard contract (design first; see §6).

## 5. The motivational assistant for the partner

**Nudging someone toward a life change is a good idea only if it is opt-in and paced by
her, and a bad idea otherwise.** An assistant that unprompted says "have you thought
about starting your own school today?" becomes noise in a week and resentment in a
month. What lands:
- **She sets the goal and the cadence.** The assistant holds her to *her* stated plan
  ("you said Tuesdays were for the business plan — here's 20 minutes of research done").
- **It does work, not pep talks.** Draft the licensing-requirements summary. Find the
  three nearest comparable schools and their pricing. Pull the state's requirements page.
  Momentum comes from progress, not encouragement.
- **It respects the split.** Her business lane has no child data; it can use cloud
  services freely. Her classroom lane cannot. Two assistants, or one with a hard wall.

I would build the *work* half and let motivation be a side effect of visible progress.

## 6. What breaks first at scale

**The archive.** Not disk — 185GB holds years of text. **The recall design.** This project
bans vector/RAG with a written threshold (~2,000 catalog rows / ~5,000 items). A news
corpus blows through that in weeks. Two honest options:

- **(a) Keep the ban; make the archive a *store* and the index a *digest*.** Hermes never
  reads the archive. It reads a daily/weekly editorial summary (a few hundred lines)
  that the judge-agent produces. The catalog indexes *digests*, not *articles*. The
  archive remains for humans and for re-summarising later. Stays under threshold
  indefinitely. **This is my recommendation.** It also happens to be what "gets smarter"
  actually means — Hermes gets the *judgement*, not the raw feed.
- **(b) Trigger the re-decision.** Full-text search (Postgres FTS is already there for
  the vault) over the archive. Not vectors — FTS. It is deterministic, greppable in
  spirit, and the ban's stated rationale (knowledge graphs and embeddings for flat
  lookups) does not obviously cover it. Worth a written re-decision, not a drift.

Second to break: **memory co-tenancy** once browser jobs and ingest run together. Every
unit gets `MemoryMax=` or the database is the thing that dies.

## 7. The thing nobody asked about

**The restic password lives inside the backup it protects.** `~/hermes2/.hermes/` is a
REQUIRED path in the Hermes backup, so the password file is encrypted *by itself*. A
from-scratch restore — the only scenario the offsite leg exists for — needs the password
to decrypt the archive that contains the password. Every copy on every machine and in
every cloud bucket is useless without a copy of that 40-byte file living somewhere that
is *not* the backup. This is not a nicety; it is the difference between having backups
and having encrypted noise.
