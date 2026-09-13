# CONTINUATION STATUS — 2026-09-13 (d)

Supersedes (c). Canonical checkout: `tmp/worktrees/rolodex-luna-01a098de-20260913`,
branch `codex/rolodex-luna-01a098de`, baseline `c0cbe538`.

**Nothing committed, pushed, migrated or deployed. No production resource touched.**
Controller state `state-relocated.json` unchanged throughout at
`93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26`.

---

## Evidence — all re-run in round 53

| Suite | Result | Log |
|---|---|---|
| backend full | **1228 files / 10131 passed, 6 skipped — exit 0** | `hf41-backend.log` |
| real PostgreSQL (`S06_INTEGRATION_READY=true`) | **5/5 — exit 0** | `hf38-integration.log` |
| frontend consumers | **261 files / 1591 passed — exit 0** | `hf41-frontend.log` |
| `tsc --noEmit` | **exit 0** | `hf35-tsc.log` |
| `git diff --check` | clean | round 53 |
| browser harness (Playwright, port 5317) | **11/11 — exit 0** | round 11; harness files unchanged since |

**`tsc` caveat, confirmed by a reviewer:** `frontend/tsconfig.json` **excludes
`**/*.test.ts(x)`**, so the type-check does **not** cover any test file. Do not cite it as
covering them.

---

## The single most important lesson from this stretch

**Nine consecutive fresh-context review rounds found something that a green suite called fine.**
Round 2 of the last pair found **two defects introduced BY the fixes for round 1**. The author's
self-verification on this codebase is demonstrably insufficient — not occasionally, but as a
pattern.

**Therefore:** write tests freely, but treat any *correctness claim* the author makes about their
own change as unverified until a fresh reviewer has seen it. Route each new slice through a review
gate rather than verifying it at the end. The most productive attack surface has been **comments and
test headers asserting more than the code does** — four false claims found across two rounds.

---

## H01–H30 register

| Slice | Status |
|---|---|
| A — claim fencing | **Phantom** — a proper compare-and-swap already existed; the first scope doc was wrong |
| B — atomic memory union | **Done** — `sprintSlotWrite.mjs`, one transaction, both call sites, 8 tests |
| C — taught-log idempotency | **Done for the COUNTER.** The durable taught-log record (H29 `ClassLog` migration) is **not** started |
| D — durable SSE reconnect | **Server half done** — `sprintStream.mjs`; **frontend half not started**, no harness proof |
| E — H20 progression/deload | **Not started. Read its criteria first** — do not infer them from the name |
| F — H09/H28 integration | Not started |

**Three of the four slices examined had a wrong premise in the first version of
`H01-H30-REMAINING-SCOPE.md`** (A, C, D). The rule that fixed it: **read the implementation before
writing a line about it, and expect the first description to be wrong.**

---

## Open items that are NOT findings-register entries

1. **A behaviour change that is Sean's call.** `NASMExerciseRolodex.list.tsx` wires the row's
   `onMouseEnter` to `handlePreview`, which sets the highlight **and** the preview. HEAD wired it to
   `setPreviewExercise` only. So a pointer sweep now establishes a commit target, and a later Enter
   in the search input commits the row under the cursor. Reverting is one line; it is a UX decision,
   not a correctness one, and it has already been changed twice.
2. **No integration test presses Enter on the rolodex.** The central F7 safety claim is pinned only
   indirectly. `listNavigation.test.tsx`'s header blames synthetic `keyDown` for not reaching the
   handler; a reviewer showed that is **not credible** (`fireEvent.keyDown` works elsewhere in this
   repo, and the input wires `onKeyDown` directly). Treat that header as unreliable.
3. **D's frontend half** and its browser-harness proof.
4. **Slice D's second `getSprintById` call** doubles the read on the fallback path; it is authorized
   and scoped to the request actor, but a reviewer should confirm it cannot convert a denial into a
   200 stream.

---

## Things a successor should NOT redo

- **Do not re-open the vacuous-assertion sweep** — 3357 source-text matches are a deliberate
  repo-wide convention, mostly `not.toContain` absence-locks. Recorded as scoped and closed.
- **Do not "fix" `LIBRARY_COPY.refreshing`** — it has no consumer *by design* (that state renders no
  notice). The annotation now says only that, which is true; an earlier version falsely called the
  state unreachable.
- **Do not treat `WorkoutPlannerBlendDialog.tsx` (333 lines) as yours** — it is S01/S02 preserved
  prior work, over cap, attributed to that lane.
- **Do not assume the controller can be migrated** — its override accepts only a
  `gpt-5.6-luna`@`xhigh` build actor, and migrating would reset S01/S02 from `tested` to `build`.

## Fixture cleanup

Owned PostgreSQL fixture **still running**: PID 79488, port 55089, datadir
`tmp/rolodex-postgres-s06-20260913`, db `rolodex_s06_test`, data preserved. Stop with
`pg_ctl stop -D <datadir> -m fast` when S06 closes. `pg_ctl start … -w` hangs under this harness —
start detached.
