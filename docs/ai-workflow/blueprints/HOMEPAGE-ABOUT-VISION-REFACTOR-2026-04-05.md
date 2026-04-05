# SwanStudios Homepage & About Page Vision Refactor — 2026-04-05

## STATUS: PLANNING — AI Village Review Required Before Implementation

## THE VISION (This is the soul of the platform)

SwanStudios is not a personal training website. It is a health-first 
community operating system. Health is the gravitational center — 
everything else orbits it.

The mission: Give back what corporations took. Food companies poison 
the supply chain. Social media platforms extract your data and sell 
it back as ads. Gaming companies fire entire studios after record-
breaking launches. Healthcare safety nets are being cut. SwanStudios 
is the counter-movement — a platform built by the little guy, for 
the little guy, where the community owns its future.

### THE PLATFORM IS 5 THINGS IN ONE:

1. **Global Trainer Platform** — Any trainer, any city, any country signs 
   up, brings their clients, runs their entire business here. Sean takes 
   a small fair fee (~10% or less) on transactions. Trainers keep their 
   clients, their data, their relationships.

2. **Health-First Community** — Workout logs, progress tracking, gamification 
   (XP, badges, streaks, leaderboards), nutrition tracking, food scanner 
   (scan barcodes to identify harmful ingredients). Health data lives here 
   permanently — like Facebook for your fitness journey, it becomes 
   irreplaceable over time.

3. **Social Ecosystem** — TikTok + Instagram + YouTube + Twitch + Nextdoor + 
   Meetup combined. Dance, music production, singing, art, comedy, 
   photography. All content types welcomed. Family-friendly and 18+ 
   content properly separated.

4. **Gaming & Streaming** — Twitch-style game streaming. Star Citizen, AAA 
   titles, indie games. Support for independent game creators that big 
   publishers abandon. Family and adult content separated.

5. **IRL Community** — Local meetups, walking clubs, fitness challenges, 
   group events. The digital community made real.

### THE AUDIENCE:
- People who feel left behind by the current system
- Working and middle class people who are tired of being the product
- Wealthy benevolent people who want to invest in something real
- Trainers who want to own their client relationships
- Creators who want a platform that supports them
- Gamers who also care about their health
- Senior citizens who want community and mobility
- Anyone tired of corporations extracting value from their lives

### THE FOUNDER:
Sean Swan — NASM-certified (workshop-trained), 26 years experience, 
trained at LA Fitness, Gold's Gym, Bodies in Motion, Kerlan Jobe Health South. 
Founded SwanStudios in 2013 with wife Jasmine. Self-taught full-stack developer. 
Father. His mission is fairness first — not greed. He's building this because 
he needed it to exist. In 2018, Sean taught himself full-stack development — not 
to become a developer, but because he had a vision that couldn't wait for someone 
else to build it.

---

## SPECIFIC CHANGES NEEDED

### HOME PAGE

#### 1. HERO SECTION
- Replace headline "Where Excellence Meets Precision" with:
  - **HEADLINE:** "Health First. Community Always."
  - **SUBHEADLINE:** "The platform where your fitness journey, your creativity, your community, and your trainer all live in one place — and stay there forever."
- Keep the swan lake background image
- Keep the two CTA buttons but relabel:
  - Button 1: "Join the Community" (was "Start My Fitness Journey")
  - Button 2: "Find a Trainer" (was "Book Free Consultation")
- Keep the quick-access links below buttons but add a "Become a Trainer" link

#### 2. ADD MISSION STATEMENT SECTION (new, insert after hero)
- Section title: "Why We Built This"
- Body copy:
  "The food industry profits from making you sick. Social media profits from your attention. Gaming companies fire the people who made their best games. Healthcare safety nets are disappearing.
  
  SwanStudios exists because we believe you deserve better. A platform that puts your health first, remembers your journey, supports your trainer, celebrates your creativity, and never sells you out.
  
  We're not here to extract value from you. We're here to help you build it — for yourself, and for the people around you.
  
  Built by a trainer. Owned by the community. Powered by all of us."

#### 3. ADD "FOR TRAINERS" SECTION (new, after mission statement)
- Headline: "Trainers: This Platform Is Yours"
- Body: "Whether you're in Anaheim or Amsterdam, Lagos or London — bring your clients to SwanStudios. Run your sessions, log their workouts, collect payments, and build your brand on a platform that's on your side. Fair fees. No surprises. Your clients stay yours."
- CTA Button: "Trainer Sign Up"

#### 4. UPDATE "BEYOND THE GYM" ECOSYSTEM SECTION
- Headline: "Beyond the Gym"
- Subheadline: "SwanStudios is where fitness meets everything else that makes life worth living."
- Cards (icon + title + one-line description):
  - Fitness & Training: "Log workouts, track progress, earn XP, challenge your community."
  - Dance & Movement: "Share choreography, freestyle sessions, and movement art."
  - Music & Singing: "Produce beats, perform covers, share your creative process."
  - Gaming & Streaming: "Stream games, find your crew, support independent developers."
  - Art & Expression: "Showcase artwork, photography, and digital creations."
  - Comedy: "Skits, memes, stand-up. Make the community laugh."
  - Community Meetups: "Local events, walking clubs, group activities. Digital made real."
  - YouTube-Style Video: "Long-form content, tutorials, vlogs. Your channel, your audience."

#### 5. FIX THE STATS SECTION
- Change "7+ Years Experience" to "26+ Years Experience"
- Keep all other stats

#### 6. UPDATE THE FINAL CTA SECTION
- Change "Ready to Transform?" to "Ready to Be Part of Something Real?"
- Change body copy to: "Your health journey deserves a permanent home. Your trainer deserves a fair platform. Your community deserves to own itself. SwanStudios is where all of it lives."

### ABOUT PAGE

#### 1. ADD MISSION STATEMENT AT TOP (before the bio)
- Large pull quote: "I'm not building this to get rich. I'm building this because people deserve a platform that's actually on their side." — Sean Swan, Founder

#### 2. UPDATE ABOUT SEAN SECTION
- Change "25+ years" to "26 years" throughout
- Add after the NASM/Kerlan Jobe paragraph:
  "In 2018, Sean taught himself full-stack development — not to become a developer, but because he had a vision that couldn't wait for someone else to build it. SwanStudios is that vision: a health-first community platform that gives trainers, creators, and everyday people a place where their data, their relationships, and their progress stay theirs forever."

#### 3. ADD "THE SWANSTUDIOS PROMISE" SECTION (new, after bio)
- Three promise cards:
  - "Fair Always": "We take a small fair fee from trainer transactions. Nothing hidden. Nothing predatory. If you thrive, we thrive."
  - "Your Data, Your Story": "Your workout history, your progress, your community — it lives here permanently and it belongs to you. Not advertisers."
  - "Community Over Profit": "We will never sell your attention to the highest bidder. Every decision we make is filtered through one question: is this good for our community?"

#### 4. UPDATE PHILOSOPHY SECTION
- Change the fourth pillar from "Community Focus" to:
  - Title: "Collective Power"
  - Body: "The corporations cutting safety nets are counting on us staying isolated. SwanStudios is what happens when a community decides to take care of itself."

---

## CURRENT STATE OF THE CODEBASE (for AI Village context)

### What Already Exists:
- Homepage: Hero section with swan lake bg, "The Arsenal" (8 service cards), Training Programs (3 tiers), Golf Performance section, About Sean bio section, Client Success Stories, Stats section, "Beyond the Gym" social ecosystem section, Final CTA
- About page: Sean's bio, certifications, philosophy pillars
- The "Beyond the Gym" section ALREADY EXISTS with 8 cards (Dance, Music, Singing, Art, Gaming, Comedy, Fitness Challenges, Community Meetups) — needs content/description updates
- Stats section exists but shows wrong years count
- Theme: Enchanted Apex — Crystalline Swan (dark-first)
- Stack: React 18 + TypeScript + styled-components

### What Needs to Be Created New:
- Mission statement section ("Why We Built This")
- "For Trainers" section
- "The SwanStudios Promise" section on About page
- Founder pull quote on About page

### What Needs Text-Only Updates:
- Hero headline + subheadline + button labels
- "Beyond the Gym" card descriptions
- Stats year count
- Final CTA text
- About page bio text
- Philosophy fourth pillar

### Key Files (estimated):
- `frontend/src/pages/HomePage/` or similar — homepage components
- `frontend/src/pages/AboutPage/` or similar — about page
- Individual section components within these pages

---

## AI VILLAGE REVIEW QUESTIONS:

1. Does this vision align with what exists in the codebase, or are there architectural gaps?
2. Is the "Global Trainer Platform" positioning premature given the current single-trainer setup?
3. How should the hero messaging balance the health-community-social vision without overwhelming first-time visitors?
4. Are there competitive platforms doing something similar we should learn from?
5. What's the right content hierarchy for the homepage — which sections come first?
6. Does the 18+ content separation need architectural planning NOW or can it wait?
7. What's missing from this plan that the codebase reveals?
