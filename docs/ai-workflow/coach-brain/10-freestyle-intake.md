---
brain: swan_coach_cortex
domain: intake
review_status: draft
authority: sean_glm_2026_08_16
tags: [freestyle, dictation, plaud, jarvis, intake, consolidation]
---
# Freestyle Intake

> **DRAFT — not ingestible.** Per `00-cortex-contract` Ingestion Rules, only notes with
> `review_status: approved` may be ingested. This note stays `draft` until Sean approves it.
> It records decisions Sean made on 2026-08-16; it does not self-approve them.

## Purpose

Freestyle intake is the mode where Sean talks for as long as he wants, with no schema and no
prompts, and Swan Coach turns the result into a clean structured summary he confirms before
anything is written. It is the Coach-side equivalent of what the PLAUD app does to a raw recording.

## Position In The Authority Stack

Freestyle output is **tier 6** (LLM drafting) until Sean confirms it. Confirmation converts each
item into a normal write, which is then governed by tiers 1-2 (safety, access control, current
client data). Nothing in a freestyle summary is a record. The summary cannot write directly.

## The Pipeline

1. **Capture** — unbounded talking. No prompts, no questions, no schema. Passive progress only.
2. **Consolidate** — dedupe fragments, restore chronological order, merge repeats, resolve
   contradictions.
3. **Disambiguate** — resolve client, date, and record type per fragment. Unresolved fragments
   become a clarification item; they are never dropped.
4. **Summarize** — grouped client → date → record type, with per-item confidence.
5. **Review** — per-item accept, edit, or reject.
6. **Confirm** — one gesture for accept-all; one tap per item to reject.
7. **Apply** — each item routes through its own existing proposal type.

## Contradiction Rule (Sean, 2026-08-16)

**Latest-wins, with a collapsible trace.**

When one detail is stated more than once ("three sets... actually four"), Coach keeps the **latest**
value and attaches a short trace to that item: `heard 3, then 4 — kept 4`.

- The trace is **collapsed by default** so the summary reads clean.
- One tap reverts to the earlier value.
- The earlier value is retained until the session resolves; it is never silently discarded.

Rationale: silent resolution is cleaner but unauditable — if Coach mishears the correction there is
no way to see it happened. The collapsed trace preserves PLAUD-grade cleanliness while keeping the
correction inspectable.

## Future-Date Rule (Sean, 2026-08-16)

**A future-dated item always routes to the plan, never to a workout log.**

A workout log is a record of something that happened. A future date is an intention. Future-dated
fragments become `plan_edit` proposals against the planned day.

- Copy: `added to plan` — never `logged`.
- Future-dated logging is **not** permitted, not even behind a flag.

Rationale: a pre-filled log for a session that never happens becomes a false entry in the client's
history and corrupts their progress charts. Data truth outranks the saved step.

## Duplicate-Date Rule

A fragment dated to a day that already has a workout log is **not** an error. Real training days get
backfilled, doubled, and corrected.

- The item becomes a **merge/append proposal** against the existing day.
- Sean chooses append, replace, or skip per item.
- `duplicate_date` remains an upload-failure kind on the **file** path only (see A9); it must not
  be a failure on the freestyle path.

## Privacy

- Names are mapped client-side. Consolidation runs on de-identified tokens; IDs out, names re-hydrated
  at render only.
- No client names, diagnoses, surgeries, or contact details enter this vault (`00-cortex-contract`).
- Session buffers are account-keyed and encrypted; see the freestyle retention contract.

## What Freestyle Must Not Do

- Write any record without explicit confirmation.
- Drop a fragment it could not place.
- Resolve a contradiction without leaving a trace.
- Log a future date.
- Send raw, un-tokenized transcript text to any model.
