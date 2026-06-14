# Brainstorm: SwanStudios Embedded RPG Game

**Date:** 2026-06-13  ·  **Status:** complete (Phase 1 extract + Phase 2 synthesis done; chained to Chromie)  ·  **For:** net-new game feature — the visual/play layer on Gamification V2 (RPG Life Simulator) + Avatar Mirror, driven by real workout data

## Closeout & Handoff
- **Grill complete 2026-06-13.** 7 core decisions locked (Q1–Q7); Phase 2 synthesis (S1–S7 + minimal-click M1–M5 + MVP order) delivered.
- **Next gate (Sean's call):** `chromie` — strategy pressure-test on whether/when to build this vs the current Business Priority Order (it is NOT currently on the stack). Pipeline: grill-me ✅ → chromie (now) → swan-orchestrator → swan-design-router → build → closeout.
- **Doc-reconciliation offer (pending Sean's yes):** recon suggests `docs/ai-workflow/references/GAMIFICATION-SYSTEM.md` + gamification memory files may label shipped features as "planned" — reconcile to reflect actual built state.

## Summary
An embedded role-playing game inside the SwanStudios app whose progression is fed by the user's REAL logged workouts. Not a standalone game and not a generic fitness-social feed — it is the playable skin on the gamification/avatar system already envisioned (Gamification V2: Aegis HUD, Vault Decryption loot, Crystalline Avatar, Job System; plus the Avatar Mirror idea). Decided tech: React Three Fiber (Three.js) + low-poly stylized 3D, so it reuses the React/TS stack, carries to React Native mobile via expo-gl, and AI agents can build/iterate it with strong training-data support.

## Key Decisions
- **Game type = embedded RPG layer** (not standalone, not a 2D mini-game) — best moat; ties directly to the Product Core Loop (log → progress → reward → return). *(AskUserQuestion, 2026-06-13)*
- **Art direction = low-poly stylized 3D** (not voxel) — cheap + AI-friendly like voxel but can carry the Crystalline Swan premium dark-luxury brand; right call since the avatar represents the real user getting stronger. *(AskUserQuestion, 2026-06-13)*
- **Stack = React Three Fiber + @react-three/drei** (+ @react-three/rapier when physics needed); assets via Blender (free) + AI 3D gen (Meshy / Luma Genie / Rodin); animations via Mixamo. Not Unity/Godot/Unreal (separate runtime + language + awkward data bridge for this React/TS app). *(recommendation, 2026-06-13)*
- **Relationship = complete & evolve the existing AvatarHome/HomeWorld + gamification stack**, not a new silo. *(Q2)*
- **Engagement = living world + light touchpoints** (~2-3 taps/visit; no controller gameplay). *(Q3)*
- **Avatar Mirror = selectable intensity spectrum** (Pure Positive ↔ Gentle Dimming ↔ Visible Decline), default Gentle Dimming; "decline" expressed via the champion's radiance/vitality, not body-fat. *(Q4 + Sean's correction)*
- **Avatar = stylized champion** (body type = user choice via existing `avatarBodyType`); progress shows via gear/glow/aura/tier, never body-fat morphing. *(Q5)*
- **Availability = always-on lite + progressive depth unlock** (no hard Level-10 gate); MinimalistView 2D = low-end/WCAG fallback. *(Q6)*
- **Signature hero moment = tier-ascension transformation** (Crystalline Swan reveal), paired with a frequent real-time power-surge micro-reward. *(Q7)*

## Q&A Log
<!-- appended after every exchange -->

### Q1: What is the player / the thing that grows? (core fantasy)
- **Recommended:** "You, crystallized" — the avatar IS you, a Crystalline Swan champion that grows radiant/armored/powerful as the real you trains, and dims when you skip (Avatar Mirror). Strongest emotional payoff + matches existing Crystalline Avatar vision.
- **Sean's answer:** "You, crystallized" (Recommended). The avatar = the user, rendered as a Crystalline Swan champion; real training drives its growth and radiance, neglect dims it.
- **Implication:** Self-avatar identity is locked. Closes the companion/realm/squad branches. Opens: the Avatar Mirror tone (how punishing the "dim" side is), avatar customization/identity, body-mapping (does the avatar's physique reflect the user's real body?), and a single-champion progression model (not a party).

### Q2: How should the RPG game relate to the existing half-built avatar system?
- **Recommended:** Complete & evolve it — install R3F, render the 3D Crystalline Swan champion in the pre-built HomeWorld.tsx mount, drive it from existing ClientProgress + ProgressData + Streak, reuse the tier ladder/customization/rooms/pets/factions/marketplace/crystal-currency. No competing silo.
- **Sean's answer:** Complete & evolve it (Recommended).
- **Implication:** This is NOT net-new — it's the 3D realization + cohesion layer over a production-grade gamification stack (see Key Highlights). Locks: R3F install, HomeWorld.tsx as mount, reuse of existing models/services. Closes the "fresh silo" branch (avoids rule-27 competing surfaces). Opens: engagement model (active play vs passive evolution), unlock gate (keep Level-10?), MVP slice scope.

### Q3: How much active gameplay — play vs evolve-and-check-in?
- **Recommended:** Living world + light touchpoints — avatar/home evolve automatically from real workouts; active parts are claim loot / customize / check needs / accept weekly quests (= real workout goals). Minimal clicks, builds on existing systems, lowest risk.
- **Sean's answer:** Living world + light touchpoints (Recommended).
- **Implication:** No game-engine "controller" gameplay to build. The 3D layer is a living, reactive scene + a few tap interactions. Closes full-controllable-RPG and pure-ambient branches. Confirms the build is presentation + wiring, not gameplay systems. Opens: the signature visual moment, the Avatar Mirror tone, placement/gate, and what the ~2-3 per-visit touchpoints are.

### Q4: Avatar Mirror tone — how does the avatar respond to SKIPPING training?
- **Recommended:** Gentle dimming, never shaming (default).
- **Sean's answer (CORRECTION):** Combine the first three options into ONE selectable intensity spectrum — **Pure Positive ↔ Gentle Dimming ↔ Visible Decline** — the user (and/or trainer) chooses how strongly the mirror reflects neglect. Don't ship only the gentle mode; build all three as selectable modes.
- **Design constraint (carried, not overriding Sean):** even the "Visible Decline" mode expresses through the *crystalline champion's* vitality — dimming, dormant posture, cracked/clouded crystal, folded wings, faded aura — NOT through body-fat/"unhealthy body" rendering. Keeps loss-aversion motivation while avoiding body-shaming (aligns with existing EthicalGamification guardrails + rule 62). Confirm exact visual vocabulary of "decline" with Sean (Open Flag).
- **Implication:** Adds a "Mirror Intensity" user setting (default = Gentle Dimming). Three visual states of decline must be authored. Opens: does the avatar's *body/physique* itself reflect real body data, or only its radiance/gear/vitality? (Q5)

### Q5: Does the avatar's physique reflect the real body, or stay a stylized champion?
- **Recommended:** Stylized champion — body type is a CHOICE (reuse existing `avatarBodyType`), progress shows via gear/glow/aura/wings/tier, never auto-morphing fat/thin.
- **Sean's answer:** Stylized champion, progress via gear/glow/tier (Recommended).
- **Implication:** No body-composition morphing. "Decline" (Q4) is unambiguously expressed via radiance/vitality/posture/crystal-state, NOT body shape. Reuses existing `avatarBodyType` enum. Removes body-image risk. Confirms art pipeline authors: tier forms × gear sets × glow/aura states × dormant/decline states — not physique stages. Opens: placement + unlock gate, signature moment, MVP slice.

### Q6: Unlock gate / availability (today: Level-10-gated)?
- **Recommended:** Always-on lite, full world unlocks progressively.
- **Sean's answer:** Always-on lite, full world unlocks progressively (Recommended).
- **Implication:** REMOVES the hard Level-10 gate as the entry condition. Every user sees a living champion from workout #1 (lite scene, MinimalistView 2D as the low-end/WCAG fallback); rooms/3D-pet/vault-theater/marketplace unlock as they level. Day-1 hook + progression carrot. Note: this changes the existing `AvatarHome.unlocked` (Level-10) behavior — the gate becomes "depth tiers," not "all-or-nothing." Opens: signature moment, MVP slice, and a monetization decision (Sean did NOT pick subscription-gating here — keep monetization via cosmetics/marketplace/crystal currency, revisit in Phase 2).

### Q7: The signature "hero" moment?
- **Recommended:** Tier-ascension transformation — crossing a tier triggers a cinematic crystalline metamorphosis, fired by a real milestone.
- **Sean's answer:** Tier-ascension transformation (Recommended).
- **Implication:** Hero moment = the "Crystalline Swan reveal" on tier crossings (Bronze Forge → … → Crystalline Swan), tied to real PR/streak milestones. Per the framing, PAIR it with a frequent micro-reward (real-time power-surge on each workout log) so there's both a rare macro-beat and a daily micro-beat. This is the design-router's signature-moment input. Opens: MVP slice + Phase 2 synthesis.

## Key Highlights
- The differentiator vs every generic fitness game: progression is driven by FIRST-PARTY logged workout data + the coaching loop, not by in-game grinding.
- **MAJOR: this is ~60% already built and waiting for R3F.** Recon (2026-06-13, subagent findings — to re-verify before build per rule 30/26) found an existing half-built avatar system that is essentially this game minus the 3D engine:
  - `frontend/src/components/AvatarHome/HomeWorld.tsx` literally contains a placeholder comment: *"When @react-three/fiber is installed, renders the actual 3D scene"* — it is the PRE-ARCHITECTED MOUNT POINT for this game.
  - `CrystallineAvatar` (SVG today) already has the exact "you, crystallized" tier ladder: **Bronze Forge → Silver Edge → Titanium Core → Obsidian Warrior → Crystalline Swan.**
  - `AvatarHome` model (real, migrated): unlocked-at-Level-10, avatarBodyType (athletic/average/muscular/slim/curvy), customization, homeTier, rooms (bedroom/kitchen/training_room), furniture, `readyPlayerMeUrl` (3D GLB face-scan avatar via Ready Player Me), `ownedItems`, `crystalBalance` (currency), `factionId`, `wearableRecoveryData`. Companion pets, factions, and a marketplace already have components.
- **MAJOR: the RPG "stat sheet" already exists as real DB data.** `ClientProgress` (backend, real) stores `overallLevel` (0-1000) + experiencePoints + **per-NASM-type levels** (core/balance/stability/flexibility/calisthenics/isolation/stabilizers/injuryPrevention/injuryRecovery) + **per-body-part levels** (glutes/calfs/shoulders/hamstrings/abs/chest/biceps/triceps/lats/hips/lowerBack/etc) + **key-exercise levels** (squats/lunges/planks) + `unlockedExercises` + `achievements`. That IS an RPG character sheet derived from real training.
- **MAJOR: the gamification BACKEND is production-grade and comprehensive — the game mechanics are largely DONE, only un-3D'd.** Recon (subagent, re-verify before build) found ALL of the following marked REAL/implemented:
  - **Aegis HUD** (`AegisHudService.mjs` + `AegisHud.tsx`): 5 RPG needs bars (athletic/recovery/social/discipline/vitality) with per-bar time-decay + action-triggered replenish; 10 derived moodlets. This is a Sims-style needs system already running.
  - **Companion Pet** (`CompanionPetService.mjs` + `CompanionPet.tsx`): 5 species (crystal_dragon/iron_wolf/ember_phoenix/frost_swan/shadow_panther) × 6 evolution stages, appearance mods triggered by activity type. ~300+ visual variants.
  - **Vault Decryption** (`VaultDecryptionService.mjs` + animation): crypto-secure RNG loot drops, 5 rarity tiers (common→pearlescent), loot tables, per-tier decrypt animation.
  - **Job Class** (`JobClassSelector.tsx`): 5 FFXIV-style classes (paladin/monk/ranger/white_mage/dark_knight) with category-matched XP multipliers.
  - **Core engine** (`GamificationEngine.mjs`, `awardWorkoutXP.mjs`): XP/level/tier, achievements (6 categories × 6 rarities × 6 skill trees), badges, milestones, rewards/redemption, immutable PointTransaction ledger. **Idempotency keys + row-locking + same-day guard + EthicalGamification anti-burnout guardrails** all REAL.
  - **Social Party** (shared-HP party model — trigger logic partial), Challenges, Goals: REAL models.
  - Live data flow already wired: workout logged → `awardWorkoutXP` → level/tier → achievements → vault roll → Aegis replenish → pet evolve → eventBus.
- **What's genuinely MISSING (the actual build surface):** the 3D rendering layer (R3F not installed), and a cohesive *game experience* that unifies these scattered systems into one place. Quest/Mission system, Seasons/Battle Pass, MY SPACE rooms, Guilds = stub/planned.

## Architecture Notes (parent / children / whole)
- **Parent surface (candidate):** user dashboard `UserDashboard.V3.tsx` (route `/user-dashboard/:tab`); tab config `frontend/src/config/dashboard-tabs.ts`. The existing avatar surface is `AvatarHome/AvatarHomePage.tsx` (gated at Level 10). The natural mount for the 3D game is `AvatarHome/HomeWorld.tsx` (already the planned R3F mount).
- **Children / composed parts (existing, reusable):** CrystallineAvatar (tier ladder), ReadyPlayerMeAvatar (3D GLB), CompanionPetPanel/PetAdoptionModal (pets), FactionHooksPanel (factions), CrystallineMarketplace (shop), LevelGate (unlock), MinimalistView (WCAG 2D fallback), ObservatoryShell rails (level/XP/streak shown across dashboard).
- **Real data signals available to drive the avatar** (all REAL, production): WorkoutSession (date/duration/status/intensity/RPE/totalWeight/reps/sets/isMilestone/milestoneType/experiencePoints), WorkoutLog (per-set reps/weight/tempo/rest/rpe/isPR), Exercise catalog (NASM tags, difficulty 0-1000, experiencePointsEarned, unlockLevel, progressionPath), Streak (current/longest/freezes/xpEarnedFromStreak), BodyMeasurement (full composition + circumferences), ProgressData (daily rollup: xpGained/totalXp/level/achievements/strength|cardio|flexibility|functional counts/consistencyScore/mood/energy/motivation), ClientProgress (the stat sheet above).
- **R3F status:** NOT installed yet. `three`, `@react-three/fiber`, `@react-three/drei` absent from `frontend/package.json`. HomeWorld.tsx awaits them.
- **Fit with the Product Core Loop / dashboards:** the game is the "reward + next-best-action" surface of log → save → chart → next action → share. It is the visual payoff layer of the existing gamification/avatar stack, not a new silo.
- **Whole/coherence risk (rule 27 competing surfaces):** avatar/progress is currently shown in ≥3 places — `GamificationHub`, `AvatarHomePage`, and the `ObservatoryShell` rails. The game must be designated the CANONICAL avatar/progress experience and the others classified (canonical / legacy / fold-in) before/while building, or we create a 4th competing surface. Don't duplicate facts: the rails already show level/XP/streak as numbers — the game should VISUALIZE them (the champion IS the level), not re-print the same numbers.

## Recommended MVP / build order (Phase 2)
A vertical slice that proves the concept, not the whole game:
1. **Install R3F** (`three`, `@react-three/fiber`, `@react-three/drei`) + guarantee the 2D `MinimalistView` fallback path (perf/accessibility).
2. **Render the low-poly Crystalline champion in `HomeWorld.tsx`** with the 5 tier forms, driven by REAL `ClientProgress.overallLevel` / tier (read-only; no new write paths).
3. **The two reward beats:** real-time power-surge on workout log (micro) + tier-ascension transformation (hero).
4. **Always-visible champion widget on dashboard Home** (M1).
Everything else — 3D pet, vault theater, rooms, quests (S2), coach surface (S3), social (S5), marketplace/monetization (S6) — layers on in later slices.
**Pre-build gates:** Canonical Surface Receipt (rule 26) on the real mount + data path; resolve the Factions/Marketplace/RPM subagent conflict (rule 30); recursive plan via `swan-orchestrator` (rule 15); concept directions via `swan-design-router` (rule 40).

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)
> Advisory. Each needs Sean's accept / modify / reject; verdicts captured back here.

- **S1 — Unify the scattered systems into ONE game surface (the core value).** Today gamification lives split across `AdvancedGamification/` (Aegis HUD, pet, vault, job class, achievements), `AvatarHome/` (avatar/home/rooms), and the `ObservatoryShell` rails. The single biggest missing thing is a cohesive HOME where these become one experience. The game IS that unification. *Strengthens: progress proof, retention.*  — **Sean verdict: PENDING**
- **S2 — Build the Quest/Mission system (currently a stub) as the next-best-action engine.** Quests = real workout goals generated from `ClientProgress` gaps + `Streak` + coach assignments ("your STR champion is behind — train legs", "set a squat PR", "hit 3 sessions this week"). This is the missing bridge that turns the game into the rule-62 "what's my next best action" north star instead of a vanity toy. *Strengthens: adherence, next-best-action, coaching loop.*  — **Sean verdict: PENDING**
- **S3 — Coach/trainer integration (the on-wedge must).** SwanStudios is trainer-led B2B2C (rule 62 wedge). The game has no trainer surface today. Add: trainer can SEE a client's champion (engagement proof for the admin/trainer proof-of-value loop), ISSUE a quest ("your coach challenges you…"), and CELEBRATE milestones. Without this, the game drifts toward generic gamification; with it, the game reinforces the coaching moat. *Strengthens: trainer/admin dashboards, retention proof-of-value, wedge.*  — **Sean verdict: PENDING**
- **S4 — Pair a frequent micro-reward with the rare hero moment.** Real-time power-surge into the champion on every workout log (daily dopamine) + the chosen tier-ascension hero beat (rare awe). Premium design wants both cadences. *Strengthens: daily loop addictiveness.*  — **Sean verdict: PENDING (recommended yes; follows from Q7 framing)**
- **S5 — Wire the existing Social Party (shared-HP) + Challenges into the game later.** Parties where members' champions stand together; group raids tied to existing Challenges. Community is a rule-62 pillar. Defer past MVP, but plan the data path now. *Strengthens: community, belonging.*  — **Sean verdict: PENDING**
- **S6 — Monetize vanity, not progress.** Sean chose progressive-level unlock (not subscription-gating) for DEPTH. Keep core progression free; monetize cosmetics (skins, gear, room decor, pet variants) via earned `crystalBalance` (free path) AND premium-tier perks (exclusive skins, extra vault rolls, mirror customization) aligned to Starter/Guardian/Crystalline tiers. Ethical + proven. *Strengthens: revenue without pay-to-win.*  — **Sean verdict: PENDING**
- **S7 — Accessibility + performance are requirements, not polish.** The Mirror-Intensity spectrum (Q4) needs a settings surface; MinimalistView 2D must guarantee a working experience on low-end devices / `prefers-reduced-motion` / the React Native mobile app (expo-gl/three). Define a perf budget + guaranteed 2D fallback so 3D never ships a broken scene. *Strengthens: trust, reach, mobile roadmap.*  — **Sean verdict: PENDING**

## Minimal-Click Opportunities
- **M1 — Always-visible champion widget on dashboard Home = 0 taps to see progress** (vs navigating to a tab). The champion greets you on login.
- **M2 — One-tap vault claim from the champion screen.** before: log → Gamification Hub → Vault → claim (~4 taps). after: champion screen shows "1 drop ready" → tap (1 tap).
- **M3 — Quests surfaced inline on the champion screen with one-tap accept** (vs a separate Challenges tab).
- **M4 — Workout log → instant power-surge feedback, zero extra taps** (reward rides the existing log action; no new screen).
- **M5 — Mirror intensity + customization reachable in 1 tap from the champion screen** (vs buried in settings).

## Open Flags
- [ ] **Subagent conflict to resolve before build (rule 30):** the avatar-recon agent reported Factions (`FactionHooksPanel`), Marketplace (`CrystallineMarketplace`), and Ready Player Me (`ReadyPlayerMeAvatar`) as REAL existing components; the gamification-recon agent reported Factions/Marketplace/RPM as planned-only. Verify actual state of these three before relying on them.
- [ ] Confirm `AvatarHome` Level-10 unlock gate is still the intended gate for the game (and whether a pre-Lv10 lite view should exist).
- [ ] All recon findings are subagent hypotheses with file:line — produce a Canonical Surface Receipt (rule 26) on the real mount + data path before any code.
- [ ] **SEQUENCING (honest flag):** this game is NOT on the current CLAUDE.md Business Priority Order (which is: Swan Coach v15 → trainer workout logging → chart truthfulness → PLAUD → premium gating). It's exciting and ~60% built, but slotting it in ahead of revenue-critical items is a CEO call. Recommend running `chromie` (rule 65) to pressure-test whether/when to build it before committing engineering time.
- [ ] Confirm "decline" visual vocabulary for the Visible-Decline mirror mode (dim/dormant/cracked-crystal/folded-wings — Sean to approve exact language).
- [ ] Decide canonical avatar/progress surface vs GamificationHub / AvatarHomePage / Observatory rails (rule 27 classification) before build.
