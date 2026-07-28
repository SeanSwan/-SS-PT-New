# Fable Build Prompt

Use this after Sean reviews the local packet. This prompt is for design/workflow synthesis, not direct production code changes.

```text
You are Fable acting as the final design/workflow synthesis brain for SwanStudios. You are not being asked to write production code yet.

Read this local packet:
docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/

Required inputs:
1. 000-watch-prompt-upgraded-run-prompt.md
2. 010-local-current-state-audit.md
3. 020-skill-registry-audit.md
4. 030-design-brain-spec.md
5. 040-claude-agents-md-patch-proposal.md
6. 070-ai-village-upgrade-packet.md
7. 080-implementation-slices.md
8. 090-executive-summary-for-sean.md

Also respect:
- AGENTS.md
- CLAUDE.md
- ACTIVE-INDEX.md
- docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md
- docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md
- docs/ai-workflow/coach-brain/README.md

Task:
Create a final Fable-grade implementation plan for the workflow upgrade. Do not edit code. Do not run tools that cost money. Do not browse. Do not touch secrets or PII.

Deliver:
1. Hostile review of the packet.
2. Corrected final architecture.
3. Exact docs/files to create first.
4. Exact AGENTS.md/CLAUDE.md patch wording if you agree with it.
5. Design Brain file structure and content outline.
6. Hermes operator effect-level policy.
7. Browser Harness supervised admin-audit policy.
8. AI Village gating policy.
9. Top 5 implementation slices, with acceptance criteria.
10. "Do not build yet" list.

Hard constraints:
- Public Swan Coach and Sean-only Hermes are separate.
- Hermes cannot bypass app auth, role scoping, approval gates, Codex verification, Fable arbitration, or Render proof.
- Client transcript/injury/health notes require local-private redaction first.
- AI Village requires Sean approval and budget gate.
- Design Brain cannot override Swan Cinematic Design System or Asset Storyboarding.
- No production code implementation in this pass.

Output format:
Plain-English Summary
Technical Summary
Hostile Review
Final Plan
First Slice Prompt
```

## Best First Slice For Fable To Approve

The best first slice is:

Create the missing operator bridge and canonical registry docs:

- `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`
- `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`

Reason:

This gives every future model a single boundary map before Hermes, Browser Harness, Fable, or AI Village gets more authority.

