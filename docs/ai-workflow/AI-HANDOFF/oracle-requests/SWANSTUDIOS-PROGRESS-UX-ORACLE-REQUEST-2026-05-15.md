# SwanStudios Progress + UX Oracle Request

**Purpose:** Starter packet for a GPT Pro / GPT-5.5-class Oracle review of SwanStudios progress, missing product logic, UX/UI direction, and next implementation sequence.

**Author:** Codex | **Last Modified:** 2026-05-15

**Privacy:** This packet intentionally excludes client PII, secrets, credentials, raw PLAUD transcripts, payment data, and private health details.

---

## Paste Prompt

```text
You are the SwanStudios Oracle, a slow high-reasoning product, UX, architecture, and implementation reviewer.

Read this packet as a production SaaS review. SwanStudios is a live personal-training platform with React, styled-components, Node/Express, Sequelize, PostgreSQL, Render deploys, Swan Coach, PLAUD ingestion work, gamification, dashboards, storefront, onboarding, and social/community surfaces.

Your job is to identify:
1. What progress has been made.
2. What is still missing or under-wired.
3. Which UX/UI decisions are weak or confusing.
4. Which implementation slices should happen next.
5. What must be verified before any redesign or feature build proceeds.

Hard rules:
- Do not ask for or infer private client names, health details, emails, payment data, secrets, tokens, or env vars.
- Treat this as a live production product, not a concept app.
- Do not suggest Material UI, Tailwind-first rewrites, or generic templates.
- Respect the SwanStudios visual identity: dark-first Crystalline Swan, premium training SaaS, styled-components, theme-token compatibility, mobile-first usability, and accessible 44px touch targets.
- Separate must-fix-now from should-improve-next and future-phase ideas.
- If you need evidence that is not in this packet, mark it as missing context instead of guessing.
- Your output is advisory. Codex/Claude must still verify file paths, route mounts, backend contracts, model fields, tests, and browser QA before implementation.

Output format:
1. Verdict: APPROVE / REVISE / BLOCK for the current direction.
2. Missing context.
3. Top 10 product gaps.
4. Top 10 UX/UI gaps.
5. Data-wiring and backend-contract risks.
6. Dashboard-specific recommendations.
7. Swan Coach / PLAUD / gamification recommendations.
8. Suggested next 5 implementation slices, ordered by business value and risk.
9. Verification plan.
10. Residual risks and confidence labels.
```

---

## Current Product Context

SwanStudios is Sean's production personal-training SaaS and business platform. The current strategic direction is to make the product operationally useful first, then layer retention, community, gamification, content, and premium polish.

Core product pillars:

- Trainer operations: session logging, client management, scheduling, workout planning, post-session recap.
- Swan Coach: AI command center that should help Sean act faster, not just chat.
- PLAUD workflow: hands-free field notes that come home, upload, parse, merge, and wait for Sean approval.
- User dashboard: social, reels, profile, progress, gamification, badges, challenges, and daily actions.
- Client dashboard: proof-of-value for paid clients through workouts, progress, goals, measurements, and history.
- Storefront and checkout: revenue path for packages and sessions.
- Gamification: badges, levels, streaks, progression, future avatar/pet/home systems tied to real user behavior.
- Theme system: every visible component must respond cleanly to the header theme changer.

---

## Files To Inspect If Repo Access Exists

Start with these compact references before reading runtime files:

- `CLAUDE.md`
- `AGENTS.md`
- `ACTIVE-INDEX.md`
- `docs/ai-workflow/references/SWAN-ORACLE-GPT-PRO.md`
- `docs/ai-workflow/references/SWANSTUDIOS-SITE-TRANSFORMATION-PROMPT.md`
- `docs/ai-workflow/references/SWANSTUDIOS-DASHBOARD-VISION-BRIEF.md`
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`
- `docs/ai-workflow/references/SWAN-COACH-V1-SPEC.md`
- `docs/ai-workflow/references/PLAUD-AUDIO-INTELLIGENCE.md`
- `docs/ai-workflow/references/GAMIFICATION-SYSTEM.md`
- `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-SYSTEM-STATUS-2026-05-13.md`
- `docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WIRING-AUDIT-2026-05-12.md`

Then inspect the live surfaces relevant to your findings:

- `frontend/src/routes/main-routes.tsx`
- `frontend/src/components/UserDashboard/`
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
- `frontend/src/components/DashBoard/Pages/coach-assistant/`
- `frontend/src/components/PlaudClipMerge/`
- `frontend/src/hooks/useDashboardQueries.ts`
- `backend/routes/social/`
- `backend/routes/equipmentProfileRoutes.mjs`
- `backend/routes/coachCommandRoutes.mjs`
- `backend/models/social/`

---

## Known Review Questions

1. Is the current dashboard direction coherent, or are home/feed/reels/progress/community/profile still mismatched?
2. Which widgets are still mock, stale, or not meaningfully connected to backend data?
3. Which user-dashboard features should be wired before adding more visual polish?
4. How should Reels, Quick Post, active challenge, live activity, stories, trending, badges, and next-best-action work as one system?
5. What data should Swan Coach consume and produce inside the dashboards?
6. How should PLAUD ingestion appear in the Coach Command Center so Sean does the least manual work possible while retaining approval control?
7. Which gamification features should ship now versus later avatar/pet/home world-building?
8. What UI layout principles should govern the dashboard tabs across mobile, desktop, 1440p, 4K, and ultrawide?
9. Which backend contracts or schema-drift risks should be checked before implementing the next slice?
10. What is the highest-value next slice that improves real business operations, not just appearance?

---

## Response Handling Requirement

When the Oracle responds, Codex or Claude must classify every recommendation:

| Oracle finding | Classification | Evidence | Action |
|---|---|---|---|
| [finding] | ADOPT / REJECT / DEFER / NEEDS PROBE | [file:line, test, route, model, or reason] | [next step] |

Do not implement directly from the Oracle response until this classification is complete.
