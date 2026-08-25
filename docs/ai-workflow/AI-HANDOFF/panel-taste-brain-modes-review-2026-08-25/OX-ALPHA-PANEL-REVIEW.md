# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET.md
**Seed:** (none)
**Tokens:** 4326 in / 5536 out · **Cost:** ~$0.0000 · **Wall:** 197.2s · **finish:** stop

---

## VERDICT
REVISE — the evidence discipline and licence containment are genuinely well-built, but the quoted `validateEvent` logic has a witness-gate bypass, the idempotency key is client-forgeable, and the P2 plan contradicts the packet's own URL law.

## BLOCKERS

1. **P1 — Unknown or absent `source` bypasses the witness gate entirely.** In the quoted `lib/events.mjs` `validateEvent`: the guard is `if (PROFILES.includes(e.source)) … else if (SOURCES.includes(e.source) && !allowNonSean())`. An event with `source: 'not-a-real-source'`, or with `source` missing altogether, matches *neither* branch and falls through with zero errors. Unless source-enum membership is enforced elsewhere in "other v1 validation" (the packet enumerates schemaVersion, eventType, sessionId, candidates, size — and does **not** list `source ∈ SOURCES`), any writer to `/api/event` can inject events attributed to no witness, which the compiler (`tally`) will happily count since it filters on `source === witness` only for matching witnesses — an `'inferred'`-shaped garbage source may or may not be counted, but it lands in the append-only log either way. Reproduction: `POST /api/event` with `{schemaVersion:1, eventType:'pair', source:'x', …}`. Fix: `need(SOURCES.includes(e.source), …)` as the first source check.

2. **P1 — `eventId` includes client-supplied `presentedAt`, so idempotency is forgeable and double-counting is trivial.** `eventId = sha256(session|type|sorted ids|presentedAt)`. All four inputs arrive from the client. Reproduction: judge a grid in a bundle, hand-edit the results JSON to change `presentedAt` by 1 ms, import twice → two distinct eventIds, both appended, both tallied → `closest − miss` margins and tier labels shift on fabricated volume. Conversely, a legitimate fast double-click producing two events with identical type/ids/timestamp-ms is silently dropped. Fix: derive the dedupe key from `session|type|sorted ids` only (server-side), and stamp `receivedAt` server-side; keep `presentedAt` as display metadata.

3. **P1 — Only `/api/projects` is stated to sit behind the origin gate; `/api/event` — "THE ONLY WRITER" — is not.** §1 routes list: "`POST (create — behind the origin gate)`" attaches to `/api/projects` alone. `/api/event` accepts POSTs that create files. Any webpage open in the owner's browser can `fetch('http://127.0.0.1:7331/api/event', {method:'POST', …})`; the browser sends a foreign `Origin`, which the gate would reject — *if* the gate covers this route. The Host-header check defeats DNS rebinding, but CSRF-from-a-live-tab is the everyday threat here. If `/api/event` is ungated, Blocker 1 becomes remotely triggerable. Evidence needed: the route registration for `/api/event` in `serve.mjs`.

4. **P1 — §4 P2 contradicts the packet's own candidate law.** §2: "candidates are ids + http(s) URLs, `data:`/base64 refused anywhere." §4 P2: "candidates = local file ids + `file://`/served URLs." As specified, every ComfyUI render judgement fails `validateEvent`. Either the schema changes (and then the `data:` refusal rationale needs re-examination, because `file://` is the same class of unsanctionable pointer) or renders must be served over loopback HTTP. Decide before writing P2 code, not after.

5. **P2 — Partner full-pool opt-in leaks Midlibrary through `/brief`.** `poolFor` lets a partner project set `pool:'full'` (checkbox "include Midlibrary — this desktop only"). The bundle path is defensively regex-guarded, but `/brief` prints `picks` including `url`/`pageUrl` for Midlibrary items, and the packet says `/brief` doubles as a closing deck with Print/PDF. The licence term is "never leaves the machine, never shown to anyone but the owner" — a partner printing her brief for a sales meeting violates it with one click, and nothing in the described compiler or brief renderer filters by collection. Fix: `/brief` for non-owner profiles drops or redacts non-shareable picks, exactly as `planGrids` does.

6. **P2 — Pool-exhaustion behavior is unspecified.** Shareable pool ≈ 2,720 images; `excludeIds` grows monotonically per memory. When `judgedIds` approaches pool size, what does `probeFor` return — an empty grid, a crash, a repeat (breaking "never-show-twice")? Same question for the owner's full mix against an unseen Midlibrary corpus size. One deliberate test: seed a namespace with N−1 judgements and request grid 12.

## ATTACKS

**Correctness**
- `appendEvent(e, dir)`: `dir = dir ?? eventsDirFor(...)` — the packet's claim "a caller cannot aim an event at another memory" is only true for callers that omit `dir`. Any current or future internal caller passing `dir` (import-bundle is the obvious candidate) can write cross-namespace. Make the override private or delete it.
- Client-asserted `reasonLockedBeforeReveal: true` is unverifiable server-side; the entire "never lead the witness" law rests on a boolean the client sets. At minimum record `revealedAt` separately and let the compiler flag events where lock/reveal ordering is impossible.
- DONE_FLOOR arithmetic ambiguity: partner floor "8 grids/40 judgements" vs 12-candidate grids — is a grid-selection one judgement or twelve? `progress` drift here shows wrong completion states.
- Concurrent `fs.appendFile` to one jsonl: probably safe under O_APPEND at ≤64 KB, but unproven on Windows (the 5090 desktop).

**Security**
- Theme words permit hyphens (`[a-z0-9][a-z0-9 -]{0,39}`) → `--ar 16:9`, `--no x`, `--chaos 100` are valid "theme words" that flow into prompts as parameter injection once P1 wires themes into generation. Strip leading hyphens.
- Bundle import flood: a crafted results file with unique sessionIds/presentedAt values posts unlimited events to any profile (household trust, but there is no rate limit, no per-import cap cited, and no reversal route documented despite `eventType: 'reversal'` existing in the schema).
- Allowed Host set unstated: confirm `localhost:7331` is accepted alongside `127.0.0.1:7331` or the launcher breaks depending on which URL the user typed.

**Data-truth / schema drift**
- `SHAREABLE_MIX` 9+3=12 ✓, `DEFAULT_MIX` 6+4+2=12 ✓ — consistent, no drift found there.
- P2 introduces `generatorDistribution: local-comfy` and `file://` candidates; P3 introduces film reason codes — both are schema surface area added before any consumer; watch for the compile side (`tally`) silently ignoring execution/film events it was never taught, producing "progress complete, zero signal" states.

**House rules:** no styled-components/Victory/palette violations arise — this is a dependency-free local tool, correctly outside the SaaS component rules. But P4's one-shell must respect ≤300 lines/file (three pages merging into tabs will blow past it without extraction), and if any of this UI ever migrates into the SwanStudios SaaS it must be rebuilt on styled-components + Victory — plan P4 with that port in mind. 44px targets and WCAG 4.5:1 are *claimed* by the headless run; I cannot verify contrast ratios from the packet. Language rules ("stretching", "26+ years / NASM-protocol") are not violated anywhere in the packet.

## HIGHEST RISK
Blocker 2 (forgeable idempotency) combined with Blocker 1 (gate bypass): together they mean the append-only evidence log — the thing every tier label derives its authority from — is writable with unattributed, double-countable events. Cheapest de-risk: add `need(SOURCES.includes(e.source))` and switch the dedupe key to drop `presentedAt`, plus one adversarial test in `test-modes.mjs` posting a bad-source event and a replayed-with-new-timestamp event, asserting both refuse. That's maybe twenty lines total.

## CONFIDENCE
I have only the packet's quotations, not the files. Specifically unverifiable: (a) whether `source ∈ SOURCES` is enforced elsewhere in `validateEvent` — my Blocker 1 is an inference from the quoted branch structure and would be settled by the full function body; (b) whether `/api/event` sits behind the origin gate — one look at the route table in `serve.mjs` settles it; (c) whether `import-bundle.mjs` passes an explicit `dir` to `appendEvent`; (d) Midlibrary corpus size, hence realistic exhaustion timelines; (e) actual contrast ratios and iOS `file://` localStorage behavior (the author concedes the latter). I am confident in the P2 `file://` contradiction and the `/brief` Midlibrary leak path as *specified*, regardless of implementation details. Where I've marked hypotheses, treat them as falsifiable claims requiring the named file, not findings.
