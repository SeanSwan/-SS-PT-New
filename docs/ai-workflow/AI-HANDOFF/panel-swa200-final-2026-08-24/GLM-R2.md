# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-swa200-final-2026-08-24/PACKET-R2.md
**Tokens:** 8731 in / 21537 out (reasoning: 19311) | total 30268
**Wall:** 416.6s

---

Round 2 is not dry. Three findings are new and substantive; one of them (F1) is the same *class* of defect that killed round 1 — a step whose content is provably empty in 100% of runs, now with a header claiming it was fixed. The core machinery (STRICT exit-before-`markAsCompleted`, baseline/delta split, applied-count honesty gate) held up under attack. The periphery did not.

## F1 (HIGH — still vacuous): the guard `--check` runs while `backend/migrations` is still at BASE. It reports an empty pending set. Always.

Trace the working tree through the steps:

- Leg A (wf 193–208): `rm -rf backend/migrations backend/models; git checkout "$BASE" -- ...` → migrations dir = BASE set. Migrate records every BASE filename in SequelizeMeta.
- "Report the migration delta about to run against data" (wf 212–214): runs `pre-migrate-guard.mjs --check` **here**. Migrations dir is still BASE — leg B's `git checkout HEAD` is at wf 279–280, two steps later.
- Pending set = (files in dir) ∖ (rows in SequelizeMeta) = (BASE files) ∖ (BASE files) = **∅**, in every possible run, regardless of delta size.

The header claims (wf 44–45): "it now runs BETWEEN leg A and leg B, where the pending set is exactly the delta about to meet real data." False. Moving it between the legs fixed the *table-exists* precondition from round 1 but left the *directory* at BASE, so the content is still zero. Worse than round 1's version in one respect: the step name now says "delta," so a human reading logs sees an authoritative "0 pending" between legs while `DELTA_COUNT` says N — actively misleading rather than merely empty. Fix: checkout HEAD's migrations before the guard (or invoke it inside leg B between wf 280 and 284, where dir=HEAD and meta=BASE — the one state where pending = delta).

## F2 (HIGH — design broke by doctrine): required-check × paths-filter deadlock

The Summary states the gate's only real enforcement path (wf 372–373): "This only gates when it is a REQUIRED status check on PRs." A required status check that doesn't run because of a `paths:` filter sits as "Expected — Waiting for status report" **forever** and blocks merge. So the end-state is one of:

1. Not required → the gate is advisory; direct-push bypass (admitted) plus non-required PR bypass.
2. Required → every PR touching none of the 10 paths (wf 52–62) hangs.
3. Required **and** the workflow parses → fine. But the workflow has never parsed (301× `startup_failure`) — with a required check configured, *all* PRs would be blocked until the parse failure is fixed.

The round-1 "fix" (making push paths identical to PR paths) was correct for billing on push. But the doctrine codified at wf 69–72 — "If you edit one list, edit BOTH; they must stay identical" — forbids the correct end-state for PRs: **drop `paths:` from `pull_request` entirely and let the `DELTA_COUNT=0` N/A branch (wf 298–301) do its job.** You built that branch for exactly this and then wrote a comment forbidding its use.

## F3 (HIGH — the surviving "leg B passes without testing" path): aggregate seed assertion + per-model SKIP

This is the answer to your direct question, and it survives STRICT end-to-end:

- The seeder emits per-model OK/**SKIP**/note lines — the workflow's own comment admits the vocabulary (wf 244: "the bare prefix also matches OK/SKIP/note lines").
- The only assertion is on the **aggregate** report total (wf 263, `[ "$rows" -le 0 ]`). Nothing asserts that the tables the *delta migrations actually touch* are populated.

Mechanism: PR adds `ALTER TABLE X ADD COLUMN ... NOT NULL` where X is a model the seeder SKIPs (no generator). Leg B applies it to an **empty** table → succeeds → `applied=1` → green. Production: X has real rows → migration fails → non-strict safe-migrate marks it applied and lets `sync({alter})` paper over it. Gate green, prod broken. The Summary's admission (wf 370, "Synthetic rows are not production data") frames this as a *realism* limitation; it is a *coverage* limitation, which is different and partially fixable: assert per-model counts>0 in the SHADOW-SEED report, or at minimum echo per-model rows into the log/summary so an empty target table is visible at review time.

## F4 (MED): models-only PRs get a green check while mutating production schema

The paths filter includes `backend/models/**`, so models-only PRs trigger the run. For those: `DELTA_COUNT=0` → leg B N/A (fine, labeled) → but the *job name* (wf 93) asserts "Migrations run clean … the delta against data," and per safe-migrate's own comment, this repo's server mutates schema via `sync({ alter: true })` at boot. A models-only PR therefore changes production schema with zero gate coverage — the module-graph step (wf 308–336) catches import-time breakage only, by design. Either narrow the job name per-outcome or pull models out of the trigger set and say so.

## F5 (MED, conditional): seeder@HEAD × models@BASE is a combination that exists in no commit

The checkout juggling matrix: at seed time (wf 222–231) the seeder script is HEAD's (scripts are never reverted) but models are BASE's (wf 204–205). Any PR that co-changes seeder + models — e.g., adds a model, a migration, and seeds it — runs HEAD seeder code against BASE model definitions. If the seeder references models dynamically via the index, this silently under-seeds (benign); if it statically imports the new model file or reads a new attribute, it phantom-reds. Fail-closed either way, but it is a red caused by the split itself — the exact failure class your leg A comment (wf 199–203) says you fixed for the other direction. Unverifiable from the provided files (seeder source not included); classify and fix after one real run.

## F6 (LOW): path-filter scope holes

Parity between the lists is now verified, but scope isn't: `backend/config/**` and `.sequelizerc` (sequelize-cli resolution/config) are absent from both lists (wf 52–62, 73–83). A PR that changes how migrations connect or execute skips the gate entirely.

## F7 (LOW, hardening): `before` is echoed, never asserted

Leg A prints the baseline file count (wf 206) and leg B prints `before` (wf 283) — neither is asserted. `before` should equal the BASE migration file count. I only have the STRICT diff, not full safe-migrate source; if any path other than the two visible ones can complete without recording (a skip path), leg B's relative-count honesty gate (wf 287–297) is satisfied by BASE leftovers. One `[ "$before" -eq "$base_count" ]` closes the class.

## Context (not a code finding)

301× `startup_failure` means every fix above is paper-verified; F1 would have surfaced in one real run as "0 pending" next to `DELTA_COUNT>0`. Also wf 119's `DATABASE_URL` is a placeholder string — I assume redaction; if literal, the job reds at leg A (fail-closed, but instantly).

**Attacks that did not land** (checked, clean): STRICT exits before `markAsCompleted` (diff hunk order is correct); the `failed > 0` belt-and-suspenders exit; `DELTA_COUNT` over-inclusive (modified/deleted files) — fails *closed*, and renamed migrations faithfully re-run and strict-red on "already exists," which is what production would do; seed-step `|| status=$?` plumbing and non-integer shape guard (wf 252–266) are correct; delta-resolution zero-SHA/`cat-file` guard fails closed; `before`/`after` capture under `set -e`; artifact/summary `if: always()`; path-list identity verified line-by-line.

**Deferrals:** sequelize-cli-via-npx — agree it's a separate ticket for prod, but note the *gate* can pin locally (`npx -y sequelize-cli@x.y.z` in CI only) without touching the deploy; as-is the gate's own tool is unpinned. Guard-not-wired — agree, but F1 means its only executed form reports nothing; fix F1 before wiring it.

F1, F2, F3 are each one-step fixes, but F1 is precisely the round-1 defect class surviving its own documented fix, and F3 is a working green-tests-nothing path through leg B. By the standard you applied in round 1, this does not confirm.

F1 guard reports empty pending set (wf 212–214 vs 279–280; header claim wf 41–45 false) · F2 required-check × paths-filter deadlock, "identical lists" doctrine forbids the fix (wf 52–83, 69–72, 298–301, 372–373) · F3 aggregate seed assertion blind to per-model SKIP; delta on unseeded table passes vacuously (wf 244, 263, 370) · F4 models-only PRs green while `sync({alter})` mutates prod schema (wf 93, 298–307) · F5 seeder@HEAD × models@BASE phantom combination (wf 204–205, 222–231) · F6 config/.sequelizerc absent from path filters (wf 52–83) · F7 `before` unasserted (wf 206, 283) · Context: zero runtime verification; DATABASE_URL literal assumption.

status: REJECT
