# Panel Packet — Client Dashboard Launch Review (Lane 3)

**Product:** SwanStudios — trainer-led personal-training SaaS (production, Render). Founder is about to start promoting on YouTube; every surface must be launch-grade.
**Surface under review:** the paying-client dashboard (`/dashboard/client/*`). Clients pay $175/session (packages: 3-month $8.4k, 6-month $16.8k, 12-month $33.6k). A client must FEEL that value in the product.
**Mandate for this review:** we are NOT rewriting. We take what exists, harden it, and build missing features on top of it. Recommendations must be incremental slices on the current architecture, not redesigns.

## Product doctrine (constraints your advice must respect)
- Core loop: log workout → save diary entry → charts/progress proof from REAL logged data → next-best-action → shareable milestones. Mock/fabricated data is forbidden.
- Trainer-indispensability: clients READ + DO, never DECIDE. Only trainers switch/edit plans. (Enforced server-side; verified.)
- Dark-first "Crystalline Swan" theme; styled-components only (no Material-UI); Victory charts only; 44px touch targets; reduced-motion respected; WCAG 4.5:1.
- White-label: Move Fitness-sourced clients must never see SwanStudios branding; they also cannot book Swan sessions (non-deducting source).
- Stack: React 18 + TS frontend, Node/Express/Sequelize/PostgreSQL backend.

## Current state (verified today against production main)
### Tabs/routes that exist and work (21 mounted routes, 15 sidebar links)
- **Home/overview:** onboarding launch card (if incomplete), NEW sessions-remaining banner (count, package, expiry, low-balance nudge, Book CTA), today's-workout card with 1-tap log (`ClientProgramShelf` + assignment-aware CTA), next-session card (explicit "Not booked yet" static truth), gamification strip (level/XP/streak), quick post to community feed, trending-tags rail, macro summary, recovery/readiness widgets.
- **My Workouts:** paginated real session history from `/api/workout/sessions`, loading/error/empty states, plan-vault panel (view assigned plan PDFs), today hero with weekly ring strip.
- **Progress:** level/tier/XP/week-workouts/streak/PR stat strip (now shows "—" on outage instead of fake zeros), weekly rings, canonical Victory chart grid (15 chart endpoints, all JWT-scoped), guardian-tier gating with upgrade CTA, detailed NASM charts page.
- **Schedule (Book Session):** universal schedule in client mode — sessions-remaining counter, timeline, book/quick-book/recurring booking, credit refetch after booking. Hidden entirely for Move Fitness clients.
- **Community / Challenges:** social feed, challenges with submission gate, leaderboard, factions/parties, events.
- **Rewards:** gamification profile, achievements, honest empty states.
- **Profile:** personal info, password change, membership card (tier, status, renew date, FTC two-tap cancel with 8s disarm), chart-visibility toggles with live preview, fitness goals + notification prefs (NOW actually persist — they were fake controls until today), companion pet.
- **Also routed:** AI consent screen, meal planner (nutrition workspace), body map (pain/injury), messages, Swan Coach assistant, avatar home, live streaming, creators, virtual olympics (last three have no nav entry and questionable content).

### Security posture (audited today)
0 client-to-client IDOR across ~95 endpoints; all client data fail-closed ownership-gated; plan mutation trainer/admin-only server-side; analytics endpoints derive identity from JWT only. One trainer-tenant gap found (handed to another lane). No global rate limiter yet (proposed).

### Fixed today (already shipped in the audit branch)
1. Move Fitness white-label leak in sidebar chrome (logo/footer) — fixed.
2. Fake profile settings (goals + notifications saved nothing) — now persist.
3. Sessions-remaining was invisible outside the booking page — now a home banner.
4. Outage rendered as "0 workouts / 0 streak" — now honest "—" states.

### Known gaps / backlog (candidates, ranked by our current guess)
a. Shared home viewmodel leads with three "Not available" tiles (Avg Heart Rate, Strength Score, Recovery — no wearable source) on the money surface.
b. Weekly goal ring measures against hardcoded 5 workouts/45min, not the client's actual assigned plan volume.
c. Fabricated "#SwanStudios" trending tag renders when the hashtag API is empty/errors.
d. Duplicate top-nav renders inside the embedded home (sidebar + a second top navigation with store/gallery links).
e. Two of three 1-tap "log today's workout" entry points drop assignment parameters (can load the wrong session).
f. Progress page personal-records fetch silently collapses to empty on error.
g. ~1,900 LOC of dormant client code (retired observatory home, unused session-history component) plus 3 nav-less routes (live, creators, virtual-olympics).
h. No sessions-remaining visibility for Move Fitness clients at all (by design they don't deduct — but they get no equivalent "your engagement" surface either).
i. Membership card hides for free-tier; no upsell/ascension surface on the client dashboard.

## Questions for the panel (answer these specifically)
Q1. **$175/hr value-feel:** Given the surfaces above, what are the highest-leverage ADDITIONS or refinements (incremental, buildable in 1-3 day slices) that would make a paying client feel concierge-grade value in their first 60 seconds and first week? Rank the top 5-8. Judge what exists before proposing new.
Q2. **Progress-proof for non-technical clients:** Our progress page is chart-dense (Victory charts, 15 endpoints). For a 45-60yo non-technical client, what presentation layer turns logged workouts into visceral "it's working" proof (verbal summaries, before/after framing, coach-voice recaps, milestone cards)? Concrete component-level proposals on top of the existing chart grid, not a redesign.
Q3. **Missing-feature gaps vs the backlog:** Look at gaps a-i. Re-rank them by launch impact, kill any that don't matter, and name anything important we have NOT listed (absence-first: what's missing that should exist for a trainer-led premium training product at launch?).
Q4. **Hardening order:** Given no rewrites, what is the exact slice order you would ship in the next 2-3 working days before a YouTube-driven traffic wave? Consider trust surfaces (billing/membership truth, empty states for brand-new clients with zero history, first-session onboarding feel).
Q5. **First-session empty state:** A brand-new client lands on this dashboard with zero workouts, zero charts, an unassigned plan. Walk that exact first-60-seconds experience with what exists and specify the minimum set of changes that makes it feel premium instead of empty.

## Output contract
Be concrete and slice-level: name the tab/surface, the change, why it wins, and a rough size (S/M/L). No generic dashboard advice, no rewrite proposals, no new tech stack. Respect every constraint in the doctrine section. Rank everything.
