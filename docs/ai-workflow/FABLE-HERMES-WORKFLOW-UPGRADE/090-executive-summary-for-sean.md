# Executive Summary For Sean

Date: 2026-07-03

## Plain-English Summary

You are not starting from scratch. SwanStudios already has a serious AI workflow foundation: prompt-watcher, design router, hostile review, closeout evidence, AI Village, Hermes routes, PLAUD intake, AI command routes, and the Obsidian-compatible Swan Coach brain vault.

The biggest problem is that the brain is spread out. The system needs a clean command map before we give Hermes more power. Right now there are stale links, missing registry docs, AI Village drift, and multiple Hermes identities. That is manageable, but we should fix it before browser/admin automation grows.

My recommendation: first build the missing Hermes boundary doc and the AI skill/operator registry. Then build the Design Brain. Then wire those into AGENTS/CLAUDE. After that, Browser Harness admin audits and deeper Hermes automation become much safer.

## Technical Summary

Verified locally:

- `AGENTS.md` and `CLAUDE.md` define SwanStudios as trainer-led, workout-progress-first, and real-data-first.
- `prompt-watcher`, `grill-me`, `chromie`, `swan-orchestrator`, `swan-design-router`, and `closeout-evidence-lock` are already part of the workflow doctrine.
- `SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `SWAN-ASSET-STORYBOARDING.md` are the design source-of-truth docs.
- `docs/ai-workflow/coach-brain/` is the active Obsidian-compatible Swan Coach Cortex brain vault.
- `/api/hermes`, `/api/ai-command`, `/api/ai-village`, `/api/ai-chat`, PLAUD, onboarding, claim, analytics, coach intake/proposals, and workout log routes are mounted locally.
- The current tree is very dirty, so broad implementation must be isolated and explicit-path only.

## Top 10 Findings

1. SwanStudios already has a strong AI operating doctrine.
2. Hermes is correctly treated as Sean-only operator tooling, not public Swan Coach.
3. The missing Hermes boundary doc is a real gap: `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` is referenced but not found locally.
4. `docs/11-slice-registry.md` was requested but is not present locally.
5. AI Village docs need a canonical current policy because older docs and current AGENTS/CLAUDE rules drift.
6. The design system is strong, but needs a compact Design Brain bundle for Fable/Hermes/Codex/Claude.
7. The Coach Brain vault is well-shaped for Obsidian and future Hermes ingestion, but runtime integration is still pending.
8. PLAUD and client transcript workflows must remain local-private-redaction first.
9. Browser Harness admin audit is not ready as a free-form action; it needs a supervised read-only policy.
10. The current repo tree is too dirty for broad edits without isolated worktrees.

## Top 10 Recommended Upgrades

1. Create the missing Hermes/SwanStudios operator bridge doc.
2. Create a canonical AI skill and operator registry.
3. Create the Design Brain folder from existing Swan design docs.
4. Patch AGENTS/CLAUDE with short links to the new registry and Design Brain.
5. Add a Browser Harness supervised admin audit policy.
6. Add a Hermes ingestion contract for the Coach Brain vault.
7. Normalize AI Village into four modes: planning, security/privacy, release, design.
8. Create an operator command effect registry for read-only, draft-only, approval-required write, destructive, and forbidden actions.
9. Refresh the Render release gate checklist with recent lazy-chunk and protected-route lessons.
10. Create a personal automation roadmap for Hermes with data class, effect level, owner, and kill switch for each automation.

## Exact Next Prompt Sean Should Run First

```text
Codex, start Slice 1 from docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/080-implementation-slices.md.

Create only documentation files. Do not edit production code.

Build:
1. docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md
2. docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md

Use the local audit packet in docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/ as source material.

Requirements:
- Keep public Swan Coach and Sean-only Hermes separate.
- Classify every operator capability by data class and effect level.
- Include Hermes, Browser Harness, AI command, AI Village, Fable, prompt-watcher, grill-me, chromie, swan-orchestrator, swan-design-router, closeout-evidence-lock, PLAUD, Coach Brain, and Render gates.
- Run hostile review after drafting.
- Fix all blockers found by the hostile review.
- Do not stage, commit, push, deploy, run paid AI Village, browse, or touch secrets.

Final answer with:
1. Files created
2. Hostile-review findings
3. Fixes made
4. Anything still unverified
5. The next recommended slice
```

## Anything Not Locally Verified

- I did not browse the web.
- I did not run Fable.
- I did not run AI Village.
- I did not verify current external Hermes app/gui docs.
- I did not inspect secrets or API keys.
- I did not validate live production after this packet.
- I did not run full tests because this was a docs-only planning packet.
- I did not reconcile the huge dirty working tree.
- I did not verify whether the missing Hermes bridge doc exists outside the repo.

## Confidence Level

High confidence on local-file findings and recommended first slice.

Medium confidence on AI Village model/count details because local docs are drifted and no Village run was executed.

Medium confidence on Hermes GUI/current-version details because this packet intentionally did not browse or inspect external Hermes release notes.

