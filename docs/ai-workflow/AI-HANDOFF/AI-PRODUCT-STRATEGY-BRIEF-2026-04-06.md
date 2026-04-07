# AI and Product Strategy Brief

Date: 2026-04-06
Purpose: Isolate the strategic product and AI-system decisions from the pure bugfix work.
Parent brief: `docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md`

## Goal

Define how SwanStudios should evolve into a premium AI-native platform instead of a collection of partially overlapping tools.

## 1. Unify the AI experience

Current issue:

- multiple AI terminals feel inconsistent
- microphone behavior differs across surfaces
- read-aloud behavior differs across surfaces
- formatting/rendering quality differs across surfaces

Strategic direction:

- standardize all AI terminals around the best Coach Assistant experience
- use one shared voice/mic/read/copy/render system
- eliminate redundant top-bar actions if natural language already covers them
- ensure markdown and rich formatting render correctly everywhere

## 2. Clarify AI role in workflow automation

The intended product direction is:

- the coach should be able to talk naturally
- the AI should understand context from all relevant tabs
- the AI should be able to fill forms, plan workouts, manage calendar context, and assist with equipment and content workflows

This means the next product strategy pass should define:

- what the AI can act on directly
- what still requires confirmation
- what data sources the AI can read
- what CRUD actions the AI is allowed to perform

## 3. Teach Me as a first-class layer

Teach Me should not be incidental. It should be a platform-wide capability for:

- content studio
- marketing
- security
- assessments
- analytics
- any advanced workspace with domain-specific logic

The strategy pass should define:

- where Teach Me appears
- what depth it should provide
- whether it is inline, modal, or panel based

## 4. Consolidate duplicate tools

Current duplication concerns:

- Blog Writer appears in both Content Studio and Marketing
- social-post creation appears in more than one place
- multiple workout-planning surfaces overlap
- multiple AI interaction styles overlap

The product pass should decide:

- which module owns each capability
- which modules become sub-areas of Content Studio
- what should be removed from Marketing vs retained

## 5. Content Studio as the main operations hub

Content Studio likely needs to become the stronger central surface for:

- video management
- exercise coverage
- motion templates
- badge/icon generation
- blog creation
- social distribution
- voice studio
- calendar planning
- distribution settings

The product strategy should define the target IA for this workspace.

## 6. Real data vs mock data policy

Several areas still feel mock-driven or ambiguous.

The product pass should define:

- where mock data is still acceptable
- where it must be removed immediately
- how real-vs-mock labeling should work during development

## 7. Scheduling and planning intelligence

The long-term direction is bigger than simple booking.

Needed product decisions:

- Universal Master Schedule and admin planning calendars should align
- AI should understand client sessions, filming time, content planning, and operational scheduling
- admin-only planning items should remain permission-scoped

## 8. Equipment AI workflow

The intended product behavior is:

- take pictures first
- let Swan Coach identify equipment
- prefill fields
- save permanently
- allow CRUD afterward

Manual entry should remain as fallback, not as the primary workflow.

## 9. Membership and pricing strategy

The pricing/tier issue is not only a UI problem.

The product pass should decide:

- how tiers differ clearly
- what stays free
- what becomes premium
- how trials should work
- which trainer-led or AI-led capabilities justify paid upgrades

## 10. Gamification foundation

Current state feels shallow relative to the intended direction.

The long-term product vision includes:

- user avatar
- companion pet
- evolving home/base
- progression via posts, workouts, activity, and rewards
- badge-driven stat modifiers
- competitive virtual events

The strategy pass should separate:

- near-term foundation work
- medium-term progression systems
- long-term mini-game and competitive event systems

## 11. Role blending and dashboard philosophy

Admin, trainer, and client experiences need clearer rules.

The product pass should define:

- when admin can act “as trainer”
- when admin can inspect client tools
- what should stay distinct vs shared
- how overview widgets should differ by role

## Output Expected From an AI/Product Strategy Pass

1. Unified AI interaction model
2. Feature ownership map
3. Tool consolidation map
4. Teach Me system strategy
5. Real-data vs mock-data policy
6. Scheduling intelligence strategy
7. Membership differentiation strategy
8. Gamification foundation roadmap

