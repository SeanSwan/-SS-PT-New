# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND3-PANEL-PACKET-2026-08-26.md
**Tokens:** 51986 in / 28361 out (reasoning: 24773) | total 80347
**Wall:** 471.9s

---

## VERDICT
REVISE — two genuine P0s (a remote-readable exfil channel on every JSON read, and a still-open second door from the Midlibrary corpus into non-Sean memories via `chooseSref`), both fixable in under 20 lines, plus one crash-on-IO P1.

## BLOCKERS

1. **P0 — `access-control-allow-origin: *` on every JSON response makes the entire read API readable by any web page on Sean's machine.**
File: `prompter/serve.mjs` Where: `json()`, lines 46–47 (and the OPTIONS preflight, lines 72–78).
Failure: Sean opens any plain-`http://` page (or a malicious `file://` HTML attachment — `file://` → `Origin: null` → CORS `*` → readable, no mixed-content or Private-Network-Access block applies). Embedded JS runs `fetch('http://127.0.0.1:7331/api/prompt?n=50&mode=surprise')` — a simple GET, no preflight needed — and reads 50 corpus-derived prompts including `by_artist` attributions, `sref` codes and `styleName`s; `fetch('http://127.0.0.1:7331/api/kept?profile=partner&project=x')` reads the partner's private kept prompts; `/api/probe?profile=sean` reads Midlibrary CDN URLs + sref codes + titles. POST the results anywhere.
Why it matters: the repo's ground truth says the corpus "must never be committed, pushed, or served to anyone but Sean." This serves it to whoever runs a page in his browser, silently, one pageload, bulk. `origin.mjs:14` asserts "reads stay open; they write nothing" — reads *leak*. (This is not the refuted "/api/event is ungated" finding: the write gate is intact; this is the GET surface.)
Smallest fix: delete the two ACAO headers from `json()` and from the OPTIONS reply (or reflect `Origin` only when `trustedOrigins(PORT)` contains it). No listed consumer needs CORS: the page is same-origin and ComfyUI's node is Python, which ignores CORS entirely. The comment at serve.mjs:45 justifies the header for a non-browser consumer — that justification is simply wrong.

2. **P0 — non-Sean memories still receive corpus sref codes, Midlibrary style names, and `--sref` parameters: the "second door" the remit hired me to find.**
File: `prompter/lib/generate.mjs` Where: `generateOne()` line 200 (`const sref = chooseSref(corpus, taste, rng, mode)` — unconditional), explore path lines 138–152, `buildParams` line 170. Exposed at `serve.mjs:156–157` (`sref: p.sref?.code`, `styleName: p.sref?.style_name`).
Failure: Create `partner/bloom` with themeWords `['ocean','forest light']`. `GET /api/prompt?profile=partner&project=bloom&n=5` → `candidatePool` correctly returns the `ownOnly` pool, but `generateOne` still calls `chooseSref` against the **full corpus**: `taste.loved` is empty for a partner, so it always falls to explore, scoring every `corpus.sref` entry's `style_name`/`example_prompt` against *her* keywords. Each returned prompt carries a Midlibrary code, its style name, and the prompt text ends `--sref 1234567`. She can Keep one → the corpus code is now persisted in her kept.md.
Why it matters: round 2 called exactly this class ("corpus text reaching a non-owner") the session's worst defect; the fix stopped at subjects and artists — its own comment proves the scope ("never borrows an **ARTIST**", generate.mjs:197–199). Worse, `taste-namespace.mjs:9–11` says style codes from the explore path are *intended* — a live contradiction between the code's comment and the remit/law framing ("corpus-derived words, artists, **srefs**, or subjects"). The Final Decider must rule; either way the door is open today.
Smallest fix: `const sref = pool.ownOnly ? null : chooseSref(corpus, taste, rng, mode);` — and delete or amend the taste-namespace comment so the law and the code agree.

3. **P1 — unhandled read-stream error crashes the whole server mid-session.**
File: `prompter/lib/routes-renders.mjs` Where: lines 54 and 59 (`fs.createReadStream(...).pipe(res)` with no `'error'` handler).
Failure: `GET /renders/sean/default/<token>/1` with a Range header; `Z:\SwanStudios-Video` (a network-mapped drive — the stated-state case renders.mjs:20,47 explicitly designs for) drops mid-transfer → the stream emits `error` (EIO/ENOENT) → `pipe` does not forward it → uncaught exception → process exits. All four tabs die mid-judging.
Smallest fix: `const s = fs.createReadStream(...); s.on('error', () => res.destroy()); s.pipe(res);` in both branches.

4. **P2 — the sean-default keep path has no length cap.**
File: `prompter/serve.mjs` Where: `/api/keep`, lines 180–191.
Failure: `POST /api/keep {prompt: <60,000 chars, ≥3 words>}` → 200 → `cli(['--keep', …])` writes a 60 KB bullet into `taste/kept.md`. `keepFor` enforces ≤2000 chars (taste-namespace.mjs:157) but only for projects; the Sean branch checks word count only (body cap is 64 KB).
Smallest fix: apply the same `≤2000` check before the `cli()` call.

5. **P2 — `/api/event` mints ghost namespaces.**
File: `prompter/lib/events.mjs` Where: `appendEvent`, lines 169–174; `eventsDirFor`, 150–154.
Failure: `POST /api/event` with `{source:'sean', profileId:'sean', projectId:'ghost', …valid grid…}` → `mkdirSync(recursive)` creates `taste/profiles/sean/ghost/events/` and appends. `readProject` never ran, so `/api/projects` doesn't list it and every read refuses — but the data sits on disk, invisible, and goes live the moment a real `ghost` project is created (its events then count). Reads can't invent namespaces; the event writer can.
Smallest fix: in `appendEvent`, require `readProject(profile, project)` (or a passed-in existence check) before mkdir.

6. **P2 — `keepFor` corrupts kept.md on prompts containing `$&`/`$1`.**
File: `prompter/lib/taste-namespace.mjs` Where: line 162, `md.replace(/(## Kept\n)/, \`$1- ${text}\n\`)`.
Failure: Keep the prompt `price $& quality light` (3 words, passes) — `$&` in a replacement string expands to the matched text, producing `- price ## Kept\n quality light` in the file. Mangled bullet, mangled next read.
Smallest fix: use a function replacement: `md.replace(/(## Kept\n)/, (m) => `${m}- ${text}\n`)`.

7. **P2 — probe can show the same picture twice in one grid.**
File: `prompter/lib/probe.mjs` Where: `pickStratified`, lines 95–104.
Failure: The `ordered` list is **reshuffled every doc of every round**, then indexed by `round`. With `want > doc count` (e.g. `n=24` on a thin archive, or a shareable pool with few photo/webb docs), round 1's `ordered[1]` of a fresh shuffle can equal round 0's `ordered[0]` → duplicate candidate in one grid. The never-show-twice writer checks *across* events, not within.
Smallest fix: track picked ids in the call; `if (pickedIds.has(pick.id)) continue;`.

8. **P2 — seed truncation: intent record and executed graph disagree.**
File: `prompter/lib/workflow.mjs` Where: `applyTo` line 139 (`Number(seed) >>> 0`); with `routes-make.mjs:82–85` and `renders.mjs:78`.
Failure: `POST /api/make {prompts:[{prompt:'…', seed: 8589934592}]}` — `mintIntent` accepts any non-negative integer and records `seed: 8589934592`; `applyTo` writes `0` into the graph. The token/hash and intents.jsonl describe a render that was actually made with a different seed; reproduction from the record is a lie for any seed ≥ 2³².
Smallest fix: clamp/validate in `mintIntent` (`seed <= 0xFFFFFFFF`) so the record can only describe executable seeds.

9. **P2 (SPECULATIVE on usage) — `pair` events are validated, deduped, and never counted.**
File: `prompter/lib/profile.mjs` Where: `tally`, line 48 (`e.eventType !== 'grid-selection' → continue`).
Failure: Any `pair` event appended via `/api/event` (the enum and the writer's never-show-twice branch at events.mjs:183 treat pairs as live) moves no counter: no tallies, no `progress`, nothing. If any surface still emits pairs, that judgement channel silently discards data. I cannot see the page or agents, so whether pairs are still emitted is unverified.
Smallest fix: either tally pairs (subjects/verdict from the chosen candidate) or delete `pair` from `EVENT_TYPES` — a dead enum value is drift bait (their own words, events.mjs:27–28).

10. **P2 — the kept/intent/make channels have no witness law.**
File: `prompter/serve.mjs` Where: `/api/keep`/`/api/unkeep`, lines 178–199; `renders.mjs:64`; `routes-make.mjs:62`.
Failure: Events enforce `source === profileId`; nothing else does. From the partner's own (same-origin, gate-passing) tab: `POST /api/keep {prompt:'…', profileId:'sean'}` appends to **Sean's** `taste/kept.md`, steering his generator. Cross-lane write with a three-field input. Same for minting intents / queueing Make into any memory.
Smallest fix: state the design decision in the laws table, or bind these writes to a session-declared profile the page sets once (even a header the shell pins) so a lane can't be addressed by accident.

11. **P2 (SPECULATIVE) — `new URL(req.url, …)` sits outside the try/catch.**
File: `prompter/serve.mjs` Where: line 70 vs `try` at line 81.
Failure: a request-target the WHATWG parser rejects (e.g. absolute-form with an empty authority) would throw synchronously in the request handler and kill the process — Node does not catch handler throws. I could not confirm llhttp forwards such a line to the handler, hence SPECULATIVE; the fix is one line regardless.
Smallest fix: move the `new URL` inside the `try`.

## ATTACKS

- **Correctness:** #3 (stream crash), #6 (`$&` corruption), #7 (grid dupes), #8 (seed truncation), #9 (dead pair channel), #11 (URL parse). One more, SPECULATIVE: `detectFields` substitutes *every* node wired as `positive` — a graph with a refine/hires-fix pass carrying a *different* positive literal (two CLIPTextEncodes, two samplers) gets both overwritten with the same prompt. `applyTo`'s drift proof validates the map's *types*, not its *intent*; nothing flags `steers.prompt > 1`. Would need the real captured graph to confirm (see CONFIDENCE).
- **Security:** #1 is the headline. The write side I attacked and **found sound**: Host-header check defeats DNS rebinding for writes; cross-origin POSTs (fetch or form) always carry `Origin` and are refused; there are no GET writes; no WebSocket handler exists; a `text/plain` no-preflight POST still hits the gate. Path composition in `renders.mjs` is sound: slug enums + regex-validated token/n, server-composed path, prefix check, `lstat` refusing symlinks in both listing and serve, extension↔sniff agreement, size caps — I tried traversal (`..` in every segment — regex-anchored), symlink swap (lstat), extension lie (415), oversized (413), `Range: bytes=1e20-` and `bytes=5-2` (invalid → 200) — all closed. TOCTOU between lstat and createReadStream is same-machine-trusted-user only. `comfyApi()` SSRF: hostname allowlist incl. `[::1]`, no request input — closed.
- **Data-truth / schema drift:** #8 (recorded seed ≠ graph seed); #2 (taste-namespace's header comment vs the law table — code documents behaviour the remit calls a violation); #4 (two keep channels with different validation contracts); `keptFor`/`keepFor` drift is genuinely fixed (`readKept`); `applyTo`'s self-diff is a real proof, not theater. Frontend response-shape drift (video vs stills prompt objects differ in fields) is unverifiable — the page source is absent.

## HIGHEST RISK
Blocker 1: a silent, bulk, one-pageload exfiltration of the licensed corpus and the partner's private material that the entire two-panel licence architecture exists to prevent — and it's reachable today from `file://` and plain-http pages in every current browser. Cheapest de-risk before ship: delete the ACAO/`allow-headers` lines from `json()` and the OPTIONS reply, then verify with a saved local HTML file containing `fetch('http://127.0.0.1:7331/api/prompt?n=1').then(r=>r.text()).then(t=>document.title=t.length)` — opened as `file://`, the title must stay empty. Ten minutes, zero consumer impact (same-origin page, non-browser ComfyUI).

## CONFIDENCE
Could **not** verify from this document: (1) **all frontend files** — `app.html`, `app-shell.js`, `app-{make,judge,directions,kept}.js`, `app.css`, `probe.js/css` are named in the remit as never-reviewed but their source is absent; every frontend house rule (styled-components, Victory, palette tokens, Dual-Button Glow, 44px, dark-first, 4.5:1) is unverifiable, and the page is also where blocker 2 becomes visible. The packet claims to put the one-shell app in scope and then omits it — that omission is itself a finding. (2) `corpus.mjs` (`subjectOf`, `weightedPick`, `GRAMMAR`), `swan-prompt.mjs` CLI, the bundle import/export code, `comfyui/swan_prompt_node.py`, and the 9 test suites — so I cannot confirm whether pair events are still emitted (#9) or whether any test pins the CORS headers. (3) The real captured graph (`comfy-workflow.local.json`) — settles the multi-positive speculation; `capture-workflow.mjs --show` output would do it. (4) Browser enforcement nuances for #1 (Chrome's Private Network Access vs Firefox/Safari): my `file://` and plain-http vectors avoid the question, but a fully current matrix needs a live test. (5) Line numbers are as printed in the packet; I did not run anything. House rules: no violations in the supplied server source (all files ≤300 lines; no yoga/meditation language; no NASM claims of any form; no PII to any LLM — none is called) — but that is a statement about half the surface, not the product.
