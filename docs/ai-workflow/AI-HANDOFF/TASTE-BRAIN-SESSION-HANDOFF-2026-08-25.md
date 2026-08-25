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

## 5. Sean's new idea: CLIENT MODE (captured 2026-08-25, not built)

*"What if a client wants it in their style and vision? Run this in client mode: give them ten grids or however many you suggest, they judge, give it back to me."*

**Verdict: real, and cheap in the runtime — expensive at the boundary.** What it needs:
- **Per-profile namespace** — `profileId` on every event + `taste/profiles/<id>/events/` + `/api/profile?profile=<id>`; Sean's stays the default. Compiler already partitions by fields; this is one more.
- **Client-safe picture pool** — **Midlibrary excluded** (licence); grid becomes photos + Webb only (2,120 + 602 today; refresh with the client's own theme words via `fetch-photos.mjs --profile <id>`). Add the client's kept artifacts as candidates when they have them (Q0 for clients = "send me 3 things you love").
- **Delivery** — today the probe is loopback-only with no auth, by design. Options, cheapest first: (a) Sean runs it *with* the client on a call (screen share, zero new surface); (b) a static export of N grids as an HTML file the client opens locally and returns as a JSON blob (no server, no auth, no Midlibrary); (c) a hosted, authenticated route in SwanStudios — a T3 product decision (client PII, consent, retention) that goes through Rule 62 + the operator registry before any build. Recommend **(b)** for v1.
- **How many grids:** the compiler's evidence floor is 2 closest per direction and the done floor is 8 judgements / 2 grids. For a *stranger's* taste, target **8 grids (≈96 pictures, ~40 judgements, ~15 min)**: enough for three evidence-tier directions across subjects and treatments; 10 is fine, 5 is thin. Stratify the 8 across the client's own theme words + a coverage set so it can surprise them.
- **Output to Sean** — the same three tier-labelled directions + proposed avoids, plus a per-client brief (`tier`, codes/theme words, sample prompts, credits) that `swan-design-router` can consume as style anchors.
- **Risk to name first:** a client's taste is not Swan brand law; the direction feeds *their* site under the universal/portable half of the law split (`field-techniques.md` law-split note), never SwanStudios surfaces.

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

## 7. Pointers
- Panel + synthesis: `docs/ai-workflow/AI-HANDOFF/panel-gpt-pro-design-brain-review-2026-08-25/FABLE-SYNTHESIS.md` (wip tree)
- Corpus digest + GPT prompt: `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md` (main)
- Learning packet: `docs/ai-workflow/hermes-learning-packets/20260825-a-courtroom-before-a-model.md`
- Taste brain memory: `memory/project_swan_taste_brain_and_prompter.md` (updated 2026-08-25)
