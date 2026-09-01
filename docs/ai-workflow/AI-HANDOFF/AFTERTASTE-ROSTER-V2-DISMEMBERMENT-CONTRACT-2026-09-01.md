---
decision: Roster-v2 asset contract for dismemberment — part-tagged meshes on a named-bone skeleton, one hp pool with sever thresholds, gibs as decoration outside the lifecycle; four taste checkpoints reserved for Sean before Slice D3
status: open
supersedes: none
---

# Roster v2 — the dismemberment contract, designed before the knife

**Sean's directive (2026-09-01):** "when we shoot the enemy, it can shoot off body parts, limbs,
head, legs, feet, toes, etcetera." **GLM-round verdict that shaped this doc:** 8b is a pipeline
slice bigger than 8a; the contract must exist before any code, the capability questions must be
answered in the lifecycle table, and a version bump invalidates all four `validated` manifests.

## 0. Taste checkpoints — Sean reacts here, everything else has a working default

| # | Question | DEFAULT (used unless overridden) |
|---|---|---|
| T1 | Gore register: parts pop off **dry** (voxel chunks tumble, no fluid) or with a **burst** (particle spray in the monster's tint)? | Dry pop + a 6-particle tint puff — food monsters shed crumbs, not blood; keeps every rating door open |
| T2 | Does losing parts **change behaviour** (legs gone → slow crawl) or is it visual-only? | Behaviour ON: legs-gone halves speed, head-gone = instant kill — damage you can SEE should be damage that matters |
| T3 | Headshot multiplier? | ×2 damage + red-tinted hitmarker — the FPS literacy everyone brings |
| T4 | Gib lifetime on the floor? | 4s then fade — long enough to feel, short enough for wave-cap perf |

## 1. What a "part" IS (the load-bearing definitions)

- **A part is a named contiguous chunk of the monster**: `head`, `body`, `limb-l`, `limb-r`,
  `tail` — from a fixed vocabulary in the registry, per monster. ("Toes" are not parts; they are
  the VISUAL granularity of a `limb` gib — a severed limb breaks into its voxel sub-chunks as it
  tumbles. The fantasy reads at gib time without a 20-bone rig.)
- **A part owns exactly one bone** on `skeleton.creature-small.v2` and its vertices weight to that
  bone, so severing = detach one mesh, and clips animate parts for free.
- **A part carries its own hit shape** — sphere or capsule in normalized (1-unit-tall) space,
  measured from the part's vertex bounds by the pipeline, never typed by hand. This retires the
  single-sphere approximation the larva exposed (GLM-Flash F4): the larva becomes 3 body segments
  = a natural capsule chain.

## 2. Registry: `skeleton.creature-small.v2`

```json
{
  "id": "skeleton.creature-small.v2",
  "status": "planned",
  "clips": ["idle", "move", "attack", "hit", "death"],
  "bones": ["root", "body", "head", "limb-l", "limb-r"],
  "partVocabulary": ["body", "head", "limb-l", "limb-r", "tail"],
  "rules": {
    "requiredParts": ["body"],
    "bonePerPart": true,
    "hitShapes": "emitted by pipeline from part bounds, sphere|capsule, normalized space"
  }
}
```

- Clip set UNCHANGED — every existing clip recipe still applies (bone names map root→root,
  mid→body, tip→head); recipes gain optional limb channels.
- v1 stays in the registry (`status: superseded`) so history validates; nothing new lands on v1.

## 3. Manifest additions (per monster)

```json
"parts": [
  { "tag": "head",   "bone": "head",   "hitShape": {"kind":"sphere","c":[0,0.85,0],"r":0.22},
    "severable": true,  "severAtHpFraction": 0.0, "onSever": "kill" },
  { "tag": "limb-l", "bone": "limb-l", "hitShape": {"kind":"capsule","a":[-0.3,0.1,0],"b":[-0.3,0.4,0],"r":0.12},
    "severable": true,  "severAtHpFraction": 0.5, "onSever": "slow" },
  { "tag": "body",   "bone": "body",   "hitShape": {"kind":"capsule","a":[0,0.2,0],"b":[0,0.7,0],"r":0.35},
    "severable": false }
]
```

Everything measured/emitted by the pipeline; `validate-asset` v2 rules verify: every part's bone
exists, shapes cover ≥80% of the part's longest half-extent (the GLM floor, now per part), tags
come from the vocabulary, exactly one non-severable `body`.

## 4. Damage model — ONE hp pool, sever thresholds (the smallest true-to-fantasy design)

- The monster keeps its single roster `hp`. A hit's damage goes to the pool; the PART that was
  struck is recorded (locational hitscan returns `{target, t, part}` — nearest part-shape ENTRY
  across all enemies, the ordering fix from the GLM round doing exactly the job it was built for).
- A severable part DETACHES when the pool crosses its `severAtHpFraction` **and that part took
  the crossing hit** (you shot the arm off — the arm you actually shot). `onSever` effects:
  `kill` (head), `slow` (multiply speed; stacks), `none`.
- Death (pool 0) severs every remaining severable part — the CoD-zombies full pop — and the body
  plays `death` as today.
- WHY not per-part hp: two hp systems is the three-rule-drift generator the lifecycle table
  exists to prevent; thresholds give "shoot the arm off a wounded fryling" with one pool and zero
  new invariants.

## 5. The capability answers (in the table, per the GLM demand)

| question | answer | where it lives |
|---|---|---|
| Is a severed enemy a new state? | **No.** `alive`/`attacking` continue; severance is per-enemy mutable data: `severed: ['limb-l']`, `speedScale` | enemy fields, stamped by `shoot` |
| Do gibs hold the wave / take shots / attack? | **Gibs are not enemies at all.** They live in a separate `debris` array — decoration with a TTL, never consulted by tickRound/hitscan/steering | store `debris`, drained by tick |
| Can a corpse be dismembered? | No — `canBeShot: false` already answers it; the death pop is the corpse's gore budget | existing table, unchanged |
| Does the lifecycle table change at all? | One clarifying column only: nothing about parts — proof the state machine and the damage-location system are orthogonal, which is the design's main virtue | lifecycle.js |

## 6. Re-export budget (the honest cost, per the GLM re-scope)

All four monsters: blockout split into part meshes (Blender, per-monster anatomy call) → re-rig on
v2 bones → 5 clips re-exported + `verify-clips` → hit shapes emitted → manifest resigned (sha256,
`clipContract`, `parts`, status back through `validated`). Estimate: the 8a pipeline run ×4 plus
one-time pipeline work (part emission + shape measurement + validate v2 rules). Browser tests
change meaning: "one SkinnedMesh per enemy" becomes "one skinned GROUP per enemy" — fryling.spec /
roster.spec assertions must be updated WITH the first v2 monster, disclosed as test-delta.

## 7. Slice order (each failing-first, each shippable)

| Slice | What | Proof gate |
|---|---|---|
| D1 | Registry v2 + validate-asset v2 part rules (selftest negative controls: missing bone, undersized shape, two bodies) | validate selftest red→green |
| D2 | Pipeline: part-mesh emission + measured hit shapes; **fryling only** re-exported on v2 | verify-clips + validate VALID; game still green on v1 path (v2 unconsumed) |
| D3 | Locational hitscan (`{target,t,part}`) + sever-on-threshold + severed-mesh detach/gib toss; fryling in-game | red-first unit (part entry ordering, threshold+location rule) + browser sever test; **Sean's T1-T4 answers land here** |
| D4 | Behaviour effects (T2) + headshot feel (T3) + debris TTL (T4) | unit + screenshot review |
| D5 | Remaining three monsters through v2 | 4/4 validate; suite ×3 |

**Do not start D1 until Sean has seen §0** — defaults are defensible but T1 (gore register) and
T2 (behaviour effects) are taste, and taste is the owner's.

## 8. What this contract deliberately does NOT do

No ragdoll physics (gibs are kinematic tosses with a canned tumble — a physics engine remains
un-earned, per collision-without-physics.md). No per-part hp bars. No damage numbers floating off
monsters. No new skeleton for the OTHER 12 blockout enemies until they are scheduled — the
vocabulary is sized for the current four plus `tail` for the roster's obvious next shapes.
