# PLAN FOR VILLAGE REVIEW — SwanStudios User Dashboard / Social Redesign

**For:** 15-brain AI Village planning validation. Pressure-test this plan; resolve the OPEN DIVERGENCES; close the BLIND SPOTS. Sean is final decider.
**Product frame:** SwanStudios = trainer-led B2B2C training SaaS. Product Core Loop = log workout → save diary → charts/progress proof → decide next action → shareable milestone. Rule 62: community REINFORCES coaching; do NOT become generic social media. Theme "Crystalline Swan" dark-first: Midnight Sapphire #002060, Ice Wing #60C0F0, Wing Purple #8B5CF6, Gilded Fern #C6A84B, Frost White #E0ECF4, Obsidian #0A0A0F. styled-components only, 44px targets, Victory charts, prefers-reduced-motion, WCAG 4.5:1.

## PROBLEM (repo-verified)
Canonical shell `UserDashboard.V3.tsx`. Three DISAGREEING navs (top tab bar, Home left rail, HERO_LENSES strip) + unmounted `feed`/`community` tabs = dead links. Home = widget landfill; right rail = 8 stacked widgets. 320px decorative hero on every tab. Feed pulls external enrichment (NASA-APOD/iNaturalist/Quotable) every 3rd post → makes a coaching community feel fake. Hashtags: strong backend, but NOT clickable in PostCard, FeedFilterBar only on ClientCommunityPage, auto-appends #SwanStudios/#SwanProgress (trending poison).

## STRATEGY (Claude+Gemini free-brain consensus)
Take GPT Pro's SUBTRACTION, reject its RE-CENTERING. Keep Progress/coaching primary; social amplifies progress, doesn't replace it.

## TARGET IA — ONE nav, 6 surfaces (HYBRID labels: wordmark shown / functional slug+aria)
| Wordmark (UI) | Functional (slug/aria) | Contains |
|---|---|---|
| Apex | Home (`/user-dashboard`) | Apex Header (streak + today's workout + CTA) + Guide's Note + unified feed |
| Ascension | Progress (`/progress`) | Workout logs, Victory charts, measurements, **Nutrition (sub-tab)** — #2, the wedge |
| The Flock | Community (`/community`) | Feed + **Reels (sub)** + **Friends/SwanFam (sub)** |
| The Arena | Challenges (`/challenges`) | Unified mission board (XP/streak/badges/faction/party) |
| The Guide | Coach (`/coach`) | Swan Coach promoted first-class (trainer-led differentiator) |
| My Studio | Profile (`/profile`) | About + Activity + Photos + Creative merged |
DELETE: Home left rail, HERO_LENSES strip, unmounted feed/community entries. Alerts/notifications → header bell, not a tab. Mobile: bottom tab bar (Graphite + blur, active=Ice Wing).

## HOME = ONE CORE LOOP
Open → see live streak + the single next workout the plan/coach wants → log it (or react to a SwanFam proof) → progress rings fill with the "Aurora Bloom" payoff + shareable milestone → return tomorrow.
- **Apex Header** (~160px, sticky, backdrop-blur): Today's Focus text + dynamic dual-glow CTA (Midnight Sapphire bg → Wing Purple glow) + **Ascension Rings** (3 concentric: Ice Wing=weekly workouts, Swan Lavender=volume, Gilded Fern=streak).
- **Guide's Note** (Gemini's key add): daily text/audio/15s-video from the assigned trainer, pinned as the #1 Home item. Injects the "why," widens the coaching moat.
- **Single-column feed** with template Quick Post (Win / Proof / Progress photo / Ask SwanFam / Challenge / Poll); clickable hashtags (Ice Wing); attached workout mini-chart (Arctic Cyan).
- **Signature moment "Aurora Bloom"** on workout save: elastic ring fill + CSS radial-gradient aurora + Gilded Fern milestone gleam. **CSS/canvas only — NO three.js** (perf discipline). Reduced-motion → ring fill + gold text only.

## PHASE-1 "KILL THE CLUTTER" (pure subtraction, ~80% of the cure, near-zero data risk)
1. Collapse to ONE nav (delete left rail + HERO_LENSES + unmounted tabs).
2. Reduce right rail (8 → mission/next-action + SwanFam-active).
3. Compact hero → progress-first Apex Header.
4. Remove external enrichment interleaving; coaching empty-state instead.
5. Wire hashtags: clickable in PostContent, FeedFilterBar on Home, pass ?hashtag/?category to useSocialFeed, kill DEFAULT_HASHTAGS auto-append.
6. Template-driven Quick Post.
Each Phase-1 deletion needs a Canonical Surface Receipt (Rule 26) before code.

## OPEN DIVERGENCES — VILLAGE RESOLVE
- **D-A Right rail:** trim 8→2 (Claude) vs delete entirely / single column (Gemini). Which serves the core loop + retention best?
- **D-B Signature FX scope:** CSS-only vs Gemini's particles. (Constraint: no three.js.) How rich can this be while staying GPU-safe on mobile?
- **D-C Social lean:** how far toward social before it dilutes coaching-first (Rule 62)? Where's the line?
- **D-D Scope:** Phase-1 Home-only first, or full IA (all 6 tabs) at once?

## BLIND SPOTS — VILLAGE CLOSE
- Empty/loading/error states for the new feed + rings.
- Trainer authoring surface for the Guide's Note (who creates it, how scheduled, fallback when none exists).
- Notification model once Alerts leaves the tab bar (bell + counts + deep links).
- Ring ACCESSIBILITY: color-only encoding fails WCAG — needs text labels + values + aria.
- Rest-of-site consistency: does the whole app adopt the Apex Header language + hybrid labels? What's the propagation cost, and what breaks if only the dashboard changes?
- Data truth: rings/charts must come from real logged workouts (Product Core Loop data-truth rule), not mock.

## SUCCESS CRITERIA
Award-winning, brand-specific, premium (Rule 22). Coaching-first preserved. Mobile-first (320/414px). Every visible number sourced from real workout data. One signature moment tied to earned progress.
