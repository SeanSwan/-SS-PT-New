---
decision: "Comprehensive handoff for the Swan Atelier workstream as of 2026-08-27. Covers the eleven-round hostile-review loop, the thumbnail slice, the reuse slice, and every correction made to earlier claims. Written so the next agent continues without re-deriving anything or asking Sean a question already answered."
status: superseded
supersedes: docs/ai-workflow/AI-HANDOFF/ATELIER-LOOP-SESSION-HANDOFF-2026-08-26.md
---

# Swan Atelier — comprehensive handoff · 2026-08-27

> **SUPERSEDED for current state by `ATELIER-VIDEO-POSTER-HANDOFF-2026-08-28.md`.** Still
> correct for the studio as a whole and the earlier build slices. Three things in it are now
> known wrong and are corrected there: §5a's baseline-failure list names suites that do not
> LOAD rather than ones that fail; §5's backend glob is keyword-based and cannot see test
> files added since; and its backlog #1 framing ("ask Sean whether the Assets tab should list
> video") was already answered by shipped code — it does.

**Read this file, then `git log --oneline main..HEAD`. Nothing else is required to start.**

The 2026-08-26 handoff is still accurate for the six *earlier* build slices and the round-by-round review ledger; this file supersedes it for current state, the backlog, and everything learned since. Where they disagree, **this file wins**.

---

## 0. Where the work is

| | |
|---|---|
| **Worktree** | `c:/tmp/ss-atelier-v2` — a **git worktree**, not the main checkout |
| **Branch** | `feat/atelier-v2-compose` |
| **HEAD** | `b2fdd0ecd` · **181 commits ahead of `main`** · pushed · working tree clean |
| **PR** | **#73** — open, unmerged |
| **Deployed** | **NO. Nothing from this branch is in production.** |
| **Linear** | **SWA-165** carries a comment per slice — read the last three for the narrative |

**Do not work in the main checkout.** Another agent holds locks there (`node scripts/lane.mjs doctor`). Its `backend/node_modules` was emptied mid-session by that agent's operation and later restored — see §11, because it will look like your tests broke when it happens again.

---

## 1. What the Atelier is

A studio for making brand-governed images and short motion clips, in five rungs:

**Brief → Still → Motion → Publish → Assets**

- **Two lanes.** `local` (RTX 5090 via ComfyUI, **$0**, single-flight, **async**, the default) and `hosted` (OpenRouter, opt-in, **off until a budget is set**, synchronous). Only the local lane goes async.
- **Two prompt sources.** `brief` (a 12-slot compiler plus a law filter) and `taste` (Sean's rated corpus at `127.0.0.1:7331`, **local-only**).
- **Brand kits** are a data/behaviour pair mirroring the provider catalogue. `swanstudios` (`lawProfile: 'full'`) and `universal` (`'universal'`) ship; the rest are Sean's to name (§10).
- **Money is governed by one atomic gate.** `tryCommit` is a synchronous read-check-write with no `await` inside it. The ledger is **monotonic on purpose** — it never reconciles downward, because a negative delta would let anyone who reaches it mint headroom.

---

## 2. The ladder — what is DONE

**All five rungs are built.** I told Sean last turn that Publish was the next slice. **That was wrong** — Publish shipped in an earlier session and is green (`atelierPublish.test.mjs` 15/15, `AtelierCompose.publish.test.tsx` 2/2). `publishAsset.mjs` has `STATUSES`, `TRANSITIONS`, `publishBlockers`, `transitionAsset`; routes `/asset/:id/status` and `/asset/:id/reference` are mounted; `AtelierPublishPanel.tsx` renders the declaration, the permalink and the embed snippet with copy buttons.

**Verify a "next slice" against the code before proposing it.** I did not, and named a finished rung.

One thing genuinely completed *this* session, as a side effect: the Publish panel is driven by `c.reference`, which loads from the **bind target**. Before the reuse slice that could only ever be a freshly-composed still. Now a saved asset carried in from the library loads its reference too — **so any past render can reach Publish**, which it could not before.

---

## 3. This session, commit by commit

### 3a. The recursive hostile-review loop (rounds S → AC) — 16 commits, `98343e638..ef8735560`

Sean asked for hostile review "recursively in a loop until there's no issues, no bugs, and we made upgrades enhancements wherever we can." **Eleven rounds ran and found 31 real defects.** Round AC ended with **both seats returning APPROVE — no P0, no P1.**

The round-by-round ledger is §5b of the 2026-08-26 handoff. The part that matters going forward is §7 of this file.

### 3b. Derivative thumbnails — `c2b1f5993`, reviewed in `c78eaa6df`

The library signed the **original** object for every card. Measured: a photographic 1920×1080 still is 5.81 MB, so a 24-card page cost **139 MB**. Now **0.67 MB** — a 29 KB WebP per card.

**`generateThumbnailUrl` is a shorter TTL, not a smaller image.** It signs the same bytes. Nothing in the stack was making a derivative and the name made it look like something was.

`stillThumbnail.mjs` shrinks to a 512px-long-edge WebP at q72 and returns **null** — never throws — on undecodable bytes, a missing sharp native binary, or a derivative larger than its source. `persistStill` records it in `posterR2Key`, an **existing nullable column**, so **no migration**. The library signs `posterR2Key || r2Key`.

The review then found data loss that predated the slice: `findOrCreate` then `if (created) putObject(...)` with **nothing around the put**. A transient R2 failure left the **row** committed and the **bytes** absent; the retry's `findOrCreate` returned `created: false` and skipped the write **forever**. Fixed by inverting to **bytes first, then the row** — the key is the content hash, so writing the same bytes twice is a no-op at the same address.

### 3c. Reuse a saved frame — `2fa8d896a`, reviewed in `33b44a61e`, corrected in `b2fdd0ecd`

The library listed past renders and offered nothing to do with them. A card now hands its frame to Compose, which adopts it, shows what it is about to animate, and steps aside when a new batch arrives.

**The shortcut deliberately not taken, and the most important thing in this section.** Motion's gate makes the **caller** send the `sha256` and compares it to the asset's recorded hash — *"refusing to animate a frame that is not the one approved."* The library did not publish that hash, so a library asset could not be bound at all. The obvious fix is to let the bind look up its own hash and drop the argument. **That would make the gate compare a value to itself and silently delete the protection** — code still present, test still green, check meaningless. The library publishes the hash instead and the caller still has to say which bytes it means.

> **When a check is inconvenient because one side lacks an input, adding the input is a fix and removing the argument is a disguise. They are indistinguishable in a diff and opposite in effect.**

### 3d. The correction — `b2fdd0ecd`

When the shared `node_modules` came back, the vitest run deferred across three commits finally ran and **failed three tests I had reported as covered**. The existence check was written `d.assetModel.findOne ? await ... : null`, and that tolerance was the bug: a model without the method falls through to "no existing row", so **every duplicate persist re-uploaded the bytes**.

**My standalone harness had passed because I wrote its fake to match my new code.** A harness written alongside the code it verifies inherits that code's assumptions — it proves "does this run", never "does this fit what already exists". `findOne` is required now.

**Correction to the record: duplicate-persist re-uploaded bytes from `c2b1f5993` until `b2fdd0ecd`.** Everything else those commits claimed stands.

---

## 4. Design decisions you must not accidentally undo

Each of these cost a defect to learn. The comment in the code says so at every site.

1. **The ledger is monotonic.** No downward reconciliation. A failed batch still consumes budget — the conservative direction, and what stops a retry storm spending without bound.
2. **Only `lane === 'local'` goes async.** Hosted is synchronous and retains its idempotency key *deliberately* (`REPLAY_NEVER_EXPIRES`), because the response is the only handle and re-running charges money.
3. **The hosted lane needs no watchdog.** `openrouterImage.mjs:172` sets `AbortSignal.timeout(180_000)` on its own fetch. Local rendering has no socket to abort, so its bound lives outside.
4. **`replayIfFresh` returns `null | body | Promise<body>`.** The mixed type is load-bearing: a MISS must be decided in the same synchronous run as the claim that follows it. Returning a promise unconditionally reintroduced a claim race in round V. **Wrap it for a second caller; do not flatten it.**
5. **A miss returns null synchronously; only a live claim is awaited.** Marking `replayIfFresh` `async` breaks this invisibly.
6. **Every store mutation is conditional** — `claimIfAbsent` before a write, `dropIfStillOurs` before a delete. A blind delete behind an `await` evicts a live claim as surely as a blind write.
7. **A deadline is enforced wherever one exists; its absence is forgivable only on a live claim.** A missing deadline on a settled stub means a writer forgot, not that it lives forever.
8. **`REPLAY_NEVER_EXPIRES` is `Number.MAX_SAFE_INTEGER`, not `Infinity`.** Infinity becomes null through JSON, `Number(null)` is 0, and a fail-closed guard reads 0 as expired — a store reload would turn deliberate immortality into a re-charge on the one lane that charges.
9. **A thumbnail is an optimisation, never a requirement.** Every failure path returns null and leaves `posterR2Key` null. The asset is already saved.
10. **The library falls back to the original when there is no derivative.** Deriving the thumb key unconditionally would 404 every older asset into a grey box. **Heavy and visible beats light and absent.**
11. **Motion binds by `assetId` + caller-supplied `sha256`.** See §3c. Do not "simplify" this.
12. **"Approved" in `motionBind` means the frame the operator picked, not `approvalStatus`.** `approvalStatus` gates publishing, a later rung. A reviewer read the vocabulary as a missing gate; the module now says so outright.
13. **The handoff is a delivery, not a standing value.** Compose reports it taken (`onAdopted`) and the hub drops it, because Compose remounts on every tab switch.
14. **`persistStill` requires `findOne`.** A collaborator without it is a wiring error, not a runtime condition to paper over.

---

## 5. How to verify — the commands that actually work here

```bash
# BACKEND — atelier + everything the edits touch. Enumerate by GLOB, never by hand.
cd backend && npx vitest run $(ls tests/unit/*.mjs | grep -iE \
  "atelier|compose|brandKit|laneLedger|spendGates|assetLibrary|video|render|initImage|persist|thumbnail|motion" | tr '\n' ' ')
# → 560/560 across 39 suites at b2fdd0ecd

# FULL BACKEND — expect exactly 6 pre-existing failures (see §5a)
cd backend && npx vitest run

# FRONTEND studio
cd frontend && npx vitest run src/components/DashBoard/Pages/content-studio
# → 136/136 across 15 suites

# TYPE CHECK — the project config OOMs at 8GB. Check touched files directly:
cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --skipLibCheck \
  --jsx react-jsx --module esnext --target es2020 --moduleResolution bundler --strict <files...>
# `@/` alias errors from this invocation are artifacts of the ad-hoc config, not real.

# GUARDS (all block commits)
node scripts/hooks/backend-line-cap.mjs <files...>      # scope the glob; a whole dir exceeds the Windows arg limit
node scripts/hooks/frontend-guards.mjs --file <files...>
bash scripts/scan-secrets.sh <files...>
```

### 5a. The baseline is NOT clean, and you must not attribute it to your work

Full backend: **9837 passed, 6 failed**. The six live in `equipmentScanService.multi`, `equipmentScanService.retry`, `adminRoleEscalationMatrix`, `adminWaiverController`, `adminWriteRoleEscalationMatrix`, `associationsModelRegistryParity`, `destructiveOwnershipMatrix`, `federatedAuthFoundation`. Verified identical with this session's changes stashed. **Never report "all tests pass"; report the delta against this set.**

### 5b. Falsification is not optional

**After every fix, neuter it and confirm exactly its own test reddens.** This session that caught **four** tests that could not fail — one compared `0` to `0 × 2` on a free lane, one reimplemented the identity check it was testing, one used a fake so pathological that correct behaviour read as a bug, and one was a standalone harness whose fake was written to match the new code. **Review caught none of them.**

Back the good file up **to the scratchpad, not to git** — `git checkout --` will discard uncommitted work along with the neuter (I did this).

---

## 6. The hostile-review panel

```bash
# From the MAIN checkout, with absolute paths:
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
node scripts/consult-panel.mjs --document <abs path> --seats glm,qwen
```

| Seat | Cost | What it is worth |
|---|---|---|
| **glm-5.3** | $0 (subscription) | The workhorse. Real findings in 9 of 11 review rounds, including three defects introduced by the previous round's fix, and the data-loss path in the thumbnail slice. Its "could not verify" lists are accurate — read them |
| **qwen-3.8** | $0 (local) | Returned APPROVE six rounds running while GLM was still finding P1s. Right that the core held; wrong that nothing remained. **Never run it as a lone seat** |
| **stealth/ox-alpha** | — | **RETIRED.** The endpoint 404s with a disclosure that it was ZAI's GLM-5.3-Flash. Earlier "Ox and GLM independently agreed" was one family agreeing with itself |

**The whole review programme cost $0.** Genuine independence requires **different labs**, not different slugs.

### ⚠ The single most important thing about running the panel

**Paste the whole function, never the interesting part.** Abbreviated excerpts in my own packets manufactured **four** confident findings about guards that were present: a null-asset check, a selection-clearing line, an estimate-only guard, and tab-remount behaviour. **When a seat is wrong, check the packet before you check the code.** Every time so far, the packet was at fault.

Bash heredocs fail on packet-sized markdown containing backticks. Write the prose with the Write tool, splice the source with a single-quoted `python -c`. A `python -c` in **double** quotes lets bash interpret backticks — that also fails.

---

## 7. The defect classes this codebase produces

This is the most valuable section. Two classes account for nearly everything found.

### 7a. A rule applied to one half of a pair — the dominant class by a wide margin

Sixteen of the review loop's 31 defects were this shape, and both slices after it produced another. Cost guarded but not ceiling · sync lane but not async · client key but not derived · succeeded batch but not failed · release telemetry but not cleanup telemetry · absent-miss synchronous but not expired-miss · a conditional write beside a blind delete · count corrected but not cost · the derivative half hardened while the primary write stayed bare · a stub wired to `fetchPrompts` while the code reads `fetchImpl`.

**In every single case the comment above the code was accurate — about the path the author happened to be looking at.** That is what makes it invisible in review: nothing reads as wrong.

**Adding guards did not stop it. Deleting the second copy did.** `composeGpu.mjs`, `composeReplay.mjs` and `startLocalBatch` exist for no other reason. **If you are fixing the same thing in two files, the duplication is the defect — fix that, not the two bugs.**

### 7b. A test that passes for the wrong reason — 4 instances this session

An assertion satisfiable by either cause · a test that reimplements the logic it checks · a fake so pathological that correct behaviour looks broken · a harness whose fake was written to match the new code. And one whole class beyond tests: **a stub wired to a key nothing reads**, which made two tests silently depend on a local service being up, so every test count reported before `1ca9bf47c` was partly a measurement of the machine.

**Before doubling a collaborator, read the destructure in the function that consumes it.**

### 7c. A name asserting a behaviour it does not have

`generateThumbnailUrl` makes no thumbnail. `fetchPrompts` is read by nothing. **A name is a claim, and an unverified name is an unverified claim.**

---

## 8. Every mistake, and what actually stopped it

| Mistake | What stopped it |
|---|---|
| Four tests that could not fail | **Neuter the fix; confirm exactly its own test reddens.** Nothing else found any of them |
| Reproduced a defect on the sibling lane an hour after fixing it | Deleting the second copy |
| Reintroduced a race I had personally disproved (an extraction made a guard `async`) | The synchronicity was load-bearing and written down nowhere. **When behaviour depends on something not being awaited, say so in the file** |
| A docstring claiming a defect was fixed while the code below did the opposite | A reviewer read comment and code as one thing, which is what a reader does. **The comment is part of the diff** |
| Reported `tsc exit=0` over a V8 OOM crash stack | **`$?` after a pipe is the pipe's exit code.** Redirect to a file; read `$?` on the command itself |
| A line-cap trim silently swallowed GATE 2 and three declarations | Nine failing tests. **Run the suite after every mechanical edit, not after the batch** |
| Named a finished rung (Publish) as the next slice | **Verify a next-step against the code before proposing it** |
| Four reviewer findings manufactured by my own abbreviated excerpts | Paste the whole function |
| `git checkout --` discarded uncommitted work during falsification | Back up to the scratchpad, not to git |
| Apostrophe in a single-quoted generated string (5×) | Use double quotes. "Escape it" failed every time |

**The pattern across the whole session: every correction written as a COMMAND with a trigger held; every one written as a PRINCIPLE recurred.**

---

## 9. The backlog, ranked, with triggers

1. **Video assets grey-box in the library.** `assetLibrary.mjs:243` returns null for `kind !== 'image'`, but video assets carry `posterR2Key` from the video job service — they have a poster and it is never signed. *Reachable today, small, and the cheapest real win.* Needs one product decision: should the Assets tab list video at all, or stay stills-only? **Ask Sean; do not guess.**
2. **Indexes.** `MediaAsset` declares **none**. The library needs `(owner_user_id, date_trunc('milliseconds', created_at) DESC, id DESC)` — an **expression** index, because the cursor compares on the truncated value. *Trigger: the first page over real data.*
3. **Durable batch rows + cross-process ledger atomicity.** In-flight batch *metadata* dies with the process; the stills survive as asset rows. `tryCommit` is atomic **within one process only**, and the ledger lives under the repo tree, so a tree-clean re-mints the budget (`SWAN_SPEND_LEDGER_DIR` points it at a volume). *Trigger: a second backend process, or the first ephemeral deploy.*
4. **Observability on the replay guard.** Counters at each branch — `replay.hit{ageMs}`, `replay.miss{reason}`, `claim.win`, `coalesce.join`, `contention.exhaust` — so the dishonest-200 mode is a dashboard line, not a support ticket.
5. **A deterministic microtask harness.** Fake clock, manual drain, interleavings as ordered op lists. Every one of the 31 loop defects was an interleaving and sleeps are the wrong instrument for all of them.
6. **`E_REPLAY_CONTENTION` mapping.** Verify it becomes 409/429 with `Retry-After`, not a generic 500 — "retry in a moment; nothing was spent" is right copy for a retryable status and wrong for a 500.
7. **Per-user cap in the client-keyed eviction class** (SWA-165). It is global, so a tenant minting many keys can evict another's. One operator today.
8. **An owner-side watchdog on a never-settling claim** — *not* a waiter-side timeout, which would return null and start a second render on a path whose purpose is at-most-once.
9. **`chargedUsd` parity as a launch gate** on the hosted lane's billing switch. Unobservable today because the only async lane is free; write the gate now while it is cheap.
10. Then: free-text prompt search (prompt lives in `provenance` JSONB) · Motion gets no brand kit · authz on kit selection / law override · sequence + mediaSync · taste feedback loop · Doctor surface · batch/matrix · ComfyUI input GC + prompt PII lint · FLUX.1-schnell fallback.

### The single highest risk, above all of the above

**Every concurrency invariant in this subsystem is true in ONE process against ONE synchronous Map.** The hosted lane re-runs for money. Behind a second replica, or with an async store, they become probabilistic and the failure is a **silent double charge** — no crash, no log line. Before any multi-replica deploy: state the store contract as a checked invariant, assert in dev that store methods never return thenables, and write the Redis mapping now (`SETNX` ≈ `claimIfAbsent`, Lua compare-and-delete ≈ `dropIfStillOurs`, key TTL ≈ `replayExpiresAt`) so the port is translation rather than reinvention.

---

## 10. Blocked on Sean — do not attempt these

1. **Merge PR #73.** 181 commits, nothing deployed. His call alone.
2. **Run the SWA-207 probe.** Turns the gold *"local lane unproven"* into a live $0 lane. Needs ComfyUI on his machine; the UI is already built to flip the moment the switch is set. **This is the one action that makes everything on this branch real.**
3. **Name the brand kits for his other websites.** Only `swanstudios` and `universal` ship, and the others were **deliberately not invented** — a kit is a claim about how someone's brand looks, and guessing puts fabricated art direction in front of a model with his name on the output. This is a `grill-me` conversation. Adding one is a single object in `shared/brandKits/catalogue.mjs`.
4. **Identify the globe button (SWA-205).** He asked for "the original one — a brown one, a gold one, all kinds of colors". `SwanGlobe` is ruled out (a Three.js visualisation, not a button); `DictationOrb`'s "brown" was placeholder text in an ASCII diagram. `GlowButton`'s `gilded` variant is the nearest standing candidate. **Ask; do not guess and rebuild the Forge wrong.**
5. **Whether the Assets tab should list video** (backlog #1).

---

## 11. Environment gotchas that cost real time

- **The shared `backend/node_modules` can vanish mid-session.** This worktree symlinks to the main checkout's, and another agent emptied it (0 packages) for about an hour. **It will look exactly like your tests broke.** Check `ls backend/node_modules | wc -l` before diagnosing. Do **not** reinstall in that tree while an agent holds locks — it is not yours.
- **Git Bash `/tmp` ≠ Node's `/tmp` on Windows.** A Python write to `/tmp` lands in `C:\tmp` and the next bash `cp /tmp/...` cannot find it. Use the scratchpad's absolute path for anything crossing the two.
- **`$?` after a pipe is the pipe's exit code.** `npx tsc … | tail -5; echo $?` printed 0 over a V8 OOM crash.
- **Bash heredocs fail on large markdown containing backticks**, including `python - <<'EOF'`. Write with the Write tool, splice with single-quoted `python -c`.
- **`node <script> <glob>` can exceed the Windows argument limit.** `backend/tests/unit/*.mjs` is too many.
- **`npx vitest` may resolve a stale `.vite-temp` into the main checkout.** Delete it and retry.
- **`node --check` catches syntax, not free variables.** A regex-driven split left an identifier behind and only the tests caught it.
- **Vite emits to `dist/v3/`,** not `dist/assets/`.
- **Always pair an absence claim with a positive control** in the same command.
- **Verify an icon export before importing it** — `Images` is not an export of the installed lucide-react; `Image` is.

---

## 12. Standing rules that bit me

- **Rule 70 batch-push:** commit per slice locally, push once at the end. Never wait on a deploy between slices.
- **Rule 45:** no `--amend`, rebase or force-push without Sean. Follow-up commits only.
- **Rule 67:** read the other agent's lane before editing. Never `git add -A` while another holds locks.
- **Rule 4:** 300-line cap, enforced pre-commit. Several files were split mid-slice; expect it.
- **Rule 59:** never read `.env`-class files.
- **Rule 73:** no "done" without current-session proof **and** a clean hostile pass in the same message.
- **Rule 16:** paid seats need permission and a disclosed worst-case spend. The free panel needs neither and has been enough for every round.
- **Closeout is enforced by Stop hooks, not by memory:** a Hermes inbox memo carrying a literal `## Mistakes I made`, a Linear sync (`LINEAR: SWA-<n>`), and a dual-tier summary with plain-English **first**. All three block the turn.

---

## 13. What to do first

1. Read this file and `git log --oneline main..HEAD | head -20`.
2. Run the two verification commands in §5 and confirm you reproduce **560/560** and **136/136**, with the six baseline failures in §5a.
3. Ask Sean about backlog #1 (should the Assets tab list video?) — it is the cheapest real win and needs one decision, not a guess.
4. Whatever you build: panel it (§6), falsify every fix (§5b), and check §7 before you conclude a reviewer is wrong.
