# SwanStudios Execution Roadmap
> Compact operating roadmap for turning SwanStudios into a stable, premium, revenue-driving platform.
> Use when: deciding what to build next, preventing feature scatter, or prioritizing site-wide upgrades.

---

## North Star

SwanStudios must become three things at once:
- a professional, trustworthy site that converts visitors into signups
- an AI-native fitness operations platform powered by Swan Coach
- a long-range retention world powered by progression, avatars, pets, homes, streaks, and community

The order matters:
1. trust and functionality
2. monetization and onboarding
3. Swan Coach depth
4. retention and identity
5. world-scale polish and expansion

If the order is reversed, the product gets scattered and expensive before it earns the right to grow.

---

## Core Business Goal

Short-term business goal:
- get the site stable enough that people trust it
- get the value proposition clear enough that people want to join
- get the premium path compelling enough that paid conversion can happen

Primary revenue engine:
- paid memberships
- personal training and coaching
- recurring retention through Swan Coach and platform value

Primary public promise:
- this is not just a PT site
- this is a premium fitness growth platform with a real AI coach, real tools, real guidance, and real progression

---

## Non-Negotiables

Before new feature sprawl:
- core public funnel cannot feel broken
- core mobile views must work at `375px` and `414px`
- no visible mock/demo junk on important surfaces
- no obvious console-breaking or 404/500 behavior in core paths
- Swan Coach must feel helpful and real, not ornamental

Do not add major new layers if:
- homepage value is unclear
- signup path is weak
- onboarding is confusing
- core dashboards still feel unstable
- current premium features are not merchandised clearly

---

## Swan Coach Target State

Swan Coach should become the system-wide intelligence layer, not just a chat box.

It should eventually combine:
- page awareness
- user role awareness
- selected client awareness
- Hermes memory
- Karpathy Wiki knowledge
- PLAUD transcript and recap workflows
- site navigation help
- action routing into scheduling, workouts, nutrition, progress, and support flows

In practice, Swan Coach should be able to:
- explain what a user can do on the current screen
- guide onboarding and next steps
- help trainers log and review sessions faster
- help clients understand plans, nutrition, progress, and recovery
- hand off to the right dashboard tools instead of making users hunt
- improve as models and infrastructure improve without breaking the UI contract

---

## Dictation-First Rule

The operating model should be:
- dictation first
- guided confirmation second
- forms as fallback

This applies especially to:
- trainer session logging
- client onboarding intake
- workout creation and edits
- nutrition logging
- scheduling and recap workflows
- admin or builder commands when safe and authorized

The ideal experience is:
1. user speaks naturally
2. Swan Coach parses intent, entities, and action type
3. Swan Coach shows a structured confirmation
4. user approves or corrects
5. the system executes the action
6. forms remain available only when voice is unavailable, unclear, or undesirable

The product should not force users through dense manual forms when the same job can be completed safely by voice.

---

## Dictation Architecture

To reach the "just talk and it happens" level, Swan Coach needs five layers:

1. **Capture layer**
   - PLAUD, phone mic, browser mic, or uploaded audio
2. **Transcription layer**
   - reliable transcript with timestamps and confidence
3. **Intent layer**
   - classify whether the user is asking to navigate, query, create, update, delete, summarize, or build
4. **Action layer**
   - call the correct site tool, CRUD flow, or agent workflow
5. **Confirmation and safety layer**
   - confirm high-risk actions before execution
   - show what changed
   - fall back cleanly when confidence is low

This is how Swan Coach becomes an actual operator, not just a conversational wrapper.

---

## Execution Order

### Phase 0: Stop the bleeding
- fix visible production errors in revenue-critical and onboarding-critical paths
- remove obvious trust killers: broken buttons, dead routes, fake data, mobile squeeze
- define a single issue queue and work it down in order

### Phase 1: Conversion funnel first
- homepage
- offer clarity
- pricing or membership path
- signup
- onboarding
- first-use success moment

Success condition:
- a new visitor can understand the offer, sign up, and reach a clean first-use state without confusion

### Phase 2: Swan Coach operating core
- Coach Assistant positioning and UX
- site-wide usefulness
- trainer/client/admin contextual behavior
- Hermes + Wiki integration boundaries
- dictation-first command routing
- action-oriented help, not generic chat

Success condition:
- Swan Coach feels like a real differentiator and a reason to stay

### Phase 3: Trainer workflow leverage
- PLAUD import
- transcript parsing
- session log confirmation
- recap delivery
- progress review surfaces
- nutrition and planning support
- dictation-first CRUD and workflow execution where safe

Success condition:
- trainers save time, clients get better follow-up, and the workflow feels premium

### Phase 4: Retention and identity
- streak systems
- meaningful rewards
- avatar progression
- companion pets
- avatar home
- ghost mode
- async competition

Success condition:
- the platform gives users a reason to come back beyond utility alone

### Phase 5: Growth and authority engine
- SEO
- content studio
- YouTube support
- blog and publishing engine
- analytics and conversion loops

Success condition:
- the platform attracts new users consistently instead of relying only on direct outreach

### Phase 6: Premium polish and expansion
- design system harmonization
- dashboard-by-dashboard redesign
- motion and performance refinement
- deeper gamification world-building
- future Sims-like layers only after the platform earns them

---

## Missing Gaps To Watch

These are the usual gaps that slow the whole business down:
- unclear public-facing positioning
- weak premium offer packaging
- no single activation metric for Swan Coach
- too many features with no priority scoreboard
- lack of funnel analytics on homepage to signup to activation to paid
- not enough trust signals: proof, testimonials, outcomes, before/after, trainer authority
- missing content-to-conversion loop from YouTube and SEO into signup
- Coach Assistant not yet fully acting as a universal guide across the site
- retention systems not yet tied tightly enough to real behavior

---

## Product Rules To Prevent Scatter

For every new idea, ask:
1. Does this improve conversion?
2. Does this improve onboarding?
3. Does this improve Swan Coach usefulness?
4. Does this improve trainer time savings?
5. Does this improve retention?
6. Can it ship without destabilizing the platform?

If the answer is no to most of these, defer it.

Use this build order:
- stabilize
- convert
- activate
- retain
- scale

Not:
- imagine
- expand
- patch
- backfill

---

## Operating Rhythm

Run work in narrow passes:
- one primary surface at a time
- one success definition per pass
- one hostile review after each pass

Recommended sequence:
1. fix the current surface
2. verify mobile and real caller path
3. improve design and conversion quality
4. connect Swan Coach opportunity if natural
5. move to the next surface

---

## Immediate Priority Recommendation

If the goal is to get the site professional enough that people want to sign up, do this next:

1. Public funnel audit and upgrade
   - homepage
   - primary CTA path
   - memberships or pricing
   - signup
   - onboarding
2. Swan Coach audit and upgrade
   - define exactly what it should do on public and logged-in surfaces
   - make it feel useful, premium, and system-aware
   - make dictation the primary control path for high-friction operational tasks
3. Trainer workflow hardening
   - PLAUD to log to recap
4. Then deeper retention
   - progression, pets, homes, identity loops

This is the cleanest path to revenue without losing the bigger vision.
