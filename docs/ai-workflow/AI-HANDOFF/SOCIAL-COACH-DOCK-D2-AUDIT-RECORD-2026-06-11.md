# Phase Audit Record — Social-Hub Coach Dock (Workstream D2: D2a + D2b + D2c)

## 1. Phase header
- **Phase:** Workstream D2 — Swan Coach embedded companion dock on `/social` (follows D1 entry-point ship `92783adec`)
- **Scope:** D2a dock shell + deep-links → D2b find-challenge inline → D2c share-milestone inline. Defined by grill-me brainstorm `docs/ai-workflow/brainstorms/social-hub-embedded-coach-d2-2026-06-11.md` (6 Q&A decisions, Sean-ratified).
- **Dates:** 2026-06-11 (single session, three commits)
- **Reviewed by:** Fable 5 (builder + rule-61 hostile pass per slice). **Codex relay unavailable all session — rule-46 gap recorded in each commit message for post-hoc review.** Gemini not consulted (visual direction pre-locked by grill-me Q2 to mirror the approved dashboard SwanCoachDock).
- **Verdict:** SHIPPED (3 commits on `main`, Render auto-deploy)

## 2. Files involved
**New runtime (frontend/src/components/Social/CoachDock/):**
- `SocialCoachDock.tsx` (~140 lines) — collapsed strip: avatar + greeting + 4 chips; one `openPanel` state ('share'|'finder'|null)
- `SocialCoachDock.styles.ts` (~180) — C12 glass shell, tri-color accent bar, 44px Ice Wing chips
- `InlineChallengeFinder.tsx` (~150) — D2b: 1-2 active unjoined challenge matches, one-tap join, honest receipt
- `InlineChallengeFinder.styles.ts` (~175) — match rows, join pill, gold receipt, retry line
- `InlineMilestoneShare.tsx` (~160) — D2c: Coach-drafted read-only preview → confirm → POST → receipt
- `InlineMilestoneShare.styles.ts` (~130) — draft card, purple share pill (Dual-Button Glow), cancel
- `milestoneResolver.ts` (~85) — pure shareable-milestone resolver (streak > level > points); reusable by workstream C

**New tests (same dir):** `SocialCoachDock.test.tsx` (14), `InlineChallengeFinder.test.tsx` (7), `InlineMilestoneShare.test.tsx` (10)

**Modified:**
- `frontend/src/pages/Social/SocialPage.V3.tsx` — dock mounted once in renderContent feed branch
- `frontend/src/hooks/social/useSocialFeed.ts` — +10 lines: `'swan:social-post-created'` listener → `fetchPosts(true)` (ref-stabilized)
- `frontend/src/components/Social/Challenges/ChallengesView.tsx` — one-line `export` of `CATEGORY_COLORS`

**Commits:** `c56bcf1c9` (D2a) → `d2124153d` (D2b) → `15f2f6a41` (D2c)

## 3. Architecture & runtime flow
```
/social (main-routes.tsx:743/753) → SocialPage.V3 renderContent case 'feed'
  → <SocialCoachDock/> above <SocialFeed/>
     chips: [Share a milestone ▼] [Find a challenge ▼] [Log a workout →] [Cheer a friend →]
       Log a workout  → navigate getLogWorkoutDashboardPath(role)   (final v1)
       Cheer a friend → navigate /social/friends                    (final v1; smart nudge = fast-follow)
       Find (D2b)     → lazy <InlineChallengeFinder/>
           useChallenges → GET /api/v1/gamification/challenges (+ user participations)
           matches = active ∧ ¬joined, participants-desc, top 2, selection locked in state
           Join → POST /api/v1/gamification/challenges/:id/join (authenticate+requireUser,
                  gamificationV1Routes.mjs:121) → hook refetch → joined:true ⇒ receipt
       Share (D2c)    → lazy <InlineMilestoneShare/>
           useGamificationData().profile (react-query, shared cache) → milestoneResolver
           draft preview (read-only) → confirm → POST /api/social/posts
           (core/routes.mjs:413 → routes/social/posts.mjs:678, protect; type='milestone',
            NO visibility field ⇒ backend role-aware default, posts.mjs:682)
           2xx ⇒ receipt + dispatch 'swan:social-post-created' ⇒ every useSocialFeed
           instance refetches ⇒ post visible in feed immediately
```
Panels are mutually exclusive and lazy-mounted: the feed pays zero extra API calls until a chip is expanded.

## 4. Security logic & posture
- **No new backend surface.** All three slices consume production-exercised lanes; authorization stays server-side (`protect` on posts, `authenticate+requireUser` on join). *Breaks if:* someone later adds a dock action that builds its own endpoint without a receipt — re-run rule 26 then.
- **No text input in the dock (rule 27).** Contract-tested (`<input|<textarea|onSubmit` forbidden in dock/panel sources). Blocks the dock drifting into an unmoderated second composer/chat surface. *Breaks if:* a future slice adds "edit draft" inline — route that to CreatePostCard instead.
- **Post content is self-derived, server-moderated.** Draft text is built client-side from the user's own gamification numbers only (no PII, no other users' data, rule 8 untouched — no LLM call anywhere in D2). Backend still applies moderationStatus and content validation. *Breaks if:* resolver ever interpolates free-form external strings into the draft.
- **Visibility is backend-defaulted.** The dock deliberately omits `visibility` so the server's role-aware default (friends/members, public/staff) stays the single source of policy. *Breaks if:* someone "helpfully" hardcodes `visibility=public` client-side.
- **Honest-receipt discipline.** Join and share receipts render only off server-confirmed state (refetched `joined:true` / 2xx). No optimistic success. Prevents fake progress proof — a trust feature, not just UX.
- **Read-only production-DB probe** (rule 58/59): enum check ran via script-internal env loading; no secret value ever echoed to chat or files.

## 5. Best practices applied
Rules 1/3/6 (styled-components, dark-first, tokens-with-fallbacks), 2 (44px), 4 (all files <300), 5/14 (blueprint headers), 7 (token pairings inherited from approved dock — not instrument-measured, see §6), 9, 13, 15 (gates per slice), 17/61 (hostile pass each slice), 18 (existing-pattern-first: useChallenges/useSocialFeed/useGamificationData consumed wholesale; icons verified in-repo), 20/54 (useSocialFeed sweep: consumer list enumerated via `grep -rln "useSocialFeed" src`, all consumer suites run), 26/28 (receipts in-thread per slice), 27 (companion classification explicit), 40 (design router receipts), 42 (both audits, every push), 51 (tags on enum claims), 56 (slice-vs-baseline disclosed), 58 (proactive drift check found a real production bug — §6/§10), 60/63/64 honored. OWASP A01: access control stays server-side.

## 6. Known limitations / non-goals
- **Smart nudge** (friend-activity signals) deliberately deferred — needs friends-API signal audit first; cheer chip deep-links to /social/friends.
- **PR/workout-record milestones** not in the resolver — workout-records API not yet audited; resolver covers streak/level/points only. Never faked.
- **No share-frequency cap** (brainstorm suggestion #4, 1/day) — explicit confirm is the only guard in v1; cap awaits Sean's verdict.
- **No celebration trigger / points toast** on dock share — receipt is the only feedback (CreatePostCard keeps the confetti).
- **Contrast not instrument-measured** — token pairs match the approved dashboard dock `[LIKELY ≥4.5:1]`.
- **No live-browser QA this session** — all verification is test/contract/probe level (see §8, §10).
- **Free-tier gets the dock by design** (Q6) — intentional divergence from the dashboard dock's teaser/lock; do NOT "fix" as inconsistency.

## 7. Performance & UX
- Click math delivered: share milestone ~5 taps → **2**; join challenge 3-4 → **2**; feed-load cost of the dock: **zero network calls** until a chip expands; gamification profile rides the existing react-query cache.
- Loading/empty/error/receipt states on both panels; 320/375/414px wrap rules; reduced-motion strips all transitions; no animation loops anywhere in the dock (pulse deliberately not reused).
- Event-driven feed refresh = post appears in place, no manual reload.

## 8. Test coverage
- 31 dock-dir tests (14 dock + 7 finder + 10 share/resolver) — behavior (chip→nav matrix, toggle/mutual-exclusion, join/share success+failure+empty) and source contracts (no-input rule 27, reduced-motion, feed-only mount, no tier gate).
- Regression each push: D1 suite 10/10, ChallengesView truth 1/1, all useSocialFeed consumer suites (7 feed files 16/16 + 4 dashboard/gallery files 25/25).
- `tsc --noEmit` 0 errors (baseline clean) and Fallow slice-clean per slice.
- **Not tested:** real-browser DOM, real network join/share against production, visual rendering.

## 9. Rollback plan
No flags, no migrations, no env vars. Frontend-only, three clean commits:
```
git revert 15f2f6a41          # D2c share inline (also removes useSocialFeed listener)
git revert d2124153d          # D2b finder inline (restores find chip deep-link)
git revert c56bcf1c9          # D2a dock entirely
git push origin main          # Render auto-deploys the revert
```
Each slice reverts independently in reverse order; reverting D2c alone returns the share chip to a broken no-op (it no longer deep-links), so revert D2c+D2b together or all three.

## 10. Future review hooks
1. **Fix the production enum drift NOW-ish:** `enum_SocialPosts_type` lacks `'singing'` and `'comedy'` (verified via read-only pg_enum query 2026-06-11) while the model, migration `20260309000001`, and the composer UI all offer them — **users posting those types get a 500 today.** Re-run the migration's ALTER TYPE statements manually (its try/catch swallowed the failure) and audit `enum_challenges_category` for the same gap.
2. Audit the friends API for slipping-friend / friend-milestone signals → upgrade cheer chip to smart nudge (fast-follow from the brainstorm).
3. When workstream C (proactive briefings) lands, consume `milestoneResolver` — if C builds its own resolver, that's drift; consolidate.
4. Ask Sean for verdicts on brainstorm Phase-2 suggestions #2 (state-aware chips), #3 (D1 sidebar button expands dock on feed), #4 (1/day share cap) — all designed-for but unbuilt.
5. Re-check the `'swan:social-post-created'` listener if useSocialFeed is ever migrated to react-query — the ref-stabilized listener pattern won't survive a rewrite untouched.
6. Run a real-browser QA pass (Brave/Playwright) on expand→join and expand→share against production data; this phase shipped on contract-level verification only.
7. Codex post-hoc review of all three commits (rule 46 gap — relay was unavailable the whole session).

## 11. AI review log
- Per-slice: Fable built → rule-61 hostile pass → fixes (D2a: test-regex; D2b: dead `require()` helper; D2c: stale-diagnostic false alarms verified by file read, contract-test assertion narrowed to code-usage). Codex unavailable (gap recorded); Gemini not engaged (direction pre-locked).

## 12. Sign-off
- Commits `c56bcf1c9`, `d2124153d`, `15f2f6a41` on `main`. Sean's post-deploy smoke pending (see closeouts). **Next action:** Sean smoke-tests the dock on production; highest-priority follow-up is hook #1 (singing/comedy enum fix).
