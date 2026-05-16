---
name: swan-oracle
description: Use when Sean asks for an Oracle pass, GPT Pro, GPT-5.5 Pro, deep strategic research, progress-gap analysis, UX/UI insight, product-roadmap critique, or high-reasoning review before SwanStudios implementation. Creates privacy-safe Oracle packets and classifies returned recommendations without bypassing Swan rules.
---

# Swan Oracle

## Role

Create privacy-safe review packets for GPT Pro / GPT-5.5-class reasoning and integrate the returned advice back into SwanStudios with evidence.

This skill is advisory. It does not replace `CLAUDE.md`, `AGENTS.md`, `swan-design-router`, `canonical-surface-audit`, `closeout-evidence-lock`, tests, browser QA, or Sean's approval.

## Load First

Read `docs/ai-workflow/references/SWAN-ORACLE-GPT-PRO.md` before producing an Oracle packet or classifying an Oracle response.

If the task is UI or visual, also respect `swan-design-router`; Oracle can critique design, but the router still owns Swan visual implementation.

## When To Use

Use this skill when Sean asks for:

- GPT Pro / GPT-5.5 Pro / Oracle review
- deep research on what SwanStudios is missing
- UX/UI strategy before Open Design or implementation
- product-roadmap insight
- architecture critique for a complex slice
- progress-gap analysis across dashboards, Swan Coach, PLAUD, gamification, onboarding, checkout, or social/community surfaces

Do not use for trivial code fixes, small CSS tweaks, direct bug reproduction, or normal deterministic verification.

## Workflow

1. **Define the decision.** Write one sentence naming the exact surface or decision the Oracle should review.
2. **Gather narrow evidence.** Include only relevant file paths, route evidence, screenshots, audit docs, test results, and known constraints.
3. **Redact aggressively.** Remove secrets, env values, API keys, cookies, raw transcripts, client names, emails, health notes, payment details, and private screenshots.
4. **Create the packet.** Use the packet shape in `SWAN-ORACLE-GPT-PRO.md`.
5. **Choose delivery mode.**
   - In Codex: do not spawn a GPT-5.5 subagent unless Sean explicitly asks for delegated or parallel agent work. Otherwise, produce a packet Sean can paste into ChatGPT/GPT Pro.
   - In Claude: if Chrome or browser-use submission is needed, use the available browser workflow and keep the same redaction rules.
   - For any direct API/script integration, first verify model IDs in `config/MODEL_VERSIONS.md`; never invent a model string.
6. **Classify the response.** When Oracle output returns, create an `ADOPT / REJECT / DEFER / NEEDS PROBE` table with repo evidence before implementing anything.

## Output Contract

When creating a new Oracle packet, output:

```text
ORACLE PACKET STATUS: READY / BLOCKED
TARGET SURFACE:
DECISION NEEDED:
CONTEXT INCLUDED:
CONTEXT EXCLUDED FOR PRIVACY:
PASTE PROMPT:
[prompt]
```

When reviewing returned Oracle output, output:

```text
ORACLE REVIEW CLASSIFICATION

| Finding | Classification | Evidence | Action |
|---|---|---|---|

IMPLEMENTATION GO / BLOCKED:
NEXT VERIFICATION:
```

## Hard Rules

- No PII or secrets in Oracle packets.
- Oracle output is a hypothesis until checked against repo evidence.
- Do not let Oracle recommendations override Swan stack rules: styled-components, no MUI, tokenized colors, no retired Galaxy-Swan theme, Victory for charts.
- Do not let Oracle skip required receipts, route tracing, model checks, tests, or browser QA.
- Do not broaden the task scope just because Oracle suggests more work. Classify out-of-scope ideas as `DEFER`.
