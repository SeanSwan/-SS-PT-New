# Swan Aura Slice 1-3 Hostile Review Record

**Date:** 2026-07-01  
**Branch:** `aura-social-current`  
**Scope:** User Dashboard social/community Swan Aura panel, reusable deterministic nudge hook, and prosocial event registry.

## Slice summary

Implemented the first safe Unity Weaver / Swan Aura dashboard presence:

- Read-only Swan Aura panel on the User Dashboard Home surface.
- Deterministic nudge logic based on existing dashboard state.
- Reusable `useSwanAuraNudges` hook for future dashboard surfaces.
- Read-only `SwanAuraProsocialEvents.ts` registry for future good-energy gamification.
- Architecture record for keeping User Dashboard and Client Dashboard distinct.
- Architecture record for a benevolent ranking philosophy.

## Non-negotiable boundaries preserved

- No backend writes.
- No moderation actions.
- No AI provider calls.
- No social post mutation.
- No gamification mutation.
- No changes to Swan Coach command execution.
- No changes to private client training records.

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

**Fix applied in this slice:** Swan Aura remains read-only and motivational. No review, scanning, write, hide, block, or AI-provider behavior was introduced.

### Finding 5 — Prosocial XP could be farmed if wired naïvely

**Severity:** High before backend wiring  
**Risk:** Rewarding encouragement, gratitude, welcomes, reports, or de-escalation without limits would invite spam, fake kindness, self-rewards, report abuse, and point farming.

**Fix applied:** `SwanAuraProsocialEvents.ts` defines each event with base XP, daily limits, cooldown windows, recipient requirements, validation requirements, and anti-abuse notes. Safety-sensitive events such as confirmed reports and de-escalation assistance require human or trusted-system validation before any future XP award.

### Finding 6 — Frontend event registry must not become the backend source of truth

**Severity:** Medium  
**Risk:** A frontend-only registry could drift from backend enforcement if future slices wire rewards directly from UI constants.

**Required follow-up fix before XP wiring:** Backend must own the authoritative event validation, rate limits, and award rules. The frontend registry is only a product/UX contract for now.

## Current gate status

| Gate | Status |
|---|---|
| Branch starts from current main | PASS |
| No backend writes | PASS |
| No AI provider calls | PASS |
| No social post mutation | PASS |
| No gamification mutation | PASS |
| No Swan Coach behavior change | PASS |
| User/Client dashboard separation clarified | PASS |
| Component decomposition | PASS |
| Prosocial event anti-abuse rules defined | PASS |
| Backend reward execution intentionally absent | PASS |
| Automated frontend build | NOT VERIFIED in connector |
| Automated backend tests | NOT VERIFIED in connector |

## Required verification before merge/deploy

Run locally or in CI:

```bash
cd frontend && npm run build
cd backend && npm test
```

Manual smoke targets:

1. `/user-dashboard` renders.
2. Swan Aura panel appears on Home support panels.
3. CTA buttons route to workout logging, challenges, and friends.
4. No Swan Coach behavior changes.
5. No network calls originate from Swan Aura.
6. Mobile width retains readable text and 44px CTA.
7. No XP is awarded by the prosocial registry yet.

## Verdict

Slices 1-3 are acceptable to proceed after build/test verification. Do not deploy to Render until automated verification passes.
