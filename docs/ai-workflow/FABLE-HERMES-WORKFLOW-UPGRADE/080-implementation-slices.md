# Recommended Implementation Slices

Date: 2026-07-03
Scope: docs/workflow upgrade plan. No production implementation in this packet.

## Execution Protocol

For each slice:

1. Build the smallest useful artifact.
2. Run hostile review.
3. Fix review findings.
4. Repeat until no blockers remain.
5. Verify with local checks.
6. Do not push or deploy unless Sean explicitly approves.

Because the current tree is heavily dirty, implementation should happen in isolated worktrees when code is involved.

## Slice 1: Restore The Hermes Boundary And Registry

Files to create:

- `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`
- `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`

Goal:

Make one canonical source of truth for public Swan Coach vs Sean-only Hermes, plus tool/brain ownership and permission levels.

Acceptance criteria:

- Existing AGENTS/CLAUDE references to the Hermes bridge resolve.
- Registry includes prompt-watcher, grill-me, chromie, swan-orchestrator, swan-design-router, closeout-evidence-lock, AI Village, Fable, Hermes, Browser Harness, Coach Brain, PLAUD, AI command, and Render gates.
- Each row includes data class, effect level, owner, and verification rule.

Hostile review focus:

- Does this accidentally give Hermes more authority?
- Does this blur Swan Coach and Hermes?
- Does this create contradictions with AGENTS/CLAUDE?

## Slice 2: Create The Design Brain

Files to create:

- `docs/ai-workflow/design-brain/README.md`
- `docs/ai-workflow/design-brain/design.md`
- `docs/ai-workflow/design-brain/design.html`
- `docs/ai-workflow/design-brain/component-patterns.md`
- `docs/ai-workflow/design-brain/motion-and-media.md`
- `docs/ai-workflow/design-brain/anti-patterns.md`
- `docs/ai-workflow/design-brain/router-receipt-template.md`
- `docs/ai-workflow/design-brain/fable-design-review-prompt.md`

Goal:

Turn the existing Swan design system into a compact callable brain without replacing it.

Acceptance criteria:

- Load order preserves AGENTS/CLAUDE and current design docs.
- No Tailwind, MUI, or Galaxy-Swan drift.
- Includes a route-specific design receipt template.
- Includes a static local HTML reference page.

Hostile review focus:

- Is the Design Brain just duplicated doctrine?
- Does it actually make future UI work easier?
- Does it accidentally override the source-of-truth docs?

## Slice 3: Patch AGENTS/CLAUDE Routing Links

Files to edit:

- `AGENTS.md`
- `CLAUDE.md`
- `ACTIVE-INDEX.md`

Goal:

Add short pointers to the new registry, Design Brain, Hermes bridge, and AI Village packet.

Acceptance criteria:

- Patch is small.
- Existing rules are not rewritten broadly.
- New links resolve.
- No secrets or private values.

Hostile review focus:

- Does this add too much instruction weight?
- Does it conflict with existing rule numbering?
- Does it make Codex/Claude startup slower?

## Slice 4: Browser Harness Supervised Admin Audit Policy

Files to create:

- `docs/ai-workflow/references/BROWSER-HARNESS-SUPERVISED-ADMIN-AUDIT.md`

Goal:

Define how Hermes/Codex can audit an authenticated admin page without taking unsafe actions.

Acceptance criteria:

- Human opens authenticated page.
- Agent captures console errors, request failures, and read-only page state.
- No credentials, form submits, settings changes, saves, deletes, bypasses, or destructive actions.
- Outputs a receipt with URLs observed, actions taken, data entered, side effects, and failures.

Hostile review focus:

- Can this be abused to scrape PII?
- Can it mutate data accidentally?
- Is the allowed action set too broad?

## Slice 5: Coach Brain To Hermes Ingestion Adapter Spec

Files to create/edit:

- `docs/ai-workflow/coach-brain/HERMES-INGESTION-CONTRACT.md`
- update `scripts/__tests__/coach-brain-contract.test.mjs` only after Sean approves code/test changes

Goal:

Make Hermes ingest the Obsidian-compatible brain without corrupting privacy/PDF/frontmatter contracts.

Acceptance criteria:

- Hermes read/update rules are explicit.
- Frontmatter must be preserved.
- Client privacy rules preserved.
- Full-plan PDF rule preserved.
- Source/provenance/stale-date rules are required.

Hostile review focus:

- Could Hermes overwrite doctrine incorrectly?
- Could client PII enter the brain vault?
- Could summary-only PDFs re-enter through automation?

## Slice 6: AI Village Canonical Policy Update

Files to create/edit:

- `docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md` if it exists and needs repair
- or `docs/ai-workflow/references/AI-VILLAGE-UPGRADE-POLICY.md`
- link from `ACTIVE-INDEX.md`

Goal:

Resolve drift between older AI Village docs and current AGENTS/CLAUDE rules.

Acceptance criteria:

- Brain count/model roster drift is explicitly handled.
- Sean approval and spend cap are mandatory.
- Modes are clear: planning, security/privacy, release, design.
- Output contract is standardized.

Hostile review focus:

- Does it overuse paid models?
- Does it leak private data?
- Does it allow Village to override repo rules?

## Slice 7: Operator Command Effect Registry

Files to create:

- `docs/ai-workflow/references/SWANSTUDIOS-OPERATOR-COMMAND-EFFECT-REGISTRY.md`

Goal:

Classify app/Hermes/browser commands by risk level.

Acceptance criteria:

- Read-only routes separated from draft-only and write routes.
- Destructive/irreversible actions are forbidden unless explicit human approval and app auth both exist.
- PLAUD/transcript/client health workflows are marked local-private redaction first.
- AI command, Hermes tasks, Browser Harness, and AI Village each have effect-level policy.

Hostile review focus:

- Are any write actions mislabeled as read-only?
- Are admin/private pages overexposed?
- Are approval gates clear?

## Slice 8: Render/Release Gate Refresh

Files to create/edit:

- `docs/ai-workflow/references/RENDER-RELEASE-GATE-CHECKLIST.md`
- link from `ACTIVE-INDEX.md`

Goal:

Capture the proven deploy doctrine from recent loops:

- route 401 can be weak proof on protect-first routers
- bundle chunk marker checks matter
- lazy chunks must be traced
- health checks must be explicit
- no main push without Sean approval

Acceptance criteria:

- Checklist distinguishes backend route proof, frontend bundle proof, and protected-route semantics.
- Includes rollback note.
- Includes "do not trust 401 alone" warning.

Hostile review focus:

- Does it overclaim deploy verification?
- Does it require too much ceremony for tiny safe docs?

## Slice 9: Personal Automation Roadmap

Files to create:

- `docs/ai-workflow/references/HERMES-PERSONAL-AUTOMATION-ROADMAP.md`

Goal:

Plan Hermes as Sean's life/business command center without rushing unsafe automation.

Sections:

- SwanStudios clients and training
- PLAUD intake
- marketing/acquisition
- social media/content
- app monitoring
- brain retrieval
- browser hygiene
- local/private model lane
- backups/portability

Acceptance criteria:

- Every automation has owner, data class, effect level, and kill switch.
- Sensitive workflows use local/private lane first.
- No write automation without explicit approval.

Hostile review focus:

- Does this become fantasy automation?
- Are business ROI and safety prioritized?

## Slice 10: Final Consolidated Handoff Prompt

Files to create:

- `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/100-final-build-handoff-prompt.md`

Goal:

Give Sean one paste-ready prompt to start implementation after he approves the plan.

Acceptance criteria:

- It names the first slice.
- It names exact files.
- It says no production code beyond docs for slice 1.
- It requires hostile review and verification.
- It respects dirty tree and isolated worktree rules.

## Recommended First Build

Start with Slice 1.

Reason:

No other upgrade is safe until the Hermes boundary and tool registry are canonical.

