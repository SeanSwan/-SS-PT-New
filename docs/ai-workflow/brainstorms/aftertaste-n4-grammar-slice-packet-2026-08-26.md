---
decision: "Slice N4 — a second authoring grammar, proven equivalent to the first, and what the gate found in the 18-creature roster"
status: open
supersedes: none
privacy: IDs/roles only. No PII, no secrets, no absolute paths.
---

# PANEL PACKET — N4: roster grammar + the 18-creature gate run · 2026-08-26

Branch `claude/aftertaste-p0-20260825`, commit `572f79d24`. Free seats only (credits exhausted):
Ox Alpha, GLM 5.3, me. Two jobs below — **hostile review** (both seats) and, for the roster's
author, **re-authoring the 12 specs the gate refused**.

## 1. What the slice did

The parasite roster came back in a grammar its author invented. The generator read **zero** blocks
from it and exited 2 ("no spec blocks found — zero parsed is not a pass"). That was correct
behaviour and a brief defect: my brief named the *fields* a spec must carry and never named the
*container* they live in.

**`tools/blender/roster_grammar.py` (224 lines)** now holds both dialects:

```
PROSE   "abdomen 3x2x1 at (0,0,0)"           the first roster; 4 built assets depend on it
BOX     "C(0,0,0,3,2,1); N(3,1,0,0,C(...))"  the parasite roster
```

**`roster_grammar_selftest.py` (139 lines, 26 checks, 0 failed)** proves they mean the same thing:
one hand-counted creature (8 cells) authored in both, asserted to yield one identical cell set.
The remaining checks each guard a specific way BOX could be wrong invisibly — the worst being
`N` failing to consume its own inner `C`, which yields a plausible creature with one silent extra
box sitting exactly on top of a real one.

**`roster-to-obj.py` (198 lines)** is now policy only: what to refuse, what to write.

## 2. The ambiguity, resolved by measurement rather than taste

The BOX grammar states: *"MIRROR-BREAK: odd-indexed copies of any N receive z += 1."* That can
mean the **author** applied it while writing, or the **reader** applies it while parsing. The two
give different cells, so a guess would silently distort every creature using `N()`.

`resolve_mirror_break()` runs both readings against every declared `voxelCount`. Verdict: **OFF**.

The confidence is higher than the raw score looks. A z-shift only changes the cell **count** when
the shifted copy would otherwise have overlapped an existing cell; recipes whose `N` copies never
overlap score identically under both readings and carry no information. Counting them dilutes a
decisive roster toward a coin flip:

```
raw:            OFF agrees with 12 declared counts, ON with 10      (looks like noise)
discriminating: among the 2 recipes where the readings differ, OFF 2 / ON 0   (decisive)
```

The report now names both. **`on-only` was 0 across all 18** — not one creature requires the
reader-side expansion, and two are actively broken by it.

## 3. A regression I shipped and caught

`auto` refused the **original** roster as an undecidable tie. That roster has no `N()` at all, so
both readings agree with zero and score equal. A roster with no `N` has no ambiguity — that is a
**vacuous** tie, not an undecidable one, and refusing it locked out every PROSE roster including
the four already-built assets.

My selftest had asserted the wrong behaviour **and passed**, because its tie fixture also had no
`N()`. The test encoded my assumption instead of the requirement. Both fixed; the suite now
distinguishes vacuous from live and carries a genuinely discriminating case.

## 4. What the gate found: 6 of 18 buildable

Refusals now name the orphaned cells rather than saying "not connected" — an author told *which*
cells floated can fix the recipe; an author told the mesh is disconnected must re-derive it.

**Defect A — 8 creatures break the roster's own cluster-touch law, near-universally the same way:
an appendage sits one layer clear of the body.**

| creature | main body | floating free |
|---|---|---|
| `parasite.bedbug` | 32 | antennae `(-2,1,1) (-2,2,1)` at z=1 |
| `parasite.mosquito` | 21 | wings `(1,-1,2)(2,-1,2)(3,-1,2)` and `(1,2,2)(2,2,2)(3,2,2)` at z=2 |
| `parasite.flea` | 23 | `(3,0,2) (3,1,2)` at z=2 |
| `weird.mantisshrimp` | 33 | 4 single cells: `(-1,2,2) (-2,3,0) (-2,-1,0) (-1,0,2)` |
| `deep.seaspider` | 10 | a whole leg row `(0,3,0)…(3,3,0)` at y=3 |
| `robot.socketleech` | 22 | `(3,0,2) (4,0,2)` at z=2 |
| `robot.soldernat` | 18 | wings `(1,-1,2)(2,-1,2)` and `(1,2,2)(2,2,2)` at z=2 |
| `deep.anglerfish` | 33 | the lure `(3,1,3)` at z=3 |

This is the **identical defect class the first roster had** — that roster also shipped a floating
wing and the generator refused it then too. The pattern is: a wing/lure/antenna is placed at the
z the author *pictures* it at, with no cell bridging it to the body top.

**Defect B — 6 creatures declare a `voxelCount` their own recipe contradicts.** Mixed over and
under (−3 to +8), so this is miscounting, not a systematic misread of the grammar:

```
parasite.leech      declared 14, recipe 22  (+8)
parasite.flea       declared 28, recipe 25  (-3)
weird.cymothoa      declared 17, recipe 22  (+5)
weird.mantisshrimp  declared 34, recipe 37  (+3)
deep.hagfish        declared 16, recipe 23  (+7)
deep.barreleye      declared 24, recipe 22  (-2)
```

**Built and committed (6):** `kissingbug` 26 · `tick` 21 · `assassinbug` 29 · `botfly` 33 ·
`horsehair` 11 · `huskweaver` 16. All byte-identical on rerun, compared against a rerun verified
to have actually written files (a rerun that writes nothing compares stale files to themselves and
reports IDENTICAL — that has happened here before). `horsehair` hand-verified end to end: recipe
yields 11, declared 11, 88 verts = 11×8, connected, asymmetric.

## 5. What I want from you

**Both seats — hostile review.** Where is this wrong? Specific targets:
- Is the equivalence proof actually a proof, or does one hand-counted creature under-cover the
  grammar? What shape would pass both parsers and mean different things?
- `resolve_mirror_break` decides a semantic question from a numeric coincidence. When does that
  give a confident wrong answer? What input makes "discriminating cases" itself misleading?
- The vacuous/live tie distinction: is `any("N(" in recipe)` the right liveness test, or is there
  a roster where `N` appears but the ambiguity is still vacuous — or absent yet still live?
- `components()` reports orphans by coordinate. Does that survive a creature whose body is
  genuinely two pieces by design (a swarm, a tethered pair)? The refusal has no opt-out.
- Anything in §4's reading of the roster that is my parser's fault rather than the roster's.

**Roster author only — re-author the 12.** Same BOX grammar, same fields. Return only the
corrected blocks.

- **Defect A:** add bridging cell(s). The law AS ENFORCED is 6-neighbour contact at the **cell**
  level — a single bridging cell joins two boxes, and edge or corner contact does not count. An
  earlier draft of this brief said "every box shares a full face," which is a stronger law than
  the gate applies and would buy over-built bridges.
- **Defect B:** make the declared count and the recipe agree. **`voxelCount` is the number of
  DISTINCT occupied coordinates — `len(set_of_cells)`.** An earlier draft said
  "Σ(dx·dy·dz) minus overlaps"; that is wrong for partial overlaps and wrong again for triple
  overlaps, and would have manufactured the next round of exactly this defect.
- **First, a question that beats all of this inference:** the grammar says *"odd-indexed copies
  of any N receive z += 1."* **Which did you mean — that you already applied it while writing the
  recipes, or that the reader applies it?** And if the reader: is "odd" counted from 0 or from 1?
  I resolved it structurally (the reading under which fewest creatures shatter) and got
  author-applied, but you can settle it outright. Answer this even if you return nothing else.

**Do not answer the LIGHT/HARDCORE cast question in this round.** The framing you were given was
superseded mid-flight and the owner has not yet ruled. A focused follow-up comes separately.
