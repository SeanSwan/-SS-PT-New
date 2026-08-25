---
decision: Six-seat hostile panel on the complete Compose ladder — arbitrated against the code; five fixes landed, one P1 deferred to its own iteration, the rest deferred to a ranked backlog
status: shipped
supersedes: none
---

# Panel synthesis — the complete Compose ladder · 2026-08-25

**Seats:** Ox Alpha, GLM-5.3, Kimi K3, Grok 4.6, Qwen 3.8, HY3 — all six returned. **Spend: ~$0.108** (Kimi $0.041, Grok $0.064, HY3 $0.003; three free seats).
**Verdicts:** Ox REVISE · GLM REVISE · Kimi REVISE · Grok REVISE · HY3 REVISE · Qwen REJECT.
**Final Decider:** Fable 5. Every ruling below was checked against the branch, not the packet.

## Confirmed and FIXED this iteration

| Finding | Seats | What landed |
|---|---|---|
| Published `<img>` snippet used a 4h signed URL — sites 403 after lunch; unpublish cannot retract a copied URL | all six | `GET /api/atelier/public/:id` (no auth, UUID-only, **published-only**) 302s to a fresh signed URL; snippet points at it; `Unpublish` revokes on the next request. Signed URL kept for **preview** only |
| Consent gate wired to nothing — no flag is ever set | all six | Publish now requires an explicit **human declaration** (`consentConfirmed:true` + `intendedUse`), refused with `E_PUBLISH_DECLARATION_REQUIRED` without it; the declaration is welded onto `provenance.policyFlags` with `confirmedBy`/`confirmedAt`; a *commercial* declaration on a grant-required run with no grant is **still refused** — the licence snapshot decides |
| Motion idempotency key bucketed per minute — a retry across :59/:00 queues twice | Ox, Kimi, Grok, HY3 | Key is now content-derived (asset + hash + prompt + duration + provider + seed); no wall-clock term |
| VRAM admission was check-then-act; the single-flight lock came after it | Ox, Kimi, Grok, GLM, Qwen | `reserveGpu()` is taken **before** the VRAM read at lane choice; the reservation travels with the batch and is released on every refusal path |
| R2 key had a month segment — same bytes twice = two objects, two rows, two publish states | Ox, Kimi, Grok, GLM | Key is `atelier/stills/<owner>/<sha256>.<ext>` — content-addressed, no date |
| `initImage` upload filename could collide across jobs (TOCTOU on ComfyUI input) | GLM | Already hash-derived with `overwrite` — now **pinned by a test** |

## Confirmed, DEFERRED to the next loop iteration (own hostile round)

- **Synchronous local `/stills` (~2 min inside one request)** — Ox, Kimi, Grok, HY3, GLM, Qwen. Real. Kimi's shape adopted: `202 {batchId}` for the local lane, stills persisted as each frame completes, `GET /stills/:batchId` polled by the UI (which already polls Motion). Hosted stays synchronous (seconds).

## Disproven against the code

| Claim | Seat | Why it does not hold |
|---|---|---|
| Consent gate is dead → H3 can ship commercially | Grok, GLM, Qwen | The **grant clause** (`commercialUse === 'requires-grant' && usedCommercially && !grantRecorded`) fires from the frozen licence snapshot; a test proves an H3 record is refused. The *consent* flags were empty, not bypassed — fixed above |
| IDOR on `POST /asset/:id/status` / `/reference` | Ox, Qwen, HY3, GLM | Every atelier route is `protect, adminOnly`; every mutation loads `findOne({ id, ownerUserId })` |
| Loopback pin is string-prefix and would pass `127.0.0.2` / DNS rebinding | Ox, Qwen | It is an exact hostname set `{127.0.0.1, localhost, ::1}`; `127.0.0.2` is refused; a literal IP has no DNS to rebind |
| `published → approved` (unpublish) unspecified | Kimi | It is in the transition table and tested |
| `permanent:true` on hash mismatch strands a re-uploaded asset | all | The key IS the hash: a re-encoded asset gets a new key/row; bytes under one key cannot legitimately change. Network/5xx failures are `permanent:false`; 404 and mismatch are permanent — GLM's own prescription |
| `spendGuard` undefined-seam unfixed | HY3 | Fixed in `383c218e9` (`E_PRICE_UNKNOWN`), with a test |

## Known limitations, stated

- Single-flight is in-process; the render **agent** is a separate process running Motion jobs. Admission reads live VRAM, so a running Motion job is visible to it, but two backend processes would not see each other. One backend process is the deployment shape today.
- `SWAN_ATELIER_MAX_SPEND_USD_DAILY` is enforced per batch until a ledger exists; `/limits` says so. Naming drift accepted until the ledger lands (backlog #1).
- ComfyUI `input/` accumulates hash-named bound frames; overwrite means re-runs reuse, but there is no GC. Backlog.
- A real render has not run on this branch (no ComfyUI/R2/DB in the build environment).

## Enhancement backlog (panel + Fable, ranked by value to a solo operator producing site assets weekly)

1. **Async local stills** — next iteration (above).
2. **Spend ledger** (daily, durable) — makes the env var name true; per-workspace caps ride on it.
3. **Workspaces + brand kits** — the multi-site promise; replaces `workspaceId` in `tags` with a real column/FK.
4. **Asset library with reuse search** — stop paying to make the same thing twice.
5. **Sequence + the shipped audio-sync engine** — the capability no subscription platform has.
6. **Taste feedback loop** — keep/reject → the taste server's `/api/rate` (with `/api/keep`); one corpus, both directions.
7. **Doctor surface** — the MCP handshake made visible; the allow-list as config (Sean's call).
8. **Batch/matrix** — one brief × N seeds × M archetypes, graded in a grid.
9. **ComfyUI input GC** + **prompt PII lint** on the hosted lane.
10. **FLUX.1-schnell as the free still fallback** if the Wan frame-0 probe fails (SWA-207).

## External-model calibration

| Seat | Real | Disproven | Cost | Read |
|---|---|---|---|---|
| Ox | 6 of 6 blockers had a real core; "usedCommercially has no source" was the sharpest | IDOR, loopback | $0 | Best structural reader; found the declaration gap precisely |
| GLM | 6 of 8 | consent fail-open, IDOR | sub | Best prescriptions (public route shape, hash-named uploads, permanent-vs-infra taxonomy) |
| Kimi | 4 of 5 | unpublish "unspecified", strand-on-reupload | $0.04 | Cheapest correct shape for async stills |
| Grok | 4 of 6 | "H3 can ship", IDOR-by-draft-URL | $0.06 | Longest, most repetitive; two real catches |
| HY3 | 3 of 4 | spendGuard "unfixed" | <$0.01 | Concise, accurate on what it could see |
| Qwen | 2 of 3 | consent bypass, IDOR, loopback | $0 | REJECT on wrong reads; still flagged the VRAM race correctly |
