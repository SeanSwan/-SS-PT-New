# SwanStudios Benevolent Algorithm + Dashboard Route Decision

**Status:** Architecture decision record for Unity Weaver / Swan Aura.  
**Date:** 2026-07-01  
**Branch:** `aura-social-current`

## Decision

SwanStudios will keep the **User Dashboard** and **Client Dashboard** as distinct first-class product surfaces.

- **User Dashboard** = universal social media, creator, and community home for every member, including paid clients.
- **Client Dashboard** = paid personal-training operations hub for clients working with SwanStudios trainers.
- **Trainer Dashboard** = trainer operations, client management, programming, session notes, and coaching workflows.
- **Admin Dashboard** = business control, moderation, user/client/trainer oversight, configuration, and analytics.

We will not collapse the client dashboard into the user dashboard. Instead, we will build a seamless route bridge and shared visual language between:

- `Social Home` — community, posts, reels, challenges, badges, creator identity.
- `Training Home` — workouts, schedule, progress, session logs, body map, trainer messages, onboarding, and nutrition.

## Why

### Product clarity

General users need a social/community dashboard. Paid clients need a serious private training command center. Combining them would overload the social dashboard and confuse non-client users.

### RBAC and privacy

The client dashboard can contain training records, progress logs, health-adjacent notes, goals, trainer feedback, PLAUD-derived notes, and session data. The user dashboard is a broader social surface. Keeping them separate reduces accidental exposure and improves permission clarity.

### Monetization

The user dashboard should create interest, identity, community, and social proof. The client dashboard should convert interest into paid training value and prove that sessions are working.

## Benevolent algorithm principle

SwanStudios explicitly rejects engagement-at-any-cost ranking.

The platform algorithm should not maximize outrage, doomscrolling, or addictive toxicity. It should maximize:

- healthy action
- consistent training
- positive social connection
- trainer/client conversion
- honest progress sharing
- community safety
- diverse participation
- creative expression
- user trust
- long-term retention

## Swan Value Rank direction

```ts
swanValueScore =
  0.22 * healthProgressRelevance +
  0.18 * relationshipStrength +
  0.16 * prosocialEnergy +
  0.14 * goalAlignment +
  0.10 * noveltyAndFreshness +
  0.08 * creatorOriginality +
  0.07 * businessMomentum +
  0.05 * accessibilityFit
  - safetyPenalty
  - spamPenalty
  - fatiguePenalty;
```

This is a governing product formula for future ranking, nudges, challenges, rewards, and feed design. It is not a final machine-learning model.

## Algorithm layers to build

1. **Dashboard Next Best Action** — choose the highest-value next action: complete onboarding, log workout, join challenge, book next session, invite friend, encourage teammate.
2. **Swan Aura Nudge Rank** — choose benevolent prompts from streak risk, active challenge, badge state, latest post engagement, and kindness opportunities.
3. **Feed Rank** — boost honest progress, encouragement, trainer education, creative originality, challenge participation, and welcoming behavior.
4. **Challenge Match** — match users to challenges based on goals, age group, ability level, accessibility needs, injury flags, and preferences.
5. **Revenue Timing** — present offers when helpful: session package after consistency, trainer check-in after plateau, partner class after referral.
6. **Safety / Unity Filter** — demote or hold risky content, route borderline decisions to human review, and avoid silent censorship.

## AI persona separation

### Swan Coach

Private or role-scoped training assistant: workout planning, session logging, progress explanation, nutrition guidance, and command execution with confirmation.

### Unity Weaver

Internal community intelligence and moderation/bridge-building system: content review, positive signal detection, fairness auditing, and moderation queue recommendations.

### Swan Aura

User-facing dashboard persona powered by Unity Weaver principles: positive nudges, kindness prompts, streak rescue, community-good quests, and transparent non-punitive guidance.

## Implementation sequence

1. Swan Aura read-only panel.
2. Reusable nudge hook and deterministic registry.
3. Prosocial gamification events and anti-abuse rules.
4. Compose-time good-energy review.
5. Unity Weaver draft-review endpoint.
6. Social feed integration.
7. Admin moderation queue.
8. Swan Coach bridge for public/social content review only.

## Hostile review checklist for every slice

1. Does this create fake data or fake social proof?
2. Does this blur User Dashboard vs Client Dashboard responsibilities?
3. Does this introduce hidden moderation without trust safeguards?
4. Does this mutate social posts, gamification, or training records without confirmation?
5. Does this violate RBAC or expose private client data?
6. Does this create point-farming or referral-abuse risk?
7. Does this weaken mobile usability or 44px touch targets?
8. Does this create hardcoded visual islands instead of theme-token alignment?
9. Does this make Swan Coach responsible for community moderation?
10. Does this increase toxic engagement instead of benevolent engagement?

## Brand position

Plain-language message:

> SwanStudios is built to reward healthy action, honest progress, kindness, creativity, and community support — not outrage, doomscrolling, or toxic engagement.
