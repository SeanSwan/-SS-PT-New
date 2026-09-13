# CONTINUATION STATUS — 2026-09-13 (c)

Supersedes (b). Canonical checkout:
`tmp/worktrees/rolodex-luna-01a098de-20260913`, branch `codex/rolodex-luna-01a098de`,
baseline `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`.

**Nothing committed, pushed, migrated or deployed. No production resource touched.**
Controller state `state-relocated.json` verified UNCHANGED throughout at
`93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26`.

---

## Verified evidence — all re-run after the last edit

| Suite | Result | Log |
|---|---|---|
| backend full (`npx vitest run`) | **1227 files / 10114 passed, 6 skipped — exit 0** | `hf28-backend.log` |
| real PostgreSQL (`vitest.integration.config.mjs`, `S06_INTEGRATION_READY=true`) | **5/5 — exit 0** | `hf28-integration.log` |
| frontend consumers | **261 files / 1581 passed — exit 0** | `hf27-frontend.log` |
| `tsc --noEmit` | **exit 0** | `hf27-tsc.log` |
| `git diff --check` | **clean** | round 36 |
| browser harness (Playwright `rolodex-repair.playwright.config.ts`) | **11/11 — exit 0** | round 11; harness files unchanged since |

**All of the above were re-run in round 36, not carried forward.** The backend figures had been
stale for ten rounds while being cited, so they were refreshed deliberately; the frontend figures
were re-run at the last frontend edit (round 35). The Playwright harness is the one exception —
it has not been re-run since round 11, but no file under `frontend/tests/audit/` or the harness
config has changed since, so the result still stands.

---

## What this stretch changed

**Findings closed and LOCKED** (each with a discriminating test):
BE‑F3 / BE‑F3b / BE‑F3c (value domains, the station allowlist, the intensity vocabulary),
occurrenceId-non-column, BE‑F7 (short-write demotion), BE‑F8a/b (log `templateId`, space
mass-assignment), R2‑1 (station `stationIndex` — a CRITICAL: every station-based save was a 400),
R2‑2/3/4/6/7/8, R2‑5 (restored the real-PG mid-write rollback proof), R2‑10, R2‑12, R3‑1, R3‑2,
R2‑9 (RETURNING order), S08‑6 (`weekId`/`slotId`), and frontend **F3, F4, F6, F7**.

**Reclassified, not fixed:** **F5** (`LIBRARY_COPY.refreshing` unreachable *by design* —
annotated in place).

**Two regressions I introduced and then caught:** a `spaceProfileId: ''` 400 (baseline treated
blank as absent), and `classFormat` label/config divergence. Both fixed and locked.

---

## OPEN — 10 findings

Full register: `FINAL-HOSTILE-REVIEW-20260913.md` §OPEN.

1. **`zero-rows` counted-not-observed** — an assertion that counts rather than observes.
2. **Sprint fallback-status inconsistency** — `sprintRoutes.mjs` create/update use
   `fallbackStatus = 400`, so a raw **server** fault is reported to the client as a 400. The
   message is correctly generic (nothing leaks); changing the status is a response-contract
   change affecting the frontend's error handling, which is why it was recorded not fixed.
3. **R3‑3** — `ai/commandRegistry/bootcampCommands.mjs`'s header claims the browser
   re-validates payloads against the builder's option sets. It does not:
   `useBootcampAiEvents.ts:102-103` only checks `typeof === 'string'`. The route guards the data
   path, so this is a UI-desync hole, not corruption — but the documented gate does not exist.
4. **Four S08 LOWs** — `generateSprintClasses` eager child load; `regenerateSlot` reuses the raw
   `slotId`; `sprintGeneratorOwnership.test.mjs` is a denial-only fixture; `sprintAccess.test.mjs`
   dead code.
5. **`WorkoutPlannerBlendDialog.tsx` 333 lines** — over cap, but **S01/S02 preserved prior work**.
   Deliberately NOT touched: splitting it means moving JSX/state/styles in another lane's
   surface. Open and attributed, not inherited.
6. **H01–H30 register slices** — NOT STARTED this session. Claim fencing, atomic memory union,
   durable SSE reconnect, taught-log idempotency (`confirmSlotUsed` is still non-idempotent **by
   design**), H20 progression/deload, H15–H18, H29 `ClassLog` migration.

---

## Method that worked (worth reusing)

Four consecutive frontend findings (F3, F4, F6, F7) fell to the same procedure:

1. **Read the mechanism** — find the exact line where the invariant breaks; do not guess from
   symptoms.
2. **Find an observable that needs nothing you cannot drive.** Synthetic `keyDown` never reached
   the handler; `aria-selected` (F7), toast presence (F6) and request counts (F4/F3) did.
3. **Borrow the proven harness.** Each component needed a different mount, and an existing test
   file always had it: `react-window` faking for the rolodex, `PlannerDataContext` providers for
   the V2 panel, a counted `ApiService.get` for the hook.
4. **Expect your own test to be wrong once.** It was, every time — an invented cross-instance
   cache contract (F4), `[a]→[a,b]` misread as a non-tap (F6), reading a row's whole
   `textContent` instead of its name element (F7). Each correction was the most informative part.

And the recurring class: **indirect or fixture-only coverage hides the bug.** F3 survived a green
suite because its proof used a fixture the hook could not emit; R2‑1 survived because every
fixture hand-supplied a field the real producer never emits.

**Cap collisions:** four times this stretch my own *comment* pushed a file over 300 lines
(`useExerciseSearch.ts` twice, `NASMExerciseRolodex.tsx`, `useExerciseSearch.test.tsx`). Trim
comments first when a fix trips the cap — the logic was never the cause.

---

## In flight when this was written

A fresh-context hostile review of F3/F4/F5/F6/F7 (subagent `4615d37c-b58b-4731-a7c6-7fdb4a7ea922`)
had not returned. **Treat those five as author-reviewed only until its findings land.**

## Fixture cleanup

Owned PostgreSQL fixture **still running**: PID 79488, port 55089, datadir
`tmp/rolodex-postgres-s06-20260913`, db `rolodex_s06_test`. Data preserved deliberately. Stop with
`pg_ctl stop -D <datadir> -m fast` when S06 closes.
