---
decision: radar = read-only agent lane + always-on money machine; box holds NO prod-DB credential (app is the P0→P1 boundary); tiers by egress boundary; deterministic floor first; app sends after in-app approval
status: open
supersedes: none
---
# Brainstorm: radar PC — utilization to the fullest (grill-me, continued)

**Date:** 2026-08-24  ·  **Status:** complete (grill closed by Sean 2026-08-24; build not started)  ·  **For:** radar box (Ubuntu 24.04, Ryzen 1600X, 16 GB, no usable GPU) — what it runs, what it must never run, and in what order

**Continues from:** `c:\tmp\RADAR-SESSION-HANDOFF-2026-08-24.md` (built/proven state + 2-round panel verdict), `c:\tmp\RADAR-MAXIMIZE-BRAINSTORM-2026-08-24.md` (options menu Tiers 0–J), panel dir `docs/ai-workflow/AI-HANDOFF/panel-radar-direction-2026-08-24/`.

## Summary
Sean bought radar so background work stops stealing his desktop: browser jobs, harness runs, schedulers, backups. Two of three ordered slices are built and proven (backup leg 1, read-only browser jobs); offsite + dead-man are scripted and wait only on two credential files. This grill closes the decisions the prior sessions left open — starting with the one that defines the box: do the coding agents themselves run on radar, or only the scripts they write?

## Key Decisions (inherited — SETTLED by the 2-round panel; not re-asked here)
- App collects, agent judges; no 24/7 resident agent — episodic invocation per digest window.
- T1 owner digest = deterministic SQL, IDs only, no LLM in the path.
- Telegram for alerts; SMS killed.
- DMARC = roadmap #1, stapled to a validator the same evening.
- No X/Twitter scraping or paid tier until 30 days of substitute-tier data (clock starts at first-enabled-source).
- Partner lane: nothing on radar until she asks; when it lands → separate Unix user/DB/bot token.
- No vector/RAG re-decision; `agent_face` catalog ≤2,000 rows, grants-not-conventions.
- Law: the system may never fabricate presence (data-as-of + enabled-source count on every surface; mock imports banned outside fixtures).
- Cloud offsite = Cloudflare R2 (new bucket, bucket-scoped token). Dead-man = healthchecks.io free tier.
- RAM: don't buy until a job is measurably RAM-blocked. Gaming never on radar (5090 + Parsec).
- 7-evening build sequence E1–E7 (SYNTHESIS-ROUND2 §5).

## Key Decisions (this grill)
- **North star: money while asleep.** radar is the always-on money machine + "main boss" that watches everything; Sean checks in and clicks buttons. Cap: ≤4 training hours/day.
- **Long game:** Sean Swan = AI consultant; a team building apps via AI on the SwanStudios protocol. radar work should compound toward that, not away from it.
- **radar gets its own brain credential** — originally a capped OpenRouter key (Q2); **superseded by Q11**: provider-pluggable, GLM coding plan default ($0), OpenRouter as the capped fallback, deterministic floor. Episodic invocation, works while the desktop is off.
- **Privacy tiering is the decision, not the 4-hour cap:** raw private data (schedule, client follow-up) → local Hermes+Qwen only; redacted IDs-only data → cloud, but ONLY through a hardened strip-before-cloud proxy (Rule 8 made bulletproof). Both paths must be adequate.
- **Who sends = the SwanStudios APP, after Sean's approval tap.** radar/Hermes decide + draft (one narrow write into an approval queue via the service account); the app holds all send credentials + compliance. Templated automations auto-send once armed.
- **Real pain = scheduling + client follow-up (Move Fitness on MindBody).** Sean wants texts/emails sent — ⚠ contradicts the Q1/Q6 read-only line; resolved explicitly in Q13.
- **Agent gets a SwanStudios SERVICE ACCOUNT with restricted read scope** (not admin). Workouts stay in-app.
- **Brain = provider-pluggable adapter.** GLM (Z.ai coding plan, subscription, $0) default → OpenRouter paid fallback under a hard cap → deterministic brief as the floor. Never silent.
- **YouTube engine = "what to post next, and why"** (forward-looking, decision-shaped). Production blueprint already exists; the growth half does not.
- **radar IS the consulting portfolio piece** — binding constraint: build it installable-for-someone-else. Configs in the repo, engines swappable, protocol written down.
- **Discord = community home + bot presence; Telegram = private boss channel.** Hard PII wall between them. Discord not yet stood up (Sean action).
- **Architecture = ONE boss + dumb collectors.** Deterministic collection, a single episodic judging call per brief, cross-engine ranking.
- **Reporting = one fixed-time brief + a short money-now interrupt list.** Attention is the scarce resource.
- **Action loop = radar drafts, Sean sends.** Send credentials never live on radar. Discord is now in scope (role TBD Q7).
- **All four revenue engines are in scope**, sequenced by blocker: client cash → membership funnel (same DB) → YouTube growth (OAuth) → trainer recruitment (needs onboarding path verified).
- **First job = business watch** ("what needs you today") via a READ-ONLY Render Postgres role, plus a marketing/YouTube mandate.
- **radar = read-only agent lane.** Timers + unattended agent with zero credentials, no logins, no git push. State-changing/authenticated work remains a separate governed decision, not inherited into this design.


## Key Decisions (panel-ratified 2026-08-24 — Ox + Grok 4.6 + GLM 5.3 + Qwen + Fable; synthesis at `docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/SYNTHESIS.md`)
- **D1 — The box holds NO production-DB credential.** Kill C2. The app exposes `GET /api/agent/facts/:engine` (validated P1 bundle) + `POST /api/agent/drafts` behind a dedicated **agent principal** (scoped token: `read:facts`, `write:drafts`; own namespace; never sets the user principal). Grok's cut, unanimous after synthesis.
- **D2 — Tiers are defined by EGRESS BOUNDARY, not by processor** (GLM): P0 = never leaves the home network; P1 = the app's facts bundle (aggregates + ≤N categorical rows, k≥3 suppression, app-minted handles rotated daily); P2 = public, always in isolated calls. Config `cloud_rows = none | topN` (default topN, N=10).
- **D3 — Deterministic + templated floor ships FIRST.** CPU-model on the box = one measured evening with a written decision rule (≥3 tok/s, zero hallucinations in 20 runs, beats templates on draft quality) — default off; the loser is deleted, not kept as a silent fallback.
- **D4 — Egress = one typed function**, allowlist-schema validated, canary-proven via the existing `scripts/lib/redact-egress.mjs`, hash-chained audit log (hashes, never bodies), CI fails on schema widening. Providers with no zero-retention path are excluded from P1 (P2 only).
- **D5 — Default-deny egress firewall on the box** (nftables `policy drop`, pinned endpoints) — Ox's headline; LAN isolation from the workstation where feasible.
- **D6 — Approval in-app only.** Chat notifications are structured and link-free (C5 is a persuasion channel). Drafts table is schema-distinct from automation sequences (no aliasing on arming day). Shown == sent byte-identical test.
- **D7 — Backups:** object-lock/immutability on the offsite bucket when leg 2 lands; restic excludes for agent state + credentials; decide whether `forget --prune` moves to the workstation (not time-critical) vs hardening the box's inbound.
- **D8 — Booking SaaS:** verify a read-only calendar/ICS feed exists; feed content is P0 on-box; brief prints a named gap until connected (never fabricate presence).
- **D9 — Portability acceptance = a four-env-var weekend install on a clean VM** (GLM). Repo = schemas/engines/unit templates/migrations/rubric/install script; box = secrets/salts/allowlists only.
- **D10 — Data at rest on the box:** swap off or encrypted; no P0 in journald; model caches on tmpfs; agent state excluded from backups.

## Q&A Log

### Q1: What is radar allowed to BE — does a coding/browsing agent run unattended on it, and with what reach?
- **Recommended:** Read-only agent lane — timers stay, plus an unattended agent that browses the allowlist, reads repos, runs tests/scans, reports to Telegram; NO credentials, no logins, no git push. It is the class already proven today, with judgment added.
- **Sean's answer:** Read-only agent lane. (Options rejected: scripts-only status quo; governed agent with credentials; full autonomy.)
- **Implication:** Credentials-on-radar is OFF the table for now — the authenticated browser class stays a separate, later, governed decision. Opens: what provides the intelligence on that lane, and what jobs run there. Closes: any design requiring Sean's logins, a push key, or admin-console reach on radar.


### Q2: When an unattended radar job needs judgment, where does the thinking happen?
- **Recommended:** A SECOND OpenRouter key created for radar only, with its own hard credit cap; episodic calls from scripts (the pattern the panel already ratified). Surfaced honestly that an API key IS a credential — but a class that cannot act as Sean, cannot reach an admin console, is one-click revocable, and is spend-cappable.
- **Sean's answer:** Own capped API key.
- **Implication:** radar can think while the desktop is off — the whole point of the box. Rejected: leasing to the 5090 (only fires when desktop is awake), subscription CLI on radar (account session on a headless box), no-LLM-at-all. Opens: spend cap value, which model tier per job. Closes: the "radar goes dumb when the PC sleeps" failure mode.

### Q3: What is the FIRST job on radar's new read-only agent lane?
- **Recommended:** Business watch — "what needs you today" from SwanStudios prod via a dedicated READ-ONLY Postgres role.
- **Sean's answer:** Business watch, YES — **and reframed the entire box around money.** Verbatim substance:
  - **Marketing is the point.** Help market SwanStudios to get more people to sign up: more members, more trainers, more clients. *"If I can get 1,000 people paying $15 a month, that's already a win. If I get 1,000 people starting off paying $5 a month, that is already a win."*
  - **YouTube.** Pull his own channel stats via the YouTube API, look at the stats that actually matter, and tell him **what videos to post next** — get better at YouTube, make more money.
  - **Money is #1 and urgent.** *"Making money is the number one priority right now. I desperately need to make money."* More clients → enough to start **hiring people to do the job**.
  - **The north star: make money while asleep.** A **"main boss" that watches everything** while Sean just checks in and clicks the buttons. Train **no more than 4 hours a day**, minimal hours; everything else is money or the things he wants to build.
  - **The long game: Sean Swan, AI consultant.** Help people build apps; build a **team who builds apps via AI using his protocol** (the SwanStudios protocol). He wants the IT/app lane too.
- **Implication:** radar's job description is no longer "background chores" — it is **the always-on money machine**: watch the business, feed the funnel, and eventually run the boss loop Sean checks in on. Opens: which revenue engine first, YouTube API credential class, spend cap. Closes: any framing of radar as purely defensive/durability infrastructure.

### Q4: Which revenue engine does radar serve FIRST?
- **Recommended:** Client cash engine first (only one that converts to cash in weeks; radar's work is arming/watching, not building). Honest math put to Sean: 1,000 × $15/mo = $15k/mo but prod has ~6 real users (distribution problem, quarters); 5 more local clients at $175/hr ≈ $3.5k/mo in weeks; trainers = the true leverage/asleep shape; YouTube feeds all and pays last.
- **Sean's answer:** **Client cash engine FIRST** ("let's go ahead and do option one"), with **all four in scope** ("if you could do all four, I'm down — and if you suggest it"). Grill-me's suggestion on record: yes to all four, because three of them read the SAME prod DB through ONE read-only role — the marginal setup cost is near zero. The real cost of all four is Sean's ATTENTION, which Q5 addresses.
- **Implication:** Portfolio = all four engines, sequenced by BLOCKER rather than preference — which is affordable because three of them read the SAME prod DB through ONE read-only role. Order:
  1. **Client cash engine** — blocked only on a read-only Render Postgres role. Live in one evening.
  2. **Membership funnel** — nearly free once (1) exists: same DB, different queries. Watch conversion from day one; meaningful once audience grows.
  3. **YouTube growth engine** — blocked on a read-only YouTube OAuth scope (Sean: Google Cloud project + one consent click). Second-highest value because it compounds and Sean asked for it explicitly.
  4. **Trainer recruitment engine** — needs the trainer onboarding/activation path verified before radar watches it; prospect tracking can start on the browser lane immediately.

### Q5: How should radar report — what interrupts, what waits?
- **Recommended:** ONE fixed-time brief carrying everything + real-time pings for a SHORT money-now list only (new inbound lead, failed payment, same-day cancellation).
- **Sean's answer:** One brief + money-now interrupts.
- **Implication:** Attention is the scarce resource, not compute. Rejected: everything-real-time (gets muted within a week — how alerting dies), digest-only (loses the <5min speed-to-lead window), pull-only dashboard (depends on remembering to look). Opens: what exactly qualifies as a money-now interrupt; brief delivery time.

### Q6: When radar spots an action worth taking, how does it get DONE?
- **Recommended:** radar drafts the actual message text, personalized, into the brief; Sean sends from his own phone. radar stays 100% read-only.
- **Sean's answer:** **Drafts in Telegram, Sean sends** — *"and I'm also gonna be using Discord too... add that into the whole entire plan."*
- **Implication:** The send capability never lives on radar. radar's value is deciding WHO + writing WHAT (the hour-consuming part). Upgrade path stays open: drafts queued into the app for in-app approval (one narrow write grant, app holds the credentials) once money is flowing. Rejected outright: radar holding SendGrid/SMS credentials. **NEW BRANCH: Discord enters the plan — role to be resolved in Q7.**

### Q7: What role does Discord play?
- **Recommended:** Both, split by audience — Discord = community home (members/trainers: challenges, progress sharing, wins, accountability = the belonging surface that justifies a $5–15/mo membership); Telegram = Sean's PRIVATE boss channel (client names, money, drafts). Hard wall: no client PII ever crosses into Discord.
- **Sean's answer:** Both, split by audience. Added: *"I set up Telegram and after that I was gonna set up Discord too, so my bot could be there as well. But I just haven't set it up yet."*
- **Implication:** `[VERIFIED]` **Zero Discord references exist anywhere on `origin/main`** — genuinely net-new, no pattern to match. Discord is therefore a Sean-action prerequisite (server + bot), not something radar can bootstrap. Hermes/the bot gets a Discord presence alongside Telegram. radar may post community-safe content only (leaderboards, challenges, public wins) — never business data. Rejected: Discord replacing Telegram (the Telegram bot push is PROVEN — Morning Ops Briefing delivers daily 06:47; do not discard a proven channel).

### Q8: One boss, or one agent per engine?
- **Recommended:** One boss + dumb collectors — deterministic scripts collect facts from all four engines (no LLM, cheap, testable); ONE episodic call reads the whole picture and writes the brief + drafts + the ranked next action.
- **Sean's answer:** One boss + dumb collectors.
- **Implication:** Confirms and extends the panel's "app collects, agent judges" law to Sean's own business lane. One call per brief = one voice, one cost, and cross-engine ranking ("ignore YouTube today, call these 3 people"). Rejected: per-engine agents (4× cost, four opinions, no cross-ranking), deterministic-only (can't draft or prioritise), boss+specialists (spend cap becomes agent-controlled). Opens: the collectors' fact contract; the spend cap number.

### Q9: What decision should the YouTube engine make each week?
- **Grounding:** `[VERIFIED]` the existing `youtube-production-studio-blueprint-2026-08-11.md` covers **production** (footage → published video, sync/drift, proxy workflow, 5090 render). Analytics/retention appears only as a deferred MEDIUM item (build-order row 11 = "no"). The growth-decision half Sean asked for is genuinely uncovered.
- **Recommended:** "What to post next, and why" — a ranked content queue with evidence.
- **Sean's answer:** What to post next, and why.
- **Implication:** The engine is forward-looking and decision-shaped, not a dashboard. Inputs: own-channel retention by topic, title/thumbnail CTR, search terms that found him, under-served topics. Rejected as the primary job: backward-only diagnostics, competitor-only market intel (what works for a 500k channel misfires for a new one). **Upgrade path: "which videos actually make money"** — the truest measure, blocked on attribution (tracked links, referral capture, signup source) which is a build, not a read.

### Q10: How does the AI-consultant ambition relate to radar?
- **Recommended:** radar IS the portfolio piece — build it as an installable "AI business operator"; every decision asks "could I stand this up for someone else's business in a weekend?"
- **Sean's answer:** radar IS the portfolio piece.
- **Implication:** **This becomes a binding design constraint on every slice**, at near-zero cost (discipline, not code): configs live in the repo and deploy TO the box (never box-only — which the panel already demanded for allowlists/weights/flags); engines are swappable modules with a declared fact contract; the protocol is written down as it is built. Output = a machine that makes Sean money AND the demo/product the consulting business sells. Rejected: separate builds (same system twice), a 5th consulting-lead engine (splits attention before either business pays), team-infrastructure-first (infrastructure for revenue that does not exist yet).

### Q11: Hard monthly credit cap on radar's brain?
- **Recommended:** $10/mo hard cap, mid-tier model, one brief/day; on cap-exhaustion **fall back to the deterministic brief, never go silent**.
- **Sean's answer:** **Reframed the question — make the provider PLUGGABLE.** *"We're going to need the option to be able to run OpenAI or subscription plans because I have GLM 5.3 and I have OpenAI and ChatGPT as well... instead of even having to pay, which is probably what I might do. Pay will just be optional."*
- **Grounding found in-repo (rule 18/49 — explored instead of asking):**
  - `[VERIFIED]` **GLM is already wired as a SUBSCRIPTION seat** — `scripts/consult-glm.mjs` uses `ZAI_API_KEY` against `https://api.z.ai/api/coding/paas/v4/chat/completions` (the Z.ai **coding-plan** endpoint, not per-token billing). GLM 5.3 is usable as radar's brain at $0 marginal cost.
  - `[VERIFIED]` **`ZAI_API_KEY` is NOT present in `.env`** (presence-check only, rule 59) — transport exists, key is stored elsewhere. Must be provisioned on radar.
  - `[VERIFIED]` `consult-fable` / `consult-sol` (GPT) / `consult-kimi` all route through **OpenRouter = per-token paid**.
  - `[LIKELY]` **ChatGPT Plus/Pro does NOT include OpenAI API access** (billed separately). Evidence in-repo: Sean's own GPT seat pays via OpenRouter rather than a subscription endpoint. **Verify before depending on it.**
  - `[VERIFIED]` `consult-qwen.mjs` → local Ollama `127.0.0.1:11434` = free but 5090-dependent → **fails radar's always-on requirement**; not eligible as the boss brain.
- **Implication / DECISION:** radar's brain is a **provider-pluggable adapter**, not a hardcoded vendor:
  1. **GLM (Z.ai coding plan) = default boss brain** — subscription-flat, $0 marginal.
  2. **OpenRouter = optional paid fallback**, behind a hard cap (recommended **$10/mo** default until evidence justifies more).
  3. **Deterministic brief = the floor.** If every provider fails or the cap is hit, radar still sends the raw numbers. **It never goes silent** — a boss that vanishes when it runs out of money is worse than one that says "no budget today."
  This also directly serves the Q10 consulting-portfolio constraint: a client will have *different* subscriptions, so a swappable provider layer is required for the product anyway.

### Q12: What should radar do about the ≤4h/day goal?
- **Recommended:** Track the "freedom number" (what mix of clients/members/trainers = 4-hour days) as a metric in every brief, rather than guard a ceiling Sean is not yet hitting.
- **Sean's answer (rich — captured in full; contradictions flagged, NOT smoothed over):**
  1. **Privacy tiering is the real decision.** *"I would prefer to use Hermes and Qwen for privacy reasons, otherwise we're using cloud computing... I don't know if I want my entire schedule... going straight to Claude. Nobody's doing it like that."* → Private data (schedule, client follow-ups) judged LOCALLY (Hermes + Qwen on the 5090); cloud only for non-private work. **Both paths must be adequate — "without one sucking and the other one being better."**
  2. **The strip-before-cloud middleware.** *"We created middleware that would strip off private data from information that was going to cloud providers. I would have to have something like that for sure. We would have to harden that and bolster it... so I can use it without having to worry about my data getting leaked."* → cloud judgment is acceptable **only through a hardened PII-strip proxy** (IDs out, names resolved locally = the existing Rule 8 architecture, made bulletproof).
  3. **The actual pain: scheduling and client follow-up.** *"I've been having issues with scheduling and following up on my clients. I hate that part."*
  4. **Move Fitness runs on the MindBody app** — Sean wants the agent to get acquainted with it and help schedule his slots there.
  5. **He wants it to send clients texts and emails.** ⚠ **CONTRADICTS Q1 (no credentials on radar) and Q6 (radar drafts, Sean sends).** Must be resolved explicitly, not inherited.
  6. **Client workouts:** floated having it send workouts, then self-corrected: *"that's what the SwanStudios app is supposed to be for."* → workouts stay in-app.
  7. **A SwanStudios account for the agent:** *"its own account... talk to the SwanStudios coach... administrator access or restricted access, so it can just get information."* → a **service account with restricted read scope**, not admin.
  8. **Browser-harness reliability:** unsure Hermes' browser is 100% reliable; Codex reputed best, Claude close behind.
  9. **Asked for a panel** on the privacy thought process: Ox + GLM 5.3 + Grok 4.6 — *"get a feel for what we should probably do here."*
- **Implication:** The 4-hour question dissolved into the bigger one: **which data may leave the house, in what form, and who is allowed to SEND.** Two contradictions with earlier answers are on the table (send-capability vs read-only; raw-schedule-to-cloud vs cloud brain). The middleware point supplies the likely resolution for the second: **raw → local only; redacted IDs-only → cloud via hardened proxy.** The first (who sends) is Q13.

### Q13: Clients should get texts/emails automatically, but radar is read-only (Q1) and "radar drafts, Sean sends" (Q6). Who actually SENDS?
- **Recommended:** The SwanStudios APP sends, Sean approves. Drafts land in an approval queue inside SwanStudios (the agent's ONE narrow write, via its service account); Sean taps approve in Telegram; the app sends with the SendGrid it already holds and the unsubscribe/suppression compliance already on main. Templated classes (reminders, lead nurture) already exist as automation sequences and auto-send once ARMED. radar never holds send credentials.
- **Sean's answer:** The SwanStudios app sends, Sean approves.
- **Implication:** Resolves the Q1/Q6 contradiction cleanly: **radar/Hermes = decide + draft; the app = send; Sean = the approval tap.** Q6's "drafts in Telegram" becomes the interim (works this week); the approval queue is the upgrade. Rejected: Hermes sending directly (desktop-dependent + bypasses opt-out compliance = legal exposure), radar sending directly (compromised box can message the whole client list), Sean-sends-forever (keeps the chore he hates). **Client-facing SMS** would need Twilio-class credentials in the APP (not on radar) — separate from the panel's "SMS killed" ruling, which was about alerts to Sean.
- **Verified grounding (rule 18/49):**
  - `[VERIFIED]` `backend/middleware/piiSanitizationMiddleware.mjs` is LIVE on main — imported by `routes/aiChatRoutes.mjs`, `services/ai/inputSanitizer.mjs`, `services/aiPrivacyService.mjs`, `services/redactTranscriptPII.mjs`, `services/schedule-ai/scheduleAiPrivacy.mjs`; 10+ tests incl. `piiCreditCardHostile`, `aiChatWorkoutPiiBlock.e2e`, `phiScanner`. (A first narrower grep made it look dormant — a `head` cut ate the hits; positive control caught it. Lesson logged.)
  - `[VERIFIED]` `routes/hermesRoutes.mjs` authenticates Hermes as a logged-in USER (`protect` + `requireAdminOrTrainer`) — the existing "agent has an account" pattern.
  - `[VERIFIED]` `models/User.mjs:133` role ENUM = `user|client|trainer|admin` — **no agent/service role exists**; the restricted service account needs a new role or scoped key (Phase 2 item).
  - `[VERIFIED]` **No MindBody integration exists** — the only hits are "MindBody parity" comments in `scheduleController.mjs`.

### Q14: Run the privacy-tiering panel now?
- **Recommended:** Free seats now (Ox + GLM + Qwen), Grok optional.
- **Sean's answer:** **Fire all four** — Ox Alpha ($0) + GLM 5.3 (subscription) + local Qwen 3.8 ($0) + **Grok 4.6 (paid, explicit yes, capped ≤$1; 16K output ceiling ≈ $0.11 worst case, one request, no retry)**.
- **Packet:** `docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/PACKET.md` — 75 lines, roles only. Pre-egress checks: name/host/platform grep = 0 hits (positive control on this doc = 92 hits); repo secret scanner CLEAN; Ox + GLM pass through the canary egress redactor (`scripts/lib/redact-egress.mjs`); Qwen never leaves the machine. Fable seat written BEFORE reading the others: `FABLE-SEAT.md` (anchor-free).
- **Implication:** Panel answers §6 A–G (tiering, always-on gap, proxy hardening, service account, credential invariant, booking-SaaS read path, portability). Synthesis lands as `SYNTHESIS.md` and its decisions are written back into this doc's Key Decisions.


### Phase 2 verdicts (Sean, 2026-08-24)
- **ADOPTED:** (1) app-side agent principal + facts endpoint + drafts queue as **E4**; (3) fold the brief into the 06:47 Morning Ops Briefing + move its trigger to radar; (5) **fix radar's three defects tonight — explicit go for the writes.**
- **NOT ADOPTED (declined/deferred):** (6) freedom-number line in the brief.
- **Not yet ruled on:** (2) mobile approval UI, (4) arming evening bundle, (7) attribution plumbing, (8) Engine protocol, (9) Discord after money — carried as proposals.
- **Sequencing — Sean's words:** *"we will do the money first, but then the news right after. All together, because I really want that done. I'm tired of seeing that mock data. I need to see the app working."* → one continuous program, no gap between the money block and the news block; cheap news prep (seed + enable + ingest timer) rides inside E1 so both lanes move from night one.

### Final evening sequence (supersedes SYNTHESIS-ROUND2 §5 of the direction panel)
| Evening | Work | Blocked on |
|---|---|---|
| **E1** | DNS auth record + validator + arm `lead_nurture` + speed-to-lead monitor · **news: seed + enable 3–5 sources + bootstrap ingest timer** (brain-free, default-off) | Sean: DNS record (SWA-13) |
| **E2** | offsite leg 2 + restore drill + password manager + **radar defect fixes** + object-lock on the bucket | `c:	mp
2-creds.env` |
| **E3** | dead-man pinger + pull-the-wire test + **egress firewall** (firewall is not blocked) | `c:	mp\hc-url.txt` |
| **E4** | **app-side agent principal + `/api/agent/facts/cash` + drafts queue** (SS-PT build, normal gates) | — |
| **E5** | deterministic floor brief on radar → folded into the 06:47 briefing (trigger on radar) + money-now interrupts → **first money brief** | E4 |
| **E6** | **news: `/api/feed` + mock-kill + `count(*)>0` gate → newsroom shows real data** | E1 |
| **E7** | timers manifest + heartbeat (4 states incl. blocked) + box-audit (grants/schema drift) | — |
| **E8** | boss call (GLM default, capped fallback) + provider adapter + egress gate + rubric + approval UI | E4/E5, ZAI key on radar |
| **E9+** | YouTube OAuth / engine 3 · membership queries (engine 2) · trainer engine · booking-SaaS ICS · news digest + `agent_face` · Discord | per-item flags |


### Radar hardening applied 2026-08-24 (Sean's go; all writes via root, idempotent script; before/after proven)
- `/srv/radar/bin` was **owned by the browser agent user** (`radaragent:radaragent 755`) while root-executed scripts live in it (retain, db-backup, health) → privilege-escalation path. **Now `root:root 755`, all scripts `root:root`.** `[VERIFIED]` agent cannot write the dir.
- Browser allowlist moved `/srv/radar/browser/targets.txt` (agent-owned 664, inside `ReadWritePaths`) → **`/etc/radar/browser-targets.txt` (root 644)**; `ProtectSystem=strict` makes it unwritable inside the unit by construction. `[VERIFIED]` agent cannot write it.
- **Swap off** (two files, 12 G, 0 B in use): `swapoff -a`, both fstab lines commented (files kept — reversible), `MemorySwapMax=0` drop-in on the browser unit. `[VERIFIED]` 0 swap devices.
- "Restic excludes for agent state": **satisfied by construction** — nothing on radar is backed up by restic (only the prune job exists). No change invented.
- **Incident during the fix:** the first relocation `sed` matched a literal path the runner never used (it references `$BDIR/targets.txt`); the real-run proof came back `fatal` and the lane was down for ~2 minutes. Patched the two variable-form references (runner backed up to `/root/`), re-ran: `Result=success`, `ok: 2`, both 200. Lesson: grep the *reference form* before a path sed; the real-run proof is what caught it.
- **New flag (not fixed — a fourth change outside Sean's go):** the job's own code (`fetch.mjs` + the playwright tree under `/srv/radar/browser`) is agent-owned and writable inside the unit → a compromised job can persist by editing its own code. Fix = root-own the tree, keep only a profile/cache dir writable.

## Key Highlights
- **[VERIFIED 2026-08-24, read-only probe] Three live defects on the box today:** (1) the WSL→box backup key's forced command is `sftp-server` **without `-R`** → the key can DELETE snapshots; "append-only" in earlier docs is an over-claim; (2) the browser allowlist file is owned by AND writable by the browser agent user → the allowlist is a suggestion; (3) **2 active swap devices** → P0 can page to disk. None touched — fixes need Sean's go (radar writes).
- **[VERIFIED] The box already holds the backup repository password** (43-byte 0600 file in the backup user's home; the retention script references it). A full compromise decrypts every backup, including the operator agent's private vault. The invariant was false before this design existed.
- **[VERIFIED] The marketing acquisition engine is ALREADY BUILT on `origin/main`** — `backend/services/speedToLeadService.mjs`, `automationCron.mjs`, `jobs/marketingPublisherWorker.mjs`, `marketingReadinessService.mjs` (states `ready|degraded|blocked|demo`, an `armedCheck(env)` gate, and a `lead_nurture` sequence `isActive` flag), lead capture wired to contact/signup/newsletter/checkout, plus `models/Lead*`, `leadRoutes` with RBAC, `MarketingCampaign`, `MarketingCalendarItem`, suppression + unsubscribe routes. Subscription tiers exist too (`models/Subscription.mjs`, tier migrations, webhook contract tests).
- **So the money gap is not "build marketing" — it is BUILT, UNARMED, and UNHOSTED.** That reframes radar's marketing job from construction to *arming, hosting, and watching*.
- **[VERIFIED] YouTube surfaces exist on main**: `backend/routes/youtubeImportRoutes.mjs`, `youtubeValidationService.mjs`, `scripts/swan-scout/*` (yt search/transcript tooling), and `docs/ai-workflow/brainstorms/youtube-production-studio-blueprint-2026-08-11.md`. Sean's ask (own-channel ANALYTICS → what to post next) is the piece not yet covered — that needs the YouTube Analytics API, which is OAuth-scoped to his channel.
- The single thing Sean wanted the box for — browser/agent work off his screen — was parked by the 7-seat ruling and inherited as a finding by every downstream doc. A deferral is not a finding.

## Architecture Notes (parent / children / whole)
- **Parent:** radar = the always-on scheduler/durability host. Children today: 4 timers (health 5m · db-backup 02:30 · restic-retain 05:30 · browser 2h 08:15–22:15), restic repo, SwanGuard Postgres (61 tables, news tables 0 rows).
- **Siblings:** 5090 desktop (WSL Hermes brain, interactive coding, gaming), Z: (3.7 TB), Render (SwanStudios prod), future R2 bucket.
- **Whole:** radar → SwanGuard (collect/archive/surface) → Hermes (judge/consume) → Sean (Telegram).

## Suggestions & Enhancements (Phase 2 — grill-me's whole-system advice; Sean accepts / modifies / rejects each)
1. **The app-side agent principal is the spine, and it is NOT in the 7-evening plan.** `AgentToken` + `/api/agent/facts/:engine` + `/api/agent/drafts` + redacted projections is SwanStudios build work (normal gates: Rule 26 receipt, schema cross-check, tests). Every engine converges on the drafts queue; build it as **E4** in place of "T1 digest (no-LLM)". *(Why: Rule 62 admin priority — who needs intervention — becomes a queue, not a hunt.)*
2. **Approval UI in the admin dashboard, mobile-first** (drafts queue → approve / edit / drop; "approve all safe"). This is the button Sean actually taps from his phone. *(Why: the whole money loop ends here; without it D6 has no surface.)*
3. **Fold the boss brief INTO the existing 06:47 Morning Ops Briefing and move its TRIGGER to the box** (the panel's H2). One voice, one message, fires when the desktop is off. *(Why: two morning messages = the noise that gets muted.)*
4. **Arming evening = DNS record + validator + arm `lead_nurture` + speed-to-lead monitor, same sitting.** GLM named arming day the most-silently-dangerous event; the DNS record it depends on has been open since July. *(Why: the built engine is unarmed for want of a 10-minute record.)*
5. **Fix the three box defects before any credential lands:** allowlist file → root-owned 0644; swap off (or encrypted); restic excludes for agent state. Then object-lock on the offsite bucket when leg 2 lands. *(Why: D5/D10 are cheap now and expensive after.)*
6. **"Freedom number" line in every brief** — what mix of clients/members/trainers = ≤4h training days at target income, and whether today moved it. *(Why: Sean's stated goal becomes a scoreboard. Sean did not answer Q12 directly — proposed, not adopted.)*
7. **Attribution plumbing** (tracked links + `signup_source` column) — small, unlocks "which videos make money" and the membership-funnel engine's truth. *(Why: engine 3's real prize is gated on it.)*
8. **Engines as one `Engine` protocol** (`cash`, `membership`, `video`, `recruit`) with a declared fact contract; the SwanStudios facts endpoint is one adapter implementation. *(Why: the consulting-portfolio constraint — a client business will not run SwanStudios.)*
9. **Discord stays out of the first build cycle** — community engine after money engines; Sean creates the server + bot when ready. *(Why: net-new, zero repo precedent, does not make money this month.)*
10. **Re-sequence the evenings (money-first):** E1 DNS+arm · E2 offsite+restore-drill+password-manager+box-defect fixes · E3 dead-man+egress firewall · E4 agent principal + facts endpoint (engine 1) + drafts queue · E5 deterministic floor brief → Telegram + money-now interrupts · E6 timers manifest + heartbeat + box-audit · E7 boss call (GLM default) + adapter + egress gate + approval UI · E8+ YouTube OAuth/engine 3, membership queries, trainer engine, booking-SaaS ICS, news lane (SwanGuard E-series) as a parallel track. **Trade-off flagged:** the news/mock-data lane moves behind money; Sean said money is #1.

## Minimal-Click Opportunities
- **Client follow-up:** today ≈ open app → find client → decide → write → send ≈ 8 taps × 12 clients ≈ 100 taps + an hour of writing. After: brief → per-draft approve (1 tap) or "approve all safe" (1 tap) → **≈ 12 taps, zero writing.**
- **New inbound lead:** today ≈ notice email → open CRM → read → compose ≈ 6 taps + minutes of lag. After: money-now interrupt with the pre-drafted reply → **2 taps (open, approve/call)** inside the speed-to-lead window.
- **Morning brief:** one message instead of two (fold into Morning Ops Briefing) → **0 extra taps**, and it arrives whether or not the desktop is on.
- **YouTube "what to post next":** one card with title + why + "copy" → **1 tap** to start the next video.
- **Booking SaaS:** ICS feed = **0 taps/day** once the URL is installed (vs opening the SaaS to check slots).

## Open Flags
- [x] ~~Three radar defects~~ — fixed 2026-08-24 (see hardening block). 
- [ ] **`/srv/radar/browser` tree (fetch.mjs, playwright) is agent-owned + writable in-unit** — root-own it, leave only a profile/cache dir writable (needs Sean's go).
- [ ] **Backup key can delete snapshots** — decide: accept + offsite object-lock, or move to a restic `rest-server --append-only` later. Fix the "append-only" wording in the 2026-08-23 handoff (trailhead truth).
- [ ] **Booking SaaS: does the staff account expose a calendar-subscribe/ICS URL?** (Sean, 5 min in the SaaS settings) — if yes, install via the stdin pattern, never paste in chat.
- [ ] **Chat-bot token read scope** — verify the bot's privacy mode so a stolen token cannot read chat history.
- [ ] **Provider zero-retention:** confirm whether the GLM coding-plan endpoint offers a no-retention/no-training setting; if not, GLM is P2-only and P1 goes to a provider that does (or `cloud_rows = none`).
- [ ] `c:\tmp\r2-creds.env` and `c:\tmp\hc-url.txt` still absent at 2026-08-24 grill start — slices 1/3 remain blocked.
- [ ] **Panel requested by Sean (Ox + GLM 5.3 + Grok 4.6) on the privacy/send question** — Grok is a paid seat (ask first); packet must be sanitized (roles only) before egress.
- [ ] **MindBody API access for Move Fitness scheduling** — availability/cost on Sean's MindBody plan unknown.
- [ ] **`ZAI_API_KEY` must be provisioned on radar** — not in `.env`; gates the $0 GLM boss brain.
- [ ] **Verify whether ChatGPT Plus/Pro grants API access** — `[LIKELY]` it does not; if confirmed, OpenAI is a paid-only path.
- [ ] **Confirm the OpenRouter fallback cap value** (recommended $10/mo default).
- [ ] **Discord server + bot not yet created** (Sean) — gates the community engine and the bot's second home.
- [ ] **Read-only Postgres role on Render** (Sean/agent) — gates engines 1, 2, 4. Verify Render supports a dedicated read-only role on the current plan.
- [ ] **Second OpenRouter key with its own hard credit cap** (Sean) — gates the boss loop. Cap value TBD.
- [ ] **YouTube: Google Cloud project + read-only Analytics OAuth scope** (Sean) — gates engine 3.
- [ ] Restic password lives inside the backup it protects — must go to a password manager.

## Closeout (2026-08-24)
- Sean closed the grill. Remaining unknowns stay as Open Flags and resolve as their evenings come.
- **Sean's next ask:** brief the partner's school laptop agent (runs its own Hermes; already holds a plan for her lane) on what radar is NOW and how her lane connects to radar + Hermes — she will use radar too. Iterate prompt ↔ prompt until finalized. Governing constraints: SWA-189 + `project_wife_business_lane_own_school` (separate Unix user / DB / bot token on radar, no roster-reaching tool, child-data rule).
- Docs committed locally on the wip branch (explicit paths, no push): this doc, the 7-file panel dir, the learning packet.

## Re-grill addendum — Sean, 2026-08-24 (after the laptop agent's first reply)
**Sean's direction (captured, not yet resolved):**
1. **Spouse uses radar for her planning AND class design** ("planning and class design and stuff like that"). ⚠ "Class design" touches the classroom half, which the panel + SWA-189 keep OFF radar. Needs a rule: generic curriculum/activity design with **zero child-specific data** may be treated like the personal lane; anything child-specific stays on the laptop.
2. **She gets access to the Swan Design/Taste Brain** (design.md + the taste-steered prompter — "it gives prompts on how it should look").
3. **She can use the HY3 image/video asset creator** ("the MMX HY3 app we built with copy UIs" — commits to be looked up) to make her own assets; also ChatGPT images and the Midjourney account — **family/personal use only, nothing sold.**
4. **She gets time on the 5090 when she wants it, with a queue** when Sean is using it.
5. **Easy two-way messaging between them** ("she should be able to easily send me messages too… so we can both communicate at the same time").
**Implication:** the partner lane grows from "personal-business operator" to "household creative + GPU-sharing lane." radar = the scheduler/queue; the 5090 = the executor when awake and free. Governance questions to settle: the class-design boundary (child-data-free rule), a per-user principal on the 5090, and a queue/lease design with a fair-use policy.
