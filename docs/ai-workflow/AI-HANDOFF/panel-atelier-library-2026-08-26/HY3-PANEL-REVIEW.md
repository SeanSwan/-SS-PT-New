# Review packet — the asset library · 2026-08-26 (loop iteration 5) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASSET-LIBRARY-REVIEW-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 2007 in / 7132 out | **Cost:** ~$0.0041 | **Wall:** 118.6s | **finish_reason:** stop

---

## VERDICT
REVISE — the data-access layer is only shape-tested against a real schema, leaving an unverified Sequelize/Postgres JSONB containment path that can 500 on the first filtered request.

## BLOCKERS
1. **P0** — Unverified `Op.contains` on a JSONB tag array will likely throw a dialect error at runtime. Failure scenario: client requests `/api/atelier/compose/assets?tags=brandkit:universal` → `assetLibrary.mjs` builds `{ tags: { [Op.contains]: [...] } }` → Sequelize emits invalid SQL for a JSONB *array* (wrong operator/casting) → 500 on the only listing endpoint, empty Assets tab for every user. Evidence: `backend/services/atelier/assetLibrary.mjs` (file named in §3, line number not supplied by document); explicitly unexecuted in §6.3 and §7 (“NOT proven: that the query executes”).

No other blockers with concrete file:line evidence are supplied by the document; the remaining items below are risks, not proven defects.

## ATTACKS
- **Correctness:** happy-path-only logic — 22 backend tests assert query *shape*, not execution; no Postgres exists, so dialect errors and `Op.contains` array behavior are untested (§7). Null/undefined — `req.user.id` is used as the sole owner scope; if auth middleware fails to populate `req.user`, the builder may emit a NULL/omitted WHERE clause (untested). Stale state — frontend `AtelierLibrary.tsx` (163 lines) gives no invalidation path when a new render is published; the “nothing made yet” vs “no match” empty state (§6.4) could lie after creation. Race conditions — cursor pagination over rapidly created assets can skip/duplicate rows; not addressed. Off-by-one — `hasMore` via fetch-one-extra-discard is fine for positive page sizes, but boundary/page-size=0 handling is unmentioned. Unhandled error paths — malformed cursor (base64/decode) and invalid filter values beyond the allowlist are not described; only unknown `kind`/`status` get `E_BAD_FILTER`.

- **Security:** authn/authz and IDOR — owner scoping is structural (no id param to tamper), which is good, but the actual column mapping is unverified (see drift). Injection — tag filter string is user-supplied into `Op.contains`; parameterization is assumed, not proven. SSRF — storage key intentionally never leaves server (§3), good. Secret handling — secret scan reported CLEAN. Replay/idempotency — not applicable to GET list. Multi-tenant scope leaks — if `MediaAsset` model column for owner differs from `req.user.id` field name, Sequelize may silently drop the scope or error; high blast radius. Rate-limit/DoS — `MediaAsset` declares no indexes (§4); every filter is a sequential scan, and no rate limit is mentioned, so a single user can impose full-table scans.

- **Data-truth / schema drift:** model column vs caller field drift — builder reads `req.user.id` but `MediaAsset` owner column name is not shown; a `userId` vs `owner_id` mismatch would break scoping or return wrong rows. PascalCase-vs-snake_case table drift — `MediaAsset` (PascalCase model) and `tags` JSONB column naming/convention not verified against migration. FK target drift — assets presumably reference Compose sessions; FK not described. Frontend response-shape drift — “client-safe view” shape is asserted only by frontend unit tests (9 tests) with no contract test against the real serializer. JSONB tag array is stringly-typed (`brandkit:universal`), inviting future drift (§6.2).

## HIGHEST RISK
The single most dangerous item is the **unverified Sequelize/Postgres query execution**, specifically the JSONB `Op.contains` filter and the owner-column mapping — a silent schema or dialect mismatch turns the entire Assets tab into a 500 for all tenants on day one. Cheapest de-risk: spin up a throwaway Postgres (or CI container) and re-run the existing 22 `assetLibrary` tests as integration tests against a seeded `MediaAsset` table; fix the builder until green. This is hours, not a rewrite.

## CONFIDENCE
What I could NOT verify from the document alone:
- The actual source of `assetLibrary.mjs`, `MediaAsset` model definition, and `AtelierLibrary.styles.ts` — only line counts and claims are present.
- Whether `MediaAsset` defines the owner column as `userId`/`ownerId` and whether `tags` is truly JSONB array (not `text[]` or JSON object).
- Whether the frontend respects house rules: styled-components only (no MUI), Crystalline Swan palette via `var(--token,#fallback)`, Dual-Button Glow, 44px touch targets, dark-first, WCAG 4.5:1 — none are mentioned, so compliance is unconfirmed, not violated.
- Whether the cursor codec is tamper-proof (signed) or plain encoded; and whether `req.user` is guaranteed by middleware.
- The exact SQL emitted for cursor tie-break (`createdAt|id`) and `Op.contains`.

Evidence that would settle it: the full diff of `backend/services/atelier/assetLibrary.mjs` and the `MediaAsset` Sequelize model, a CI log showing vitest run against a real Postgres with seeded rows, and the `AtelierLibrary.styles.ts` source to confirm styled-components + token usage. I am explicitly uncertain about anything beyond the document’s self-reported claims; I will not assert the query works because the author themselves admitted it is unexecuted.
