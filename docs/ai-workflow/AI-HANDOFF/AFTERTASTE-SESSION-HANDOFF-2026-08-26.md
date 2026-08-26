---
decision: "Session handoff for Project Aftertaste — asset pipeline state, the roster grammar rewrite, four owner decisions that block all asset authoring, and the exact next slice"
status: open
supersedes: none
privacy: IDs/roles only. No PII, no secrets, no credentials.
---

# HANDOFF — Project Aftertaste · 2026-08-26

**Read this file, then `git log` the five commits below. You do not need the earlier transcript.**

| | |
|---|---|
| **Linear** | SWA-211 (four comments this session; the newest is the current state) |
| **Branch** | `claude/aftertaste-p0-20260825`, PR #84 |
| **Worktree** | `C:\tmp\ss-aftertaste` — the code lives HERE, not in the main repo checkout |
| **HEAD** | `9b87117e4` · remote at `06d462077` · **5 commits unpushed** (Rule 70 batch cadence) |
| **Tree** | clean |
| **Seats available** | GLM 5.3, GLM-5.3-Flash (`consult-ox.mjs`, ~3× discount). Fable and Sol are hand-driven by Sean on subscription. Ox Alpha is DEAD. |

---

## 1. What Project Aftertaste is

A voxel zombie-survival game — a SwanStudios take on Call of Duty Zombies where the monsters are
junk food, decay organisms, parasites, deep-ocean horrors and parasitic robots. It is the
`world.miniature-play.voxel-realm` design-brain world (entry 16 of 18 in
`docs/ai-workflow/design-brain/worlds.md`), and it is **Law B — Licensed Departure**: no
Swan-branded surface may use its chrome.

**Voxel is the AUTHORING dialect, not the runtime.** Creatures are authored as small integer
cell-grids (4–40 occupied cells), then remeshed, bevelled, decimated to an LOD ladder, and atlas
baked. Per-unit microvoxels on a swarm is draft-call death; nothing in this pipeline ships raw
voxels.

Blueprint: `docs/ai-workflow/brainstorms/aftertaste-swanverse-game-blueprint-2026-08-25.md`
(carries a ⚠ CORRECTION banner — read it).

---

## 2. THE FOUR DECISIONS THAT BLOCK EVERYTHING

**No creature art can be authored until #1 lands.** It determines whether every monster needs one
build or two, which changes every downstream cost estimate.

### 2.1 Two visual tiers or three — UNANSWERED

Sean's words: *"there should be a light boat version, and the light boat version should be cute
mobs. or we should have three different version… I don't know if that's gonna be too much for
the game. So we're gonna have to decide what's best."*

**My recommendation: TWO tiers, ONE cast identity, cluster-level variant.** Swap the face/head
clusters plus palette and material per creature. It reads as a different mob to a player while
staying one name, one hitbox, one fight, one wiki. Costs roughly a third of a full second cast,
because in this pipeline the *build* is automated and only *authoring* is expensive. Three tiers
declined: the natural middle already exists free (today's bevelled-voxel output before any photo
wrap), so it can be added later for near zero if players ask.

**The argument against a fully forked cast, which I had not weighed:** two players in different
modes cannot discuss the same enemy. The wiki forks, streams don't match, friends comparing notes
are playing different games.

⚠ **A RETRACTED CLAIM.** I told Sean "both seats independently converged on one mesh, two material
sets." They were **Ox Alpha and GLM — the same lab, sibling tiers** (see §6). That was one family
answering twice, not corroboration. The reasoning still stands on its merits; the vote count does not.

### 2.2 What the modes are LABELLED on screen — UNANSWERED

Ox: *"'Hardcore' printed on a settings screen tells every nine-year-old what the game thinks of
them."* Proposed **"Natural / Stylised"**. Ox called this the single highest-leverage fix in its
document. Internal names can stay whatever we like; this is about the shipped UI string.

### 2.3 Do the parasitic robots have an economy to parasitise — UNANSWERED

Ox invented one (grid power, lubricant, robot hijacking) to make the specs writable. **If the game
has no machine-power/lubricant/signal economy, all three robots are decoration and should be cut
rather than shipped hollow.** Needs an owner answer, not a designer assumption.

### 2.4 The "Edward" phrase — UNANSWERED

One phrase in Sean's original dictation did not survive transcription — something like *"Edward
makes an Edward poo theme"*. **It has NOT been guessed at** by me, Ox, GLM, Fable or Sol; all
quarantined it independently. Ox flagged it as a landmine in a document that will be screenshotted
and built against for months. Ask Sean; do not interpret.

---

## 3. THE ONE QUESTION FOR THE ROSTER AUTHOR

The BOX grammar states: *"MIRROR-BREAK: odd-indexed copies of any N receive z += 1
**(validator-visible asymmetry)**"*.

That pins neither the actor nor the index base, so there are at least three readings — `off`
(author already applied it), `on0` (reader applies it, odd counted from 0), `on1` (reader applies
it, odd counted from 1) — and they build different creatures. **Fable named at least two more the
current model cannot express**: `z += 1` read as extent *growth* (`dz+1`) rather than translation,
which never disconnects anything and is therefore invisible to any structural test; and
"odd-indexed" ranging over the N *statements* of a recipe rather than the copies within one N.

**Ask the author. All four reviewing seats said this independently, unprompted.** It costs one
call and settles what no statistic can. Two generations of inference were circular (§5.2), and
`--explain` now reports that the roster's own parenthetical points to **reader-applied** — the
opposite of the verdict currently in the `.obj` headers.

```
node scripts/consult-ox.mjs --document <a short packet with just this question> --out <path>
```

---

## 4. THE PIPELINE — what exists and how to run it

### 4.1 Authoring chain

```
authored roster (.md)
   -> roster-to-obj.py          voxel blockout .obj          <- YOU ARE HERE
   -> run-blender.mjs + swan_pipe.py                          weld, dissolve, bevel, smooth,
                                                              UV, LOD ladder, convex hull,
                                                              Workbench still, manifest stub
   -> hand-authored manifest.json
   -> validate-asset.mjs                                      the gate
```

### 4.2 Commands that matter

```bash
cd C:/tmp/ss-aftertaste

# what each reading of the ambiguity implies; reports, never decides
python tools/blender/roster-to-obj.py --roster <roster.md> --explain

# list without writing.  --mirror-break is REQUIRED (off|on0|on1)
python tools/blender/roster-to-obj.py --roster <roster.md> --list --mirror-break off

# build.  --expect N fails a truncated authoring pass that would otherwise look fine
python tools/blender/roster-to-obj.py --roster <roster.md> --out assets/source/enemy \
    --mirror-break off --expect 18

# the suites — every one of these was run while writing this handoff; the counts are observed
python tools/blender/roster_grammar_selftest.py      # 53 checks, 0 failed
node scripts/assets/validate-asset.selftest.mjs      # 29/29
node scripts/assets/measure-glb.mjs --selftest       # 10/10  (a FLAG, not a separate file)
node scripts/assets/validate-asset.mjs --all         # 4/4 valid — the gate over every manifest

# Blender is ONLY ever run through this wrapper — it forces --disable-autoexec and
# --python-exit-code 1, and refuses success without the .swan-pipe.ok sentinel, because
# Blender exits 0 on an uncaught Python exception (probed, confirmed)
node scripts/assets/run-blender.mjs <script.py> -- <args>
```

### 4.3 Files

| File | Lines | Role |
|---|---|---|
| `tools/blender/roster_grammar.py` | 249 | Both recipe dialects, cells, components, caps, `RecipeError` |
| `tools/blender/roster_blocks.py` | 125 | Container forms (fenced / heading / bold), merged; decoration stripped |
| `tools/blender/roster_resolve.py` | 136 | REPORTS on the ambiguity. Must never return something a caller branches on |
| `tools/blender/roster-to-obj.py` | 219 | Policy: what to refuse, what to write |
| `tools/blender/roster_grammar_selftest.py` | 205 | 53 checks incl. all ten v1 holes + the self-asserting-fixture guard |
| `tools/blender/swan_pipe.py` | 297 | The Blender pipe |
| `tools/blender/swan_pipe_stages.py` | 212 | Its stages |
| `tools/blender/swan_pipe_manifest.py` | 113 | Deliberately-INVALID manifest stub |
| `scripts/assets/validate-asset.mjs` + `.rules` + `.contract` + `.selftest` | 154/297/24/— | The gate |
| `scripts/assets/measure-glb.mjs` | 184 | Triangle counting honouring `indices` and primitive mode |
| `scripts/assets/catalog-check.mjs` | 129 | Never truncates; always prints the denominator |

**All five roster modules are under the 300-line cap. Keep them there** — both reviewing seats
flagged the violation when `roster_grammar.py` hit 326.

---

## 5. STATE OF THE CREATURE ROSTER

### 5.1 Built and gated (4 runtime assets, from the FIRST roster)

`fryling` 292/146/60 · `patty-larva` 417/177/96/24 · `grease-fly` 292/126/52/24 ·
`drip-cyst` 469/199/112. All VALID, all byte-deterministic. Numbers are LOD triangle counts.

### 5.2 Blockouts built from the parasite roster — 7 of 18

`parasite.kissingbug` 26 · `parasite.tick` 21 · `weird.assassinbug` 29 · `weird.botfly` 33 ·
`weird.horsehair` 11 · `robot.huskweaver` 16 · `deep.barreleye` 22

All verified by arithmetic: verts = 8 × cells, faces = 6 × cells. Built under `--mirror-break off`,
which is **recorded in each `.obj` header** — if §3 comes back `on0`/`on1`, they must be rebuilt.

### 5.3 The 11 refused, with the exact fix each needs

**Eight break the cluster-touch law — an appendage sits one layer clear of the body.** The fix is
one bridging cell; contact is 6-neighbour at the CELL level, and edge or corner contact does not
count. Alternatively, if a split is deliberate, the spec declares `components: N`.

| id | pieces | floating free |
|---|---|---|
| `parasite.bedbug` | 2 | 2 cells at x−2, y1..2, z1 (antennae) |
| `parasite.mosquito` | 3 | 3 + 3 cells at z2 (wings) |
| `parasite.flea` | 2 | 2 cells at x3, y0..1, z2 |
| `weird.mantisshrimp` | 5 | four single cells, mixed |
| `deep.seaspider` | 2 | 4 cells at y3 (a whole leg row) |
| `robot.socketleech` | 2 | 2 cells at z2 |
| `robot.soldernat` | 3 | 2 + 2 cells at z2 (wings) |
| `deep.anglerfish` | 2 | 1 cell at z3 (the lure) |

**Three declare a count matching neither convention** — genuine miscounts:

```
parasite.leech    declared 14, recipe 22 distinct / 22 summed
weird.cymothoa    declared 17, recipe 22 / 22
deep.hagfish      declared 16, recipe 23 / 23
```

**Two earlier count accusations were MY tool's error and are withdrawn** — see §5.4.

### 5.4 ⚠ A correction that changed the result

The BOX grammar states `cells = sum(dx·dy·dz)` — a **sum**. The tool counted the deduplicated
**union**. They differ whenever boxes overlap, and the tool reported the mismatch as *"the spec
disagrees with itself"*, blaming the author for a convention the tool invented.

`deep.barreleye` declares 24, sums to 24, unions to 22, is connected and asymmetric — **it was
falsely refused and now builds.** `parasite.flea`'s count accusation was also false; only its
disconnection is real. Both conventions are now computed and a declared count is checked against
the one its author used. Found by GPT-5.6 Sol re-deriving the arithmetic against the spec rather
than reading my account of it.

### 5.5 Specced but not built (5, from the first roster)

`crumb-roach` · `pizza-husk` · `rot-maitre-d` · `rind-bulwark` · `glaze-decoy`. Blockouts exist in
`assets/source/enemy/`; they have not been through the Blender pipe.

### 5.6 Design material not yet turned into specs

- `docs/ai-workflow/AI-HANDOFF/ox-parasite-expansion-2026-08-26.md` — 18 creatures across **6
  biomes** (The Bunkhouse, The Stagnant Marsh, The Kennel Run, The Rustyard, Reef Shallows, The
  Midnight Trench), plus a verb budget and an intensity system. Three creatures deferred with
  reasons (`deep.vampiresquid`, `deep.giantisopod`, `deep.seaangel`).
- `docs/ai-workflow/AI-HANDOFF/glm-parasite-expansion-2026-08-26.md` — the intensity mechanism as
  four moving axes and three pinned, with three build-time checks. **Its recipes are prose
  ("14-cell lenticular carapace, bevel 0.4") — counts without coordinates, not generatable at any
  parser effort.** Its value is the fight design, not the geometry.
- **The two rosters do NOT share a biome vocabulary** (Ox "The Bunkhouse" vs GLM "The Lodgings").
  One has to win.

### 5.7 The intensity-system decisions that survive whichever way §2.1 goes

Both seats converged on these independently and they apply to either cast structure:

- Manifest carries a **dual block where both keys are required or the manifest is refused** —
  stops the light variant rotting into a stub.
- **Four-directory rule:** repackage both builds and diff; any byte difference outside
  `materials/ fx/ audio/ strings/` fails the gate. Makes "the modes play identically" checkable.
- **Reachability walk** plus a byte-entropy proxy on light-mode albedos — catches a "stylised"
  texture that is the photoreal one renamed.
- Light is the **default**, PIN-lockable **per profile, not per device** (a shared family machine
  must not leak a sibling's mode).
- **Invariance contract:** telegraph timing, spawn density, hitbox, difficulty never differ.
- Hardcore is **additive** — it gets depth, never exclusive content.
- A **leak-surface closure table**: names, codex, achievements, posters, audio banks, death effects.

---

## 6. SEATS — who is real, who is gone, and what each is worth

| Seat | Provider | Status |
|---|---|---|
| **Ox Alpha** | — | **DEAD.** `stealth/ox-alpha` 404s: *"This model was ZAI's GLM-5.3 Flash."* |
| **GLM-5.3-Flash** | Z.AI | Live via `scripts/consult-ox.mjs` (repointed). ~3× discount; Sean says call freely |
| **GLM 5.3** | Z.AI | Live via `scripts/consult-glm.mjs` |
| **Fable** | Anthropic | Subscription, **hand-driven by Sean**. Review/blueprint/diagram only — never building |
| **Sol (GPT-5.6)** | OpenAI | Subscription, **hand-driven by Sean**. Reads the filesystem |

### 6.1 ⚠ Independence is a property of the PROVIDER, not the seat name

Ox and GLM were sibling tiers of one lab. **Every "both seats independently converged" conclusion
recorded while Ox sat on the panel was one family answering twice.** When corroboration actually
matters, the seats must come from different labs.

### 6.2 What each seat proved it is worth (verified, not impression)

- **Fable** — composition errors. It found that the resolver's scoring predicate was *identical to
  the gate's refusal predicate*, which no local reading of any single function reveals. 4 blockers
  raised, 4 verified real.
- **Sol** — independent re-derivation. It recomputed the buildable set against the spec instead of
  reviewing my summary, and got a different number. 5 blockers raised, 5 verified real.
- **GLM-5.3-Flash vs GLM 5.3**, same packet: Flash 7,856 tokens / ~$0.0015 / 120.8s; GLM 19,452
  tokens / 300.8s. Comparable hit rate, 2.5× faster. **Two data points — the comparison is still
  running.** Score by verifying each finding against the code, never by how sharp the prose reads.
- **Every reviewer's finding is a HYPOTHESIS until verified** (Rule 30). Of 23 findings across
  Fable and Sol, 21 verified real and 2 were disproven by running them. Both disproven ones were
  still worth raising.

### 6.3 Relay procedure

Fable and Sol are driven by Sean in other windows. **Supply the paste-ready prompt unasked** — he
should never have to request one. Fable takes the FABLE GATE block (remit: review, blueprint,
diagram, arbitration — never building); Sol takes the relay template with absolute Windows paths
because it opens files itself. Keep them blind to each other. Both templates are in
`.claude/skills/seat-relay/SKILL.md`.

---

## 7. THE PROJECT'S NAMED FAILURE CLASS — read this before you trust any instrument

**An instrument that did not run reports clean.** Fourteen instances across four days. Every gate
in this workstream exists because of a specific one:

- A `grep | head -8` produced a false "this anchor does not exist" that shipped to five paid
  reviewers and became a P0 blocker in four of them. The anchor existed. → `catalog-check.mjs`
  never truncates and always prints the denominator; a pre-commit guard blocks a staged doc making
  an absence claim while carrying a truncating instrument with no denominator.
- A collision hull **9× the visual mesh shipped VALID** because "could not compute the AABB" was a
  WARN and the gate only fails on ERROR. → **unable-to-verify is an ERROR, never a WARN.**
- A regression harness printed IDENTICAL for four runs that wrote nothing — it compared stale files
  to themselves. → compare only against a rerun verified to have actually written.
- Three self-asserting test fixtures, the third written *minutes after* the docstring rule against
  them. → `audit_self_asserting()` in the selftest fails the suite when a check's arguments touch
  no module symbol. **Proven to catch** by injecting the offending line into a copy.

**The pattern in every case: prose did not hold the line; a mechanical check did.** When you find
yourself writing "be careful to…", write a gate instead.

### 7.1 Two circular oracles, one week apart

Worth its own entry because I did it twice:

1. Resolved a grammar ambiguity by scoring readings against the author's declared cell counts —
   rejected on review because that oracle is produced by the party under judgement.
2. Replaced it with a *structural* score: which reading shatters fewest creatures. Shipped it with
   a commit message arguing at length that oracle #1 was untrustworthy. **The shatter predicate is
   the identical predicate the gate refuses on**, so it selected whichever reading ships the most
   assets. I moved the circularity one layer down and congratulated myself for removing it.

The resolver is now a **report**. `--mirror-break` is a required operator decision, echoed into
every `.obj` header. If `roster_resolve.report()` ever grows a return value a caller branches on,
the circularity is back.

---

## 8. THE NEXT SLICE, IN ORDER

1. **Get §2.1 answered.** Nothing creature-shaped moves until then.
2. **Ask the roster author §3** — one call, settles what no statistic can. If the answer is
   `on0`/`on1`, rebuild all 7 blockouts (their headers record `off`).
3. **Send the 11 refused specs back** with §5.3's exact defect list. The precise fix per creature
   is already computed; the author does not have to re-derive anything.
4. **Pick a biome vocabulary** — Ox's six names or GLM's. §5.6.
5. **Run the 7 built blockouts through the Blender pipe** (`swan_pipe.py`) to produce gated runtime
   assets, then hand-author their manifests.
6. **Then** the 5 unbuilt first-roster enemies (§5.5).

---

## 9. CARRIED-OVER DEBT — none of it is blocking, all of it is real

- **The texture bake stage does not exist**, in code or in `plan()`. Every manifest reports
  `textureMB: 0`, which a future reader will take as a measured zero rather than a missing stage.
  Declare it null or "not-baked" before that happens.
- **Ox's three open items:** spawn-on-death has no manifest representation · `--world-portal` is
  orphaned · "collision ≤25%" is ambiguous between triangle count and hull volume (triangles are
  what is currently enforced).
- **CODEOWNERS on `assets/registry.json`** — never added.
- **`c:\tmp\ollama-firewall-fix.ps1`** — written, self-reverting, never run elevated. Two installer
  `ollama.exe` Public-profile allow-any rules. ⚠ **Do NOT rebind Ollama to 127.0.0.1** — the
  `0.0.0.0:11434` bind is deliberate; Hermes-in-WSL reaches it at the gateway IP and localhost is
  unreachable from WSL. Prescribing that rebind would have severed Hermes.
- **PR #84 is unmerged**, 5 commits unpushed.

---

## 10. STANDING CONSTRAINTS

- **Zero PII to LLMs** — IDs and roles only, in every packet and every memo.
- **Rule 70 batch cadence** — commit per slice locally, push ONCE at batch end. One deploy, one
  verification. Do not wait per push.
- **Rule 73 Proof-Before-Done** — no "done / fixed / working" without current-session proof AND a
  clean hostile pass in the same message. *Running* an instrument is not *validating* it; see §7.
- **Rule 67** — read `.ai-workflow/coordination/*.lane.md` before editing; claim your files; never
  `git add -A` while another agent holds a lock. Stage explicit paths.
- **Rules 68/69** — emit a Hermes inbox memo at substantial task close (`## Mistakes I made` is a
  literally-matched required heading; never number it). A durable learning packet additionally
  requires Fable-tier provenance — `claude-opus-5` qualifies.
- **Git Bash `<rev>:<path>` lies silently** — use `MSYS_NO_PATHCONV=1`. Git Bash `/tmp` is not
  Node's `/tmp` on Windows; use absolute paths.
- **`$?` after a pipeline reads the wrong command.** A pre-tool hook blocks it. Use
  `set -o pipefail` or `${PIPESTATUS[0]}`.

---

## 11. SESSION COMMITS

```
9b87117e4  docs: Flash panel review + corrected re-author instructions
9bd674a05  refactor: tokenise the roster grammar; stop inferring what an author can answer
7d017d69b  fix: resolve the grammar ambiguity structurally — the count oracle is 33% wrong
572f79d24  feat: roster grammar module — the BOX dialect, proven equivalent to PROSE
a0191caee  docs: two seats' parasite/deep-ocean/robot bestiary + intensity-system designs
```

Hermes memos this session: `.ai-workflow/hermes-inbox/pending/20260826T1100*`, `…T1930*`,
`…T2000*`. Durable learning packet:
`docs/ai-workflow/hermes-learning-packets/20260826-an-oracle-that-shares-a-predicate-with-its-gate-is-not-evidence.md`.
