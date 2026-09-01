# Swan Atelier — the complete Compose ladder · HOSTILE REVIEW + ENHANCEMENT PACKET — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-LADDER-COMPLETE-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 2383 in / 5632 out | **Cost:** ~$0.0033 | **Wall:** 86.0s | **finish_reason:** stop

---

## VERDICT
REVISE — the ladder as described ships a consent gate that never trips and a synchronous local render that will hang or falsely publish, both unacceptable for a commercial-safe studio.

## BLOCKERS
1. **P0 — Consent/publish gate fail-open (or non-functional).**  
   Failure scenario: `MediaAsset` record created with `consentConfirmed:false` (honest start state) and no pipeline code sets it; document states *"nothing in the pipeline sets a flag yet, so today the consent gate never trips"* (`publishAsset` module). Input: `POST /asset/:id/status` with `draft→published` on an asset with `consentConfirmed:false` → server returns success instead of refusing → commercial asset published with unconfirmed consent/attribution, violating the mandated fail-closed licence policy. File evidence: `publishAsset` (no line supplied).
2. **P0 — Synchronous local still lane blocks the HTTP worker.**  
   Failure scenario: `localStillLane` uses in-process single-flight and reads VRAM once; a 4-up batch at ~27s/frame ≈ 2 min inside one request (`composeStills` + `localStillLane`). Input: `POST /stills` with `SWAN_ATELIER_LOCAL_STILLS=probed` and 4 prompts → reverse proxy/gateway times out (504), client retries, orphaned VRAM reservation, possible duplicate generation. No async job contract exists. File evidence: `localStillLane` / `composeStills` (no line supplied).
3. **P1 — `spendGuard` undefined-vs-null seam.**  
   Failure scenario: document admits *"the seam where `undefined` fell through `spendGuard`'s `null` check was the first defect found"*; it now claims `E_PRICE_UNKNOWN` refusal but supplies no fix line. Input: hosted model with no price → `spendGuard(undefined)` passes the `null` check → unauthorized spend or missing error. File evidence: `spendGuard` (no line supplied).
4. **P1 — `motionBind` `permanent:true` on hash mismatch strands legit re-uploads.**  
   Failure scenario: `handlers/initImageBind` re-hashes at point of use; on mismatch it sets `permanent:true` (§3 Q1). Input: asset bytes corrected and re-uploaded → bind refuses forever, no recovery path for a valid asset. File evidence: `handlers/initImageBind` (no line supplied).

(No further blockers invented; the above are drawn directly from the document’s own admissions.)

## ATTACKS
- **Correctness:** Happy-path-only — 195+ backend tests inject collaborators; *nothing* proven against real ComfyUI/R2/DB. Stale state — VRAM admission read once can be stale under concurrent batches. Race — single-flight is in-process only; multiple Node instances bypass it. Off-by-one / idempotency — `motionBind` derives key per asset+hash+prompt+**minute**; submission at minute boundary or retry after >60s creates duplicate queue tickets. Unhandled error path — half-failed bind (uploaded to ComfyUI, job failed, hash mismatch) leaves orphaned input with no cleanup. Null/type — `consentConfirmed:false` never set, so gate logic is either dead or inverted.
- **Security:** Authz — `GET /asset/:id` claimed owner-scoped but no token/ownership check evidenced; sequential IDs → IDOR risk. MCP — `stop_comfyui`/`free_memory` reach no consent gate (local, but unguarded). Multi-tenant scope — `workspaceId` rides in `tags` while `MediaAsset.projectId` FK left null; second site will query by tag only, no relational isolation. Rate-limit/DoS — local lane has no request timeout or queue admission from HTTP layer. Secret handling — env vars `SWAN_ATELIER_*` appear OK; no LLM PII noted.
- **Data-truth / schema drift:** FK target drift — `MediaAsset.projectId` is a `content_projects` FK left null while workspace encoded in tags; first break when a second site arrives is referential integrity + wrong-scoped listing. Key drift — §2.1 says R2 key = `sha256`; §3 Q4 says `sha256 per owner per month` (two objects for same bytes in different months) — unspecified schema. Frontend response-shape — Compose UI reads `/limits` first, but `/limits` admits no daily ledger (per-batch ceilings only), so UI may render “safe” state that isn’t. No PascalCase/snake_case conflict explicitly shown.

## HIGHEST RISK
The **fail-open / non-tripping consent gate** is the single most dangerous item: it can silently publish assets lacking licence consent or required attribution, exposing the operator to commercial licence violation — the exact thing the studio was built to prevent.  
Cheapest concrete de-risk before ship: in `publishAsset`, add an explicit guard that reads `consentConfirmed`, `requiredAttribution`, and `grantRequired` from the frozen provenance and returns `422` with reason if any unset; add a test that attempts `draft→published` with `consentConfirmed:false` and asserts refusal. Also add a minimal admin action that sets the flag from an explicit confirmation signal (e.g., a Publish panel checkbox wired to a `PATCH /asset/:id/consent`).

## CONFIDENCE
**Could NOT verify from the document alone:**  
- Actual source compliance with the binding house rules: styled-components only, Victory charts only, Crystalline Swan `var(--token,#fallback)`, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1, ≤300 lines/file, zero PII to LLMs (IDs only), “26+ years / NASM-protocol” phrasing. The prose repeats the rules but provides no code excerpts or line counts.  
- Whether the `spendGuard` undefined fix and the consent-gate logic are actually merged or just described.  
- Real ownership enforcement on `/asset/:id` and `/asset/:id/reference`.  
- The exact R2 key construction (sha256 vs owner/month) and the `MediaAsset` schema.  

**Evidence that would settle it:** the raw diff of PR #73 (file lengths, component imports, chart imports), a grep for `MUI`/`recharts`, a read of `publishAsset.mjs` + `spendGuard` source, and an integration test run against mocked R2/ComfyUI asserting refusal on `consentConfirmed:false`. I am explicitly uncertain whether the consent gate is merely unimplemented or implemented inverted; the document’s wording contradicts itself, and I will not guess.
