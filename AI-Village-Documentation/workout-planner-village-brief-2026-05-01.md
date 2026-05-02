# Workout Planner — AI Village Brief
**Date:** 2026-05-01
**Requester:** Sean (full permission granted to run Village)
**Scope:** `/dashboard/trainer/workout-planner` — currently the single Swan Studios surface for trainer-driven AI workout generation, multi-week periodization, and exercise rolodex browsing.

---

## Why this brief exists

The Village output (Phase 1 nine-track parallel + Phase 2 code debate + Phase 3 UX/UI debate) runs on the file content alone — it has no awareness of Sean's specific asks. This brief captures Sean's intent so the human synthesis pass after Village completes can cross-reference Village findings against actual product priority.

---

## Sean's asks (verbatim trace)

1. **4-week plan only shows 3 days** — "1 Month (4 weeks)" + "3×/week" → backend correctly returns 12 sessions, UI surfaces only Day 1/2/3 (one week).
2. **Exercise Rolodex text squished** — impact badges overlap exercise titles in the virtualized list. Sean explicitly noted: **keep the Rolodex pattern**, polish it. **Mobile-first** is critical — pack more info in less space without losing readability on phones.
3. **Mesocycle Block 1 card not interactive** — clicking the small card should expand to full block detail (weeks 1-4 broken down per day).
4. **PDF export** — trainers need to print/export the full plan.
5. **Save plan + cross-dashboard visibility** — saved plans need to live somewhere logical from trainer dashboard, admin dashboard, AND client dashboard ("Your Plan" panel for the client).
6. **Swan Coach plan-awareness** — when a client asks Coach about their workout, Coach should reference the saved active plan, not regenerate. Override only on explicit "regenerate" intent.

## Sean's design discipline (locked, do not relitigate)

- **Stack truth:** styled-components + CSS custom-property tokens with dark fallbacks. NO Material-UI.
- **Theme:** Enchanted Apex / Crystalline Swan (CLAUDE.md active palette only — Galaxy-Swan is RETIRED).
- **Buttons:** Dual-Button Glow (blue bg → purple glow OR purple bg → cyan glow).
- **Min touch target:** 44px on all interactive elements.
- **Typography:** Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming).
- **Mobile responsive matrix:** 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 / 3440.
- **No Recharts** for new work — Victory only.
- **Zero PII to LLMs** — client IDs only.

## Existing logic to BUILD ON (do not redesign these)

- **Goal+Phase steering** is real — `workoutBuilderGoalConfig.mjs` exposes 6 goals and full phase progression logic. The generated workout's set/rep/rest/intensity is shaped by `getGoalOptBias` per phase. This is fresh from this session and Codex-approved (commit `4002b1e66`). Do not propose redoing it.
- **WorkoutPlan model** exists with `planData` JSONB column already storing the full multi-week structure (verified during the Triage Slice 2 fix earlier today). Save flow should write into this, not invent a new schema.
- **`/api/client-trainer-assignments/trainer/:id`** is the canonical trainer-client contract. Every new route or query against this relationship must use the model contract `getModel('ClientTrainerAssignment').findOne({ where: { ..., status: 'active' } })`. Schema drift on this has burned us 5+ times this session.
- **AuthAxios + GlobalClientContext** are role-aware — trainer paths must use the trainer-specific endpoints, not the admin-only ones. Pattern at `WorkoutPlannerPage.tsx:301-330`.

## Out of scope (do not propose)

- Replacing the Rolodex paradigm. Sean explicitly said keep it.
- Reverting to Material-UI for any reason.
- New AI providers beyond what Swan Coach already wires (Hermes provider router covers this).
- Stripe / billing changes.
- Splitting WorkoutPlan into a normalized schema (the JSONB design is intentional per Triage Slice 2 audit).

## Specific UX questions for the Village to answer

1. **Mobile information density** — how to pack 4-5 meta tags + impact level + add button into a single rolodex row on a 320-414px viewport without overlap. Density patterns from premium fitness apps welcome.
2. **Multi-week display pattern** — Week 1/2/3/4 tabs above per-day tabs? Collapsible week sections? Calendar grid? Compare 3 patterns and recommend.
3. **Mesocycle expansion** — modal vs drawer vs inline accordion for the "click block 1" detail view. Which is mobile-friendliest?
4. **PDF export** — browser print-stylesheet vs server-side jsPDF/Puppeteer. What's the polish vs effort tradeoff for SwanStudios scale?
5. **Cross-dashboard "My Plans" surfacing** — where does it live on each dashboard (trainer / admin / client) without bloating navigation? Suggest IA placement.
6. **Coach plan-awareness handoff** — when Coach is mid-conversation and trainer references "this client's plan," how should Coach disclose it's reading from saved plan vs regenerating?

## Hard constraints (Village must respect)

- **Rule 22:** premium design standard — must feel enterprise-grade, distinctive, brand-specific. No template/generic.
- **Rule 23:** design dual-pass — after Village concept lands, hostile design critique pass before code.
- **Rule 24:** responsive audit matrix verified end-to-end.
- **Rule 25:** motion stays GPU-cheap, respects `prefers-reduced-motion`.
- **Rule 40:** design routes through `swan-design-router` for ideation gate.
- **Rule 22-25 + 40:** no design ships without these.

## Synthesis plan (Sean → me after Village completes)

1. Read `AI-Village-Documentation/validation-prompts/latest/summary.md` first.
2. Cross-reference Village findings against this brief — **flag any Village suggestion that contradicts a locked decision above** (Codex caught this twice this session: theme-provider tokens that violate rule 6, and a "rip out goal config" suggestion that ignored the just-shipped rule-46 work).
3. Produce a synthesis doc: Village findings ✓ accepted / ✗ rejected (with reason) / ⚠ deferred.
4. Re-propose the W1-W4 phased plan to Sean with Village evidence baked in.
5. Sean approves phase ordering → I ship W1 first, await approval before W2+.

## Status

- Village run kicked off 2026-05-01 with 7 files scoped: `WorkoutPlannerPage.tsx`, `WorkoutPlannerStyles.ts`, `WorkoutPlannerTypes.ts`, `workoutBuilderService.mjs`, `workoutBuilderGoalConfig.mjs`, `workoutBuilderRoutes.mjs`, `WorkoutPlan.mjs`.
- Background task ID: `bru83pwh5`.
- Expected runtime: 10-30 min (9 parallel Phase 1 + 2 recursive debates Phase 2/3).
- Output destination: `AI-Village-Documentation/validation-prompts/latest/`.
- Sean's permission granted (rule 16) — no further authorization needed for THIS run only.
