# Brainstorm: Social-Hub Embedded Swan Coach (Workstream D2)

**Date:** 2026-06-11  ·  **Status:** complete  ·  **For:** /social Coach experience (follows D1 entry-point ship `92783adec`)

## Vision-Pillar Backlog (Phase 2 extension — Sean asked "what else"; pending his prioritization, NOT in D2a scope)
1. **Branded progress-proof share cards** — milestone shares render as Crystalline-branded cards (mini chart, streak, PR), exportable to IG stories. Revenue/marketing flywheel. *(Claude's top pick #1)*
2. **Trainer celebrate loop** — trainer one-tap 🎉 on client milestone posts; coach-acknowledged wins = retention; puts trainers inside community (B2B2C wedge).
3. **Streak-rescue social accountability** — opt-in "tell my friends I'm going for day 7" when a streak is at risk; Party HP / RPG tie-in; caring boundaries. *(Claude's top pick #2)*
4. **Rival matching from real data** — challenge matcher also surfaces level-matched athletes for ghost-race challenges (Virtual Olympics tie-in).
5. **Local events lane** — Coach surfaces nearby community events incl. golf clinics (highest-value lead segment) in the dock.
6. **Milestone → testimonial pipeline** — admin one-tap "request permission to feature" on big client milestones; consent-clean marketing from real results.

## Summary
Deciding how Swan Coach lives INSIDE the social hub (/social): embedded chat drawer vs social-scoped companion vs navigation-only vs proactive feed cards — and which user-scope actions it surfaces there (log workout, find events/challenges, share milestone).

## Context going in
- D1 shipped 2026-06-11: "Ask Swan Coach" quick actions (desktop sidebar + mobile button) navigate AWAY to `/dashboard/<role>/coach-assistant`.
- SocialPage.V3 tabs: feed, reels, friends, challenges, notifications. GlassSidebar + mobile tab bar.
- Master prompt D: user-scope commands = log own workout, view own progress, find events/challenges, share milestone. Visitor guide mode is a separate sub-slice.
- Related vision doc: `swanstudios-whole-app-vision-regrill-2026-06-10.md`.

## Key Decisions
- Coach on /social = **social-scoped companion**, NOT a second full chat surface — social jobs only (share milestone, find challenge/event, nudge friend, quick-log), deeper asks hand off to the full Coach page via the D1 path. Avoids a rule-27 competing surface.

## Q&A Log
### Q1: What is Swan Coach's JOB on the social hub?
- **Recommended:** Social-scoped companion — keeps social social, every action drives the community loop, no competing chat surface.
- **Sean's answer:** Social-scoped companion (accepted recommendation).
- **Implication:** Closes the "full embedded chat" branch entirely. Opens: what FORM the companion takes, which actions it surfaces, and the handoff contract to the full Coach page.

### Q2: What form does the companion take?
- **Recommended:** Bottom-sheet dock — collapsed Coach strip (greeting + 3-4 action chips), bottom-pinned on mobile / sidebar card on desktop; actions run inline with confirm + receipt. Mirrors the user-dashboard SwanCoachDock pattern.
- **Sean's answer:** Bottom-sheet dock (accepted recommendation).
- **Implication:** Reuse/extend the SwanCoachDock visual language rather than invent a new component class. Closes drawer/FAB/inline branches. Opens: which actions the chips expose, tab behavior (which tabs show it), tier gating, and inline-execution vs deep-link per action.

### Q3: Which actions in the v1 dock?
- **Recommended:** Share milestone + Find challenge/event + Quick-log workout (nudge-a-friend as fast-follow).
- **Sean's answer:** ALL FOUR — share milestone, find challenge/event, quick-log workout, AND nudge/cheer a friend.
- **Implication:** v1 dock = 4 chips. Nudge-a-friend needs friend-activity data wired (flag: verify what the friends/social API already exposes for "slipping friend" / "friend milestone" signals before promising the smart version — fallback is a simple "cheer a friend" picker). Quick-log inline-vs-deeplink still open.

### Q4: Chip execution depth in v1?
- **Recommended:** Hybrid by action — share-milestone fully inline (Coach drafts from real logged data → confirm → posts), find-challenge inline matches + one-tap join, quick-log and nudge deep-link to existing surfaces.
- **Sean's answer:** Hybrid by action (accepted recommendation).
- **Implication:** v1 build = dock shell + 2 inline flows (share, find-challenge) + 2 deep-links. Share-milestone inline is the signature moment and must pull from REAL workout/gamification data (data-truth rule — no mock milestones). Remaining branches: tab visibility, tier gating, and dismissal behavior.

### Q5: Where does the dock appear?
- **Recommended:** Feed tab only — collapsed strip above mobile tab bar / top of desktop sidebar; reels stays immersive; D1 button covers other tabs.
- **Sean's answer:** Feed tab only (accepted).
- **Implication:** No reels/challenges overlay work; dock renders inside the feed tab branch of SocialPage.V3's renderContent.

### Q6: Tier gating?
- **Recommended:** Free gets the working dock, capped — share/find/nudge are community-flywheel actions you want free users doing; heavy Coach AI stays behind existing chat-lane caps.
- **Sean's answer:** Free gets it, capped (accepted).
- **Implication:** DIVERGES from the user-dashboard SwanCoachDock (which teases/locks free users). Document the intentional difference so it isn't "fixed" as an inconsistency later. Existing aiRateLimiter/tier caps stay the enforcement layer.

## Key Highlights
- Social dock ≠ second Coach chat surface — it's a 4-chip companion (share milestone, find challenge, quick-log, nudge friend) with hybrid depth: share + find-challenge inline, quick-log + nudge deep-link in v1.
- Share-milestone inline is the signature moment and MUST draft from real logged data (no mock milestones).
- Free users get the dock (community flywheel) — intentional divergence from dashboard dock gating.

## Build Plan Sketch (feeds rule-15 recursive plan, next session)
1. D2a: dock shell on feed tab (collapsed strip, 4 chips, reduced-motion, 320px-checked) + deep-link wiring for quick-log + nudge.
2. D2b: find-challenge inline (existing challenges API → 1-2 matches → join).
3. D2c: share-milestone inline (real gamification/workout data → Coach-drafted post → confirm → feed post). Needs canonical receipt on the share/post API.
4. Fast-follow: smart nudge (friend-activity signals — verify API exposure first).

## Architecture Notes (parent / children / whole)
- **Parent surface:** `frontend/src/pages/Social/SocialPage.V3.tsx` (852+ lines, mounted at main-routes.tsx:743/753 via `/social[/:tab]`)
- **Children:** SocialFeed, VerticalReels, FriendsList, ChallengesView, SocialNotificationsPanel, GamificationCard, GlassSidebar
- **Canonical Coach surface:** SwanCoachAssistantPage (trainer/client) — D1 routes there; any embedded experience must not become a competing surface (rule 27)

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)
1. **Milestone-detection service is the real asset.** Share-milestone needs a "what's shareable right now" resolver (streak hit, PR, level-up) from real data. Build it as a shared service, not dock-internal — workstream C (proactive briefings/nudges) needs the identical signal. One service, two consumers.
2. **Dock chips should be state-aware, not static.** If the user has a fresh unshared PR, the share chip should lead with it ("Share your squat PR 🎉"); if they haven't logged today, quick-log leads. Same pattern as B1a's role-aware chips, one level smarter. Cheap to add once the milestone resolver exists.
3. **D1 button stays, retargeted on feed.** On the feed tab, the sidebar "Ask Swan Coach" can open/expand the dock instead of navigating away (saves the full page transition); on other tabs it keeps navigating. Click math: share a milestone today = nav to dashboard Coach → type request → confirm ≈ 5+ taps; with dock = tap chip → confirm ≈ 2 taps.
4. **Anti-spam guard on shares.** Coach-drafted posts could flood the feed if milestones fire liberally — cap Coach-suggested shares (e.g. 1/day surfaced) and always require explicit confirm. Protects feed quality (no dopamine dark patterns, content-cadence spirit).
5. **Rule-27 note for the builder:** the dock reuses the Coach command/send rails but renders its own receipts — classify it as a companion consumer of the canonical lane, never a fork of the chat surface.

## Minimal-Click Opportunities
- Share milestone: ~5+ taps (navigate → type → confirm) → **2 taps** (chip → confirm) via inline share.
- Join challenge: browse challenges tab → find → join (3-4 taps) → **2 taps** (chip shows match → join).
- Log workout from social: currently navigate to logger (2 taps to arrive) → unchanged in v1 (deep-link), candidate for inline voice quick-log in v2.

## Open Flags
- [ ] Verify friends/social API exposes "friend slipping / friend milestone" signals before promising smart nudge (fallback: simple cheer picker).
- [ ] Canonical Surface Receipt needed on the feed post/share API before D2c builds the inline share.
- [ ] SSE spike still pending (separate track): Sean flips SWAN_STREAM_SPIKE_ENABLED + runs c:/tmp/sse-spike-probe.ps1.
