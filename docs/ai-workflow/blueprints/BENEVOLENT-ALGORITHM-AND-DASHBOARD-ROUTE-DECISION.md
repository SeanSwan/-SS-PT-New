# SwanStudios Benevolent Algorithm + Dashboard Route Decision

**Status:** Architecture decision record for the Unity Weaver / Swan Aura implementation track  
**Date:** 2026-07-01  
**Branch:** `swan-aura-slice1`

---

## 1. Decision

SwanStudios will keep **User Dashboard** and **Client Dashboard** as two distinct first-class product surfaces.

- **User Dashboard** = universal social media / creator / community home for every member, including clients.
- **Client Dashboard** = paid personal-training operations hub for clients who work with SwanStudios trainers.
- **Trainer Dashboard** = trainer operations, client management, programming, session notes, and coaching workflows.
- **Admin Dashboard** = business control, moderation, user/client/trainer oversight, configuration, and analytics.

We will not collapse the client dashboard into the user dashboard. Instead, we will create a seamless route bridge and shared visual system so users can move naturally between:

- `Social Home` — community, posts, reels, challenges, badges, creator identity.
- `Training Home` — workouts, schedule, progress, session logs, body map, trainer messages, onboarding, nutrition.

---

## 2. Why this decision is correct

### Product clarity

Clients need a serious paid-service command center. General users need a social/community dashboard. Combining them would overload the social dashboard with private training workflows and confuse non-client users.

### RBAC and privacy

The client dashboard may contain training records, progress logs, health-adjacent notes, goals, trainer feedback, PLAUD-derived notes, and session data. The user dashboard is a broader social surface. Keeping them separate reduces accidental exposure and improves permission clarity.

### Monetization

The user dashboard should create interest, identity, community, and social proof. The client dashboard should convert interest into paid training value and prove that sessions are working.

### UX continuity

The dashboards should share Crystalline Swan styling, gamification identity, and common header/navigation affordances, but their jobs are different.

---

## 3. Benevolent algorithm principle

SwanStudios should explicitly reject engagement-at-any-cost ranking.

The platform algorithm should not be designed to maximize outrage, doomscrolling, or addictive toxicity. It should maximize:

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

This is the **Swan Value Rank** direction.

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

This is not a final ML model. It is the governing product formula for future ranking, nudges, challenges, rewards, and feed design.

---

## 4. Algorithm layers to build

### 4.1 Dashboard Next Best Action

Determines the highest-value next action for a user.

Examples:

- complete onboarding
- log workout
- join challenge
- book next session
- message coach
- review progress
- invite a friend
- encourage a teammate

### 4.2 Swan Aura Nudge Rank

Determines which benevolent prompt to show in the user dashboard.

Signals:

- streak risk
- level progress
- active challenge
- latest post engagement
- badge history
- social inactivity
- kindness opportunity

### 4.3 Feed Rank

Ranks social/community content based on healthy relevance and positive social value.

Boost:

- honest progress
- encouragement
- trainer education
- creative originality
- challenge participation
- community welcome behavior
- safe transformation stories

Demote:

- ragebait
- spam
- harassment risk
- repeated negativity
- misinformation risk
- engagement bait
- copied/low-originality content

### 4.4 Challenge Match

Matches users to challenges based on:

- onboarding goals
- age group
- current fitness level
- accessibility needs
- injury flags
- workout history
- preferred training style
- social group participation

### 4.5 Revenue Timing

Shows business-positive offers when they are helpful, not exploitative.

Examples:

- after a streak starts: suggest a starter session package
- after a plateau: suggest a trainer check-in
- after progress proof: suggest next-level programming
- after friend referral: suggest partner session/class
- after challenge completion: suggest paid progression plan

### 4.6 Safety / Unity Filter

Unity Weaver evaluates content risk while avoiding overreach.

Safety penalties include:

- hate speech risk
- harassment risk
- threat risk
- spam risk
- report history risk
- misinformation risk
- repeated boundary violation risk

Borderline cases should go to human review, not automatic punishment.

---

## 5. AI persona separation

### Swan Coach

Private or role-scoped training assistant.

- workout planning
- session logging
- progress explanation
- nutrition guidance
- command execution with confirmation
- client/trainer/admin workflows

### Unity Weaver

Internal community intelligence and moderation/bridge-building system.

- content review
- positive signal detection
- social climate analysis
- fairness/bias audit support
- moderation queue recommendations

### Swan Aura

User-facing dashboard persona powered by Unity Weaver principles.

- positive nudges
- kindness prompts
- streak rescue
- social encouragement
- community-good quests
- transparent, non-punitive guidance

---

## 6. Implementation sequence

### Slice 1 — Swan Aura read-only panel

Safe motivational panel. No backend writes, no AI provider calls, no moderation actions.

### Slice 2 — Reusable nudge hook and registry

Move nudge selection into a reusable deterministic system.

### Slice 3 — Prosocial gamification events

Define positive social actions and anti-abuse rules.

### Slice 4 — Compose-time good-energy review

Private pre-post guidance before a user publishes.

### Slice 5 — Unity Weaver draft-review endpoint

Backend review service for social posts/comments.

### Slice 6 — Social feed integration

Connect review results to Quick Post and comments.

### Slice 7 — Admin moderation queue

Human-in-the-loop review, appeals, and audit logs.

### Slice 8 — Swan Coach bridge

Swan Coach may call Unity Weaver only for public/social content review. Swan Coach remains the training assistant.

---

## 7. Hostile review rules for every slice

Every slice must pass hostile review before the next slice begins.

Questions:

1. Does this create fake data or fake social proof?
2. Does this blur user dashboard vs client dashboard responsibilities?
3. Does this introduce hidden moderation without user trust safeguards?
4. Does this mutate social posts, gamification, or training records without confirmation?
5. Does this violate RBAC or expose private client data?
6. Does this create point-farming or referral-abuse risk?
7. Does this make the UI harder on mobile or below 44px touch targets?
8. Does this rely on hardcoded visual islands instead of theme tokens?
9. Does this make Swan Coach responsible for community moderation?
10. Does this increase engagement in a toxic way instead of a benevolent way?

If any answer is unsafe, recursively fix before moving forward.

---

## 8. Brand position

SwanStudios should tell users it uses a benevolent algorithmic philosophy.

Plain-language message:

> SwanStudios is built to reward healthy action, honest progress, kindness, creativity, and community support — not outrage, doomscrolling, or toxic engagement.

This is a product differentiator and a moral stance.
