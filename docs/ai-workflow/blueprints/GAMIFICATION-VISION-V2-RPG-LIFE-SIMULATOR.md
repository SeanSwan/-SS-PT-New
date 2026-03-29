# SwanStudios Gamification Vision V2: RPG Life Simulator

> **Status:** Pending AI Village Consensus
> **Author:** Sean Swan (CEO Vision) | **Date:** 2026-03-28
> **Phase:** Phase 3 of Feature Roadmap (post chart-sharing + badges)

## Core Thesis

SwanStudios is NOT a fitness app with gamification bolted on. It is an **RPG life-simulator where the player's real body is the main character.** Every real-world action (workout, meal, social interaction) drives in-game progression, and every in-game consequence (sprite health, faction standing, streak fortress) drives real-world behavior.

## The Compulsion Loop

`Cue → Action → Variable Reward → Investment`

### Five Psychological Phenomena to Trigger:

1. **Variable Ratio Reinforcement (Skinner Box)** — Randomized loot drops, not predictable point awards
2. **Loss Aversion** — Sprite health degrades, streak fortress takes damage, party HP drops
3. **Social Obligation (Raid Mentality)** — Team/party failures when one member skips
4. **Meaningful Progression (RPG Mechanics)** — Level changes HOW you interact, not just a number
5. **Dollhouse/Nurturing Effect (Sims)** — Virtual avatar + room that depends on you to thrive

---

## Feature Breakdown

### 1. Seasons of Strength (Battle Pass / Faction Warfare)
*Inspired by: Overwatch 2026 Season 1: Conquest*

- 9-week seasonal cycles with faction choice at onboarding
- Factions: "The Vanguard" (strength), "The Syndicate" (agility), "The Sentinels" (endurance)
- Every logged workout contributes to global faction war
- Seasonal leaderboard with real rewards (merch, free sessions, supplement samples)
- **Subroles** mapped to NASM OPT phases:
  - Phase 1 (Stabilization) → "Scout" passive
  - Phase 2 (Strength Endurance) → "Bruiser" passive
  - Phase 3 (Hypertrophy) → "Berserker" passive
  - Phase 4 (Max Strength) → "Titan" passive
  - Phase 5 (Power) → "Warlord" passive
- Subrole unlocks unique UI colors, avatar titles, and profile flair

### 2. Virtual Sanctuaries & Needs Management
*Inspired by: The Sims 3*

#### The Needs Panel (Sims-style bars):
- **Hunger Bar** → Nutrition Intelligence tracker (macros logged)
- **Energy Bar** → Sleep/recovery data (manual or wearable API)
- **Social Bar** → Social feed interactions (posts, comments, likes)
- **Athletic Bar** → Workout completion
- **Discipline Bar** → Streak maintenance

#### Moodlet System:
- All bars green → "Elated" moodlet → 1.5x XP multiplier for the day
- Neglected macros → "Stressed" moodlet → UI visual debuff
- 3+ days streak → "Focused" moodlet → bonus loot drop chance
- Missed workout → "Sluggish" moodlet → sprite shows fatigue

#### "MY SPACE" Build/Buy Mode:
- Virtual customizable room on user profile
- Earn "Simoleons" (fitness currency) from workouts
- Buy virtual furniture, gym equipment, posters, trophies
- Friends can visit your room on social feed
- Room quality visible on profile (social proof)

### 3. Fitness Job System
*Inspired by: Final Fantasy XI & XIV*

- Users are "Level 10 Paladin" not just "Level 10"
- Job classes:
  - **Paladin** — Heavy lifting, strength-focused
  - **Monk** — Calisthenics, HIIT, bodyweight
  - **Ranger** — Cardio, endurance, running
  - **White Mage** — Recovery, flexibility, corrective exercise
  - **Dark Knight** — Power training, explosive movements
- Users can switch jobs (like FFXIV)
- Each job has its own skill tree and progression path
- Job-specific cosmetics and avatar gear

#### Linkshells (Mini-Group Parties):
- 3-5 person teams with shared weekly HP bar
- One person misses macros → whole party takes "damage"
- Everyone succeeds → party XP multiplier
- Party chat, shared challenges, accountability

### 4. Loot Drop System
*Inspired by: Borderlands 4, Candy Crush*

- After completing a workout, animated loot drop plays on dashboard
- Rarity tiers: Common, Rare, Epic, Legendary, **Pearlescent** (new top tier)
  - Common: 50 XP
  - Rare: 100 XP + Simoleons for MY SPACE
  - Epic: Cosmetic item for avatar/room
  - Legendary: Free 1-on-1 session, merch discount, real supplement sample
  - Pearlescent: Exclusive seasonal cosmetic (only during that Season)
- Variable ratio — you never know what you'll get
- Satisfying Candy Crush-style dopamine flash animation

### 5. Cyberware & Stat Progression
*Inspired by: Cyberpunk 2077, GTA, RDR2*

- Visual stat upgrades as profile "Cyberware"
- Nutrition milestones → unlock digestive "chrome"
- Strength PRs → unlock muscular "augmentations"
- Consistency → unlock neural "implants"
- All visualized on a Cyberpunk-style character sheet
- Stats literally increase with use (like GTA stamina from sprinting)

### 6. Ghost Mode (Personal Competition)
*Inspired by: Gran Turismo, Forza*

- When repeating a workout, show "Ghost" stats from last session
- "Your Ghost benched 185lbs × 8. Beat 9 reps to win."
- Ghost comparison on every repeated exercise
- Weekly "Beat Your Ghost" challenge with bonus XP

### 7. Streak Fortress (Loss Aversion)
*Inspired by: Minecraft, Orcs Must Die*

- Every streak day builds a block on your fortress
- Visual fortress grows on profile (7 days = small wall, 30 = castle, 365 = citadel)
- Missing a day = "Orcs" damage your walls (visual degradation)
- 1-day grace period (streak shield) earned through high engagement
- Friends can see your fortress on social feed

### 8. Tamagotchi Companion Sprite
*The Silver Bullet Feature*

- On joining, each client gets a low-level 8-bit sprite (dragon, knight, cyberpunk merc)
- Sprite lives in their MY SPACE room
- **Sprite evolves based on real actions:**
  - High-quality food → sprite gains armor, Hunger bar fills
  - Phase 3 hypertrophy workout → sprite gains larger weapon
  - Cardio → sprite gains speed wings
  - Streaks → sprite gains aura glow
- **If user stops logging in:**
  - Sprite loses health
  - Gets negative moodlets (crying thought bubble)
  - Reverts visually (armor breaks, weapons shrink)
  - Visible to friends on social feed (social pressure)
- Ultimate retention mechanic — people will gym just to keep their sprite alive

---

## Implementation Priority

### MVP (Phase 3 Sprint):
1. Needs Panel (4 bars + moodlet system)
2. Loot Drop animation on workout completion (variable rewards)
3. Ghost Mode for repeated exercises
4. Streak Fortress visualization
5. Job Class selection at onboarding

### Phase 3.5 (Enhancement Sprint):
6. MY SPACE room builder (basic furniture system)
7. Tamagotchi companion sprite (basic evolution)
8. Linkshell party system (shared HP bar)

### Phase 4 (Seasonal):
9. Season 1 Battle Pass with faction warfare
10. Cyberware stat visualization
11. Pearlescent loot tier
12. Full sprite evolution tree

---

## Technical Notes

- Needs Panel bars: Real-time calculation from existing data sources (nutrition tracker, workout logger, social feed activity, sleep/recovery)
- Loot drops: Backend `GamificationEngine.awardPoints()` already exists — extend with `generateLootDrop()` using weighted random
- Ghost mode: Compare current workout to last matching workout in `WorkoutLog` by exercise name
- Sprite: Start with 2D pixel art sprites (CSS sprite sheets), evolve to 3D later
- MY SPACE: React-based drag-and-drop room builder with virtual furniture items stored in user preferences JSON
- Seasons: 9-week cycles aligned with NASM OPT mesocycle timing
- All animations: `transform` and `opacity` only (GPU-composited per CLAUDE.md)
