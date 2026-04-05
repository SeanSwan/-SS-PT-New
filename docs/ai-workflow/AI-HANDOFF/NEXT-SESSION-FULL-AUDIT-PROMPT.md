# SwanStudios Full Platform Audit — Next Session Prompt
## Copy everything below this line into a new Claude session

---

Run a comprehensive Playwright QA audit of the ENTIRE SwanStudios app at 
sswanstudios.com. Test at breakpoints: 375px, 768px, 1440px, 1920px.
For every page: screenshot, console errors, click every interactive element.
Nothing left untested.

## CONTEXT

SwanStudios is a health-first community operating system on Render 
(Professional plan, ~$60/month). Stack: React 18 + TypeScript + 
styled-components (frontend), Node.js + Express + Sequelize + PostgreSQL 
(backend). Theme: Enchanted Apex — Crystalline Swan (dark-first).

Previous session (2026-04-05) completed:
- Full QA smoke test (12 sections, 30 screenshots)
- Coach Assistant "Client #2" bug FIXED (backend/routes/aiChatRoutes.mjs:283)
- Homepage + About page vision refactor DEPLOYED (new mission, trainer, 
  promise sections, updated hero/CTA/stats)
- NASM references corrected (workshop-trained, not certified)
- FDA wellness disclaimer added to footer
- AI Village 14-brain validated the vision (13/16 pass, all consensus)

## SECTIONS TO AUDIT

### ADMIN DASHBOARD (login as admin)
1. Coach Assistant — verify "Client #2" bug fixed (send msg with no client 
   selected), test all 10 context tabs, conversation history, Teach Mode
2. Dashboard Overview — widgets, visitor intelligence, map
3. Clients & Team — client cards (were NOT clickable last session), 
   New Client, AI Coach buttons
4. Workouts — Rolodex filters (883 exercises), AI Generate, workout builder, 
   save plan, Teach Mode toggle
5. Bootcamp Creator — AI Generate, Manual, Hybrid, Board 1 + Board 2 
   accordion (trim fix verified), delete exercise, PDF, Floor Mode
6. Equipment — locations, add items
7. Scheduling — Month/Week/Day/Agenda, create session, click session → 
   SessionDetailModal (attendance/feedback/cancel endpoints verified)
8. Gamification — 5 tabs (Achievements, Rewards, System Settings, Analytics, 
   RPG Features)
9. Store & Revenue — products, orders
10. Content Studio — all sections
11. Analytics — charts (must be Victory, NOT Recharts)
12. System — settings, users
13. Canada Immigration — all tabs

### CLIENT DASHBOARD
1. Overview — KPI cards, action buttons
2. My Workouts — list, detail
3. My Progress — Victory charts
4. Pain & Injury Chart — body map
5. Nutrition Intelligence
6. AI Privacy & Consent
7. Book My Session
8. Community & Challenges — social feed, factions, events, leaderboard
9. Messages
10. My Profile & Settings
11. My Rewards — XP, badges, claim button

### HOMEPAGE (newly refactored — verify all)
1. Hero: "Health First. Community Always."
2. NEW: "Why We Built This" mission section
3. NEW: "Trainers: This Platform Is Yours" (4 cards)
4. The Arsenal (8 cards)
5. Training Programs (3 tiers)
6. Golf Performance
7. About Sean (26 years, NASM-protocol not NASM-certified)
8. Testimonials
9. Stats (26+ years)
10. Beyond the Gym (8 cards incl YouTube-Style Video)
11. Final CTA: "Ready to Be Part of Something Real?"
12. Footer: FDA disclaimer present

### ABOUT PAGE (newly refactored)
1. Founder quote ("I'm not building this to get rich...")
2. Bio (26 years, self-taught dev paragraph)
3. Certs (NCEP, NASM Workshop, Gold's, LA Fitness, 24Hr)
4. NEW: "The SwanStudios Promise" (3 cards)
5. Stats (26+), Timeline (2018=self-taught)
6. Philosophy: "Collective Power" pillar

### STORE, GALLERY, VIDEO LIBRARY, WAIVER, CONTACT, SIGNUP
- Test every page, form, and interaction

### ONBOARDING
- /claim/test-code (invalid code error)
- Password change flow

## KNOWN ISSUES TO VERIFY

1. Admin Dashboard 70% empty space (needs redesign)
2. /api/oracle/news "canceled" error
3. Client cards NOT clickable (no detail navigation)
4. 3840px: content doesn't scale
5. "By the Numbers" counters show 0 (scroll trigger?)
6. Workout Plans API returns 501
7. Mock data in MyClientsView (Math.random)
8. Trainer Dashboard dead buttons ("Phase 3" placeholders)
9. No password change endpoint/UI

## OUTPUT FORMAT

For each section: screenshot + console errors + broken elements.
Final deliverable: prioritized master bug list (CRITICAL/HIGH/MEDIUM/LOW).

## KEY FILES
- Audit: docs/ai-workflow/blueprints/COMPREHENSIVE-APP-AUDIT-2026-04-04.md
- Vision: docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md
- AI Village: AI-Village-Documentation/validation-prompts/latest/summary.md
- QA screenshots: qa-screenshots-2026-04-04/
