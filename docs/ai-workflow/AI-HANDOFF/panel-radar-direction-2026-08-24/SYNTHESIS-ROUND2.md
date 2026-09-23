# Round 2 synthesis — from decisions to a buildable spec — 2026-08-24

**Final Decider:** claude-opus-5 (Fable-tier). **Seats:** GLM 5.3 (`R2-GLM-5.3.md`, 298 lines,
exceptional), my blind Fable seat (`R2-FABLE-SEAT.md`), and the real **Ox Alpha round-1**
(`OX-ALPHA.md`) whose B1 reshaped this round. Ox round-2 (`R2-OX-ALPHA.md`) still 429ing;
slot open, but round-1 Ox + GLM r2 converge so hard that its absence does not block a verdict.

**How this round differs from round 1:** round 1 decided *what*. This decides *how*, with
data shapes, the one test each piece must pass, and the first-night runbook. GLM r2 did the
heaviest lifting and its spec is adopted almost whole; my seat and Ox supply the corrections
below.

---

## 1. The three amendments to round 1 that survived contact with what was built

1. **"Agent gets catalog+archive tools" was too loose.** The dump-dir hole this session
   (agent could read the DB dumps until tightened) proved the box's law is *grants, not
   conventions*. Amended: the agent DB role gets `EXECUTE` on five functions and **zero
   table grants anywhere**; archive depth is single-fetch-by-id through `SECURITY DEFINER`.
   *(GLM; adopted.)*
2. **DNS is item #1 by minutes, not importance — and only if stapled to a validator.**
   Nothing running depends on it, so a typo'd edit is a silent no-op. The evening that owns
   the edit owns the `dig` + dependent-service verify. *(GLM + my O5 ruling; adopted.)*
3. **The 30-day substitute-tier clock has no start condition.** All sources are default-off,
   so "30 days of lateness data" can elapse over an empty corpus. Attach the clock to
   *first-enabled-source date*; surface `enabled_source_count` in the heartbeat. *(GLM;
   adopted — and it is the same class as the round-1 correction that radar's news tables are
   0 rows: every "it's collecting" assumption in this project has been false so far.)*

## 2. The catch that reorganised the round — Ox B1

**The corpus → personal-agent leg had no host.** Box can't infer, 5090 is off/unwakeable,
and even the greppable catalog needs a shell + a model call somewhere. **Ruling: episodic
invocation.** The box holds no resident model. `digest-gen` (06:30) makes **one** hosted-API
call against yesterday's frozen front page + changed cards, emits the briefing section and
interest proposals, and the *existing* 06:47 briefing job delivers it. "24/7 agent" is dead;
"24/7 trigger" is the box's real job. Every seat now agrees, and it is consistent with the
round-1 kill of the resident agent — B1 just proved the kill was mandatory, not stylistic.

## 3. The adopted build spec (source: GLM r2, with the corrections noted)

- **O1 "hot":** cluster-level score `100 × (0.30 freshness + 0.25 velocity + 0.25 sourceq +
  0.20 interest)`, ~4h half-life, over **`first_seen_at` never `published_at`** (a source
  can backdate; the box's own clock cannot be lied to). Payload carries the four components
  so a solo operator can debug the score with one `psql`. Front page = 20 clusters, 48h
  window, max 3/source, total-ordered tie-breaks. **Correction from my seat:** GLM's
  `interest` renormalisation-to-/0.80-when-empty is cleaner than my flat weight; adopted.
- **O2 local:** `news.locality` + a fixed allowlist, five source classes (municipal/county
  primary feeds first — agendas precede coverage by days), **never geo-inference**. No
  completeness claim. **Correction from my seat, verified from radar:** Google News RSS
  (`news.google.com/rss/search?q=`) returns 200 after one redirect (fetch `-L`) and is the
  keyless local backstop; Product Hunt 403s a headless fetch and is dropped.
- **O3 contract:** `agent_face` schema, four artifacts capped to **≤2,000 rows schema-wide**
  (120 front pages + 800 entity cards + 1000 pointers + 50 proposals), five `SECURITY
  DEFINER` functions, `search` refuses `lim > 20`. The row cap is an *asserted invariant* —
  regen exits 1 with per-table counts if exceeded, never "just raise 2,000." This is the
  concrete answer to the RAG-ban collision: the archive grows without limit; the *catalog*
  is bounded by construction because it scales with entities+days, not items.
- **O4 timers manifest:** `ops/timers.toml` in the repo → generated `*.service`/`*.timer`
  stamped with the source SHA; `render-timers --check` in CI fails on drift; `box-run`
  wrapper makes *every* job "refuse to run if it cannot record itself" (exit 3), generalising
  the backup convention proven this session; `box-heartbeat` at 06:25 posts one chat line
  with **four states including `blocked`** so a scripted-but-uninstalled job (offsite,
  dead-man) reads as *named-and-counted*, never absent. **Correction from my seat:** the
  manifest needs an `installed:` / `blocked_on:` field — GLM's table already has it
  (`blocked: credential`); adopted. **Correction, verified:** only 4 of the seed jobs are
  actually installed on radar right now (db-dump, restic-retain, browser-fetch, health);
  offsite + dead-man are scripted-not-installed; the heartbeat must show them `blocked`.
- **O5 survives-the-week:** the step whose failure goes unnoticed for a month is **DNS** —
  it never fails loudly because nothing consumes it yet (offsite at least errors on a bad
  upload). Fix is not resequencing but stapling `dig` + a test-send to the same evening.

## 4. Consensus, contradictions, unique insight — round 2

**Consensus (all seats):** episodic invocation not resident agent; grants-not-conventions;
`first_seen_at` as the trust clock; the no-fabricated-presence law made mechanical via
`data_as_of` + `degraded` on every surface; the manifest as the box's real product; the
offsite *restore drill* (not the upload) as the true test of leg 2.

**Contradiction, arbitrated — the single most-unnoticed failure.** Ox: the offsite restore
drill. GLM + my seat: DNS. **Ruling: DNS.** A broken offsite upload turns the backup job red
in the heartbeat that same night; a wrong DNS record produces no job, no red, no signal —
its consumers don't exist yet, so nothing watches it, and the "done" checkbox goes cold for
months. Both get fixed the same way (a probe stapled to the action), but DNS is the one the
heartbeat structurally cannot catch, so it is the more dangerous.

**Unique insight kept, one per seat:**
- **GLM — `box-heartbeat` must detect *absence*, not just failure.** A deleted status file
  or a stopped timer must read red, not vanish. "A scheduler without absence-detection lies
  by omission." This is the mock-data law applied to the scheduler itself.
- **My seat — the allowlist/weights/enable-flags are the product's real config and live
  only on the box.** A rebuild restores a machine with no opinions. They must live in the
  repo and deploy to the box, never be edited in place. (Pairs with O4's manifest-in-repo.)
- **Ox — the box has an unexamined *inbound* surface.** sftp intake + a chat bot + timers +
  browser automation, and the packet never said whether the box is internet-facing or what
  the patch/allowlist posture is. Round 3 (or Tailscale-join time) must produce an exposure
  statement.

## 5. The buildable sequence (supersedes round 1's ten steps)

Evenings, 60–90 min each, solo operator. Built items marked ✅.

- ✅ **Backup leg 1**, ✅ **read-only browser fetch** — done + proven this session.
- **E1 — DNS edit + `dig`/test-send validator** (owner, 15 min). Then enable 3–5 sources
  incl. 2 local; `newsctl ingest --bootstrap` asserts day-count > 0 (exit 4 if not). *Starts
  the 30-day clock and the corpus.*
- **E2 — offsite leg 2** (blocked on `r2-creds.env`): enable → forced run → **restore one
  file from R2 and diff it** → record exits. **Then the restic password into a password
  manager** (it lives inside the backup it protects). *3-2-1 closed and provably restorable.*
- **E3 — dead-man** (blocked on `hc-url.txt`): enable → **stop the pusher 10 min, confirm
  the external alert lands**. *The scheduler now has an outside observer.*
- **E4 — `/api/feed` to the ratified envelope + `agent_face` schema + mock-kill CI grep +
  `count(*)>0` assert.** *Mock data structurally gone; feed serves real rows or an honest
  empty state.*
- **E5 — T1 owner digest: deterministic SQL on `training_ro`, IDs only, names resolved
  locally, no LLM, unique `(digest_date, kind)` ledger → the 06:47 chat.** *First business
  ROI on the box; C1 collision avoided by construction.*
- **E6 — timers manifest `ops/timers.toml` + `render-timers --check` in CI + `box-heartbeat`
  06:25.** *The box becomes a verifiable scheduler; every prior job absorbed into it.*
- **E7+ — episodic `digest-gen` (one model call) → news section in the briefing → collection
  auditor → weekly source-discovery → T2 drafts with chat approval (after email warm-up).**

**Owner-owed, gating:** DNS (E1), R2 bucket+token (E2), healthchecks URL (E3), restic
password into a manager (E2), Render key rotation (standing).

## 6. What round 3 should attack (if run)

The inbound-exposure statement (Ox); the T2 approval flow as a real spec (Ox B5 — it got one
sentence and it is where the client-facing blast radius lives); and whether "episodic
invocation" wants Hermes-on-the-5090 or a hosted API as the executor, costed.
