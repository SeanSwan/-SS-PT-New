# Swan Aura Slice 1-6 Hostile Review Record

**Date:** 2026-07-01  
**Branch:** `aura-social-current`  
**Scope:** User Dashboard Swan Aura panel, deterministic nudge hook, prosocial event registry, local Quick Post good-energy guidance, backend-owned prosocial XP awards, and frontend real-action XP wiring.

## Slice summary

Implemented the first safe Unity Weaver / Swan Aura dashboard and XP foundation:

- Read-only Swan Aura panel on the User Dashboard Home surface.
- Deterministic nudge logic based on existing dashboard state.
- Reusable `useSwanAuraNudges` hook for future dashboard surfaces.
- Read-only `SwanAuraProsocialEvents.ts` registry for future good-energy gamification.
- Local `SwanAuraComposeReview.ts` good-energy guidance for the public/social Quick Post composer.
- Backend `prosocialXPService.mjs` that can award approved, low-risk prosocial XP through the canonical `GamificationPointsService.recordLedgerEntry()` ledger path.
- Protected route mounted under `/api/social/unity-weaver` for event discovery and XP awards.
- Frontend `SwanAuraProsocialXP.client.ts` helper that calls the backend award path only after real post/comment/reaction actions succeed.
- `useSocialFeed.ts` now awards backend-validated Unity Weaver XP for real positive social actions: positive progress posts, supportive reactions, and supportive/grateful comments.
- Architecture record for keeping User Dashboard and Client Dashboard distinct.
- Architecture record for a benevolent ranking philosophy.

## Boundaries preserved

- No AI provider calls.
- No moderation hide/block/delete actions.
- No Swan Coach command execution changes.
- No private client training records touched.
- No arbitrary client metadata stored in point ledgers.
- No XP awards happen from frontend-only constants.
- Backend owns actual XP award validation.
- No XP is awarded for merely clicking Swan Aura CTAs.

## Hostile review findings and recursive fixes

### Finding 1 — Component size and maintainability

**Severity:** Medium  
**Risk:** A single monolithic component would slow future slices and violate the non-monolithic dashboard direction.

**Fix applied:** Split implementation into focused files:

- `SwanAuraPanel.tsx`
- `SwanAuraPanel.logic.ts`
- `SwanAuraPanel.styles.ts`
- `SwanAuraPanel.types.ts`
- `useSwanAuraNudges.ts`

### Finding 2 — Product boundary clarity

**Severity:** Medium  
**Risk:** The social User Dashboard could be confused with the private training Client Dashboard.

**Fix applied:** Added `BENEVOLENT-ALGORITHM-AND-DASHBOARD-ROUTE-DECISION.md`, explicitly defining:

- User Dashboard = social/community home for everyone.
- Client Dashboard = paid personal-training operations home.

### Finding 3 — Nudge logic reuse

**Severity:** Low  
**Risk:** Future surfaces would duplicate logic if the panel owned nudge selection directly.

**Fix applied:** Added `useSwanAuraNudges.ts` as a reusable deterministic selector.

### Finding 4 — Trust and safety boundary

**Severity:** High if violated  
**Risk:** Users may distrust a bot that silently moderates or scans before transparency and review paths exist.

**Fix applied:** Swan Aura remains motivational and transparent. No hide/block/delete moderation behavior was introduced.

### Finding 5 — Prosocial XP could be farmed if wired naïvely

**Severity:** High  
**Risk:** Rewarding encouragement, gratitude, welcomes, reports, or de-escalation without limits would invite spam, fake kindness, self-rewards, report abuse, and point farming.

**Fix applied:** Backend rules enforce daily limits, cooldown windows, recipient requirements, validation requirements, idempotency keys, and a low max award cap. Safety-sensitive events such as confirmed reports, mentor tips, and de-escalation assistance return `requires_validation` instead of awarding immediately.

### Finding 6 — Frontend event registry must not become backend source of truth

**Severity:** Medium  
**Risk:** A frontend-only registry could drift from backend enforcement if future slices wire rewards directly from UI constants.

**Fix applied:** Backend `prosocialXPService.mjs` now owns the authoritative event rules for XP awards. The frontend registry remains a UX/product contract only.

### Finding 7 — Compose guidance could become paternalistic

**Severity:** Medium  
**Risk:** If Swan Aura comments on every ordinary post, users may feel watched, judged, or interrupted.

**Fix applied:** `SwanAuraComposeReview.ts` returns `idle` for neutral drafts. It only renders guidance for clear supportive language, broad-brush language, insults, excessive caps, or repeated punctuation.

### Finding 8 — Compose helper must not be mistaken for moderation

**Severity:** High if unclear  
**Risk:** Users might think the draft helper blocks or scans private content.

**Fix applied:** The helper is local/deterministic, only runs on text already typed into the public/social Quick Post composer, does not block posting, does not call AI providers, and does not create records.

### Finding 9 — Prosocial ledger metadata could leak private text

**Severity:** High  
**Risk:** Accepting arbitrary client-supplied metadata for XP awards could store private text, screenshots, post drafts, health details, or other accidental PII in `PointTransaction.metadata`.

**Fix applied:** Removed arbitrary `clientMetadata` storage. Ledger metadata is limited to safe structured fields: event ID, event category, context type, short context ID, and target user ID.

### Finding 10 — Public endpoint should not grant safety-review XP without review

**Severity:** High  
**Risk:** Users could file false reports or manufacture conflict to farm safety badges/XP.

**Fix applied:** `safe_report_confirmed`, `deescalation_assist`, and `mentor_tip` require human or trusted-system validation and return HTTP 202 with `requires_validation`; they do not award points from the public self-service route.

### Finding 11 — Frontend wiring could award XP for button clicks instead of real actions

**Severity:** High  
**Risk:** If Swan Aura CTA clicks awarded XP directly, users could farm points without doing real community work.

**Fix applied:** `useSocialFeed.ts` calls Unity Weaver XP only after existing social API actions succeed: post creation, post reaction, and comment creation. CTA navigation remains non-awarding.

### Finding 12 — Duplicate toast noise from stacked social XP + Swan Aura XP

**Severity:** Medium  
**Risk:** Posts and comments already show social XP feedback. Adding a second Swan Aura toast for the same user action could feel spammy and undermine trust.

**Fix applied:** `awardProsocialXP()` supports `{ notify: false }`. Progress post and comment bonuses update the ledger/profile quietly. Reactions can still show a Swan Aura bonus because reactions previously had no visible success toast.

### Finding 13 — Daily limit query could be bypassed by unrelated social actions

**Severity:** High  
**Risk:** The first backend implementation fetched the latest 100 `social_engagement` rows and filtered in memory. Heavy unrelated activity could push older Unity Weaver event rows out of the sample, bypassing daily limits/cooldowns.

**Fix applied:** Replaced in-memory filtering with a direct SQL aggregate on `PointTransactions.metadata->>'unityWeaverEventId'`, returning exact daily count and latest event timestamp for the specific Unity Weaver event.

## Current gate status

| Gate | Status |
|---|---|
| Branch starts from current main | PASS |
| No AI provider calls | PASS |
| No hide/block/delete moderation action | PASS |
| No Swan Coach behavior change | PASS |
| User/Client dashboard separation clarified | PASS |
| Component decomposition | PASS |
| Backend owns XP validation | PASS |
| Self-reward blocked | PASS |
| Cooldowns/daily limits/idempotency present | PASS |
| Exact event-specific daily/cooldown query | PASS |
| Arbitrary metadata removed | PASS |
| Validation-only safety events do not award XP | PASS |
| Frontend awards only after real action success | PASS |
| No CTA-click XP farming | PASS |
| Toast noise reduced | PASS |
| Automated frontend build | NOT VERIFIED in connector |
| Automated backend tests | NOT VERIFIED in connector |

## Required verification before merge/deploy

Run locally or in CI:

```bash
cd frontend && npm run build
cd backend && npm test
```

Manual/API smoke targets:

1. `/user-dashboard` renders.
2. Swan Aura panel appears on Home support panels.
3. Quick Post still submits through the existing createPost path.
4. Neutral post drafts do not show noisy Swan Aura copy.
5. Tone-risk drafts show private, non-blocking guidance.
6. `GET /api/social/unity-weaver/prosocial-events` returns the event catalog for authenticated users.
7. `POST /api/social/unity-weaver/prosocial-events/award` rejects self-awards.
8. `POST /api/social/unity-weaver/prosocial-events/award` returns 202 for `safe_report_confirmed`, `deescalation_assist`, and `mentor_tip`.
9. Awarded low-risk events create a canonical `PointTransaction` with source `social_engagement` and update User points/level through `GamificationPointsService`.
10. Repeating the same event/context returns duplicate/cooldown/limit instead of awarding again.
11. Supportive comment on another user's post can trigger `encourage_friend` or `gratitude_given` after comment success.
12. Swan/heart reaction on another user's post can trigger `encourage_friend` after reaction success.
13. Workout/transformation/achievement/challenge post can trigger `positive_progress_post` after post success.
14. Commenting/reacting on your own post does not trigger Unity Weaver recipient-based XP.

## Verdict

Slices 1-6 are structurally acceptable to proceed after build/test verification. Do not deploy to Render until automated verification passes.
