# directions/ — the Direction Registry

- **Date:** 2026-09-23 · **Author:** Sable (WorkBuddy AI) · **Status:** CANONICAL (mechanism) · directions individually carry their own status
- **Amends:** `design.md` §3 (modes) and §4 (the palette) — see §10 below
- **Law of this file:** a direction is *selected*, never assumed. Every direction declares the same roles with different values. If a brief produces the same look twice by default, that is a defect in this registry, not a fact about the brief.

---

## 1. The problem this folder exists to solve

The Design Brain had **modes**, not **directions**.

A mode answers *where may this appear*. `design.md` §3 defines exactly two: Crystalline Swan (all product surfaces) and Crystalline Cyberforest (Sean-only operator surfaces). A mode is a **scope** concept.

Nothing in the Brain answered *what does it look like* — because there was only one answer, `design.md` §4.

The convergence is therefore **structural, not a matter of taste**. `website-archetypes.md` instructs the Fable brief in the SaaS-landing recipe: *"Palette stays Crystalline Swan."* The ideation gate is required to produce a **valid Swan** direction. So the gate has exactly one legal output. Ask the Brain for a landing page twice and you get the same picture twice — not because it is lazy, but because the instruction permits nothing else.

`cinematic-pages.md` §18 already solves **half** of this, and it is worth reading before this file. §18 mandates a breadth pass: 8–12 radically different macro-journey concepts, and it names "breadth theater" as a failure mode. But §18 varies the **concept** — the journey, the world, the object you start inside — while the **visual language** stays pinned. A breadth pass of twelve worlds, every one of them rendered in midnight sapphire and ice wing.

**This folder is the missing half: breadth over visual language, selected rather than assumed.**

## 2. Mode vs direction

| | Mode | Direction |
|---|---|---|
| Answers | *where* may this appear | *what* does it look like |
| Axis | scope / audience | aesthetic |
| Count | 2 | N |
| Varies | which surfaces are legal | the token values |

They **compose**, and neither substitutes for the other. A direction does not grant scope; a mode does not select a look. `(mode, direction)` is the pair: the mode gates legality, the direction supplies tokens.

A direction may be legal on more than one mode's surfaces, and a mode may admit more than one direction. That is the whole point.

## 3. The contract

Every direction declares the **same roles** with **different values**. That is what lets a component port across directions by swapping tokens only — the promise `design.md` §3 already makes for its two modes, generalized from two to N.

**Required roles — the closed seven.** These are not invented here. They are the palette role set already fixed in `prompter/lib/design-bridge.mjs:40` (`PALETTE_ROLES`), which records the lesson this registry inherits:

> *"Palette roles are a fixed set. Counting seven colours is not the same as having these seven."*

`ground · surface · panel · text · muted · focus · rare`

**Recommended roles** — the Brain's own ladder vocabulary, for directions that need a fuller surface story:

`ground-2 · panel-hi · panel-sunk · line · line-hi · text-dim · on-accent · third · danger · warn · ok`

A direction is a **closed** object (`additionalProperties: false`). Unknown roles are an error, at every level — the same repair `design-bridge.mjs` F01 records, applied here.

## 4. Selection

Three modes, first match wins:

1. **pinned** — the brief names a direction id. Always honoured, and always logged with a reason.
2. **matched** — the brief's own language hits a direction's `match_terms`.
3. **rotated** — no pin and no match. Choose from the **eligible set** by least-recently-used, ties broken by a hash of the brief text (deterministic: the same brief twice gives the same answer, a different brief does not).

**Eligible set** = directions whose `status` is `canonical` or `experimental`, **and** whose `scope` includes the surface class being built.

## 5. The anti-convergence gate

Selection is not a preference. It is a gate.

> **If the last three selections logged against the same surface class all resolved to the same direction, and none of them was pinned, the selection is REFUSED.**

The remedy is not to silently pick a different one. It is to either:

- **pin explicitly** — and record *why this surface is Swan*, which is a legitimate answer, or
- **accept the rotated pick**.

Both are fine. What is not fine is a fourth identical answer arriving by default.

This turns *"it builds the same damn thing every time"* from an impression into a number in `LEDGER.md`.

## 6. Breadth rules

Mirroring §18's rules for concepts, applied to visual language:

- **Radically different, not palette swaps.** Two directions that differ only in hue are **one direction**. Recolouring the same ladder is not a new direction.
- **At least one direction must invert the ground.** A registry of five dark-first directions is breadth theater with extra steps.
- **Every direction names its own signature device** — the one thing that recurs. A direction without a signature is a palette, not a direction.
- **Every direction must survive the port test.** Build one real component in it, swap only tokens, and it must still work. If it needs new geometry, it is a different *component system*, not a direction.
- **`match_terms` must discriminate.** A term that matches every brief is a bug — it collapses the whole registry back to one answer.

## 7. Status key

| Status | Eligible for selection | May appear on |
|---|---|---|
| `canonical` | yes | any scope it declares |
| `experimental` | yes | `experiment` scope freely; any other declared scope requires a logged reason |
| `quarantined` | **no** | nowhere — kept for history only |

`experimental` is the default for a new direction. **Do not self-promote to `canonical`** — that is Sean's call, and it is recorded here when he makes it.

## 8. Contrast: measured, not asserted

Each direction declares `contrast_pairs` — the pairs it will actually ship — as **role names**, not hexes. The validator resolves the roles against that direction's own palette and **computes WCAG 2.x relative-luminance contrast**. It does not read a number the direction claims about itself.

Where a pair legitimately cannot meet the threshold, it goes in `contrast_exceptions` and **must name the mechanism that compensates** (`compensated_by`, minimum 20 characters). An exception without a mechanism is a bug wearing a justification.

This matters because the incumbent has one. Crystalline Swan's primary button fill `#002060` on its page ground `#0A0A0F` measures **1.29:1** — the button is nearly invisible against the page. That is not a defect: §5's Dual-Button Glow and §7's "elevation = glass + glow, not gray shadows" mean separation is carried by the **glow and border**, not by luminance. The exception is recorded with that mechanism named, so a reviewer can attack the mechanism instead of rediscovering the number.

## 9. How to add a direction

1. Copy the closest existing direction file.
2. Change the **values**. Keep the **roles**.
3. Declare `contrast_pairs` for every text/background pair the direction will actually ship.
4. If a pair cannot pass, declare it in `contrast_exceptions` **with its mechanism**.
5. Run `node scripts/design-brain/directions/validate-directions.mjs` from the repo root.
6. Add the row to `registry.json` and to `index.md`. The validator cross-checks all three, so drift fails the run.
7. Status is `experimental`. Leave it there until Sean approves it.

## 10. What this changes elsewhere

| File | Change |
|---|---|
| `design.md` §3 | Modes are now scopes; direction selection is delegated here |
| `design.md` §4 | Becomes *the palette of the `crystalline-swan` direction*, not *the palette* |
| `website-archetypes.md` | The Fable brief no longer says "Palette stays Crystalline Swan" — it resolves a direction |
| `README.md` | Load order gains a direction-resolution step; the enforcement contract gains a clause |
| `anti-patterns.md` | Gains the convergence bans |

## 11. What this does NOT change

- **`SWAN-CINEMATIC-DESIGN-SYSTEM.md` still wins all conflicts.** If a direction contradicts it, the direction is wrong.
- **Scope, auth, and the T0–T4 tiers are untouched.** A direction governs how a surface *looks*, never what it may *do*.
- **The global anti-patterns still apply.** A direction's `bans` list is **additive** — it may add bans, never relax one.
- **`swan-design-router` (rule 40) remains the design entry point.** This registry is what it consults, not a bypass around it.
- **Sean remains the gate.** No direction reaches `canonical` without him.
