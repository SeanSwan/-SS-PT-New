# Panel packet — always-on box: what should it actually DO? — 2026-08-24

**Seats:** Ox Alpha, GLM 5.3, Fable-tier synthesis.
**Remit:** brainstorm better features and better logic. Find what is MISSING, not just what
is wrong. Absence-first. Push back on the framing if the framing is the problem.

**Privacy:** roles only. No personal names, no organisation names, no client identifiers.
Do not ask for them; answers containing them will be discarded.

---

## 1. The hardware and what is already built

An always-on Ubuntu server ("the box"): 6c/12t, 16GB RAM, ~185GB free, GPU is a 2013
card with no usable compute — **no local inference is possible on it.** A separate
workstation holds a modern GPU but is powered off most of the time, and cannot be woken
remotely (exhaustively disproven). That asymmetry is the whole reason the box exists.

Already live on the box, all proven this session:
- Postgres holding one product's full schema (61 tables) — a single source of truth
- Daily DB dump with restore-verification
- **Backup hub leg 1**: the workstation's encrypted backup repo (40 snapshots, 5.3GB)
  copies nightly to the box over a restricted sftp-only key; retention prunes daily and
  **fails closed if it cannot write its own status file**
- Leg 2 (offsite to object storage) is scripted but not yet run — pending credentials

Standing constraints: no inference on the box; anything co-tenanted with the database
needs a memory ceiling or a runaway process gets the *database* OOM-killed; agents get
no sudo and no docker-group membership.

---

## 2. The owner's stated wants, verbatim in substance

He is a personal trainer running a training SaaS, plus a second product (a news/creator
intelligence app). He also wants the box to serve his partner, a teacher.

1. **"I want a coding agent running 24/7 doing research and staying on top of the news"**
   — from many APIs and countries.
2. **But** the news product is *supposed to already do that itself.* He asks directly:
   **"is it worth doing it both ways? Is there any benefit, or should the app just do it
   itself?"**
3. **Priority correction:** he would rather the box focus on **his training business** —
   scheduling clients, sending messages and email — than on news.
4. He wants **alerts to his phone**, via chat-app or SMS.
5. He wants transactional email "working right."
6. **The complaint that matters most:** *"whenever I open the newsroom it's showing mock
   data. I hate mock data. I'm trying to USE the app already."*
7. **For his partner:** the same machinery — help her schedule, send email, stay on top of
   social posts, "so we look immaculate because we're on top of everything." Explicitly
   motivational: nudge her toward **being her own boss and out-earning teaching/tutoring**.
   Direction constraint in his words: **"no daycare, only opening their own school."**
8. Earlier in the same session he said the box was wanted so **browser automation stops
   opening and closing windows on his workstation while he works** — stealing focus and
   swinging memory. This requirement appeared in **no** prior planning document.

---

## 3. Evidence gathered this session (verified, with controls)

- **The news product's ingest path is genuinely brain-free.** Four ingest modules return
  **0** LLM references; the control file (`agentRuntime`) returns **5**. The probe works.
  Collection needs no model.
- **The news product has no scheduler of its own.** No cron/interval found in its source.
  So "the app does it itself" is *not true today* — something external must drive it.
- **The newsroom's real feed endpoint does not exist.** A search for the feed route
  returns nothing, while the control lists seven real route files that do exist. Mock data
  is served from ~8 web modules because **the real path was never built.**
- **Even with the endpoint, the feed would be empty**: ~51 creators and ~39 sources are
  seeded but **all default-off** by a deliberate law, and ingest has never run.
- **Deliverability for outbound email is gated on an unset DNS authentication record**
  that has been outstanding for about a month. It blocks nurture and booking email.

---

## 4. The current working answer — attack it

**On "both ways":** they are not two ways to do one job, they are two jobs.
*Collection* is deterministic — fetch, dedup, store, backfill, diff. A pipeline does it
free, auditably, and scales to hundreds of sources. An agent doing collection pays
premium tokens to do it *worse* (no dedup, no schema, no idempotency, no replay).
*Judgement* — "what matters, what's a story, what should he see" — is the part the
pipeline cannot do and the model genuinely can.
**Proposed rule: the app collects, the agent judges.** Never both collecting. Agent cost
then scales with how much gets summarised, not with how many sources are watched.

**On the mock data:** the fix is not "delete the mock." It is (a) build the feed
endpoint, (b) enable a small set of sources deliberately, (c) run ingest on a timer from
the box. Mock data should then be structurally unreachable, not merely unused.

**On messaging, tiered by who receives it:**
- **T1 — alerts to the owner only.** The box reads production read-only, computes who is
  stale / low on sessions / has a session tomorrow, and sends *him* a digest. Nobody
  external receives anything. Near-zero blast radius. Build first.
- **T2 — drafts for clients that he approves before sending.** Approval plus receipt.
- **T3 — fully automatic client messages.** Narrow, safe cases only, much later.

**On channels:** for alerts to himself, the chat-app bot he already runs beats both email
and SMS — instant, free, no deliverability problem, no new vendor. SMS adds a paid vendor
for zero benefit when the same phone receives chat. Transactional email matters only for
*client-facing* mail, and is blocked on the DNS record.

**On the partner's lane — the split that must not blur:** her classroom work is governed
by a strict child-data rule (no child, family, roster, or organisation detail may ever
reach a cloud context). Her *personal* business-building — calendar, email, social posts —
contains no child data and is an ordinary lane. **Separate credentials, separate storage,
separate assistant.** One assistant serving both puts child data one prompt away from
cloud services.

---

## 4a. Owner's clarification of the intended architecture (received mid-session)

He corrected the framing, and the corrected version is coherent. **Three parts, not one:**

```
  sources  ──►  news product  ──►  archive (corpus grows)  ──►  personal agent
  (scrape)      (scrape+rank)      (saves everything)          (reads the corpus)
                      ▲
                      │ driven by
                 the always-on box  =  SCHEDULER ONLY
```

- **The box is the scheduler.** It is not supposed to do the work; it is supposed to make
  the work happen on time. This is a smaller and better-defined role than section 2
  implied.
- **The news product is the scraper and the surface.** Its job: watch video platforms,
  company pages, a social platform, aggregator sites, cybersecurity feeds, world news,
  politics, and **local news for his area** — continuously — then surface "the hottest
  information as it comes out."
- **It also archives.** Everything is saved, so the corpus compounds over time.
- **The corpus feeds his personal agent.** He wants that agent to *know the news*, and
  says the news product is meant to connect to agent harnesses. **This is the leg most
  likely to be underspecified — it is stated as a goal with no mechanism.**
- **Domain motive:** the creators he tracks (AI video, generative tooling) break news on a
  social platform and on company pages first, not in press coverage. Latency matters.

**Two landmines the panel should address directly:**

1. **The social-platform API is now expensive and hostile.** Read access at any useful
   volume is a paid tier costing meaningful money per month; free access is effectively
   unusable for timeline monitoring, third-party mirrors are unreliable, and scraping is
   against terms and gets blocked. "Monitor it at all times" may be the single most
   expensive line item in this plan. **Is there a cheaper substitute that captures most of
   the signal** — company blogs/RSS, release notes, changelogs, aggregator front pages,
   newsletters — or is the social platform genuinely irreplaceable for latency?
2. **"Gets smarter through this news" collides with a standing architectural prohibition.**
   This project has an explicit, deliberate ban on vector/embedding/RAG infrastructure,
   with a recall layer built instead as a generated, greppable catalog of pointers. The ban
   has a written re-decision threshold: roughly 2,000 catalog rows or 5,000 items in one
   store. **A continuously-growing news archive crosses that threshold fast.** So: does a
   compounding news corpus force the re-decision, or is there a design where the archive
   stays large but the *agent-facing index* stays small and greppable? Answer concretely —
   this is a governed decision, not a free choice.

## 5. What the panel should produce

1. **Absence-first gap analysis.** What is missing from the above that should exist —
   ranked by value or money left on the table. Be specific enough to build.
2. **Attack the "app collects, agent judges" rule.** Where does it break? Is there a class
   of research where an agent genuinely *should* fetch? Name it concretely.
3. **The 24/7 agent question, honestly costed.** If an agent runs continuously, what is it
   actually doing that is worth the spend? If the honest answer is "very little," say so.
4. **Sequencing.** Given a solo operator with limited evenings, what order? What should be
   *killed* rather than deferred?
5. **The motivational-assistant idea for the partner** — is a system that nudges someone
   toward starting a business a good idea or a bad one? What makes it land vs feel
   nagging? What would you build instead?
6. **What breaks at scale.** The box has 16GB and no GPU, holds a production database, and
   the owner works alone. What in the plan above falls over first?
7. **The thing nobody asked about.** One observation the owner did not request and would
   not have thought to ask for.

Disagree with the framing where it deserves it. A confirming answer is worth little here.
