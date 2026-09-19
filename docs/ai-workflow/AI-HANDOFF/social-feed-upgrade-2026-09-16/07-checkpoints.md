# 07 — Checkpoint Protocol

**Package:** Social Dashboard Upgrade + SwanGuard↔SwanStudios Spotlight Bridge
**Doctrine:** `fable-blueprint-forge` Phase 3 · **Rule basis:** 17, 19, 41, 56, 61

The builder types; the architect reviews **every slice boundary**. Reviewing a diff costs a
fraction of writing the code, and it is the only thing that stops a weaker builder from filling
the package's gaps with its own judgment.

---

## Per-slice checkpoint

Run after each slice, before the next slice starts. Verdict is `PASS` / `REVISE (list)` / `HALT`.

1. **Acceptance criteria, with real output.** Every criterion in `MEGA-BLUEPRINT.md` §6 for that
   slice must be shown with the command that proves it and its actual output. A claim without
   pasted output is not evidence (rules 19/28).
2. **Drift scan.** Anything built that the package did not specify. Anything specified that was
   not built. Any §7 ban violated. Any file over 300 lines.
3. **Schema drift (rule 58).** For every touched model: does the model match the migration? Are
   nullable columns handled where the code assumes a value? Is the migration in the top-level dir?
4. **Verification hygiene (rule 56).** Does a broad claim ("tests pass", "tsc clean") distinguish
   slice-clean from baseline-clean? Is the command reproducible as written?
5. **Verdict.** `PASS` / `REVISE (list)` / `HALT`.

Drift found at checkpoint goes **back to the builder** — the architect does not patch it, or the
token economics invert.

## Review remit text (reuse verbatim)

> Act as a hostile reviewer, not a collaborator. Your job is to find the defect, not to confirm the
> work. For each finding: the file:line, the concrete failure mode, the user-visible consequence,
> and the severity. Verify by execution — do not trust the status line, the docstring, or the
> previous session's summary. A passing test that only greps source proves the string exists, not
> that the behaviour is correct. Report residual risk and anything you could not verify.

## Standing lenses (each pass gets a different one)

1. **Blueprint conformance & claim integrity** — does the artifact match its own status line?
2. **Security / authz / abuse** — can the endpoint be abused? Is every id comparison type-safe?
3. **Data integrity & schema drift** — model vs migration vs real DB; index semantics; FK actions.
4. **Frontend / product / design** — rules 22–25, tokens, touch targets, responsive, a11y.
5. **Ops / deploy / governance** — rule 42 pre-push audit, rollback, flags, lane hygiene.

## Checkpoint log

| Date | Slice | Verdict | Notes |
|---|---|---|---|
| 2026-09-18 | S1 Coach Signal | **REVISE → PASS** | 5 hostile passes. 1 CRITICAL (self-signal guard always false), 5 HIGH, 8 MED. All fixed with tests. See `HOSTILE-REVIEW-5X.md` / `FIX-LOG-5X.md`. |
| 2026-09-18 | S1.5 dock wiring | **PASS** | Dock mounted on the live Home feed; 5 wiring tests. |
| 2026-09-18 | S2 Proof Card | **PASS** | 13 backend + 9 frontend. Open: no live mount point yet. |
| 2026-09-18 | S3 Spotlight receive | **PASS** | 19 backend (real signed requests) + 12 frontend. Open: admin view. |
| — | S4–S8 | not started | — |

## Spend gate

Consult seats are spend-gated: ask Sean before using a paid model for authorship or checkpoints.
GLM 5.3 runs free on the existing Z.AI subscription and is the default checkpoint brain.
