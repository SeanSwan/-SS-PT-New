---
date: 2026-09-01
originating_model: claude-fable-5
source_tier: fable
surface: Project Aftertaste (SWA-211), worktree sspt-aftertaste-hardening-20260830
models_used:
  - model: claude-fable-5
    role: sole builder/reviewer (orchestrator + executor)
    did: three slices in one session — Fryling in-game (684a564db), Windows GL line-clip root-cause + translation-invariant world (ccfc750a8), Overwatch/BF6 FPS pivot (26bf9cb99), lifecycle wiring (7518c2707); all pushed
    cost: $0 (subscription)
skills_touched:
  - id: instrument-check (existing skill, reinforced)
    change: reinforced by two live instances — a `pass 0` result read as green, and a && chain gated on grep instead of the test runner
    motivating_failure: a commit landed with a red test while every visible line looked green
---

# A green pipe is not a green test — and a boundary is not a place to stand

Three transferable lessons from a $0 solo session that shipped four slices of the Aftertaste game.

## 1. Exit-code gating: the RUNNER decides, never the pipe

`node --test ... | grep -E "^# pass" && git commit` commits on **grep's** success — grep succeeds
whenever the summary line exists, including `# fail 1`. A red test shipped inside a green-looking
chain and needed a follow-up commit to repair. The surviving form is:

```bash
if node --test tests/*.mjs > /dev/null 2>&1; then git commit ...; else echo "RED - not committing"; fi
```

Related instrument failure from the same session: running `node --test tests/*.test.mjs` from the
wrong directory printed `# tests 0 / # pass 0 / # fail 0` — which is not a pass, it is the
instrument reporting it measured NOTHING. Treat zero-tests as failure, mechanically
(`--test-fail-on-zero-tests` exists for exactly this, or assert the expected count).

## 2. A documented mistake is not a fixed mistake — only a procedure is

IEEE-754 duration boundaries bit **twice in one session, the second time AFTER the first was
written up**: `10 + 0.6 - 10 === 0.5999…` failed a state-machine boundary test in the morning;
`(a + 0.4) - a < 0.4` failed a different test helper hours later — same class, same author, same
day. The write-up ("floats are imprecise at boundaries") changed nothing because it was
*resolutional*. What stopped the class was *procedural*: **tests step PAST duration boundaries
(`+ 1e-6`), never onto them — the contract under test is the ORDERING, not IEEE equality.** When a
lesson recurs, rewrite it as a rule about what your hands do, not about what you now know.

## 3. When a renderer lies, bisect CONDITIONS with single-variable runs — then delete the whole bug class

A fully green suite, and half the floor grid not drawing. The hunt that worked, each run changing
exactly one thing: same wait without input (→ movement-triggered, not time), same input on
stashed code (→ pre-existing, not this slice), camera pose probe (→ identical, so the cause is
ABSOLUTE position), live grid-lift (→ no change: the visible lines weren't the grid — a probe that
surprises you outranks three that confirm), live red-paint (→ they were half the grid: one line
family gone). Verdict: Windows ANGLE fails to clip GL line primitives whose endpoints fall far
behind the camera. Two fixes, in order of generality: translation-invariance (world anchors follow
the player, so the provably-good spawn geometry holds forever), then — when an FPS camera at 1.6
units triggered it while standing still — **replace the primitive**: the grid became a repeating
texture on the floor mesh. A textured triangle cannot lose its stripes to line clipping; the best
fix removed the vulnerable primitive class entirely rather than managing its geometry.

## Who did what

claude-fable-5, alone, no paid seats. Sean steered twice mid-session (Overwatch/BF6 shooting;
dismemberment) — both absorbed as directives: one built the same day, one routed into the asset
contract for the roster slice so it is born into the models instead of retrofitted.

## Skills created or changed

None created. `instrument-check`'s doctrine (validate the instrument before believing it) was the
operative discipline in both the exit-code and zero-tests incidents; this packet adds the two
concrete mechanical forms above to its case law.

## Mistakes I made

- Committed with a red test because `&&` gated on grep, not the runner (fixed forward, dcc549e20).
- Repeated the float-boundary mistake after writing it up — the repeat is the highest-signal entry
  here; see lesson 2 for what finally stopped it.
- Read `# pass 0` from a wrong-cwd run without alarm; three separate wrong-cwd incidents in one
  session (fix: absolute `cd` in every location-dependent command).
- An optimization ("publish position only on change") silently removed a test seam's existence at
  boot and broke seven browser tests at once — a seam is a CONTRACT that it exists from frame one.

## Error → fix → repeat ledger

| error class | recurrences this session | written up before recurring? | what stopped it |
|---|---|---|---|
| float boundary in duration tests | 2 | YES — recurred anyway | procedural rule: step past boundaries, never onto them |
| wrong cwd for location-dependent command | 3 | no (folk knowledge) | absolute `cd &&` prefix on every such command |
| exit-code gate on wrong command | 1 | no | `if <runner>; then` form |
| seam existence removed by optimization | 1 | no | publish unconditionally; seams exist from frame one |

## External-model calibration

None — no paid model consulted; the session cost $0 beyond the subscription.
