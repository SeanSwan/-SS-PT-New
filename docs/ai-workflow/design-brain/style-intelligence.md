# Style Intelligence — the Step 3.5 procedure (canonical detail)

- **Date:** 2026-09-02 · **Author:** Claude Fable 5 (Final Decider) · **Status:** CANONICAL within Design Brain scope
- **Authority:** `swan-design-router` LAWS > this file. The router's Step 3.5 names WHEN this runs; this file is HOW. On conflict, the router wins.
- **Reviewed:** GLM 5.3 REVISE→fixed (6 blockers), GLM Flash PASS, GPT-5.6 Sol REVISE→this revision (real API contract + last-known-good law). Panel: `docs/ai-workflow/AI-HANDOFF/panel-design-brain-style-intelligence-2026-09-01/`.

## When it runs (the applicability predicate — decided by what the task DECIDES)

Runs when the task (a) composes a generative-media brief (Forge/Seedance) or (b) establishes a NEW visual direction not inherited from an already-bound world/lens. A surface whose direction is fixed by the Step-3 bind **names that bind and its identity** (world id + lens id, e.g. `world:glacier-vault · lens:crystalline-dark`) in the receipt as its anchor and skips the rest — an unnamed "inherited" claim is not a skip, it is a violation.

## 1 — Two-axis pick (`style-taxonomy.md`)

1–3 QUALITY facets + 1 SOURCE category. Per facet, QUOTE its mapping line — preferred / requires-justification (state the justification) / banned (refuse). An unmapped facet defaults to requires-justification. A SOURCE or artist whose signature qualities ARE banned facets is a refused anchor. LAW-3 is the registry of record; the taxonomy mapping applies it — where they disagree, LAW-3 wins.

## 2 — Anchor form

Web surfaces anchor on facets + movement/era language ("Swiss-editorial grid," "Dutch still-life light") — never a named individual. The personification formula — "[Artist]'s [their actual medium] depicting [subject]", never "[subject] by [Artist]" — is for generative-media briefs (Forge slot 4) only.

## 3 — Taste check (the REAL API contract — verified against the taste-brain source 2026-09-02)

`GET http://127.0.0.1:7331/api/profile`. Treat the response as the Taste Brain ONLY if:
- `snapshot.schemaVersion === "taste-snapshot/1"` AND `snapshot.sourceHash` is 64 hex chars,
- `grids`/`judgements` numeric, `directions` an array.

Anything else on the port is `[TASTE BRAIN OFFLINE]`. Directions carry `id / tier / title / because / srefs? / themeWords? / prompts? / evidenceEventIds / note?` — there is no `name` and no `codes` field; a consumer reading invented fields silently reports empty taste.

- **Fingerprint is `snapshot.sourceHash`** (stable across unchanged evidence — it deliberately excludes timestamps); `generatedAt`, `confidence`, `grids`, `judgements` ride along as metadata. Never fingerprint on counts alone.
- **Evidence floor (taste-discovery-grill.md §6):** directions may STEER a pick only with ≥8 non-neutral judgements across ≥2 grids. Below the floor → record `INSUFFICIENT EVIDENCE`; priors are never consumed as measured taste.
- **Precedence is fixed: law → Step-3 bind → taxonomy → taste.** Taste RANKS lawful candidates; it never introduces a facet, never overrides a ban, and its magnitude is not acted on — carry tier + facet/theme words only (`evidence` / `prior`; neither backing → tier `absent`; never fabricate or upgrade a tier). Tallies and profile JSON never enter committed files. Agents read IDs/tallies, never images; never write taste.
- **Offline path:** proceed from doc priors. A dated local snapshot exists when `node scripts/taste-profile-snapshot.mjs` has captured one — snapshot at `.ai-workflow/taste-profile.local.md` (last-known-good, PRESERVED across outages), bridge state at `.ai-workflow/taste-profile.status.local.md`. Its tiers are copied verbatim, never upgraded; check its `as-of` line before leaning on it.

## 4 — Corpus reach (generative briefs only)

Attempt `node scripts/swan-brain.mjs "<style query>"`; ANY failure — script absent, node missing, error — records `[SWAN BRAIN UNAVAILABLE]` and the taxonomy carries the pick alone. Citations are `[query → hit ids]` — never pasted corpus text.

## 5 — STYLE RECEIPT (checkable, and the sole input to Forge slot 4)

In the brief/thread: facets + their quoted mapping lines · source category · anchor (form per §2, or the NAMED Step-3 bind identity) · taste tier + `sourceHash` fingerprint (first 12 chars) or OFFLINE/INSUFFICIENT EVIDENCE · corpus citations · a refused-facets line whenever law refused something taste favored. Direction changes after Gate 0 ⇒ re-run Step 3.5 and supersede (never delete) the receipt. Gate 1 verifies: receipt present, facets lawful, receipt still matches the surviving direction.

Taste evidence never overrides law: a banned facet a profile favors is recorded as taste and still refused as design.
