# Operator decision record — Theme Lens package

A decision that Astra's plan makes a **prerequisite for entering a slice**. Recorded here
because `06-bans.md` forbids *"treating the no-install recommendation as Sean's answer"* — a
recommendation is not an answer, so the answer has to be written down separately from it.

---

## D-1 — S4 dependency admission

**Question.** `04-build-order.md` S4 and `03-contracts.md` §Dependencies both gate entry on
"Sean's dependency/visual decision recorded". The open question was whether to add **GSAP**
(timeline/media-query orchestration) and/or **R3F + Drei** (declarative Three.js integration)
for the optional lens scene.

**Astra's recommendation.** `03-contracts.md:145` — *"Recommendation remains **no new
dependency for this control**"*, with reasoning: this control's motion already fits Framer
Motion, a three-facet ornament does not establish an advantage over existing raw Three.js,
and Drei/postprocessing/icons have no accepted lane requirement.

**Sean's decision (2026-09-20 02:21 PDT), verbatim:**

> "i WANT YOU TO DO WHAT ASTRA RECOMMENDED"

**Recorded as:** **no new dependency is installed for this control.** S4, when it is reached,
uses the **existing** `three@0.169.0` (declared `^0.169.0`, locked 0.169.0, installed
0.169.0 — verified) and adds no package.

**Scope of this decision.** It answers the dependency question only. It does **not**:

- authorise entry to S4. S4 still requires **S3 accepted** first
  (`05-slices.md`: *"Entry: S3 accepted; Sean's dependency/visual decision recorded"*).
- pre-approve the Three.js work. `06-bans.md` still forbids enabling the scene on the basis of
  "installed dependency presence or historical chunk sizes", and `05-slices.md` requires
  measured baseline/candidate evidence and every performance budget to pass.
- set `VITE_THEME_LENS_3D`. It stays **false** by default; the flag is enabled only by the
  exact string `'true'`.

**Rollback.** Unchanged from `03-contracts.md:166` — restore only owned changes from the
preserved artifacts; a rollback of the optional effect requires a rebuild with the flag false.

**Still open, and NOT answered by this decision:** whether the *visual direction* Astra
proposed for S3 ("Quiet Chrome / static") is accepted. `05-slices.md` S3 lists *"Quiet
Chrome/static direction accepted for execution"* as an entry condition, so S3 will need that
stated before it can be entered.

---

## D-2 — S0 plan-command corrections (this seat's finding, not Astra's recommendation)

Not an operator decision. Recorded so the two commands that **do not run as written** are
corrected before S1 depends on them:

| Command as written in `09-tests.md` | Measured | Corrected form |
|---|---|---|
| `node ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tmp/tsconfig.themelens-lane-only.json` | exit **134**, OOM at ~4 GB | prefix `NODE_OPTIONS=--max-old-space-size=8192` |
| `node ./node_modules/vite/bin/vite.js build` | exit **1** — safe-delete shim refuses `emptyDir` at its 50-target threshold | rename `dist` aside first, then build |

Full evidence: `evidence/results.md` §5 (D1, D2). This file records the decision; that file
records the measurement.
