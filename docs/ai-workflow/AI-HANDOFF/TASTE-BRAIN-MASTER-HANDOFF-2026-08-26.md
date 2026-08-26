---
decision: "Master handoff for the Swan Taste Brain after five hostile rounds (37 defects, six corpus doors), the self-explaining UI pass, and Make arming itself. Everything a fresh agent needs to continue without re-reading the chat."
status: open
supersedes: TASTE-BRAIN-HOSTILE-REVIEW-ROUNDS-3-6-2026-08-26.md
board: SWA-186
date: 2026-08-26
author: Opus 5 (VS Code terminal), acting Final Decider in Fable's absence
repos: "swan-taste-brain (LOCAL, no remote) + SS-PT docs"
privacy: IDs and roles only — the second user is "the partner"; no names, no keys, no PII
---

# Swan Taste Brain — master handoff (2026-08-26)

**Read this file, then `swan-taste-brain/prompter/README.md`, then run the suites. That is enough.**

The tool is at `C:\Users\BigotSmasher\Desktop\swan-taste-brain` — **local git, NO remote, and it must
stay that way**: it contains a third-party copyrighted corpus (Midlibrary, which Sean subscribes to).

**State: 13 commits `8a4038f` → `2f253bb`. 504 checks across 10 suites, all passing.**

---

## 0. Sixty seconds

Sean has a taste brain: it shows him real photographs, records which he'd actually ship (the reason
locked in *before* the picture is revealed), compiles that into three "directions", and generates
Midjourney and video prompts in his taste. Yesterday it became a household tool — his partner gets
her own memory per design, and a client mode doubles as his sales-practice deck.

**This session did three things:**

1. **Hostile-reviewed the half of it nobody had read.** The two panels run during the build both
   happened before the render loop, Make, video and the one-shell app existed — round 2 reviewed a
   plan on *paper*. Five fresh rounds found **37 real defects**, including **six separate doors**
   through which the licensed corpus could reach his partner's memory.
2. **Made the page explain itself** — every control labelled, each tab says what it is for, and
   "Taste pictures" starts a round in one click from the top bar.
3. **Made Make arm itself** — no terminal step, ever.

---

## 1. The finding that matters most

**A law enforced at one layer looks enforced everywhere.** One rule — *the corpus is Sean's alone* —
was broken in six different layers, and each fix made the next one look safe:

| # | Layer | How the corpus arrived | Found by |
|---|---|---|---|
| 1 | generation | `chooseSref()` ran unconditionally — **6 of 6** prompts carried a code | GLM + Ox |
| 2 | the read API | `access-control-allow-origin: '*'` made every read cross-origin readable | GLM + Ox |
| 3 | the event writer | candidates could declare `provenance: 'midlibrary-reference'` | Ox |
| 4 | the compiler's output | `tally()` bumped style codes regardless of witness | Kimi |
| 5 | the index join | a candidate declaring **nothing** passed, and the compiler back-filled from the index | Ox |
| 6 | the claim | a candidate naming a corpus id or CDN url while **claiming** a shareable provenance | Ox + GLM |

**Five recurring shapes. Look for a further instance of each before adding anything:**

1. **A law enforced at one layer.** Six instances.
2. **Absence is not innocence.** `if (field !== undefined) refuse(...)` is bypassed by sending no field.
3. **A guard that cannot fire.** Three shipped: a literal backspace where `\b` was meant; `\s--sref`
   that cannot match a leading flag; `ml:img:` inside the wider `ml:` namespace. **Every guard needs a
   test that fails when the guard is removed.**
4. **A fix applied to one writer, not the class.** `$&` fixed in one of four markdown writers; the
   corpus marker in the export writer but not the event writer; the bundle law in the importer but
   not the writer.
5. **A containment fix that breaks the legitimate case.** Five: judging your own renders, keeping an
   ordinary generated prompt, Undo, the index fallback throwing away photo titles, and a marker that
   refused "HTML: code on a screen".
6. **Shape is not existence.** A `render:<12-hex>:<n>` id proves the shape, not that a render was made.

---

## 2. The laws now enforced (do not relax without a new panel)

| Law | Where |
|---|---|
| **The corpus owner is the PROFILE `sean`** — any memory of his may use it; partner and client never may | `events.mjs` `isCorpusOwner` |
| A witness writes only its own memory (`source` = `profileId`) | `events.mjs` `validateEvent` |
| A non-owner candidate must **declare** `provenance ∈ {unsplash, pexels, esa-webb-ccby, nasa-public-domain, local-comfy}` — absent is refused | `events.mjs` |
| No `sref` in a non-owner memory except its own render, whose id must be one this memory **minted** | `events.mjs` + `profile.mjs` |
| No candidate field may **name** the corpus — one shared `CORPUS_MARKER`, derived-tested against `images.mjs` | `events.mjs`, `export-bundle.mjs` |
| The **index is ground truth**: a candidate the index knows as corpus is dropped for a non-owner | `profile.mjs` `tally` |
| `keepFor` and `mintIntent` refuse `--sref` anywhere `(^|\s)` **and** text naming the corpus | `taste-namespace.mjs`, `renders.mjs` |
| Never-show-twice at the **writer**; undo is an idempotent `reversal` | `events.mjs` `appendEvent` |
| A judged render counts toward subjects only — **zero** toward style | `profile.mjs` `tally` |
| Video prompts carry no Midjourney parameters | `video.mjs` |
| Make substitutes exactly three fields and proves it | `workflow.mjs` `applyTo` |
| **Every** request Host-gated (DNS rebinding); no CORS headers at all | `serve.mjs`, `origin.mjs` |
| Every markdown writer uses a **function** replacement — asserted structurally | `swan-prompt.mjs` |
| A bundle event may never be recorded into the owner's memory — at the **writer** | `events.mjs` |
| Both tabs discard a response whose memory changed mid-fetch | `app-make.js`, `app-judge.js` |
| Tests never write the real `comfy-workflow.local.json` (`SWAN_COMFY_WORKFLOW`) | `workflow.mjs` |

---

## 3. What shipped, in order

| Commit | What |
|---|---|
| `8a4038f` | round 3 — doors 1–2 + eight more |
| `10a84ee` | door 4 (Kimi) + the `sref` bypass of the fix above it |
| `f9a8343` | door 5 — *absence is not innocence* |
| `e61773e` | proof the bundle importer goes through the writer |
| `9dffe69` | round 5 — **my Undo regression**, DNS-rebindable reads, 3 more `$&` writers |
| `9844689` | the stale-response race between memories |
| `2436656` | `local-comfy` is not a free-text channel |
| `e859338` | door 6 + the owner-gate granularity |
| `96c2996` | one corpus marker, both writers |
| `c53dda1` | **shape is not existence** — a render must have been minted |
| `f600319` | round 7 + **the correction**: the owner is Sean, not `sean/default` |
| `f8ceb92` | labels, per-tab explainers, "Taste pictures" in the top bar |
| `2f253bb` | **Make arms itself** — no terminal step |

---

## 4. The correction a future agent must not undo

Round 6 narrowed every corpus gate from the profile `sean` to the namespace `sean/default`, because
Ox Alpha argued "the law names exactly one owner memory". **That premise came from a sentence I had
written in my own review packet — not from the product.** `createProject` says *"only Sean may open
the full pool"*, and `poolFor` has always served his own side projects the full pool. Narrowing the
writer removed a supported feature and left the two layers disagreeing: `sean/side-project` could be
shown corpus grids it would then be refused permission to record. GLM caught the disagreement in
round 7; the fix was to revert the writer, not to break `poolFor`.

**The whole story is in the `isCorpusOwner` docblock in `events.mjs`. Read it before touching any
owner gate.** The lesson generalises: *a reviewer reasoning against your own summary will confirm
your summary, not the product.*

---

## 5. Sean's open actions

1. **Run one workflow in ComfyUI** — open `00 SWAN — H3 local (start here)` and press Run once.
   Make captures it automatically from that moment; there is nothing to type. (Probed 2026-08-26:
   ComfyUI up, `/history` empty, both workflows saved and reachable.)
2. Standing, unrelated: **rotate the Render API key**; **DMARC record (SWA-13)**.
3. **One product decision** — a non-owner memory still shows `tier: 'evidence'` after a single grid.
   Kimi and Ox both argue it overclaims for a memory that started empty yesterday. Requiring the
   backing to span two grids changes what the sales-practice brief shows after one round, so it is
   his call. `witness` is threaded through `directions()`; the exact one-line change is in a comment
   there.

---

## 6. What is NOT built, and why (do not "finish" these without reading)

- **UI→API conversion of saved ComfyUI workflows.** Both panel seats said cut it: nothing short of
  ComfyUI executing the graph and handing it back proves a converted graph is Sean's, and this
  module's founding law is "never a graph that isn't his".
- **A watcher that holds a prompt and auto-queues it.** Ox: it would fire on an unrelated experiment
  — Sean runs a LoRA test, the watcher captures *that*, and his held prompt renders through a graph
  he never chose. His press of Make is the confirmation a watcher would lack.
- **Judging embedded in the Make tab.** Ox: it must be navigation, not a second judging surface, or
  it reopens the wrong-memory recording class fixed in `9844689`. The top-bar button navigates.

---

## 7. How to verify (run this before changing anything)

```bash
cd C:/Users/BigotSmasher/Desktop/swan-taste-brain
# 10 suites, 504 checks. From the REPO ROOT — fixtures resolve relative to it, not to prompter/.
for t in test test-probe test-modes test-bundle test-taste-namespace test-renders test-make test-range test-video test-round3; do
  node prompter/$t.mjs | tail -1
done
```

`prompter/test-round3.mjs` is the regression file for rounds 3–7 — one check per finding, each naming
the seat that found it. **Its checks are verified to fail against the pre-fix code at every round.**
Suites write only throwaway `zz-*` namespaces; a suite that *crashes* mid-run leaves them behind, so
check `taste/profiles/*/zz-*` is empty afterwards.

---

## 8. Model calibration (what each seat is worth)

| Seat | Findings | Real | Cost |
|---|---|---|---|
| **Ox Alpha** | 14+ | all — two doors alone, all three inert guards, both UX blockers | **$0** |
| **GLM 5.3** | 17 | all substantive — door 6 by a second route, and the round-6 correction | **$0** |
| **Kimi K3** | 4, **one call** | all — door 4 | $0.157 |
| HY3 | 4 | 2 real, 2 refuted; judged a React rulebook against a tool with no React, twice | $0.016 |
| Qwen 3.8 | 7 | 2 real (the CLI note; *shape is not existence*), 5 refuted | $0 (local) |

**Total ≈ $0.17 for 37 defects.** Two lessons: **the free seats did the heavy lifting**, and **spend
the one paid call on the ALREADY-FIXED code** — Kimi found a door four seats had walked past because
it was the only one looking at what their fixes left behind. Ox's *"what I checked and found sound"*
sections were the most reusable artefact of the review; **require that section from every seat.**

---

## 9. Paste-ready prompt for the next agent

```
You are picking up the Swan Taste Brain (SWA-186). Read, in order:
1. docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-MASTER-HANDOFF-2026-08-26.md   (this file)
2. swan-taste-brain/prompter/README.md                                   (runtime contract)
3. The isCorpusOwner docblock in swan-taste-brain/prompter/lib/events.mjs (a correction you must not undo)

The tool is at C:\Users\BigotSmasher\Desktop\swan-taste-brain — LOCAL git, NO remote, and it must stay
that way: it holds a third-party copyrighted corpus. Start the server (node prompter/serve.mjs), open
http://127.0.0.1:7331, and run all ten suites from the REPO ROOT before and after any change; they
must print ALL CHECKS PASS (504 checks).

Five hostile rounds took 37 defects out of this tool and closed SIX doors through which the corpus
could reach a second user's memory. The laws are listed in §2 of the handoff; do not relax one
without a new panel. Before adding anything, check it against the six recurring defect shapes in §1 —
especially "absence is not innocence", "a guard that cannot fire", and "a fix applied to one writer,
not the class". Every guard needs a test that FAILS when the guard is removed; a green suite proved
nothing here, because the nine original suites passed 404/404 both before and after all 37 defects.

Sean's next actions and the one open product decision are in §5. What is deliberately NOT built, and
why, is in §6 — read it before "finishing" any of it.
```

---

## 10. Where everything is

| Thing | Path |
|---|---|
| The tool | `C:\Users\BigotSmasher\Desktop\swan-taste-brain` (local git, **no remote**) |
| Regression file | `prompter/test-round3.mjs` |
| Rounds 3–6 arbitration | `docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-HOSTILE-REVIEW-ROUNDS-3-6-2026-08-26.md` |
| All seat replies | `docs/ai-workflow/AI-HANDOFF/panel-taste-brain-round{3,4,5,6,7}-2026-08-26/` |
| UX plan + its panel | `…/TASTE-BRAIN-UX-PLAN-2026-08-26.md`, `…/panel-taste-brain-ux-2026-08-26/` |
| Durable lesson | `docs/ai-workflow/hermes-learning-packets/20260826-a-law-enforced-at-one-layer-looks-enforced-everywhere.md` |
| Hermes memo | `.ai-workflow/hermes-inbox/pending/20260826T070000Z-taste-brain-round3-4-hostile-review.md` |
| Desktop launcher | `Desktop/Swan Prompt Studio.lnk` → the `.cmd`; icon in `Desktop/Swan-Prompt-Studio/` |
| Board | Linear **SWA-186** |
