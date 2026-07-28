# 06 — Bans (do NOT)

## House rules (restated for a context-free builder)
- NO Material-UI. styled-components only. Shared style fragments containing `${}` interpolation
  MUST be wrapped in the `css` tagged template helper (plain template strings crash
  styled-components at mount — build passes, prod crashes).
- NO hardcoded colors — `var(--token, #fallback)` with the fallbacks given in 02 only. NO retired
  Galaxy-Swan palette (`#0a0a1a`, `#00FFFF`, `#7851A9`).
- NO Recharts/Chart.js — Victory only (no charts in Phase 1 anyway).
- All interactive elements ≥44px. Dark-first. WCAG 4.5:1. No hover-only actions.
- NO files >300 lines — extract before you cross it.
- NO "yoga"/"meditation" strings anywhere — "stretching"/"flexibility".
- NO "NASM-certified" anywhere — allowed credential wording: "NASM workshop-trained",
  "NASM-protocol", "26+ years experience".
- User-facing text never says "AI" — it's "Swan Coach".
- Zero PII to LLMs; and NOTHING in this phase sends knowledge/client data to any LLM at all.
- Every FK to users → `{model:'Users', key:'id'}` (capital U). Never `users`.
- NO `git add -A` — stage explicit paths. Commits `type(scope): description`. NO amend/rebase/
  force-push. Push once at batch end.
- NO editing files outside the 04 list. NO drive-by refactors, comment cleanups, or formatting of
  neighboring code. Every changed line traces to this package.

## Package-specific bans
- Do NOT modify any EXISTING table (no ALTER on Exercises, WorkoutPlan, etc.). Additive
  migrations only. Local dev DB IS production.
- Do NOT create a new audit-log table — reuse `AiCommandAuditLog`.
- Do NOT create a separate `rule_approvals` or `regression_events` table (approval = fields on
  knowledge_rules; regression = `direction` enum on progression_events).
- Do NOT store source-file bytes, repo paths, drive paths, or http(s) URLs in
  `source_files.storageLocation` — external pointer schemes only; the API must reject others.
- Do NOT paste any passage from NASM textbooks/course materials into seeds, tests, fixtures, or
  comments. Test fixtures use invented generic coaching text. Citations are metadata pointers,
  never quoted content.
- Do NOT invent citations, page numbers, workshop details, editions, publication years, or
  credentials beyond what 03 §3.5 specifies (the founding catalog is exactly 10 sources — no
  extra books, no guessed editions; unknown fields stay NULL). Unknown citation detail = null +
  citationLevel level5.
- Do NOT touch `workoutBuilderService.mjs` candidate logic — Phase 1 only makes rules AVAILABLE
  on the policy object (consumption is Phase 3).
- Do NOT change existing exports/signatures of `swanCoachCortexService.mjs`; additive only.
- Do NOT auto-enable the flag anywhere (no default 'true', no docker/env file edits, no Render
  changes).
- Do NOT let clients write progression events or read other users' events (403).
- Do NOT hit `/api/onboarding*` or touch onboarding files — intake cleanup is a SEPARATE
  approved pass, not this package.
- Do NOT diagnose/medical language in any user-facing string: use "movement limitation",
  "modification recommended", "medical review recommended".
- Status `sean_approved` can ONLY be reached via the status endpoint with a change note — never
  settable at create/update. Rule_versions rows are never updated or deleted by any code path.
- If the package is silent on something that matters: STOP and ask. Do not improvise.
