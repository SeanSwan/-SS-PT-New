# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET-R2.md
**Seed:** (none)
**Tokens:** 8484 in / 7975 out · **Cost:** ~$0.0000 · **Wall:** 284.7s · **finish:** stop

---

## VERDICT

REVISE — the round-1 closures are largely real, but the new tie-in ships a confirmed happy-path breaker in `tasteFor`/`keepFor`, the replay fix covers grids only and leaves pair events double-countable, and the §4 mint contract contradicts the origin gate as actually implemented.

## BLOCKERS

1. **P1 — `tasteFor` calls `keepFor` with no prompt, so `kept` is an error object, not a count.** Every partner/client project hits this. `lib/taste-namespace.mjs` `tasteFor`: `const kept = keptFor(profile, project);` — but `keepFor`'s third parameter is the prompt, and with `prompt === undefined` it takes the early return `if (text.split(' ').length < 3) return { ok: false, error: 'prompt must be at least 3 words' }` (lib/taste-namespace.mjs `keepFor`). Reproduction: `GET /api/prompt?profile=partner&project=morning` → `tasteFor` returns `kept: {ok:false, error:…}`, then `confidence: confidenceOf({ …, kept: kept.length })` computes with `undefined`, and the route's `tasteMeta` does `kept: taste.kept.length` → `undefined` (serve.mjs `/api/prompt`). The headline round-1 fix ("words-only until evidence") is broken on its own happy path for every non-Sean memory. Fix: split `keepFor` into `keptCount(profile, project)` (parse only) and an append path; assert `typeof taste.kept === 'number'` in `test-taste-namespace.mjs`.

2. **P1 — replay double-count is fixed for grids only; pair events still replay.** `appendEvent` enforces never-show-twice solely inside `if (e.eventType === 'grid-selection')` (lib/events.mjs `appendEvent`), while `eventIdFor` hashes client-supplied `presentedAt` (lib/events.mjs `eventIdFor`). Reproduction: POST `/api/event` with a valid `pair` event, then re-POST the identical body with `presentedAt` advanced one second → new eventId → passes the duplicate substring check → appended → counted twice by `tally`. This is precisely the Ox-B2 class the round-1 table declares "Fixed at the root." Caveat: I cannot see `EVENT_TYPES`, so if `pair` is unreachable via `/api/event` in the current UI this downgrades to P2 — but the writer-level law should not depend on which callers happen to exist today. Cheapest fix: dedupe on `(sessionId, eventType, sorted candidate ids)` independent of `presentedAt`, or extend the seen-candidates refusal to all judgement event types.

3. **P1 (contract, pre-build) — §4.1 minting is a write on a GET route, and the gate only covers POST.** serve.mjs: `if (req.method === 'POST') { const gate = checkWriteRequest(…) }`. §4.1 puts minting on `GET /api/prompt?…&intent=1` and asserts "Minting is a write → behind the origin gate." Those cannot both be true. Reproduction once built: any webpage the owner visits embeds `<img src="http://127.0.0.1:7331/api/prompt?profile=partner&project=x&intent=1&n=50">` — no POST, no gate, no CSRF token — and mints 50 attacker-influenced intents into a household memory (the page's shared localStorage picks the memory, per your own residual list). Those tokens then legitimately join renders at ingest. Either minting moves to a POST endpoint, or the gate extends to any state-changing GET (`intent=1`). Say which, in writing, before the node is built.

4. **P2 — the reversal law as documented is not the law as coded.** §1 claims a reversal "must name a grid in this memory," but `appendEvent` checks only `x.eventId === e.reversalOf && x.eventType !== 'reversal'` (lib/events.mjs `appendEvent`) — a reversal may target a *pair* event or any future non-reversal type. Consequence: reversing a pair silently frees its candidates from `judgedIds` and reopens pictures the tally law treats differently. Add `x.eventType === 'grid-selection'` or amend the written law.

5. **P2 — `source: 'imported'` appears impossible in production, yet bundle import is a shipped flow.** `validateEvent` refuses every non-human source unless `SWAN_TASTE_ALLOW_NONSEAN === '1'` (lib/events.mjs `validateEvent`), and the inline comment says the flag exists "for fixtures only." But round 1's own disposition table says bundle overlap is "refused at import" — i.e., imports flow through `appendEvent` with a non-human source. Either the import tool silently sets the flag (making the fixture-only claim false and widening the hole GLM's B5 fix was meant to close), or imports bypass `validateEvent` (in which case the tampered-file tests prove less than claimed). Show the import call path. Hypothesis — I have not seen the import route.

6. **P2 — `/api/keep` has no upper bound on prompt length.** `keepFor` checks ≥3 words and nothing else (lib/taste-namespace.mjs `keepFor`), unlike `validateEvent`'s `MAX_STR` discipline; `readBody`'s size cap is not shown. A loopback script (or a CSRF'd POST, since `/api/keep` *is* gated — but see blocker 3 for how thin that gate's margin is) can append megabytes per line into `kept.md` forever. Cap at `MAX_STR` and cap `readBody`.

## ATTACKS

**Correctness**
- `normaliseThemeWords` collapses leading/trailing hyphens but preserves *internal* ones, and `THEME_WORD` admits hyphens (lib/projects.mjs). The `--parameters` smuggling fix therefore rests entirely on the unseen `words()` splitter ("keyword splitter drops hyphens" is asserted in §1, not shown). If `words()` keeps `--style` as a token, a theme word like `moody --style raw` walks straight through `createProject`. Verify `words()` or paste it.
- `appendEvent` calls `readEvents(dir)` on every append (lib/events.mjs) — O(n) read per write, O(n²) across a judging session; fine at household scale, worth a cursor before bundles get big.
- Duplicate detection is a substring match on `"eventId":"<hex>"` (lib/events.mjs `appendEvent`) — a `reversalOf` equal to a live eventId could false-positive a duplicate. Contrived, but the structured alternative is cheap.
- `probeFor`'s exhaustion hint interpolates `profile/project` into a shell command string shown to the user (routes-modes.mjs `probeFor`) — display-only today, but it trains a copy-paste habit; validate via `namespaceFrom` (unseen) before this string ever meets a shell.
- `tasteFor` (Sean merge): evidence codes are auto-rated 4–5 and merged into hand-curated markdown `loved` (lib/taste-namespace.mjs `tasteFor`). Any consumer that averages `rating` now lets two lucky grids outvote years of curated markdown. Consider keeping evidence codes in a separate lane with an explicit weight, as §4.6 does for renders.

**Security**
- Path traversal hinge: everything (`eventsDirFor`, `projectFile`, `keptPath`) keys off `profile`/`project` arriving from query/body. `isProjectId` exists and is enforced in `validateEvent`/`createProject`, but I cannot see `namespaceFrom` (serve.mjs). If it doesn't apply the same slug test, `?project=../../sean` reads/writes across namespaces. This is the single most important unseen function in the packet.
- Household trust for renders (§4.1): any loopback process can mint intents *and* drop a correctly-named PNG into the ComfyUI output dir, manufacturing judged "evidence" with attacker-chosen prompt/seed/sref revealed at lock. Consistent with the stated threat model, but the brief will print fabricated provenance identically to real provenance — mark render-derived rows in the brief.
- `index.json` rows carry `bytes` (§4.3). If that is ever file *content* rather than file *size*, it violates the never-store-bytes law. Name it `sizeBytes`.
- Renders with identical `(prompt, seed, sref)` mint fresh tokens → the same pixels judged repeatedly, each at 0.5 style weight: two clicks launder one opinion into a full evidence point. Dedupe intents on a content hash, not the token.

**Data-truth / schema drift**
- `taste.kept` shape drift (blocker 1) is exactly the PascalCase-vs-snake_case class of bug: producer returns `{ok,error}`, consumer expects a number, TypeScript-free codebase lets it sail to the client as `undefined`.
- §4.5 promises `generatorDistribution: 'local-comfy'` — confirm `'local-comfy'` is added to the `GENERATORS` enum in the same commit, or `validateEvent` refuses every render judgement and the loop dead-ends at judge.
- §4.5 sets `collection: 'render'` and `provenance: 'local-comfy'`; `SHAREABLE_COLLECTIONS`/`SHAREABLE_PROVENANCE` (lib/projects.mjs) must deliberately *exclude* these or `poolFor` starts mixing renders into shareable pools.

House rules: no violation observed in the material under review — no component-library, palette, chart, PII-to-LLM, or terminology breaches appear in these backend files; the frontend surfaces referenced (page, pill, bar) are not shown and so not judged.

## HIGHEST RISK

Blocker 1: the `tasteFor`→`keepFor` arity bug breaks prompt generation for *every* partner/client memory — the exact capability round 1 extracted from you — and it is invisible in the browser only as a silently missing `kept` count and a NaN-poisoned confidence. Cheapest de-risk before anything else ships: one test — `tasteFor({profile:'partner', project:<fixture>, corpus})` must return `typeof kept === 'number'` and finite `confidence` — plus the two-line split of `keepFor`. Ten minutes, closes the flagship regression.

## CONFIDENCE

Not verifiable from this packet, with the evidence that would settle each:
- `namespaceFrom` (serve.mjs) — whether profile/project are slug-validated at the edge. Paste it; it gates the path-traversal question.
- `words()` (taste-namespace) — whether hyphen-leading tokens survive into prompts. Paste it; it decides whether the `--parameters` fix is real or asserted.
- `EVENT_TYPES`, `MEDIA`, `GENERATORS`, `RESPONSES`, `MAX_STR`, `BYTES_RE`, `checkWriteRequest`, `readBody` — all load-bearing, none shown. In particular, pair-event reachability decides blocker 2's severity.
- Whether bundle import routes through `validateEvent` (blocker 5) — show the import call site.
- All test counts (69/23/25/81/52, Chromium 41/41) are self-reported; I cannot rerun them. The `tasteFor` bug demonstrates the suites do not cover the non-Sean `tasteFor` return shape — treat green counts as necessary, not sufficient.
- §4 is unbuilt; my P2 findings are paper attacks against the contract, and the strongest one (blocker 3) is a contradiction BETWEEN §4's prose and §2's shown gate — that much is certain; the exploitability estimate assumes the gate stays POST-only, which the excerpt supports but the full `serve.mjs` might contradict.
