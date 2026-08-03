---
name: guided-setup
description: Use for installation, authentication, deployment setup, environment wiring, account connection, or unfamiliar tooling when the user benefits from one verified action at a time and a stable visible list of remaining steps. Do not use for ordinary engineering execution.
---

# Guided Setup

Guide setup one atomic, verified step at a time without losing the full plan.

## Build the Internal Checklist

Before presenting a step:

1. Detect the active project, operating system, shell, runtime, and existing setup.
2. Inspect current configuration without exposing secrets.
3. Build the complete ordered checklist internally.
4. Mark steps as `automatic`, `user-action`, `approval-required`, or `verification`.
5. Identify destructive, financial, production, authentication, and secret-handling boundaries.

Do not make the user repeat a step that current evidence already proves complete.

## Response Shape

Present:

```text
CURRENT STEP <n>/<total>
<one atomic action>

WHY
<one sentence>

HOW TO VERIFY
<observable result>

REMAINING
- <up to eight short step headlines>
```

Show only one actionable current step. Keep the remaining list stable, updating it when verified evidence changes the route.

## Advance Carefully

- Verify the current step before advancing.
- Verification commands must be read-only. If verification fails, halt the checklist and diagnose that step; do not retry with broadened, mutating, or materially changed commands without the authority that command independently requires.
- Keep secret values out of chat, logs, docs, and command output.
- Prefer presence-only checks for environment variables and credentials.
- Make the human perform sensitive authentication, credential, irreversible, financial, or production-confirmation steps.
- A human-performed sensitive step is complete only after an explicit human confirmation signal plus any safe observable verification the agent can actually perform. Never infer completion, request the secret value in chat, or mark the step complete from the instruction alone.
- Request approval through the available approval mechanism when a tool action requires it.
- Explain platform-specific commands for the detected environment only.
- Any delegated agent inherits the setup checklist, authority boundaries, and stop conditions verbatim and cannot authorize its own escalation.

## Scope Control

If setup reveals a material architecture, security, billing, or product decision, pause the setup lane and surface one decision with a recommended option. Preserve the remaining checklist so the setup can resume afterward.

## Completion

Finish only when every required step is verified. Report what is configured, the proof used, any optional steps skipped, and how to resume or troubleshoot without exposing sensitive values.
