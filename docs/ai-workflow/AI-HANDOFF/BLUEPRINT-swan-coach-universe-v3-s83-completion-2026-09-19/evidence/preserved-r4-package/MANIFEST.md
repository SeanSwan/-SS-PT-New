# MANIFEST — BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19

**Subject:** Swan Coach Universe V3 / S83 completion (SS-PT)
**Status:** **FORGED — CONDITIONAL. IMPLEMENTATION ENTRY BLOCKED AT `03-contracts.md` §C0.**
**Builder target:** a fresh AI with **zero repo context**
**Produced:** 2026-09-19

---

## What this package is

One Astra **Mega Blueprint** call produced two things at once:

1. a **hostile review** of the existing S83 blueprints (20 A1 findings), and
2. a **forged build package** for the remaining work (9 documents + a decision-density self-test).

The reviewer then attacked **its own draft** in one further pass and applied 10 corrections to the
emitted package (A2-01…A2-10). Both passes are in `HOSTILE-REVIEW.md`.

**Read `VERIFICATION-NOTES.md` first.** Every finding was adjudicated against the real source before
being written down; **5 of 20 remain UNVERIFIED and are not instructions.**

---

## Documents

| File | Lines | Fenced blocks | What it is |
|---|---|---|---|
| **`VERIFICATION-NOTES.md`** | — | — | **READ FIRST.** Run provenance, the failed first dispatch and its fix, and the per-finding adjudication with `file:line` evidence. |
| `00-README.md` | 89 | 2 | Status, builder contract, the C0 gate. |
| `01-architecture.md` | 351 ⚠ | 28 | System/flows/state/sequence/ERD. **Over the ~300-line budget — split before use.** |
| `02-wireframes.md` | 257 | 14 | ASCII wireframes, exact copy and token contracts. |
| `03-contracts.md` | 279 | 12 | **§C0 is the gate.** HTTP, memory, model, PostgreSQL and migration contracts. |
| `04-build-order.md` | 66 | 2 | File-by-file order and budget rule. |
| `05-slices.md` | 139 | 0 | Slices C0→C6 with acceptance criteria. |
| `06-bans.md` | 84 | 0 | The "do NOT" list for a context-free builder. |
| `07-checkpoints.md` | 85 | 2 | Checkpoint protocol and reviewer remit. |
| `08-decision-density-self-test.md` | 53 | 0 | PART C — every remaining builder choice, decided or bounded. |
| `09-tests.md` | 218 | 34 | Named tests, commands, exact catalog assertions. |
| `HOSTILE-REVIEW.md` | 57 | 0 | PART A verbatim — A1 (20 findings) + A2 (10 self-corrections). |
| `ASTRA-REPLY.md` | 1706 | — | The raw reply, unmodified. |
| `ASTRA-REPLY.meta.json` | — | — | Transport, tokens, wall, `servedModel: null`. |
| `CONSULT-PACKET.md` | 3945 | — | The full evidence base sent, incl. verbatim source excerpts. |
| `CONSULT-PACKET-PREAMBLE.md` | — | — | The commission: remit, state synthesis, stale-claim traps, house rules. |

**Build order:** per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each
slice produce the diff + acceptance-criteria evidence and **WAIT** for the checkpoint verdict.

---

## Provenance

| | |
|---|---|
| Transport | `codex-cli` · `chatgpt-subscription` · **$0 marginal** |
| Requested model | `gpt-6-astra` |
| **Served model** | **`null` — IDENTITY UNVERIFIED** |
| Tokens | in 102,109 · out 21,167 · wall 648.5 s |
| Packet | 286,479 chars · SHA-256 `950379fea604f2c8b60c3aee68064b2883578f7eb3641004e5947d048d302e87` |
| Arming | `megaBlueprint=true` (remit + document); dry-run proved both hostile passes were in the prompt before spending |
| Splitter | `split-astra-blueprint.mjs --mega-blueprint`, exit 0, fence-aware, **negative-tested against 3 decoys (all correctly rejected, exit 1)** |

### The first dispatch failed — and the fix is reusable

Dispatch 1 returned **741 tokens and did no work**: it refused because it could not find the
`fable-blueprint-forge` skill. It was right — the call was rooted at a **git worktree**, and
`.claude/skills/` is untracked so a worktree never has it. Fixes: the SKILL.md is now **inlined**
(SECTION 11), the read-only sandbox is declared expected, and repo exploration is **banned**.

| Run | Input | Output |
|---|---|---|
| One-line probe (transport floor) | 35,409 | 8 |
| Dispatch 1 — exploration allowed | **417,085** | **741** (refused) |
| Dispatch 2 — exploration banned | **102,109** | **21,167** (full package) |

**A quarter of the input, 28× the output**, from one instruction.

---

## Adjudication tally

**13 CONFIRMED · 2 PARTIALLY CONFIRMED · 5 UNVERIFIED · 0 REFUTED.**

Two confirmed findings were **not on the commissioning session's radar at all**:

- **A1-05 (critical):** every repair in this workstream edited a **historical** migration. On a
  database where that migration is already recorded as applied it **never re-runs**, so the repaired
  columns and FKs are **not delivered to existing installations**. A clean fresh-chain run proves the
  repository is self-consistent and proves *nothing* about the upgrade path. **A forward migration is
  required.**
- **A1-09:** `backend/tests/helpers/coachTestDatabase.mjs:5,7` reads **`SWAN_COACH_TEST_PORT` only**
  and **throws** without it (hardcoding `coach_test_20260906` / `coach_test_admin`). Docs 84/85 name
  port **55441**, not the 55433 supplied. **This is the actual reason the Postgres app suites stayed
  blocked** — `PG_*` is never read.

---

## Fixes applied to the source documents as a result of this review

Each is a confirmed finding, fixed rather than merely recorded:

| Finding | Fix |
|---|---|
| A1-01 | `swan-coach-universe-v3/README.md:6` — the stale banner is struck through and marked **SUPERSEDED**, with the executed result recorded. It had contradicted the README's own REVISION 2 block. |
| A1-04 | `88-…-HANDOFF-20260917.md` line 124 — "Invisible to every static check" replaced with the accurate statement: no static check was looking for it, and PART 11 added one afterwards. |
| A1-08 | `88-…-HANDOFF-20260917.md` §11.6 — the arithmetic error corrected in place (`36` → `35`, since 26 + 9 = 35) and left visible with the reason. |
| A1-15 | `README.md` — guard cohort corrected from `13/13` to **`19/19`**, and **proven by execution**: `migrationGuardTableNames` 7 + `migrationFkTypeCompat` 6 + `modelTableGuard` 6 = 19, all passing. |

**Not fixed here, deliberately:** A1-05 (needs a new forward migration — a real slice, not an edit),
A1-06/A1-07 (need disposable-fixture tests before any change), A1-11/A1-12 (hypotheses requiring a
real-router harness), and the five UNVERIFIED findings.

---

## Harness defect found while producing this package

`scripts/split-astra-blueprint.mjs` hardcodes the **manifest title and packet path** to the
`BLUEPRINT-social-bridge-completion-2026-09-19` package. Every other package therefore gets a
manifest that names the wrong subject and points at the wrong packet. The document table it emits is
correct; only the header and the `Packet:` line are wrong. **Not fixed here** — it is a shared
script and this session did not own that lane.

---

## Boundaries

- **Nothing was committed or pushed. `main` is untouched.** Render auto-deploys from `main`.
- **No production or live system was contacted.** The reviewer ran no commands; the adjudicator's
  checks were local reads plus one local test run.
- The reviewer had **no repository access**; its findings are conditional on the packet. The 5
  UNVERIFIED items are hypotheses, not scheduled work.
