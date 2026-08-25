# Fable synthesis — round 2: the fixes verified, the P2 contract attacked on paper, then built (SWA-186, 2026-08-25)

**Seats:** GLM-5.3 · Kimi K3 · DeepSeek V4 Pro · HY3 in the main run; **Ox Alpha 429'd upstream and was retried once (free) → `ox-retry/`**. All five **REVISE**. Spend: Kimi $0.0918 · DeepSeek $0.0239 · HY3 $0.0076 · Ox/GLM $0 → **≈ $0.12**.
**Method:** every finding checked against the code before acting (Rule 30). Fixes shipped as taste-brain `6be20b8` (laws) and the P2 commits after it; proof: `test-renders` 38 · `test-taste-namespace` 26 · `test-modes` 71 · `test-bundle` 28 · `test-probe` 81 · `test` 52 PASS; headless-Chromium **53/53** incl. the render loop and the Python node.

## 1. Consensus (two or more seats)

| Finding | Seats | Verdict | What changed |
|---|---|---|---|
| Minting intents on `GET /api/prompt?intent=1` bypasses the POST-only origin gate (drive-by `<img>` from any site) | GLM B2, DeepSeek P0, HY3 B2, Ox B3 | **verified — a contradiction inside my own contract** | Minting is `POST /api/intent`, behind the gate; proven: foreign-Origin POST → 403. The ComfyUI node POSTs. |
| Render events would fail `validateEvent` (`url` must be http(s); enum doubts) | GLM B1, Kimi B1, Ox drift | **half-verified** — the URL shape was real; `local-comfy` was already in both enums (packet did not show them) | Render candidates carry absolute `http://127.0.0.1:7331/renders/…` URLs; Kimi's 10-line contract test exists and passes (`test-renders`: "the §4.5 render grid event validates"). |
| Replay/never-show-twice covered grids only; `pair` events still replay | GLM B4, Kimi B3, Ox B2 | **verified** | The writer's guard now covers `pair` too; §1's "replay refused" wording was an overclaim, corrected. |
| `tasteSource: 'evidence'` for a words-only memory | GLM B6, Kimi B4 | **verified** | One vocabulary: `markdown` · `markdown+evidence` · `evidence` · `words+kept` · `words` · `empty`; tested. |
| `tasteFor` calls `keepFor` without a prompt → broken partner taste | DeepSeek P0, Ox B1 | **refuted** — it called the READ helper `keptFor`; the suite already proved `kept.length` | Two seats misread it independently, so the naming was a trap: renamed `readKept`. Recorded as calibration, not as a bug. |
| Renders should count **0** toward style tallies, not 0.5 | GLM (c), Kimi (e) | **accepted** | `tally`: a `local-comfy` judgement counts 1.0 toward subjects and its own `renders` tally, **0** toward reasons/srefs/provenance; tested ("ZERO style evidence from renders"). |
| Generated picks must not feed keywords (the partition undone one file away) | GLM (a) | **verified** | `tasteFor` filters `generated` picks out of `keywordsFrom`; tested. |
| Bundle import is not atomic (half-applied file) | GLM B5 | **verified** | All-or-nothing by default: `/api/judged` + a two-pass importer; exact duplicates are not conflicts (the browser proof caught my first version refusing a legitimate re-import); `--partial` opts out. |
| `/renders/<token>/<n>` namespace binding unspecified (cross-memory reads) | Kimi, HY3 B3 | **verified (contract)** | URL is `/renders/<profile>/<project>/<token>/<n>`; the token must exist in THAT memory's intents; tested ("wrong memory for a real token → null"). |
| Pool exhaustion / intent growth / TOCTOU on serve | Kimi | **accepted** | Intents capped at 2,000 per memory with a prune hint; `fetch-renders --prune`; serve re-stats size and sniffs magic bytes at request time. |

## 2. Contradictions, and the ruling

- **"One floor, not two" (Kimi B4)** — I adopted a per-code ≥2 floor; the positive-control test then showed Sean's real 18 judgements yield **zero** endorsed codes and his tie-in silently regressed to *words-only*. **Ruling:** the two floors are different things and stay different, documented in code: the compiler's *direction* floor is 2 closest **summed** over the top codes; a *code* is endorsed by one closest with a positive margin (weight 4; two or more → 5). Kimi's objection was to my packet's wording, which claimed one floor; the wording was wrong, the mechanism was right.
- **HMAC bundles / server-issued sessionId (GLM, Kimi, round 1 repeated)** — still rejected for a two-user loopback tool; the origin gate + the writer laws bound what a tampered file can do.
- **HY3 P0 "reversals fail the non-empty-candidates check"** — refuted: a reversal carries the undone grid's candidates (page and tests both do); the written law now says so.
- **Kimi B2 `/api/keep` traversal** — refuted (`readProject` slug-validates before any path is composed) but hardened at the route anyway; proven with a traversal-shaped `profileId` → 400.

## 3. Unique insights kept

- **Ox:** dedupe intents on a content hash so re-rendering the same prompt cannot launder one opinion into repeated evidence → tokens are `sha256(memory|prompt|seed|sref)[:12]`, idempotent; name sizes `sizeBytes`; cap kept-prompt length; symlinks in the output dir refused (`lstat`).
- **Kimi:** double-undo storms → a second reversal of the same grid is a no-op duplicate; a `pair` blocks pictures like a grid does — consistent, and the message says "judgement".
- **GLM:** `localStorage`-shared memory choice across tabs — mitigated by the pill and by every write response naming the memory; the ComfyUI `Keep` node now carries profile/project.
- **DeepSeek:** ingest must not write on GET → the scan is on-demand and writes nothing; `/renders` path composed with `path.resolve` + prefix check.

## 4. Blind spots the panel exposed in the author

- My packet's §1 claimed "replay with a new timestamp → refused" as a general law when the code enforced it for grids only.
- My P2 contract said "behind the origin gate" about a GET — the gate I had quoted six paragraphs earlier is POST-only.
- I adopted a reviewer's floor without measuring it against the real memory; the instrument (positive control) caught it, not me.
- My first all-or-nothing importer refused a legitimate re-import (duplicates are not conflicts); the browser proof caught it.

## 5. What was built after this round (P2 — the render loop, v1 pull)

`lib/renders.mjs` (intents · scan · safe file resolution · sniff · prune), `lib/routes-renders.mjs` (`POST /api/intent` · `GET /api/renders` · `GET /renders/<p>/<j>/<token>/<n>` with nosniff, size caps, magic-byte refusal), `renderProbeFor` (`pool=renders`, never mixed, never-show-twice, exhaustion stated), the tally partition, video-aware judging (`<video>` in the well, film reason codes, prompt revealed after lock), "My renders" on the probe page, "Renders you liked" on the brief, "Send to ComfyUI" on the prompt page, the ComfyUI node (profile · project · mint → `prefix`; Keep per memory), `fetch-renders.mjs`, PNG fixture writer, `test-renders.mjs` (38). Output dir from config (`SWAN_COMFY_OUTPUT` → `prompter/comfy.local.json` → `Z:\SwanStudios-Video\output`), absent → stated, never a crash. On this desktop ComfyUI writes **video** (MiniMax H3 → mp4) — handled as `kind: video`.

**Not proven in the browser:** a real decoded clip in the well (fixtures are PNG + an `ftyp` stub); no HTTP Range support yet (seeking); older saved ComfyUI workflows must re-add the node's new inputs. **Next:** v2 push ("Make 4" posts a workflow to ComfyUI's `/prompt` from a template Sean exports once), then P4 one-shell, then P3 video prompts.

## 6. External-model calibration (round 2)

| Seat | Cost | Real | Refuted / rejected |
|---|---|---|---|
| GLM-5.3 | $0 | GET-mint gate, URL law, pair replay, non-atomic import, label drift, keywords leak, 0-not-0.5, Comfy keep drift | stored-XSS (textContent throughout) |
| Kimi K3 | $0.092 | pair replay, label drift, undo storms, namespace-bound render URLs, intents cap, TOCTOU re-stat, 0-not-0.5 | `/api/keep` traversal (slug-validated), "one floor" (measured wrong) |
| DeepSeek V4 Pro | $0.024 | GET-mint gate, ingest-on-GET writes, path.resolve discipline | `keepFor` arity P0 (misread `keptFor`) |
| HY3 | $0.008 | GET-mint gate, render URL namespace | reversal candidates P0 (misread), styled-components (out of scope) |
| Ox Alpha (retry) | $0 | pair replay, GET-mint gate, content-hash intents, kept cap, `sizeBytes`, symlinks, reversal-law wording | `keepFor` arity P1 (misread), substring-duplicate false positive (key differs) |

Calibration note: two seats spending a top blocker on the same misread is a signal about **my naming**, not about them — fixed by renaming. DeepSeek was again the best real-signal per dollar; Ox's free retry was worth the 285 seconds.
