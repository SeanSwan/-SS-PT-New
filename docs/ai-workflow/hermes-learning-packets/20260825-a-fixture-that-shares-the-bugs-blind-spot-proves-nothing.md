---
name: a-fixture-that-shares-the-bugs-blind-spot-proves-nothing
title: The proof fixture was non-indexed, the bug only appears on indexed meshes, and the green light was therefore meaningless — plus I read EXIT 2 and reported a pass
originating_model: claude-fable-5
tier: fable
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10); Opus 5 / Kimi K3 designated Fable-tier 2026-08-10
date: 2026-08-25
decision: A proof fixture must be adversarial to the measurement it validates — if the fixture's shape is the degenerate case where a wrong formula happens to be right, the test proves the fixture, not the code
status: current
reviewed_by: Ox Alpha + GLM 5.3 (P1 post-slice panel)
supersedes: none
surface: scripts/assets (validate-asset, measure-glb, catalog-check)
commit: 528dc1c20
models_used:
  - model: claude-fable-5
    role: builder, dry-loop reviewer, third panel seat
    did: built the validator, the measurement tool and the Blender pipe; ran 5 dry-loop rounds that found 3 real defects and MISSED the two the panel found; misread its own selftest output and reported a pass on a broken test
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (Sean's standing first seat)
    did: found path traversal — a manifest naming ../../../.env was hashed and stamped VALID; found provenance is validated for shape not truth; found degraded mode exited 0; picked the next slice
    cost: $0
  - model: glm-5.3
    role: hostile reviewer
    did: found the triangle-unit bug that the fixture hid — the slice's flagship claim; demanded the pad-byte XOR test that resolved its own second doubt; caught the 300-line cap ambiguity
    cost: $0 (subscription)
skills_touched:
  - id: instrument-check
    change: reinforced (violated twice more)
    failure: (a) reported "the split didn't break anything" from output that literally read EXIT 2; (b) an adversarial test matrix silently wrote its fixtures to a path Node could not see, so all nine rows read exit=0 and looked like the validator failing to catch anything
  - id: test-driven-development
    change: gap found
    failure: 11 fixtures, all built from the same mental model as the code, missed a bug in a covered rule (aiAssisted null) AND a wrong unit in the headline measurement. Fixtures written by the author of the code inherit the author's blind spot
  - id: rule-4 (300-line cap)
    change: reinforced
    failure: the validator hit 305 lines and the five-round dry loop never noticed, because every round tested BEHAVIOUR and none measured the ARTIFACT
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A fixture that shares the bug's blind spot proves nothing

## What was decided/built (Fable-tier lesson)

P1 built an asset-manifest validator and claimed a headline result: *"the first non-fabricated number in the repo"* — a budget measured from a real GLB rather than guessed. The measurement read `POSITION.count / 3`.

That formula is correct only for a **non-indexed** triangle list. The proof fixture was a hand-authored single non-indexed triangle. So the fixture was exactly the degenerate case where the wrong formula returns the right answer. It went green.

Blender exports **indexed** meshes. The first real asset would have booked a wrong number carrying `{tool, command, date, commit}` provenance — a laundered number, which is worse than an obviously fake one because it passes the gate designed to catch fabrication.

Proven with an indexed quad: 4 vertices, 6 indices, 2 triangles. The old formula returned **1.333**.

## Why (the rationale Hermes should carry forward)

The five-round dry loop ran, found three real defects, and went dry. It still missed this, because **every round tested behaviour through the same fixture that shared the bug's blind spot**. A dry loop is only as wide as its inputs; running the same shape repeatedly is one round, not five.

The deeper rule: *fixtures written by the author of the code inherit the author's mental model.* The same session proves it twice — the 11 selftest fixtures also failed to catch `aiAssisted: null` slipping a rule they nominally covered (`null !== undefined`), and that bug was *emitted by the pipeline's own stub generator*, meaning the most important provenance question was skippable by the tool that writes manifests.

A fixture earns its keep only when its shape can distinguish right from wrong. Ask of every proof: **is there a wrong implementation that would also pass this?** If yes, the fixture is decoration.

## Reusable pattern / rule Hermes should apply next time

1. **Adversarial fixture rule.** For any measurement or parse, include the case where the naive implementation diverges — indexed vs non-indexed, empty vs one vs many, the падding byte, the mode that contributes zero. A single happy-shape fixture is a placebo.
2. **Ask the falsifying question before declaring green:** "what wrong code would also pass this test?" If you can name one, write that fixture.
3. **A dry loop must vary the INPUT, not just the vantage.** Five rounds against one fixture is one round.
4. **Measure the artifact, not only the behaviour.** No round checked `wc -l`; the file sat 5 lines over a hard cap through the entire loop.
5. **Never let a module run its CLI on import.** Two modules in one slice had this; the second meant the selftest could not import the rules it tests.
6. **Machine-generated input is untrusted input.** Manifests are written by pipelines and LLMs; a path field is an attack surface. Contain before you read.

## Who did what

**Ox Alpha** found the path traversal — the security defect, which neither I nor five dry-loop rounds looked for at all (the loop never attacked path *shapes*). It also found that provenance is validated for shape and never for truth, and that degraded mode exited 0, which would wave unvalidated assets through any CI reading only the exit code. It picked the next slice with the sharpest reasoning of the three.

**GLM 5.3** found the triangle-unit bug — the flagship claim. Worth recording precisely: its stated *mechanism* was wrong (it said "accessor count is the number of accessors"; the code actually read the POSITION accessor's `count` field), but its *conclusion* was right and the fix it prescribed was right. A reviewer can be wrong about why and right about what. It also demanded the pad-byte XOR test that resolved its own second doubt — the hash does cover the full file.

**I** built everything, ran five rounds, missed both. And twice reported results from broken instruments.

## Skills created or changed

- `instrument-check` — violated twice more in one slice. This is now the most-repeated failure in this corpus.
- New tool `scripts/assets/measure-glb.mjs` — correct triangle counting (indices, primitive mode, STRIP/FAN as n−2, POINTS/LINES as zero), 8 fixtures including the 40k-tri indexed case that would have exposed the original bug.
- `validate-asset.selftest.mjs` grew 11 → 16 with regression pins for every defect found by running rather than reading.

## Mistakes I made

- **Shipped a measurement whose unit was wrong** and called it "the first non-fabricated number in the repo." It was non-fabricated and wrong.
- **Built the proof fixture in the one shape that hides the bug.** Not bad luck — the simplest fixture is usually the degenerate one, which is exactly why it must be checked against a divergent case.
- **Misread my own test output.** After splitting the selftest I ran it, the output said `EXIT 2 — no manifests given`, and I reported "the split didn't break anything" on the strength of two other lines. The selftest was broken from that moment until the panel forced me back into it.
- **Wrote an adversarial test matrix that silently did nothing.** Nine rows all read `exit=0`, which looks exactly like the validator failing to catch nine attacks. The cause was Git Bash `/tmp` vs Node `C:\tmp` — a gotcha already recorded in my own memory. Re-ran with an instrument check first.
- **Never measured the file against the line cap** across five rounds.
- **Left a `command` field in the manifest citing a tool that did not exist** (`measure-glb.mjs`) — precisely Ox's "provenance is shape, not truth" finding, present in my own artifact.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Trusting an instrument that did not run / did not cover** | **5** (head-capped grep; misread EXIT 2; `/tmp` test matrix; tamper test on a pad byte; no line-count check) | **YES, three times, in this same corpus, today** | Nothing procedural. Each was caught by an outside seat or by accident. The only durable fix shipped so far is a *tool* (`catalog-check`, `measure-glb`) and a *hook* — prose has now failed five times |
| Fixture shares the bug's blind spot | 1 (the whole P1 proof) | no | An outside reviewer with a different mental model |
| Module runs its CLI on import | 2 (measure-glb, validate-asset) | no | Entry-point guard; found by using the module, not reading it |
| Machine input treated as trusted | 1 (manifest paths) | no | Containment check before read |

## External-model calibration

Ox Alpha: 5 findings, 5 real, $0 — its first two successful runs both produced the sharpest single finding of their panel. It is earning its standing seat. GLM 5.3: 9 findings, 7 real, 2 partly-wrong-mechanism-right-conclusion, $0. Both seats found things a five-round dry loop did not. **The pattern across both panels: the outside seat finds the class of defect the builder is constitutionally unable to see, because the builder's tests encode the builder's assumptions.** That is the argument for the standing panel, independent of cost.

## Risks / guardrails

- `swan_pipe.py` is still **unrun** — ~230 lines of `bpy` never executed. Both seats named this the top risk and the next slice.
- Nine registry fields (`chromeLaw`, `bannedLikeness`, `statusValues`, …) are declared and unenforced — including the Law-A/Law-B constraint the whole P0 correction surfaced.
- Still unpushed; every guard is branch-local.

## Provenance & privacy

originating_model claude-fable-5 · tier gate PASS · secret scan clean · IDs/roles only.
