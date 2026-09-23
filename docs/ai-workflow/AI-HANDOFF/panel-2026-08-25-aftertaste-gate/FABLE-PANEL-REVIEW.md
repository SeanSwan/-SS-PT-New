# Fable 5 — Builder's Adversarial Seat (branch gate)

**Reviewer:** the builder, reviewing its own branch adversarially. Findings sit beside the external seats, attributed and attackable — not privileged.
**Document:** docs/ai-workflow/brainstorms/aftertaste-branch-gate-packet-2026-08-25.md
**Method:** every finding below rests on a probe RUN this session from a vantage no prior round used. Reading is not a round.

---

## VERDICT
**SHIP-WITH-FIXES** — the branch is safe to push as a branch (not to main) once one more import-safety defect is closed and the push procedure below is followed. It is NOT fit to be built on top of until the registry becomes a gate for the fields that justify it (F1) — but that is post-push work, not pre-push.

## BLOCKERS

1. **P1 — A third module runs its CLI on import.** Probe: `node -e "import('./scripts/assets/catalog-check.mjs')"` printed the usage banner. Same defect class as the two the P1 panel forced me to fix in `measure-glb.mjs` and `validate-asset.mjs` — I fixed those two and never swept the siblings. Rule-20 sibling sweep, violated in the very slice that documented it. **Fixed this round:** entry-point guard, `collectIds` exported, CLI behaviour re-verified (PRESENT exit 0 / ABSENT exit 1 / superset caveat on `.md` intact). `truncated-evidence-guard.mjs` also executes on import — **left as is, deliberately**: it is a hook with no library surface, and a hook that runs when loaded is the correct shape. Documented, not fixed.

2. **P1 — Push procedure must be `rebase`, then re-run the guard's own controls, then push — in that order.** Probes: `origin/main` moved 18 commits / 60 files; overlap with this branch's 26 files = **0** (explicit count); commits on main touching `.githooks/pre-commit` = **0**; `git merge-tree --write-tree origin/main HEAD` exit **0, no CONFLICT lines**. So the rebase is clean. What a clean rebase does NOT prove: that the guard still blocks its own T6 fixture after rebasing onto a hook that 18 commits of other agents' work has been running through. Re-run T6/T7/T8 post-rebase before pushing. Cost: 30 seconds; failure mode if skipped: the guard lands on main inert.

3. **P2 — CRLF is safe, and I checked rather than assumed, because every commit warned about it.** `.gitattributes` forces `eol=lf` on `.githooks/*` and `scripts/*.sh`; `git ls-files --eol` shows the hook is `i/lf` in the index and the shebang line is a clean `#!/usr/bin/env bash\n` (od-verified). The `.mjs` files are `i/lf` in the index with `w/crlf` in the worktree — Node tolerates CRLF, and the index is what gets pushed. **Not a blocker; recorded because "LF will be replaced by CRLF" on a bash hook is exactly the warning that produces `$'\r': command not found` when it IS a problem.**

## WHAT THREE PANELS MISSED (structural, not per-slice)

- **S1 — The registry has become a gate for the things that are easy to check and a document for the things that matter.** Path containment, sha256, clip names, license shape — all enforced, all mechanical. `chromeLaw` (the Law-A/Law-B constraint the entire P0 correction surfaced), `bannedLikeness`, `proofActionContract`, `antiCheese` — the doctrinal fields — have zero readers. The validator enforces *hygiene* and trusts *doctrine*. That is exactly backwards for a project whose stated risk is IP and health-language exposure, not corrupt files.
- **S2 — Every closed finding was closed by adding a rule to the same validator.** It is at 292/300 lines and the next three fixes (F1, F3, F4) all want to live in it. The branch has no second enforcement surface — no CI job, no test runner, no `npm run` alias. Every gate is a hand-invoked script. A gate nobody invokes is a document with an exit code.
- **S3 — The proof asset validates because it was built to validate.** `enemy.fryling` was authored by hand to pass. There is no asset in the branch that came *through the pipe*, because the pipe has never run. So the branch's central claim — "we have an asset factory" — rests on a fixture that bypassed the factory. Correct as a plumbing proof; must not be read as a factory proof.
- **S4 — The guard's scope is `docs/` and `.ai-workflow/` — the corpus grew by three learning packets today and one of them (this morning's) had to be rewritten because its headline was built on the false premise.** The learning corpus is now a place where a false claim, once written, propagates to Hermes. Nothing scans packets for absence claims backed by truncated instruments except the same hook, and only at commit time.

## INSTALL GO/NO-GO

**GO on Blender 4.5 LTS. HOLD on gltf-transform.** Nothing in the branch calls gltf-transform; `optimize.mjs` does not exist (F6). Installing a tool with no caller is not wrong, but it is the pattern this branch keeps repeating — the artifact exists, the enforcement does not. Install it when `optimize.mjs` exists to call it, in the same slice.

**`swan_pipe.py` should NOT be the first thing executed.** Run a 10-line smoke first: `blender -b --python-expr "import bpy; bpy.ops.wm.obj_import(filepath='x.obj'); bpy.ops.export_scene.gltf(filepath='x.glb')"`. That isolates the two UNVERIFIED calls (`obj_import` kwargs, `export_scene.gltf` in background — upstream 83188) from bevel/dissolve/UV/LOD. If the smoke fails, the pipe was never the problem; if it passes, the pipe's remaining risk is its own logic.

## WHAT I COULD NOT VERIFY
- Behavioural interaction between the guard and any pre-commit stage added on main in the last 18 commits — zero file overlap does not prove zero behavioural overlap. Post-rebase T6/T7/T8 settles it.
- Anything about `swan_pipe.py` beyond syntax and documentation — it has never run.
- Whether the external seats will find the class of error I am constitutionally unable to see. Every prior panel did.
