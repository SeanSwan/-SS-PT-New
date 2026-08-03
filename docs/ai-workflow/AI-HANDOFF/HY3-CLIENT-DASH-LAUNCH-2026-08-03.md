# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/LAUNCH-PANEL-PACKET-CLIENT-DASH-2026-08-03.md
**Seed:** (none)
**Tokens:** 1760 in / 8160 out | **Cost:** ~$0.0046 | **Wall:** 149.2s | **finish_reason:** stop

---

**Tencent HY3 — Launch Stress-Test, Lane 3 Client Dashboard**

Your current backlog (a–i) is mis‑ranked: it treats dormant code (g) and free‑tier upsell (i) as candidates while under‑weighting **trust‑breaking fake surfaces (c)** and **core‑loop parameter loss (e)**. For a $175/session trainer‑led product, any fabricated data or broken log path is a launch blocker. Below, each answer is incremental, respects the doctrine (no rewrites, styled‑components, Victory only, 44px, reduced‑motion, WCAG 4.5:1, white‑label isolation, trainer‑decides server‑side), and uses real logged data only.

---

## Q1 — $175/hr Value‑Feel: Top 8 Additions/Refinements (Ranked)

| # | Surface | Change | Why it wins (value‑feel) | Size |
|---|---------|--------|--------------------------|------|
| 1 | **Home** (today’s‑workout card) & **My Workouts** (today hero) | **Fix gap e:** drill assignment ID through all 1‑tap log entry points; verify server returns the exact assigned session. | At $175/session, logging the wrong workout is a instant trust rupture. Concierge means “your exact prescribed session, one tap.” | S |
| 2 | **Home** (shared viewmodel tiles: HR/Strength/Recovery) | **Fix gap a:** conditionally render only if wearable/coach source exists; else show “Coach captures baseline in person” tile. | Three dead “Not available” tiles on the money surface scream un‑premium. Removes emptiness. | S |
| 3 | **Home** (trending‑tags rail) | **Fix gap c:** on empty/error from hashtag API, render nothing or “Your private community” – never fabricated #SwanStudios. | Fake social proof insults a paying client; erodes concierge trust. | S |
| 4 | **Home** (top, under sessions banner) | **Add “Coach’s Briefing” card:** reuse `/api/messages` trainer→client thread; show trainer name, 2‑line note, 44px “Open” target. | Trainer‑led product must manifest the human coach in first 60 sec; currently messages is buried, not a surface. | M (S if endpoint already scoped) |
| 5 | **My Workouts** & **Progress** (weekly rings) | **Fix gap b:** compute ring goals from assigned plan volume (sessions/week, minutes), not hardcoded 5/45. | Bespoke proof: generic ring says “we don’t know your plan.” Premium = calibrated to them. | M |
| 6 | **Progress** (above chart grid) | **Add plain‑language “Progress Proof” recap** using existing stat‑strip endpoints: “In 30 days you trained 6 sessions, 240 min.” | Non‑technical clients feel value in words, not axes. Builds on real data. | M |
| 7 | **Home** (embedded view) | **Fix gap d:** remove duplicate top‑nav inside home; keep sidebar only. | Double chrome breaks Crystalline Swan calm; noise reduces perceived cost‑value. | S |
| 8 | **Move Fitness white‑label home** | **Fix gap h:** add “Your Program Status” engagement surface (plan assigned, check‑ins) with zero Swan brand. | Non‑deducting clients still pay via Move; need parity trust surface pre‑YouTube wave. | M |

*Judged existing first: sessions‑remaining banner, honest outage “—”, persisted prefs are good – kept. We did not propose new stack or redesign.*

---

## Q2 — Visceral Progress‑Proof for 45–60yo Non‑Technical Clients

Concrete components on top of existing Victory grid (ranked by impact):

1. **“Coach’s Recap” text block** (Progress top) – Pulls from stat strip + 2 chart endpoints, renders 2–3 sentences in coach voice: “You’ve completed 8 sessions; your consistency is up 20% vs month 1.” Why: turns charts into “it’s working” without reading axes. Size M.
2. **Milestone Frame card** (Progress, below recap) – Wraps a PR Victory line with large numeric before/after + date labels; 44px “Share to community” button (reuses existing post). Why: tangible, shareable win from real data. Size S.
3. **Weekly Ring Voice label** (My Workouts & Progress rings) – Text under ring: “3 of 4 planned sessions done – nice rhythm” from assignment volume (fix b). Why: verbal anchoring of the visual. Size S.
4. **Failure‑friendly empty** – If zero data: “Your trainer finalizes your baseline after session 1” instead of blank grid. Why: non‑technical users fear blank screens. Size S.
5. **Reduced‑motion static callouts** – Ensure all numbers are ≥44px touch, WCAG 4.5:1, animations off via `prefers-reduced-motion`. Why: accessibility doctrine, older eyes. Size S (already partly met).

---

## Q3 — Re‑rank Gaps a–i, Kill, & Name Absent Must‑Haves

**Re‑rank by launch impact (1 = highest):**
1. **e** – log param drop (core loop broken)
2. **c** – fabricated trending tag (fake trust)
3. **a** – dead tiles on money surface
4. **b** – hardcoded rings (bespoke fail)
5. **h** – Move Fitness no engagement surface (white‑label trust)
6. **f** – PR fetch silent empty (failure state)
7. **d** – duplicate nav (noise)
8. **i** – free‑tier upsell (irrelevant: paying‑client dashboard only) → **KILL for launch**
9. **g** – dormant code/3 nav‑less routes (not user‑facing) → **KILL for launch** (hide routes, cleanup later)

**Absence‑first missing must‑haves for premium trainer‑led launch:**
- **Prominent trainer channel on Home** (Coach’s Briefing – see Q1#4) not buried in messages route.
- **Low‑noise notification logic surface** – prefs persist but no alert center; need only: session reminder, low‑balance, trainer note. No marketing noise.
- **Honest booking failure state** – Schedule API error should show “—” like outage, not spin.
- **Zero‑history onboarding copy attributed to trainer** (“Your trainer is building your plan”) not system‑generic.
- **Chart screen‑reader alternatives** – Victory data table fallback for WCAG.
- **White‑label notification isolation** – Move Fitness must receive same surfaces with zero Swan branding in email/UI.

---

## Q4 — Hardening Order: Next 2–3 Working Days (Slice Sequence)

**Day 1 — Trust‑surface purge (S slices)**
1. Fix **e** (assignment param) – Home & My Workouts. (S)
2. Fix **c** (trending tag) – Home. (S)
3. Fix **a** (conditional tiles) – Home. (S)
4. Fix **d** (dup nav) – Home. (S)

**Day 2 — Empty states & coach presence**
5. Honest zero‑history empty states across Home/Progress/My Workouts with trainer‑attributed copy (build on onboarding card). (M)
6. Ship **Coach’s Briefing** card on Home via `/api/messages`. (M)
7. Fix **f** (PR fetch error → “—” state). (S)

**Day 3 — Bespoke & white‑label**
8. Fix **b** (rings from assigned plan volume). (M)
9. Add Move Fitness **Program Status** surface (gap h). (M)
10. Wire notification prefs to low‑noise triggers (session/low‑balance only). (S)

All slices are additive/edits on existing routes; no rewrite; respects dark theme & 44px.

---

## Q5 — First‑60‑Seconds Zero‑History Experience & Minimum Premium Changes

**Current walk (what exists today for brand‑new client):**
- Home loads: sessions‑remaining banner (good), onboarding card (if incomplete), today’s‑workout card (empty/no assignment), next‑session “Not booked yet” (cold static), gamification zeros (real), three “Not available” tiles (a), fabricated trending tag (c), macro zeros.
- Progress: stat strip zeros, rings hardcoded, empty chart grid.
- My Workouts: empty history, plan‑vault maybe empty.
→ Feels empty, generic, slightly broken.

**Minimum changes to feel premium (incremental):**
1. **(S) Today’s‑workout card:** if no assignment, show “Your trainer is building your custom plan — first session appears here within 24h” + trainer avatar.
2. **(S) Next‑session card:** replace “Not booked yet” with “Your trainer will schedule your first session. Message them →” (uses coach presence).
3. **(S) Gap a tiles:** replace with “Baseline metrics captured by coach in person” or hide – no dead “Not available”.
4. **(S) Gap c rail:** hide if hashtag API empty; never fake.
5. **(M) Coach’s Briefing card:** seed a welcome note from trainer (sent pre‑launch) so home has human voice in second 10.
6. **(S) Progress/My Workouts empty:** add “Your baseline establishes after session 1” note (keeps honest zeros but adds context).
7. **(S) Doctrine pass:** confirm 44px targets, reduced‑motion, WCAG contrast on all new copy.

That set converts zero‑history from “empty app” to “my concierge is preparing my bespoke program” within 60 seconds, using only existing architecture.

— HY3
