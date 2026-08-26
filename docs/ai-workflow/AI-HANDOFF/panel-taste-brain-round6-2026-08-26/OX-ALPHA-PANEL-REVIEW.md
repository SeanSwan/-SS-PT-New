# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND6-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 57175 in / 13840 out · **Cost:** ~$0.0000 · **Wall:** 443.0s · **finish:** stop

---

## VERDICT

REVISE — the corpus law is still enforced at the wrong granularity in two places: the compiler trusts a *claimed* provenance over the index it itself joins against (door #6), and every "owner" gate tests `profile === 'sean'` instead of the namespace `sean/default` that the law actually names.

## BLOCKERS

1. **P0 — Door 6: the index join back-fills corpus material under a false-but-shareable provenance claim.**
   - Scenario: `POST /api/event` with `source:'partner', profileId:'partner', projectId:'school-site'`, candidates `[{ id:'<a real Midlibrary image id>', provenance:'unsplash' }]`. The writer accepts it: events.mjs:105 (not `midlibrary-reference`), events.mjs:116 (no `sref` field), events.mjs:127 (`'unsplash'` ∈ `NON_OWNER_PROVENANCES`). Then `tally()` joins the id against the image index (profile.mjs:53 `const rec = byId.get(it.id)`) and back-fills: `url: c.url || rec.url`, `title: c.title ?? rec.title`, `credit: … ?? rec.credit`, `pageUrl: … ?? rec.pageUrl` (profile.mjs:72–73). The round-4 defence-in-depth filter (profile.mjs:181) checks `SHAREABLE_PROVENANCE.has(p.provenance)` — but `p.provenance` is `c.provenance || rec.provenance` (profile.mjs:73), i.e. **the lie wins the tie**. Result: the partner's Directions tab and the printed brief display the Midlibrary image URL, the corpus title, and the artist credit. The round-4 comment (events.mjs:119–126) says the fix is "what the INDEX says about it" — but the fix only made the claim *mandatory*, never *verified*. Exactly recurrence class 1 (law at one layer: the writer declares, the compiler trusts).
   - Smallest fix: in `tally()`, when `rec` exists and `witness !== DEFAULT_PROFILE`, treat `rec.provenance` as ground truth — refuse or drop the candidate when `rec.provenance === 'midlibrary-reference'`; and/or extend the profile.mjs:181 filter to also test the index-side provenance. Two lines.
   - Note the same lie poisons her provenance tally (profile.mjs:99 bumps `c.provenance` only for non-owners) — data-truth drift on top of the leak.

2. **P1 — The owner gate is profile-level; the law is namespace-level. `sean/<any-project>` is treated as the owner.**
   - The law names exactly one owner memory: `sean/default`. But every corpus gate tests the profile alone: events.mjs:105, 116, 127 (`profileOf(e) !== DEFAULT_PROFILE`), profile.mjs:93 and :65 (`witness === DEFAULT_PROFILE` — so `ml:` corpus subjects ARE counted for `sean/side-project`), profile.mjs:181 (picks unfiltered), renders.mjs:84 (`mintIntent` happily takes a corpus `--sref` for `sean/side-project`).
   - Reachable without malice: `POST /api/projects {profileId:'sean', projectId:'side-project'}` (routes-modes.mjs:115) or the shell's own New-project form with profile=sean (app-shell.js:84–91). Grids judged there accept `midlibrary-reference` candidates and bare `sref` codes from the writer (events.mjs checks pass because `profileOf(e) === 'sean'`), the compiled profile carries sref directions with corpus sample prompts, and `/brief?profile=sean&project=side-project` prints them. That is corpus in a memory that is not `sean/default`, contrary to the stated law.
   - Smallest fix: one predicate `isOwnerMemory(profile, project)` used at events.mjs:105/116/127, profile.mjs:65/93/181, renders.mjs:84 — mechanical, and the existing `isDefaultNamespace` in projects.mjs is already the right shape.

3. **P2 — The storage-blocked fallback sessionId cannot pass the schema (class 5: containment breaks the legitimate case).**
   - app-judge.js:13 `catch { return 'ephemeral00000001'; }` — `'ephemeral00000001'` contains p/h/m/r/l and fails `SESSION_ID = /^[a-f0-9]{8,32}$/` (events.mjs:55). In any browser where localStorage throws (the exact case the catch exists for), every `record()` is refused with "sessionId must be opaque hex". The fallback is a guard that shipped unable to fire *correctly*. Fix: return 16 hex chars, e.g. `'e' + randomBytes-style hex`, or `'0'.repeat(16)`.

## ATTACKS

**Correctness**
- `execFileSync` in `cli()` (serve.mjs:71) blocks the event loop up to 20 s — every keep/rate stalls all four tabs. Local single-user tool, so tolerated, but worth knowing it is why the kept.md read/write sequence can't interleave.
- `undo()` hardcodes `medium:'still'`, `generatorDistribution:'reference-mix'` (app-judge.js:72) even for video-render grids — permanent mild data-truth drift in the one asset that is never rewritten.
- `parseRange` is clean: suffix `bytes=-N` clamps, `start >= size` → 416, multipart → legal 200. No off-by-one found.
- `applyTo`'s drift proof (workflow.mjs:141–154) is genuinely total — added/removed nodes and both key-sets diffed. Attacked it; it holds.

**Security**
- Host gate + no-CORS + Origin-absent-or-trusted writes: I tried DNS rebinding (Host refused), `file://` drive-by POST (`Origin: null` string refused at origin.mjs:46–48 since `"null"` ≠ `''`), preflight smuggling (204 carries no ACAO), and malformed request-target process kill (caught at serve.mjs:82–87). All closed.
- `renderFile` path composition (renders.mjs:131–145): token regex, intent-membership precondition, resolve+prefix check, lstat symlink refusal. Attacked with `..`, symlinks, foreign-memory tokens — closed.
- `bundle.html` JSON embedding escapes `<` (export-bundle.mjs:61) and both template substitutions use function replacements. Closed.
- Residual: `/api/prompt?medium=video` for a non-owner passes the corpus-derived `pool` (serve.mjs:150–155) into `generateVideo` (video.mjs — not in this document). The response force-maps `sref: null`, but nothing shown proves the video prompt *text* can't carry a code. See CONFIDENCE.

**Data-truth / schema drift**
- Listing vs serving drift in renders: `FILE` admits 1–5 digit counters (renders.mjs:34) but `renderFile` requires exact 5-padding via `padStart(5)` (renders.mjs:136). A file `swan/<token>_12_.png` is listed in the judge grid but 404s on load. SPECULATIVE on real ComfyUI output (standard is 5-padded), P2.
- `MIDLIBRARY_RE` (export-bundle.mjs:32) matches `ml:` as a substring — `html:` and `xml:` in any title trip it. Fail-closed (bundle refused), so a nuisance, not a leak; but it is the mirror image of defect class 3 and will eventually cause a false "would carry Midlibrary" scare.
- Frontend/backend shapes spot-checked (`tasteMeta.source` ↔ app-make `t.source`; `progress.*`; render projections; `esc()` coverage in every `innerHTML` sink — grammar/tags are server enums). No drift found beyond the items above.

**Test suite (as asked)** — the suites are unit-shaped around each guard. The missing shape is an *end-to-end leak sweeper*: craft a hostile event set (false provenance, bare ids, `sean/<project>` namespaces), run it through the real HTTP surface into every non-owner read (`/api/profile`, `/brief` text, `/api/kept`, `/api/renders`), and assert `MIDLIBRARY_RE`-clean output. Blocker 1 survives today because each layer's test asserts its own layer's contract.

## HIGHEST RISK

Blocker 1 — a silent, writer-approved path that puts corpus images, titles and artist credits into a printed brief, which is precisely the asset the whole five-round exercise exists to protect. Cheapest de-risk before ship: (a) the two-line `rec.provenance` ground-truth fix in `tally()`, and (b) the end-to-end leak sweeper test above, which would have caught doors 3–6 uniformly and will catch door 7.

## CONFIDENCE

- **Blocker 1** assumes Midlibrary rows in `loadImages()` carry url/title/credit that the join back-fills. The round-4 comment in events.mjs:119–126 states this join explicitly ("back-filled doc, prompt and provenance from it"), so I'm confident in the mechanism; I could not verify the exact field contents of an index row (images.mjs, corpus.mjs not supplied). The repo itself settles it in minutes.
- **Blocker 2** assumes `createProject` accepts `profileId:'sean'` for a non-default project (projects.mjs not supplied) and that `poolFor` doesn't independently refuse such namespaces. The UI path (app-shell profile select includes 'sean') makes this likely; read projects.mjs to confirm.
- Not verifiable from this document at all: `probe.js` (whether `judge.event()` always attaches full candidate projections and `reasonLockedBeforeReveal`), `video.mjs` (the medium=vector above), `routes-make.mjs`/`routes-renders.mjs` response shapes consumed by app-make/app-judge, `capture-workflow.mjs`, and all three CSS files — so the house visual rules (palette tokens, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1, styled-components/Victory bans) are **unverifiable, not verified-passing**; the shown markup is vanilla HTML/JS with external CSS, which is itself worth a sentence in the round-6 record. No yoga/meditation language and no credential phrasing appear anywhere in the supplied source; PII discipline in the document itself is clean.
- The 479 checks: I cannot audit which cannot fail. The structural markdown-writer assertion cited in swan-prompt.mjs:59–61 is the right pattern; the leak sweeper is its missing analogue for the licence law.

**REVISE.**
