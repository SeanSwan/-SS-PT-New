---
decision: "Hand the Swan Taste Brain to the next agent with the whole arc intact: why partner/client modes were built, what the two hostile-review rounds changed, how the render loop and the one-shell app work now, and what to do next."
status: open
supersedes: none
board: SWA-186
date: 2026-08-25
author: Fable 5 (VS Code terminal)
repos: "swan-taste-brain (LOCAL, no remote) + SS-PT docs"
privacy: IDs and roles only — the second user is 'the partner'; no names, no keys, no PII
---

# Swan Taste Brain — household session handoff (2026-08-25)

**Read this file, then `swan-taste-brain/prompter/README.md`, then run the suites. That is enough to continue.**
The earlier same-day handoff (`TASTE-BRAIN-SESSION-HANDOFF-2026-08-25.md`) covers how the taste brain itself
was built the day before; this file covers everything that happened *after* it, in one arc.

---

## 0. Sixty-second version (for Sean)

You already had a **taste brain**: a local tool that shows you real pictures, records which ones you'd
actually ship, and compiles that into three "directions" — plus a prompt generator that writes Midjourney
prompts in your taste. Yesterday it served exactly one person: you.

This session it became a **household creative tool with a working production loop**:

1. **Your partner can use it** — she opens a project, judges pictures, and gets her own direction. Every
   design starts a **fresh memory**, so her school-site look never bleeds into the next thing.
2. **Client mode stayed** (you corrected me on this) — it's your **sales-practice mode**: she plays the
   prospect, you run the real pitch, and the brief page doubles as the closing deck.
3. **The prompt app is tied to the brain** — prompts now come from what a memory actually chose.
4. **The loop closes on your 5090**: Generate → **Make** (queues into *your own* ComfyUI graph) → the render
   appears → **Judge: My renders** → the memory sharpens → generate again. **Make 4** gives you a Midjourney-
   style grid of four variations.
5. **It's one page now** — Make · Judge · Directions · Kept as four tabs at one URL.
6. **Video works** — a Stills|Video switch writes *shot* prompts (camera move, one beat, no Midjourney flags),
   which is what your MiniMax H3 graph actually wants.

Two hostile-review rounds (5 outside models, ~$0.28 total) plus my own passes caught real defects, including
one that would have shown your partner **text from your licensed Midjourney archive** as her own prompts.

**Your one action:** run `node prompter/capture-workflow.mjs --watch`, then use ComfyUI normally — Make arms
itself the moment your first render goes through.

---

## 1. Where this started (the request that began it)

Sean, in his own words at the top of the session:

> "We were gonna go ahead and build a client mode, but instead… I'm only gonna use it for myself and with my
> wife. So I need to be able to send it to my wife. Whenever we wanna design new sites or assets, she can
> choose the option and it will **always start a new memory for designs**, so the designs she's using will be
> unique based on what she chooses in those pictures."

I read that back as "partner mode replaces client mode" — and he corrected me:

> "I don't want [client mode] to die… me and my wife do practice rounds where we role-play. She pretends
> she's a client and I try to close her. So keep all of that and keep on pushing."

Later, the north star for the whole build:

> "It created that prompt app that creates prompts based off the Midjourney brain — I hope that's tied into it
> too, and I can just create stuff and click, click, click. It should be like Midjourney… a combination of
> Midjourney and ChatGPT, for videos and images."

Everything below follows from those three statements.

---

## 2. What exists now (the system in one screen)

Local only. `swan-taste-brain` has **no git remote** — it lives on this machine because the Midlibrary corpus
inside it is third-party copyrighted material.

```
Swan Prompt Studio.cmd  /  node prompter/serve.mjs        → http://127.0.0.1:7331   (loopback only)

ONE PAGE, FOUR TABS  (app.html + app-shell.js + app-{make,judge,directions,kept}.js)
  Make        generate prompts (Stills | Video) → Make / Make 4 / Keep / Copy / Prefix
  Judge       the courtroom: 12-up grid on a neutral-gray well (Pictures | My renders)
  Directions  three tier-labelled directions + the pictures chosen + "Renders you liked"
  Kept        the prompts this memory kept — re-Make, copy, or drop
  Legacy paths /probe /brief /kept open the same shell with that tab preselected.

ONE MEMORY = profile × project      profile ∈ sean | partner | client   ·   project = a slug, never a name
  sean/default → taste/events/ (untouched, 3 grids / 18 judgements)
  everything else → taste/profiles/<profile>/<project>/{project.json, events/, kept.md, renders/, taste-profile.json}
  Created EMPTY. Nothing is ever copied in from another memory.

THE RENDER LOOP (ComfyUI pulls; the brain never drives it, never stores bytes)
  Swan Prompt node (profile · project · mint) → GET /api/prompt → POST /api/intent → prefix `swan/<token>`
  → wire prefix into SaveImage/SaveVideo → <output>/swan/<token>_00001_.png|mp4
  → GET /api/probe?pool=renders → judge → the memory sharpens
  Make / Make 4 do the same from the page: substitute prompt + seed + prefix into SEAN'S captured graph.
```

### The laws (set by two hostile panels; do not relax without a new panel)

| Law | Where it lives |
|---|---|
| A witness writes only its own memory (`source` must equal `profileId`) | `lib/events.mjs` `validateEvent` |
| Never-show-twice, enforced at the **writer**, for every judgement kind | `lib/events.mjs` `appendEvent` |
| Undo is a `reversal` event (idempotent); an undone grid frees its pictures | `events.mjs` + `profile.mjs` `activeEvents` |
| **Midlibrary is Sean's alone** — full pool computed from the PROFILE; never a partner, a client, a bundle, or a printed brief | `lib/projects.mjs` `poolFor`, `profile.mjs` picks filter |
| **A non-Sean memory generates only from its own material** (kept · picks · theme words) — never the corpus, never a corpus artist | `lib/taste-namespace.mjs` `ownSubjects`, `generate.mjs` `pool.ownOnly` |
| A judged **render** counts toward subjects only — **zero** toward style codes | `lib/profile.mjs` `tally` |
| Video prompts carry **no Midjourney parameters** | `lib/video.mjs` |
| Make substitutes exactly three fields and proves it (self-diff + field-map validation) | `lib/workflow.mjs` `applyTo` |
| Loopback only; every write behind the origin gate; renders sniffed, size-capped, namespace-bound | `serve.mjs`, `lib/routes-renders.mjs` |
| Tests may never write the production workflow path (`SWAN_COMFY_WORKFLOW`) | `lib/workflow.mjs` |

---

## 3. What happened, in order (the middle)

Every step below is a commit in `swan-taste-brain` (local, no remote) with a matching SS-PT docs commit.

| # | Commit | What |
|---|---|---|
| 1 | `027a187` | **profile × project namespaces** — partner + client witnesses, project registry, per-namespace compiler |
| 2 | `9b11080` | probe **mode bar** (Who · Memory · New project), namespace routes, shared judging core, `/brief` |
| 3 | `702cc30` | **"send it to my wife"** — one static HTML bundle out, results JSON back, through the one writer |
| 4 | `a2862dc` | CLI + docs: `compile-taste --profile/--project`, `fetch-photos --project/--themes` |
| — | — | **Hostile panel round 1** (Ox Alpha · GLM-5.3 · HY3 · Kimi K3 · DeepSeek V4 Pro, ≈$0.16, all REVISE) |
| 5 | `7f1850d` | **laws tightened**: Midlibrary opt-in removed, never-show-twice at the writer, undo via `reversal`, exhaustion stated, non-human sources fenced |
| 6 | `322dc0d` | **the tie-in**: the generator finally sees the courtroom — one taste per memory; the prompt page joins the app |
| 7 | `d6a58d7` | Undo last grid (page + bundle), active-memory pill, "Done — record for &lt;Who&gt;" |
| — | — | **Hostile panel round 2** (same seats; Ox retried after a 429; ≈$0.12; the P2 contract attacked *on paper before code*) |
| 8 | `6be20b8` | never-show-twice covers pairs, undo idempotent, all-or-nothing bundle import, honest `tasteSource` labels, route-level slug checks |
| 9 | `d05fc50` | **render loop engine**: intents, ComfyUI-output scan, path-composed file server, renders probe, tally partition |
| 10 | `9a8f221` | judge your renders in the well (video-aware), "Renders you liked", Send to ComfyUI, node mints per memory |
| 11 | `a587b5c` | **Make**: one click from a prompt to a queued render, in Sean's OWN captured graph |
| 12 | `82b211f` | **Make 4** + **HTTP Range** (clips scrub) |
| 13 | `31459c3` | **P4 — the one shell**: Make · Judge · Directions · Kept, one memory bar; **Kept tab is new** |
| 14 | `4263246` | proof isolation: a test must not be able to hand the app a fake graph |
| 15 | `be886ab` | deleted the three superseded pages (Sean approved) |
| 16 | `c113aaf` | **P3 — video shots** + **the own-material fix** + self-arming capture (`--watch` / `--from`) |
| 17 | `fb052c3` | README |

### The two panel rounds, and what they were worth

Packets, all five replies, and the arbitrated syntheses live in
`docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/` (`round-2/` for the second).

**Round 1 found (verified against code, then fixed):** the partner "include Midlibrary" opt-in broke the
licence law (4 seats); replay/overlap could double-count judgements; there was no correction path for a
misclick; pool exhaustion was silent; the generator ignored the compiled profile entirely.
**Refuted with evidence:** an "unknown source bypasses the witness law" blocker (the enum check runs first),
"`/api/event` is ungated" (the gate runs before every POST), and an append race (writes are synchronous).

**Round 2 found:** minting on a GET behind a POST-only gate (4 seats — a contradiction inside my own P2
contract, caught *before* any code was written); pair judgements escaping never-show-twice; a `tasteSource`
that claimed "evidence" for a words-only memory; a non-atomic bundle import.
**Refuted:** a "P0" that two seats raised independently by misreading `keptFor` (the read helper) as
`keepFor` — a naming bug on my side, fixed by renaming to `readKept`.
**Adopted then reverted after measuring:** a reviewer's "use one floor" — measured against Sean's real 18
judgements it left **zero** endorsed style codes, so the two floors are now documented as different things.

### The defect I'd most want the next agent to know about

While building video I printed what a **partner** memory actually generates. A memory whose words were
"ocean, forest light" produced *"rick and morty in a space vehicle"* and a cyberpunk hacker — subjects lifted
from the **Midlibrary prompt corpus**. Images had been guarded all along; nobody had asked what the *text*
pool did for a non-owner. Fixed by `ownSubjects` (§2 laws). **Standing habit that came out of it: for any
feature serving more than one user, print what it produces for the OTHER user before believing it works.**

---

## 4. How to verify it (run this first, before changing anything)

```bash
cd <HOME>/Desktop/swan-taste-brain
node prompter/serve.mjs &          # or the Swan Prompt Studio.cmd launcher

# 9 suites, 395 checks. All must print ALL CHECKS PASS.
for t in test-video test-range test-make test-renders test-taste-namespace test-modes test-bundle test-probe test; do
  node prompter/$t.mjs | tail -2
done
```

Suites write only throwaway `zz-*` namespaces and delete them. **The browser proofs live in this session's
scratchpad** (`verify-shell.mjs` 26 checks, `verify-modes.mjs` 61 checks, plus `verify-node.py` and
`make-clip.mjs`) — they are session-local and will be gone; if the next agent wants them, re-create them, and
run the server with:

```
SWAN_COMFY_OUTPUT=<scratch>/comfy-out  SWAN_COMFY_WORKFLOW=<scratch>/proof-workflow.json  SWAN_COMFY_API=http://127.0.0.1:8199
```

**Never point a test or proof at the real `prompter/comfy-workflow.local.json`** — two proofs once did, each
"restored what it found", and the app then told Sean a test fixture was his captured graph.

---

## 5. Sean's open actions

1. **Arm Make** — `node prompter/capture-workflow.mjs --watch`, then use ComfyUI normally (capture cannot be
   done ahead of time: ComfyUI's history is memory-only, its DB holds assets, the mp4s carry no graph — all
   three checked).
2. Standing, unrelated to this work: **rotate the Render API key**; **DMARC record (SWA-13)**.

## 6. Where this is going (next slices, in the order I'd take them)

1. **Overlap view** *(recommended)* — when Sean and the partner both judge the same project, show where their
   picks agree. It is what makes the household mode *joint* rather than two parallel memories; small (two
   tallies, one intersection) and lands on proven plumbing.
2. **Q0-for-clients** — "send me 3 things you love" as grid candidates, so a practice or real client's own
   references enter the courtroom.
3. **Unsplash `download_location` ping** when a photo is actually USED in a build (stored, never fired — an
   API-terms obligation still outstanding).
4. **The live Visual-taste run on the homepage hero** — still open from the previous session: Q0 was asked and
   never answered ("pick 2–4 things you've shipped and would ship again"). KEEP `Swans.mp4` as the footage.
5. Not built by decision: a **hosted client route** in SwanStudios (T3 — client PII, consent, retention; goes
   through Rule 62 + the operator registry first).

## 7. Where everything is

| Thing | Path |
|---|---|
| The tool | `<HOME>\Desktop\swan-taste-brain` (local git, **no remote**) |
| Runtime doc | `swan-taste-brain/prompter/README.md` |
| Yesterday's build story | `docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-SESSION-HANDOFF-2026-08-25.md` |
| Decisions + Q&A for the modes | `docs/ai-workflow/brainstorms/taste-brain-partner-and-client-mode-2026-08-25.md` |
| Panel round 1 | `docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/` |
| Panel round 2 (+ Ox retry) | `…/panel-taste-brain-modes-review-2026-08-25/round-2/` |
| Durable lessons | `docs/ai-workflow/hermes-learning-packets/20260825-a-second-users-taste-is-a-namespace-not-a-copy.md` |
| Hermes memos (working notes) | `.ai-workflow/hermes-inbox/pending/2026-08-25T*taste-brain*` |
| Board | Linear **SWA-186** (every slice has a comment) |

## 8. Paste-ready prompt for the next agent

```
You are picking up the Swan Taste Brain (SWA-186). Read, in order:
1. docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-HOUSEHOLD-SESSION-HANDOFF-2026-08-25.md   (this file)
2. swan-taste-brain/prompter/README.md                                              (runtime contract)
3. docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/round-2/FABLE-SYNTHESIS.md

The tool is at <HOME>\Desktop\swan-taste-brain — LOCAL git, NO remote, and it must stay that
way (it contains a third-party copyrighted corpus). Start the server (`node prompter/serve.mjs`), open
http://127.0.0.1:7331, and run all nine suites BEFORE and AFTER any change; they must print ALL CHECKS PASS.

Laws you may not relax without a new hostile panel: a witness writes only its own memory; never-show-twice is
enforced at the writer; undo is a `reversal` event; Midlibrary is Sean's alone (never a partner, client,
bundle or printed brief); a non-Sean memory generates ONLY from its own material (kept · picks · theme words),
never the corpus and never a corpus artist; a judged render counts toward subjects only, zero toward style;
video prompts carry no Midjourney parameters; Make substitutes exactly three fields and proves it; tests never
write the real comfy-workflow.local.json (use SWAN_COMFY_WORKFLOW).

Next slice is Sean's call: (a) overlap view — where his and his partner's picks agree on a shared project;
(b) Q0-for-clients — their own references as grid candidates; (c) the Unsplash download_location ping.
Commit per slice with explicit paths. Prove every claim in-session (suites + a browser check for any UI), and
for anything serving more than one user, print what it produces for the OTHER user before believing it.
```
