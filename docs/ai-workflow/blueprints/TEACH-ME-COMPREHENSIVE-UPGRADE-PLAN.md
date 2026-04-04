# Teach Me Comprehensive Content Upgrade Plan

## Problem Statement
The current Teach Me system has 16 sections but the content is SHALLOW. It tells trainers WHAT things are but not HOW to actually use them, WHEN to choose them, or WHY one option is better than another. A trainer reading "EMOM: Every Minute On The Minute — 60s cycles" doesn't know how to actually RUN an EMOM class on the gym floor.

## Current State
- 16 Teach Me sections in `frontend/src/content/teach-me/index.ts`
- Content is 1-2 paragraphs per topic with bullet lists
- Missing: coaching cues, timing math, rotation logistics, common mistakes, when-to-use guidance, real-world examples

## What Needs to Change

### Phase 1: Deepen Existing Bootcamp Format Content
The `bootcampFormats` section needs to become a full training manual for each format:

**For EACH of the 12 formats, include:**
1. **What it is** (1 sentence) — already exists
2. **How it works on the gym floor** — step-by-step setup and execution
3. **Timing breakdown** — exact seconds per round, total class time, transition time
4. **When to use it** — class goals, participant fitness levels, equipment availability
5. **Coaching cues** — what to literally say to start/stop/transition
6. **Station rotation pattern** — how participants move between stations
7. **Common mistakes** — what trainers get wrong with this format
8. **Scaling tips** — how to adjust for 6 people vs 20 people
9. **Music BPM recommendation** — tempo that matches the work/rest ratio

### Phase 2: Deepen Exercise Detail "How to Perform"
The exercise Teach Me currently pattern-matches from exercise names. It should:
1. Pull real descriptions from the database when available
2. Include **NASM coaching cues** (what to tell the client)
3. Include **common compensations** to watch for
4. Include **regression/progression** chain (already have easy/hard variations)
5. Include **breathing pattern** (exhale on effort, inhale on return)

### Phase 3: Add Missing Teach Me Sections
Sections that DON'T exist yet but should:
1. **Build Modes Explained** — AI vs Manual vs Hybrid: when to use each
2. **Floor Mode** — what it is, how to use it during class
3. **Exercise Regressions** — what the green "Easier" lines mean, when to use them
4. **Pain Modifications** — how the knee/shoulder/ankle/wrist/back mods work
5. **Equipment Profile Setup** — deeper than current: AI scan, approval workflow, exercise mapping
6. **Class Planning Strategy** — how to plan a week of classes (lower/upper/cardio/full rotation)
7. **Board 1 vs Board 2** — main intensity vs modified wellness board
8. **Overflow Plan** — detailed lap rotation logistics
9. **55-Minute Rule** — deeper: demo time, equipment clear time, stretch block
10. **RPE Scale** — what 1-10 means, how to assess client RPE mid-workout
11. **Warm-Up Protocol** — NASM warm-up sequence: SMR → stretch → activate → integrate
12. **Cool-Down Protocol** — proper cool-down for each class type
13. **Client Assessment Quick Guide** — overhead squat, push, pull, single-leg tests
14. **Gamification for Clients** — XP, badges, streaks explained for the trainer to explain to clients
15. **Social Features Guide** — how to use the social feed, challenges, leaderboards

### Phase 4: Make Teach Me Contextual
- Each Teach Me section should appear at the RIGHT time in the RIGHT place
- Format Teach Me appears when selecting a format
- Exercise Teach Me appears when clicking an exercise
- Phase Teach Me appears when selecting OPT phase
- Currently some are wired, some aren't — need full audit

## Questions for AI Village
1. What additional training topics do fitness professionals need explained? (Web research: what do new NASM trainers struggle with most?)
2. Are there industry-standard boot camp format names we're missing? (Web research: popular group fitness formats 2025-2026)
3. What coaching cue frameworks exist? (Web research: NASM coaching cue model, motivational interviewing for fitness)
4. What music BPM ranges work for each format? (Web research: group fitness music tempo guidelines)
5. Are there liability/safety topics the Teach Me should cover? (Web research: group fitness safety standards ACSM/NASM)
6. What client communication topics should trainers learn? (Web research: trainer-client communication best practices)
7. How do competitors (Trainerize, TrueCoach, NASM Edge) handle in-app education?
