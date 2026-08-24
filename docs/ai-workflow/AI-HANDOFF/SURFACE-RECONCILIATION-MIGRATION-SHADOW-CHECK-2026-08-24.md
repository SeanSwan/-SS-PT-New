---
decision: Do NOT commit the local migration-shadow-check.yml — it is a competing surface against a pushed branch version, and the branch version is correct on the point that matters most
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-24
rule_basis: Rule 27 (Surface Classification), Rule 26 (Canonical Surface Receipt), Rule 20 (sibling sweep)
---

# Surface reconciliation — `migration-shadow-check.yml` exists twice, and they disagree

## Why this exists

The recommendation last turn was "commit the untracked deliverables." Scoping that turned up a
second copy of the same workflow already pushed on another branch. Committing the local file
would have created a third version of one deliverable and buried a defect the other copy had
already found, documented, and fixed.

**Nothing here is committed or changed. This is the classification pass (Rule 27) that has to
happen before either version is trusted.**

## The two surfaces

| | **A — branch copy** | **B — local copy** |
|---|---|---|
| Location | `origin/claude/swa200-migration-rails-20260823` | working tree, **untracked** |
| Length | 154 lines | 132 lines |
| Pushed? | yes (2026-08-23) | no — exists on no branch, local or remote |
| Panel's 4 workflow fixes | **none** | **all four** |
| Install mode | `npm install` | `npm ci` |
| Seeds synthetic rows | **no** | **yes** |
| Second migration runs against | empty DB | **populated DB** |
| Pending-migration report | yes (`pre-migrate-guard.mjs --check`) | no |
| Entry-point boot check | yes, with 20s timeout + explicit crash-loop message | yes, simpler |
| SHA-pinned checkout | `Check out the pushed SHA` | generic `Checkout repository` |
| Deploy-parity rationale documented | **yes, in-file** | no |

**Classification: competing/ambiguous (Rule 27).** Neither is a superset. Each carries
capability the other lacks. This is not two edits of one file — it is two workflows that grew
independently toward the same goal.

## The finding that decides the ordering

`render.yaml:20` runs:

```
cd backend && npm install && npm run migrate:production
```

- **Surface A uses `npm install`** — and says why, in a comment on the step:
  > *"Deliberately `npm install`, not `npm ci` — it is what render.yaml:66 runs. A shadow
  > check that installs differently from the deploy is testing a different artifact."*
- **Surface B uses `npm ci`.**

`npm ci` installs the lockfile exactly; `npm install` may resolve differently. **Surface B
therefore validates a dependency tree the deploy will not use.** A migration can pass shadow-check
under `npm ci` and still fail on Render under `npm install` — which is the exact class of failure
the gate exists to catch. The gate would be green and the deploy would break anyway.

### This also invalidates one of the panel's ratified items

The 15-round panel's **item 9** — "run the seeder self-test in CI right after `npm ci`" — was
ratified against Surface B alone. The panel never saw Surface A and had no way to know the
install mode was load-bearing. Adopting item 9 as written **entrenches the defect Surface A had
already fixed and documented.**

That is not a panel failure of reasoning. It is a scope failure: the panel reviewed a file, not
a surface, and nobody ran the sibling sweep that would have surfaced the second copy. A ruling is
only as canonical as the surface it was taken against.

## What each surface uniquely contributes

**Only in A (must survive any merge):**
- `npm install` — deploy parity, the finding above
- `Check out the pushed SHA` — pins the artifact under test
- `Report the pending migration set before running it` (`pre-migrate-guard.mjs --check`) —
  **note: `backend/scripts/pre-migrate-guard.mjs` does not exist in the local tree**, so B could
  not have adopted this step even if it wanted to
- Entry-point check with a 20s timeout and an explicit "this SHA would crash-loop on Render"
  failure message
- Summary step

**Only in B (must survive any merge):**
- The whole seeding layer — without it the second migration runs against an **empty** database,
  which cannot catch data-dependent migration failures. This is the substantive reason B exists.
- Seeder self-test as a pre-DB gate (keep the step, **move it off `npm ci`**)
- Anchored assert `grep '^SHADOW-SEED {'` (panel item 5)
- Aligned Postgres credentials (panel item 4) — B fixed a mismatch that let an auth check pass
  vacuously
- `2>&1` capture so SKIP/FAIL reach the artifact (panel item 10) — **carries the open GLM/Grok
  finding that merging stderr can interleave mid-line and break the anchored grep; needs
  `pipefail` or a fail-on-FAIL gate, unresolved in both surfaces**

## Review correction — the install-mode argument was stated too strongly

Both hostile seats (GLM 5.3, Ox Alpha, 2026-08-24) attacked the reasoning above. Two corrections
land, and one of them produces a better answer than the original recommendation.

**1. `npm ci` ≠ "different artifact" unconditionally (GLM F3).** Where `package-lock.json` and
`package.json` agree, `npm ci` and `npm install` resolve the *same* tree — the divergence claim
only holds when they disagree. The precise statement is not "B tests a different artifact" but
**"at least one leg of the check must mirror the deploy's resolution mode, or the gate can pass a
tree the deploy will not build."** Command-fidelity is not artifact-fidelity.

**2. Matching the deploy may be fixing the wrong end (Ox F3).** `npm install` in CI is
**non-hermetic**: it re-resolves semver ranges at install time, so the gate can flake on a
transitive release nobody made, and it can mutate `package-lock.json` mid-run. The original
recommendation treated deploy-fidelity as terminal and never asked whether the *deploy* is the
defect. It probably is — `render.yaml:20` running `npm install` means production builds are
themselves non-reproducible.

**Revised position:** matching A's `npm install` is the correct **interim** call, because a gate
that resolves differently from the deploy cannot catch deploy-time failures. But the durable fix
is to move **the deploy** to `npm ci` and then move the gate with it — which makes both hermetic
instead of making both drift. That is a separate change with its own blast radius (a lockfile
that does not satisfy `package.json` would start failing builds that currently succeed), so it
does not belong in this reconciliation. It belongs on the board.

**3. The merge target orphans the ratified fixes (GLM F4).** Recommending A as the base, with
only B's seeding layer ported, silently drops the four panel-ratified workflow fixes — they exist
**only in B**. Any merge must port all four (items 4, 5, 10 and a re-decided 9), not just the
seeding layer. The recommendation below is amended to say so explicitly.

## Recommendation

1. **Do not commit B to this branch.** It would become a third version and the fork would widen.
2. **A is the merge target** — it is pushed, SHA-pinned, deploy-accurate, and has the supporting
   script (`pre-migrate-guard.mjs`) that B lacks.
3. **Port B's seeding layer onto A**, changing exactly one thing on the way: the self-test step
   attaches after A's `npm install`, never after `npm ci`.
4. **Re-run the four panel fixes against the merged file** — items 4, 5 and 10 port cleanly;
   **item 9 must be re-decided**, because its stated anchor (`npm ci`) does not exist on A.
5. **Resolve the stderr/anchored-grep interaction** before either ships. It is open on both.
6. Only then commit, push, and let the job actually run — that CI log is the acceptance
   artifact, and neither surface has ever produced one.

## What is still unproven

- `[UNVERIFIED]` Whether A's `pre-migrate-guard.mjs --check` behaves as its step name claims —
  the script is absent locally and was not read.
- `[UNVERIFIED]` Whether B's seeding layer runs green at all. Its DB-free selftest passes 36/36
  (confirmed), but the seeder has never executed against a real database on any branch.
- `[VERIFIED]` **No third copy exists.** All 157 remote branches were searched for
  `.github/workflows/migration-shadow-check.yml`; exactly one carries it
  (`origin/claude/swa200-migration-rails-20260823`, 154 lines). Surfaces A and B are the
  complete set.
