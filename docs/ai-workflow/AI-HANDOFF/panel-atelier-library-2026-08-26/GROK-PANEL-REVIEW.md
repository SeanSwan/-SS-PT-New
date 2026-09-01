# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Served:** `x-ai/grok-4.6`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-ASSET-LIBRARY-REVIEW-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 2210 in / 9746 out · **Cost:** ~$0.0627 · **Wall:** 194.5s · **finish:** stop

---

## VERDICT
REVISE — owner-scoped cursor + allowlisted filters are the right list shape, but this still cannot identify a render (no bytes, no prompt excerpt) and the only Postgres-facing code is untyped `.mjs` whose SQL has never run.

## BLOCKERS
1. **P1 — same-batch assets are indistinguishable, so the stated gap is not closed.** Inputs: one Compose run writes four candidates that share `kind`, `status`, millisecond-adjacent `createdAt`, and tags like `brandkit:universal`. Output: `AtelierLibrary` cards show dimensions, not the image (§3, §6.5); prompt text is withheld (§4, §6.1). Operator cannot tell which row is “the glacier one” and will bind the wrong still to Motion. Cheap fix is not unverified `to_tsvector` — it is a signed thumbnail URL and/or a promoted `prompt_excerpt` column for display only.

2. **P1 — `listAssets` is shape-tested only; tag filter can 500 or match nothing.** Inputs: allowlisted `tags` filter → `Op.contains` on a JSONB array (`assetLibrary.mjs`, 181 lines; §6.3, §7). Output: if `tags` is JSONB-array vs PG `TEXT[]` vs JSONB-object, Sequelize `@>` is the wrong operator or the bind is a string not an array (`@> '"brandkit:universal"'` vs `@> '["brandkit:universal"]'`). Every tagged list is empty or errors. 22 tests asserting clause shape will all go green.

3. **P1 — HTTP authz wiring is not in the landed set, so “structural owner scope” is unproven at the boundary.** Landed files are the query builder, its unit tests, and the tab (`assetLibrary.mjs`, `AtelierLibrary.tsx`; hub pointer `ContentStudioHub.tsx:183`). `listAssets` still receives a `userId` from *someone*. Failure: a route that does `listAssets({ userId: req.query.userId })` (or forwards the decoy `ownerUserId: 9` the test already injects) → IDOR across owners. Builder-level tests cannot catch that.

4. **P2 — unindexed `MediaAsset` list is a sequential scan on what is almost certainly a shared table.** §4: model declares no indexes; filters include JSONB containment; `hasMore` is `LIMIT n+1`. Failure: any authenticated user paging `/api/atelier/compose/assets` seq-scans all media, not “one operator’s atelier rows.” Fine only if this table is empty and atelier-only — neither is evidenced.

## ATTACKS
- Correctness: Happy-path is “builder emits WHERE owner = req.user.id.” Untyped `assetLibrary.mjs` is outside `tsconfig.atelier.json` even after the glob fix (§5) — `tsc` still does not touch the Postgres code. Cursor `createdAt|id` is the right tie-break for same-ms stills, but codec round-trip (Date vs ISO vs timestamptz, sort direction on `id` matching the inequality) is unexecuted; a mismatch skips one of the two stills they designed the cursor to keep. Empty-state split (“nothing made” vs “nothing matches”) is correct *only if* “filter active” ignores defaults; a default `kind` makes a brand-new owner see “nothing matches” forever. Unknown `kind`/`status` → `E_BAD_FILTER` is right, but a frontend `undefined` serialized as `"undefined"` 400s the list. `hasMore` via extra row: if the extra is not discarded, page size is off-by-one and the next cursor double-starts. No refetch contract after Compose — library stays stale until remount. Reuse (select into Compose/Motion), delete, and actual bytes are absent; a list without retrieve is a catalog of ghosts.

- Security: Owner grain is `req.user.id`, not workspace/studio — in a personal-training SaaS that is either an IDOR-by-teammate hole (too loose) or a studio-owner blind spot (too tight). Storage key never leaving the server is correct; collapsing that into “no URL at all” guarantees the next PR will put the raw key on the card to get a thumbnail. Cursor is `createdAt|id`, not an opaque HMAC — forgeable; owner scope contains the blast, but it leaks id/timestamp density. No page-size cap stated (client-controlled `limit` + unindexed `n+1` = cheap DoS). No rate limit. No get-by-id in this slice; when it lands, IDOR lives there, not in the list. Provenance JSONB on the client-safe view is unspecified — if included, prompts and internal paths ship to the browser; if stripped, cards have even less identity. Zero evidence of authn middleware on `/api/atelier/compose/assets`.

- Data-truth / schema drift: `MediaAsset` columns are not in the packet; builder vs model vs table name (`MediaAsset` / `media_assets`) is the exact PascalCase-vs-snake_case drift this house keeps paying for. Write-path `status`/`kind` vocab vs list allowlist: if Compose persists `succeeded` and the allowlist is `ready|published`, those rows are unlistable-by-filter or the UI never offers the real status. Tags as `brandkit:universal` in a JSONB array are stringly-typed FKs; GIN-able, but `Op.contains` shape ≠ array-containment semantics, and the write path can drift (`brand:universal` vs `{brand:"universal"}`) into permanent empty results. Frontend `AtelierLibrary.tsx` vs “client-safe view” response shape is unshown — camelCase DTO vs snake_case Sequelize is the usual silent-empty table. `VideoLibraryV3` (`ContentStudioHub.tsx:184` → `/api/v2/videos/collections`) is a different store; publish-to-Motion can fork the same work into two IDs with two statuses and no join key.

House rules: every landed file is ≤300. `.styles.ts` is compatible with styled-components, but the packet does not show `var(--token,#fallback)`, Dual-Button Glow, 44px targets, dark-first, or WCAG 4.5:1 — treat as unverified, not as a pass.

## HIGHEST RISK
Unexecuted Sequelize JSONB `@>` on unindexed `MediaAsset`, reached through an unshown route. Cheapest de-risk before ship: one real-Postgres test (testcontainer is enough) that inserts two rows with the same `createdAt`, distinct ids, and `tags = ["brandkit:universal"]`, then asserts page-1/page-2 and tag filter; add `(owner_user_id, created_at DESC, id DESC)` in that same migration. In the same pass, mint a short-TTL signed URL in the client-safe view so the card can render pixels without ever emitting the storage key.

## CONFIDENCE
Could not verify (packet is restated claims, not source): the route handler that copies `req.user.id` into `listAssets`; the actual `MediaAsset` migration/columns/types; whether `tags` is JSONB array, JSONB object, or PG array; generated SQL for `Op.contains`; cursor codec; page-size bounds; client-safe DTO fields; `AtelierLibrary.styles.ts` tokens/contrast/touch/glow; whether unpicked Compose candidates are even committed as `MediaAsset` rows with the statuses the allowlist accepts. Settling evidence: the route file, `\d media_assets` (or equivalent), the INSERT+SELECT integration test above, the client-safe view snapshot, and the styled card CSS. I am confident in the product hole (list without likeness or excerpt); I am not confident the HTTP boundary is safe.
