---
decision: "Full session handoff for the Swan Atelier build loop — six panel-reviewed slices shipped to an unmerged branch. Everything the next agent needs to continue without re-deriving it."
status: open
supersedes: none
---

# Swan Atelier — session handoff · 2026-08-26

**Read this first, then `git log --oneline main..HEAD` on the branch below. Nothing else is required to continue.**

---

## 0. Where the work is, and why it is not where you expect

| | |
|---|---|
| **Worktree** | `c:/tmp/ss-atelier-v2` — a **git worktree**, not the main checkout |
| **Branch** | `feat/atelier-v2-compose` |
| **HEAD** | `d5b5d16cc` · **133+ commits ahead of `main`** · remote in sync · working tree clean |
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

## 2. The six slices this session, newest first

Each was: build → six-seat hostile panel → fix → verify → commit → closeout (Hermes memo + learning packet + Linear + PR comment).

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

**Calibration after five rounds, and it is unambiguous:**

| Seat | Cost | Verdict |
|---|---|---|
| **stealth/ox-alpha** | $0 | Found the decisive defect repeatedly. 429s occasionally — retry once, it is free |
| **glm-5.3** | $0 (subscription) | Highest finding density; found the cursor-precision bug |
| **qwen-3.8** | $0 (local) | Inferred a compiler leak *from a filename and a packet* |
| **x-ai/grok-4.6** | ~$0.05 | Best when attacking a **rationale** rather than a diff |
| **hunyuan-3** | ~$0.004 | Cheap, honest about its own limits |
| **moonshotai/kimi-k3** | ~$0.16 | **Priciest with the fewest findings, twice. Dropped.** |

**A $0 panel produced the round's sharpest finding five rounds running.** Default: **Ox + GLM + Qwen**, add a paid seat only when they converge on "we cannot tell from here." Total spend for the whole session was **~$0.51**.

**Panel spend estimates run ~1.6× low** (reasoning tokens are unmodelled) — disclose the multiplied figure. Per-seat costs are printed to a task buffer that **rotates**; capture them or the disclosure becomes unverifiable.

---

## 6. Every mistake I made, and the fix that actually held

This is the most valuable section. Four durable learning packets are in `docs/ai-workflow/hermes-learning-packets/`.

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

**The pattern across the whole session: every correction written as a COMMAND held; every one written as a PRINCIPLE or scoped to a LOCATION recurred somewhere else.**

---

## 7. IN-FLIGHT — the one thing that is genuinely unfinished

**A dry-loop was interrupted at round 2.** The Stop hook (Dry-Loop Law, Sean 2026-07-21) requires hostile rounds until two consecutive CLEAN rounds, each from **a vantage not yet tried**.

- **Round 1 — real HTTP path (Express + supertest): CLEAN.** No defects; the coverage was the finding, and it is now committed as `atelierRouteHttp.test.mjs` (`d5b5d16cc`).
- **Round 2 — NOT RUN.** Planned vantage: **the full backend suite**, not the atelier glob. My edits touched *shared* modules other suites import (`spendGuard.mjs`, `spendLedger.mjs`, `swanPromptCompiler.mjs`, `render-agent.mjs`), and cross-suite breakage would not appear in the glob.
- **Round 3 — NOT RUN.** Planned vantage: **mobile viewport + a11y** on the new Assets tab (320/375/414px, keyboard nav, nested interactives). CLAUDE.md requires this for any client-facing surface and the tab has never been checked.

**Do this before claiming the loop is dry.** End the closeout with the round ledger and the literal marker `DRY-LOOP: CLEAN×2 (rounds: N)`. **Never fabricate the marker.**

Also: six **Hermes inbox memos** sit untracked in `.ai-workflow/hermes-inbox/pending/` — that directory is gitignored by design (it is the ephemeral any-agent channel, drained by Hermes). Leave them.

---

## 8. Blocked on Sean — do not attempt these

1. **Merge PR #73.** 133 commits, nothing deployed. His call alone.
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

---

## 10. Environment gotchas that cost real time

- **Git Bash `/tmp` ≠ Node's `/tmp` on Windows.** Use absolute `c:/tmp/...` paths for anything Node reads.
- **`node --check` catches syntax, not free variables.** A regex-driven file split left `LANES` behind and only the tests caught it.
- **Python heredocs:** assert your boundaries before writing. Two extractions were off by one and the assertion saved the file both times. `\s` in a non-raw string warns but works.
- **`git commit` may be BLOCKED** by the token-registry guard or the secret scanner — and a following `git push` will then cheerfully push the *previous* commit and print success. **Always `git log --oneline -1` after committing.**
- **Vite emits to `dist/v3/`.** A chunk walk in `dist/assets/` finds nothing and reads as a regression.
- **Always pair an absence claim with a positive control** in the same command. A known-present control chunk caught a false "absent" that a bare grep would have reported as fact.

---

## 11. Standing process rules that bit me

- **Rule 70 batch-push:** commit per slice locally, push once at the end. Never wait on a deploy between slices.
- **Rule 45:** no `--amend`, rebase, or force-push without Sean. Follow-up commits only.
- **Rule 67:** read the other agent's lane before editing (`node scripts/lane.mjs claim/release`). Never `git add -A` while another agent holds locks.
- **Rule 4:** 300-line cap, enforced by a pre-commit guard on frontend files and by hand elsewhere. Several files were split mid-slice; expect it.
- **Rule 59:** never read `.env`-class files. Sean had one open in the IDE this session; it was not read.
- **Rule 16:** paid seats need permission and a disclosed worst-case spend. Sean gave standing authorisation for the six-seat panel *for this loop*.
