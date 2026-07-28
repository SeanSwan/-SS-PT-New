# Kids Summer Hub App — Brainstorm

**Status:** in-progress (grill-me Phase 1 running)
**Date started:** 2026-07-16
**Owner:** Sean
**Privacy note (rule 8):** family project — no children's names, school names, ages, or other identifying details in this committed doc. Refer to "the kids" / "their school platform."

## The problem (Sean's words, condensed)
- Kids are on summer vacation and default to phones all day: Among Us, YouTube dance videos, split-screen "skit + distraction" content engineered to hold attention.
- Sean is worried about developmental harm from unlimited screens and algorithmic content, and about the values being modeled (disrespect toward parents, content-not-for-kids, a game loop he reads as "kill, lie, report, repeat").
- He can't just ban everything — needs BALANCE and structure, not prohibition.
- Budget-conscious: free/cheap activities matter.

## What Sean wants the app to be
1. A hub that structures the kids' days better.
2. Finds local events + free things to do (AI-researched, always current).
3. Learning: math (take it to the next level — reading is already strong), history, future-skills (doctor/lawyer/entrepreneur track, business sense, manners, good habits).
4. Stays a COMPLEMENT to analog life (writing, books, real-world play) — digital is the side dish, not the meal.
5. Hermes-connected: Hermes does ongoing research (what's best for their development, what to study next) and feeds the app.
6. Wants a tie-in to their school's learning platform so summer study runs a step AHEAD of grade level. (Reality check logged below — treat as manual sync first, API later if one even exists.)
7. Both: something Sean uses on his phone AND something the kids use.

## Fable's added ideas (2026-07-16 first pass)
- **Core design law: the app wins when they CLOSE it.** It's a launcher/day-structurer, not a destination. Success metric = minutes of real-world activity it caused, not minutes in app.
- **Earned-screen-time economy:** quests (math practice, reading, chores, outside play, manners/habit streaks) earn tokens; tokens redeem for game/YouTube minutes. Sean already owns a production gamification engine — reuse the patterns (XP, streaks, idempotent awards), not the codebase.
- **Daily Quest Board:** 3–5 quests/day, generated the night before (Hermes cron), mix of learn / move / create / help / play. Kids check them off; Sean approves from his phone.
- **Free-events scout:** Hermes nightly research job → library programs, park/rec events, free museum days, community stuff in the area → morning digest card.
- **Boredom engine (offline generator):** one tap → a real-world activity (scavenger hunt, drawing prompt, card game rules, backyard workout) — printable where possible.
- **Family fitness lane:** Sean's actual superpower. Kid-safe movement quests, family workout of the day, form videos he records himself. Nobody else's kids-app has a professional trainer parent behind it.
- **Entrepreneur track for kids:** micro-business quests (plan a lemonade stand, price it, count the money, save/spend/give split), age-appropriate money literacy.
- **Kids as co-planners:** a Sunday ritual where the kids pick next week's quests from a menu — buy-in beats enforcement.
- **AI literacy as a future skill** alongside typing/coding/public speaking — they'll grow up in an AI world; knowing how to use it > being used by it.
- **Complement, don't rebuild, parental controls:** iOS Screen Time / Google Family Link already enforce the hard limits well. This app fills the "now what?" void those tools leave. Don't reimplement OS-level enforcement.

## Reality checks (logged as constraints)
- **School platform API: [HYPOTHESIS → likely unavailable].** Private-school LMS platforms rarely expose parent-facing APIs; scraping a portal containing children's records is a privacy/ToS minefield. V1 = Sean manually enters current topics (or photographs a worksheet and lets AI extract the topic). Revisit official integration only if the platform documents one.
- **COPPA:** as a private family tool, fine. The moment this is offered to other families (and the entrepreneur instinct will go there), under-13 data + AI chat = COPPA/kidSAFE territory. Design V1 so kids' profiles are local/family-scoped and the AI only ever talks to Sean's account, not the kids directly — cheapest compliant posture.
- **Zero-PII to LLMs applies here MORE, not less** (rule 8): kids' names never go to any model; quest data keyed by kid-ID.
- **Scope guard:** SwanStudios launch + Marketing Command Center remain the #1 money focus. This is a side project — bounded slices only, unless Sean promotes it.
- **Possible business bridge (parking-lot, not scope):** Sean's paying client families have the exact same summer problem. A "SwanStudios Family" lane (family fitness + kids' activity structure) could become a retention/upsell surface later. Do NOT build toward this in V1; just don't design it out.

## Proposed V1 (thinnest slice that changes behavior THIS summer)
PWA (installable web app, phone-first), family login only:
1. Daily Quest Board (manual quest entry by Sean at first, Hermes generation later)
2. Earned-minutes ledger (quests → tokens → screen minutes; Sean approves redemptions)
3. Boredom button (static curated list first, AI later)
That's it. Events scout, learning tracks, school sync, entrepreneur curriculum = V2+.

## Open questions for grill-me (when Sean is ready)
- Kids' ages/grade bands (drives content difficulty + UI reading level) — capture as bands, not birthdates.
- Do the kids get their own logins/devices, or is it Sean's-phone-only with a "kid mode"?
- What does a GOOD summer day look like hour-by-hour in Sean's head?
- Hard limits: how many screen minutes/day is the ceiling, and what's untouchable (e.g., no screens after X pm)?
- Which subjects first: math obviously — what else in the top 3?
- Reward menu beyond screen time (outings, treats, money)?
- Is Among Us banned, capped, or earned? (Design changes based on the answer.)
- Does this live inside the SwanStudios repo or as its own small repo?

## Key Decisions
- 2026-07-16 (mid-grill addendum): **AI-harness compatibility is a first-class requirement.** This is being built as a future app, and it must be operable by AI agents from day one — a clean structured API / tool layer (MCP-style) so Hermes (and any future agent) can create quests, read progress, post event digests, and grant/deny redemptions programmatically. Agents are a primary client of the backend, equal to the human UIs. Effect-tier discipline applies: agent writes stay bounded (draft/propose), parent approval stays human.
- 2026-07-16: Sean accepted the ENTIRE first-pass idea set ("I like everything... keep all that") — core design law (app wins when closed), earned-screen-time economy, Daily Quest Board, free-events scout, boredom button, family fitness lane, entrepreneur track, kids-as-co-planners, AI literacy, complement-don't-rebuild parental controls, V1 = PWA with quest board + minutes ledger + boredom button.

## Q&A Log
_(grill in progress — answers appended below as they land)_

### Q1: Long-term identity — family tool or future product?
- **Recommended:** Family-first, product-ready — private V1 in its own small repo, architected cleanly (family-scoped accounts, kid IDs not names, AI talks only to parent account) so a later product promotion needs no rebuild.
- **Sean's answer:** Family-first, product-ready (accepted recommendation).
- **Implication:** Own repo (NOT SS-PT). No multi-tenant SaaS work in V1, but no hardcoded-family shortcuts that would block productizing. COPPA-cheap posture from line one. "SwanStudios Family" stays a parked bridge, not a V1 constraint.

### Q2: Device + login model
- **Recommended:** Each kid gets her own profile with a 4-digit PIN on her own device (installable PWA); Sean gets the parent view on his phone (set quests, approve completions, grant minutes). AI features exist only on the parent account.
- **Sean's answer:** Kid PIN logins + parent app (accepted recommendation).
- **Implication:** Auth = one family account + kid sub-profiles with PINs (no kid emails/passwords ever). Two UI surfaces from day one: kid view (big, playful, low-reading-load) and parent view (dense, approval-centric). Per-kid streaks/tokens are first-class.

### Q3: Kids' grade bands + product age range
- **Recommended:** Capture as bands; working guess upper elementary (3–5).
- **Sean's answer:** "Upper elementary (3–5)... I also wanna make sure that this is something that will be for kids of all age ranges, since it's gonna be a product. Yes, my kids are in upper elementary."
- **Implication:** V1 content/UI ships tuned for grades 3–5 (his kids = the founding users), BUT the data model carries an age-band field per kid profile from day one, and content is band-tagged so K–2 / 6–8 / 9–12 packs can be added without schema change. Do NOT build four UIs now — build one band-aware system, populate one band.

### Q4: Screen-time economy shape
- **Recommended:** Small unconditional base (e.g. 30 min) + quest-earned minutes up to a daily cap (e.g. 2h total) + hard evening cutoff; all numbers parent-configurable.
- **Sean's answer:** Small base + earn to a cap (accepted recommendation).
- **Implication:** Token economy = base grant + earn rate + daily ceiling + cutoff time, all stored as per-family (later per-kid) config. The ledger must show the kid three numbers at a glance: minutes left today, minutes earned, minutes still earnable. Anti-abuse from the gamification playbook applies: idempotent awards, parent approval before minutes land.

### Q5: Enforcement mechanism
- **Recommended:** App ledger + OS controls — Screen Time / Family Link holds the hard ceiling + evening cutoff; inside that wall the app is the trusted scoreboard and Sean grants the time. App = truth, OS = muscle.
- **Sean's answer:** App ledger + OS controls (accepted recommendation).
- **Implication:** NO device-control integration in any version soon (no public APIs; tar pit). The app needs a dead-simple parent "grant" moment (kid shows phone → parent taps approve). V1 explicitly documents the OS-controls setup as part of onboarding — for the future product, that setup guide IS a feature.

### Q6: V1 learning tracks
- **Recommended:** Math (locked) + Money & Entrepreneurship + History + Writing/journaling; science/coding deferred to V2; manners/habits live as daily quest types, not a subject.
- **Sean's answer:** ALL of them — money/entrepreneurship, history, writing & journaling, AND science/coding — plus a new track he added: "tools to be successful human beings... for their mind, like how their body works, and nervous system and stuff."
- **Implication:** Sean wants breadth. Resolve the scope tension architecturally, not by cutting his list: build ONE generic quest/content engine where tracks are band-tagged CONTENT PACKS, not code. V1 ships a small starter pack per track (5–10 quests each) rather than a deep curriculum in any one; Hermes generates/refreshes pack content over time with parent approval. New track added: **Mind & Body** (how the body works, nervous system, sleep, focus/emotional skills) — Sean's professional superpower; his trainer expertise makes this pack uniquely credible for the future product. (Language note: use "focus/breathing/calm skills" framing per Sean's standing no-yoga/meditation wording preference.)
