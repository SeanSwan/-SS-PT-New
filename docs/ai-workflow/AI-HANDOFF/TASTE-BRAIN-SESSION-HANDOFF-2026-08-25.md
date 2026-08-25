---
decision: Session handoff for the Swan Taste Brain workstream 2026-08-24/25 — from "summarise the transcripts" to a working courtroom-first taste loop; what shipped, what didn't, where next (client mode).
status: open
supersedes: none
---

# Taste Brain — Session Handoff 2026-08-24 → 2026-08-25

- **Author:** Claude Fable 5 (Final Decider) · **Owner:** Sean · **Board:** SWA-186 (taste brain), SWA-55 (cinematic doctrine)
- **Read this if:** you are the next agent on the taste brain, the design brain's Visual-taste mode, or "client mode". You should not need any other doc to orient; pointers at the end.
- **Two repos:** `SS-PT` (this repo, public-history, private on GitHub) holds doctrine + the grill-me skill. **`swan-taste-brain`** (`C:\Users\BigotSmasher\Desktop\swan-taste-brain`, local git, NO remote, deliberately outside SS-PT because it holds a copyrighted corpus) holds the runtime.

---

## 0. Where we started (2026-08-24)

Sean's ask: the Swan Design Brain had been fed six practitioner transcripts + the Midlibrary "Midjourney brain"; it was supposed to let **grill-me interview Sean to discover the styles he likes, then offer style directions from the Midjourney brain** — for websites, pictures, and film. He wanted (a) a digest of those transcripts plus a new one (Nate Herk's Scrollcraft), (b) a prompt for ChatGPT Pro to deep-research and hostile-review the brain, then (c) to build.

**State at start:** the "taste model" was keyword matching (+2/−3) over `themes.md`, rating² weighting of 1–5 ratings, a 25% exploration floor, and agent-written placeholder ratings still steering output. No pictures anywhere in the loop. No mechanism connected grill-me → taste brain → suggestions. 145 on-taste subjects of ~4,000 prompts.

## 1. What we did, in order (every step has a commit)

| # | Step | Where | Proof |
|---|---|---|---|
| 1 | Found the six transcripts — never stored raw; distilled into `design-brain/field-techniques.md` §T1–T6 (+ ComfyUI MCP packet, + Midlibrary → `style-taxonomy.md`) | SS-PT `origin/main` | read |
| 2 | Wrote the corpus digest (T1–T8 incl. Scrollcraft) + the ChatGPT Pro prompt | `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md` — **PR #74 merged** `0a6f6f62a` | on main |
| 3 | Discovered the repo is PRIVATE → anonymous raw URLs 404; corrected the doc to connector-or-upload access | same doc | curl 404 → fixed |
| 4 | Sean ran GPT Pro; review arrived truncated at §4 Q13 (50k paste cap). Assembled a panel packet (review verbatim + my read + 8 questions) | `GPT-PRO-DESIGN-BRAIN-REVIEW-PANEL-PACKET-2026-08-25.md` (uncommitted, wip tree) | file |
| 5 | Six-seat hostile panel: Grok ~$0.10, GLM $0, DeepSeek Pro ~$0.04, Qwen $0, Ox Alpha $0 (retry), **Kimi blocked by its own $0.40 cap**. Unanimous REVISE of the GPT review | `panel-gpt-pro-design-brain-review-2026-08-25/` + `FABLE-SYNTHESIS.md` (uncommitted, wip tree) | 5 reply files |
| 6 | **Probe** — 12 stratified Midlibrary pictures, neutral gray judging well, TasteEvent v1 append-only store, single writer `POST /api/event` | taste-brain `8875be9` | test-probe 45/45, Chromium 12/12 |
| 7 | **Webb** — ESA/Webb archive, 602 CC BY 4.0 pictures, 3-of-12 quota, per-candidate provenance | taste-brain `66d1e2b` | 58/58, Chromium 12/12 |
| 8 | Sean's first two grids committed | taste-brain `5490000` | his file |
| 9 | `.env` gitignored, then created with empty placeholders; Sean added Unsplash + Pexels keys | taste-brain `e8efd7f` | presence-check only |
| 10 | **Photos** — `fetch-photos.mjs`: 30 theme words + subjects lifted from Sean's own closest picks → 2,120 photos; grid = **6 ML + 4 photo + 2 Webb** | taste-brain `04a336c` | 66/66, Chromium 12/12 |
| 11 | **Tally compiler** — `taste/events` → `taste-profile.json` → exactly three directions with `tier: evidence|prior`; `GET /api/profile`; Sean's third grid | taste-brain `20f04c8` | 82/82, /api/profile live |
| 12 | **grill-me Visual-taste mode** + `design-brain/taste-discovery-grill.md` + index row — **PR #75 merged** `84c648f24` | SS-PT main | brain:links 76/76 |
| 13 | Learning packet `hermes-learning-packets/20260825-a-courtroom-before-a-model.md` | SS-PT wip tree `e78ddbf5f` (local) | scanned clean |
| 14 | Started the first live run of the mode on the homepage hero: brainstorm doc created, **Q0 asked, unanswered** | `docs/ai-workflow/brainstorms/homepage-hero-visual-taste-2026-08-25.md` (uncommitted) | — |

**Taste-brain HEAD:** `20f04c8` (then untouched). Tree clean. `taste/events/` holds exactly one file, Sean's (`d9c219a81887d0ef.jsonl`, 3 grids). Every automated session file was deleted after each run.

## 2. What the system does now (runtime contract)

```
Swan Prompt Studio.cmd  /  node prompter/serve.mjs      → 127.0.0.1:7331 (loopback only, origin-gated writes)
GET  /probe               12 pictures: 6 Midlibrary + 4 photos (Unsplash/Pexels) + 2 Webb, shuffled; neutral #7F7F7F well;
                          closest/miss ≤3 each, unforced; reason + outcome class locked BEFORE label reveal; "I know this one"
GET  /api/probe?seed=&photo=&webb=&n=      the grid as JSON (ids, urls, provenance, credit) — never bytes
POST /api/event           THE ONLY WRITER of taste/events/<session>.jsonl (TasteEvent v1: schemaVersion, eventType,
                          source enum — non-'sean' refused in prod, idempotent eventId, data:/base64 refused)
GET  /api/profile         tally compiler: reasons/srefs/subjects/provenance counts partitioned by outcomeClass
                          (style|mixed count; content → subject only; execution ignored; brand-law listed, never counted);
                          exactly 3 directions, each tier 'evidence' (≥2 closest picks, event ids, sample prompt = the
                          picture he chose) or 'prior' (themes.md, labelled); proposedAvoids (never written)
node prompter/fetch-webb.mjs      refresh Webb index          node prompter/fetch-photos.mjs   refresh photos (learns from picks)
node prompter/compile-taste.mjs   write taste-profile.json    node prompter/test-probe.mjs     82 checks · test.mjs 52 checks
```

**Sean's taste after 3 grids / 18 judgements:** realism 5 closest / 3 miss · density 2/0 · composition 1/0 · misses by subject 3, material 2. `[EVIDENCE]` srefs 1664093 (editorial photographic portrait), 1688459441 (technical blueprint schematics), 2252532246 (steampunk urbanscape). `[PRIOR]` NatGeo-grade realism · Wild and tropical animals (one more landscape/animal *closest* flips the photo direction). 8 proposed avoids — all kids/cartoon/fantasy illustration.

## 3. The laws the panel set (do not relax)

1. **Don't lead the witness** — no "Recommended: <Swan's self-portrait>" before an answer; verbal questions are Q0 kept-triage, Q1 medium+surface, Q3 refusals in Sean's words; then pictures.
2. **The courtroom is real pictures, not generated candidates** — MJ grids/references = truth; Midlibrary thumbs = discovery only; local Comfy = controlled pairs (not built).
3. **One writer, agents read IDs** — the probe page writes; agents never open `taste/events`, never request image bytes, never write a taste `.md`.
4. **Four kinds of "no" stay apart** — content / style / execution / brand-law on every judgement.
5. **Tier is truth** — every direction says `evidence` or `prior`.
6. **Licence containment** — Midlibrary corpus is Sean's personal offline copy: shown to Sean on loopback only, never committed/uploaded/sent to a model/**shown to a client**. Unsplash (hotlink required, credit), Pexels (credit), ESA/Webb (CC BY 4.0) are the shareable pools. `static.midlibrary.io` hotlinks 403 — allowlist is measured, not hoped.

## 4. Not done (honest list)

- **Live Visual-taste run** — Q0 asked, not answered; Q1/Q3/probe/profile presentation not yet exercised with Sean on a real surface. The mode is *installed*, not *proven in use*.
- **Kimi K3 seat** never ran (cap $0.40 < worst case $0.443). Decision: lift to $0.50 once, or skip.
- **GPT's truncated tail** (§4 Q13+, worked example, 12 style suggestions, action list) never recovered; largely superseded by the panel synthesis §6 demand list.
- **Cross-session `excludeIds`** — the page doesn't pass previously judged ids; a picture can recur across grids.
- **Pair mode** (`eventType: pair`, controlled same-subject pairs via local Comfy) — schema supports it, no UI.
- **Bradley–Terry / active sampler / media heads** — deliberately deferred until ≥200 `source:sean` events (18 now).
- **Unsplash `download_location` ping** — stored, not fired; must fire when a photo is *used* in a build.
- **`field-techniques.md`** still `DRAFT` with a stale `T4 — (awaiting transcript)` stub; T8 (Scrollcraft) not yet added there.
- **Doctrine ticket** for GPT's P0-1/P0-2 (governance theatre; spacing/radius/motion/content-cap contradictions across `design.md` / `typography-grid.md`; index says "no temporary files") — SWA-163 tracks spacing only.
- **Uncommitted on the stale wip tree:** panel packet, panel folder + FABLE-SYNTHESIS, brainstorm doc, this handoff. They are files on disk, not history; commit from a clean tree or re-create on a docs branch.
- **Learning packet** committed only on the wip tree (`e78ddbf5f`); not on main.

## 5. Partner mode + client mode — BUILT locally 2026-08-25 (the session that owns the taste-brain tree; SWA-186)

> **AS-OF 2026-08-25, later the same day.** Sean redirected "client mode" into **two household modes and kept client mode**: *partner mode* — "whenever we want to design new sites or assets, she can choose the option and it will always start a new memory for designs" — and *client mode*, kept because "me and my wife practise sales and closing on each other — she pretends she's a client, I try to close her." Built, hostile-reviewed and browser-proven in `swan-taste-brain` (commits `027a187` → the three after it; `git log` there). Decisions + Q&A: `docs/ai-workflow/brainstorms/taste-brain-partner-and-client-mode-2026-08-25.md`. Runtime doc: `swan-taste-brain/prompter/README.md` § "Partner mode + client mode". Qwen's §8 interview starts from what exists, not from the old sizing.

**What exists now** — every line `[VERIFIED]` by `node prompter/test-modes.mjs` (56 PASS), `test-bundle.mjs` (25 PASS), `test-probe.mjs` (81 PASS), `test.mjs` (52 PASS) and a 32-check headless-Chromium proof against the live server:
- **One memory = profile × project.** `profile ∈ sean | partner | client`; `project` = slug, never a person's or a school's name. `sean/default` is `taste/events/` — untouched (still 3 grids / 18 judgements). Everything else lives at `taste/profiles/<profile>/<project>/{project.json, events/, taste-profile.json}` and is created **empty** — nothing is copied in from anyone.
- **Witness law:** `source` must equal the profile it writes into (Sean can never land in the partner's memory; agents stay flag-gated). `channel = page | bundle` says how a judgement arrived.
- **Pool law (tightened by the five-seat panel, same day):** Midlibrary is the owner's alone — full pool = Sean only, computed from the profile; the partner opt-in was removed; `compileProfile` filters non-Sean picks to shareable provenance (the brief prints picks). **A bundle is shareable-only whatever the project says** and is checked before the file is written. **Never-show-twice is enforced at the writer** (`appendEvent` refuses a grid whose pictures this memory already judged — replay with a new timestamp and bundle/page overlap both refused). **Undo** = a `reversal` event (page + bundle); an undone grid stops counting and its pictures return to the pool. Pool exhaustion is stated with a hint.
- **P2 — the render loop (built same day, after a second five-seat round attacked the contract on paper):** ComfyUI **pulls** from the brain — the `Swan Prompt` node (profile · project · mint) GETs `/api/prompt` for that memory, POSTs `/api/intent` (content-hash token, gated), and outputs a `prefix` (`swan/<token>`) wired into `SaveImage.filename_prefix`; the file lands as `<output>/swan/<token>_00001_.png|mp4` (output dir from `SWAN_COMFY_OUTPUT` → `prompter/comfy.local.json` → `Z:\SwanStudios-Video\output` — on this desktop ComfyUI renders **video**). `/probe` → Judge: **My renders** (`pool=renders`, never mixed with real pictures, clips play muted, film reason codes, lock reveals the prompt); `/renders/<profile>/<project>/<token>/<n>` is namespace-bound, sniffed, size-capped; a judged render counts toward **subjects only** — 0 toward style codes (two seats: not even 0.5); `/brief` shows "Renders you liked" apart; the prompt page's **Send to ComfyUI** mints and copies the prefix. `node prompter/fetch-renders.mjs --profile … --project … [--prune]`. Tests `test-renders.mjs` (38, real PNG fixtures, no ComfyUI needed).
- **P2 v2 — MAKE (built same day):** setup is one command, no export dance — `node prompter/capture-workflow.mjs` reads the API-format graph ComfyUI **last ran** from its own `/history` (`--show` prints what it will steer; template at `prompter/comfy-workflow.local.json`, gitignored). Then every prompt has **Make**: `POST /api/make` mints the intent, substitutes **only** prompt + seed + save prefix into Sean's graph and posts to ComfyUI's `/prompt`; `GET /api/make/status` drives a bar that states workflow/ComfyUI/render truth. `lib/workflow.mjs` finds the prompt field by **wiring** (a sampler's `positive`) — name-matching alone would have overwritten the negative prompt — and `applyTo` diffs its own output against the template, refusing if anything else moved; a poisoned or stale field map is refused before use; the endpoint is loopback-only. Models, LoRAs, resolution, steps, cfg, sampler, fps, codec, negative prompt: never touched. Tests `test-make.mjs` (38, fake ComfyUI, no GPU). Still open: HTTP Range for clip seeking; a decoded clip in the well is unproven in-browser; batch "Make 4" from one click (the route already takes up to 8 prompts).
- **Tie-in (Sean's "I hope that's tied into it"):** `lib/taste-namespace.mjs` — `/api/prompt?profile=&project=` generates from ONE memory: Sean = markdown taste + his evidence-tier codes (7 in play, confidence *partial*); partner/client = theme words + the words of chosen pictures + refusals as vetoes + the project's own kept prompts (`/api/keep` per memory; star ratings refused for non-Sean), labelled `words-only` until evidence. The prompt page (`/`) carries the same Who · Memory bar as `/probe` and `/brief`. Panel folder + synthesis: `docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/` (P2 render-loop contract corrected there).
- **Side by side:** `/probe` mode bar — Who · Memory · New project (title + theme words). `lib/routes-modes.mjs` (namespace-aware routes; project write sits behind the origin gate — foreign Origin → 403 proven live), `probe.js` (the ONE judging implementation; the bundle inlines it), `probe.css`, `brief.html` (`/brief?profile=&project=` — partner readout / **client closing deck**: three tier-labelled directions, the chosen pictures with linked credits, Copy as text, Print/PDF). Priors for a fresh project are its own theme words; Sean's `themes.md` never leaks.
- **Off-machine:** `node prompter/export-bundle.mjs --profile partner --project <slug>` → ONE HTML file (8 grids, judgements kept in-page, reload-safe, Download + Copy results) → she sends back `swan-taste-results-*.json` → `node prompter/import-bundle.mjs <file>` → POST `/api/event`, the one writer (duplicates reported, never re-written).
- **CLI:** `compile-taste.mjs --profile --project`; `fetch-photos.mjs --project partner/<slug>` or `--themes "…"` — merges HER words into the shared photo index.
- **Floors:** partner/client = 8 grids ≈ 40 judgements before the brief says "enough for a direction"; the page shows "N of 8 grids recorded".

**Still true / not built:** a hosted, authenticated client route in SwanStudios is a T3 product decision (client PII, consent, retention — Rule 62 + operator registry first); Q0-for-clients ("send me 3 things you love" as candidates) not built; pair mode, Bradley–Terry, media heads unchanged (≥200 events). A client's taste is never Swan brand law — it feeds *their* site under the portable half of the law split.

## 6. Paste-ready prompt for the next agent

```
You are picking up the Swan Taste Brain (SWA-186). Read, in order:
1. docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-SESSION-HANDOFF-2026-08-25.md  (this file)
2. docs/ai-workflow/design-brain/taste-discovery-grill.md  (the protocol; on main)
3. .claude/skills/grill-me/SKILL.md § "Visual-taste mode"  (on main)
4. swan-taste-brain/prompter/README.md  (runtime; local repo C:\Users\BigotSmasher\Desktop\swan-taste-brain, HEAD 20f04c8)
Start the taste-brain server (Swan Prompt Studio.cmd or node prompter/serve.mjs), then `curl -s 127.0.0.1:7331/api/profile`
and read grids/judgements/directions — that is the current state of Sean's taste. Laws: never lead the witness; agents read
IDs never images; never open taste/events or write a taste .md; every direction carries its tier; Midlibrary pictures are
never shown to anyone but Sean on loopback. Run `node prompter/test-probe.mjs` (82) and `node prompter/test.mjs` (52) before
and after any change. Next slice is EITHER the live Visual-taste run on the homepage hero (brainstorm doc exists, Q0 pending;
KEEP Swans.mp4 as the footage) OR client mode per §5 of the handoff — Sean decides. Commit per slice, explicit paths, batch-push.
```

## 8. WHO BUILDS NEXT — Qwen in Hermes, blueprint by Ox Alpha first (Sean's directive 2026-08-25)

Sean: *"We're going to have Qwen build the rest of this in my Hermes. The first thing it does is ask Ox for a blueprint — wireframe, flowchart (mermaid), plan to build it with the upgrades I want. Before it starts to build, I want Qwen to ask me what the upgrades are, so it can tell Ox."*

**The sequence Qwen (Hermes) runs, in order — no code before step 4 is approved:**

1. **Orient** (T0): read this handoff §0–§6, `taste-discovery-grill.md`, `swan-taste-brain/prompter/README.md`. From WSL the taste brain is at `/mnt/c/Users/BigotSmasher/Desktop/swan-taste-brain`. Start the server if needed and `curl -s 127.0.0.1:7331/api/profile` to see the current state. Run all four suites — `node prompter/test-probe.mjs`, `test.mjs`, `test-modes.mjs`, `test-bundle.mjs` — each must print ALL CHECKS PASS (81 / 52 / 56 / 25 PASS lines as of 2026-08-25) before anything else.
2. **Interview Sean about the upgrades** (T0, grill-me discipline: ONE question at a time, lead with a recommended answer *here* because this is scope, not taste). Known candidates to confirm/extend — do not assume the list is complete:
   - **Partner mode + client mode — SHIPPED locally 2026-08-25 (§5). Do not re-plan them.** Ask what Sean wants *on top*: overlap view for joint projects (where his and his partner's picks agree), Q0-for-clients (kept artifacts as candidates), the partner default pool (shareable now; one constant), a hosted client route (T3 — Sean's call, not a build).
   - ~~Cross-session `excludeIds`~~ — shipped: a memory never sees the same picture twice (page and bundle).
   - Pair mode (same subject, two treatments — local Comfy).
   - Auto-refresh of the photo pool from picks (`fetch-photos.mjs` on a schedule / after N grids).
   - Firing Unsplash `download_location` when a photo is *used* in a build.
   - Anything else Sean names — write every answer to `docs/ai-workflow/brainstorms/taste-brain-upgrades-<date>.md` as it lands (checkpointing law).
3. **Ask the blueprint panel — Ox Alpha, GLM-5.3, Kimi K3** (Sean 2026-08-25: *"it can tell Ox and GLM and Kimi K3"*). Assemble ONE packet — IDs/roles only, **no client names, no keys, no image bytes, no Midlibrary text** (Ox retains prompts at an undisclosed provider) — containing: §2 runtime contract, §3 laws, §5 as built, Sean's answers from step 2, and the TasteEvent v1 schema (now with `profileId` / `projectId` / `channel`). Ask each seat for: (a) **wireframes** (ASCII/markdown) for every new surface, desktop and 414px; (b) a **mermaid flowchart** of data flow — probe → events → compiler → directions → client export → back to Sean; (c) a **numbered slice plan**, each slice ≤1 day, with its test, its proof command, and what it must NOT touch; (d) the 3 ways it fails; (e) absence-first gaps. Transport: `node /mnt/c/Users/BigotSmasher/Desktop/quick-pt/SS-PT/scripts/consult-panel.mjs --document <packet> --seats ox,glm,kimi --out-dir <beside the brainstorm doc>` — run `--dry-run` first. **Kimi is paid and self-caps at $0.40:** keep the packet under ~9k tokens so its worst case clears the cap, or ask Sean for a one-time lift before `--confirm-spend`; Ox and GLM are $0. Then Qwen writes a **synthesis** (consensus / contradictions / unique insights / blind spots / one fused blueprint) — Qwen's synthesis is a draft; Sean decides.
4. **Show Sean the fused blueprint** and get an explicit yes per slice before building (T2 writes to the taste brain only after that yes).
5. **Build slice by slice** — commit per slice with explicit paths in the taste-brain repo; run both test suites before and after; browser-verify any picture surface (`naturalWidth > 0` count, 0 buttons <44px at 1440 and 414); delete every automated session's event file; never touch `taste/*.md`; never bind anything but `127.0.0.1`.
6. **Provenance rule for Qwen:** Qwen is sub-Fable. Its memos go to the Hermes inbox (any-agent); it does **not** write `hermes-learning-packets/` (Fable-tier only, Rule 68). Ox's blueprint is advisory input; Sean is the decider.

**Paste-ready first message for Qwen in Hermes:**
```
Read /mnt/c/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-SESSION-HANDOFF-2026-08-25.md fully, then §8 again.
Do step 1 (orient + run all four test suites; report the PASS counts). Then begin step 2: interview me ONE question at a time about
the upgrades I want for the taste brain — partner mode and client mode are already built (§5), so start with what comes AFTER them.
Checkpoint every answer to docs/ai-workflow/brainstorms/taste-brain-upgrades-2026-08-25.md.
When I say "that's all", build ONE packet (IDs/roles only, no keys, no image bytes, no Midlibrary text) and send it to the
blueprint panel — Ox Alpha, GLM-5.3, Kimi K3 (consult-panel.mjs --seats ox,glm,kimi; --dry-run first; Kimi caps at $0.40, keep
the packet under ~9k tokens or ask me for a one-time lift). Ask each for wireframes (desktop + 414px), a mermaid data-flow chart,
a numbered ≤1-day slice plan with tests and proof commands, 3 ways it fails, and absence-first gaps. Write a synthesis (consensus /
contradictions / unique insights / blind spots / one fused blueprint) and show it to me. Do not write code until I approve a slice.
```

## 7. Pointers
- Panel + synthesis: `docs/ai-workflow/AI-HANDOFF/panel-gpt-pro-design-brain-review-2026-08-25/FABLE-SYNTHESIS.md` (wip tree)
- Corpus digest + GPT prompt: `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md` (main)
- Learning packet: `docs/ai-workflow/hermes-learning-packets/20260825-a-courtroom-before-a-model.md`
- Taste brain memory: `memory/project_swan_taste_brain_and_prompter.md` (updated 2026-08-25)
