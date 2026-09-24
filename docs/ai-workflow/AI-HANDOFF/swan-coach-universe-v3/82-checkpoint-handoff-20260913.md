# Checkpoint handoff — Swan Coach Universe V3, 2026-09-13 (Astra seat)

**This is a CHECKPOINT, not a completion.** The workstream is unfinished. Everything
below is written so a fresh agent can take over without re-deriving anything, and so
Sean can see exactly what is saved and what is not.

## 0. Verify you are in the right place before trusting anything here

```bash
cd <repo>/tmp/worktrees/swan-coach-astra-owned-20260906
git log --oneline -1                 # expect d7b355c19 or later on this branch
git rev-parse --abbrev-ref HEAD      # expect codex/swan-coach-astra-owned-20260906
git rev-list --count 4345b86cf..HEAD # session commit count
git status --short                   # expect ONLY the four intentional exclusions (§9)
```

If any of that fails, stop and re-derive state from git rather than from this prose.
That instruction exists because an earlier handoff for this workstream was reported as
created and **did not exist**.

## 1. What this workstream is, and where it stands

Swan Coach Universe V3, the held slice queue in
[70 — release and worktree audit](70-release-and-worktree-audit.md). Root has been
implementing the queue, running hostile reviews, and correcting its own work.

**Status: every queue item is either committed with root-executed evidence, or recorded
as not-startable with a named reason.** Nothing is pushed to `main`; nothing is
deployed. The last state is **IMPLEMENTATION VERIFIED, NOT RELEASE READY**.

The dominant defect class this session found — hand-rolled `role === 'client'` versus
the DB-default `'user'` role — was found in **three independent passes** and is now
closed **by measurement**: two independently written detectors agree on 12 client-role
`authorize` lists with **0** lacking `'user'`, and a repo-level guard fails on
recurrence.

## 2. Where everything lives

### Committed, durable — the packet (read in this order)

All under `docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/`:

| Doc | What it is |
|---|---|
| [78](78-session-handoff-20260913.md) | **START HERE.** Read order, ledger, what is NOT proven |
| [77](77-open-findings-register.md) | **Read second.** The authoritative open set, incl. §D1 baseline reconciliation, §F G11 gates, §E INF-1…INF-5 hazards |
| [79](79-combined-adjudication-20260913.md) | The single-page verdict + §0 queue-coverage table (every slice → commit) |
| [81](81-external-hostile-review-glm-20260913.md) | **The external review record** — GLM 5.3 rounds 1–2, all findings, dispositions, root's own mistakes |
| [80](80-citation-drift-and-reanchoring-20260913.md) | Read before following any `file:line` citation in 70–79; many moved |
| [70](70-release-and-worktree-audit.md) | The held queue itself |
| 71–76 | Per-slice exits and corrections |
| [README](README.md) | Index (now covers 70–81) |

### Evidence — NOT committed (`tmp/` is gitignored, local to this machine)

- `tmp/astra-hostile-glm-20260913/` **(in the MAIN checkout, not the worktree)** — the
  external-review evidence: `glm53-r1.md`, `glm53-r2.md` (the full reviews),
  `*.receipt.json` (provider completion receipts: served model, tokens, wall, hashes),
  `packet-r1.md`/`packet-r2.md` + `.proof.json` (the sanitized packets and their proofs),
  `build-packet.mjs`, `build-packet2.mjs` (packet builders), `snatch-glm.ps1`,
  `wait-for-glm.ps1`, `stale-lock-recovery.json`.
- `tmp/coach-astra-hostile-20260912/` **(in the WORKTREE)** — 779 files of session
  evidence: `p64s66-isolated-run.ps1` (the isolated backend runner),
  `run-postgres-matrix-serial.ps1`, `run-migration-gate.ps1`,
  `find-test-db-port.mjs`, `verify-preload-boundary.mjs`,
  `default-role-pairing-sweep.mjs`, `doc-cite-staleness.mjs`, `cite-content-sweep.mjs`,
  plus the logs cited throughout the docs.

**Because `tmp/` is gitignored, none of that survives a re-clone.** The docs describe how
to rebuild each probe; the receipts are the proof of what was run and are NOT in Git.
If the reviews must be reproducible off this machine, move them into a committed path.

### Key implementation files (committed)

- `frontend/.../coach-assistant/hooks/coachSelectionContract.ts` — the pure contract:
  candidate parsing, receipt validation, binding policy, `observationKeyFor`,
  `failureTextFor`
- `.../hooks/useCoachSessionSelection.ts` + `…State.ts`, `…Admission.ts`, `…Commit.ts`
- `.../hooks/useCoachCommandCenterSelection.ts` — the C3 wiring
- `.../CoachCommandCenter.controller.ts` (299 lines — AT the cap, see §7),
  `…controllerEffects.ts`, `…Page.tsx`, `CoachSelectionDecision.tsx`
- `backend/services/coachFactPurgeCron.mjs` — G09-R1's new scheduler (default-OFF)
- `backend/tests/api/authorizeVerifyClientAccessPairingGuard.test.mjs` +
  `backend/tests/helpers/authorizePairingScan.mjs` — the repo-level role-pairing guard

## 3. Slice ledger — every queue item

| Queue item | Commit(s) | Verdict |
|---|---|---|
| M68 (+HR16) | `2cc843ad1`, `2aeb2783e` | CLOSED |
| HR12 / P58 | `19fba5c8a` | CLOSED |
| HR13 | — | **NOT STARTED — gated.** Needs an exclusive `useCoachCommand.ts` window; must follow C1–C4; plan 59 says "plan only, no implementation enqueue" |
| HR14 | `2d5aec4b3` | CLOSED |
| R60-A | `dce0da517` | CLOSED |
| C1 | `f343d3df4` | CLOSED (dormancy resolved by C3) |
| C4 | `b36f874d7` | CLOSED (dormancy resolved by C3) |
| C2 / C3 | `ec1e05dbd` | CLOSED on the **consumer** side; **producer side PARTIAL** (§5) |
| P64 / S66 | `adf5e74c5` | CLOSED |
| HR15 | `2fd272bf4` | CLOSED |
| clientAccess | `62d753514`, `474b3524c`, `1e376a013` | CLOSED by measurement |
| G07 | — | **NOT STARTED — needs a spec.** Both halves classified |
| G09 | `47012147e`, `02684666f` | routes CLOSED; **purge NARROWED** (scheduler exists, default-OFF); conflict writer + memory UI NOT STARTED |
| G10 | `c88fa7039`, `c6de0d021` | wiring + consent CLOSED; frontend consumer NOT STARTED |
| G11 | — | **2 gates executed**: disposable-Postgres 7/10 pass, migration gate FAILS |
| P77-B | `d05e9eaa0` | CLOSED |
| External review fixes | `398dc817b`, `639a95f64`, `984510296` | CLOSED |

Re-verify any row with `git merge-base --is-ancestor <sha> HEAD`.

## 4. The external hostile review (GLM 5.3) — what it found that root missed

Run through `scripts/consult-glm.mjs` on the **Z.ai subscription** (never OpenRouter —
`redact-egress.mjs` hard-refuses `z-ai/*` resale because the seat is already bought).

- **Round 1** (`astra-c3-glm-r1`, served `glm-5.3`, complete, 28 025 in / 36 820 out,
  578 s): 9 findings, SHIP-WITH-FIXES.
  - **F1, blocker-grade — the decision modal trapped the operator.** `busy =
    phase !== 'decision'` while the dialog renders whenever `pending` is non-null, and
    **none of the five failure paths clears `pending`**. One failed GET left both
    buttons disabled behind a backdrop with no click handler, no close button, and an
    Escape key that retried the same failing call. **The staff console was bricked until
    reload, with no exit for touch users.** Neither the author's pass nor root's found it.
  - **F7 supplied the mechanism** for a gap root had only recorded as "guard
    unreachable": `apply()` forged `actorKey`, making the commit guard's condition
    unsatisfiable by construction.
  - Also fixed: F2 (any unrelated URL param retired the live publication), F5 (an
    acceptance case that **could not fail**), F6, F8, F9.
- **Round 2** (`astra-c3-glm-r2`, complete, 24 450 in / 34 518 out, 458 s): verified all
  six fixes — *"real and close their findings — none merely moves a symptom"* — and
  raised 8 new findings.

## 5. OPEN — prioritized, with exact next actions

1. **N1 (MAJOR) — the commit ack is tautological.** `controllerEffects.ts:161-163` passes
   `apply`'s own return value as the "observed" tuple, so the strict match compares the
   ticket to itself and the mismatch branch is unreachable. A null echo also **strands
   the commit permanently**. Round 2 settled this *against* the design by elimination;
   root deliberately did **not** patch it (a wrong restructure leaves the publication
   permanently disabled — worse than the tautology) and instead corrected both headers
   that advertised a fence which cannot trip.
   **Next:** defer the ack to a settled live-tuple observation (store the consumed
   ticket, ack from a second effect watching the settled tuple) **with** a can-fail test
   that mutates the URL between apply and settle and asserts publication stays disabled.
2. **C3 producer side (PARTIAL).** `useCoachPinnedClient.ts:111-113` still calls
   `setActiveClient`/`clearActiveClient`/`chat.newChat()` directly, and
   `CoachCommandCenter.actions.ts:90,98,99` still clears logs and composer text before
   admission. Both untouched. Plan 63's created-thread adoption, Leave, blocked-return
   recovery UI and the real data-router blocker are unimplemented.
3. **Round-2 MINOR residuals:** N2 (mount-time double request — the route effect and the
   routed-thread effect both fire), N3 (a `busy`-refused route request is latched and
   never retried; silent and reload-only), N4 (a sibling effect keys on raw `searchKey`,
   so unrelated params re-clear the active thread), N7 (auto-select hydrates with no
   admission port — needs a trust-boundary decision).
4. **Fable 5.1 — one call, NOT YET MADE.** Sean authorized exactly one.
   `anthropic/claude-fable-5.1` is live at $10/M in, $50/M out; worst case ~$1.10.
   Use `scripts/consult-openrouter-panel.mjs --model anthropic/claude-fable-5.1`
   (`consult-fable.mjs` still defaults to the older `fable-5`). **Run it last**, on the
   consolidated state plus the GLM findings.
5. **GLM 5.3 Flash — never reviewed this slice.** Same transport, `--model glm-5.3-flash`.
6. **Round 3 of GLM** — and the packet must be fixed first (see §6).
7. **G11:** migration gate FAILS at the first migration (`orientations` created by no
   migration → the chain is not self-contained, so the DB cannot be rebuilt from the
   repo alone). Needs a decision: document a required baseline dump, or add a baseline
   migration. Provider eval / privacy / Redis / performance / real journeys still NOT RUN.
8. **G09-R1 operator decision:** the purge scheduler exists but is **default-OFF**, so
   forgotten rows are still not destroyed in production.
9. **Product decisions needed from Sean:** F3-PRODUCT (the default `user` role cannot use
   Coach conversations), G07's two halves, G09-R2's conflict behaviour, G10's UI, and
   N5-adjacent F4 reasoning (below).

## 6. Packet defects root made — fix these before round 3

1. **`git diff` does not include untracked files**, so the new gate test was missing from
   the round-2 packet and its 7-of-13 can-fail proof could not be verified.
2. **Only changed hunks were sent**, so the `apply` callback under adjudication was
   absent — **three rounds running** that the exact lines being ruled on were omitted.
   **Send whole files, including new ones.**

## 7. Hazards and environment traps (all bite silently)

- **`npx` is broken here** (`Cannot find module …npm\bin\npm-prefix.js`). `npm run
  migrate:test` silently does nothing. Invoke `node node_modules/...` directly.
- **Piping a command's output masks its exit code** (`| ForEach-Object` → 0). Root lost
  three exit codes to this. Read `$LASTEXITCODE` before piping, or redirect to a file.
- **The token registry blocks invented CSS tokens** on added lines. Root invented
  `--surface-sunken` and `--accent-warning` and was correctly blocked. The repo already
  carries **824** undefined token names; do not add more.
- **Rule 4 is enforced by a real test** (`CoachCommandCenter.sectionSplit.test.ts`).
  Root's own comment pushed `controller.ts` to 309 and was caught. **`controller.ts` is
  at 299 — extract before adding anything.**
- **The GLM seat is an exclusive lock** at `%LOCALAPPDATA%\SwanAI\glm-call.lock` with a
  15-round checkpoint. A **dead owner leaves it `unresolved` and bricks the seat with no
  in-repo recovery** (INF-5) — `approve-glm-batch.mjs` is blocked too. Recovery requires
  establishing dead-pid + age evidence and deleting the file **with owner approval**.
  Another agent (`tcc-hostile-*`) contends for this seat.
- **A flaky test** exists in the coach area under `--maxWorkers=2`
  (`CoachActionProposalCard.publication.test.tsx`): observed 1 failure in 3 identical
  runs; passes alone. Do not attribute it to your change without checking.
- **INF-1 recurrence:** the shared Vite dev server dies on `EBUSY` watching a
  same-directory `.<name>.<pid>.<uuid>.tmpdir/…tmp` inside the watched tree. Proposed fix
  recorded (`server.watch.ignored`), **not applied**. Vite on 4990 is DOWN.
- **The isolated backend runner** (`tmp/coach-astra-hostile-20260912/p64s66-isolated-run.ps1`)
  needs an **ABSOLUTE `-LogPath`** and paths relative to `backend/`.

## 8. How to reproduce the verification

```bash
# frontend suites (cwd frontend)
node node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant \
  src/hooks/coachPublicationScope.test.ts --maxWorkers=2 --retry=0
# type-check — the repo's own command; a bare tsc OOMs
node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --pretty false
# production build
node node_modules/vite/bin/vite.js build

# backend, isolated (absolute -LogPath; file paths relative to backend/)
<abs>/tmp/coach-astra-hostile-20260912/p64s66-isolated-run.ps1 -LogPath <ABS> tests/api/<file>
```

## 9. What is deliberately NOT committed (and why)

`git status` in the worktree shows exactly four items. **All are intentional:**

| Item | Why it stays out |
|---|---|
| `AGENTS.md` (modified) | Its inherited constitution-reference guard fails because `CLAUDE.md` cites a missing `scripts/hooks/dry-loop-gate.mjs`. A user override preserves it unstaged; repairing the canonical source is its own deliberate step |
| `frontend/.hermes/` | Private local configuration, deliberately not in public Git |
| `frontend/.m68-probe-{chromium,rollup}.mjs` | Stray probe artifacts from the M68 slice; cleanup-backlog candidates |

## 10. What is NOT proven — do not let a later summary imply otherwise

- **No browser or mounted run** was performed for C2/C3, and the real
  `/api/ai-chat/target-access` endpoint was never hit. Admission is validated against
  harness receipt shape only.
- **G11 is mostly NOT RUN**: no provider evaluation (would need spend), no privacy
  evaluation, no Redis/restart at integration, no performance budgets, no real
  authenticated role journeys. The disposable-Postgres gate passes 7 of 10, and **3
  cannot run under isolation** because they bypass `coachTestDatabase.mjs`.
- **The migration gate FAILS** — the schema cannot be rebuilt from the repo alone.
- **`purgeDueFacts` still never runs in production** (default-OFF switch).
- **Baseline:** no regressions; all 7 recorded failing files still fail; 5 unbaselined
  failures are pre-existing, 3 diagnosed as source-text assertions on
  `dailyWorkoutFormRoutes.mjs`, 2 unclassified. Do **not** grow the list.
- **Nothing is deployed.** Render deploys only from `main`; this is a feature branch.
