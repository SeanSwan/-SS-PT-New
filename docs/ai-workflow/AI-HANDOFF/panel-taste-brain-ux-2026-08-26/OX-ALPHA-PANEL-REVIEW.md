# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-UX-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 26108 in / 8327 out · **Cost:** ~$0.0000 · **Wall:** 262.0s · **finish:** stop

---

## VERDICT

REVISE — the core insight (capture-from-history is a strategy choice, not a ComfyUI law, so Make can arm itself) is correct and worth shipping, but step 4 (UI→API conversion) should be cut outright, step 3's watcher as specified will auto-queue prompts through graphs nobody verified, and the Make-tab judging entry point must be navigation, not an embedded second judging surface.

## BLOCKERS

1. **P1 — Step 3 auto-queues the held prompt through an *unverified* graph (panel Q2/Q3, and the exact failure the doc itself names).** Scenario: Sean holds a prompt; before he opens ComfyUI he runs some unrelated experiment (a LoRA test, a different project's workflow); the watcher sees a run in `/history`, captures it as the template, and immediately queues Sean's held prompt through it. The page told him "I'll capture it and queue this automatically" — he gets a render through a graph that is not the graph he meant, silently. `graphFromHistory` (workflow.mjs:159–165) proves only *that something ran*, not *that it's the workflow for this prompt*. The repo's founding law is "never a graph that isn't Sean's" (workflow.mjs:5–6); this step violates it via the capture door instead of the authoring door. Smallest fix: the ambiguity machinery already exists (routes-make.mjs:55–64 computes `seedFields`/`textFields`/notes) — **refuse to auto-queue any freshly captured template that carries notes or fails `describe()`; hold the intent and say why**. Clean single-seed/single-text graphs auto-queue; anything else waits for one explicit confirmation.

2. **P1 — Held-intent durability is unspecified (panel Q2).** Scenario: server restarts between hold and capture. If the pending queue is in-memory, the intent vanishes and the promise on screen is a lie. If it's persisted but the "queued" marker is written *after* the ComfyUI POST, a crash between POST and marker re-queues on restart — ComfyUI renders twice under the same token, `listRenders` (renders.mjs:113–129) surfaces both files as separate judgeable renders, and one opinion becomes two evidence rows. Smallest fix: mint the intent at hold time (it already lands in `intents.jsonl` via `mintIntent`), persist a `pending` marker *before* the POST, mark `queued` immediately after, and treat a crash-orphaned `pending` as "already sent, verify in ComfyUI" rather than re-sending. Add a single-flight lock — two browser tabs POSTing `/api/make` must not spawn two watchers.

3. **P1 — An embedded judging surface in the Make tab recreates the cross-memory attribution bug class the doc says was fixed *today* (panel Q4).** All of app-judge's safety lives in that module's closure: `judge`/`last` nulled by `onMemory` (app-judge.js:96), the mem-snapshot guard in `load()` (lines 37–40). A "taste pictures" grid rendered inside the Make tab shares none of that state. Concrete failure: grid loads for `sean/default`, Sean switches the memory bar to `partner/x`, clicks Done in the Make-embedded bar — `record()` (line 57) reads `Swan.profile`/`Swan.project` *at click time* and posts the judgement to whichever memory is now selected. Note `record()` has **no mem-guard of its own** even in the Judge tab; it survives only because `onMemory` nulls `judge` (which turns misattribution into a TypeError crash — luck, not design). Smallest fix: the memory-bar control **navigates to the Judge tab with `pool=renders` preselected** — one click, zero new judging state, every existing guard intact. And add the same `mem !== [profile,project].join('/')` snapshot check to `record()` so the guard doesn't depend on `judge` being non-null.

4. **P2 — Step 4 (UI→API conversion) should not exist. Answer to panel Q1: no — auto-capture-on-first-run is the right ceiling.** There is no cheap proof that a converted graph is Sean's. `applyTo`'s drift guard (workflow.mjs:141–154) proves *substitution* moved only three fields; it says nothing about whether the *template* is the graph Sean runs. The only ground truth that has ever existed in this repo is ComfyUI's own execution record. To prove a conversion you'd have to execute it and diff against `/history` — which costs a render, mutates state, and is circular. Meanwhile conversion must correctly handle reroutes, mute/bypass (bypassed nodes vanish from API format), primitive nodes, widget-to-input conversion, and link ordering — every one a silent-wrongness vector, and the doc itself cites the fixture-vs-real-template incident as precedent for exactly this class of lie. Steps 2–3 reach the same end state (armed template, zero terminal) with ~zero conversion code. A step not built is cheaper than one hardened. Cut it. If it is ever revived, the bar is: converted graph POSTed, executed once, diffed field-by-field against the resulting `/history` entry, and *that* diff stored alongside `capturedAt` — i.e., it ends up being capture-with-extra-steps anyway.

## ATTACKS

**Correctness**
- **Unknown-action fallthrough posts a 1-star rating** — app-make.js:63–65: any `data-act` value not matched earlier falls through to `post('/api/rate', … rating: a === 'rate5' ? 5 : 1)`. Add a stray button tomorrow and every click on it silently records a refusal against the sref. Guard with an explicit act whitelist.
- **Seed expansion wraps before validation** — routes-make.mjs:101: `(base.seed + i) >>> 0` silently wraps a caller seed of ≥2³²−i to near-zero, contradicting the law documented at renders.mjs:70–75 ("a validator that accepts what the executor cannot honour is a record that lies"). Validate `base.seed` against the 0..2³²−1 range *before* expansion, or refuse.
- **Stale-code/message drift** — routes-make.mjs:44 and :93 still print the CLI instruction (`node prompter/capture-workflow.mjs`) that this plan exists to delete. Trivial, but ship them together or the page contradicts its own new explainer.
- **Watcher lifecycle (panel Q3)**: ComfyUI restart mid-watch → history empties → watcher waits forever with no state change to report; drive unmount is already handled for prune (renders.mjs:166–174) and the watcher doesn't touch the drive; watcher outliving the page is fine *because* it's server-side — but it must (a) have a TTL, (b) be visible in `makeStatus` (`out.watcher = { active, since }`) so the page tells the truth, and (c) be single-instance. Without (b) you've traded a CLI step for an invisible daemon, which is worse.

**Security**
- Posture is genuinely good for a loopback tool: `comfyApi()` rejects non-loopback hostnames including credential/host-confusion forms (`127.0.0.1@evil.com` → hostname `evil.com` → rejected, workflow.mjs:43); the redirect-exfil hole is closed with `redirect: 'error'` (routes-make.mjs:29); paths are composed server-side with lstat symlink refusal (renders.mjs:120, 147–148); prune refuses to destroy intents against an unmounted drive. Remaining nit: the plan's new message interpolates a `/userdata` filename into the page — it's Sean's own file on a loopback, unauthenticated-by-design box, but keep it behind `Swan.esc()` like every other interpolated reason (app-make.js:74–75 sets the pattern).
- **Replay/idempotency**: content-hash tokens make mint idempotent (renders.mjs:93–96) — good — but see Blocker 2: idempotent *mint* ≠ idempotent *queue*. The queue step is the one that needs the write-ahead marker.
- No new SSRF surface if — and only if — the watcher reuses `comfyApi()` and not a fresh env/config read.

**Data-truth / schema drift**
- `listRenders` defaults `base` to a hardcoded `http://127.0.0.1:7331` (renders.mjs:106); `renderProbeFor` correctly receives `base` from the route layer, but any new caller (the watcher's status reporting, a Make-tab render strip) that forgets the parameter emits render URLs against the wrong port. Make `base` required, not defaulted.
- Corpus containment (panel Q5): held intents are safe *because* minting happens at hold time through `mintIntent`, which enforces the non-owner sref/corpus-marker gates (renders.mjs:85–91) — do not let the watcher mint lazily at queue time, or those gates run against a possibly-changed template state. Judging-from-Make is containment-safe iff it reuses `/api/probe?pool=renders` + `/api/event` unchanged — renders stay `'local-comfy'`, count toward "pictured", never toward style codes (renders.mjs:17–18, 126). No new write path, no new exemption.

**House rules**: no yoga/meditation language, no credential phrasing, ≤300 lines per file — all clean. Styling rules (palette tokens, Dual-Button Glow, 44px targets, dark-first, WCAG) are **unverifiable**: no CSS is in the document, and the prompter pages use plain CSS files, not styled-components/Victory either way. Flagging as a gap, not a violation.

## HIGHEST RISK

Blocker 1: the watcher turning "zero clicks" into "zero verification" — a held prompt queued through a graph Sean didn't choose, announced as his own. It's the fixture incident's failure mode rebuilt one layer down. Cheapest de-risk before ship: **auto-queue only templates whose `describe()` is clean and whose `seedFields === 1 && textFields === 1`; everything else holds with the existing notes text**, and stamp every queued result with the captured `promptId` + `capturedAt` so any render traces back to the exact history entry that armed it. That's ~20 lines reusing machinery that already exists at routes-make.mjs:55–64.

## CONFIDENCE

What I could not verify from this document alone:
- **serve.mjs**: whether POST `/api/make` is actually behind the origin gate (the header comment claims it; the gate itself is unseen). Evidence: the serve.mjs write-gate code.
- **probe.js / `createJudge` / `validateEvent`**: I'm trusting the doc's account of the provenance allowlist and the round-4 undo fix; the reversal-candidate shape (`last.candidates`) satisfying it is asserted, not shown.
- **ComfyUI behavior claims**: that `/history` `prompt[0]` is monotonic within a session (plausible, matches ComfyUI's counter) and that `/userdata` listing works as probed — both taken from the doc's own probes, not reproducible here. Whether ComfyUI offers any validate-without-queue endpoint (which would change my Q1 answer from "cut" to "maybe") I cannot confirm; as far as I know it does not.
- **Test suites**: whether the 499 checks cover the watcher's crash-orphan path at all — almost certainly not, since the feature doesn't exist; the plan's own rule ("anything new needs a check that fails without it") must apply to the pending-marker state machine specifically.
- **CSS/styling compliance** with the binding house rules — no stylesheet supplied.

I am most confident on Blockers 3 and 4 (both are structural, visible in the supplied code) and least confident on the exact ComfyUI history semantics across restarts — if someone on the panel has the execution.py source handy, that's the one external fact worth settling before the watcher ships.
