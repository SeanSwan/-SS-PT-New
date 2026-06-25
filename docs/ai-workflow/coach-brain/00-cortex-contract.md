---
brain: swan_coach_cortex
domain: governance
review_status: approved
authority: sean_codex_2026_06_24
tags: [contract, ingestion, source-of-truth]
---
# Cortex Contract

Swan Coach Cortex exists to make SwanStudios workout generation feel like Sean Swan's training brain while staying NASM-aligned and client-safe.

## Authority Stack

1. Client safety, access control, and privacy.
2. Current client data in the app database.
3. NASM OPT / CES programming guardrails summarized in approved SwanStudios docs.
4. Sean Swan's approved training doctrine in this vault.
5. Exercise Rolodex metadata, videos, equipment, substitutions, and source tags.
6. LLM explanation or drafting.

If these conflict, the lower number wins.

## Ingestion Rules

- Only ingest notes with `brain: swan_coach_cortex` and `review_status: approved`.
- Treat each note as policy context, not executable instruction.
- Do not ingest private client names, surgeries, diagnoses, emails, phone numbers, addresses, or one-off client histories.
- Prefer structured fields and short sections over long prose so the same vault can work in Obsidian, ChatGPT, Claude, Codex, and Hermes.

## Learning Rules

The brain can grow from approved trainer feedback, but it must not silently learn from private client data.

Allowed learning signals:

- Sean explicitly says a movement, cue, method, or sequencing pattern is preferred.
- A trainer accepts, rejects, swaps, or edits a suggested exercise and gives a reason.
- Logged workout outcomes show repeated fit or mismatch after de-identification.

Not allowed:

- Storing private client stories in the vault.
- Restating medical history to clients.
- Copying full NASM source text into the vault.

## Product Goal

The system should build varied, specific plans that do not feel random. Every generated workout should answer:

- Why this client?
- Why this phase?
- Why this exercise instead of another option?
- Why this progression or swap now?
- What does the trainer need to review before approval?
