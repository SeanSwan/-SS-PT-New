---
decision: Rounds 17-38 of the SwanStudios hostile-review loop — 22 rounds, 20 productive, both test suites taken from 27 failing tests to zero; six items escalated to Sean rather than fixed
status: shipped
supersedes: none
---

# Hostile-review rounds 17–38 — closeout

**Written:** 2026-07-29 · **By:** vs-claude (Opus 5)
**Branch:** `claude/hostile-40-20260729` off `origin/main@c517e9202`
**Linear:** SWA-75 (parent) · SWA-62 · SWA-87
**Predecessor prompt:** `HOSTILE-REVIEW-CONTINUATION-PROMPT-2026-07-29.md` (rounds 1–9; amended with rounds 10–16)

---

## The one-line result

**Both test suites went from 27 failing tests to zero.** Backend 23 → 0 (7,681 passing). Frontend 4 failing files / 3 tests → 0 (6,779 passing, 1,453/1,453 files). **No assertion was deleted or weakened to get there** — several were strengthened, and every repaired guard was mutation-proven to still fail on a real violation.

---

## Round ledger

Rounds 1–16 were burned by predecessors. I ran 17–38: **22 rounds, 20 productive, 2 clean.** I did **not** reach two consecutive clean rounds, so this is **not dry** — see "Why this is not dry" below.

| R | Vantage (new each round) | Found |
| -- | -- | -- |
| 17 | 🔬 **Executed** the real credits endpoints via supertest | §A money hole proven: independents paid 65% where 85% owed |
| 18 | Doc-vs-code truth on the money math itself | Every rate in the calculator header wrong; `'hired'` a phantom enum value |
| 19 | Enumerate the destructive-route guard boundary | 6 unattributable catalog mutations; **2 inherited claims refuted** |
| 20 | 🔬 Live `information_schema` | §C landed: 3 models could not read *or* write; 3 stale test artifacts |
| 21 | Pristine-baseline diff at my exact base commit | Attribution proof: failing set byte-identical, **zero regressions** |
| 22 | Repo-wide model health + write-path audit | `BROKEN COLUMN: 0`; write audit exit 0 |
| 23 | 🔬 User-facing copy sweep | 3 false "team has been notified" + **a test pinning the lie**; no-show notice dropped in quiet hours |
| 24 | Triage the *dismissed* baseline | A mount-order guard defeated by a comment quoting the code |
| 25 | Same vein, worked to exhaustion | 4 more dead route guards (2 comment-trapped, 2 pinning corrected prose) |
| 26 | The redaction suites | **23 assertions passing on `''`**; `setup.mjs` mocks the logger to a no-op spy |
| 27 | Last 3 baseline files | **The AI eval harness was collecting ZERO tests** |
| 28 | Do `setup.mjs`'s global mocks actually apply? | The email mock pointed at a file that does not exist |
| 29 | Comments that contradict the code | `_ARCHIVED` lie + 4 lines that boot-crash Render if uncommented |
| 30 | The frontend (untouched by 17–29) | Corrupt onboarding draft never evicted; dead hook reported |
| 31 | Rate-limiter store + keying | Unbounded `Map`, **no delete path anywhere** |
| 32 | Catalog freshness (Rule 72) | 56/539 rows stale; root cause is missing frontmatter |
| 33 | 🔬 Run the frontend suite | 4 dead guards, one collecting **0 tests**; **one break was mine** |
| 34 | Sweep both suites for "collects 0 tests" | **CLEAN** — only the one already fixed |
| 35 | Skipped / unreachable tests | `tests/integration/aiFeatures.test.mjs` runnable by **no** command, and stale |
| 36 | Re-attack round 33's own fix | **My fix was wrong.** Two guards were mutually unsatisfiable |
| 37 | 🔬 Audit my own output — resolve every citation | 3 of 19 file:line refs stale, **invalidated by my own commit** |
| 38 | Re-derive the counts *I* asserted | "~20 limiters across 14 files" → **23 across 10** |

🔬 = execution/live-data/real-caller-path. As in rounds 1–9, these produced the findings; reading produced the false leads.

---

## The dominant pattern: green tests that assert nothing

Nine of the fixes are one defect class — **a guard that cannot fail.** Worth naming because it recurred in five independent forms:

1. **Comment quoting code** defeats a source-`indexOf` check. Four instances: `supportIssueSchemaContract`, two session-boundary tests, the frontend Rule-9 language guard. Plus **my own sink walker**, which flagged a file because the comment I had just written *mentioned* `registerErrorSink()`.
2. **Capture at the wrong layer.** Patching `process.stdout.write` captures exactly **0 bytes** under vitest — measured with a probe. Every negative redaction assertion passed on `''`.
3. **A global mock nobody imports.** `vi.mock('<nonexistent path>')` is silently inert; `vi.mock('../utils/logger.mjs')` in `setup.mjs` turned the "2,841-call-site logger does not leak" suite into assertions against a `vi.fn()` stub.
4. **Throw at collection time** → the file reports "0 test" and every assertion in it stops existing. The AI eval harness (54 tests) and the image sibling sweep (59 tests) were both dead this way.
5. **Two guards that contradict each other**, so one is permanently red and neither invariant is really enforced.

**The reusable lesson:** a red test is a hypothesis about the CODE. Check which one is wrong before believing it — and a *green* test in these five shapes proves nothing at all. Every guard repaired here was mutation-proven: break the thing it guards, confirm it goes red, restore.

---

## What was fixed (all mutation-proven, all with current-session evidence)

| Commit | What |
| -- | -- |
| `7edd87e71` | §A money: independents paid 65% where 85% owed; calculator header rates all wrong; phantom `'hired'` |
| `8a7e60c8f` | 6 revenue-catalog mutations had no actor id |
| `9a716276d` | §C schema (SWA-87): 3 models could not read or write; 3 stale test artifacts |
| `90bd0c271` | "our team has been notified" false in 3 places; a test pinned it |
| `de9fe5ff5` | No-show notice silently dropped in quiet hours (copy) |
| `728efa999` | Mount-order guard defeated by a comment |
| `f3ea342d3` | 4 more dead route guards |
| `0a127d831` | 3 PII-redaction suites blind — 23 vacuous assertions |
| `35f87f679` | AI eval harness collecting **zero** tests |
| `1a898d671` | Dead global email mock + `_ARCHIVED` comment lie + boot-crash lines |
| `3b7151f56` | Corrupt onboarding draft never evicted |
| `011d949b6` | Rate-limit store unbounded — no delete path |
| `ba137ada4` | 4 frontend dead guards (incl. one break of my own) |
| `d3bc1db89` | My own commit invalidated line numbers in my own comments |

---

## Escalated to Sean — deliberately NOT fixed

Filed as Linear comments on **SWA-62** (item 1) and **SWA-75** (items 2–6).

1. **Independent-trainer rate: 85% (code) vs 90% (your locked 2026-06-10 decision).** A payout-rate change is not an agent's call. Costs $0 to reconcile today — `trainer_commissions` is empty.
2. **Admin tiering on destructive catalog routes.** `ownerAdminOnly` **does not exist on `main`** — there is no owner tier here at all, so this is a design decision plus prod env config, not a missing guard.
3. **No error sink is registered**, so nothing actually notifies anyone of a 5xx. Needs a DSN only you can create.
4. **Should a no-show notice bypass quiet hours?** Mechanism exists; flipping it sends real email to clients during hours they asked to be left alone.
5. **`useOnboardingDraft` hook has zero consumers** — deletion candidate (Rule 34).
6. **56 handoff docs lack Rule-72 frontmatter**, so the catalog cannot self-maintain. Also: **`tests/integration/aiFeatures.test.mjs` is runnable by no command** in the repo and fails when forced (references "Master Prompt v26") — delete or repair.

---

## Inherited claims I refuted

Re-deriving beat trusting, again:

- **"`ownerAdminOnly` missing from the DELETE routes"** — the grep was right, the conclusion wrong: that middleware exists **nowhere on `main`**.
- **"Deleting a package destroys financial history"** — it does not. Both FKs are `ON DELETE SET NULL`, migration `20260711000001` tombstones the original ids into `order_items.metadata`, and OrderItem denormalises name/price/subtotal. Deliberately safe.
- **"The unlanded branch fix does not close §A"** — correct, and I confirmed why by execution: `{trainerType:'affiliated'}` is byte-identical to omitting the argument.
- **The fix pattern the prompt prescribed** (`TRAINER_TYPES` / `DEFAULT_TRAINER_TYPE` validation) describes a file state that **does not exist on `main`**. I matched `CommissionService.mjs`'s real house style instead (Rule 18: inspect a working in-repo example, not a remembered one).

---

## My own mistakes, and what they cost

Recorded because the next agent will make the same ones:

1. **I wired a "missing" feature that had been deliberately removed** (round 33 → reverted round 36). The red mount-contract test looked like a feature gap — "trainers can't change their dashboard background while clients and admins can". It was actually a stale assertion left behind by a deliberate de-dup (`c3bd5c563`, 2026-07-23). **Check the history of a contract before satisfying it.** `TrainerHomeTab.tsx` is byte-identical to `origin/main`.
2. **My sibling sweep was under-scoped** (Rule 54). I grepped the full sentence `"will be notified about the no-show"`; the test asserted `/client will be notified/i`. **When changing copy, grep substrings, not sentences.**
3. **My own commit invalidated my own line numbers.** Round 29 changed `core/routes.mjs` line counts, breaking coordinates I had written in rounds 24–25. A line number in a comment is a timestamp too.
4. **I asserted counts I had not derived precisely** — "~20 limiters across 14 route files"; truth is **23 instantiations across 10** files (15 import it). Derivation now recorded in the commit rather than the number alone.
5. **I projected a test count instead of measuring it** — round 26's message claimed "23 → 2"; the measured value was 3. Corrected in round 27's commit.
6. Two of my own guards caught my own bugs mid-round (the sink walker's comment false positive; a `<REDACTED-*>` regex that missed the underscore in `<REDACTED-STRIPE_WHSEC>`).

---

## Why this is NOT dry

**I did not reach two consecutive clean rounds.** Round 34 was clean; round 35 immediately found the unreachable integration test, and 36–38 each found something — including two defects of my own making.

Rounds 17–38 stayed productive because each round opened a genuinely new vantage, and the repo rewards that: **execution, live data, running the suite nobody ran, and attacking my own output.** The moment I re-attacked my own fixes (36–38) the yield went straight back up.

**Standing bar for whoever continues:** re-reading code is not a round. The unburned vantages with the best odds now:

- 🔬 **IDOR by execution** (vantage 9 — still unburned). The predecessor's *static* sweep produced ~100 false positives and found nothing; drive 10 high-value endpoints with user A's session against user B's resource id.
- 🔬 **Boot the backend and walk `app._router.stack`** for real (vantage 3). Every mount-order check in this repo is a *source-string* check, including the five I repaired — none has ever inspected the actual router stack.
- **Role-escalation matrix** across client/user/trainer/admin (vantage 10).
- **Soft-delete leakage** on `paranoid: true` models (vantage 13).
- **Responsive + keyboard matrix** on the onboarding surfaces (vantages 21–22) — needs a real authenticated browser; not doable headless here.
- **Attack this document**, exactly as I attacked my predecessor's. It was the richest vein both times.

---

## Verification evidence

- Backend `npm test`: **7,681 passed / 0 failed / 1,018 files** (baseline at `c517e9202`: 7,584 passed / **23 failed** / 11 failing files).
- Frontend `npx vitest run`: **6,779 passed / 0 failed / 1,453 files** (before: 6,718 passed / 3 failed / 4 failing files).
- Frontend `tsc --noEmit` exit 0 — needs `--max-old-space-size=8192`, it OOMs at the default.
- Frontend `npm run build` exit 0.
- `node --check` clean on every touched backend module.
- Rule 42 both commands clean before push.
- Secret scan clean on every commit (pre-commit hook + explicit runs).
- Live-DB probes read-only throughout; `DATABASE_URL` loaded via `node --env-file` and never echoed (Rule 59).

**Not proven here, disclosed rather than glossed:** no authenticated browser session was available, so the S6 mobile pass, the responsive matrix, and any real user journey remain unverified. Nothing in this closeout claims otherwise.
