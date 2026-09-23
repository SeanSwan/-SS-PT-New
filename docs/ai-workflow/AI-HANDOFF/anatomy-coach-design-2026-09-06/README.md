# Swan Pain Atlas, Coach experience and Design Brain — Mega Blueprints

Artifact: SPA-20260906 / owner: Sean / author: Codex Astra.
Version: 1.3, 2026-09-07. Status: PLANNING HANDOFF; application implementation NOT AUTHORIZED.
Supersession: expands CC-UX-20260906; preserves its prior local implementation and Universe V3 backend authority.

## The decision

**Easy pain chart is the default.** Clients tap an area, confirm the side, set the pain level and save. Muscle groups, bones and joints are the primary optional location aids. Nobody must choose a tissue type or identify the cause of pain. Veins, nerves, organs, system trees, opacity and explode tools are secondary, behind Explore anatomy. The same detailed Three.js body stays mounted.

**Port the actual Human Atlas viewer into Swan and build the pain chart around its full anatomical depth, with diverse reference options and supported personalization.** Preserve the source rendering, structures, depth and full tools; build beautiful Swan reporting, recovery and coaching workflows around it. Pain Chart, Training recovery and Explore anatomy use the same full scene. Easy reporting changes control hierarchy, never anatomical detail. The v1.0 schematic body and basic-body-first strategy are rejected and superseded by [the revised viewer-port blueprint](02-pain-atlas-blueprint.md).

Swan's advantage should be the complete coaching loop: report → track the same episode → trainer reviews → training decisions → follow-up. A polished anatomical viewer is necessary, but not sufficient. No points for tolerating pain, no diagnosis from a mesh, no invented recovery trend.

For Coach, recommend the **Coaching Desk** direction: a single truthful client/task header, conversation and reachable input, a contextual working document, and a task-focused Review workspace. Preserve every existing backend capability through explicit adapters and route aliases. Remove repeated explanations and decorative interface layers as each replacement passes acceptance.

For the Design Brain, keep its brand constraints and operational knowledge. Improve its decision process with functional-3D guidance, evidence-based density rules, explicit progressive disclosure, representative benchmarks, and an honest clean-review outcome. This is an upgrade proposal, not an installed doctrine change or a claim that one model is universally better.

Support clients of all nationalities/backgrounds through diverse reference/appearance options. Offer **Use my measurements** and **Choose a reference body** in both Pain Atlas and Workout Planner. Retain full Three.js anatomy and Swan theming. Derive our own assets from the licensed source when practical; if the feasibility sample fails, keep the detailed source assets and continue the Swan integration. The earlier Black male/female concepts are optional examples within this wider scope. See [the asset brief](14-custom-anatomy-assets.md) and [profile-driven body contract](15-profile-driven-body.md).

## Read and review

1. [Visual review: directions, desktop/mobile wireframes and states](review.html).
2. [Current state, canonical surfaces and preservation](01-baseline-audit.md).
3. [Complete Pain Atlas product and architecture](02-pain-atlas-blueprint.md).
4. [Contracts, data model, permission and privacy boundaries](03-contracts-data-privacy.md).
5. [Coach audit and complete redesign contract](04-coach-experience.md).
6. [Swan Design Brain comparison and proposed upgrade](05-design-brain-review.md).
7. [Wireframe behavior and state matrix](06-wireframes-states.md).
8. [Tests and requirement traceability](08-tests-traceability.md).
9. [Slices, operations, rollback and hostile review](09-slices-operations-review.md).
10. [Paste-ready next-agent prompt](10-builder-handoff.md).
11. [Reusable Swan Pain Atlas skill](swan-pain-atlas/SKILL.md).
12. [Three.js motion and training recovery integration](11-training-recovery.md).
13. [Readiness and verification receipt](12-readiness-receipt.md), [machine receipt](readiness.json) and [evidence](evidence/baseline.json).

14. [Teach Hermes and other agents this design standard](13-interactive-design-teaching-prompt.md), with the [portable skill](detailed-interactive-design/SKILL.md).
15. [Inclusive body library and practical asset adaptation](14-custom-anatomy-assets.md).
16. [Profile-driven body personalization](15-profile-driven-body.md).

Diagrams: [pain flow](diagrams/pain-flow.mmd), [write sequence](diagrams/write-sequence.mmd), [data model](diagrams/data-model.mmd), [trust boundaries](diagrams/privacy-flow.mmd), [Coach lifecycle](diagrams/coach-state.mmd), [Design Brain review](diagrams/design-review.mmd), [recovery pipeline](diagrams/recovery-flow.mmd), [profile-driven body flow](diagrams/personalization-flow.mmd), [asset feasibility and fallback](diagrams/asset-feasibility.mmd). The review page renders these when its pinned Mermaid dependency loads; source remains usable offline.

## Current location and revision

v1.2, 2026-09-07: diverse body references for all backgrounds; explicit measured/manual choice shared with Workout Planner; Three.js native Swan integration; derivative assets preferred where practical, retained source assets authorized as fallback.

The repository moved under Desktop/@Everything/quick-pt/SS-PT. The old saved task path is stale. All 60 v1.1 packet files and 52+11 source-manifest entries matched their hashes at the new location before revision. Original historical evidence is preserved; current manifests relocate their repository root without changing source hashes. Broken unrelated skill/worktree junctions caused Git warnings and remain outside this planning scope.

## Governing authority

This directory is the single planning addendum for Sean's current anatomy + Coach + Design Brain request, including his later instruction to keep all atlas capabilities behind simple pain reporting. The main [CC experience packet](../COMMAND-CENTER-EXPERIENCE-DECISION-PACKET-2026-09-06.md) remains the predecessor receipt. Universe V3 contracts in `tmp/worktrees/swan-coach-universe-20260904/docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/` and the separately owned Astra repair receipts govern Coach persistence. Do not copy whole stale branches or overwrite either implementation lane.

The request explicitly authorizes planning and this reusable skill, and repeatedly prohibits application building. No app source, migration, production data, provider, commit, push or deploy belongs to this turn. A future implementation instruction starts S0; this document alone does not.

Final coordination check also found the [Gwen 3.8 continuation launcher](../SWAN-COACH-GWEN-3.8-HANDOFF-20260906.md), version 3.3, pointing to the Astra-owned Universe V3 files 31/32. It identifies the older Universe worktree as preserved input and the Astra-owned tree as the runtime lane. S0 must reconcile that exact current handoff with this UI planning addendum. Its separate implementation instructions do not override this task's plan-only scope; no claimed runtime result from that launcher was adopted as independently verified here.

## Readiness truth

The full handoff is reviewable. Implementation readiness is withheld: the current frontend baseline contains two failing source-structure assertions; source/release/worktree reconciliation is required; clinical content and actual asset mapping/performance acceptance are future gates. Future tests are NOT RUN, not green by document existence. See the receipt for the structural check and exact evidence.

Human Atlas is the accepted reference from the transcript. [Its repository](https://github.com/ashemag/human-atlas) and [working demo](https://human-atlas-seven.vercel.app/) were inspected. Swan owns its new interface and workflows; original data/code credits must remain where reuse requires them.

[Reference and licensing verification](evidence/reference-research.md). The reusable skill is packaged for the next agent; it has not been installed globally or promoted into the production Design Brain. To open the interactive wireframes locally, use the [preview command](acceptance/README.md).
