---
name: an-instrument-that-did-not-run-reports-clean
date: 2026-08-25
originating_model: claude-opus-5
tier: fable
surface: frontend/src/components/UniversalMasterSchedule
commit: 896e20c5d
models_used:
  - model: claude-opus-5
    role: audit, builder, hostile reviewer
    did: price-path audit; found and fixed the fail-open pricing placeholder; ran three hostile rounds; corrected its own severity claim
    cost: subscription (no metered spend)
skills_touched:
  - id: rule-51 (confidence tags)
    change: reinforced
    failure: an [UNVERIFIED] end-to-end money claim was delivered as though traced
  - id: instrument-check
    change: reinforced
    failure: three separate instruments reported clean while having not run
  - id: rule-4 (300-line cap)
    change: reinforced
    failure: a one-line addition pushed a file from 298 to 301 unnoticed until an explicit check
---

# An instrument that did not run reports clean

## The lesson

A truncated grep, an unsupported flag, and a crashed type-checker all produce
output that is indistinguishable from a clean result if you read only the last
line. All three happened in one session, on one task.

- A background grep was `head -60` capped. Its 63 lines came entirely from
  `.ai-workflow/` and `.claude/`, which sort before `backend/` and `frontend/`.
  It never reached code. Filtering it for non-doc hits returned nothing, which
  reads exactly like "no price literals in the codebase."
- `grep -P '[^\x00-\x7F]' file || echo "none"` printed `none` because `-P` was
  unsupported on this system, not because the file was ASCII. It was not.
- `tsc --noEmit` exited 134 (SIGABRT, JS heap exhaustion) and the error grep
  returned 0. Zero errors because it aborted, not because it passed.

The check is always the same and it is cheap: **before believing a negative or a
green, confirm the instrument ran over the thing you think it covered.** Which
directories appear in the output. Whether the flag is supported. What the exit
code was. Whether the config excludes what you are asking about - `tsconfig.json`
here excludes `**/*.test.tsx`, so "tsc clean" said nothing at all about the test
files whose types I had just changed.

## The second lesson

A placeholder presented with the authority of real data is worse than a blank.
`useSessionPackagePricing` returned `175` / `88` on a failed fetch, and the type
`defaultFullCharge: number` made "unknown" unrepresentable, so no consumer could
tell. The UI then rendered "$175.00" under the caption "based on client's
package" - the caption asserting exactly the provenance the value did not have.

The fix that survives is a flag that is **true by construction** and cleared only
on success, so every future code path is fail-closed by default rather than
fail-closed by remembering. The same codebase already had the right pattern one
folder away (`CancelledSessionCard` disables its charge button and shows "Pricing
unavailable"), which is the cheapest possible fix to find: the answer was already
in the repo, in a sibling of the broken file.

## Who did what

**claude-opus-5** did all of it: the price-path audit, the fix, and the hostile
review. It was also wrong twice in ways worth recording. It asserted an
end-to-end overcharge ("$175 charged to a $110 client") after tracing only the
frontend, and delivered that claim to Sean before reading `sessionRoutes.mjs`,
where `case 'full': actualChargeAmount = sessionRate` proves the server ignores
the client-sent amount. The correct claim was narrower: a lie on the decision
surface, plus a real overcharge vector on the `late_fee` path only. It found its
own error in hostile round one, which is the system working, but the wrong
version had already shipped to the user.

No external or paid model was consulted.

## Skills created or changed

No new skill. Three existing gates proved their worth and none of them were the
model remembering:

- The **exit-status gate** blocked `cmd | tail; echo $?` before it ran.
- The **heredoc-escape gate** blocked a `node -e` containing backticks that the
  shell would have rewritten.
- The **lane-staged guard** blocked a commit of 7 files that had grown outside
  the lane claim.

Each of these is a case where prose would have failed and a hook did not. That is
the argument for hooks over documentation, restated with fresh evidence.

## Mistakes I made

- Asserted an end-to-end money impact from a frontend-only trace. The server was
  authoritative and made the claim wrong. Caught in my own hostile round, after
  delivery.
- Read a `head`-truncated grep as repo-wide coverage.
- Accepted `|| echo "none"` output from a `grep -P` that had errored out.
- Read `tsc` exit 134 with zero matched errors as a clean typecheck.
- Did not check `tsconfig.json` excludes before saying what tsc covered; test
  files were never typechecked at all.
- Lost a `$` through heredoc/JS quoting layers, rendering `175.00`. Caught only
  because I had written a guard test for the unchanged case.
- Put `&apos;` inside a JS string literal, where it renders as literal text.
- Took a file from 298 to 301 lines, past the Rule 4 cap.
- Claimed 3 files in the lane, edited 10.

## Error -> fix -> repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Believing an instrument that did not run | 3 | Yes - `instrument-check` skill and a prior memory exist | Nothing procedural yet. All three were caught by ad-hoc curiosity, not by a step. This is the gap. |
| Claiming impact beyond the traced path | 1 | Yes - Rule 51 / Rule 28 | The hostile round caught it, but only after delivery |
| Shell rewriting file content | 2 | Yes - 123 corpus incidents | The heredoc gate caught one; the other ($ loss) got through because it was inside an already-quoted heredoc and the gate does not model that layer |
| Staging beyond the lane claim | 1 | Yes - three times in 24h per the guard's own text | The lane-staged guard. Deterministic, worked |

The instrument row is the one that matters. It has been documented, a skill
exists for it, and it still happened three times in a single session. The
write-up was not the fix. What would actually work is procedural: a required
one-line coverage statement attached to any absence or green claim - which
directories the search reached, which exit code, what the config excludes -
rather than an instruction to be careful.

## External-model calibration

None consulted. Free-triangle and paid Village were both skipped: the fix
mirrored an existing in-repo pattern and the blast radius was six files in one
directory, which is below the bar where a panel adds more than it costs. Recorded
so the routing table has the negative case too - not every money-path change
needs a panel, and the discriminator is whether the correct pattern already
exists in the repo.
