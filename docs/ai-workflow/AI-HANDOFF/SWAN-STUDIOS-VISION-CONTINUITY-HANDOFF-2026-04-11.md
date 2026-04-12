# SWAN STUDIOS VISION CONTINUITY HANDOFF - 2026-04-11

## Purpose
Use this file to preserve the broader Swan Studios product vision so future chats do not recover only the code state and lose the business priorities, operating model, and sequencing logic behind the work.

## Read Order For Next Chat
1. `CLAUDE.md`
2. `docs/ai-workflow/AI-HANDOFF/SWAN-STUDIOS-VISION-CONTINUITY-HANDOFF-2026-04-11.md`
3. `docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md`
4. Only then read the exact implementation files needed for the active slice

## Core Product Vision

### Swan Coach is the product centerpiece
Swan Coach is not supposed to feel like a generic chatbot or a public AI terminal. It is the voice-first operating layer of Swan Studios.

It should:
- execute real actions
- be role-aware and context-aware
- require confirmation when the action has real operational impact
- stay privacy-safe and honest
- feel native to the business, not bolted on

### Slice-by-slice execution is the operating model
The correct build strategy is narrow, sequential, and reality-checked:

1. verify live route / service truth
2. ship one honest slice
3. verify the real caller path
4. move to the next adjacent slice

No giant rewrite. No speculative platform work. No fake completion.

## Revenue-Critical Business Workflow
The highest-priority workflow is the one that makes coaching visibly valuable to paying clients.

### Priority chain
1. Trainer logs workouts reliably
2. Clients can see those logged workouts clearly on their dashboard
3. Charts and KPIs reflect real workout / weight / measurement / schedule data
4. Weight is captured weekly
5. Measurements are captured on the intended cadence
6. Schedule data and coaching data feel connected
7. PLAUD voice transcripts can flow into Swan Coach for fast logging

### Why this comes first
This is the workflow tied most directly to:
- retention
- proof of service
- perceived value
- upsell confidence
- premium package justification

## Swan Coach Premium Positioning

### Commercial intent
Swan Coach is intended to help justify the top coaching tier, not to be a commodity chat surface.

### Current working package direction
1. Top tier package should receive the deepest Swan Coach capabilities
2. Mid-tier access should be narrower and still fair
3. Free or donation-tier access should be limited to a sensible subset
4. Feature gating should feel intentional and product-native, not arbitrary

### Product rule
Whenever a workflow becomes valuable enough to differentiate the premium tier, evaluate whether Swan Coach access to that workflow should also be tier-gated.

## Hermes Role
Hermes is the operational task spine around Swan Coach.

Use Hermes for:
- follow-up tasks
- structured operational reminders
- audit queues
- future orchestrated actions tied to coaching workflows

The long-term model is:
- Swan Coach for voice-first action
- Hermes for structured task execution and follow-through

## Integration Rule For All Future Site Work
When any part of the site is fixed, upgraded, or redesigned, also check whether Swan Coach needs to understand that domain.

For every meaningful workflow change, ask:
1. Can Swan Coach read this state?
2. Can Swan Coach write this state safely?
3. Does registry truth match route / service truth?
4. Does the action need confirmation?
5. Can the result be rendered honestly as flat card-safe data?
6. Should package gating apply?

This rule exists so Swan Coach stays in sync with the real product instead of lagging behind site improvements.

## Current Strategic Sequence

### Immediate
1. Finish and verify the next safe Swan Coach slice
2. Keep the command substrate honest and stable
3. Do not scatter into unrelated product areas before the current slice is settled

### After the current Swan Coach slice
1. Trainer workout logging -> client dashboard visibility audit
2. Workout / weight / measurement / schedule chart truth audit
3. PLAUD transcript ingestion path into Swan Coach logging
4. Premium gating and feature-tier alignment

### After the revenue-critical trainer workflow is solid
1. Client dashboard audit
2. User dashboard / social surfaces audit
3. Broader site-by-site operational audit

## Current Swan Coach Direction
The current command-lane history, verified slice status, blocked areas, and next command-slice logic live in:

`docs/ai-workflow/AI-HANDOFF/SWAN-COACH-CONTINUITY-HANDOFF-2026-04-11.md`

Use that file for the exact command-state picture.
Use this file for the broader product intent and priority ordering.

## Fallback Rule
If a future chat starts drifting into lower-value work, reset to this sequence:

1. finish the current safe Swan Coach slice
2. protect the trainer proof-of-value workflow
3. ensure clients can see the value on their dashboard
4. ensure charts tell the truth
5. ensure voice ingestion reduces trainer friction
6. only then move outward into broader product polish
