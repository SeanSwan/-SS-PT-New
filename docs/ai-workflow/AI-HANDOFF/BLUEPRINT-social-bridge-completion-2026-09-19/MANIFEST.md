# Package Manifest — Social Bridge Completion Blueprint

**Generated:** 2026-09-19 · **Last reconciled:** 2026-09-19 (corrections 1–7 applied)
**Source reply:** `ASTRA-PRO-REPLY.md` — Astra Pro (`openai/gpt-6-astra-pro`) via OpenRouter
**Packet:** `CONSULT-PACKET.md` — dispatched as v1, **known-defective**; see `VERIFICATION-NOTES.md` Part 1
**Cost / wall:** $2.67 · 6m19s · 41,798 output tokens · `finish_reason=stop` (not truncated)

---

## Read in this order

| # | File | Lines | Why |
|---|---|---|---|
| 1 | `CORRECTIONS-APPLIED.md` | 236 | **Start here.** What changed, where, and how each change was verified — the audit trail. |
| 2 | `G0-SOURCE-EXCERPTS.md` | — | **Gate G0, closed.** The six source excerpts Astra could not see, quoted verbatim. **Authoritative wherever this package disagrees with it.** |
| 3 | `VERIFICATION-NOTES.md` | — | Adjudicates Astra's ten findings: two packet defects, one finding refuted, one promoted to a live defect, seven corrections. |
| 4 | `HOSTILE-REVIEW.md` | 103 | PART A — Astra's hostile review, verbatim (including its errors). |
| 5 | `00-README.md` | 100 | Builder Contract, build order, how to use the package. |
| 6 | `01-architecture.md` | 264 | 6 Mermaid diagrams — `flowchart LR` ×1, `sequenceDiagram` ×3, `erDiagram` ×1, `stateDiagram-v2` ×1 — plus the logical schema and its primary-key convention. |
| 7 | `02-wireframes.md` | 238 | ASCII wireframes, desktop + 375px, empty/loading/error states. |
| 8 | `03-contracts.md` | 228 | Contracts, part 1 — release rule, common errors, SwanGuard operator APIs, SwanStudios admin read, impressions, pulse auth. |
| 9 | `03b-contracts-s6-s8-and-interfaces.md` | 211 | Contracts, part 2 — manifest reconciliation, faction ceremony, weekly digest, exported interfaces. |
| 10 | `04-build-order.md` | 204 | File-by-file, ordered so every slice leaves the app bootable. |
| 11 | `05-slices.md` | 343 | **The plan.** Executable acceptance criteria and STOP lines. |
| 12 | `06-bans.md` | 54 | The "do NOT" list. |
| 13 | `07-checkpoints.md` | 46 | Checkpoint protocol and review remit. |
| 14 | `08-decision-density-self-test.md` | 36 | PART C — remaining builder choices: decided, or delegated-with-bounds. |

Supporting: `ASTRA-PRO-REPLY.meta.json` (usage/cost telemetry), `ASTRA-PRO-REPLY.run.log`
(preflight → complete), `ASTRA-PRO-REPLY.partial.md` (superseded stub).

`03-contracts.md` was 426 lines, over the ~300-line builder-loadability budget. It was split
losslessly into parts 1 and 2 (228 + 211), verified by re-concatenation.

---

## Status: buildable; three deviations remain, all recorded

Gate G0 is **closed** (`G0-SOURCE-EXCERPTS.md`) and **corrections 1–7 are applied**
(`CORRECTIONS-APPLIED.md`). The SSRF defect is not just planned but **fixed, wired and verified** —
`backend/services/spotlightImageFetch.mjs` + 36 passing tests across 3 suites, mutation-tested.
Commit `fe388691f`.

Remaining, and each is stated rather than silently resolved:

1. **`BLOCKED-G0` markers that survive** are genuine and listed in `04-build-order.md`'s
   integration-edit table: SwanGuard's operator-navigation mount file, `bridge-policy.json`'s actual
   location and schema, and SwanGuard's migration convention. These need a source read, not a guess.
2. **`05-slices.md` is 343 lines**, over the ~300-line budget. Not split — the operator named it as
   *the plan* and fragmenting it would invalidate every reference to it. See
   `CORRECTIONS-APPLIED.md` → Known remaining deviations.
3. **`CREATE INDEX CONCURRENTLY` is unavailable.** SwanGuard's migration runner wraps every migration
   in `BEGIN`/`COMMIT` (`packages/database/src/migrationRunner.ts:379`, `:416`; asserted by
   `migrationRunner.test.ts:173,188,199`), so the `CONCURRENTLY` variant fails on deploy. Use ordinary
   `CREATE INDEX`. This invalidates the DDL Astra itself proposed.
4. **Two `__dirname`-in-ESM defects were blocking the SS-PT server from booting**, and were found only
   by importing the modules under plain `node` — vitest's Vite transform supplies a `__dirname` shim,
   so the suite was green while the runtime was dead. `services/photoStorageService.mjs:46` threw on
   *import* (~10 modules import it statically, so the app could not start);
   `core/middleware/errorHandler.mjs:21` threw at *request* time and 500'd every SPA route in
   production. Both fixed; guard added at `tests/unit/esmNodeLoadable.test.mjs`. See
   `CORRECTIONS-APPLIED.md` §8.

**Correction to a previous revision of this manifest.** It claimed `01-architecture.md` held
`sequenceDiagram` ×6, `erDiagram` ×2 and `stateDiagram-v2` ×2. The measured inventory is
`sequenceDiagram` ×3, `erDiagram` ×1, `stateDiagram-v2` ×1, `flowchart LR` ×1. A builder told there
are two ER diagrams would have hunted for a missing one. All line counts above are measured, not
estimated.

---

## Build order

Per `04-build-order.md` and `05-slices.md`. Build **ONE slice at a time**; after each slice, produce
the diff + the acceptance-criteria evidence, and **WAIT** for the checkpoint verdict before
continuing. Never claim a criterion passed without pasting its output.

## Provenance

- Packet SHA-256: `65272c98503fa6b1ba2452fd83d1f8a01d51e872811e6dce310201e2657cc193`
- Every outbound byte passed `scripts/lib/redact-egress.mjs` (rule 8); the instrument reported
  no matches on both the document read and the request body.
- The `openai/gpt-6-astra-pro` seat was confirmed live against OpenRouter's model list before
  dispatch (447 models; `$10/M` in, `$50/M` out, 1.05M context).
