# SwanStudios Broad Redesign / Polish Backlog - 2026-06-01

**Purpose:** Park the broad redesign churn separately from the current production-fix lane so Sean can say "pick up the broad polish backlog" later and the next AI has a concrete scope.

**Use when:** Sean wants to resume visual/UX polish after the live workflow fixes are deployed and tested.

**Do not use for:** Emergency production bugs, auth/API/data-truth fixes, or session billing correctness. Those stay in the recursive slice lane first.

---

## Current Priority Boundary

The active production lane is still workout/progress-first:

1. Pick or onboard a client.
2. Dictate or manually log the workout.
3. Save the workout diary entry.
4. Generate truthful progress charts and exercise history.
5. Surface what changed, what is stale, and what needs action.
6. Make meaningful progress shareable to the community.

Broad polish should improve that loop. It should not bury it under decorative UI.

---

## Recently Moved Out Of Broad Polish

These items are no longer broad-redesign backlog items because they were handled in the production-fix lane:

- Client Hub full-page workout logging now returns completed logs to the selected client's Training > History view.
- Coach Command Center Client Hub return links reject unsafe return-path characters before rendering a back action.
- Workout Planner opened from Client Hub now offers a success-banner `Return to Client Hub` action after safe successful saves/activations.
- Client Hub Plan Next now returns to Training > Plans, where the selected client's saved plans load from `/api/workout/plans?clientId=...`.
- Clients & Team selected-client Coach commands now keep the selected client authoritative through backend execution instead of trusting stale classifier/clientRef output.
- Universal Master Schedule now blocks future-day sessions from opening the workout logger before the session day while preserving same-day gym-floor logging.
- Universal Master Schedule confirmation states now focus the modal on the active decision instead of showing unrelated Mark Complete / Cancel / Log Workout actions while cancel/no-show confirmations are open.
- Coach command malformed selected-client IDs now fail closed on the backend route, and the frontend preserves the route's validation message instead of masking it as a generic chat fallback.
- Swan Coach selected-client backend execution is now hardened across the stale-param bug family:
  - dispatcher slices now prefer `ctx.resolvedClient.id` over stale `params.clientId` for goal/nutrition, measurement/pain, client update/credentials, progress reads, legacy workout reads, legacy onboarding, and legacy client-admin commands.
  - The stale pattern scan across `backend/services/ai` now returns no matches for `params.clientId ?? ctx.resolvedClient?.id` or `params.clientId || ctx.resolvedClient?.id`.
  - Latest pushed Coach selected-client commits: `6ae3d9d53`, `9dfa1f260`, `f63797716`, `b721d1eba`, `2a273ce85`, `61499600b`, `9dbc7b4d1`.

Keep the remaining polish focused on visual hierarchy, mobile ergonomics, and workflow clarity around those now-wired routes.

---

## Backlog Buckets

### 1. Dashboard Information Architecture

- User dashboard should feel like a daily return destination, not only a profile shell.
- Client dashboard should group around journey state: Today, Progress, Plan, History, Recovery/Pain, Community/share.
- Trainer dashboard should group around operational flow: Today, Clients, Log, Review, Plan, Follow-up.
- Admin dashboard should emphasize proof-of-value: who trained, what improved, who is stale, who needs intervention, payments/session risk, and coach actions.
- Reduce duplicate tools that feel like separate apps: Coach Command Center, Clients & Team, Workout Logger, Workout Planner, Bootcamp Builder.

### 2. Client Hub / Training Flow Polish

- Client card should become an at-a-glance command object: source, paid/free status, session balance, last workout, next session, risk/stale status, quick log, quick progress, quick schedule.
- Clients & Team should make "select client -> log workout -> view charts/history" obvious in one or two clicks.
- Training > Plans is now wired as a saved-plan receipt; future polish can improve plan-card hierarchy, active-plan actions, and mobile density without changing the canonical API boundary.
- Dictation and manual form should be equal citizens: voice-first for speed, manual-first for corrections.
- Teach Mode should explain the active surface in plain steps without becoming a documentation dump.
- Any surface too complex for Teach Mode is a candidate for IA simplification.

### 3. Workout Logger / Builder Consolidation

- Workout Logger is the daily execution surface.
- Workout Planner/Builder is the forward-plan authoring surface.
- Shared components should exist for exercise search, exercise cards, NASM phase context, recommendations, and equipment profile selection.
- Avoid two competing "exercise Rolodex" experiences unless each has a distinct job.
- Keep cancel confirmation, PDF export, summary generation, AI command events, and schedule-linked session deduction wired to the canonical logger.

### 3A. Route / Workflow Hygiene Boundary

- Canonical `/api/sessions` is mounted to `backend/routes/sessions.mjs`.
- The older `backend/routes/sessionRoutes.mjs` still exists behind the later `/api` compatibility router in `backend/routes/api.mjs`.
- Do not treat legacy route retirement as visual polish. If Sean asks to clean this up, run a separate route-migration slice with mount-order evidence, endpoint inventory, compatibility tests, and Sean approval before deleting or archiving anything.
- Until that migration exists, broad UI work should use the canonical route receipts already proven for the live surface and avoid touching legacy route files for cosmetic reasons.

### 4. Bootcamp / Group Class Builder

- Support at least three boards: main intensity, joint-friendly alternative, second joint-friendly or low-impact alternative.
- AI generation should use equipment profile, class length, intensity, group size, low-impact constraints, and trainer notes.
- Joint-friendly means low-impact and modification-aware, not random alternatives.
- Hybrid/manual mode must allow adding exercises from the Rolodex without dead controls.
- Board output should be printable/shareable and reusable as a preset.

### 5. Theme Synchronization

- Schedule, Nutrition, Store/Revenue, Bootcamp, Workout Builder, Client Hub, Trainer Dashboard, Client Dashboard, and User Dashboard should consume the same theme tokens.
- No standalone bright-gradient islands unless they intentionally map to the active theme.
- Default visual posture remains dark-first Crystalline Swan.
- Theme QA should include desktop, 1440p/QHD, 4K, tablet, and mobile.

### 6. User Dashboard Media / Header System

- Treat the current banner/collage/carousel work as a separate creative polish lane.
- Preserve the functional options already explored: single image, fit/crop/stretch/tile, collage, carousel variants, sticky mini carousel, presets, and video support.
- Future polish should remove dead space, make media flush and responsive, preserve full image visibility when requested, and keep profile/tier/feed content below the banner.
- Do not let media controls overlap tier/badge/profile content.

### 7. Feed / Social Creation Flow

- Simplify post creation around the primary Swan loops: workout share, transformation, achievement, challenge, and general community post.
- AI can infer secondary labels such as art, gaming, music, comedy, dance, and singing from text/media.
- Hashtags should be encouraged and made visible because hashtag feeds exist.
- Do not cover media with duplicate badges; place achievement/post-type identity in the text/action area.
- Achievement icons need tap/click details explaining what was earned and why.

### 8. Analytics / Progress Presentation

- Build a mega exercise-history board inspired by game stat pages: most-performed movements, least-performed movements, PRs, volume, consistency, and trends.
- Victory charts only for new chart work.
- Charts must read from real workout logs and session records, not mock progress data.
- Every chart needs a "what this means" and "what to do next" path without wordy UI.

### 9. Mobile-First Daily Use

- The trainer/admin mobile path should support real gym-floor use: open phone, select client, log sets, save, show progress.
- Keep touch targets at 44px minimum.
- Avoid dense desktop-only tables for daily workflows.
- Responsive QA must include 390, 414, 768, 1440, 1920, 2560x1440, and 3840x2160 where visual changes are substantial.

### 10. Later Creative / World-Building Ideas

- Premium achievement theater, milestone reels, stronger XP/streak presentation, creator-style progress diaries, and future "world" concepts belong after the core workout/session/business loop is stable.
- Do not let later gamification work obscure the trainer-led personal training product.

### 11. Backend / Command-Lane Technical Debt To Keep Separate

- `backend/services/ai/commandDispatcher.mjs` remains a large legacy dispatcher file. Do not mix broad UI polish with extraction work.
- If Sean asks to clean it up, run a dedicated extraction slice:
  - start with command registry and dispatcher ownership evidence.
  - move one cohesive command family at a time into `backend/services/ai/dispatchers/`.
  - preserve existing tests, add focused contract tests, and run backend full test before push.
- Do not treat extraction as visual redesign; it is production hardening and maintainability work.

---

## How To Resume

When Sean says to resume broad polish, start with this prompt:

> Resume `SWANSTUDIOS-BROAD-REDESIGN-POLISH-BACKLOG-2026-06-01.md`. Pick one narrow visible surface, produce a Canonical Surface Receipt, run the Swan design strategy gate, write failing tests or visual QA criteria first, implement surgically, run hostile review, verify responsive behavior, then update this backlog with what moved from planned to done.

---

## Current Non-Goals

- Do not redesign the entire app in one pass.
- Do not replace working API routes just to clean up UI.
- Do not add new visual systems that bypass Crystalline Swan theme tokens.
- Do not delete dormant or legacy files without the repo hygiene protocol and Sean approval.
