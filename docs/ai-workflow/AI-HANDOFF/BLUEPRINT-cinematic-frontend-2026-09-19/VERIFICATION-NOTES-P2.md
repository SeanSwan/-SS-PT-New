# VERIFICATION NOTES P2 — adjudication of the second Astra consult

**Package:** `BLUEPRINT-cinematic-frontend-2026-09-19` · **Consult:** P2
**Reply:** `ASTRA-REPLY-P2.md` (66,242 chars, 912 lines) · **split:** 12 files → `P2-FORGED/`
**Adjudicated by:** Sable (WorkBuddy / deepseek-v4.1-flash) · 2026-09-21
**Prior:** P1 (`ASTRA-REPLY.md`, adjudicated in `VERIFICATION-NOTES.md`)

---

## 0. Run identity — NOT verified, same limitation as P1

`ASTRA-REPLY-P2.meta.json`:

```json
{ "model": "gpt-6-astra", "servedModel": null, "identityVerified": false,
  "effort": "xhigh", "provider": "openai-codex", "billing": "chatgpt-subscription",
  "transport": "codex-cli", "megaBlueprint": true,
  "inputTokens": 423893, "outputTokens": 22295, "reasoningOutputTokens": 7168,
  "wallSeconds": 701.7 }
```

`identityVerified: false` with a precise reason: *"codex exec --json emits no model field:
measured 2026-09-19 on codex-cli 0.154.0, event set = thread.started, turn.started,
item.completed, turn.completed; the substring 'model' does not occur in the raw JSONL.
Requested model is provable; served model is not."*

**Recorded as: requested `gpt-6-astra`, served identity unverified.** Astra itself opened by
saying *"I cannot establish that I authored P1."* That is the correct posture and it is
recorded, not smoothed over.

**Process note — the exit code lied.** The task notification reported `failed`. It did **not**
fail: the log shows `complete in 701.7s`, and the reply was saved. The non-zero exit came from
the sandbox blocking `rg.exe` **after** the model had finished. Read the log, not the status.
This is a second instance of the class already recorded in the consult skill: *a green-looking
receipt is not proof, and neither is a red one.* §0.5/§0.6's lesson generalises.

## 0.1 Astra's self-reported limitations

It stated plainly: repository findings are `[EXCERPT-SUPPORTED]`, not verified against the
working tree; public docs checked are `[SOURCE-SUPPORTED]`, which *"does not establish
installed-library behavior"*; and *"the named `fable-blueprint-forge` skill was not found in
the inspected personal skill locations."* All three are honest and all three match the expected
shape for a repo-blind reviewer.

---

## 1. The headline result — F01, and it costs me a correction

**F01 (H) — "P1 selected a direction from an incomplete and unfair comparison."**

Astra's verdict: the rejection **did** exclude a substantial, already-built branded option. It
compared a developed SwanMark idea against the dismissive label "generic geode/particle field,"
without evaluating the subtree.

**But Astra immediately corrected my framing of it, and it was right to.** My packet §4 asserted
the plan rejected a strawman *"while sitting on a stronger, already-paid-for option … literally
named for the project's own design language."* Astra's response:

> *"The packet establishes a named token preset, not that one particular variant is visually
> best. It lists five variants; it does not establish a sixth `CrystallineSwan` page or identify
> which variant best demonstrates F-Alt. That mapping is `[NEEDS-VERBATIM]`. … Do not substitute
> the equally unsupported assertion that an unseen variant is definitively the best design."*

**Verified against the tree, and Astra is right:**

```
cinematic-tokens.ts:2    * Design tokens for Preset F (Enchanted Apex) and F-Alt (Crystalline Swan).
cinematic-tokens.ts:92   // ─── Preset F: Enchanted Apex ───
cinematic-tokens.ts:123  // ─── Preset F-Alt: Crystalline Swan ───
cinematic-tokens.ts:127    name: 'Crystalline Swan',
cinematic-tokens.ts:154  // ─── Variant C: Hybrid (F-Alt palette, low motion) ───
```

`Crystalline Swan` is a **token preset**, not a sixth page. My §4 wording implied otherwise.
**Correction accepted:** the defect is real — the direction was chosen without examining the
subtree — but I overstated the strength of the excluded option. Astra's replacement text is
better than mine: *"Develop Act 1 using the existing F-Alt/Crystalline Swan preset as the first
reference candidate, with the existing SwanMark as the focal mark."* It withdraws the unfair
rejection **without** asserting an unseen winner. Adopted verbatim.

**This is the answer to question #1 in the packet: yes, the P1 direction decision was made on
evidence that excluded the best available option.** P1 picked a direction by rejecting a
strawman it had itself labelled, while five complete designs sat unreferenced in the same repo.

## 2. Findings F02–F12 — adjudication

| ID | Sev | Astra's claim | Verdict | Notes |
|---|---|---|---|---|
| **F02** | M | "Orphaned assets" is not an executable deletion boundary | **CONFIRMED — better than my R1** | Zero mounted callers does not prove an asset has zero consumers: CSS, manifests, public URLs, dynamic imports and re-exports all escape an import graph. R1 becomes *delete the component + a recorded, reference-checked allowlist*, not "and its orphaned assets." My ruling was under-specified on exactly this point. |
| **F03** | H | P1 mandated R3F without identifying a missing capability | **CONFIRMED** | R2 was already the operator's ruling; Astra supplies the *reason* my A0 didn't articulate: the repo already has the renderer lifecycle, geometry construction, demand scheduling, disposal and a mounted consumer. R3F added migration and ownership boundaries **for one rotation**. Its sharp caveat — *"a React error boundary does not catch arbitrary rAF callbacks"* — is a real consequence of the pivot that R2 alone did not surface. |
| **F04** | H | The canvas and loading gates contradict the shipped header | **CONFIRMED — verified, and it invalidates a plan gate** | Verified: `Header/header.tsx:14` statically imports `Logo`, and `Logo.tsx:225` mounts `<SwanMark3D>`, which dynamically imports `three` + the 323 KB spec. So the shared chunks **are** requested on every page. The plan's `07-checkpoints.md#C4` *"lean/reduced navigation requests no scene chunk"* and `06-bans.md` *"no Three.js scene machinery through the initial home rendering graph"* are **unpassable as written** — they assert a page-global property the header violates independently of the hero. Astra's fix (hero delta: one displayed canvas + one detached WebGL canvas + **one WebGL context**; measure header and hero separately) is adopted. **My A0 receipt missed this.** |
| **F05** | H | Policy cannot distinguish detection pending from terminal disablement | **CONFIRMED — genuine design defect in P1's tier policy** | The plan sets pre-detection to `reduced` **and** latches disablement for the route mount. A conforming implementation therefore permanently disables the signature before detection finishes. This is a real bug in the binding contract, not a reading. Astra's fix — explicit `phase: 'pending' \| 'ready'`; pending shows the poster without consuming eligibility — is adopted. **This is the defect P1's tier policy had never been stress-tested for, and it was found.** |
| **F06** | M | The policy conflates preference, restraint, and GPU capability | **CONFIRMED — and Astra declined a false positive** | Note what it did *not* do: my question asked what breaks on 4 cores + save-data, and Astra answered *"the four-core/save-data example itself is not a bug: the existing rules correctly produce `lean`."* It refused to manufacture a defect. The real defect is the category error: low CPU/memory became the **same state as an accessibility preference**. Fix adopted: `reduced` reserved for reduced-motion or explicit lower override; resource/network constraints → `lean`; 8 cores = conservative admission, not GPU certification. |
| **F07** | M | Consumer migration and helper repair are inflated by bad reachability | **CONFIRMED** | A3.n's "twelve sections" and A5.n's helper repair are both wrong-sized: the three-file hook inventory **includes its own definition**, so there are two consuming pages, not twelve. A5 (dormant helper) is cancelled. Astra's added caution is the important part: *"The 34-importer cinematic kit is a shared surface. Home-specific restrictions must not silently alter all those consumers."* |
| **F08** | H | DPR, supersampling, and poster resolution treated as interchangeable | **CONFIRMED — verified disagreement** | The plan demands DPR `[1,1.5]` in `03-contracts.md` while `07-checkpoints.md` says "DPR ≤2". Those already contradict each other, and neither describes the house controller's two-stage sampling. Astra also flags what I had not: **the 128 px placeholder is not evidence for a 560 px hero** — the measured optimum was established for a 28–52 CSS px logo. Its backing contract separates display ratio, scratch supersampling, side limit (2048) and pixel limit (4,194,304), and explicitly refuses to generalise the logo measurement to hero sizes. Adopted. |
| **F09** | H | The timing gate measures neither complete cost nor a defensible budget | **CONFIRMED — the gate is deleted** | This is the finding I asked for when I flagged `<3ms/frame` as undefined. Astra's argument is sound: disjoint timer queries time selected GL work, they **do not include the displayed-2D-canvas/compositor path**, and *"adding CPU submission time to GPU time is not a reliable frame-latency measurement."* Requiring every cold frame to satisfy it makes the gate unpassable. Replacement: p95 presentation-callback interval ≤25ms, no interval >50ms, no hero-attributable long task ≥50ms, GPU queries demoted to optional diagnostics. **Adopted. `<3ms/frame` is struck.** |
| **F10** | M | 720ms/−0.14rad is choreography without demonstrated visual value | **CONFIRMED as under-evidenced, not as wrong** | ~8° of yaw may be restrained-and-right or invisible; the packet has no storyboard. Astra's sharpest point: *"A poster at a different pose could create a more noticeable handoff jump than the reveal itself."* Fix: require poster to match the **starting** pose (−0.14 rad), a 0/360/720ms storyboard, and — the honest part — *"If the candidate fails visual acceptance, the static surface can pass independently; the signature remains DEFERRED, not 'completed through fallback.'"* |
| **F11** | H | Source-text contracts cannot establish lifecycle correctness | **CONFIRMED — corrects my own A0 read** | I praised the `SwanMark3D` contract tests in the packet as evidence of a mature pattern. Astra is right that this was too generous: a file can contain `dispose()`, `cancelAnimationFrame()` and `forceContextLoss()` while calling them on the wrong resources or missing failure branches. Source contracts stay for architectural prohibitions; executable controller tests are added for scheduling, partial-construction failure, callbacks-after-disposal and instance isolation. |
| **F12** | H | No ancestry reconciliation gate for overlapping later decisions | **CONFIRMED** | Directly answers my question #10 about P3. Astra refuses both failure modes: *"The later consult and containment changes may govern shared paths. Their existence neither invalidates P2 automatically nor permits ignoring them."* Fix: a new **A0r** intake capturing P3's path, hashes, remit, affected paths and adjudication, with a conflict table. Sharp line worth keeping: *"Commit titles are discovery pointers, not specifications."* |

## 3. What Astra verified that I could not

It claims to have checked primary sources. I verified the two that matter most, and **Astra was
right on both — and one of them it left more honest than it needed to be.**

**`framer-motion` 12.x — the plan's requirement is satisfiable.** The plan's `03-contracts.md`
demands *"highest stable `framer-motion` 12.x release whose peers accept both installed React 18
and intended React 19. If no candidate qualifies, block this slice."* Astra said 12.23.24
declares React 18/19 peers but that *"this establishes a viable candidate family, not the
highest registry version."*

Measured:
```
npm view framer-motion@12.23.24 peerDependencies  → react: '^18.0.0 || ^19.0.0' ✔
npm view framer-motion@12.43.0 peerDependencies  → react: '^18.0.0 || ^19.0.0' ✔
12.x releases: 202   ·   newest 12.x: 12.43.0
```
**Slice B1a's blocking condition is cleared.** The newest 12.x is **12.43.0**, and it peers React
18 — so the plan's own rule resolves rather than blocks. Astra asserted the family existed and
correctly declined to claim the registry maximum; I have now measured it. ⚠ **This is a
point-in-time registry reading (2026-09-21), not a frozen fact** — B1a must re-verify and freeze
at implementation time, as the plan already requires.

**The header/canvas claim (F04) — verified above and confirmed.**

## 4. Adjudicating the A2 self-review

Astra ran one hostile pass over its own draft (the mandate requires it). A2-01…A2-05 each name a
draft defect and the applied correction. Spot-checked against the emitted `01-architecture.md`,
`03-contracts.md` and `02-wireframes.md` — **all five are visible in the forged documents**, not
merely asserted:

- **A2-01** (shared-controller extension could change header behavior) → `01-architecture.md`
  "Ownership": *"Header behavior retains current defaults. Hero options are opt-in."* ✔
- **A2-02** (cleanup could consume the one-shot latch during StrictMode replay) → L5 case
  *`cleanup before presentation does not consume reveal`*; `03-contracts.md` lifecycle clause. ✔
- **A2-03** (first-frame handoff lacked a pose/resolution contract) → `02-wireframes.md` poster
  clause: same geometry, camera, material and **starting yaw −0.14rad**; plus C2's
  *"first-frame silhouette registration differs by no more than one CSS pixel."* ✔
- **A2-04** (5000ms timer described as interrupting preparation) → `03-contracts.md`: *"The
  deadline cannot interrupt synchronous construction."* ✔
- **A2-05** (partial documents could erase unchanged B2 material) → `00-README.md` "Application
  contract": merge as section replacements; *"Preserve P1, its receipt, adjudication, and
  original documents as immutable evidence."* ✔

A2 ran and it visibly changed the artifact. **A2-05 is the most important of the five** and it is
the one that protects this package: without it, applying P2's outputs over the originals would
silently destroy the P1 record.

## 5. The state-of-the-art axis — what Astra returned

The operator asked specifically for this. Astra evaluated six options with adoption costs and
**no identified premium product eliminated the workstream's core work**:

| Option | Astra's decision |
|---|---|
| R3F + Drei | *"R2 is correct for this surface. P1 had no demonstrated requirement for R3F."* |
| `<model-viewer>` | Credible for a model viewer; unnecessary migration for the existing controller |
| Radix Primitives | No new dialog here; preserve the existing orientation flow |
| Motion+ | *"No identified premium component removes this workstream's core work. Do not purchase for this signature."* |
| Spline | *"Adds authoring/runtime dependencies to an already implemented scene. Reject for this scope."* |
| Rive | Viable only if the direction changes to authored vector motion |

Its framing of the axis is the durable part: *"Progressive enhancement, static posters,
conditional loading, explicit disposal, and rendering only while necessary remain current
practices. … The architectural principle is sound. **The unnecessary part was introducing
another renderer integration and several adapter layers for functionality the repository already
ships.**"* And the honest negative: *"There is no evidence here that the field has settled on one
universal CPU-count policy, three-target animation limit, or 720ms signature. Those are project
decisions, not standards."*

**Pricing and licence figures Astra cited are `[SOURCE-SUPPORTED]`, not verified here.** I did
not check them. They are low-stakes (all six were rejected), but do not quote them as fact.

## 6. Structural change P2 forces — the nine-file plan collapses to five

P1's `01-architecture.md` proposed nine NEW production files. R2 collapses them:

**Cancelled outright:** `homeHeroSpec.ts`, `homeHeroFactory.ts`, `HeroSignatureScene.tsx`,
`HeroSignaturePoster.tsx`, `motionTokenStyles.ts`

**Surviving five:** `performanceTierPolicy.ts`, `motionTokens.ts`, **`swanMarkReveal.ts`** (new —
pure finite-reveal sampling, owns no React, renderer or rAF), `HeroSignature.tsx` (reduced from
three files to one), `HeroSignature.styles.ts`

**Modified rather than rebuilt:** `swanMarkScene.ts` (narrowly — optional finite reveal,
presentation/error callbacks, capped backing), `sceneSupport.ts`, `PerformanceTierProvider.tsx`,
`useAnimationTier.ts` + measured consumers, existing `HeroSection` + V4.

Astra's guard on this is worth keeping: *"The five-module list is a design boundary, not
permission to exceed 300 lines. … Do not split constants into files merely to meet a file-count
target."* That directly addresses my question #6 — a ten-file boundary for one 720ms rotation was
over-built, and the answer is a **five**-file one.

## 7. UNPROVEN — do not build on these

1. **Served model identity.** `identityVerified: false`. Astra cannot confirm it authored P1.
2. **F01's visual conclusion.** Neither Astra nor I have seen the five variants rendered. Which
   one best demonstrates F-Alt is **`[NEEDS-VERBATIM]`** — A0r must produce screenshots. Astra
   explicitly declined to name a winner and that restraint is correct.
3. **F08's hero-size optimum.** `supersample = 2` was measured for a 28–52 px logo. Whether it is
   optimal at 560 px is **unmeasured**, and Astra says so.
4. **F09's replacement thresholds.** p95 ≤25ms / max ≤50ms are Astra's proposed project
   thresholds, *"not claims of industry consensus."* Nothing has been measured against them.
5. **F05's runtime impact.** A contract ambiguity, not a reproduced defect. No test exists.
6. **A1-05 carried from P1 —** Framer `MotionConfig` opacity-permissiveness is still asserted
   from docs, never reproduced in this repo. Astra re-confirmed it from current documentation and
   again flagged that installed `framer-motion@10.18.0` behaviour needs the runtime fixture.
7. **The CTA chain.** Still `[NEEDS-VERBATIM]` after two consults. A7's wiring change is blocked
   on it.
8. **P3's contents.** Entirely unseen. Astra's F12 turns this into a gate rather than a guess.
9. **Every test in `09-tests.md`.** Astra labelled them *"planned, NOT RUN."* Nothing has ever
   executed.
10. **No performance baseline exists** for any gate, in either direction.

## 8. Verdict

**P2 reply state: USABLE. 12 findings, all 12 confirmed, 0 refuted. R1–R3 all held.**

This is a materially better reply than P1, for a specific reason: **P1's findings were about code
P1 could not read; P2's findings are about a plan, which is contained in the packet.** A
repo-blind reviewer is at a structural disadvantage reading a repo and at none reading a plan.
The packet-in-packet-out format worked exactly as designed.

**Astra attacked its own prior work and found a real defect in it (F05), and it declined two
invitations to manufacture findings** — it refused to call the 4-core/save-data case a bug
because the rules handle it correctly (F06), and it refused my §4 framing that an unseen variant
was demonstrably superior (F01). Both refusals were correct and both improved the result.

**The two things I got wrong, recorded not buried:**
1. My packet §4 overstated the excluded option. `Crystalline Swan` is a token preset, not a page.
   The defect survives; my amplification of it does not.
2. My A0 receipt praised `SwanMark3D`'s contract tests as mature without noting that source-text
   assertions cannot establish lifecycle correctness (F11), and it missed the header's
   independent three/spec chunk reach (F04), which invalidates a plan gate.

**What P2 leaves the operator with:** a five-file plan instead of nine, one deletion slice
instead of a GSAP repair, a repaired tier policy with an explicit pending phase, a deleted
measurement gate, and a new A0r reconciliation step that blocks the affected slices until P3,
the token provenance, the controller internals, the deletion allowlist and the CTA contract are
all in hand.

**Recommended next action:** run **A0r** to produce the ten recorded receipts. Apply P2's nine
document payloads as **section replacements** over the originals — never as whole-file
overwrites — preserving `ASTRA-REPLY.md`, `VERIFICATION-NOTES.md` and this file as immutable
evidence.

---

*P2 adjudication · 2026-09-21 · 12/12 confirmed · identity unverified · file under rule 86*
