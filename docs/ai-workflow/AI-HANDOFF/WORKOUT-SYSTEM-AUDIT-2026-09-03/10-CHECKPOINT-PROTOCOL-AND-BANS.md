---
decision: "Checkpoint protocol + bans shared by every blueprint in WORKOUT-SYSTEM-AUDIT-2026-09-03; a builder executes slices verbatim and submits evidence packages, never improvises"
status: open
supersedes: none
---

# 10 — CHECKPOINT PROTOCOL + BANS (shared by 01–09)

> Applies to every slice in `01-workout-logger.md` … `08-cross-cutting-upgrades.md`. The surface docs
> reference this file instead of repeating it. Format inherited from
> `BLUEPRINT-lens-world-fusion-2026-07-14/07-checkpoints.md` (proven through F0–F6).

## 1. Cadence
- One checkpoint per slice, at that slice's `STOP` line, BEFORE the next slice starts.
- One flag in flight at a time. Production green before the next slice begins (Rule 70 batch push:
  commit per slice locally, push the batch once, one Render deploy, one verification).
- A slice that touches billing (`POST /api/workout-forms` deduction path), auth, PII, or a public page
  additionally requires Sean's explicit go before push. Those slices are marked `SEAN-GATE` in the
  surface doc.

## 2. Builder submits (exact package, per slice)
1. **Canonical Surface Receipt** (Rule 26) pasted BEFORE the diff: route file:line, mounted JSX
   file:line, consumer hook, exact API path literal, backend route file:line, model fields quoted.
2. The full diff (`git diff <base>..HEAD` for the slice commits) — explicit paths staged only
   (Rule 67 R6; verify with `git diff --cached --name-only`).
3. Every acceptance criterion from the slice with its REAL output pasted underneath: test runs with
   counts, RED proof (stash the implementation, run the new tests, paste the failure), curl or
   supertest transcripts, DOM/computed-style dumps, screenshots at the widths the slice names.
4. **Test-delta table** (Rule 81) for every edited existing assertion: `File:line | Before | After |
   RE-ANCHOR|SILENCE | why`, reported BEFORE and separately from the pass count. A `SILENCE` row is
   a STOP, not a fix.
5. Rule 61 hostile self-review: what was attacked, what was found, what was fixed, how many rounds
   until dry. The `DRY-LOOP: CLEAN×2` marker and a `PROOF:` token are mandatory (Rule 74 hook).
6. Rule 42 backend audit output (both commands), `npx tsc --noEmit` exit line (run from
   `frontend/`; use `NODE_OPTIONS=--max-old-space-size=8192` if needed), `vite build` result,
   per-file line-budget table (`file → lines / budget`).
7. Rule 56 baseline disclosure: slice-clean vs baseline-clean, with the pre-existing failure list if
   the full suite is not green.
8. Open questions — expected to be EMPTY. Every surface doc §G pre-decides defaults so the builder
   never has to choose. If a real gap appears, the builder STOPS and files it; improvisation is a
   `REVISE`.

## 3. Reviewer remit (Kimi K3 is the standard Final Reviewer per Rule 46; free triangle acceptable for
S-sized doc-only or token-only slices; Fable only on Sean's explicit ask)
- Verify every criterion against pasted evidence — no evidence, no pass.
- Drift scan: built-but-not-specified, specified-but-not-built, any §4 ban hit.
- Re-run at minimum the slice's test folders + tsc (trust-but-verify).
- Second-vantage check (Rule 80) on any "X is broken / missing" claim in the package.
- Verdict: `PASS` (next slice) / `REVISE` (numbered list; same slice resubmitted) / `HALT`
  (architecture wound — amend the blueprint, log the amendment in §5, then resume).

## 4. BANS (categorical; a hit is an automatic REVISE)
**Stack / design**
- B1 No Material-UI, no Recharts (Victory only), no new carousel/drag/animation library.
- B2 No raw hex or rgb outside `var(--token, #fallback)`; fallbacks are Crystalline Swan only.
  Retired Galaxy palette (`#0a0a1a`, `#00FFFF`, `#7851A9`) is forbidden anywhere.
- B3 No file over 300 lines (tests, type-only files, seeds exempt). A slice may not GROW an already
  over-cap file (`WorkoutLogger.tsx` is pinned by an extraction test — net-neutral-or-better only).
- B4 No interactive element under 44×44px; no hover-only actions; no nested interactive elements.
- B5 No motion without a `prefers-reduced-motion` path; no autoplay media on product surfaces.
- B6 No hard-coded user-facing surface names — read `frontend/src/config/canonical-surface-names.ts`.
- B7 No "yoga"/"meditation" copy — use "stretching"/"flexibility".
- B8 No shared style fragment with `${}` interpolation as a plain template string — use `css\`\``.

**Data / backend**
- B9 The canonical workout save path is `POST /api/workout-forms`. Its request payload is
  billing-sensitive and golden-master locked (`backend/__tests__/dailyWorkoutFormRoutes.*.test.mjs`).
  No slice alters the payload shape, deduction semantics, or the route without a `SEAN-GATE`.
- B10 No new write path to `WorkoutSession` / sets outside the canonical save service. Legacy
  `workout_exercises` / `sets` tables are 0 rows in prod — never write to them.
- B11 Every new FK references `"Users"` / `"Exercises"` (PascalCase) — never the lowercase legacy
  tables. Every migration is additive with a clean `down`.
- B12 No raw SQL where a Sequelize model exists (table-name drift class — see CLAUDE.md Rule 58).
- B13 Zero PII to any LLM call: IDs and roles only (Rule 8). Prompts are built server-side.
- B14 No secret values in code, tests, docs, or fixtures. Env var NAMES only.
- B15 No new endpoint without `protect` + role/ownership guard + a supertest proving 401 and the
  cross-user 403/404 case.

**Process**
- B16 No `git add -A`, no amend/rebase/force-push (Rule 45/67), no `.skip` on a test a fix turned red
  without a `RE-ANCHOR` row explaining why (Rules 79/81).
- B17 No "done / fixed / complete / shipped" language without current-session proof + dry hostile
  pass in the same message (Rule 74). Docs and UI copy describe the trailhead, not the destination
  (Rule 75).
- B18 No deletion or move of a pre-existing file inside a feature slice. Dead-file candidates go to
  the surface doc's cleanup slice with grep receipts and wait for Sean (Rules 34/37/77).
- B19 No paid model spend without the spend-guard hook and Sean's per-run yes for Village/Fable
  (Rule 16). Kimi review is the routine gate; a matching completed review is reused.

## 5. Amendment + verdict log (append per checkpoint)
| Date | Doc / Slice | Verdict | Notes |
|---|---|---|---|
| 2026-09-03 | Package created | — | Audit + blueprint package authored from 8 parallel read-only audits of `origin/main@3887c8ef`. No slice built yet. |

## 6. Handoff prompt for the builder (paste to start any surface)
> Read `docs/ai-workflow/AI-HANDOFF/WORKOUT-SYSTEM-AUDIT-2026-09-03/00-MASTER-README.md`, then the
> ONE surface doc you are assigned, then this file. Then CLAUDE.md rules 26/42/43/58/61/67/70/74/79/81.
> Run `node scripts/lane.mjs digest` and claim your lane with the exact file list from the slice.
> Work in a fresh worktree off current `origin/main`. Execute the slice's steps in order — tests
> first, RED proven — and submit the §2 package at the STOP line. You have ZERO design latitude
> except where the slice text says `BUILDER-CHOICE`; every other decision is already made in the
> doc's §G defaults. If the doc is silent on something you need, STOP and file it — do not guess.
