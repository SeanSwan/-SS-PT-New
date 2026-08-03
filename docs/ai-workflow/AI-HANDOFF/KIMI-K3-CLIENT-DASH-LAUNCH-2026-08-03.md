# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/LAUNCH-PANEL-PACKET-CLIENT-DASH-2026-08-03.md
**Seed:** (none)
**Tokens:** 1816 in / 5752 out | **Cost:** ~$0.0917 | **Wall:** 213.3s | **finish_reason:** stop

---

# SwanStudios Client Dashboard — Launch Review (Lane 3)

Reviewing as product-design lead. Everything below is an incremental slice on the current architecture: React 18/TS + styled-components, Victory only, no new deps, no route redesigns. Ranking is strict within each question.

---

## Q1 — Top value-feel additions, ranked (first 60 seconds / first week)

Judged against what already exists. The dashboard already has the *bones* of concierge feel (sessions banner, next-session truth, assignment-aware today card) — the wins are making the **human trainer and the money/value story** visible, and removing the three things that currently scream "generic SaaS."

**1. Replace the "Not available" triad with a real-value stat strip — Home, gap (a). [S, top of home]**
Avg Heart Rate / Strength Score / Recovery render "Not available" on the money surface. Swap in three tiles computed from data we *already have*: sessions logged this month (`/api/workout/sessions`), current streak (gamification strip already has it), sessions remaining in package (banner already computes it). Why it wins: nothing deflates $175/session like the product admitting it can't measure anything on tile one. Real-data-only doctrine is satisfied trivially.

**2. Trainer-presence card — Home, new. [M]**
A persistent card with the assigned trainer's photo, name, and one-tap "Message [Trainer]" (routes to existing messages surface). This product *is* the trainer; right now the dashboard feels software-led. Trainer-indispensability doctrine says the human should be *felt* on every surface. This is the single biggest concierge-feel lever available and it's one styled-component + existing relationships.

**3. Coach-voice weekly recap v1 — Home, new (details in Q2). [M]**
Deterministic template sentences from real logged data ("You trained 3 times this week — one more than last week. Your trainer has [plan name] ready for tomorrow."). Zero AI, zero fabrication — a pure function of existing endpoints. Premium clients don't read charts; they read sentences.

**4. Package-progress framing on the sessions banner — Home, refine existing. [S]**
The NEW banner shows count/expiry. Add the delivered-value frame: "18 of 36 sessions complete — halfway through your 6-month program." Clients paying $16.8k should see their investment *narrated*, not just metered. Same data, new copy + a thin progress bar (styled-components, 44px untouched).

**5. Next-session prep card — Home, extend existing next-session card. [S–M]**
Today it says "Not booked yet" honestly. When booked, show countdown + a trainer-written focus note ("Tuesday 6pm with Dana — we're testing your deadlift"). The note field is one nullable column on the session model, trainer-editable only (server-side, consistent with the plan-mutation gate). Why it wins: anticipation is what $175/session actually buys.

**6. Milestone cards on the existing gamification strip — Home/Rewards, refine. [M]**
Core loop ends in "shareable milestones" but nothing shareable exists on the client dash. First slice: a milestone card component (10th session, first PR, 4-week streak) rendered in-feed on Home and as a static shareable card. All derivable from sessions + PR data already fetched. Defer image export; a clean Crystalline Swan card screenshots fine.

**7. Single next-best-action hierarchy — Home, refine. [S]**
The home currently presents onboarding card + banner + today card + next-session card + quick-post + trending rail simultaneously. Add a state-priority rule (one primary CTA wins; the rest demote to secondary): unassigned plan → "Your trainer is preparing your plan"; plan assigned + not logged → "Log today's workout"; logged → recap card. Concierge = the product decides *for* you what matters now (client-facing sequencing, not plan decisions — doctrine-safe).

**8. Kill the fake texture — Home/Community, gaps (c), (d). [S]**
Fabricated `#SwanStudios` tag and the duplicate top-nav both read as "template app." Silence is premium. (Detailed in Q3.)

**Deferred deliberately:** recovery/readiness widgets with no wearable source (hide until a source exists — doctrine forbids implying data we don't have), companion pet promotion (fine where it is).

---

## Q2 — Progress-proof layer for a 45–60yo non-technical client

Constraint: **on top of** the existing 15-endpoint Victory grid, not a redesign. The grid stays for guardians/engaged users; we add a plain-language layer *above* it on the Progress tab.

**1. "Your Story So Far" banner — top of Progress. [M]**
2–4 deterministic sentences, plain function of real data:
> "You've completed 14 workouts in 6 weeks. That's your most consistent month since you started. Your trainer's plan has you on track for 4 sessions this week."

Template library with guardrails: if a data point errors, the sentence drops (never renders "—" mid-sentence). Large type (18px+), high contrast, dark-first. This is the single highest-value component in this entire review for the target demographic.

**2. "One number that matters" hero stat — below the banner. [S]**
Rotate the single biggest real win: longest streak, total sessions, biggest PR delta. One number, one plain-language caption ("Days in a row you've shown up"). Existing PR stat strip already computes candidates; this just promotes one with framing.

**3. Before/after cards — new component row. [M]**
"Your first logged squat: 95 lb → Your latest: 135 lb." First-vs-latest from real session history. If fewer than 2 data points exist, the card *doesn't render* (absence-first honesty, per the outage fix you already shipped). This is the visceral "it's working" artifact non-technical clients screenshot and send to spouses.

**4. Milestone journey timeline — vertical strip. [M]**
First session → 10th session → first PR → longest streak → package milestones, with dates. Renders only achieved nodes plus one "next up" ghost node ("Next: 20 sessions — you're at 17"). This *is* the shareable-milestones loop stage made visible. styled-components only; no chart lib needed.

**5. Plain-language captions + progressive disclosure on the chart grid — refine existing. [S–M]**
Each existing Victory chart gets a one-line caption in coach voice: "This line going up means you're lifting more over time." Then collapse the 15-chart grid behind "See detailed progress charts" (44px disclosure control, reduced-motion-respecting expand). Default view for a non-technical client: banner → hero stat → before/after → 2–3 headline charts → disclosure. Guardian-tier gating logic unchanged.

**6. Weekly recap card (shared with Q1 #3) — Progress + Home. [M]**
Same deterministic sentence engine, rendered as a card titled "This week, in plain words." Doubles as the first-week retention hook.

**Explicitly not proposed:** AI-generated recaps (fabrication risk, stack scope), PDF exports (defer), renaming the NASM charts page (trainer-facing depth is fine as-is).

---

## Q3 — Backlog re-rank: launch impact order

**Ship before traffic (correctness/trust):**

1. **(e) Dropped assignment params on 2 of 3 1-tap log entry points — [S].** This is *data-integrity*: logging the wrong session poisons every downstream proof artifact (charts, recaps, before/after cards). At $175/session, one wrong-log support ticket from a YouTube-referred client is a refund conversation. Rank #1.
2. **(a) "Not available" triad on the money surface — [S].** First-impression damage; fix is a tile swap to existing real data (Q1 #1).
3. **(d) Duplicate top-nav inside embedded home — [S].** Makes the product look assembled, not built. Every YouTube viewer's first 10 seconds includes this.
4. **(c) Fabricated #SwanStudios tag — [S].** Direct doctrine violation (mock data forbidden) *and* a white-label landmine — it would render SwanStudios branding to Move Fitness clients. Kill the fallback entirely; empty rail = hide the rail.
5. **(f) Silent PR collapse on Progress — [S].** Same class as the "—" outage fix you shipped today; extend that pattern here. Show "Couldn't load records — try again," never empty.

**Ship this week (value/engagement):**

6. **(b) Goal ring vs. hardcoded 5/45 — [M].** A ring measuring against the *wrong target* is worse than no ring — it silently contradicts the trainer's plan, which inverts the trainer-indispensability doctrine. Read assigned plan volume; fall back to hidden, not hardcoded.
7. **(h) Move Fitness engagement surface — [M].** These clients paid real money and currently get *less* product (no schedule, no counter). Give them the same package-progress + milestone framing minus deduction language: "Sessions completed: 12 • Current streak: 3." One conditional card; reuses the banner component.
8. **(i) Membership ascension surface — [M].** Real, but lowest of the shippables — free-tier clients at launch are a small cohort. A static, honest upgrade card on Profile/Rewards is enough for v1.

**Kill / defer:**

9. **(g) Dormant code + 3 nav-less routes — split it.** Deleting 1,900 LOC: **defer** (zero user-visible impact, review risk under time pressure). But **unpublish the live/creators/virtual-olympics route mounts now [S]** — "questionable content" reachable by URL is a launch liability, not tech debt. Return 404; delete code post-launch.

**Missing from the backlog (absence-first — what a premium trainer-led product should have that isn't listed):**

- **No trainer-presence surface anywhere** (Q1 #2). The highest-priced human on the invoice is invisible in the UI. Biggest absence on the board.
- **No post-session artifact.** After a $175 session, the client gets… nothing in-product. A trainer-written recap/next-focus note on the session record, surfaced on Home, closes the loop between sessions. (Fold into Q1 #5.)
- **No structured zero-history experience** (Q5) — the backlog contains no empty-state work at all, yet 100% of YouTube-referred signups hit exactly that state.
- **No cancellation/reschedule policy truth near booking.** FTC-compliant cancel exists on Profile (good), but the *session* cancellation window should be stated at the booking moment. One copy block in the Schedule flow [S]. Trust surface.
- **No shareable milestone output** despite being a named stage of the core loop (Q1 #6).
- **No global rate limiter** (already flagged in the security audit) — promote it to the hardening list; a YouTube wave is exactly when you want it [S–M, backend middleware, no architecture change].

---

## Q4 — Exact 2–3 day hardening slice order

Sequenced so each day ends in a shippable, trust-improving state. Order is dependency + risk driven: correctness first, then first-run experience, then additions.

**Day 1 — Truth & correctness (all small, all independently mergeable):**
1. **(e)** Thread assignment params through both broken 1-tap log entry points; add a regression check that the logged session matches the assigned plan. *[S]*
2. **(d)** Remove the duplicate top-nav from the embedded home; verify 44px targets and sidebar-only navigation at mobile breakpoints. *[S]*
3. **(c)** Delete the fabricated trending-tag fallback; empty/error → hide rail. *[S]*
4. **(f)** Extend the "—"/retry honest-error pattern to the PR fetch. *[S]*
5. **(a)** Swap the triad tiles to real data (sessions this month / streak / sessions remaining). *[S]*
6. Unmount the 3 nav-less routes (live, creators, virtual-olympics) → 404. *[S]*

**Day 2 — Zero-history & first-run trust (the state 100% of new traffic hits):**
7. Zero-history empty states across Progress: charts render the "your story starts with your first workout" placeholder (no Victory render with empty series), stat strip shows "—" with first-log CTA. *[M]*
8. First-session welcome hero on Home: trainer card + single state-driven primary CTA (state machine in Q5). *[M]*
9. Booking-flow copy slice: cancellation window + "what to expect at your first session" text at the booking moment. *[S]*
10. Global rate limiter middleware. *[S–M]*
11. Smoke-pass membership card, FTC two-tap cancel, and sessions-banner arithmetic against a real zero-history account on staging (verification slice, not code). *[S]*

**Day 3 — Value-feel additions (only if Days 1–2 are green):**
12. **(b)** Goal ring reads assigned plan volume; hidden fallback. *[M]*
13. **(h)** Move Fitness engagement card (package progress, no deduction language, no Book CTA). *[M]*
14. Coach-voice weekly recap v1 (deterministic templates, sentence-drop guardrails) on Home. *[M]* — if Day 3 runs short, this is the slice that slips, not the Day 2 trust work.
15. **(i)** Static ascension card on Profile/Rewards. *[S]*

**Explicitly out of the 3-day window:** milestone cards, trainer focus-note field (needs schema + trainer-side UI), before/after cards, code deletion from (g), PDF/share exports.

---

## Q5 — Zero-history first-session walkthrough

**What happens today (honest trace against the verified current state):**

1. Lands on Home. Onboarding launch card shows if profile incomplete — good, that's the right first element.
2. Sessions banner renders correctly (real package data exists at signup) — the one genuinely premium element on screen.
3. Today's-workout card: plan unassigned → assignment-aware CTA has nothing to point at; likely renders inert or ambiguous.
4. Next-session card: "Not booked yet." Honest, but flat — no path forward attached.
5. Gamification strip: Level 1, 0 XP, 0 streak — honest but reads as "you have nothing."
6. Three "Not available" tiles. Fabricated #SwanStudios tag. Duplicate top-nav. Quick-post composer and trending rail inviting social interaction with a community the client has no context for.
7. If they tap Progress: 15 charts of nothing / silent PR collapse.

Net effect: a $16.8k buyer sees a working but unpopulated *tool*, with two visible fabrications and no human. Nothing says "concierge."

**Minimum change set, ranked (this is the launch-critical slice):**

1. **State-driven welcome hero replacing card clutter for zero-history users — Home. [M]**
   > "Welcome, Marcus. Your trainer Dana is preparing your first program."
   > One primary CTA, resolved by state: profile incomplete → *Finish setup* → plan unassigned + Swan source → *Book your first session* (with sessions counter inline) → plan assigned → *Start your first workout*.
   Below it, the trainer card (photo, name, Message CTA). The human appears in the first 60 seconds — this alone converts the screen from "empty app" to "service you're onboarded into."

2. **A 3-step "how this works" strip — Home, below hero. [S]**
   "1. Train with Dana → 2. Log it here → 3. Watch your proof build." This pre-frames the empty Progress tab as *anticipated* rather than *broken* — the single cheapest way to make emptiness feel intentional.

3. **Zero-state Progress placeholders — Progress tab. [M]**
   Chart grid replaced (zero data only) by one Crystalline Swan placeholder panel: "Your progress story starts with your first logged session." No Victory render with empty series, stat strip shows "—" with a log-CTA. Same honesty pattern as the outage fix — extend, don't invent.

4. **Silence the noise for zero-history users — Home. [S]**
   Suppress (not delete): quick-post composer, trending rail, and the gamification strip's zero-state until first log. Suppression is a conditional render — trivially reversible, and it enforces the Q1 #7 hierarchy automatically.

5. **Package card with concierge framing — Home. [S]**
   The existing banner data, reframed: "Your 6-month program: 36 sessions • through March 2026" + "Questions? Message Dana." The purchase is acknowledged as an *investment with a human attached* in the first minute.

6. **Book-first-session prominence — Home + Schedule. [S]**
   For unbooked zero-history Swan clients, the next-session card's "Not booked yet" gains its Book CTA *inline at 44px* instead of requiring navigation. (Move Fitness: skip — no booking, show the engagement card from (h) instead.)

**What we deliberately do NOT do:** fake starter data, demo charts, "sample" progress (doctrine-forbidden and instantly detected), a product tour overlay (nobody watches it; the state-driven hero does the same job), or gamification inflation at signup (a gifted XP bonus would contaminate the real-data loop).

---

## Cross-cutting summary — if you only ship five things

1. **(e)** fix — wrong-session logging is a data-integrity bug at the top of the value chain.
2. **Welcome hero + trainer card** — puts the $175 human on the money surface.
3. **Kill the fabrications** (a triad, c tag, d duplicate nav) — silence reads premium.
4. **Zero-history states** — 100% of the incoming YouTube cohort hits this first.
5. **Coach-voice recap v1** — the first-week retention hook, pure function of real data.

Everything proposed is a conditional render, a copy/template layer, a tile swap, or one nullable column — zero rewrites, zero stack changes, zero doctrine violations.
