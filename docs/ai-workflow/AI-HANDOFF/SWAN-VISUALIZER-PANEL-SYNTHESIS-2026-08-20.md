# SWAN VISUALIZER — PANEL SYNTHESIS & ONE-MONTH PLAN — 2026-08-20

**Panel:** GPT-5.6 Sol Pro · Kimi K3 · GLM 5.3 · Qwen 3.8 (local). Four seats, four returned clean.
**Cost:** $0.6498 total (Sol $0.6210, Kimi $0.0288; GLM subscription, Qwen local $0).
**Grok 4.6:** Sean authorised mid-run; the call was **blocked by the harness permission classifier**, not by policy. Needs a Bash permission rule. See §6 — there is also an unresolved constitution conflict.
**Packet:** `SWAN-VISUALIZER-VISION-PANEL-PACKET-2026-08-20.md` (9,035 chars).
**Verdicts:** REVISE (Kimi), REVISE (GLM), "No" on the headline goal (Sol, Qwen). **Zero seats endorsed the current plan.**

---

## 1. Unanimous finding: the 24-hour goal is unreachable as framed — and the criterion itself is wrong

All four seats independently reached this, and two did the arithmetic.

At a 30–60s dwell, 24h needs **1,440–2,880 perceptually distinct worlds.** Measured supply: ~18 clusters per kernel × **2 effective grammars** (the feedback trio is mutually 0.92–1.02, i.e. one grammar) ≈ **40–60 looks.** Short by **36–72×**. Closing that by kernel count alone would need roughly **80 kernels** at today's looks-per-kernel.

**But GLM landed the more important blow: the reference product fails this test too.** MilkDrop's own 100 presets at a 45-second cycle repeat every 75 minutes — 19 times a day. What Sean experienced as "endless" was never set size. It was *grammar breadth plus music reactivity.*

> **Perceived repeat is grammar recurrence, not state count.** A viewer recognises "the same machine with new settings" long before they exhaust the parameters. The trio's own numbers prove it: within-kernel spread already equals cross-kernel spread.

**Consequence for the goal:** "24h without a repeat" should be restated as a **grammar-recurrence target** — no *machine* returns within N hours — plus trajectory variety. That is measurable, honest, and achievable. The literal state-count reading is not, and chasing it optimises the wrong thing.

## 2. The instrument is worse than I reported

I found that colour (36/76 dims, kernel-invariant by construction) drags a 1.85 structural separation down to 1.07. **GLM showed the damage is larger than the nominal weights suggest.** Solving `1.07 = w·1.02 + (1−w)·1.85` gives structure an **effective weight of ~6%**, against a nominal 32%. The dimensions are not standardised, so the stated weights are not what the distance actually computes — variance-dominant dims swamp the rest.

Compounding, agreed across seats:
- **Occupancy is excluded from distance** while taste law #1 is "density to the corners" — so a mostly-empty world and a corner-dense world can score identical. The instrument is blind to the owner's first law.
- **Audio appears in zero descriptor dims** — the largest real entropy source in a 24-hour session is unmeasured.
- **One descriptor governs three things**: breeding selection, set-list ordering, and the kernel acceptance gate. All three inherit the blindness.
- **Cluster counts are sample-capped.** "18" comes from n=24 and cannot exceed 24. It is a collision rate, not a support-size estimate (Sol). Only the matched-n MilkDrop comparison survives.

## 3. The deepest point, which no one on this project had said

> **Variety is being measured on *states* while the product is *trajectories*.** (GLM)

And the corollary that indicts every number in the packet, mine included:

> **The declared instrument of record has never been used.** The packet says "he is the instrument of last resort" and then contains zero owner judgments. θ=0.08 was never calibrated to Sean's just-noticeable-difference. If his personal θ is 0.04 the engine has ~24 looks/kernel and several verdicts un-fail; if 0.12 it has ~9 and the verdict hardens. **Every absolute number in this programme is ungrounded.**

Fix is cheap: one 90-minute session, ~60 forced-choice same/different pairs, fit Sean's θ.

## 4. Granular control: the real bottleneck is a missing artifact, not missing sliders

All seats agree the claim is currently false as shipped. GLM named the bottleneck precisely, and it is not what I would have built:

> A flat 20-slider panel is **local hill-climbing with extra steps.** What is missing is the artifact the sliders would edit *into*.

There is no **Theme** object. Identity today is a genome hash — *instance* identity, not *authorship* identity. The missing model is:

```
Theme = kernelId + genome + paletteSpec + motionSpec + audioMap + lineage + name + version
```

The 16-command NL layer and an axis surface must be **bidirectional onto the same axes**, so typing "warmer" and dragging a slider are the same operation on the same artifact.

## 5. Taste must be a governor, not a fitness term

Kimi and GLM converged. Making taste a weighted term is actively harmful:
- selection pressure collapses variety to a single tasteful attractor;
- it is gameable — max-occupancy / min-edge-spread is a wall of static that scores well and is the owner's most-hated look;
- scalarising taste bakes in tradeoffs Sean never ratified.

**Correct pattern:** hard gates candidates must pass *before* the descriptor spreads them within the feasible set — occupancy floor/ceiling, edge-energy bounds, motion smoothness. The five enforced OKLab palette laws are the existence proof that this project already knows how to do this.

## 6. Panel claims I verified against the code — one confirmed, one refuted, one overstated

External review is a hypothesis until executed (Rule 30). Checked this session:

| claim | seats | verdict |
|---|---|---|
| No WebGL context-loss handling → a 24h soak will crash | GLM | **CONFIRMED.** `grep -rn "webglcontextlost\|webglcontextrestored" src/` → **zero hits.** Directly fatal to the stated goal. |
| World-id hash preimage omits kernelId/version → shared ids silently re-render | GLM | **REFUTED.** `canonicalBytes()` encodes kernelId, then version, then the vector (`genome.ts:133-146`). Residual is narrower: engine *semver* is absent, so a shader edit without a version bump re-renders ids. |
| MilkDrop `new Function` preset execution ships = arbitrary code execution | Kimi (P0), GLM (P0-if-ships) | **OVERSTATED.** Butterchurn *does* ship (`dist/assets/butterchurn-*.js` + presets), but presets load **by name from the bundled pack only** — there is no user-import path. Vendored-dependency risk, not arbitrary user code. Becomes a true P0 the moment an import path is added, which SWA-50 already contemplates. |

Also independently confirmed by me: cross-kernel breeding is undefined across 20/17/16/17-axis genomes — GLM said block it; it is already gated as of `e8bf375`.

## 7. The month, ranked by value-per-week (single builder)

Adopted from GLM's ranking, corroborated by Sol and Kimi, with my verified additions folded in.

**Week 1, days 1–3 — Descriptor surgery + taste governors.** Standardise dims to unit variance so stated weights are the computed weights; drop colour from the *governance* distance and report it separately as palette diversity; restore occupancy as a term. Convert taste from gauge to **hard gates**. Re-run both §3 tables. Zero new rendering work; it un-denies Pelagos and de-corrupts breeding and set-list at the same time.

**Week 1, day 4 — Sean's 90-minute calibration session.** ~60 forced-choice same/different pairs (engine–engine, engine–pack, pack–pack). Fit his personal θ. Until this exists every number is ungrounded, and it also validates the distance function itself.

**Weeks 1–2 — The Theme artifact + axis inspector.** The data model above, plus four tabs matching the existing axis groups, 44px slider/lock/numeric per axis, bidirectional command box, boot on last-loved. This is owner priority #1 and it does not exist today.

**Week 3 — Three or four genuinely new *machines*.** Stable-fluids velocity advection · reaction–diffusion (Gray–Scott) · GPU particle/verlet field · raymarched volume extending Pelagos. Each gated **structure-only ≥1.5** *and* Sean's eye same-day. This is the only lever that moves the ceiling.

**Week 4 — Long-form scheduler + the 24h soak.** Day-part arcs, drift trajectories through genome space, audio-map variants as a variety axis, **grammar-recurrence target ≥2h**. Then the soak on the 5090 — which requires the **WebGL context-loss handling that does not exist** (§6), leak policing, and a frame-time p99 gate, because 504 unit tests do not measure smoothness and the owner rejects choppiness on sight.

**CUT, explicitly:** MilkDrop parity-chasing (keep one regression snapshot — it is a class mismatch: 100 hand-written files ≈ dozens of grammars); learned-embedding training (permitted offline, not this month); layering/composition; node-graph grammar authoring; NL command expansion; cross-kernel breeding.

## 8. What this changes about the acceptance bar

I failed Pelagos at 1.07 against a 1.5 bar and declined to move the goalposts. The panel's answer is that the bar was measuring the paint box: structure has ~6% effective voice, not 32%. **The bar should be re-derived on a standardised, colour-free, occupancy-restored distance — and Pelagos re-run against it unchanged.** That is not moving the goalposts; it is fixing a ruler whose fault is now quantified, and re-running the same artefact against it. Sean ratifies the new bar before it governs anything.
