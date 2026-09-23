# ROI Safety Deal Brief — Sean's Copy (INTERNAL, never send to client)

**Date:** 2026-09-11 · Companion to the full plan (v3) and the client pitch. This is the whole deal on two pages.

---

## 1. The deal on one line

Build a weekly robot that reads three government registries, pulls every business contact email
they publish, merges the three lists into one clean spreadsheet, and flags what's new — for
**$6,000**, then **$250/month** to keep watching it.

## 2. The job, step by step

| Step | What you build | Realistic hours |
|---|---|---|
| Phase 1 — Discovery spike | Live pulls from all 3 sources, real coverage numbers, SMARTS postback trace, RCRA zip-URL trace, simulated weekly delta | 12–20 h |
| S1 — TRI connector | EPA API (6 paged requests, 5,110 CA facilities verified), normalize, first CSV | 10–14 h |
| S2 — RCRAInfo connector | 160 MB zip → CA filter → merge | 12–16 h |
| S3 — SMARTS connector | The risky one: JSF postback flow, no direct URLs — trace first, then build | 18–30 h |
| S4 — Dedup + delta engine | Cross-source matching, review queue, new/updated flags | 18–24 h |
| S5 — Delivery | Google Sheet publish, weekly summary email, failure alarms | 14–20 h |
| S6 — Hardening + handover | Stress tests, client UAT, runbook | 16–24 h |
| Acceptance window | 2 observed live weekly runs, small fixes | 2–4 h |
| **Total** | | **≈ 100–150 h · plan against ~125 h** |

## 3. Why you charge what you charge (your words when it comes up)

- **The honest math:** ~125 hours of real engineering. $6,000 ÷ 125 h ≈ **$48/hour effective.**
  That's already a founding-client rate — do not let anyone tell you $6k is expensive for
  three-registry automation with a dedup engine. It's a discount you are choosing, publicly.
- **The trade you get for the discount** (agree at kickoff, in writing): a testimonial, a
  publishable case study, and 2 introductions to similar firms. A discount with nothing
  attached is just a lower price.
- **The compounding part:** client #2 in the same vertical reuses ~60% of this build. Same
  $6,000 price, ~50 hours of work → **~$120/hour.** Deal #1 is the factory; deals #2+ are the
  profit. Say yes to this one partly because of the next five.
- **The floor:** $4,500, and ONLY with reduced scope (CSV-only, or 2 sources). Never print the
  floor or the $5,500 close target anywhere client-facing. Quote $6,000, let him counter.
- **The escape valve:** anything outside the written scope — new sources, dashboard, national
  data, outbound email — is a change order at $85–100/hr. Government site redesigns are change
  orders too, never warranty. This clause is why fixed-price work can't hurt you.

## 4. The buffer rule (standing, every engagement)

**Quote = honest estimate + 1 extra week. Deliver at the honest estimate.** You look great
turning it in early; the buffer absorbs the one thing that always happens (SMARTS acting weird,
a sick day, a slow client answer).

| Milestone | You quote | You actually plan |
|---|---|---|
| Phase 1 — Discovery | 1 week | 2–3 days |
| Phase 2 — Build | 4–5 weeks (up to 6 if SMARTS is ugly — confirmed at end of Phase 1) | 3–4 weeks |
| Acceptance | 2 observed weekly runs (up to 2 more weeks) | same |

Cash-flow reality: $1,500 at Phase 1 start → $3,000 at build kickoff → $3,000 at acceptance
(~week 6–7 of the engagement). If Jessee is slow to answer decisions, the clock pauses — that
clause is already in the pitch.

## 5. How to win it (he needs convincing less than you think)

1. **Lead with his pain, not your tech:** "How many hours did last month's manual compile cost
   you?" and "What's one new commercial client worth to ROI Safety?" Write the answers into the
   ROI table in his proposal. His numbers make $6,000 look small — you never have to defend it.
2. **Sell the discovery phase as his safety net:** $1,500, one week, real coverage numbers in
   hand, credited toward the build, and he keeps the findings even if he walks. Nobody else
   offers that. It converts "trust me" into "look at the data."
3. **Use honesty as the closing weapon:** "No one can promise an email for every facility —
   anyone who does is guessing addresses. I'll show you exactly what each registry publishes
   before you commit the full amount." That sentence wins deals in compliance-adjacent
   businesses.
4. **Show, don't pitch:** at the GO/NO-GO meeting, put the real sample spreadsheet and the
   simulated weekly delta on his screen. Numbers on his own industry close; slide decks don't.
5. **Ask for the yes at the meeting:** "If the numbers look good Thursday, do we start the
   build Monday?" Soft, specific, and it doubles as the kickoff-date setter.

## 6. The technical meat, compressed (what you're actually building)

- **Sources (all public, no logins):** EPA TRI via documented API — 5,110 CA facilities, 6 pages,
  contact email in ~1 of 5 records (that's WHY the honest-coverage framing matters); RCRAInfo
  HD_REPORTING.zip 160.65 MB (skip weeks when the export timestamp is unchanged); CA SMARTS
  regional NOI downloads behind a JSF postback (trace in browser dev-tools during the spike).
- **Runtime:** GitHub Actions weekly cron in a repo Jessee owns (you're collaborator; admin at
  acceptance). Raw weekly snapshots + checksums to Cloudflare R2. SQLite state per run. Zero
  servers. Client cost to run: ~$0 (free tiers cover it).
- **Integrity:** versioned schema contracts per source (header change = blocked publish +
  alert, not silent corruption); row-count sanity ±30%; email-format floor; idempotent runs;
  atomic publish (a failed week leaves last week's list untouched); suppression list always
  honored.
- **Safety nets:** healthchecks.io dead-man ping (silence = you get alerted, not the client);
  heartbeat commit each run so GitHub never disables the schedule; snapshots make every week
  re-processable without re-scraping.
- **Known open risks (all resolved by the spike, all priced):** SMARTS postback complexity →
  pre-build re-quote clause; RCRA zip URL discovery → spike task; Envirofacts long-term →
  contract alarms, no sunset notice as of today.

## 7. Red lines (don't cross these for a yes)

No login/CAPTCHA bypass · no guessed/enriched emails · no outbound-email promises · no
dashboard in v1 (it's the $1.5–2.5k phase-2 upsell) · nothing runs on SwanStudios
infrastructure · no equity/revenue-share deals.
