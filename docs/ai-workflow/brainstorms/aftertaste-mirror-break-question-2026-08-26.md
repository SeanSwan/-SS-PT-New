---
decision: "Settle the MIRROR-BREAK reading by asking the roster's author, and re-author the 11 refused specs against a computed defect list"
status: open
supersedes: none
privacy: IDs/roles only.
---

# TO THE AUTHOR OF THE PARASITE ROSTER · 2026-08-26

You wrote the 18-creature parasite/deep-ocean/robot roster and the BOX recipe grammar it uses.
Two things: **one question only you can answer**, and **eleven specs that need a small fix each**.

Answer the question even if you return nothing else.

---

## 1. THE QUESTION — what did MIRROR-BREAK mean?

Your grammar states:

```
N(k,sx,sy,sz, C(...))    k copies; i-th copy shifted by i*(sx,sy,sz)
GLOBAL RULES:
  - MIRROR-BREAK: odd-indexed copies of any N receive z += 1 (validator-visible asymmetry)
```

That sentence has **at least five readings**, and they build different creatures:

| reading | meaning |
|---|---|
| `off` | you already applied the lift while writing; the parser does nothing |
| `on0` | the parser applies it; "odd" counted from 0, so copies 1, 3, 5 lift |
| `on1` | the parser applies it; "odd" counted from 1, so copies 0, 2, 4 lift |
| *(d)* | `z += 1` means the copy's **extent grows** (`dz+1`), not that it translates |
| *(e)* | "odd-indexed" ranges over the **N statements** in a recipe, not the copies inside one N |

**Which did you mean?** If reader-applied, is "odd" counted from 0 or from 1? And is `z += 1` a
translation or an extent change?

### Why I am asking instead of inferring

I tried twice and both attempts were circular.

- **Attempt 1** scored each reading against your declared `voxelCount` values. That oracle is
  authored by the same party whose counts this roster gets wrong on three creatures — it cannot
  judge itself.
- **Attempt 2** scored by which reading leaves fewest creatures in disconnected pieces, and I
  claimed that was independent of your arithmetic. It is not: "disconnected" is the **identical
  predicate my gate refuses on**, so the score selects whichever reading ships the most assets.
  A z-lift also breaks face contact far more often than it creates it, so the measure carries a
  standing bias toward `off` on any roster at all.

Here is what each reading actually implies on your roster, reported and **not** scored:

```
                         off    on0    on1
creatures disconnected     8     14     17
matches declared count    12     10     10
14 of 18 recipes build observably different creatures across readings
```

**And your own words point the other way from both my attempts.** You wrote
*"(validator-visible asymmetry)"* — you expect the validator to **see** the lift, which reads as
reader-applied. I built the seven passing creatures under `off`, and each `.obj` header records
that. If the answer is `on0` or `on1`, I rebuild them; no work is lost.

---

## 2. A CONVENTION MISMATCH THAT WAS MY FAULT, NOT YOURS

Your grammar says `cells = Σ(dx·dy·dz)` — a **sum**. My tool counted the **deduplicated union**,
which differs whenever boxes overlap, and then reported the difference as *"the spec disagrees
with itself."* That accusation was wrong on two creatures:

- **`deep.barreleye`** — declares 24, sums to 24, unions to 22. Connected, asymmetric, entirely
  valid under the rule you wrote. It was falsely refused and now builds. **No change needed.**
- **`parasite.flea`** — its count is fine; only its disconnection is real.

Both conventions are now computed and a declared count is checked against either. **Confirm which
one you intend `voxelCount` to mean** so the gate can state it rather than infer it.

---

## 3. THE ELEVEN — each with its computed fix

Seven build clean and need nothing: `parasite.kissingbug` · `parasite.tick` ·
`weird.assassinbug` · `weird.botfly` · `weird.horsehair` · `robot.huskweaver` · `deep.barreleye`.

### 3a. Eight break the cluster-touch law — an appendage sits one layer clear of the body

The law **as enforced** is 6-neighbour contact at the **cell** level: one bridging cell joins two
boxes, and edge or corner contact does not count. (An earlier note from me said "every box shares
a full face" — that is stronger than what the gate applies and would buy over-built bridges.
Ignore it.)

| id | pieces | exactly what floats free |
|---|---|---|
| `parasite.bedbug` | 2 | 2 cells, x−2, y1..2, z1 — the antennae |
| `parasite.mosquito` | 3 | 3 cells x1..3 y−1 z2, and 3 cells x1..3 y2 z2 — the wings |
| `parasite.flea` | 2 | 2 cells, x3, y0..1, z2 |
| `weird.mantisshrimp` | 5 | four single cells: (−1,2,2) (−2,3,0) (−2,−1,0) (−1,0,2) |
| `deep.seaspider` | 2 | 4 cells, x0..3, y3, z0 — a whole leg row |
| `robot.socketleech` | 2 | 2 cells, x3..4, y0, z2 |
| `robot.soldernat` | 3 | 2 cells x1..2 y−1 z2, and 2 cells x1..2 y2 z2 — the wings |
| `deep.anglerfish` | 2 | 1 cell, x3, y1, z3 — the lure |

**The pattern is one thing repeated:** a wing, lure, or antenna is placed at the z you picture it
at, with nothing bridging it to the body top. The same defect class appeared in the previous
roster. Two fixes are available per creature — add the bridging cell(s), **or**, if the gap is
deliberate, declare `components: N` and the gate will verify that number instead of assuming 1.

### 3b. Three declare a count matching neither convention

```
parasite.leech    declared 14, recipe yields 22 distinct / 22 summed
weird.cymothoa    declared 17, recipe yields 22 / 22
deep.hagfish      declared 16, recipe yields 23 / 23
```

Distinct and summed agree on all three, so this is not the convention mismatch from §2 — the
declared numbers are simply wrong, or the recipes are. **Which is authoritative: the count you
intended, or the recipe you wrote?**

---

## 4. WHAT TO RETURN

1. **The MIRROR-BREAK answer** (§1) — one line. Highest value; return it even alone.
2. Which convention `voxelCount` means (§2) — one line.
3. **Corrected blocks only** for the eleven in §3, same BOX grammar, same fields.

### Constraints unchanged
Occupied cells 4–40 · no perfect X-mirror symmetry · LOD1 ≤ 50 %, LOD2 ≤ 25 %, closed-manifold
hull · ≤4 palette slots with `--world-danger` as telegraph only, never body colour · the villain
is contamination, decay, parasitism, neglect — **never a body, never a body type, never a person**
· `ipRow` with three nearest commercial comparisons and why this is distinct.

### The parser is now strict, so malformed recipes are refused rather than quietly shrunk
Every statement must be a whole production with exact arity and balanced parens; unconsumed text
is an error. Previously a missing bracket or a wrong-arity `N` silently produced a smaller
creature with no error anywhere — that is fixed, and it means a typo now comes back to you as a
refusal instead of shipping as a subtly wrong monster.

## 5. NOT THIS ROUND

Do not answer the LIGHT/HARDCORE cast question. The framing you were given was superseded and the
owner has not yet ruled.
