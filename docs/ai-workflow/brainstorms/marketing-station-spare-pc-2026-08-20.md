# Brainstorm: Marketing Station on the spare PC

**Date:** 2026-08-20 · **Status:** complete (Phase 1 + Phase 2 delivered) · **For:** SWA-70 (SwanGuard → Personal Intelligence Command Center) — the station is its execution surface
**Successor:** `swanguard-up-to-speed-2026-08-20.md` — the SwanGuard-side grill (identity, hosting **on this station**, one-store StoryNode architecture, X via xAI Live Search)

## Summary

Sean has a spare desktop and wants it to earn its keep as a headless "marketing computer" he can
log into and watch — running its own browser in a sandbox, doing searches and marketing work on his
behalf. This doc captures what job it actually does, what it owns versus what stays on the main
5090 desktop, and the guardrails it needs once it holds marketing credentials.

## Hardware constraint (settled before the grill — not a question for Sean)

| | |
|---|---|
| CPU | Ryzen 3600 (6c/12t, Zen 2) |
| RAM | ~16–32 GB DDR4 |
| Storage | SSD |
| GPU | none meaningful |

**Implication, already decided:** this box is **wrong for LLM inference** and **right for browser
automation, scheduled jobs, and always-on services.** CPU inference of even a 7B model on a 3600
would be slow enough to be useless next to the 5090. Do not put a brain on it; put hands on it.

## Existing context found in the repo (rule 49 — explored, not asked)

- **Marketing work already planned/shipped:** `MARKETING-ACQUISITION-ENGINE-PLAN-2026-06-14`,
  `MARKETING-COMMAND-CENTER-AUDIT-2026-06-14`, `MARKETING-ATTRIBUTION-MEASUREMENT-AUDIT-2026-06-15`,
  `NURTURE-PRE-ARM-AUDIT-2026-06-16`, `BLUEPRINT-speed-to-lead-email-2026-07-16`,
  `MARKETING-BRAIN-MANUAL-FINALIZATION-2026-07-10`, `MARKETING-TRINITY-REBUILD-HANDOFF-2026-07-16`.
  So the station is **not** net-new marketing strategy — it is a machine to *run* strategy that
  already exists on paper.
- **The browser harness currently runs on the main desktop.** Verified live in the process list
  during the 2026-08-19 audit: `browser_harness.daemon` plus multiple `chrome-headless-shell`
  renderers, all on the 5090 box. Moving it is a real offload, not a hypothetical one.
- **Hermes has a native cron/Routines engine** already driving the Morning Ops Briefing, and a
  `kanban` swarm board (parallel workers → verifier → synthesizer) at **zero utilization**.
- **Precedent to avoid:** the Raspberry Pi is retired and BLOCKED on hardware that could not do its
  job. A 3600/32GB/SSD genuinely can do browser work — but the lesson is *match the hardware to the
  job*, which is why inference is ruled out above.

## Key Decisions

- **The station = sandboxed always-on browser + agent node.** Hands there, brain on the 5090.
- **Hermes itself stays on the 5090.** Moving it would strand it from its local brain.
- **No inference on the 3600.** Hardware can't, and the privacy posture won't allow the cloud
  substitute.

## Q&A Log

### Q1: What is this box's primary job — the one that justifies it existing?
- **Recommended:** **Headless browser + automation node.** It takes the browser harness off the 5090
  entirely and runs marketing research/collection 24/7 without needing Sean's main machine awake.
  Reason: it's the only option grounded in a bottleneck that demonstrably exists today (the harness
  and its Chrome renderers are competing for the main desktop right now), and it plays to the
  hardware's actual strength.
- **Sean's answer:** "Can we do all of those? I like every single choice. If not, cut it down to
  the best two or three."
- **Grill-me's resolution:** three of the four are the **same machine described three ways** —
  headless browser node (#1), marketing agent station (#2) and sandboxed agent workspace (#4) are
  layers of one sandboxed always-on box that runs browsers + an agent loop and delegates inference.
  **Adopted: #1 + #2 + #4 as a single station.**
  **CUT: #3 (always-on Hermes node)** — self-defeating on this hardware. Hermes's brain is local
  Qwen on the 5090, fail-closed with no cloud fallback (see SWA-156, where local-brain prompts
  leaked to OpenRouter). Hosting Hermes on the 3600 means calling back to the 5090 for every
  inference, so the 5090 must be awake for the briefing — which is precisely the dependency #3 was
  meant to remove. Zero gain, one extra network hop.
- **Implication:** the box is **hands, not brain**. Opens the real question: what does the agent
  loop actually DO, and how much authority does it have.

### Q2: What is the station's FIRST marketing job?
- **Recommended:** market intel + prospecting — pure read, no approval gates, not DMARC-blocked.
- **Sean's answer:** "A combination of all four." Plus: "I have a Raspberry Pi 4 — any way to use it
  to enhance this setup?"
- **Grill-me's pushback:** "all four" is a destination, not a first job. Sequencing here is forced by
  dependencies, not preference — two of the four are blocked or outward-facing, and starting them
  together stalls the two that could already be earning. **Agreed order:**
  1. **Market intel + prospecting** (week 1) — pure read, no gates, not blocked.
  2. **Site + funnel watchdog** (week 1–2, parallel) — read-only browser journeys; needs test-mode
     discipline so it never creates a real booking or charge while exercising checkout.
  3. **Content production** (week 3) — needs the 5090 to draft; output is drafts Sean approves
     anyway under the existing content-cadence rule.
  4. **Speed-to-lead + nurture** (after DMARC) — the money path, genuinely blocked on SWA-13, and
     the only job that emails real strangers unattended.
- **Implication:** the outward-facing tier (3 and 4) needs an authority model before it can run.
  That is the next blocking decision.

### Q2b: Does the Raspberry Pi 4 have a role?
- **Answer (grill-me's, accepted as the working plan):** yes — **the watchdog**, and nothing more.
  NOT a Hermes host; that is what killed it (SSD power, still BLOCKED). Its job is stateless HTTP
  health checks from *outside* the two main machines, alerting when the 5090 or the station stops
  reporting. This is the layer whose absence let the Morning Ops Briefing die unnoticed for 25 days.
  Needs no SSD (stateless → SD card is acceptable), sips ~3 W, and fails safe.
- **The three-machine split:** **Pi watches · 3600 works · 5090 thinks.**

### Q3: How much authority does the station have without Sean?
- **Recommended:** T2 ceiling + one narrow carve-out.
- **Sean's answer:** **T2 ceiling + one carve-out.** ✅
- **What that means concretely:** the station runs free up to **T2** (read, draft, write internally
  — its own intel DB, prospect lists, drafts). Anything **external-visible is T3 and needs
  approval**, with exactly one pre-approved exception: an **instant acknowledgement to inbound leads
  only**, from a fixed template Sean signs off once.
- **Why the carve-out exists:** speed-to-lead's entire value is the fast first touch. A per-event
  approval gate destroys the thing being built. The carve-out preserves the speed where speed is the
  product, while everything *persuasive* still routes through Sean.
- **Implication:** the ack template becomes a security-relevant artifact — it is the one thing that
  reaches strangers unattended. It needs to be short, factual, non-committal on price/claims, and
  version-controlled. Also: the carve-out fires only for **inbound** contacts, never outbound.

### Q4: How does the station authenticate to social platforms?
- **Sean's position:** "It's between dedicated identities and my accounts in a vault — it's going to
  be posting my YouTube, SwanStudios, Facebook, Instagram, TikTok, so it has to have my information,
  otherwise it's not useful." Asked for GLM + Kimi input.
- **Premise corrected:** it does **not** need his personal logins. All four platforms have
  first-class delegation to *brand* assets: YouTube Brand Account managers, Facebook Business
  Manager Page roles, Instagram professional account linked to a BM-owned Page (Graph API), TikTok
  Business Center member seats. Delegation exists precisely so teams post without sharing an
  identity.
- **GLM's verdict (adopted as the technical baseline):** dedicated station identities with
  least-privilege delegated roles, **nothing of Sean's on the box** — no personal logins, no
  hardware key, no sessions.

| Surface | Auth path | ToS / trap |
|---|---|---|
| YouTube | Station Google acct as Manager on the Brand Account; Data API v3 | OAuth app left in "testing" mode → refresh tokens die every 7 days |
| Facebook Page | Business Manager **system user**, long-lived token, `pages_manage_posts` | Automating the logged-in web UI is prohibited; personal-profile automation is a ban vector |
| Instagram | Professional acct on a BM-owned Page, Graph API publish | Needs one-time **Meta app review** — the biggest setup toll. Most ban-happy platform for browser automation; never allow a logged-in IG session on the box |
| TikTok | Business Center seat, Content Posting API **unaudited → drafts only** | Direct-post needs an audit; draft-only matches T2 exactly |
| Own product admin | Self-minted scoped service token, Publisher role, short TTL | He owns the ToS — a proper machine credential costs nothing here |
| Research / SERP | **Logged-out, dedicated browser profile**, never shared with a posting identity | Profile bleed correlates automation with his logged-in identity |

- **Hard rules from GLM:** tokens live in a **local broker the agent can call but never read** (no
  secret in prompt context, serving the zero-PII rule); TOTP seeds + backup codes stay in Sean's
  vault, never on the box; on any `401`/`invalid_grant` the lane **halts fail-closed** and waits for
  a daylight re-consent — nothing self-recovers at 3am.
- **Most likely failure = silent credential EXPIRY, not compromise.** Detector trio: weekly
  capability canary (create-then-delete draft), queue-age watchdog (approved-but-unpublished >24h
  pages him), and publish receipts verified by a logged-out public fetch — plus a dead-man heartbeat
  so the detectors can't die silently. This is the 25-day-blind-spot pattern again.
- **GLM's honest counter, which drives Q5:** setup drag is real and front-loaded — Meta app review,
  TikTok's audit wall, Google's unverified-app friction. **Weeks during which the box cannot post at
  all.** Its own fallback: station drafts everything, Sean publishes from his phone, ~2 min/day,
  zero platform credentials on the box, T2 enforced by construction.
- **Kimi:** timed out at 7 min (exit 143). Not consulted on this question.

### Q5: Scheduled publishing, or "Sean taps publish"?
- **The collision that forced this question:** Sean had already chosen **T2 — every post needs his
  approval.** So the elaborate delegated-token stack only changes *who taps publish after he has
  already approved*. That is weeks of Meta app review, a TikTok audit wall, token-expiry monitoring
  and a ban surface — to save one tap. The **only** thing the simple fallback genuinely cannot do is
  publish at an optimal time while he is asleep.
- **Sean's answer:** **Start draft-only, earn the tokens.** ✅
- **What ships:** Phase 1 = station drafts and queues everything; Sean publishes from his phone
  (~2 min/day). **Zero platform credentials on the box.** T2 enforced by construction rather than by
  code. Works this week instead of after weeks of review.
- **Earning order (when he wants it):** YouTube first — cleanest delegation, no app review, and
  long-form uploads benefit most from timed release. Then Facebook, then Instagram (Meta app review
  is the real toll), TikTok stays draft-only regardless since its direct-post API needs an audit.
- **Implication:** the entire Q4 credential architecture becomes **deferred design, not Phase-1
  work.** Phase 1 needs no platform tokens at all — which also removes the biggest security surface
  from the first build. Keep the Q4 table as the blueprint for when tokens are earned.

### Q6: How does Sean watch and drive the station?
- **Sean's answer:** **Tailscale + RDP/VNC.** ✅ Full desktop from phone or laptop over a private
  mesh; nothing exposed to the public internet, no port forwarding, reachable only by him.
- **Implication:** satisfies the "log in and see it work" requirement and the debugging path. But it
  is a *heavy* surface for a 2-minute daily approval task — see Phase 2, which proposes the approval
  queue live somewhere else entirely.

### Q7 (Sean, unprompted — the biggest reframe of the grill): it is a RADAR, not just a marketing box

**Sean's words:** give it **its own Twitter/X account** and other social accounts, so it can *"get
all the top news first so I can decide what I want to do with it"* across:

| domain | examples he named |
|---|---|
| Professional | health, personal training |
| Interests | gaming, photography |
| Civic | US politics, world politics |
| Local — events | concerts, art events, cultural events, "really cool" events in his area |
| Local — photography subjects | flower shows, flower gardens, nature parks |
| Family | kids' events, fun stuff for kids |
| Local — venues | casino line-ups and performing artists (Morongo, Palm Springs area) |

**This reframes the station.** It is primarily an **inbound intelligence radar**; marketing is one
*consumer* of it, not the whole purpose. Two systems sharing one machine:

- **Radar (inbound):** public news + events + opportunities → ranked → Sean decides. **Pure read.**
- **Marketing (outbound):** his brand, drafting, approval, posting. **Gated.**

Different jobs, different risk profiles, same hardware and browser.

#### Consequence 1 — this DISSOLVES Phase-2 finding S1

S1 flagged that prospecting collides with Rule 8 (prospect records are PII). **Radar has no prospect
PII at all** — it reads public news, public event listings, public venue calendars. Making radar
job #1 instead of prospecting removes the Rule-8 collision from Phase 1 entirely, and defers the
privacy-proxy design to whenever outbound prospecting actually starts.

**Recommended re-sequencing:** radar becomes job #1; prospecting moves behind the privacy-proxy
decision.

#### Consequence 2 — 🔴 Rule 12 collision on reading X/Twitter

Hermes's built-in `x_search` toolset is backed by **`grok-4.20-reasoning`** (verified live in
config). Rule 12 is a hard permanent no on Grok / x-AI. **So the obvious path to "read X" inside
Hermes is forbidden.**

Note the distinction that matters: *having an X account* is fine. *Using Grok to read X* is not.
The station must reach X another way — its own logged-in account driven by the browser harness (with
the ToS caveat GLM raised), an official API path that does not route through Grok, or a third-party
aggregator. **This needs deciding before X is wired in**, and `moa_policy.banned_providers`
(`grok`, `x-ai`, `xai`) stays as the guard.

#### Consequence 3 — this is SWA-70, already In Progress

**"SwanGuard → Personal Intelligence Command Center"** is an existing tracked project. This station
is its **execution surface**, not a new parallel program. The grill should feed SWA-70 rather than
spawn a competing plan.

#### Why this is a genuinely strong first job

- **Zero credential risk** in Phase 1 (public sources, its own accounts — never Sean's).
- **Zero PII.** No Rule-8 exposure.
- **Zero outward action.** Nothing to approve, nothing to ban.
- **It feeds his actual creative work** — his recorded visual taste is NatGeo-grade nature and
  wildlife; flower shows, gardens and nature parks are literally photo-subject sourcing for the
  brand's own visual library, not just leisure.
- **It has an obvious delivery channel that already exists and was just repaired** — the Morning Ops
  Briefing. "Top news first" and "a daily briefing at 06:47" are the same product.

### Q8: Must feed SwanGuard AND Hermes — is it compatible?

**Sean:** *"This should feed information into my SwanGuard app... get things coordinated and
organized and send that data to SwanGuard for it to utilize the files for the APIs."* and
*"It should be able to feed into my SwanGuard and my Hermes on my desktop."*

**Answer: compatible, and not by luck — SwanGuard was built anticipating exactly this.** Evidence
from `20260728T002152Z-swanguard-slice1-newsroom-shipped-to-branch.md` (Fable-5, verified session):

| SwanGuard already has | Why it matters to the radar |
|---|---|
| A **newsroom** (Slice 1, 14 files under `apps/web/src/newsroom/`) | The consumer surface already exists |
| A canonical **`StoryNode`** type with **provenance / claims / temporal** fields | **This is the ingest contract.** The radar emits `StoryNode`, not a bespoke format |
| **`storyService`** boundary — *"UI never touches storage; future MCP layer = thin adapter"* | The integration path was designed in. The radar becomes that adapter's data source |
| **"Creator RSS"** listed as a remaining pillar, *gated on backend/APIs* | **The radar IS that missing pillar's backend.** It is not new scope — it fills a named gap |
| Doctrine: *"Evidence-not-oracle… No verdict — you conclude."* | Matches Sean's own words exactly: *"get all the top news first so I **can decide** what I want to do with it"* |

**Architecture: one producer, one canonical type, two consumers.**

```
   station (radar)                  StoryNode                consumers
   collect -> dedupe -> rank  ──────────────────►  SwanGuard newsroom (browse, evidence, save)
                              └─────────────────►  Hermes briefing  (top-N daily digest, 06:47)
```

- **SwanGuard** gets the full ranked set for browsing, the evidence ledger, and saving.
- **Hermes** gets the capped top-N as the daily briefing — the Q7 ranking decision.
- **Neither is a new surface.** Both already exist and both already read a defined shape.

#### ⚠️ Honest dependency

SwanGuard's newsroom is on branch `refactor/shell-rebuild-20260721` — **pushed, NOT merged to main,
NOT deployed** (Render service was never confirmed watching that branch). Its backend merge was
still under review on a separate track. So the *consumer* is not live yet.

**This does not block the radar.** Emit `StoryNode` from day one and write to a local store; Hermes
consumes it immediately via the briefing, and SwanGuard picks it up whenever the newsroom deploys.
Building to `StoryNode` now is what makes that later connection free instead of a rewrite.

**Build note:** a plain `vite build` with no env resolves to BACKEND mode and renders the *old* app,
not the newsroom — demo mode needs `VITE_SWANGUARD_API_MODE=demo` +
`VITE_SWANGUARD_ALLOW_STAGING_DEMO=true`. Recorded so nobody "verifies" the newsroom against a build
that never contained it.

## Key Highlights

- The box should get **hands, not a brain** — browser, scheduler, collectors. Inference stays on the 5090.
- **Pi watches · 3600 works · 5090 thinks.** Three machines, three roles, matched to their hardware.
- Sequencing is dependency-driven: read-only work ships first because it needs no approval gates and
  no DMARC; outward-facing work waits for an authority model and an unblocked email path.
- **Draft-only first.** Phase 1 carries ZERO platform credentials — the largest security surface is
  simply absent from the first build. Tokens are earned per-platform, YouTube first.
- **Authority: T2 ceiling + one carve-out** (instant inbound-lead ack from a fixed template).
  The carve-out is the only unattended path to a stranger, so the template is a controlled artifact.

## Architecture Notes (parent / children / whole)

**The three-machine split — each matched to its hardware:**

| machine | role | why |
|---|---|---|
| **Raspberry Pi 4** | **watches** | 3 W, stateless HTTP health checks from outside both other boxes. No SSD needed, so it does not repeat the block that retired it. |
| **Ryzen 3600 station** | **works** | Browsers, collectors, agent loop, queue. Hands, never a brain. |
| **5090 desktop** | **thinks** | Hermes + local Qwen inference. Stays put — moving it would strand it from its brain. |

- **Parent surface:** the **Hermes operator system** (gateway + cron + skills + kanban). The station
  is a **worker pool under Hermes**, not a parallel system — see Phase 2 S3.
- **Children / composed parts:** browser-harness daemon (relocated off the 5090); market-intel
  collectors; funnel-journey checker; draft composer; the approval queue (which should surface in
  the existing briefing channel, not a new UI — S2).
- **Delivery channel:** the **Morning Ops Briefing**, already repaired on 2026-08-19 and already
  read daily. Station findings and approvals should land there rather than in a new surface.
- **Fit with the whole:** the Marketing Command Center is Sean's stated #1 money focus and
  acquisition is the named gap. Every marketing *plan* already exists on paper
  (acquisition engine, attribution, nurture pre-arm, speed-to-lead blueprint, Trinity rebuild).
  **This box is not new strategy — it is the missing execution surface for strategy already written.**

## Suggestions & Enhancements (Phase 2 — grill-me's advisory synthesis)

### 🔴 S1. The prospecting job collides with Rule 8 (zero PII to LLMs). Nobody flagged this.

Job #1 is "market intel **+ prospecting**" — golf-club members, local leads, corporate contacts.
That is **names, emails, phone numbers: PII by definition.** The moment the station feeds a prospect
record to a model to draft outreach, it violates Sean's own hardest-standing law.

This is not hypothetical: the drafting job (#3) and the speed-to-lead job (#4) both *require*
personalisation, which is exactly the operation Rule 8 forbids.

**Proposed resolution — the same privacy-proxy pattern already documented in
`docs/ai-workflow/references/PRIVACY-PROXY.md`:** the station stores prospects locally with an
opaque `prospect_id`; the model only ever sees the ID plus non-identifying attributes ("owner of a
mid-size firm, plays at a private club, engaged with a post about mobility"); the station merges the
real name back in **after** the draft returns, locally, never in prompt context. Same shape as the
token-broker rule GLM gave for credentials: **the agent can call the identity, never read it.**

**This should be decided before a single prospect row is collected**, because a store designed
without it is a store that has to be rebuilt.

### 🟠 S2. The approval queue has no home — and it is the surface he will touch most

T2 means Sean approves everything. Draft-only means he publishes everything. So **approval is the
single most-repeated interaction in this entire system** — and the plan currently answers it with
"open Tailscale, RDP into a desktop, find the queue." That is the heaviest possible surface for the
highest-frequency task.

**Proposal: approvals land in the Morning Ops Briefing / Telegram channel that already exists** —
the one just repaired. Sean already reads it daily; the inbound-ack carve-out already lives in that
channel; and approving becomes a reply rather than a remote-desktop session. Keep Tailscale+RDP for
**watching and debugging**, which is what he actually described wanting it for.

### 🟠 S3. Use the kanban swarm board Hermes already has — do not build a second orchestrator

Hermes ships a durable SQLite **kanban** board with parallel workers → verifier → synthesizer,
atomic claims, a dependency graph, review gates and daemon dispatch. **Current tasks: 0.** It is
sitting unused, and it is exactly the primitive this station needs: queue a research task, a worker
claims it, a verifier checks it, a synthesizer writes the digest.

Building a bespoke job runner on the 3600 would duplicate a tested component and create a second
thing that can fail silently. **The station should be a Hermes *worker pool*, not a parallel system.**

### 🟡 S4. Define the output artifact before collecting anything

Market intel that produces a firehose nobody reads is worse than no intel — it manufactures the
feeling of progress. **Every collector must terminate in a named artifact with an owner and a
cadence**, e.g. "Monday 06:47: five competitor changes worth reacting to, in the briefing." If a
collector cannot name its artifact, it should not be built.

### 🟡 S5. Kill switch and blast-radius caps are unnamed (Rules 48/50)

Required before anything runs unattended: a single documented way to stop the station dead; a rate
cap on outbound anything; and — for the inbound-ack carve-out — a **daily ceiling** so a loop or a
spam wave cannot fire the template a thousand times. The carve-out is the only unattended path to a
stranger; it needs a counter and a ceiling, not just a template.

### 🟡 S6. The Pi must watch itself — push, not pull

A watchdog that goes quiet looks identical to a healthy system with nothing to report. The Pi must
**emit a heartbeat outward on a schedule**, and *absence* of that heartbeat must be the alarm. If the
Pi only alerts when it detects a problem, then the Pi dying is silent — which reproduces the exact
25-day failure it was bought to prevent, one layer up.

## Minimal-Click Opportunities

- **Approve a queued post — before: ~6 actions** (unlock phone → Tailscale → RDP client → connect →
  find queue → approve). **After: 2** (read briefing → reply "ok 3"). This is the single highest-value
  click reduction in the design, because it is the most repeated action.
- **Publish after approval — before: 2** (approve, then open the platform app and post).
  **After: 1**, once YouTube tokens are earned — approval *is* the publish trigger for that platform.
- **Act on an intel finding — before:** log into the box and read a report. **After:** the finding
  arrives in the briefing already ranked, with the recommended action attached.


## Open Flags

- [ ] Exact RAM (16 vs 32 GB) — affects how many concurrent browser contexts are sane.
- [ ] Whether the box has wired ethernet (matters for an always-on unattended node).
- [ ] **DMARC record still not added (SWA-13, Urgent)** — blocks job #4 entirely. ~10 min in Namecheap.
- [ ] Pi 4 RAM/model, and whether it still boots (it has been parked since the SSD-power block).
