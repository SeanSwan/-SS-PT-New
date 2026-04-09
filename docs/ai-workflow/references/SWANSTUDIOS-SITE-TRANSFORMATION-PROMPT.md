# SwanStudios Site Transformation Prompt
> Reference doc for whole-platform modernization without losing production stability.
> Use when: auditing, redesigning, or upgrading any SwanStudios screen, flow, dashboard, or connected AI workflow.

---

## Purpose

This prompt is for transforming SwanStudios piece by piece into a premium, revenue-driving, AI-native platform without breaking production behavior.

It is not a generic redesign prompt.
It is anchored to Sean's actual mission:
- onboard clients fast
- log sessions with minimal friction
- turn Swan Coach into a true operational brain
- integrate Hermes + Karpathy Wiki + PLAUD into the real business
- grow SEO, content, and YouTube into client acquisition
- upgrade every tab, click path, and dashboard to enterprise-level quality
- turn gamification into a true identity and retention engine
- make money faster while building a location-independent business

---

## Vision Context

The target system is:
- **SwanStudios** as the live revenue platform
- **Swan Coach** as the high-trust trainer/client AI layer
- **Hermes** as the persistent operations, memory, and agent layer
- **Karpathy Wiki** as the compounding knowledge base
- **PLAUD + Audio Intelligence** as the hands-free session capture pipeline
- **Content + SEO + YouTube** as the organic marketing engine
- **Gamification + Avatar World** as the long-range identity, retention, and differentiation layer

SwanStudios is not just a PT SaaS.
It is moving toward a connected fitness platform where real actions drive:
- avatar progression
- companion pet growth
- avatar home upgrades
- streaks, ghost mode, and asynchronous competition
- long-range Sims-like identity and world-building loops
- social proof, retention, and premium differentiation

The transformation must preserve real business value:
- client onboarding
- workout logging
- session recap and follow-up
- nutrition and progress tracking
- social/community growth
- gamified identity and retention
- storefront/subscription monetization
- content publishing and discoverability

---

## Operating Rules

1. Work piece by piece. Do not redesign the whole platform in one pass.
2. Start from the real caller path, not isolated components.
3. Do not break backend contracts, auth, routing, data integrity, or monetization.
4. Treat design and correctness as one job, not separate jobs.
5. Use existing installed skills when relevant.
6. Block generic design. The output must feel premium, intentional, and brand-specific.
7. Report blockers first.
8. Distinguish:
   - local component fixes
   - real end-to-end runtime fixes
9. If the screen affects revenue or onboarding, treat it as high stakes.
10. Always preserve or improve:
   - mobile usability
   - accessibility
   - SEO/discoverability when relevant
   - production realism
11. Treat gamification as a product system, not decoration.
12. Tie rewards, avatars, pets, homes, streaks, and competition to real user behavior and real data, not shallow gimmicks.
13. Distinguish between:
   - revenue-critical now
   - retention-critical next
   - world-building / Sims-like phase-later
14. On operational surfaces, prefer dictation-first workflows with confirmation, and use forms as fallback.

---

## Recommended Order of Attack

Use this sequence unless a live production bug forces a different order.

### Phase 1: Revenue-critical flows
- homepage and landing flows
- store/shop and checkout
- onboarding flows
- booking and session flows
- trainer/client dashboard entry paths

### Phase 2: Swan Coach + trainer operations
- coach assistant surfaces
- workout logging
- nutrition flows
- progress/history flows
- Hermes-facing trainer workflows

### Phase 3: Audio and automation
- PLAUD transcript ingestion
- session recap pipeline
- workout auto-log confirmation UX
- consent, notification, and privacy flows

### Phase 4: Growth engine
- SEO surfaces
- content studio
- YouTube support workflows
- blog/social publishing flows
- analytics and conversion optimization

### Phase 5: Identity and retention layer
- avatar progression surfaces
- companion pet and avatar home flows
- streak, ghost mode, and social bragging loops
- Virtual Olympics / async competition concepts
- retention architecture tied to real workout, nutrition, recovery, and social data

### Phase 6: Full polish and consistency
- design system cleanup
- tab-by-tab/dashboard-by-dashboard harmonization
- performance and visual refinement
- dead-path removal and operational streamlining

---

## Master Prompt

Copy/paste this into Claude, Gemini, or another AI when you want a serious transformation pass:

```text
Read `CLAUDE.md` first.

Then act as a SwanStudios transformation architect, hostile reviewer, and premium product designer.

Your job is to help me transform SwanStudios piece by piece into a premium, revenue-driving, AI-native platform without breaking production behavior.

Core vision:
- SwanStudios is my real business and my path to location-independent income.
- The platform must help me onboard clients, log sessions, retain clients, sell offers, grow SEO, grow YouTube, and market effectively.
- Swan Coach should become a true operational AI layer connected to the dashboards, workflows, and databases that matter.
- Hermes is my persistent operations and memory layer.
- Karpathy Wiki is my compounding knowledge base.
- PLAUD is part of the hands-free session capture workflow.
- Gamification is part of the long-range moat: avatars, companion pets, avatar homes, streak systems, ghost mode, asynchronous competition, and eventually a Sims-like identity world.
- The gamification layer must deepen retention and differentiation, but it cannot be allowed to break the core revenue, onboarding, trainer, or client operations.
- Operational tasks should move toward dictation first, confirmation second, and forms only as fallback.
- The site is already live, so changes must be staged carefully and must not break auth, routing, monetization, data integrity, or client operations.

Transformation rules:
1. Work only on the exact files and flows I scope.
2. Start from the real caller path, not an isolated component.
3. Treat design, UX, correctness, and production realism as one job.
4. Use relevant installed skills when applicable.
5. Reject generic or template design.
6. Optimize for premium quality, operational clarity, revenue impact, and long-term retention.
7. Preserve backend contracts unless a change is explicitly planned and justified.
8. For UI work, verify mobile, accessibility, touch targets, and keyboard flow.
9. For stateful work, verify loading, success, empty, error, stale-state-after-failure, and refetch behavior.
10. If a relevant skill, sibling path, or caller path is skipped, say why.
11. When the surface touches retention, community, or progression, explicitly evaluate avatar / pet / home / streak / social-competition opportunities.
12. Do not force gamification onto the wrong surface; name what belongs now versus what belongs in a later phase.
13. For high-friction tasks, evaluate whether voice or dictation should be the primary UX.

When responding:
- findings and weaknesses first
- then the recommended transformation plan
- then the exact changes to make
- then verification steps
- then residual risks

Also do this:
- identify the weakest area in the scoped surface
- identify the highest revenue-impact improvement
- identify any Hermes / Swan Coach / PLAUD / Wiki / SEO / content / gamification opportunity that naturally connects to this surface
- distinguish between "fix now" and "phase later"

Do not give me a vague redesign.
Give me a concrete, production-aware transformation plan for the exact surface I provide.
```

---

## Per-Surface Task Prompt

Use this after the master prompt when scoping a specific tab, screen, or flow:

```text
Scope for this pass:
- Surface: [name the tab / page / dashboard / flow]
- Files in scope: [exact file paths]
- Real user path: [how a user reaches it]
- Priority: [revenue / onboarding / trainer ops / client retention / SEO / content / polish]

What I need from this pass:
1. Audit the current surface for correctness, UX, design quality, mobile behavior, accessibility, state integrity, and production risk.
2. Identify the top blockers and weak spots.
3. Reimagine the surface so it feels premium, clear, and on-brand without breaking backend behavior.
4. Identify any natural integration opportunities with:
   - Swan Coach
   - Hermes
   - Karpathy Wiki
   - PLAUD / Audio Intelligence
   - avatar / pet / home / streak / competition systems
   - SEO / content / YouTube
5. Separate:
   - must-fix now
   - should-improve next
   - future-phase opportunities
6. If implementation is requested, make the changes and verify them.

Output format:
- Findings first
- Transformation plan
- Implementation notes
- Verification
- Residual risks
```

---

## Hermes / Wiki / PLAUD / Gamification Alignment Checks

When the scoped surface is relevant, ask:

- Does this surface help client onboarding happen faster?
- Does this surface help session logging happen with less friction?
- Does this surface give Swan Coach useful context or action paths?
- Does this surface create structured knowledge that should feed Hermes or the Wiki?
- Does this surface support voice capture, recap, or post-session workflows?
- Does this surface contribute to discoverability, trust, conversion, or retention?
- Does this surface create meaningful progression, identity, or social motivation that should feed avatars, pets, homes, streaks, ghost mode, or future Sims-like systems?

If the answer is yes, the transformation plan should name the opportunity explicitly.

---

## First Practical Recommendation

If you are deciding what to do next in the real system:

1. Make Hermes day-to-day useful first:
   - Telegram gateway
   - env var cleanup
   - auto-start on boot
2. Then connect the trainer revenue workflow:
   - PLAUD import
   - transcript parsing
   - session log confirmation
   - recap delivery
3. Then tighten client onboarding:
   - intake
   - consent
   - movement / measurements
   - Swan Coach handoff
4. Then harden the retention layer:
   - streak visibility
   - meaningful rewards
   - avatar / pet / home progression tied to real behavior
   - async competition and ghost mode where it reinforces consistency
5. Then run the piece-by-piece UI transformation across the revenue-critical tabs and dashboards.

This order gives you operational leverage before cosmetic completeness.
