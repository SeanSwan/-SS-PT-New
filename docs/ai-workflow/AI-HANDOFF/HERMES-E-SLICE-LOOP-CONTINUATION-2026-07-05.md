# Hermes-OS E-Slice Recursive Loop — Continuation Handoff (2026-07-05)

- **For:** the next agent (Opus 4.8 / deputy Final Decider) picking up the §11 recursive build loop.
- **Purpose:** start **E4** with zero re-derivation. Read this + the master handoff §12 + the lane, and go.
- **Master spec (authoritative):** `docs/ai-workflow/AI-HANDOFF/OPUS-48-HERMES-OS-BUILD-HANDOFF-2026-07-04.md` — §11 is the loop contract, §6 the hostile-review gap map (G-1…G-17), §7 the E-slice plan, §12 the running build log. **This doc does not restate it; it carries the CURRENT state + the E4 build packet.**

---

## 0. TL;DR — re-enter in 3 minutes

1. **Ship state:** `origin/main @ d4c3b08d6`. **E1, E2, E3 SHIPPED + green.** `node --test scripts/hermes/*.test.mjs` → **73/73**.
2. **Loop authorization is STANDING** (§0.2 + §11 of the master handoff): auto-advance through unblocked E-slices/slices, tests-first, hostile-review each, ship each beat, pause only at the §11 HARD-PAUSE gates. Sean re-confirmed per-slice ("Next slice: E1", "continue"/"run the loop", "Next slice: E3").
3. **Next node = E4** (§4 below). It is the **largest remaining E-node** and its scope GREW: E2's adversarial review proved the self-contained log can't beat a write-capable attacker, so the **EXTERNAL / signed daily head-hash is now E4's job** (on top of hermes-doctor + digest integrity + actor partition).
4. **Work location:** isolated worktree `c:/tmp/ss-fable-runtime` (detached HEAD at origin/main). Do NOT commit from the shared checkout `<REPO>` (it is ~100+ behind and dirty with other sessions' WIP). Fetch + confirm even before committing; FF-push or rebase the single commit (see §5).
5. **Before ANY edit:** read `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md` (Rule 67), run `node scripts/coordination-prune.mjs`. Other Claude/Codex sessions run in parallel in other worktrees — my lane (`scripts/hermes/**` + the hermes docs) has had **zero overlap** with theirs so far, but re-check.

---

## 1. What shipped this session (E1 → E2 → E3)

| Slice | Commit(s) | Closes | One-line |
|---|---|---|---|
| Handoff | `f6c501f66` | — | The master build handoff itself (pushed first). |
| **E1** registry-as-data + drift lock | `389fbad85` (+ ledger `d360f852c`) | **G-1** | `registryLib.mjs` parses `command-effect-registry.md` §3 + `kill-switches.md` §4 → committed `registry.generated.json`; parser IS the validator; `queueModel`/`hermesRunsLib` read the data — zero hand-mirrored command constants. `registry-build.mjs --check` = semantic drift lock. |
| **E2** spine hardening | `0fc66e258` (+ ledger `3a67af6a7`) | **G-2/G-3/G-6** | `spineLib.mjs`: cross-process O_EXCL lock (dead-pid-only stale break, inode-safe release) → single-writer id+append; prev-hash chain + monotonic `.head` anchor; fsync/atomic-write/torn-tail repair. `verify-chain.mjs` (T0). **Adversarially reviewed in 2 rounds** (14 findings + 8 deeper reproduced-in-the-fix bugs) — all fixable ones fixed + test-locked. |
| **E3** flood caps | `482b4eece` (+ ledger `d4c3b08d6`) | **G-4** | `queueModel.createEntry` per-requester open-entry cap (seed 10, in the create lock, cap+1 refused w/ receipt); `receipt-digest` "Refusal clusters (flood/injection watch)" section. |

**E-board status:** G-1, G-2, G-3, G-4, G-6 CLOSED. Remaining: **G-5, G-7, G-9, G-10, G-15-partition (all E4)**; G-8/G-11 (E5); G-12/G-13/G-14/G-16 (E6); G-17 (Sean decision).

---

## 2. `scripts/hermes/` — the current runtime map (all ≤300L, tests beside each)

**Libraries (imported, not CLIs):**
- `registryLib.mjs` (207L) — E1. Registry parser/validator + `loadRegistry()` (reads `registry.generated.json`) + accessors `getQueueable/getForbidden/getT2Rows/getT2Standing/getSwitchInventory/getCommand`.
- `spineLib.mjs` (253L) — E2. `withLock` (opts `{timeoutMs, staleMs}`), `durableAppend`, `atomicWriteFileSync`, `hashLine`, `chainedAppend`, `verifyChain`, `GENESIS`. **The append primitives.**
- `hermesRunsLib.mjs` (223L) — the spine: lanes, switches (`seedSwitches`/`readSwitches`/`checkSwitches`, fail-closed), redaction, `validateReceipt`, `nextSequencedId`, `writeReceipt` (id+append under one lock), `appendJsonl`→`chainedAppend`, `readReceipts`, `vaultPaths`, `isoDateOf`. `SWITCH_SEED` derived from the registry.
- `queueModel.mjs` (298L) — approval-queue lifecycle (create/transition/sweep/auto-revoke), `QUEUEABLE`/`FORBIDDEN`/`T2_ROWS` derived from the registry, the E3 flood cap.

**CLIs:** `receipt-write.mjs` (init/write/list), `queue.mjs` (create/list/approve/deny/arm/execute/revoke), `switches.mjs` (status/flip), `receipt-digest.mjs`, `receipt-prune.mjs`, `verify-chain.mjs`, `registry-build.mjs`.

**Data + fixtures:** `registry.generated.json` (committed, **20 commands** / 5 denied / 9 switches), `fixtures/golden-digest-2026-07-01.md` (golden, **regenerate when the digest format changes — see §6**).

**Tests (73 total):** `cli`, `queue`, `switches`, `receipt-write`, `receipt-digest`, `receipt-prune`, `registry`, `spine`.

**Vault (NEVER in the repo):** `HERMES_VAULT_ROOT` (default `~/.hermes/vault`), `HERMES_SWITCHES_FILE` (default `~/.hermes/switches.json`). Tests use temp dirs.

---

## 3. Load-bearing invariants & gotchas (do not violate)

1. **The locked append path is the ONLY way to write a chained stream.** `writeReceipt` / `createEntry` allocate the id AND append under one `withLock`. Slice 2b (Telegram broker, Codex) and slice 5 (runner) MUST use these — never raw `appendJsonl` to a chained stream, or they fork the hash chain.
2. **`autocrlf` is ON in these worktrees** (git warns on every write). Any format-comparison logic must be CRLF/indent-agnostic — E1's `registry-build --check` uses a semantic JSON compare for exactly this reason. Don't byte-compare committed files.
3. **Rule 4 (≤300L) is tight here.** `queueModel` is at 298, `queueModel`/`spineLib` grew during E2/E3. Check `wc -l` before shipping; extract if a slice pushes a file over.
4. **Adding a command = doc edit + regen.** Add the row to `command-effect-registry.md` §3, run `node scripts/hermes/registry-build.mjs`, and bump the count assertion in `registry.test.mjs` (`reg.commands.length`). E4 adds `hermes-doctor` (T0) → **20→21 commands**; regen + bump.
5. **Changing the digest format = regenerate the golden fixture.** `receipt-digest.test.mjs` diffs against `fixtures/golden-digest-2026-07-01.md`. E4's digest integrity section + actor partition WILL change the output. Regenerate faithfully (a throwaway script mirroring `buildFixtureDay`, then `node --test scripts/hermes/receipt-digest.test.mjs` to verify — that test IS the correctness check). Sean still owes a 30-second golden-digest look; his review now covers E3's flood section and will cover E4's additions.
6. **`verify-chain` writes its receipt INTO the stream it verifies** — safe because the monotonic anchor prevents a truncation heal (proven live). Keep it that way, or if E4 changes it, re-verify the no-heal property.
7. **Redaction runs at write on every receipt field.** Never put raw secrets/PII in receipts; use IDs (Rule 8). The flood-cap receipt double-redacts the requester.
8. **Pre-commit hook runs a staged secret scan** — it has reported CLEAN every commit. Still stage explicit paths (Rule 67 R6), never `git add -A`.

---

## 4. E4 — THE BUILD PACKET (next node)

**Closes G-5, G-7, G-9, G-10, G-15-partition + the E2-deferred external anchor.** This is bigger than E1/E2/E3 and touches security (the signed anchor) — **give it E2-level adversarial rigor** (see §7).

### 4a. `hermes-doctor` (T0 command) — closes G-5
Self-diagnosis command; the slice-3 health-panel data source and the slice-5 runner pre-flight. Checks:
- lanes exist + `index.md` law honored;
- switches file readable (report fail-closed posture, don't fail if off);
- receipt append+read roundtrip works;
- **chain intact** (call `verifyChain` on the day's receipt + queue streams; surface breaks AND warns);
- clock sane (see G-10);
- schedule readable.
**Exit codes are the panel contract** (0 healthy, nonzero per fault class). Register it (`command-effect-registry.md` §3, T0, kill-switch `none` like `verify-chain`/`switch-status` — an integrity/health tool must run during incidents), regen `registry.generated.json` (20→21), bump `registry.test.mjs`.

### 4b. Digest integrity class — closes G-7 + G-9
`receipt-digest` gains an **integrity attention section**: unparseable (`__unparseable`) lines, tier-less/junk receipts (`tierOf` currently defaults junk → T0 — surface it, don't hide it), chain breaks (from `verify-chain`), and **armed T4 entries > 24h with no filed receipt** (G-9 — an armed-but-never-filed entry is exactly the receipt gap the doctrine forbids; headline it). Regenerate the golden.

### 4c. Clock integrity — closes G-10 (verify exploitability with a PROBE first — it's `[HYPOTHESIS]`)
Expiry sweeps, the 10-min T4 arm fuse, and future runner schedules trust wall-clock. `hermes-doctor` records last-seen-time; a backwards regression → attention item + **refuse arm operations until acknowledged**. **Before building more than the sanity check, run a probe** (the window math is UTC-parse based) — Rule 55.

### 4d. Actor partition — closes G-15-partition
Receipts carry `who`; the digest doesn't partition by actor yet. Add a by-actor breakdown (cheap now, painful later — the per-trainer weekly review, Q7, will want it). Regenerate the golden.

### 4e. ⭐ EXTERNAL / signed daily head-hash — the E2-PROMOTED piece (closes the E2-deferred residual)
**Why it's here:** E2's focused verifiers *empirically* showed a self-contained `.head` anchor cannot beat an attacker with vault write access — a single correctly-prev-chained forged append gets re-anchored clean by the next legit write, and deleting the `.head` + truncating passes. Beating that needs an anchor the ordinary writer can't forge or reset. **Design decisions for you to weigh (interview Sean if needed):**
- **Option A — HMAC:** sign each daily head `{stream, date, count, head}` with a key from an **env var (NOT in the vault)**. `hermes-doctor` verifies the signature; a forger without the key can't produce a valid daily anchor. Key management is the cost.
- **Option B — separate append-only signed ledger** the doctor writes daily (a monotonic record of each stream's `(count, head)`), ideally destined for **off-box sync** later. Deleting/rewinding it is itself detectable via its own chain.
- **Option C — both.** 
**Acceptance:** an induced forgery (append 1 correctly-chained forged line, then a legit append) and a `.head` deletion+truncation are BOTH caught by `hermes-doctor` against the external anchor — the exact scenarios the E2 verifiers reproduced. **Write regression tests for those two scenarios** (they are the whole point).

### 4f. Overall E4 acceptance (from §7 + this session's additions)
- Each induced fault (unparseable line, tier-less receipt, chain break, armed>24h, clock regression, forged append, `.head` deletion) appears as a `hermes-doctor` / digest attention line.
- `hermes-doctor` exit codes are the panel contract.
- Golden regenerated + verified; registry regenerated (21 commands) + count test bumped; all files ≤300L; drift `--check` in sync; secret scan CLEAN; backend untouched.

---

## 5. Re-entry procedure (exact)

```bash
# 1. Confirm state
cd c:/tmp/ss-fable-runtime         # isolated worktree, detached HEAD @ origin/main
git fetch origin main
git rev-parse HEAD origin/main     # should match d4c3b08d6 (or newer if Codex pushed)
node --test scripts/hermes/*.test.mjs   # expect 73/73 (GLOB form; bare-dir misbehaves on Windows)

# 2. Rule 67 coordination (from the shared checkout where the gitignored lane files live)
cd <REPO>
# read .ai-workflow/coordination/claude.lane.md + codex.lane.md + review-queue.md
node scripts/coordination-prune.mjs

# 3. Build E4 in the worktree, tests-first. Ship each beat:
cd c:/tmp/ss-fable-runtime
git ls-files --others --exclude-standard backend/   # Rule 42 (expect empty — hermes isn't backend)
git diff --name-only HEAD backend/                  # Rule 42 (expect empty)
node scripts/hermes/registry-build.mjs --check      # drift lock in sync
git add <explicit paths>                            # Rule 67 R6 — never git add -A
git commit ...                                       # pre-commit hook secret-scans staged blobs
git fetch origin main && git rebase origin/main      # if origin moved (it does — Codex/other sessions push)
git push origin HEAD:main                            # FF
```
**Commit trailer:** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Push only with the loop's standing authorization (this workstream is covered; reconfirm if unsure).

---

## 6. After each E4 beat (loop discipline)
1. Rule-61 hostile self-review (attack it, fix, test-lock) BEFORE reporting.
2. For the signed-anchor (security) work, run **adversarial verification** like E2 did (§7).
3. Update the master handoff §12 build log (new commit) + `claude.lane.md` (E4 shipped, release lock) + prepend a Codex REQ to `review-queue.md`.
4. Rule-57 dual-tier summary to Sean; Rule-60 next-slice line.
5. GOTO the next unblocked node (E5 after E4). Don't stop between beats; pause only at §11 HARD-PAUSE gates or context exhaustion (checkpoint like this doc).

---

## 7. The adversarial-review playbook (what E2 taught — reuse for E4's signed anchor)
E2 self-tested green (69/69) but a **5-lens Workflow** (concurrency/durability/tamper/regression/doctrine) surfaced **14 real findings**, and **2 focused verifiers** then *empirically reproduced* deeper bugs in the FIRST fixes (a double-acquire, a truncation-heal, a forged-append-passes-green). Lesson: **for security-critical slices, green tests are necessary but not sufficient — fan out independent skeptics who READ the code and try to break it with a named interleaving/scenario, then re-verify the fixes.** The signed-anchor (4e) is exactly this class. Use the `Workflow` tool (ultracode is on) with a structured findings schema; then spawn 1-2 focused verifiers on the subtlest fix. Fix every fixable finding + test-lock; honestly scope any residual and defer it explicitly.

---

## 8. Open gates (unchanged, human/Codex-side)
- **Codex hostile reviews** — E1, E2, E3 REQs all OPEN in `review-queue.md`. Fold verdicts when they land; a REVISE/REJECT on shipped work preempts new nodes (§11).
- **Sean golden-digest 30-sec look** — `scripts/hermes/fixtures/golden-digest-2026-07-01.md` (now includes E3's flood section; will include E4's integrity/actor sections).
- **Slice 2b** (Telegram broker hardening) = **Codex's build lane** — loop never takes it over; hostile-review it when flagged. Its registry lookup should call `registryLib` accessors (E1), and it MUST write via `writeReceipt`/`createEntry` (E2 locked path).
- **Sean-only:** Q2 Discord template texts (unblocks slice 4), the live phone test (closes 2b), slice-6 hardware pick, G-17 RESUME-second-factor decision, the 2 proposed T2 rows (`receipt-prune`, `vault-init`).

---

## 9. Paste-ready next-session prompt (Sean → next agent)
> Read `docs/ai-workflow/AI-HANDOFF/HERMES-E-SLICE-LOOP-CONTINUATION-2026-07-05.md` end to end, then the master handoff §11/§12. Confirm `origin/main` and 73/73 tests in the `c:/tmp/ss-fable-runtime` worktree, read the Rule-67 lanes, then run the §11 recursive loop starting at **E4** (the build packet is §4 of the continuation doc). Standing authorization per §11: tests-first, adversarial hostile review (E2-level rigor for the signed-anchor security work), ship each beat by FF-push, update §12 + lane + a Codex REQ, then continue to E5. Pause only at the HARD-PAUSE gates and tell me exactly what you need when you park one.
