# Hostile-review packet — Swan Taste Brain: partner mode + client mode, and the road to an everyday "click-click-click" app

**Board:** SWA-186 · **Date:** 2026-08-25 · **Author of the work under review:** Fable 5 (Final Decider; does not sit on this panel) · **Privacy:** IDs and roles only — the second user is "the partner"; no names, no keys, no image bytes, no Midlibrary corpus text. Sref codes are public Midjourney style codes.

## 0. What you are reviewing, and the owner's north star

A local, loopback-only tool (`127.0.0.1:7331`, Node, no build step, no auth by design) that (a) generates Midjourney prompts from a 223-code style corpus steered by the owner's recorded taste, and (b) since yesterday discovers that taste the way a courtroom would — real pictures, judged, recorded as append-only evidence — and compiles it into tier-labelled directions. Today it gained **two more users** of the same machinery.

The owner's words for where this must go (cleaned from dictation):

> "It created that prompt app that creates prompts based off the Midjourney brain — I hope that's tied into it too, and I can use that app and just create stuff and just click, click, click, click. It should be like Midjourney, actually — I was trying to build it more like Midjourney. A combination of Midjourney and ChatGPT, here, for videos and images."

So the bar is not "does the code work" (it does — proofs below). The bar is: **is this the right foundation for an everyday image-and-video creation app the owner and his partner reach for daily, and what is missing, wrong, or over-built for that?** Be hostile. Findings without file:line or a reproduction are hypotheses and will be treated as such (the Final Decider verifies every finding against the code before acting).

## 1. The system in one screen

```
Swan Prompt Studio (launcher) → node prompter/serve.mjs → 127.0.0.1:7331
  /            prompt page: Generate · Taste-steered|Surprise · aspect · Copy · Keep · ★5/1   (ui.html, 159 lines)
  /api/prompt  generate(corpus, taste, opts) — taste from taste/*.md (themes, rejected, loved-srefs, kept)
  /probe       the courtroom: 12-up grid on a neutral-gray well; closest/miss ≤3; reason+outcome LOCKED before the label reveals
  /api/probe   ?profile=&project=&seed=  → ids + URLs (never bytes); pool law + never-show-twice applied server-side
  /api/event   POST — THE ONLY WRITER of taste/**/events/<session>.jsonl (TasteEvent v1)
  /api/profile ?profile=&project=  → tally compiler → ≤3 directions, each tier: evidence | prior
  /brief       readout for one memory (partner readout / client closing deck; Print/PDF; Copy as text)
  /api/projects GET (list) · POST (create — behind the origin gate)
  ComfyUI node (5090 desktop) calls /api/prompt and /api/keep — local image generation exists but is NOT in the taste loop
  export-bundle.mjs → ONE static HTML (8 grids) for off-machine judging → results JSON → import-bundle.mjs → POST /api/event
```

Picture pools: Midlibrary reference images (owner's personal offline copy of a third-party archive — licence: never leaves the machine, never shown to anyone but the owner on loopback), Unsplash + Pexels photos (2,120, hotlinked + credited), ESA/Webb (602, CC BY 4.0).

**Laws already set by an earlier panel (do not relitigate; do attack violations):** never lead the witness · real pictures are the courtroom, generated candidates are not (yet) · one writer, agents read IDs never images · four kinds of "no" (content / style / execution / brand-law) stay apart · every direction carries its tier · licence containment as above.

## 2. What was built today (the work under review)

**One memory = profile × project.** `profile ∈ sean | partner | client`; `project` = slug `^[a-z0-9][a-z0-9-]{0,39}$` — names a design, never a person. `sean/default` is the legacy `taste/events/` directory, untouched. Every other namespace is `taste/profiles/<profile>/<project>/{project.json, events/, taste-profile.json}` and is **created empty** — the owner's rule: "it will always start a new memory for designs."

**Two modes on that mechanism.** *Partner* = the household's second user designing for her own business. *Client* = the prospect's view; kept on the owner's correction because he and his partner run sales-practice meetings (she plays the client, he pitches and closes) — so the client copy must be the real client-facing copy, and `/brief` doubles as the closing deck. A real hosted client route in the SaaS remains a separate product decision (PII, consent, retention), deliberately not built.

**Witness law** (`lib/events.mjs`, validateEvent):
```js
export const SOURCES = ['sean', 'partner', 'client', 'agent-placeholder', 'imported', 'inferred'];
export const PROFILES = ['sean', 'partner', 'client'];           // human witnesses
export const CHANNELS = ['page', 'bundle'];                       // how a judgement arrived
if (e.profileId !== undefined) need(PROFILES.includes(e.profileId), …);
if (e.projectId !== undefined) need(isProjectId(e.projectId), 'projectId must be a slug … never a name');
if (PROFILES.includes(e.source)) {
  need(e.source === profileOf(e), `source '${e.source}' cannot write into profile '${profileOf(e)}' — a witness writes only its own memory`);
} else if (SOURCES.includes(e.source) && !allowNonSean()) {      // agents: still flag-gated, test fixtures only
  errors.push(`source '${e.source}' refused: only a human witness may write in production`);
}
// appendEvent(e, dir): dir = dir ?? eventsDirFor(profileOf(e), projectOf(e))  — a caller cannot aim an event at another memory
```
Other v1 validation unchanged: schemaVersion; eventType ∈ pair|grid-selection|kept-triage|shipped-outcome|reversal; opaque hex sessionId (a name-shaped id is refused); candidates are ids + http(s) URLs, `data:`/base64 refused anywhere; ≤64 KB; grid items must cover every candidate; a closest/miss item needs reasonCode + outcomeClass + `reasonLockedBeforeReveal: true`; eventId = sha256(session|type|sorted ids|presentedAt) → idempotent.

**Pool law** (`lib/projects.mjs`):
```js
export const SHAREABLE_MIX = { photo: 9, webb: 3 };   // full mix (owner only) = 6 Midlibrary + 4 photo + 2 Webb
export function poolFor(profile, project, images) {
  const pj = readProject(profile, project);
  const full = isDefaultNamespace(profile, project) || (pj?.pool === 'full' && profile !== 'client');
  if (full) return { pool: 'full', images, mix: DEFAULT_MIX };
  return { pool: 'shareable', images: images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection)), mix: SHAREABLE_MIX };
}
// createProject: client + pool 'full' → refused; ≤8 theme words /^[a-z0-9][a-z0-9 -]{0,39}$/; title ≤80; sean/default cannot be created
// DONE_FLOOR: sean 2 grids/8 judgements; partner & client 8 grids/40 judgements
```
The image LIST is filtered, not just the quota — so a shareable grid can never be back-filled from Midlibrary when a quota runs short (40-seed test: zero Midlibrary ids/hosts/provenance).

**Routes** (`lib/routes-modes.mjs`): `namespaceFrom(url)` validates both params against the enums (400 otherwise); `probeFor()` = pool law + `excludeIds = judgedIds(readEventsFor(profile, project))` (a memory never sees the same picture twice) + the owner's rejected srefs only for his own profile. `POST /api/projects` sits behind the existing origin gate (Host must name the server; Origin absent or own-page) — foreign Origin → 403, proven live.

**Compiler** (`lib/profile.mjs`): `tally(events, images, witness)` counts only `source === witness`; style|mixed → reason/sref/provenance tallies, content → subject only, execution ignored, brand-law listed never counted; `picks` = the chosen pictures (id, url, credit, pageUrl — never bytes); priors for a non-default namespace come from the project's own theme words, **never** the owner's `themes.md`; `progress` vs the done floor.

**Page** (`probe.html` + shared `probe.js`): mode bar Who · Memory · New project (title + theme words; partner-only checkbox "include Midlibrary — this desktop only"); copy per mode (client copy = "no wrong answers — this is how we find your direction"; brand-law chip = "not right for my brand" for non-owner); after recording, Done becomes "Next grid →" (one click). `probe.js` is the ONE judging implementation; the bundle inlines it.

**Bundle** (`export-bundle.mjs` / `bundle.html` / `import-bundle.mjs`):
```js
// planGrids: shareable images only; exclude = judgedIds(namespace) ∪ every earlier grid; seed+i per grid → deterministic
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
if (/ml:img:|website-files\.com|midlibrary-reference|midlibrary\.io/i.test(json)) throw new Error('refused: the bundle payload would carry Midlibrary');
// bundle.html: judgements persist in localStorage under the bundle id (reload-safe); Download results (Blob) + Copy results (clipboard)
// import-bundle: checkResults → channel 'bundle', event.profileId/projectId == file's, source == profileId, validateEvent — then POST each to /api/event; duplicates reported
```

**Proof (current session):** `test-modes.mjs` 56 PASS · `test-bundle.mjs` 25 PASS · `test-probe.mjs` 81 PASS · `test.mjs` 52 PASS · headless-Chromium 33/33: probe at 1440 and 414 (12 pictures naturalWidth>0, 0 controls under 44 px, 0 horizontal overflow), client project created through the form → 9 photos + 3 Webb, reason locked before reveal, record → "1 of 8 grids recorded", next grid 0 repeats, brief at 414/1440 with linked credits, foreign-Origin POST → 403, bundle from `file://` at 414 (reload keeps place, download → 2 events → import "2 recorded · 0 refused", re-import "2 already there"), owner's memory unchanged at 3 grids / 18 judgements; proof script self-checks for placeholder-`true` steps.

## 3. Gaps the author already sees (go deeper than these, do not restate them)

1. **The prompt generator is not tied to the taste brain.** `generate.mjs` → `chooseSref(corpus, taste, rng, mode)` exploits `taste.loved` (star ratings typed into `loved-srefs.md`) with explore rate `max(0.25, 1 − positive/20)`; `taste` comes from four markdown files. The compiled `taste-profile.json` (evidence-tier srefs, the pictures actually chosen, proposed avoids) and `taste/**/events` are **unreferenced** by `generate.mjs`, `taste.mjs`, `swan-prompt.mjs`, `ui.html`. Partner/client namespaces have no prompt generation at all.
2. **No image loop.** Prompts are text the owner copies out. The ComfyUI node exists on the same desktop (5090) but renders never come back into the courtroom; pair mode (`eventType: pair`, `generatorDistribution: local-comfy`) is in the schema with no UI.
3. **No video.** The schema already carries `medium: film` and reason codes `motion | pacing | edit-rhythm | sound`; nothing produces or judges video.
4. **Two pages that should be one app.** `/` (prompts) and `/probe` (judging) and `/brief` (directions) are separate pages with separate copy; the launcher opens `/`.
5. Not built by decision: overlap view for a project two people judge; Q0-for-clients (their kept artifacts as candidates); hosted client route; Unsplash `download_location` ping when a photo is used in a build.
6. Household trust, not auth: the Who select lets anyone at the desktop pick the owner. iOS Safari `localStorage` on `file://` unverified for the bundle (results file still works).

## 4. The author's proposed direction — attack this, do not just approve it

**Goal:** the Midjourney-like loop, fully local, per memory: *pick a memory → make → look → judge → the memory gets sharper → make again* — every step one click.

- **P1 · Directions drive generation.** `GET /api/prompt?profile=&project=` builds the style pool from that memory's compiled profile: evidence-tier srefs weighted by `closest − miss` margin, the chosen pictures' subjects and the project's theme words as subject seeds, `proposedAvoids` as vetoes; the owner's `sean/default` keeps `loved-srefs.md` as an additional exploit pool. Explore/exploit stays; `confidence` is computed from evidence counts, not star ratings. The same call serves ComfyUI (already wired) and the page.
- **P2 · Render locally, judge the renders.** "Make 4" → ComfyUI on the 5090 renders the prompts → they appear in the same neutral-gray well as a grid (`generatorDistribution: local-comfy`, candidates = local file ids + `file://`/served URLs, never bytes in the event) → closest/miss with the same locked-reason discipline → same memory. This is where Midjourney's "vary / upscale / re-roll" grammar maps onto the courtroom: re-roll = new seed same direction; vary = same subject, sref from the next evidence row; keep = `kept-triage`.
- **P3 · Video from the same directions.** A "video" mode that emits Seedance 2.0 prompts (the repo already has the prompt-building rules for hero loops vs exercise demos) from a direction + a subject, judged with the film reason codes when a clip exists. No generation infra assumed yet — prompts first, like the image side started.
- **P4 · One shell.** `/` becomes: **Who · Memory** (the mode bar), then four tabs — **Make** (prompts / images / video), **Judge** (the probe), **Directions** (the brief), **Kept** (library). Same 44 px controls, same copy variants per mode, launcher opens it.
- **P5 · Keep the laws structural.** Rendered candidates are `generated`, never mixed into the "real pictures" evidence tier without a distinct provenance; a partner/client memory can generate prompts but its picture pool stays shareable; nothing in a bundle ever carries a render that embeds Midlibrary.

## 5. What we want back (markdown, sections in this order)

1. **Hostile findings on what was built** — bugs, law violations, licence/privacy leaks, UX failures at 414 px, anything that breaks when the partner uses it alone. Severity P0/P1/P2, file + symbol, and a reproduction or the exact input that breaks it.
2. **Attack the direction (§4)** — where P1–P5 are wrong, over-built, or in the wrong order; what a Midjourney-grade daily loop actually needs that P1–P5 miss.
3. **Features and logic to add** — ranked by value ÷ effort for an everyday image-and-video app for two household users; each with: what it is, why it moves the daily loop, the one test or proof command that would show it works, and what it must NOT touch.
4. **What to NOT build**, and why.
5. **Three ways this fails in daily use**, absence-first gaps (what is missing that should exist), and the single first slice you would ship tomorrow.

Rules of evidence: quote the packet or name the file:symbol; no findings about files you have not seen; mark anything you could not verify as a hypothesis. Do not propose vector search, cloud upload of pictures, or a hosted client route — those are decided. Do not paste Midlibrary text back. Keep to ~1,500 words of substance over ceremony.
