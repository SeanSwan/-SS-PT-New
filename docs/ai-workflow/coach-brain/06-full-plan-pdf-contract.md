---
brain: swan_coach_cortex
domain: pdf_contract
review_status: approved
authority: sean_codex_2026_06_24
tags: [pdf, workout-plan, client-artifact, plan-vault]
---
# Full Plan PDF Contract

## Non-Negotiable Rule

Every planned training day must appear in the client PDF. No summary-only exports.

Example:

```text
3 sessions per week for 4 weeks = 12 workout days in the PDF.
```

If a trainer gives a client a PDF, the client should see the full workout for each planned day, not only a high-level block, phase, or mesocycle summary.

## Required Day Content

Each workout day should include:

- day number,
- week number,
- session name or focus,
- exercises in order,
- sets,
- reps or rep range,
- rest,
- tempo when available,
- intensity guideline when available,
- modifications or coaching notes when client-safe,
- warmup or preparation when generated,
- cooldown or flexibility work when generated.

## Save And Source Rule

The generated plan and the PDF must stay aligned. The full plan should be saved under the client and future Swan Coach generation should inspect the active saved plan before creating unrelated workouts.

PDF files must be saved under the client, attached to the saved workout plan, and updateable by admin or trainer when the plan changes.

## Privacy Rule

Client PDFs must follow `05-client-output-privacy.md`. They should give direct workout guidance without exposing sensitive client history.

## Future Runtime Acceptance Test

A future PDF exporter repair should prove:

- a 4-week, 3-day/week plan exports 12 day sections,
- each day includes its exercise list,
- the exported content comes from the saved/generated plan data,
- private history is not restated in client-facing copy.
