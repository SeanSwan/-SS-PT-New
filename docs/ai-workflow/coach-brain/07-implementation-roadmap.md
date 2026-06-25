---
brain: swan_coach_cortex
domain: implementation_roadmap
review_status: approved
authority: sean_codex_2026_06_24
tags: [roadmap, implementation, hermes]
---
# Implementation Roadmap

## Phase 1: Brain Foundation - Complete

Status: complete. This was the behavior-neutral foundation slice.

- Created the Obsidian-compatible vault.
- Added contract tests so future agents cannot silently remove the intake, privacy, PDF, or roadmap rules.
- Did not touch live generation, PDF export, or database schema in the foundation slice.

## Phase 2: Backend Runtime Bridge - Implemented

Status: implemented 2026-06-24 as a backend-only bridge.

- Added a runtime service that reads approved vault notes.
- Return structured policy chunks by domain.
- Keep client data out of the vault.
- `/api/workout-builder/generate` and `/api/workout-builder/plan` accept a `readinessCheck` payload.
- Workout generation emits `swanCoachReadiness`, readiness rationale, trainer-safe explanations, and readiness notes on exercises.
- Readiness checks feed Green/Yellow/Red candidate scoring before final exercise selection.
- Short readiness fields are sanitized to approved body-area/readiness tokens; free-text notes are intentionally dropped.
- Frontend guided candidates, preference storage, database schema, and PDF exporter repair are still pending.

## Phase 3: Guided Generation Candidates - Next Runtime Slice

- Add an API that returns candidate exercises before final generation.
- Add a readiness check for tightness, soreness, range of motion, tissue-quality, recent heavy training, and recovery needs.
- Feed Green/Yellow/Red readiness into candidate scoring before final exercise selection.
- Reuse the Rolodex media and exercise metadata path.
- Support Auto Generate, Guide Me, and Deep Grill.
- Store trainer picks/rejections as preference signals after approval.

## Phase 4: PDF Exporter Repair

- Update the long-horizon PDF path so it exports every workout day.
- Keep the generated plan, saved plan, and PDF attached under the client.
- Add regression tests for day count, exercise inclusion, and privacy wording.

## Phase 5: Learning Loop

- Add preference storage for trainer choices, client-specific avoids, and Sean-approved doctrine changes.
- Keep raw client history out of LLM prompts unless de-identified and role-gated.
- Feed accepted patterns back into candidate scoring.

## Phase 6: Hermes Ownership

Hermes can later read and update this vault, but must preserve the same contract:

- approved frontmatter,
- no private client data in Markdown,
- one-question-at-a-time style intake,
- no summary-only PDFs,
- client-facing privacy wording.
