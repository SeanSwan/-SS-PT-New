# Swan Taste Brain — round 4: does it run dry? — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND4-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 49837 in / 7537 out | **Cost:** ~$0.0104 | **Wall:** 86.2s | **finish_reason:** stop

---

## VERDICT
REVISE — A fifth corpus door remains: non-Sean memories can store and print Midlibrary style codes via render intents and generated picks, bypassing all four closed layers.

## BLOCKERS
1. **P0** — Non-Sean memory receives and prints a licensed `--sref` corpus code through the render loop.
   - **Input/state**: `partner` (or `client`) project exists. Attacker (or the partner UI on loopback) calls `POST /api/make` with `{profileId:'partner', projectId:'x', prompts:[{prompt:'ocean light --sref 123456789', sref:'123456789'}]}` (or later a `grid-selection` event with `provenance:'local-comfy', sref:'123456789'`).
   - **Wrong output**: `mintIntent` writes the code to `intents.jsonl`; `listRenders` returns it; a later `compileProfile` for that memory keeps the generated pick (because `p.generated` is true) and includes `sref` in `picks`, which `/brief` and `/api/profile` print. Corpus style code leaves the owner's memory.
   - **File:line evidence**: `renders.mjs:64-88` (`mintIntent` validates sref format but not profile scope); `events.mjs:112` (allows `sref` for non-default when `provenance:'local-comfy'`); `profile.mjs:175` (filter `SHAREABLE_PROVENANCE.has(p.provenance) || p.generated` keeps generated picks with sref); `profile.mjs:71` and `:183` (sref field propagated into printed `picks`).

## ATTACKS
- **Correctness**: Happy-path-only validation in `mintIntent` (accepts any 5‑12 digit sref regardless of memory owner). No off-by-one or stale-state bugs found in the provided tally/compile path; `appendEvent` idempotency and never-show-twice look sound. `generateVideo` correctly uses `ownSubjects` pool for non-default (no sref call).
- **Security**: Multi-tenant scope leak is the live P0 above. Authn/authz: loopback-only bind and origin gate are documented but `checkWriteRequest` (origin.mjs) is not provided—cannot confirm it blocks cross-process writes. IDOR: namespace validation via `namespaceFrom`/`isProjectId` looks tight. SSRF: `comfyApi` enforces loopback hostname and `comfyPost` uses `redirect:'error'` (good). Replay/idempotency: event and intent content-hash dedupe present.
- **Data-truth / schema drift**: No Pascal/snake drift visible; `taste-profile.json` is written from `tally` output, not read as input. Frontend response-shape drift cannot be checked (no frontend code supplied).

## HIGHEST RISK
The render-intent sref leak (Blocker 1). Cheapest concrete de-risk before ship: in `mintIntent` (`renders.mjs`), reject `sref` and strip `/--sref\b/` from `prompt` when `profileId !== 'sean'` (treat style code as corpus material, exactly like `keepFor` already does). Additionally, in `compileProfile` (`profile.mjs:175`), map `sref: null` for any non-default pick to guarantee the brief never prints a code.

## CONFIDENCE
**Could NOT verify from the document alone**:
- `lib/origin.mjs` (`checkWriteRequest`) — the actual write gate; whether it truly limits to same-process loopback or can be spoofed.
- `swan-prompt.mjs` CLI — the `--keep`/`--rate` paths that Sean’s own memory uses; possible divergent validation vs `/api/keep`.
- `lib/images.mjs` — whether `loadImages` tags render records with corpus srefs from elsewhere.
- `fetch-photos.mjs` / `fetch-renders.mjs` and bundle export/import — explicitly named unchecked layers.
- The served `app.html` and `app-*.js` — frontend house-rule compliance (styled-components, Victory, Crystalline Swan palette, 44px targets, dark-first, WCAG 4.5:1, ≤300 lines/file) is **not verifiable** from backend code; no violation visible in provided files, but the “served page’s own JavaScript” door is unevaluated.
- `zero PII to LLMs` and credential phrasing (“26+ years / NASM-protocol”) are respected in the doc text, but the actual brief/output strings are not fully shown.

Evidence that would settle it: the missing files above, plus a regression test that mints a partner intent with a corpus sref and asserts it is rejected or stripped, and a brief-render assertion that `sref` is null for non-default memories.
