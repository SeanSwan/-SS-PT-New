# AGENTS.md and CLAUDE.md Patch Proposal

Date: 2026-07-03
Scope: proposal only. Do not apply without Sean approval.

## Executive Verdict

The instruction files are powerful but crowded. The patch should not add another giant rule block. It should add a short routing layer that points to canonical registries:

- AI skill and operator registry
- Design Brain
- Hermes operator bridge
- AI Village upgrade packet

## Patch Goal

Make future agents answer these before touching code:

1. Is this public Swan Coach, Sean-only Hermes, or both?
2. Is this SIMPLE or VISION?
3. Is this UI/design, backend/API, security/privacy, billing, browser automation, or release work?
4. Which brain/tool owns it?
5. What data class can it touch?
6. What verification gate proves it?

## Proposed New Section

Add near the top of AGENTS.md and CLAUDE.md after project identity:

```md
## AI Workflow Router Addendum

Before any non-trivial SwanStudios work, classify the request using:

1. `prompt-watcher` for SIMPLE vs VISION.
2. `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` for tool/brain ownership, effect level, data class, approval rules, and verification.
3. `docs/ai-workflow/design-brain/README.md` for UI/design work, after `swan-design-router`.
4. `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` for any task crossing Hermes, Browser Harness, Telegram, Discord, local PC, Raspberry Pi, or Sean-only operator automation.
5. `docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md` plus `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/070-ai-village-upgrade-packet.md` before any paid Village or Fable arbitration.

Public Swan Coach and Sean-only Hermes are separate. Hermes may assist Sean's internal workflow, review queue, brain retrieval, and supervised browser audits, but must never bypass app auth, role scoping, human approval gates, Codex verification, Fable arbitration, or Render release proof.
```

## Proposed Hermes Boundary Patch

Replace or repair references to missing:

`docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`

with either:

1. Recreate that exact missing file, then keep links as-is.
2. Or, if Sean wants a different location, update every reference to the new canonical bridge file in one explicit docs-only patch.

Recommendation: recreate the missing file at the expected path. Existing docs already point there, so that is lower-risk than changing many references.

## Proposed AI Village Patch

Add a short rule:

```md
AI Village doc drift rule: if AI Village docs disagree on brain count, model roster, or spend gate, AGENTS.md/CLAUDE.md and the current AI Village registry packet win. Older validation archives are evidence, not current policy.
```

## Proposed Design Brain Patch

Add:

```md
Design Brain: for UI/design tasks, `swan-design-router` remains the active router. `docs/ai-workflow/design-brain/` is the compact callable design memory generated from the Swan Cinematic Design System and Asset Storyboarding docs. It is not a replacement brand system and must not override styled-components-first, Crystalline Swan tokens, WCAG, or real-data truth.
```

## Proposed Browser Harness Patch

Add:

```md
Browser Harness admin/private audit rule: admin/private audits are allowed only under explicit supervised scope. The human must open the authenticated page. The agent may capture console errors, failed requests, page metadata, screenshots if approved, and read-only DOM state. The agent must not enter credentials, submit forms, change settings, save records, delete data, bypass access controls, or run destructive browser actions.
```

## Proposed Operator Effect Levels

Add a pointer to the registry:

```md
Every operator command must be classified as:
- read-only
- draft-only
- approval-required write
- destructive or irreversible
- forbidden

Hermes, Browser Harness, AI command, and AI Village tasks must log the effect level before action.
```

## Hostile Review of This Patch Proposal

Potential issue: adding more docs can make the system harder to follow.

Fix: add only short router pointers to AGENTS/CLAUDE. Put detail into the registry and design-brain folder.

Potential issue: Hermes could be treated as a backdoor admin.

Fix: the Hermes boundary must explicitly say Hermes does not bypass app auth, role scoping, human confirmation, or release gates.

Potential issue: Fable could be overused.

Fix: Fable is final arbitration/design synthesis for major slices, not a mandatory step for every typo or safe doc edit.

Potential issue: AI Village cost could expand.

Fix: keep Rule 16 and require explicit Sean approval, budget cap, and pre-run estimate.

