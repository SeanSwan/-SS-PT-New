# Kimi Design Question — Trainer Home: keep the "observatory hero" or slim it?

- **Date:** 2026-07-23 · **For:** Kimi K3 (design decision) · **Status:** brief for consult
- **Ask:** a focused design call, not a full redesign. Answer decisively.

## The situation
The SwanStudios TRAINER dashboard home (`/dashboard/trainer/overview`, component `TrainerHomeTab`) was deliberately built to mirror the CLIENT dashboard's "observatory" pattern. On Sean's real 4K (3840px) screen it reads as **redundant + has a large dead vertical gap**. Composition, top→bottom:

1. **`TrainerHomeObservatoryHero`** (top): trainer avatar + name + "Welcome back, Coach", a subline cue, **3 stat cards (Clients today / Sessions / Completion)**, a Trainer-Level + hours + day-progress bar, **5 action buttons (Log Workout / Ask Coach / View Clients / Progress / Schedule)**, a Swan artwork panel, and a **6-tile lens rail (Today / Clients / Progress / Schedule / Build Plan / Coach)**.
2. A background-theme-picker panel.
3. **Main grid** — primary column: **`TrainerHomeNextActionCard`** ("Build the day" card with Log Workout / Plan Day / Ask Coach + Coach/Log/Progress mini-tiles), a **4-KPI strip (CLIENTS TODAY / SESSIONS / HOURS LOGGED / COMPLETION)**, and Today's Sessions. Right column: My Book (clients + unpaid earnings), Client Interventions (critical-compliance list), Observatory Widgets, Quick Actions.

## What Sean sees (his words + a 4K screenshot)
- The **same info appears twice**: hero stats (Clients/Sessions/Completion) ≈ the KPI strip; the hero "Build the day"/actions ≈ the NextActionCard "Build the day"/actions; the hero lens rail ≈ Quick Actions. It "looks duplicated."
- A **huge empty purple gap** in the middle of the page on 4K — content is crammed top + bottom with a dead band between.
- Sean's instinct: "drop the redundant hero, keep the working sections" → he'd prefer a **slim identity header** (avatar + name + Trainer Level + day-progress) and remove the hero's duplicate stats/actions/lens-rail.

## The tension (why this needs a design call)
7 "contract tests" ENFORCE the observatory hero (they assert the lens rail, the 5-up hero actions, the 3-up hero stats, "client-observatory hero anatomy"). It was built on purpose to match the client home. So slimming it **reverses a ratified design + rewrites its test contract** — a real decision, not a bugfix. The trainer is a B2B2C power user (rule 62 wedge): fast client logging, reviewable history, low-click coaching loop.

## Questions for you (decide, don't hedge)
1. **Is the observatory-hero pattern right for the TRAINER home, or is it redundant here?** The client home benefits from a big identity/progress hero (the champion IS the user). The trainer home is an operator console — does a duplicate stats+actions+lens hero earn its space, or does it just repeat the working sections below?
2. **If it should be slimmed:** what EXACTLY stays in the hero (identity? level? day-progress? artwork?) and what moves out? Give the slim-hero anatomy. Where do the removed lens rail / actions go — are they redundant with Quick Actions + NextActionCard (delete), or do they serve a distinct nav job (keep one, cut the other)?
3. **If it should stay:** then the real fix is just the 4K dead gap — how should the trainer home use 3840px vertical/horizontal space so it feels intentional, not crammed-top-and-bottom-with-a-void? (max-width cap? denser grid? move the right rail up? fill height?)
4. **The 4K space problem regardless:** `TrainerHomePageShell` is `max-width: 1720px` centered. On 3840px that leaves huge side gutters AND the content doesn't fill height. What's the right monitor-class treatment (per design.md §10 "wide law": more columns as width grows, content caps ~2240px, cards never stretch to 4K)?

Constraints: styled-components, Crystalline Swan, trainer = operator console (low-click, fast logging, reviewable history). Don't invent scope; the goal is a clean, non-redundant, 4K-correct trainer home. Recommend the single best direction + the concrete anatomy.

---

## KIMI K3 VERDICT (2026-07-23, ~$0.05) — SEND-BACK: cut the observatory hero. Sean approved the FULL redesign.
Full review: `AI-Village-Documentation/kimi-consults/trainer-home-dedup-2026-07-23.md`. Binding build plan:
1. **Slim identity bar** (~72-96px): avatar (48px) + "Welcome back, Coach {Name}" + Trainer-Level chip + compact inline day-progress + hours as muted text. NO stat cards, NO buttons, NO artwork panel (optional low-opacity Swan watermark only).
2. **Mission Control command card** = promote `TrainerHomeNextActionCard` to full-width, ONE Dual-Button-Glow primary (Log Workout) + secondary (Plan Day), next-session context (client/time/NASM-protocol cue), + a day-timeline strip of today's sessions. This is the page's signature moment.
3. **KPI strip = sole owner of metrics** (Clients/Sessions/Hours/Completion). The hero shows NO metrics.
4. **Promote Client Interventions** (critical-compliance radar) to the primary column — it's the trainer's real signature value, currently buried in the right rail.
5. **Evict the background-theme-picker** from the page flow → Settings/Profile (prime suspect for the dead gap).
6. **Shell 4K fix:** max-width 1720px → **2240px**, fluid `clamp(24px,3vw,64px)` padding; column law 1-col ≤768 / 2-col 1024-1919 / **3-col ≥1920** (Interventions becomes its own column); cards cap ~560px, never stretch; grid `min-height: calc(100dvh - header)` + `align-items: stretch` so the void becomes distributed breathing room.
7. **Rewrite the contract tests to assert BEHAVIOR not anatomy** (they fossilized a copy-paste): "renders next-session CTA", "KPI strip shows completion %", "interventions surfaces critical clients" — never assert N-up layout again.
Also flagged: mobile story (320-768) before 4K; ONE primary CTA (Dual-Button Glow means nothing sprayed across 5 buttons); nav belongs in the shell, not a hero lens rail; reduced-motion + focus-order on the new card; future ⌘K client-search palette makes the lens rail permanently irrelevant.
**Status:** approved, building slice-by-slice.
