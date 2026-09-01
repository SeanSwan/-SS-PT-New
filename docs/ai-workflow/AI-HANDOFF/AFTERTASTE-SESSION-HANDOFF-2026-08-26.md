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
| **HEAD** | **Do not trust this cell — run `git status -sb`.** A written push-state goes stale the moment anyone commits, and an earlier revision of this row asserted a push that had not happened. The branch tracks `origin/claude/aftertaste-p0-20260825`; Rule 70 says commit per slice, push once at batch end. |
| **Tree** | clean |
| **Seats available** | GLM 5.3 (`consult-glm.mjs`) and GLM-5.3-Flash (`consult-ox.mjs`, ~3× discount) — SAME LAB, never independent of each other. Fable and Sol are hand-driven by Sean on subscription and ARE independent. Ox Alpha is retired; it WAS Flash. |

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

### 2.5 Biome vocabulary — UNANSWERED (minor)

The two rosters do not share biome names (Ox "The Bunkhouse" vs GLM "The Lodgings"); §5.6. One
has to win before specs reference zones. **Recommendation: Ox's six** — they are the names the 18
built/refused specs already carry, so choosing them costs zero rewrites.

### 2.6 `--world-portal` on enemy bodies — UNANSWERED (minor, design-law)

Ox's open item: the §1 palette law leaves `--world-portal` ("single action") unusable on any enemy
body, and no enemy uses it. **Recommendation: permit it for capture-objective PROPS only** (the
maître d's ring is the named legitimate case) and state in `worlds.md` that it stays banned on
enemy bodies. Alternative: delete it from the enemy-facing subset of the law.

## 3. ⚠ THERE IS NO AUTHOR TO ASK — this plan was tried and it does not work

**Do not spend a call trying to ask the roster's author what they meant.** I did, on 2026-08-26,
and the attempt is instructive:

- **The roster's "author" is Ox Alpha, which is `z-ai/glm-5.3-flash`** — a stateless model. A
  fresh instance has no memory of authoring anything. Asking "what did you mean" returns a
  *fresh guess dressed as a recollection*, which is strictly worse than reading the text, because
  it arrives with the authority of an author and none of the knowledge.
- **All four reviewing seats recommended "just ask the author," and so did I, in the first
  revision of this handoff.** Every one of us reasoned about the roster as though a person wrote
  it. Nobody checked whether the author was a persistent entity. It is the same class of error as
  the circular oracles in §7.1: a plausible move whose premise nobody examined.
- **The `consult-ox.mjs` wrapper also forces a hostile-gate system prompt**, so the seat reviewed
  my question letter instead of answering it. Even with a persistent author, that path needed a
  different harness.

**The text is the only authority, and it says reader-applied.** The grammar's own parenthetical —
*"(validator-visible asymmetry)"* — states that the validator is expected to SEE the lift. That is
the strongest available evidence and there is no higher court to appeal to.

**What this means for the next agent:** treat `--mirror-break` as an OWNER decision (Sean's), not
an author decision. Present him §3.1 and let him pick. Do not re-run the ask.

**The code says so too, as of the 2026-08-26 batch.** `roster-to-obj.py`'s `--help` and its
exit-2 message, and every branch of `roster_resolve.report()`, now route a silent or conflicting
roster to the OWNER and state that there is no author to ask; the selftest asserts the phrase
`ASK THE AUTHOR` is gone (Rule 75 trailhead truth — an earlier revision of this handoff said the
ask was dead while the tool still told operators to make it).

### 3.1 The ambiguity, for whoever decides it

The BOX grammar states: *"MIRROR-BREAK: odd-indexed copies of any N receive z += 1
**(validator-visible asymmetry)**"*.

That pins neither the actor nor the index base, so there are at least three readings — `off`
(author already applied it), `on0` (reader applies it, odd counted from 0), `on1` (reader applies
it, odd counted from 1) — and they build different creatures. **Fable named at least two more the
current model cannot express**: `z += 1` read as extent *growth* (`dz+1`) rather than translation,
which never disconnects anything and is therefore invisible to any structural test; and
"odd-indexed" ranging over the N *statements* of a recipe rather than the copies within one N.

**Two generations of inference were circular (§7.1), and `--explain` reports that the roster's own
parenthetical points to reader-applied — the opposite of the verdict currently baked into the
`.obj` headers.** Seven blockouts were built under `off`; each header records that, so a change
costs one rebuild and loses nothing.

Two more readings surfaced on 2026-08-26 that the three-mode model still cannot express:

| reading | why it matters |
|---|---|
| *(f)* flat vs accumulating lift | does copy *i* get `z += 1` once, or does the lift interact with the `i*sz` term? |
| *(e)* odd over N STATEMENTS | "odd-indexed" may range over the N statements in a recipe rather than the copies inside one N |

**Recommended decision: `off`, stated explicitly and recorded.** It is what the seven built
assets already use, it is the only reading under which most of the roster is buildable at all
(8 disconnected vs 14 and 17), and the alternative rests on a parenthetical rather than a rule.
Record the deviation-from-text in the roster changelog so the reasoning survives.

### 3.2 What each reading refuses — precomputed, pinned to the roster text

Every `roster-to-obj.py` run now prints `roster-sha256=<12 hex>` (sha-256 of the roster text,
newline-normalised) and writes it into every `.obj` header, so a refusal list or a spec request
can never silently apply to drifted input (Flash's one unaddressed finding, §6.2b — closed).
These lists are for **roster-sha256 `b755115965f1`** = `ox-parasite-expansion-2026-08-26.md`;
if the printed hash differs, recompute with `--list --mirror-break <reading>`.

| reading | built | refused | refused ids |
|---|---|---|---|
| `off` | **7** | 11 | bedbug · mosquito · flea · mantisshrimp · seaspider · socketleech · soldernat · anglerfish · leech · cymothoa · hagfish |
| `on0` | 4 | 14 | bedbug · kissingbug · leech · mosquito · flea · tick · cymothoa · horsehair · mantisshrimp · hagfish · seaspider · socketleech · huskweaver · anglerfish — **builds:** assassinbug · botfly · soldernat · barreleye |
| `on1` | 1 | 17 | every id except **barreleye** |

Note the sets are NOT nested: `soldernat` is refused under `off` but builds under `on0` — a z-lift
can *create* face contact as well as break it. An earlier draft of this table wrote `on0` as "the
`off` list plus three" from memory; the run disproved it. Read lists off the tool, never off prose.

Whichever reading Sean picks, the send-back packet (§8 step 3) is the matching row — nothing has
to be re-derived after the decision.

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

**Four declare a count matching neither convention** — genuine miscounts:

```
parasite.leech       declared 14, recipe 22 distinct / 22 summed
weird.cymothoa       declared 17, recipe 22 / 22
deep.hagfish         declared 16, recipe 23 / 23
weird.mantisshrimp   declared 34, recipe 37 / 37   <- ALSO in the disconnection table above
```

**The exact partition of the 11** (verified by running it, not by reading the refusal output):

```
7  disconnected only
3  count only
1  BOTH — weird.mantisshrimp
```

⚠ **An earlier revision of this file said "3 count defects" and omitted mantisshrimp.** I captured
the refusal list with `grep -A1 "REFUSED"`, which takes exactly one line after each match, and
mantisshrimp's second problem line was cut off by my own filter. The tool reported both defects
correctly; I truncated the evidence and wrote the truncation down. **This is the project's named
failure class (§7) occurring inside the document that warns about it.** If you need a defect
partition, compute it — do not read it off a filtered log.

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

### 6.2b Flash's review of the question letter — 2 of 4 blockers DISPROVEN on running them

A worked example of why Rule 30 exists (another model's finding is a HYPOTHESIS until verified):

| claim | verdict |
|---|---|
| "`12/10/10` is arithmetically impossible — translations cannot change cell counts" | **DISPROVEN.** A translation changes the UNION count whenever a shifted copy stops or starts overlapping something. Three recipes do exactly that (`assassinbug` 29→28, `horsehair` 11→10, `hagfish` 23→22). The table reproduces exactly. |
| "the partition does not close — 3 unnamed count mismatches" | **DISPROVEN.** Disconnection and count-mismatch are independent properties. Measured: 7 clean + 7 disconnected-only + 3 count-only + 1 both = 18. |
| "`barreleye`'s exoneration is reading-dependent" | **DISPROVEN.** It builds under all three readings. |
| "`k` is unbounded before expansion — memory bomb" | **DISPROVEN in the code**, real in the letter. `MAX_COPIES = 256`. Flash was given the letter, not the source. |
| "the z-lift bias claim is asserted, not derived" | **REAL.** I stated a standing property from single-roster evidence (8/14/17, monotone here, not a law). |
| "reading *(e)* is enumerated then never asked about"; "flat vs accumulating lift is a sixth reading" | **REAL.** Both now in §3.1. |
| "no roster revision identifier — an answer could apply to drifted input" | **REAL — addressed 2026-08-26.** `roster-to-obj.py` prints `roster-sha256=` on every run and stamps it into every `.obj` header; §3.2 pins its lists to `b755115965f1`. |

**Score it by verifying, never by how sharp the prose reads.** Flash's disproven claims were
confident and well-argued; three of them rested on a premise (translations preserve counts) that
is true only for non-overlapping copies.

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
2. **Get `--mirror-break` decided by SEAN, not by an author** (§3 — there is no author; the
   attempt was made and is documented). Recommend `off`. If he picks `on0`/`on1`, rebuild all 7
   blockouts; their headers record the reading, so nothing is lost.
3. **Re-author the refused specs** (there is no author to "send back" to — it is a fresh
   Flash/GLM call with the N4 packet's corrected instructions) using the §3.2 row for the reading
   Sean picked and §5.3's exact defect list. Pin the request to the roster hash. Under `off` that
   is 11 specs; under `on0` 14; under `on1` 17.
4. **Pick a biome vocabulary** — §2.5 (recommend Ox's six).
5. **Run the 7 built blockouts through the Blender pipe** (`swan_pipe.py`) to produce gated runtime
   assets, then hand-author their manifests.
6. **Then** the 5 unbuilt first-roster enemies (§5.5).

---

## 9. CARRIED-OVER DEBT — none of it is blocking, all of it is real

- **The texture bake stage still does not exist** in code or in `plan()` — but its absence is now
  RECORDED, not implied: the gate refuses `budgets.textureMB: 0` unless `budgets.bake` says why
  (`"not-baked …"` on all four runtime manifests), so the zero can no longer be read as a measured
  budget. Proven by positive control (deleting one manifest's `bake` line → exit 1). The bake stage
  itself remains unbuilt. *(closed 2026-08-26 — the gate; open — the stage)*
- **Ox's three open items:** spawn-on-death → **closed**: optional manifest key `spawnOnDeath:
  [assetIds]`, each must be a registered asset and never the asset itself (3 selftest cases) ·
  "collision ≤25%" → **closed**: `registry.budgetPolicy.tierTable.unit` states it is TRIANGLE
  COUNT, hull volume is unmeasured, AABB containment is what bounds extent · `--world-portal` →
  **owner decision**, §2.6.
- **CODEOWNERS on `assets/registry.json`** → **closed**: `.github/CODEOWNERS` names the owner.
  Note it only *enforces* once branch protection requires code-owner review; until then it is a
  marker and a reviewer hint, which is still more than nothing.
- **`c:\tmp\ollama-firewall-fix.ps1`** — written, self-reverting, never run elevated. Two installer
  `ollama.exe` Public-profile allow-any rules. ⚠ **Do NOT rebind Ollama to 127.0.0.1** — the
  `0.0.0.0:11434` bind is deliberate; Hermes-in-WSL reaches it at the gateway IP and localhost is
  unreachable from WSL. Prescribing that rebind would have severed Hermes.
- **PR #84 is unmerged.** The 2026-08-26 batch is pushed; merging waits on the §2 decisions
  because the blockouts and the mode labels change with them.

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
(next)     chore(aftertaste): execute the handoff's recommendations — owner wording in the tool,
           roster hash in every run and header, bake-absence gate, spawnOnDeath, collision unit,
           CODEOWNERS; validate-asset.rules split under the 300 cap; 7 blockouts re-stamped
162f7b837  docs: there is no author to ask — and a grep truncated my own defect table
5d2568adf  docs: session handoff — pipeline state, four blocking decisions, exact next slice
9b87117e4  docs: Flash panel review + corrected re-author instructions
9bd674a05  refactor: tokenise the roster grammar; stop inferring what an author can answer
7d017d69b  fix: resolve the grammar ambiguity structurally — the count oracle is 33% wrong
572f79d24  feat: roster grammar module — the BOX dialect, proven equivalent to PROSE
a0191caee  docs: two seats' parasite/deep-ocean/robot bestiary + intensity-system designs
```

Hermes memos this session: `.ai-workflow/hermes-inbox/pending/20260826T1100*`, `…T1930*`,
`…T2000*`. Durable learning packet:
`docs/ai-workflow/hermes-learning-packets/20260826-an-oracle-that-shares-a-predicate-with-its-gate-is-not-evidence.md`.
