# SwanStudios What's Next Product Plan - 2026-05-09

**Status:** Active planning handoff for the next product-depth session.
**Use next:** Tuesday continuation session.
**Primary goal:** Turn the now-stable production UI surfaces into a teach-first, client-ready, globally scalable training platform.
**Do not use for:** PLAUD side-project work, Swan Coach public-app expansion, or broad rewrites without a canonical surface receipt.

---

## Current Verified Production State

Final production QA passed on `https://sswanstudios.com` with deployed bundle `index.BB5GZsNE.js`.

Verified surfaces:
- `/user-dashboard`
- `/dashboard/admin/marketing`
- `/dashboard/admin/content`
- `/dashboard/admin/gamification`

Verified viewport matrix:
- `390px`
- `414px`
- `768px`
- `1440px`
- `1920px`

New standing rule for future QA:
- Also verify `2560x1440` for Sean's 1440p/QHD monitor class.
- Also verify `3840x2160` for 4K monitor class.
- Do not treat `1440px` browser width as "1440p"; 1440p means `2560x1440`.

---

## What Is Now Accomplished

### User Dashboard

The member-facing dashboard is now a stable production surface. The profile header spacing issue is fixed, and the left/right profile rail cards clear the cover banner on tested responsive widths.

Currently usable:
- Profile/header area.
- Home, Feed, Progress, Community, and Profile navigation.
- Log Workout entry point.
- Progress updates.
- Community support areas.
- Creative Gallery and Photo Gallery.
- Upload Video and Upload Photo actions.

Missing or next:
- Better first-time user teaching for every tab, button, and workflow.
- Stronger real user stats and profile editing.
- Clearer next-workout and workout-history experience.
- More useful activity feed and notification behavior.
- Better logic if the teaching walkthrough exposes confusing or redundant flows.

### Marketing

Marketing is now a focused command center for distribution, leads, and campaign operations instead of a mixed content-production surface.

Currently usable:
- Daily Marketing Loop overview.
- Approval Queue with social post generator.
- Content Calendar with channel filters.
- Lead Pipeline.
- Social Media Hub / Analytics.
- Responsive layout and touch targets pass production QA.
- Social publishing no longer throws production 502s when Postiz is not configured.

Missing or next:
- Configure and verify Postiz or final social-publishing integration.
- Persist real calendar items instead of relying on static/demo items.
- Pull real social history and analytics once accounts are connected.
- Add lead follow-up actions, reminders, and CRM workflow depth.
- Decide whether blog/email/video creation tools belong only in Content Studio or also need Marketing distribution wrappers.

### Content Studio

Content Studio is now clearly the creation workspace, separate from Marketing distribution.

Currently usable:
- Creator Mode frame.
- Video Library.
- Coverage Tracker.
- Badge Assets.
- Blog Drafts.
- Seedance and voice surfaces stay hidden until configured.

Missing or next:
- Configure and unlock Seedance/voice workflows when ready.
- Add asset approval/status states.
- Add stronger handoff from created assets into Marketing approval/calendar.
- Improve media storage, versioning, naming, and reuse.
- Teach the creator workflow step by step.

### Gamification

Gamification is now organized around a reward economy/admin frame.

Currently usable:
- Reward Economy Charter.
- Six health categories: Completion, Consistency, Mastery, Recovery, Contribution, Education.
- Responsive production layout is stable.

Missing or next:
- Admin controls for reward tuning.
- Rule editing for XP, badges, streaks, achievements, and recovery/education rewards.
- Audit trail for economy changes.
- User-facing previews of reward changes.
- Analytics showing whether rewards drive desired behavior.

---

## Highest Priority Product Gaps

### P0 - Client Onboarding And Account Readiness

The next product-depth work should start with the client journey. The app must make it easy for clients to:
- Get onboarded correctly.
- Have the right account and role.
- Log in without confusion.
- See their current next workout.
- See their past workout history.
- Have their information captured accurately.
- Understand what to click next without Sean personally explaining it.

### P0 - Stripe Store, Cart, And Session Purchase Readiness

The store/cart/checkout path must be audited and repaired so users can buy sessions reliably.

Next-session instructions:
- Locate the Stripe/storepage planning doc Sean referenced.
- If the exact `stripe storepage.md` file is not present, search current docs for store/cart/session package planning and use the closest source, including:
  - `docs/UNIFIED-DASHBOARD-CONSOLIDATION-BLUEPRINT.md`
  - `docs/CUSTOM-PACKAGE-DEVELOPER-GUIDE.md`
  - `docs/CUSTOM-PACKAGE-USER-GUIDE.md`
  - `docs/CREDITS-PURCHASE-TAX-COMMISSION-SYSTEM.md`
- Audit cart add/remove, checkout, Stripe session creation, successful purchase return, and session-credit/account update flow.
- Identify anything that must be updated manually in Stripe versus code.

### P0 - PLAUD Intake Audio Playback

PLAUD Intake needs uploaded audio playback. If Sean uploads an audio file, he must be able to play it back in-app before deciding how to process or correct the intake.

Acceptance target:
- Uploaded audio files render a playback control.
- Playback works for supported audio formats.
- The UI clearly shows filename, status, and whether the file is playable.
- Unsupported file types fail clearly without breaking the intake flow.

### P1 - Teach-First Guided Product System

Every major role needs a first-time user teaching system:
- Client
- Trainer
- Admin
- General user/member

Teaching is not just tooltips. It must show users how to use every important tab, button, and workflow effectively. During this teaching pass, the AI must also audit the product logic. If a flow is too hard to teach, redundant, or confusing, that is evidence the UI or logic needs to be simplified and recoded.

Priority admin tabs for later slices:
- Bootcamp Creator
- PLAUD Intake
- Workouts
- Coach Assistant dashboards
- Pain Charts
- Equipment

### P1 - Multinational Product Readiness

The long-term target is a world-usable training platform. Future planning must account for:
- Accessibility and clear language.
- International time zones.
- Currency/tax/payment assumptions.
- Privacy and role isolation.
- Mobile-first usage.
- Desktop pro workflows on 1440p and 4K monitors.
- Low-friction onboarding for non-technical users.

---

## Enterprise Mission Prompt For Next Session

Use this prompt to start the next AI session:

```text
We are continuing SwanStudios production product-depth work in the SS-PT repo.

Read AGENTS.md, CLAUDE.md, ACTIVE-INDEX.md, ACTIVE-PRIORITIES.md, and docs/ai-workflow/AI-HANDOFF/SWANSTUDIOS-WHATS-NEXT-PRODUCT-PLAN-2026-05-09.md first.

Mission:
Create a 7-star enterprise-level product plan for turning SwanStudios into a teach-first, client-ready, globally scalable personal training SaaS. The app already has stable production UI surfaces for User Dashboard, Marketing, Content Studio, and Gamification. Now we need product depth, onboarding clarity, role-based teaching, Stripe/session-purchase reliability, PLAUD Intake audio playback, and client/trainer/admin workflow completion.

Hard rules:
- Do not work on unrelated PLAUD side-project work or public Swan Coach expansion unless it is directly part of the SwanStudios production dashboard workflow named here.
- Do not code first. Start with canonical surface receipts and route ownership for every live surface you plan to touch.
- Use styled-components and existing Swan theme tokens.
- Keep files under 300 lines.
- Preserve mobile-first design, but desktop QA must include 390, 414, 768, 1440, 1920, 2560x1440, and 3840x2160.
- If the teaching walkthrough reveals that a UI flow is hard to explain, propose the better workflow and plan the UI/logic recode.
- No speculative success language. Every claim must include evidence.

Planning objectives:
1. Map the current live role surfaces for client, trainer, admin, and general user.
2. Identify what is already wired versus demo/static/unwired in:
   - client onboarding and login/account readiness
   - current and past workouts
   - Stripe store/cart/session purchase flow
   - PLAUD Intake upload and audio playback
   - Bootcamp Creator
   - Workouts tab
   - Coach Assistant dashboards
   - Pain Charts
   - Equipment
   - User Dashboard
   - Marketing
   - Content Studio
   - Gamification
3. Produce a prioritized implementation roadmap with P0/P1/P2 slices, acceptance criteria, tests, and production QA requirements.
4. Design the first-time user teaching system for client, trainer, admin, and user/member roles.
5. For the first build slice only, recommend the smallest high-impact implementation target.

Expected output:
- Plain-English Summary first.
- Technical Summary second.
- A gap table: Surface / Current capability / Missing capability / Evidence path / Priority.
- A first-build recommendation with why it comes first.
- A testing and production QA matrix including true 1440p and 4K monitor-class checks.
```

---

## Recommended First Build Slice

Start with PLAUD Intake audio playback or client onboarding/workout visibility.

Rationale:
- PLAUD Intake playback is a clear, contained functional gap with direct operational value for Sean.
- Client onboarding/workout visibility is the highest business-critical path for real clients using their own accounts.

Do not start with broad Gamification or Marketing feature expansion until the client/session purchase/onboarding foundation is reliable.
