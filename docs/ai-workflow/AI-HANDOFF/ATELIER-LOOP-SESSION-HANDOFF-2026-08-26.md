---
decision: "Full session handoff for the Swan Atelier build loop — six panel-reviewed slices, then eleven recursive hostile-review rounds that found 31 real defects and ended with both panel seats approving. Everything the next agent needs to continue without re-deriving it."
status: superseded
superseded_by: docs/ai-workflow/AI-HANDOFF/ATELIER-SESSION-HANDOFF-2026-08-27.md
---

# Swan Atelier — session handoff · 2026-08-26

> **SUPERSEDED by `ATELIER-SESSION-HANDOFF-2026-08-27.md`.** That file is the one to read.
> This one remains accurate for the six earlier build slices and the round-by-round review
> ledger (section 5b), which the newer file points back to rather than duplicating. Where the
> two disagree, the 2026-08-27 file wins — its state, counts and backlog are current.

---

## 0. Where the work is, and why it is not where you expect

| | |
|---|---|
| **Worktree** | `c:/tmp/ss-atelier-v2` — a **git worktree**, not the main checkout |
| **Branch** | `feat/atelier-v2-compose` |
| **HEAD** | `1ca9bf47c` · **175 commits ahead of `main`** · pushed · working tree clean |
| **PR** | **#73** — open, unmerged, commented per iteration |
| **Deployed** | **NO. Nothing from this branch is in production.** |
| **Linear** | **SWA-165** carries a comment per iteration; **SWA-209** is the ranked backlog |

**Why a worktree:** the original session branch was 2,221 commits behind `main` and had no `shared/providers/`. Sean approved cutting `c:/tmp/ss-atelier-v2` off `origin/main`. **Do not work in the main checkout** — another agent's lane may hold locks there (`node scripts/lane.mjs doctor`).

**`node_modules` gotcha:** the worktree's `node_modules` was junctioned and 2,226 commits stale — a build failed on `@zxing/browser` in a file nobody had touched. It has since had an isolated `npm ci`. If you see an inexplicable dependency error, suspect this first.

---

## 1. What the product now is

Swan Atelier is the **generation** half of Content Studio: describe an asset → get candidates → pick one → animate it → publish it → **find it again**. It is deliberately separate from `contentStudioRoutes.mjs` (659 lines, over the 300-line cap; extending it was rejected as substrate-first).

**The ladder, end to end, all shipped:**

```
Brief ──► Still (4 candidates)  ──► Motion  ──► Publish ──► Assets library
          local $0 | hosted $        binds bytes,    draft→approved   filter, page,
          async, batched            never words     →published        preview
```

**Two lanes.** `local` = Sean's RTX 5090 via ComfyUI, **$0**, single-flight, volume-capped, **async**. `hosted` = OpenRouter images, opt-in, **off until a budget is set**, synchronous (it is seconds).

**Two prompt sources.** `brief` (the 12-slot compiler + law filter) and `taste` (Sean's rated corpus via a local server on `127.0.0.1:7331`). **Taste is local-only and SwanStudios-only** — see §3.

---

## 2. What is on this branch

**Six build slices**, each: build → hostile panel → fix → verify → commit → closeout (Hermes memo + learning packet + Linear + PR comment). Then **eleven recursive hostile-review rounds** (section 5b) which rewrote much of the compose orchestrator's concurrency handling. The build slices are below; the review commits are `98343e638..ef8735560`.

**Modules that did not exist before the review loop** — all created because a rule had drifted into two copies:

| Module | Why it exists |
|---|---|
| `composeGpu.mjs` | The GPU-release rule, once, for both lanes. It was gotten wrong on the async lane and reproduced verbatim on the sync lane an hour later |
| `composeReplay.mjs` | Every rule about a repeated request: the freshness guard, the conditional claim, the identity-checked drop |
| `startLocalBatch` (in `localBatchRunner.mjs`) | The async dispatch, moved out of the orchestrator, taking its collaborators **already resolved** — re-destructuring the raw deps bag made every defaulted one `undefined` and failed nine tests |

| # | Slice | Commit | The finding that mattered |
|---|---|---|---|
| 6 | **Library previews** | `5d897145d` | I used `generatePlaybackUrl` (4h TTL) when the service already ships `generateThumbnailUrl` (1h, docblock: *"suitable for list endpoints"*). Also: isolation without a counter made a **rotated key look identical to one bad object** |
| 5 | **Asset library** | `9affd5347` | `created_at` is TIMESTAMPTZ (**µs**); a JS Date cursor is **ms**. `created_at < cursor` silently skipped every same-millisecond row — **and a 4-up batch is four rows in one millisecond** |
| 4 | **Brand kits** | `d2451c411` | The compiler applied **every SwanStudios law to every brand**, so a non-Swan site **could not render a fox** (LAW4 protects the swan mark) |
| 3 | **Spend ledger** | `566211a72` | A hardened ledger with 64 passing tests had **zero production callers** — both lanes' "daily" caps were per-request caps. My first fix then had a TOCTOU **all six seats caught** |
| 2 | **Async local stills** | `dec677e43` | A client-supplied `Idempotency-Key` was used raw → **owner B landed on owner A's batch** |
| 1 | **Publish** (pre-loop) | `dde001654` | Publish needed an explicit human declaration; a prose gate description produced six identical false P0s |

Plus `d5b5d16cc` — **route coverage over real HTTP** (added during an interrupted dry-loop round; see §7).

**Totals:** 53 files, ~4,985 insertions. Service surface `backend/services/atelier/` (11 modules, 2,477 lines with `shared/brandKits/` + the ledgers). Frontend `frontend/src/components/DashBoard/Pages/content-studio/Atelier*` (1,916 lines). 14 backend atelier suites.

---

## 3. Design decisions you must not accidentally undo

1. **`brandKit` and `workspaceId` are two fields.** A brand kit is *art direction* — a curated allowlist where an unknown id **refuses** (`E_UNKNOWN_BRAND_KIT`). A workspace id is a *filing label* — free text. My first draft merged them and the existing test suite refused instantly. **Naming a workspace with no kit is `E_BRAND_KIT_REQUIRED`**, because defaulting there reinstates the exact bug kits exist to fix (GLM: *"then §1's bug is now the default behavior"*).

2. **Taste + non-Swan kit is refused** (`E_TASTE_IS_SWAN_ONLY`). The corpus is Swan-rated; there is no version of it that belongs to another brand. All six seats called the silent version a brand-scope leak.

3. **No gold in the SwanStudios brand kit.** My first kit listed *"gilded fern gold"* — true of the CSS palette, false of art direction — and **LAW2 refused every brief**. Gold is permitted in four UI places, none of which is a subject in a generated image.

4. **The spend ledger commits BEFORE the provider call, atomically.** `tryCommit` does a synchronous read-check-write with **no `await` between them**, which is what makes it uninterleavable within a process. It is monotonic on purpose (a negative delta would let anyone mint headroom), so **the ceiling counts what was committed, not what was collected**.

5. **Sub-Fable models never write the durable learning corpus.** Rule 68's gate is fail-closed and comes from the **model**, not the mode.

6. **`assetView` withholds `r2Key`** — but note honestly that `previewUrl` is a SigV4 presigned GET with the key in its path. The old line *"the storage key never leaves the server"* is **no longer true in full** and was corrected in the docblock. Do not reinstate it.

---

## 4. How to verify — the commands that actually work here

```bash
# BACKEND — atelier + everything my edits touch. Enumerate by GLOB, never by hand:
cd c:/tmp/ss-atelier-v2/backend
FILES=$(ls tests/unit/*.mjs | grep -iE "atelier|laneLedger|spendGates|brandKits|assetLibrary|video|renderAgent|renderJob|initImage" | tr '\n' ' ')
npx vitest run $FILES                      # last green: 416/416 across 22 suites

# The repo has TWO test runners. 18 files use node:test and vitest cannot collect them:
NT=$(grep -rl "from 'node:test'" tests/ --include="*.mjs" | tr '\n' ' ')
node --test $NT                            # last green: 188/188

# FRONTEND
cd ../frontend
npx vitest run src/components/DashBoard/Pages/content-studio/    # last green: 121/121 across 14

# TYPE CHECK — the full project OOMs at 8GB. Scoped config, include list is GLOB-GENERATED:
NODE_OPTIONS=--max-old-space-size=16384 npx tsc -p tsconfig.atelier.json --noEmit

# BUILD + chunk walk WITH A POSITIVE CONTROL (vite emits to dist/v3, NOT dist/assets):
NODE_OPTIONS=--max-old-space-size=16384 npx vite build
ls dist/v3/ | grep -iE "AtelierCompose|AtelierLibrary|CreatorRenderQueue"   # control chunk

# GUARDS (both block commits)
bash scripts/scan-secrets.sh <paths>
node scripts/hooks/token-registry-check.mjs      # CSS custom properties must EXIST
```

**Baseline disclosure (Rule 56):** the repo baseline is **not clean** — 2 pre-existing vitest failures (`associationsModelRegistryParity`, `phase1bControllers`, which read `models/associations.mjs` and onboarding sources — absent from this branch's diff). This work adds none.

**Never proven anywhere in this branch:** a real render, a real R2 object, a real SQL execution. There is no ComfyUI, no R2 and no Postgres in this environment. Every slice says so explicitly. **Do not let that disclosure quietly drop out of a future closeout.**

---

## 5. The hostile-review panel

`node scripts/consult-panel.mjs --document <abs path> --out-dir <abs path> --seats ox,glm,qwen,hy3,grok --confirm-spend`

**The script lives in the MAIN checkout** (`c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/scripts/`), not in the worktree — run it from there with absolute paths.

### ⚠ Ox Alpha is RETIRED — and it changes how to read the earlier rounds

Mid-session the stealth endpoint began returning 404 with a disclosure: **`stealth/ox-alpha` was ZAI's GLM-5.3-Flash all along.** It is gone; use `z-ai/glm-5.3-flash` if you want that model by name.

**This retroactively weakens several earlier calibration notes.** Rounds where "Ox and GLM independently agreed" were one model family agreeing with itself, not two seats converging. Treat pre-retirement agreement between those two as one opinion. `MEMORY.md` still lists Ox as a standing panel seat — **that memory is now wrong and should be corrected.**

**Calibration after sixteen rounds:**

| Seat | Cost | Verdict |
|---|---|---|
| **glm-5.3** | $0 (subscription) | The workhorse. Found a real defect in nine of eleven review rounds, including three the author had introduced while fixing the previous one. Every round it listed its own unverifiable assumptions, and those lists were accurate |
| **qwen-3.8** | $0 (local) | Returned APPROVE six rounds running while GLM was still finding P1s. Not useless — it was right that the *core* invariants held — but as a lone seat it would have ended the loop nine defects early. **Never run it alone** |
| **x-ai/grok-4.6** | ~$0.05 | Best when attacking a **rationale** rather than a diff |
| **hunyuan-3** | ~$0.004 | Cheap, honest about its own limits |
| **moonshotai/kimi-k3** | ~$0.16 | Priciest with the fewest findings, twice. Dropped |
| **stealth/ox-alpha** | — | **RETIRED.** Was GLM-5.3-Flash |

**The whole eleven-round loop cost $0.** Default now: **GLM + Qwen**, and read a lone Qwen APPROVE as "the core holds", not as "there is nothing left".

**A seat's confidence section is worth more than its verdict.** GLM twice manufactured a finding from an abbreviated excerpt in my own review packet — once inferring that estimates claim the idempotency key, because I had shown the flow order without the guard that is on it. **When a seat is wrong, check the packet before you check the code.** Both times the packet was at fault.

**Panel spend estimates run ~1.6× low** (reasoning tokens are unmodelled) — disclose the multiplied figure.

---

## 5b. The recursive hostile-review loop (rounds S → AC) — READ THIS

Sean asked for a hostile review "recursively in a loop until there's no issues, no bugs, and we made upgrades enhancements wherever we can." Eleven rounds ran. **They found 31 real defects.** The last round ended with **both seats returning APPROVE — no P0, no P1.**

**One defect class accounted for sixteen of them: a rule applied to one half of a pair.** Cost guarded but not ceiling. Sync lane but not async. Client key but not derived key. Succeeded batch but not failed. Release telemetry but not cleanup telemetry. Absent-miss synchronous but not expired-miss. A conditional write beside a blind delete. **In every single case the comment above the code was accurate — about the path the author happened to be looking at.**

**The structural answer, and it worked better than more guards:** when the same rule lives in two places, delete one of them. `composeGpu.mjs` exists because the GPU-release rule was gotten wrong on the async lane and then reproduced verbatim on the sync lane an hour later — two copies is how that happens, one function is how it stops. `composePrompts` is called by both lanes for the same reason. `composeReplay.mjs` collects every rule about repeated requests. **If you find yourself fixing something in two files, that is the finding.**

**Falsification is not optional here.** Every fix in this loop was neutered to confirm exactly its own test reddened. That check caught **three of my own tests that could not fail**:

- one asserted `chargedUsd === unitUsd × 2` on the local lane, where `unitUsd` is always 0 — it compared zero to zero;
- one reimplemented the identity check it was meant to be testing instead of driving the production path;
- one used a fake store answering `has: () => true` forever, against which the code's refusal was *correct* — it would have gone red for the right reason and been read as the wrong one.

**A green test you have not tried to break is a decoration.** Neuter the fix; if nothing reddens, the test is not testing the fix.

**What the loop changed** (`98343e638..ef8735560`, eleven commits, each carrying its findings in the message):

| Round | Found | The one worth knowing |
|---|---|---|
| S | 4 | The GPU release grace was carrying the *watchdog's* value, and a clamp silently turned 20 minutes into 30 seconds |
| T | 5 | A client idempotency key bought a *second* batch; a failed batch retained a stub that made the failure permanent |
| U | 4 | The retained stub and its batch row were two independent clocks — a delayed retry got a confident 200 and a dead URL |
| V | 5 | The catch deleted a stub that had already landed; and extracting a guard made it `async`, reintroducing the very claim race the extraction was meant to protect |
| W | 2 | A rejected stored promise would 500 forever; a partial replayed the request's price beside the outcome's count |
| X | 2 | There were *two* kinds of miss and only one was synchronous; a dead row could evict a live claim that reused its key |
| Y | 3 | *No P0/P1.* A third kind of miss — a rejected claim — cannot be made synchronous, so the claim became get-or-set |
| Z | 1 | The get-or-set guarded the entry while the tail wrote blindly: with k waiters, k owners of one key |
| AA | 2 | A blind *delete* behind an await evicts a live claim as surely as a blind write; the expiry sentinel failed open |
| AB | 3 | The liveness exemption was inferred from a value's *shape*, and a promise keeps its `then` after it settles |
| AC | 0 | **BOTH SEATS APPROVE.** Its three hardening notes were taken anyway; one was a defect in the previous round's hardening |

**Deliberately NOT fixed, with the reasoning, so nobody "fixes" them into something worse:**

- **The unbounded await on a claim that never settles.** A timeout there returns null and starts a SECOND render — worse than the hang it replaces, on a path whose entire purpose is at-most-once. This wants a watchdog on the **owner**, not a race on the waiter.
- **`replayIfFresh` returns `null | body | Promise<body>`.** A mixed return type is a caller-contract trap and it is also the whole point: a MISS must be decided in the same synchronous run as the claim that follows it, and returning a promise unconditionally is exactly what reintroduced the claim race in round V. Wrap it for a second caller; do not flatten it.
- **The async stub's `chargedUsd` parity** is unobservable today (the only async lane is free), and **the frames-not-status retention predicate** is equivalent today (`finishBatch` marks a zero-still batch failed). Both are written correctly for the future and say in the code that no test can redden on them — which is better than a test that cannot fail.

**GLM's recommendations from the clean round**, all worth doing, none gating: emit counters at every branch of the replay guard (`replay.hit{ageMs}`, `replay.miss{reason}`, `claim.win`, `coalesce.join`, `contention.exhaust`) so the dishonest-200 mode becomes a dashboard line rather than a support ticket; build a deterministic microtask harness (fake clock, manual drain, interleavings as ordered op lists) instead of testing races with sleeps; make the `chargedUsd` parity test a hard launch gate on the hosted lane's billing switch; stamp a deadline on the 202 stub so *every* stored value carries one and the exemption becomes near-dead code; verify `E_REPLAY_CONTENTION` maps to 409/429 with `Retry-After` rather than a generic 500; and reuse this guard's shape at **publish/assets** rather than writing a second bespoke one — deriving the client key **once at the API edge** and consuming it at every stage.

**The single highest risk it named:** every invariant here is true *only in one process against one synchronous Map*. The hosted lane re-runs for money. The moment it runs behind a second replica, or the store is swapped for anything async, those invariants become probabilistic and the failure is a **silent double charge** — no crash, no log line. Before any multi-replica deploy: state the store contract as a checked invariant, assert in dev that store methods never return thenables, and write the Redis mapping now (`SETNX` ≈ `claimIfAbsent`, Lua compare-and-delete ≈ `dropIfStillOurs`, key TTL ≈ `replayExpiresAt`) so the port is translation rather than reinvention.

---

## 6. Every mistake I made, and the fix that actually held

This is the most valuable section. Durable learning packets are in `docs/ai-workflow/hermes-learning-packets/`.

| Mistake | What stopped it |
|---|---|
| **Stale restated-code claims in a review packet** (twice: a line count, then a gate row) — reviewers spent P0s on non-defects | **Generate every restated-code claim by command at packet-write time.** HELD 4 rounds |
| **Shipped the central defect as an "open question"** — six seats spent findings confirming what a 5-minute probe settled | **Probe the open question before shipping it as a question** (or *during* the panel). HELD 2 rounds |
| **Named 15 test files by hand; vitest silently ran 12** and reported a confident total | **Enumerate suites by glob.** HELD |
| **`tsc` exited 0 while checking none of my new files** — hand-written include list | Glob-generate the include. HELD |
| **An API used from memory instead of read** — a lucide export, style tokens, a signer, a config | **Before calling any service helper, list the module's exports and read the docblock of the one you plan to use** |
| **Repeated a documented lesson 60 minutes later** | The write-up was a *principle*. **Only commands with a trigger have held.** See `20260826-the-write-up-was-not-the-fix.md` |
| Apostrophe in single-quoted generated strings (3×) | Generated strings use double quotes |
| Copied `--card-dark` from a sibling stylesheet — also undefined | **Neighbouring code is evidence about convention, never correctness** |

| **Wrote three tests that could not fail** — one compared `0` to `0 × 2` on a free lane; one reimplemented the identity check it was testing; one used a fake store so pathological the code's refusal was correct | **Neuter the fix and confirm exactly its own test reddens.** Caught all three. A green you have not tried to break is a decoration |
| **Reproduced a defect I had fixed an hour earlier, on the sibling lane** (the GPU release rule) | Delete one of the two copies. `composeGpu.mjs` exists for this |
| **Reintroduced a race I had personally disproved** — extracting a guard made it `async`, so even a MISS yielded to the microtask queue and the claim no longer followed its check | The synchronicity was load-bearing and written down nowhere. **When behaviour depends on something not being awaited, say so in the file** |
| **Claimed in a docstring that a defect was fixed while the code below it did the opposite** (the blind tail write) | A reviewer read the comment and the code as one thing, which is what a reader does. **The comment is part of the diff** |
| **`$?` captured `tail`, not `tsc`** — reported "exit=0" over a V8 OOM crash stack | **Redirect to a file and read `$?` on the command itself.** Never pipe the thing whose exit code you are about to quote |
| **A trim to meet the line cap silently swallowed GATE 2 and three declarations** | Nine tests caught it immediately. **Run the suite after every mechanical edit, not after the batch** |
| Apostrophe in single-quoted generated strings (5× now) | Generated strings use double quotes. The correction that kept failing was "escape it"; the one that holds is "do not use a single-quoted string" |
| **A stub wired to a key nothing reads** — two tests doubled `tasteDeps.fetchPrompts` while the code destructures `fetchImpl`, so they silently hit a live local service and passed only while it ran | **Read the destructure in the function that consumes the collaborator before doubling it.** The sibling test file had it right the whole time |
| **I noticed the double was not working and rationalised it in a comment** — "a seed this stub does not control" — instead of asking why it did not control it | The comment was evidence. **When a test double appears not to take effect, that is the finding, not a caveat to write down** |
| **Bash heredocs and `python - <<EOF` fail on large markdown** with an unbalanced-quote error | Write the content with the Write tool and splice with a one-line `python -c`. Also: **Git Bash `/tmp` ≠ Node's `/tmp`** — a Python write to `/tmp` lands in `C:\tmp` and the next `cp` cannot find it |

**The pattern across the whole session: every correction written as a COMMAND held; every one written as a PRINCIPLE or scoped to a LOCATION recurred somewhere else.**

---

## 7. State of the loop — it is dry, and here is what that does and does not mean

**The dry-loop is CLOSED.** Eleven hostile rounds (S → AC) ran to a clean finish: round AC returned **APPROVE from both seats, no P0 and no P1**. Section 5b has the round-by-round ledger. Nothing is mid-flight.

**What is proven:** 524/524 backend atelier tests across 32 suites, **verified with the Swan taste server DOWN** — that qualifier is new and it matters. Two tests in `brandKitLocalLane.test.mjs` stubbed `tasteDeps.fetchPrompts`, a key nothing reads (`fetchTastePrompts` destructures `fetchImpl`), so they had been reaching the real server at `127.0.0.1:7331` and passing only because it happened to be up. Every test-count in this session before commit `1ca9bf47c` was therefore partly a measurement of what was running on the machine. The stubs are wired to the real seam now, so the number means what it says. **If a suite goes red for you, check whether a local service just stopped before assuming a regression** — that is what this looked like.

Also proven: every fix in the loop falsified by neutering it and confirming exactly its own test reddened; every backend atelier file within the 300-line cap; secret scan clean on every commit; all 172 commits landed and verified with `git log --oneline -1` after each.

**What is NOT proven, and has never been proven on this branch:**

- **No render has ever run.** There is no ComfyUI in this environment. The local lane is exercised entirely through injected `renderStill` doubles.
- **No R2 object has ever been written**, and no signed URL has been fetched.
- **No SQL has ever executed.** The asset-library tests generate real SQL and assert its shape, which catches a wrong operator; only execution catches a dialect error.
- **The UI has never been opened in a browser.** Frontend tests are jsdom.
- **`tsc` OOMs at 8GB on this tree** and is a pre-existing condition. It type-checks no `.mjs`, so it says nothing about the backend work either way.
- **Baseline is not clean.** 6 backend and 7 frontend tests fail on this branch for pre-existing reasons (equipment scan, admin role escalation, token discipline, federated auth). Verified identical with this session's changes stashed. Do not attribute them to this work, and do not claim a clean baseline.

**The single unproven thing that matters most:** every concurrency invariant the loop established is true *in one process against one synchronous Map*. See the end of section 5b before any multi-replica deploy.

Six **Hermes inbox memos** sit untracked in `.ai-workflow/hermes-inbox/pending/` — that directory is gitignored by design (the ephemeral any-agent channel, drained by Hermes). Leave them.

---

## 8. Blocked on Sean — do not attempt these

1. **Merge PR #73.** 175 commits, nothing deployed. His call alone.
2. **The SWA-207 probe.** Turns the gold *"local lane unproven"* into a live $0 lane. Needs ComfyUI running on his machine; the UI is already built to flip the moment the switch is set.
3. **Name the brand kits for his other websites.** I shipped only `swanstudios` and `universal` and **deliberately did not invent the others** — a kit is a claim about how someone's brand looks, and guessing puts fabricated art direction in front of a model with his name on the output. This is a `grill-me` conversation. Adding one is a single object in `shared/brandKits/catalogue.mjs`.
4. **The globe button (SWA-205).** He asked for "the original one — a brown one, a gold one, all kinds of colors" and wants the Forge rebuilt in that style. I ruled out `SwanGlobe` (a Three.js visualisation, not a button) and `DictationOrb` (its "brown" was placeholder text in an ASCII diagram). `GlowButton`'s `gilded` variant is the nearest standing candidate. **Ask him; do not guess and rebuild the Forge wrong.**

---

## 9. The backlog, ranked, with triggers

1. **Derivative thumbnails** — the library signs **originals**; 24 × 1920×1080 is tens of MB. `loading="lazy"` bounds what is fetched, not what a fetched one costs. *Trigger: the first page that feels heavy on a real connection.* **Top of the list.**
2. **Select-an-asset-into-Compose/Motion** — the "reuse" in the slice name, honestly not delivered by a list.
3. **Durable batch rows + cross-process ledger atomicity.** In-flight batch *metadata* dies with the process (the stills survive as asset rows and the 404 says so). `tryCommit` is atomic **within one process only**. *Trigger: a second backend process, or the first deploy onto an ephemeral path* — the ledger currently lives under the repo tree, so any tree-clean re-mints the budget. `SWAN_SPEND_LEDGER_DIR` points it at a volume.
4. **Indexes.** `MediaAsset` declares **none**. The library now wants `(owner_user_id, date_trunc('milliseconds', created_at) DESC, id DESC)` — an *expression* index, because of the cursor fix.
5. **Free-text prompt search** — the prompt lives in `provenance` JSONB. *Trigger: a migration promoting it to a column or adding a `to_tsvector` index.* Deliberately withheld rather than shipped unverifiable.
6. **Motion gets no brand kit.** *Trigger: when Motion accepts a prompt not derived from the bound asset.*
7. **Authz on kit selection / law override.** `universal` is currently a one-click brand-law escape in the Swan UI. The override *is* recorded on the asset, so it is auditable rather than invisible.
8. Then: sequence + mediaSync · taste feedback loop · Doctor surface · batch/matrix · ComfyUI input GC + prompt PII lint · FLUX.1-schnell fallback.
9. **Filed during the review loop (SWA-165), each with reasoning that should be read before acting:**
   - **A per-user cap inside the client-keyed eviction class.** It is currently global, so a tenant minting many keys can evict another's. One operator today, so it is hardening, not a gate.
   - **An owner-side watchdog on a claim that never settles** — *not* a timeout on the waiter, which would return null and start a second render. The distinction is the whole point.
   - **A wrapper for `replayIfFresh`'s mixed return type** for any second caller. Do not flatten the type itself; the synchronous-miss property depends on it.
   - **Counters at every branch of the replay guard** so the dishonest-200 mode is a dashboard line, not a support ticket.
   - **A deterministic microtask harness** — fake clock, manual drain, interleavings authored as ordered op lists. Every one of the 31 defects was an interleaving, and sleeps are the wrong instrument for all of them.
   - **`chargedUsd` parity as a hard launch gate** on the hosted lane's billing switch, written down now while it is cheap.
   - **Reuse the replay guard at publish/assets** rather than writing a second bespoke one, and derive the client key **once at the API edge** for every stage.

---

## 10. Environment gotchas that cost real time

- **Git Bash `/tmp` ≠ Node's `/tmp` on Windows.** Use absolute `c:/tmp/...` paths for anything Node reads.
- **`node --check` catches syntax, not free variables.** A regex-driven file split left `LANES` behind and only the tests caught it.
- **Python heredocs:** assert your boundaries before writing. Two extractions were off by one and the assertion saved the file both times. `\s` in a non-raw string warns but works.
- **`git commit` may be BLOCKED** by the token-registry guard or the secret scanner — and a following `git push` will then cheerfully push the *previous* commit and print success. **Always `git log --oneline -1` after committing.**
- **Vite emits to `dist/v3/`.** A chunk walk in `dist/assets/` finds nothing and reads as a regression.
- **Always pair an absence claim with a positive control** in the same command. A known-present control chunk caught a false "absent" that a bare grep would have reported as fact.
- **`$?` after a pipe is the pipe's exit code.** `npx tsc ... | tail -5; echo $?` printed `exit=0` over a V8 out-of-memory crash stack. Redirect to a file and read `$?` on the command itself.
- **Bash heredocs — including `python - <<'EOF'` — fail on large markdown** with `unexpected EOF while looking for matching quote`. Write the content with the Write tool and splice it with a one-line `python -c`.
- **A Python write to `/tmp` lands in `C:\tmp`; a following bash `cp /tmp/...` cannot find it.** Same trap as the entry above it, from the other direction. Use the scratchpad's absolute path for anything crossing the two.
- **`node ... <glob>` can exceed the Windows argument limit.** `backend/tests/unit/*.mjs` is too many; scope the glob.
- **A test whose fake collaborator is pathological tests the fake.** A store answering `has: () => true` forever made a correct refusal look like a bug.

---

## 11. Standing process rules that bit me

- **Rule 70 batch-push:** commit per slice locally, push once at the end. Never wait on a deploy between slices.
- **Rule 45:** no `--amend`, rebase, or force-push without Sean. Follow-up commits only.
- **Rule 67:** read the other agent's lane before editing (`node scripts/lane.mjs claim/release`). Never `git add -A` while another agent holds locks.
- **Rule 4:** 300-line cap, enforced by a pre-commit guard on frontend files and by hand elsewhere. Several files were split mid-slice; expect it.
- **Rule 59:** never read `.env`-class files. Sean had one open in the IDE this session; it was not read.
- **Rule 16:** paid seats need permission and a disclosed worst-case spend. Sean gave standing authorisation for the six-seat panel *for this loop*.
