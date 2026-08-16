# Creator Video Studio — session handoff, 2026-08-16

- **From:** Opus 5 (vs-claude), worktree `C:/tmp/ss-mediasync`, branch `claude/media-sync-20260812`
- **To:** the next agent
- **State on main:** `fa6ac7042`
- **Linear:** `SWA-165` — *Creator Video Studio — provider registry + generate handler shipped; no video generated yet (Phases 3–5 open)*
- **Read first, in this order:** this file → `CREATOR-VIDEO-STUDIO-MASTER-HANDOFF-2026-08-15.md` (the arc + §12 setup) → `SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md` (Phase 3's actual spec)

---

## §1 — THE ONE-LINE STATE

**The machinery to generate video now exists end to end. No video has ever been generated.**
Everything below elaborates that sentence. If you read nothing else, read §7 (what is proven)
and §9 (your next slice).

---

## §2 — HOW THIS SESSION STARTED

Sean's opening instruction was: *"I need to go ahead and finish this work, this handoff work.
and where we left off."*

The master handoff had already been written and pushed by the previous session. So "finish"
did not mean write more documentation — it meant **execute** the handoff. Its §11 named three
moves in order:

1. Read the Forge blueprint before writing code.
2. Settle §4 — the deleted transport question. *Everything in Phase 1 depends on it.*
3. Get one video generating on the 5090.

Moves 1 and 2 are done. Move 3 is the next slice and is **yours**.

---

## §3 — WHAT §4 TURNED OUT TO BE (settled, with evidence)

The previous session deleted `backend/services/contentStudioVideoGenerationService.mjs`,
calling it "a path that could never return a video," then recorded doubt about whether that
was right. Two independent tools (ripgrep and POSIX grep) confirm it left **zero code
references** — it appears only in documentation. Nothing crashed.

But the deletion was **lossy**. The verdict is *right direction, wrong execution*:

| Part | Verdict |
|---|---|
| `resolveVideoGenerationConfig` | **Superseded.** `env.DREAMINA_API_URL ? 'dreamina' : 'seedance'` is a two-provider if-statement wearing a config function's clothes. It cannot express capability or licence. Left dead. |
| `validateVideoGenerationInput` | **Restored + improved.** Duration is now bounded by the *provider's* declared maximum instead of a fixed `[5,10,15,30]` set that contradicted every real model's 6s cap. |
| `normalizeProviderResponse` | **Restored near-verbatim.** Each alternative in its lookup chain is a shape a real API actually returned. It is empirical knowledge, not defensive padding. |

**Do not re-litigate this.** It is closed.

---

## §4 — WHAT WAS BUILT

| File | Lines | Role |
|---|---|---|
| `shared/providers/video/catalogue.mjs` | 148 | **DATA** — providers, declared capabilities, licence terms |
| `shared/providers/video/registry.mjs` | 256 | **BEHAVIOUR** — resolution, licence gate, validation, normalization |
| `shared/providers/video/comfyuiLocal.mjs` | 296 | Adapter — `capabilities()` / `generate()` / `verify()` |
| `backend/scripts/handlers/generateVideo.mjs` | 152 | The `generate` handler + retry classification |
| `backend/scripts/handlers/completion.mjs` | 49 | Queue artifact pointer + operator summary |
| `backend/tests/unit/videoProviderRegistry.test.mjs` | — | 62 tests |

`render-agent.mjs` gained an import and one `HANDLERS` entry.

**The split is not arbitrary.** It mirrors the image lane exactly — `openrouterModels.mjs` is
DATA, `openrouterImage.mjs` is BEHAVIOUR — and implements the three-function contract that
file's own docblock already described as *"the same contract creator Claude adopted for the
video lane."* Follow it when you add a provider; do not invent a second shape.

**The ComfyUI graph is operator-supplied.** A graph for a given model depends on which custom
nodes are installed, under what names, at what versions. Hardcoding one would ship a guess
that could not be tested without a 5090. Sean exports his graph in API format and declares
which node inputs receive prompt / init image / duration / seed.

---

## §5 — THE LICENCE IS NOW CODE, NOT MEMORY

This is the most important design decision in the slice, and it exists because of a
communication failure worth understanding before you touch it.

The previous session reported the H3 situation as *"commercial use is blocked."* Accurate,
and badly misleading: Sean read it as **"the videos you generate are not yours to use."**
What the licence restricts is **running the weights** in an excluded territory. It says
nothing about the output. He carried a false belief for days over a word that silently
changed referent — "use" of the *model* versus "use" of the *video*.

So the rule is now enforced by `resolve()`, and **a test asserts the refusal wording**
verbatim enough that the distinction cannot erode again:

```
"comfyui/minimax-h3" needs a written commercial grant to RUN in US.
Note this restricts running the model, NOT the ownership or use of video it produces.
Request template: docs/.../MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md
Once granted, add "comfyui/minimax-h3" to SWAN_VIDEO_LICENCE_GRANTS.
```

Two **separate, fail-closed** switches:

- `SWAN_VIDEO_PROVIDERS_ENABLED` — turns a provider on
- `SWAN_VIDEO_LICENCE_GRANTS` — records that a grant arrived

Enabling does **not** confer commercial rights. Unset grants nothing.

**This is what makes the licence outcome survivable either way.** If the grant is refused,
`minimax/hailuo-hosted` is already a registered peer and nothing above it changes.

**Sean is not blocked from testing.** Non-commercial local runs need no grant. The email is
drafted (`MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md`) and was handed to him in chat on
2026-08-16 with controls corrected — see §8.

---

## §6 — THE DEFECTS FOUND, AND WHERE THEY CAME FROM

Nine hostile rounds. Eight defects, all mine, all fixed. The pattern matters more than the list:

**Rounds 1–3 (unit tests, code reading) — 5 defects:**
1. **A fail-closed gate with no key.** The catalogue is frozen `enabled: false` on every row
   with no override. `generate()` could never have succeeded for anybody.
2. **Decorative dependency injection.** `runGenerate` accepted an injected `env` while the
   registry read `process.env` regardless — a test could pass while production differed.
3. **Graph injector created inputs a node does not declare.** ComfyUI ignores those, so the
   job would run at full GPU cost, render the template's placeholder prompt, and report success.
4. **5xx submit classed permanent** — discards a job for a service blip.
5. **Timeout reported as "no output"** — sent diagnosis at the wrong problem.

**Round 4 (the real caller path — actual agent binary vs stub API + stub ComfyUI) — 2 defects
that unit tests were structurally incapable of seeing:**

6. **`handleJob` hardcoded mediasync's completion payload for every handler.** The first video
   job would have been recorded in the queue as `jobs/<id>/mediasync.json`, mime
   `application/json`. Nothing crashes — **the queue simply stores a confident lie about an
   artifact it never inspected**, and R2, the player and type sniffing all inherit it.
7. **The operator log printed `completed <id> -> offset undefineds usable=undefined`** for
   every render. Worse than silence: it reads as a measurement that ran and failed.

**Round 7 (line-count gate applied post-refactor) — 1 defect:**
8. My own fix for 6+7 pushed `render-agent.mjs` from 330 to **361** lines, making a
   pre-existing rule-4 breach materially worse. Moved to `handlers/completion.mjs`; the file
   is back to 330 (it was 329 before this workstream — net +1).

**The lesson for you: defects 6 and 7 were invisible to 58 passing unit tests.** They only
appeared when the real program ran against a real socket. Budget a round for that vantage.

---

## §7 — WHAT IS PROVEN, AND WHAT IS NOT

**PROVEN (current session, reproducible):**
- 82/82 unit tests across the new suite + both render-agent siblings, exit 0 captured via
  `${PIPESTATUS[0]}`.
- **The suite is non-vacuous by mutation.** Disabling the licence gate killed 4 tests;
  disabling the image-first law killed 2; neutering the retry classifier killed 5; restoring
  the hardcoded completion payload killed exactly the regression guard.
- Real-caller harness 13/13: `workflowId: "generate:*"` routes to the handler, the prompt
  reaches the graph, the job completes, `r2Key`/`mime` are correct, attribution travels,
  `uploaded:false` is honest.
- Failure-branch harness 4/4: licence refusal → `/fail` with `retryable:false`; over-max
  duration likewise; unreachable ComfyUI → `retryable:true`; unknown provider names what the
  agent carries.
- `node --check` + real-import smoke on all modules. Secret scan CLEAN. Rule 42 audit clean.

**NOT PROVEN — state this plainly to Sean, do not soften it:**
- **No video has been generated.** There is no ComfyUI and no 5090 in the build environment.
  The submit → poll → download path is proven only against a stub server.
- **Expect real-transport defects on first contact with the GPU.** The stub answers exactly
  what the code expects; a real ComfyUI will not.
- `normalizeProviderResponse` is tested but has **no production caller** until a hosted
  adapter exists. Preserved knowledge, not live code.
- R2 upload is absent. The handler returns `uploaded: false` rather than claim an object.
- The licence gate necessarily trusts the caller's declared `commercial` flag. No code can
  know how a video will eventually be used.

**Baseline:** 23 failing test files / 6 failing tests on `origin/main`. 22 files pre-existed;
the 23rd (`idorAuditReaderControls.test.mjs`) arrived from another agent's authz-audit commits
(`ef838682e`, `b2caf6a0f`, `81cdeeed7`) via rebase and imports nothing from this lane. **The
failing-test count is unchanged at 6.** Most of the 22 are `node:test`-style files that vitest
reports as "No test suite found" — see §10.

---

## §8 — THE LICENSING EMAIL (corrected 2026-08-16)

The drafted email in `MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md` listed six compliance
controls as "built or in build." **Two of them were not built**, and misdescribing compliance
posture in a licensing application is a real risk. The version handed to Sean splits them:

**Implemented today:** attribution as a required contract field (a provider cannot register
without it); territorial licence gating, fail-closed; human review; no distillation.

**Committed, not yet built:** per-asset provenance with `licenceSnapshot`; server-side
volume/spend caps; prompt policy filter.

If you build any of the committed three, **update the email doc** — and if Sean has already
sent it, note the date so the delta is visible.

Four fields still needed from Sean: legal entity + state, distribution scope, name + title,
contact email.

---

## §9 — YOUR NEXT SLICE

**Get one video out of the 5090, end to end. Not the studio. One video.**

Everything above the transport now exists. Only real hardware can prove the transport, so
**do not write more code against an unproven path** — that is precisely the mistake that
produced a control panel instead of a studio.

Setup lives in `CREATOR-VIDEO-STUDIO-MASTER-HANDOFF-2026-08-15.md` §12. In short:

```powershell
$env:SWAN_COMFYUI_WORKFLOW        = "C:\path\to\h3-workflow-api.json"  # "Save (API format)"
$env:SWAN_COMFYUI_NODE_PROMPT     = "6"        # node id whose text input is the prompt
$env:SWAN_COMFYUI_URL             = "http://127.0.0.1:8188"
$env:SWAN_VIDEO_PROVIDERS_ENABLED = "comfyui/minimax-h3"
node backend/scripts/render-agent.mjs --capabilities ffmpeg,mediasync,generate
```

**Run this FIRST, before the agent and before any job:**

```bash
node backend/scripts/verify-video-provider.mjs
```

It needs no token, no server, no GPU and no `npm install`. It prints every provider, which
readiness check fails and the exact variable that fixes it, and — reported separately — the
licence position for commercial vs non-commercial output. Exit 0 means "could attempt a
render"; **never** "a render will succeed". Verified in all three states: unconfigured →
exit 1 with three actionable FAILs; configured+enabled → exit 0 with commercial still
correctly refused; grant recorded → commercial permitted.

It is deliberately a separate script rather than a flag on the agent: the agent exits 2
without a credential, which would gate the diagnosis behind the setup it diagnoses.

**Environment — one problem solved, one still Sean's:**

1. ~~The agent script lives in scratch space~~ **SOLVED 2026-08-16.** A permanent worktree
   now exists at `C:\Users\BigotSmasher\Desktop\quick-pt\swan-render-agent`, on branch
   `swan/render-agent-runtime` tracking `origin/main` (so `git pull` works there). **Proven
   to run the entire generate path with zero `npm install`** — it imports only repo files and
   node builtins. Use this, not `C:\tmp`. To remove it:
   `git worktree remove C:/Users/BigotSmasher/Desktop/quick-pt/swan-render-agent`.
   Sean's own repo at `Desktop/quick-pt/SS-PT` is untouched — it is on
   `wip/comms-notifications-2026-07-05` with ~700 uncommitted files. **Do not switch its branch.**
2. **Still open:** ComfyUI must export **"Save (API format)"**, not the GUI format. A GUI
   export is rejected by name (`E_GUI_FORMAT_WORKFLOW`) with the fix in the message, but expect
   this to be the first stumble.

**After one video renders,** Phase 3 is the studio surface: read and **update**
`SWAN-FORGE-CONTENT-STUDIO-BLUEPRINT-2026-08-11.md`. Sean's instruction was that it be
hostile-reviewed and updated, **not that a new plan be invented.**

---

## §10 — TRAPS IN THIS REPO THAT COST ME TIME

Read this section. Every item cost real minutes today.

1. **`npm test` is `vitest run`, but many existing test files are `node:test` style and FAIL
   under it** ("No test suite found") — that is most of the 22-file failing baseline. **Write
   tests in the style the GATE uses, not the style of the neighbouring file.** Matching the
   neighbour would have made me failing file #23 while passing locally under `node --test`.
2. **`vitest run | tail` reports `tail`'s exit code, not vitest's.** I read "exit 0" while 22
   files were failing. Use `${PIPESTATUS[0]}`.
3. **`grep -c` exits 1 when it legitimately matches zero**, so `grep -c … && npm test`
   silently never runs the test. I was one step from reporting a restore as verified without
   executing anything.
4. **Git Bash mangles `<rev>:<path>`** — use `MSYS_NO_PATHCONV=1 git cat-file -e origin/main:<path>`
   or it reports ABSENT for files that exist.
5. **Deep `grep -rn` over this tree times out** (>120s). Use the ripgrep-backed Grep tool.
6. **`git clone` with `rm -rf` is permission-denied** in this environment.
7. **Other agents hold file locks.** Read `.ai-workflow/coordination/*.lane.md` before editing,
   claim your own, never `git add -A`. Push landed after rebasing onto 58 incoming commits;
   **re-verify after a rebase** — those commits changed `shared/`.

---

## §11 — DECISIONS THAT ARE SEAN'S ALONE

1. **Send the H3 licensing email** — drafted, corrected, 4 fields. Gates *commercial* use only.
2. **Extractable-component seam** (Phase 4) — npm package / separate service / monorepo package.
   The agent script is the natural extraction nucleus: HTTP + bearer token + handlers.
3. **Hosted API as interim** while a grant is pending? Costs per generation.
4. **Remotion** — the render endpoint accepts 8 templates with no renderer behind any.
   Build or drop.
5. **`sync` job-kind migration** — the CHECK constraint allows only
   `preview|generate|transcode|upscale|interpolate`; sync currently rides as `transcode`.
   Production schema change.
6. **YouTube API audit application** — unfiled. Unverified projects are locked to private
   uploads permanently, no appeal. Blocks Phase 5's publish step.

---

## §12 — COMMIT ARC

| SHA | What |
|---|---|
| `39593b27e` | Master handoff — origin, landing, route forward (previous session) |
| `535f997ac` | Memo + packet: honest slices that walk away from the ask |
| `20f3d2bc8` | **Provider registry + generate handler — the licence becomes code** |
| `b95ef55a0` | Memo + packet: mutation testing is the procedural fix |
| `fa6ac7042` | **The queue was recording every video as mediasync.json** (rounds 4–9) |

Durable packets: `docs/ai-workflow/hermes-learning-packets/20260815-*` and `20260816-*`.
Inbox memos: `.ai-workflow/hermes-inbox/pending/20260815T020000Z-*` and `20260816T140000Z-*`.

---

## §13 — THE CORRECTION THAT MATTERS MOST

Carried forward from the previous session's packet, because it is the reason this workstream
drifted and nothing structural has changed to prevent a recurrence:

> **Slice-level proof does not compose into product-level correctness.**
>
> Every gate in this pipeline validates a slice against its own spec. None validates the chain
> against the original ask. A chain of locally-correct steps can walk in a straight line away
> from what was requested while every closeout honestly says "done."

Sean asked for a studio and got a control panel. He was the one who noticed.

**So: periodically re-read the ORIGINAL request — not the last slice's spec — and state plainly
which parts Sean can actually do today.** Today the honest answer is: *he can attempt a render.
He cannot yet make a video.*
