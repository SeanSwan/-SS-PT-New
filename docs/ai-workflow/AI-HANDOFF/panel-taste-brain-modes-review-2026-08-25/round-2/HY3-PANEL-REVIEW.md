# Round 2 — Swan Taste Brain: verify the round-1 fixes, attack the P2 render-loop contract before it is built — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET-R2.md
**Seed:** (none)
**Tokens:** 8682 in / 12115 out | **Cost:** ~$0.0076 | **Wall:** 239.3s | **finish_reason:** stop

---

## VERDICT
REVISE — the printed validation makes undo impossible without dummy candidates and the P2 mint endpoint bypasses the only origin gate, both are ship-blocking contradictions of stated laws.

## BLOCKERS
1. P0 — lib/events.mjs:validateEvent. The unconditional check `need(Array.isArray(e.candidates) && e.candidates.length > 0, 'candidates must be a non-empty array')` (§2, before event-type switches) applies to `reversal` events, but a reversal only carries `reversalOf` (validated later). Concrete failure: input `{eventType:'reversal', reversalOf:'<24hex>', source:'sean', profileId:'sean', sessionId:'<hex>', presentedAt:ISO, medium:'x', brandContext:'y', generatorDistribution:'z', candidates:[]}` → validateEvent returns error, appendEvent returns `{ok:false}`, so the documented "Undo last grid" law is non-functional. No client is shown sending candidates on reversal.

2. P1 — lib/routes-modes.mjs (GET /api/prompt) + serve.mjs (POST gate). The P2 contract (§4.1) says minting intents is a write "behind the origin gate," but the only gate in serve.mjs is `if (req.method === 'POST') { checkWriteRequest… }`. `/api/prompt` is handled on `GET`. Scenario: foreign Origin browser issues `GET /api/prompt?profile=partner&project=x&intent=1` → server writes `<namespace>/renders/intents.jsonl` and returns prefix, bypassing the 403 enforced for POST routes. Unauthenticated (origin-wise) state mutation on loopback.

3. P1 — §4.4 render serve. `GET /renders/<token>/<n>` streams a PNG if `<token>` is in "some intents file the requesting namespace owns," yet the URL carries no profile/project segment. Scenario: profile `sean` has projects A and B; token minted under A is requested by a page acting as B (same loopback origin) → server composes filename from token (which exists in A's intents) and streams it, leaking one memory's renders to another. Multi-tenant scope leak.

(No other blockers found; the malformed `tally` excerpt in §2 is a documentation splice error, not confirmed code defect.)

## ATTACKS
- Correctness:
  - Happy-path-only: `validateEvent` trusts `it.reasonLockedBeforeReveal === true` as a client-asserted boolean; no server proof the reason was locked before reveal.
  - Null/undefined/type: `evidenceLoved` maps `r.key` to `byCode` keyed by `c.code`; if `profile.srefs[].key` ≠ `corpus.sref[].code` (schema drift), `style_name` silently null but still counted.
  - Stale state: `appendEvent` duplicate check uses `fs.readFileSync(file).includes('"eventId":"'+id+'"')` — a substring match that could false-positive if another field embeds that hex, or false-negative if JSON formatting changes.
  - Race: sync fs mitigates within a tick, but `readEvents(dir)` inside `appendEvent` re-reads after duplicate check; if any async I/O is introduced later, two requests could both pass never-show-twice.
  - Off-by-one: `probeFor` exhaustion is `out.candidates.length < n` — acceptable but hint wording "nearly every" may mislead at exactly n-1.
  - Unhandled error paths: `readEvents` / `readProject` not shown to catch corrupt JSONL; a single malformed line would throw and 500 the request.

- Security:
  - Authn/authz/IDOR: GET mint (Blocker 2) and render token cross-project (Blocker 3).
  - Injection: `keepFor` builds markdown via `md.replace(/(## Kept\n)/, '$1- ${text}\n')`; a prompt containing a newline then `## Kept` could inject extra sections, but it's local file and low risk.
  - SSRF: none in supplied code.
  - Secret handling: 12-hex token is low entropy but local-only; acceptable.
  - Replay/idempotency: eventId includes `presentedAt`, so replay with new timestamp is refused by never-show-twice (good); but `duplicate:true` only detected per session file, not cross-session same content.
  - Multi-tenant scope leaks: render serve (Blocker 3); also `poolFor` uses `SHAREABLE_COLLECTIONS` but ignores `SHAREABLE_PROVENANCE`, potentially surfacing non-shareable provenance if collection is photo/webb.
  - Rate-limit/DoS: no rate limit on `/api/prompt` GET or mint; loopback only limits exposure.

- Data-truth / schema drift:
  - Model column vs caller field: `SHAREABLE_PROVENANCE` defined in projects.mjs but never referenced in `poolFor` (drift between licence law and implementation).
  - PascalCase-vs-snake_case: not observed.
  - FK target drift: `reversalOf` must match `eventId` (24-hex) produced by `eventIdFor`; consistent.
  - Frontend response-shape drift: `/api/prompt` returns `tasteMeta` with `keywords: taste.keywords.length` but `tasteFor` for non-Sean returns `keywords` array; for Sean returns `...base` which may have `keywords` length; shape seems consistent but unverified.

## HIGHEST RISK
The single most dangerous item is the GET-based intent minting that writes files without the origin gate (Blocker 2). Cheapest concrete de-risk before ship: change the mint action to `POST /api/intent?profile=&project=` (or extend `checkWriteRequest` in serve.mjs to also gate any request with `intent=1` regardless of method) and have the ComfyUI node POST rather than GET. This closes the unauthenticated write path with a one-line guard.

## CONFIDENCE
What I could NOT verify from the document alone:
- Full file lengths (≤300 lines/file rule) — only excerpts shown; cannot confirm compliance.
- Frontend house rules: styled-components only, Victory charts, Crystalline Swan palette `var(--token,#fallback)`, Dual-Button Glow, 44px touch targets, dark-first, WCAG 4.5:1 — no frontend code in packet; I flag that I see no violation but cannot certify.
- The real body of `tally` in lib/profile.mjs (§2 excerpt is syntactically broken: `reversals: events.filter(...).length };` then dangling comment) — cannot confirm undo/tally partition math.
- Behavior of `selectProbe`, `words`, `confidenceOf`, `checkWriteRequest`, CORS headers, and `readEvents` error handling — not supplied.
- Whether `SCHEMA_VERSION`, `EVENT_TYPES`, `MEDIA`, `BYTES_RE`, `SESSION_ID` etc. are consistent across modules.

Evidence that would settle it: full source of `lib/events.mjs`, `lib/profile.mjs`, `serve.mjs`, `lib/routes-modes.mjs`; the frontend component files; and the headless-Chromium 41/41 test log showing undo and foreign-Origin 403 by route (specifically that POST is blocked but GET mint was not tested). A confident wrong answer avoided by stating these gaps plainly.

House-rule check: document respects zero PII to LLMs (IDs/roles only), contains no "yoga/meditation" language, and does not mention credentials; no MUI/Recharts present. No violation observable, but frontend-specific rules unverifiable from backend snippets.
