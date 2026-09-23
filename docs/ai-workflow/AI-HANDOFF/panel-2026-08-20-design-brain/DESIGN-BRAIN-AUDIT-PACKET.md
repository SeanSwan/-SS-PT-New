# HOSTILE REVIEW PACKET — Swan Design Brain Audit (2026-08-20)

## Your role

You are one seat on a five-model hostile review panel (GLM 5.3, Kimi K3, Grok 4.6, Tencent HY3, with Fable 5 as the final arbiter). You are reviewing an AUDIT DOCUMENT of the "Swan Design Brain" — the design-generation subsystem of SwanStudios, a production personal-training SaaS. The founder (Sean) is dissatisfied: despite extensive design doctrine, the system still produces what he calls "AI slop" — generic, template-looking, obviously-AI-generated pages. An auditor produced the report below. Sean wants it torn apart and upgraded.

## What Sean asked for (verbatim intent)

"Go hard on the hostile review so we can actually upgrade this: enhancements, the missing context, the missing gaps that this application is missing in this part of the app — and harden it, make it better in every way possible. Make it exactly what I envision it to be."

Sean's vision for the Design Brain, from his own transcripts (summarized in the audit): an artifact-first creative studio that asks a compact visual questionnaire, proposes distinct design directions, generates live artifacts, keeps conversation + preview together, supports annotation on specific sections, routes visual feedback back into a builder agent, studies high-quality references before designing, generates the real image/video material a composition needs BEFORE layout, and closes the loop: observe the real artifact → diagnose it visually → recommend better alternatives → revise → verify → remember what the user preferred. Target quality bar: cinematic depth, crystalline atmosphere, dense-but-not-cluttered information, useful animation, operational clarity, excellent from 375px phones through 4K/ultrawide.

## Your remit (do ALL of these)

1. **Attack the audit itself.** Where is it wrong, overconfident, under-evidenced, or misprioritized? Which of its recommendations would fail, backfire, or produce yet another artifact nobody consumes? Is its P0/P1 ordering right? Is anything in it the same disease it diagnoses (more doctrine, no enforcement)?
2. **Absence-first gap analysis.** What is MISSING from both the current system and the audit's proposed upgrade? Think: what does a world-class human design team have that neither the repo nor this plan provides? Rank gaps by value / money-left-on-the-table.
3. **Root-cause the "AI slop."** The audit gives its theory (no material pack, no rendered critique loop, open taste loop). Give YOURS. What actually makes LLM-generated pages look like AI slop, and which interventions have the highest leverage against each cause? Be mechanism-specific, not vibes.
4. **Concretize the upgrade.** For the top 5 highest-leverage changes, specify: what to build, its inputs/outputs, the acceptance test that proves it works (not "file exists" — behavior deltas), and how it fails if built naively.
5. **Judge the proposed architecture.** Shared creative kernel + domain packs (Swan product / general web / Learning Experience Studio for a family member's classroom use). Right split? Wrong split? What contract between kernel and pack? How should taste profiles be scoped so classroom preferences never contaminate the Swan brand profile, and vice versa?
6. **Judge the Visual Director design.** Keep/Fix/Elevate/Wildcard lanes, screenshots at 375/768/1440/2560/3840, safe-auto-apply flags, no single fake beauty score. What would you change, add, or delete? How do you make an LLM's visual critique actually reliable rather than confident-sounding prose?
7. **The acceptance benchmark.** The audit proposes a 12-brief blind benchmark with ≥70% blind human preference. Is that the right gate? What would you measure instead or in addition?
8. **Hardening.** Failure modes, cost controls, privacy (zero client PII to external models), determinism/reproducibility, drift between doctrine and runtime, and how to stop the system regressing into prose-only "doctrine" again.

Format: ranked findings, most severe first. Each finding: CLAIM → EVIDENCE/REASONING → CONCRETE FIX. Be adversarial, specific, and constructive. Do not summarize the audit back. Do not pad. If you agree with something, say so in one line and move on — spend your tokens where you disagree or where something is missing.

Known repo facts you may rely on (verified against origin/main): the Atelier session/rejection-ledger WRITER exists; no code consumer of the ledger exists; no taste.profile.json exists; an image "Forge" CLI exists (bracket generation, contact sheets, winners, lineage, cost tracking, human review answers); Playwright test infra exists (viewport sweeps, overflow checks, a11y, golden screenshots) but no visual-critique agent; the design doctrine corpus is large (Swan Cinematic Design System, archetype catalog, Atelier prompts, design-dialogue) and the canonical design doc itself admits several previously-claimed enforcement mechanisms were never built.

---

# THE AUDIT UNDER REVIEW

## Executive verdict

You are right to be dissatisfied.

The current Swan Design Brain is a strong visual constitution attached to a partially built design workshop. It is not yet an autonomous design brain. It knows many rules about what Swan should look like, and it contains several good prompts for ideation, comparison, and critique. But it does not reliably complete the essential loop:

observe the real artifact → diagnose it visually → recommend better alternatives → revise it → verify the revision → remember what you preferred

That missing loop is the main reason it can still produce ugly, obviously AI-generated sites despite having extensive doctrine and multiple MCP connections.

I audited the current main branch at commit 739471917888656151e817ae57b7b812115ca574. My blunt assessment:

- As a Swan brand rulebook: approximately 4.5/5
- As a reliable design process: approximately 2.5/5
- As a proactive, self-improving design brain: approximately 1.5–2/5

Those ratings are audit judgment, not instrumented repository metrics.

## What was originally intended

The founder's earlier transcripts describe something much larger than a skill file: an artifact-first creative studio that asks a compact visual questionnaire; proposes distinct design directions; lets the user select a design system or direction; generates a live artifact; keeps the conversation and preview together; lets the user annotate or comment on a particular section; routes that visual feedback back into a builder agent; preserves editable/exportable design files.

A second transcript added an important pre-design step: study high-quality references, extract the principles behind them, and generate the actual image/video material needed for the composition before expecting the model to produce a cinematic site.

The Swan Studios requirements were also much more specific than "make it pretty": cinematic depth, crystalline atmosphere, dense but not cluttered information, useful animation, operational clarity, and layouts that remain excellent from phones through 4K and ultrawide displays. First-screen usefulness rather than generic marketing-card sprawl.

That product does not fully exist today. Pieces of it exist, but not the closed system.

## Where the current brain is failing

### 1. The original "Design Brain" was explicitly a documentation package

The original Design Brain specification states its scope was a proposed documentation/design-brain package and that no implementation was included. Its purpose was to give agents a compact set of material to read before a UI slice. That is a constitution, a design-system handbook, a prompt library, an archetype catalog, a collection of review instructions — not a brain in the product sense.

The separate scripts/design-brain/README.md is primarily an external-reference compliance and probe system (signed adapters, read-only inspection, trusted time, revocation, fail-closed behavior) — not generating or visually directing a site.

The canonical design document itself now acknowledges that numerous enforcement mechanisms previously attributed to the system were never built: the earlier list was largely fictional, there is no canon directory, no full canon checker, no claimed stylelint package, and its formal thaw/change protocol is currently unfollowable.

Consequence: the system has been accumulating additional words and laws while the missing behavior is executable orchestration. More transcripts added to the library will not fix this. It needs code that forces the doctrine to be used at the right point in a visible creative loop.

### 2. The taste-learning loop is open

The Atelier session writer is real. It records variants, structural skeletons, winners and killed directions, kill order, rejection reasons, lever changes, null-winner outcomes, axes to change in a second round.

But an August 19 handoff found the rejection ledger had a writer and ZERO code consumers, and no distilled taste.profile.json. The user's opinions are being saved, but the next design does not read them.

- readTasteLedger appears only in review/handoff documentation, not as an implemented consumer.
- taste.profile.json appears in plans and reviews, not as a live profile artifact the system consumes.
- The only direct runtime reference to the rejection log is its writer.

The next-slice plan intended to repair this was itself given a REVISE verdict because it still did not prove that a generated profile would be consumed by the next design — the proposed work could create another artifact that nothing reads, the exact defect it was supposed to fix.

The image Forge has the same limitation: it generates image brackets, contact sheets, winners, review answers, lineage and cost — but recorded feedback does not become a contextual preference profile that changes the next bracket or page.

Required correction — the complete path must be:

Human decision → raw event with context and reason → validated reader → distilled, provenance-aware taste profile → injected into the next direction-generation brief → observable difference in the next set of designs.

Until a test proves that changing a taste-profile fixture changes the generated directions, the learning claim is not closed.

### 3. Proactive ideation exists in prose but is not a dependable runtime behavior

The repository already contains remarkably good instructions: design-dialogue says the system should act as a brainstorming partner, bring concrete alternatives the user did not request, challenge weak choices, explain tradeoffs, offer two or three materially different options, use visual comparisons. The root constitution requires concept-direction ideation before coding and an 8–12-concept breadth pass for "awe" surfaces. Atelier describes blind parallel concept generation, structurally distinct artboards, fingerprint checks against superficial variation, null-winner behavior, second-wave divergence, screenshot comparison.

Why does the behavior still feel absent? Because major pieces remained doctrine-only: the A0 Plate Forge generator was not built; A4 grafting remained doctrine; A6 visual drift-diff remained doctrine; rejection-log lever filtering remained doctrine; no CI workflow automatically exercised the Design Brain suite. The remaining gaps are principally enforcement gaps, not a shortage of design ideas.

Another conflict: the router's "builder makes zero decisions" posture can suppress precisely the proactive art direction wanted. A strong design agent needs bounded creative autonomy: it should not silently change the brand, but it should be permitted — and required — to identify a weak composition, propose better structures, implement high-confidence polish improvements, and escalate genuinely directional choices. The system lacks a runtime contract defining what it may improve without permission.

### 4. Playwright currently checks correctness and consistency — not visual excellence

The browser skill handles navigation, snapshots, interaction, screenshots — mechanics, not taste. The website-audit skill covers SEO, accessibility, performance, security. The visual-diff loop compares against the admin dashboard as gold standard — a regression fence answering "did something clip / did a11y break / did the surface change," not:

- Is the hero timid?
- Is the page too card-heavy?
- Does the eye know where to go?
- Is the composition memorable?
- Does this look like a template with a Swan skin?
- Which three materially different improvements would elevate it?
- Which visual idea should become the signature moment?

Also: using the existing admin dashboard as the universal gold standard optimizes for parity with the past, not excellence beyond it. A system can become perfectly consistent and consistently mediocre.

### 5. The missing asset-and-reference stage is a major cause of the AI look

A recent plan identified that implementation order inverted the transcript's requirement to generate a branded asset pack BEFORE designing. No module truly owns the creative material; variants were judged without a real generated material system underneath them — the cheapest available explanation for why output does not feel premium.

The Forge is a separate image-bracketing CLI, not an integrated Plate Forge producing one coherent shared material pack for all page directions before layout work begins.

The transcripts expected: visual-reference research; deconstruction of award-winning work; a selected visual direction; generated imagery and video through connected media tools; page composition built from that actual material. The current external-reference operator defaults heavily to probe-only behavior, so the creative workflow cannot casually perform rich reference analysis.

Why this produces generic sites: when the model lacks a coherent asset pack, concrete visual references, and a rendered critique loop, the easiest parts of the doctrine to satisfy are dark background, glowing borders, familiar panels, token-compliant colors, standard headings, standard CTAs. The result is "Swan-colored" but remains an ordinary AI component composition. A palette does not create a composition. A component library does not create an art direction.

### 6. The Swan canon is too specific to serve as a universal creative brain

The canon expresses one identity (dark vault, light, crystal, refraction, caustics, sapphire, ice, controlled gold, optical physics). The archetype catalog spans SaaS, fitness, portfolios, luxury products, dashboards, course landings — but every archetype must apply the same Swan grammar. Two risks: brand convergence (everything becomes a dark crystalline Swan artifact even when a different visual world fits better) and domain contamination (classroom materials and family-facing teacher resources would inherit rules designed for a premium fitness technology brand).

### 7. Tool and skill routing remains fragmented

At one point a large fraction of installed skills were invisible because they were not named by the routing table — the routing table effectively IS the router; an unadvertised skill never fires. Two skill surfaces exist (.claude/skills and .agents/skills). Adding another MCP server does not guarantee improvement: MCP provides capabilities; it does not guarantee the orchestrator invokes the capability at the correct phase, feeds it correct context, uses the result, visually verifies its effect, and learns from the response. The missing piece is an enforced state machine coordinating the tools.

## What the Swan Design Brain should become

Separate the system into a shared creative kernel and domain-specific design brains.

Kernel loop: DISCOVER → DIVERGE → CREATE MATERIALS → RENDER → VISUALLY INSPECT → CRITIQUE → REVISE → VERIFY → LEARN.

Runtime contract: brief + user/project context + domain pack + current taste profile → three structurally distinct directions + one recommended + one wildcard + reference principles + asset plan → shared generated material pack → live N-up renders → Playwright Visual Director → Keep/Fix/Elevate/Wildcard report → safe automatic fixes + directional choices → rerender and verify → human pick/annotation/rejection reason → raw event log → distilled profile → next run.

### The Visual Director

A real agent/runtime component, not another checklist. For every rendered route it inspects: screenshots at 375, 768, 1440, 2560, 3840; first viewport and full page; populated/empty/loading/error/mobile-nav states; DOM structure and landmarks; computed typography, spacing, contrast, stacking; console and network failures; accessibility results; visual hierarchy and composition; brand or domain alignment; generic AI patterns.

Report lanes: Keep (what is strong and must not be lost), Fix now (objective failures: clipping, weak contrast, unclear action, illegible type, broken responsive behavior, excessive density, inconsistent spacing, missing state), Elevate (art-direction recommendations: recompose first viewport, replace card sprawl with a stronger anchor, alter type relationships, build memorable content rhythm, use real imagery, strengthen narrative sequence), Wildcard (one bold unrequested idea).

Every finding carries: screenshot region, DOM selector when available, why it is a problem, recommended change, expected effect, confidence, safe-to-auto-apply yes/no. Objective fixes auto-apply; major aesthetic changes render as alternatives for selection.

Do not replace human taste with one fake score. Use structured expert critique, evidence-linked recommendations, blind pairwise comparison, user selection, contextual preference learning — not one number pretending beauty is objective.

## Concrete repository upgrade blueprint

### P0 — Close the learning loop before adding more doctrine

| Change | Required proof |
|---|---|
| Implement a shared ledger reader | Reads the real append-only Atelier log; handles superseded rows |
| Quarantine unreliable unknown reasons and placeholder rankings | Unit fixture proves they cannot harden into preferences |
| Distill a versioned, provenance-aware profile | Profile identifies source events and confidence |
| Inject the profile into Atelier before direction generation | Changing the profile fixture changes the generated pre-brief |
| Require a reason — or explicit skip — for every rejection | No silent unknown default |
| Scope preferences by domain, project, artifact type | Classroom preference cannot alter Swan product UI |

Critical acceptance test: given the same design brief, changing a high-confidence preference in the profile produces a measurably different set of direction briefs.

### P0 — Build the Playwright Visual Director

scripts/design-brain/visual-director/ {capture, inspect-dom, analyze-layout, critique, build-revision-brief, compare-rounds, schemas, tests} + a skill entry that calls real scripts and produces real screenshots. The router requires a receipt for substantial UI work: route inspected, states inspected, viewports inspected, screenshots produced, objective defects fixed, elevation options proposed, post-fix screenshots produced, remaining risks disclosed.

### P0 — Turn the existing Forge into a real Plate Forge

Build on the existing generation/contact-sheet/winner/lineage/spend primitives. A page-level Plate Forge generates one coherent pack before directions diverge: hero plate, background/environment plate, detail/texture plate, proof/supporting visual, optional motion brief, mobile-safe crops. All layout directions in a round use the same pack so the user judges structure, not whichever option got the best random image. If the pack is wrong, kill the pack before generating layouts and record why.

### P1 — Reference-analysis lane

Accept a URL, screenshots, mood board, existing site, competitor set, award-winning example. Extract principles rather than clone: composition, type hierarchy, content rhythm, negative-space strategy, image treatment, motion grammar, interaction model, density, signature moment, conversion path, mobile adaptation. Output a small reference brief the direction generator actually consumes. Remote references stay read-only and privacy-safe.

### P1 — The Studio surface

N-up direction preview; device toggles; full-page and first-viewport views; element selection; screenshot-region annotation; DOM-selector annotation; tweak chips for spacing/scale/type/palette/density/motion; keep-this-change-that grafting; comment-to-patch conversion; before/after round history; explicit winner/rejection/null-winner controls. A comment becomes a structured patch task, not another vague chat message.

### P1 — Portable, deterministic routing

One canonical workflow definition generating agent-specific entrypoints. Build verifies: every default skill advertised, every advertised skill exists, Visual Director reachable, taste-profile consumer reachable, Atelier workflow invokes material and visual stages, generated mirrors match canonical source, Design Brain tests run in CI.

## The teacher/classroom question

Create a separate domain brain — do not put classroom/lesson creation inside the Swan product-design router, and do not build an unrelated system. Same creative kernel, separate domain packs: Swan Product Design; General Web/Brand Studio; Learning Experience Studio (lesson concepts, classroom visuals, slides, printables, centers, activities, family materials).

Learning Experience governing questions: learners, age/developmental stage, learning objective, what the child visibly does, attention span, realistic materials, teacher prep, printability, reusability, safety constraints, differentiation, child-facing vs teacher-facing vs family-facing. Visual rubric: age appropriateness, clarity, legibility, low cognitive overload, realistic classroom use, printer friendliness, simple prep, accessibility, observable learning, engaging but not chaotic.

Memory separation is crucial: hierarchy user profile → domain profile → project profile → artifact-type profile. A teacher may prefer soft pastels, illustrated animals, large rounded text, low-ink printables, two-step activities — with zero effect on a Swan operator cockpit, and no crystalline dark-vault rules leaking into a preschool worksheet.

## Acceptance benchmark

Twelve briefs (premium marketing page; operational dashboard; mobile workflow; existing-page redesign; content-heavy page; image-led cinematic experience; intentionally vague brief; brief with supplied references; brief with weak existing design; classroom slide deck; printable activity; teacher planning artifact). Blind-compare current vs upgraded output.

Launch gate: genuinely different structures, not recolored variants; a recommended direction with reasons; materials created/identified before layout; every output browser-inspected; every inspection produces specific recommendations; at least one round visibly improves the artifact; user feedback changes a later run testably; accessibility and task usability do not decline; blind human preference favors the new system ≥70%; the system can produce a null winner and re-diverge rather than forcing the least-bad option.

## Final recommendation

Build three things first: taste reader and consumer; Playwright Visual Director; integrated pre-layout Plate Forge. Then the live annotation Studio. For the teacher use case, a separate Learning Experience Studio domain pack on the same kernel rather than widening the Swan visual canon.

The central issue is architectural: Swan currently knows design rules, but it does not consistently see, judge, revise, and learn from the thing it made. Closing that loop is what moves it from a sophisticated prompt library to a design partner.
