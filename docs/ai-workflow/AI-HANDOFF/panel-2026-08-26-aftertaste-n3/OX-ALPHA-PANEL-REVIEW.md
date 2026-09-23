# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/aftertaste-n3-roster-slice-packet-2026-08-26.md
**Seed:** (none)
**Tokens:** 2596 in / 4593 out · **Cost:** ~$0.0000 · **Wall:** 165.7s · **finish:** stop

---

## VERDICT

REVISE — the failure honesty is real and the fixes named are real, but the two slice failures (B1/B2) got per-tool patches when the doc itself asks whether a class guard exists (it does), the registry↔manifest clip drift ships as permanent WARN noise, and the truncation-tolerant generator has no completeness gate closing the loop behind it.

## BLOCKERS

1. **P1 — Truncation-tolerant generation with no completeness assertion reproduces the project's named failure class by design.** §2: "every block is judged and written independently so a truncated response yields usable assets instead of none." Concrete scenario: a future LLM authoring pass truncates after 6 of 9 enemies → 6 valid assets land, gate sees 6 VALID manifests, nothing compares the emitted ID set against the roster's expected ID set → roster ships silently incomplete, exactly the "instrument reported clean when it didn't run" pattern of B2, except this time the tool *architecturally cannot* notice. The grease-fly refusal was caught because the *generator* refused one block; nothing catches a block that was never generated at all. Evidence: §2 (independent per-block write policy), §4-B8 (five enemies specced and not built — proving the "expected vs built" delta is currently invisible and tolerated). Fix: post-generation gate asserting `set(built_ids) == set(spec_ids)`, failing with the missing IDs named.

2. **P1 — Registry contract (5 clips) vs authored reality (1 clip) reconciled as WARN, i.e., not reconciled.** §1: "The four unauthored clips surface as a WARN." Scenario: every future run emits 4 warnings that mean "known debt," training everyone to ignore validator WARNs; when a clip *is* authored but misnamed, the signal is buried in identical noise. This is textbook contract drift with no owner and no expiry date. Evidence: §1 ¶3. Fix: either the registry drops to 1 clip with the other four as explicit TODO entries carrying a slice number, or the WARN carries a `contract-version` field so stale-contract warnings are distinguishable from real regressions.

3. **P1 — Two of four shipped assets have no collision hull and the document never says whether that's intended.** §3 table: fryling and drip-cyst show `collision: —`. Scenario: a consumer of the manifest assumes hull presence, physics queries against fryling no-op, enemies pass through — discovered in-engine, not at the gate. If props are deliberately hull-less, that rule lives in someone's head, not in the validator. Evidence: §3 table rows 1 and 4. Fix: encode the rule (`rig:none` ⇒ hull optional; enemy ⇒ hull required) in the validator and let it fail loudly.

4. **P2 — B1's fix is exactly the per-tool patch the doc suspects is insufficient, and it's provably incomplete.** §4-B1: refuse when `out_dir` holds *a manifest* — but a previous crashed run leaving partial GLBs with no manifest sails straight through and gets clobbered/mixed. And `--force` performs the destructive write with no stash. Evidence: §4-B1, including the doc's own admission: "nothing stops the next tool from doing the same." See HIGHEST RISK for the class fix.

## ATTACKS

**Correctness**
- **Animated LOD0 over static LOD1/2.** §1: only LOD0 carries skin/clip. At runtime, crossing the LOD distance threshold swaps an idle-swaying mesh for a frozen one — visible pop every boundary crossing. Nothing in the doc addresses whether the engine freezes animation below LOD0 or accepts the pop. Unhandled design path, not just an implementation detail.
- **Rest-pose containment vs animated extents.** `worldAabb()` (§1) composes node transforms at rest. The idle sway moves the tip bone; the *animated* visual mesh can exceed the rest-pose AABB that the collision hull was validated against. Small for a sway, but the containment rule's guarantee is quietly weaker than claimed.
- **drip-cyst numbers don't reconcile.** §3 text: "descends 271 → 199 → 124 → 112"; §3 table: LOD0/1/2 = 469/199/112. Where did 271 come from, and why does the table's LOD0 (469) precede the text's chain start (271)? Either a step is elided or one of the two records is wrong — and this project's whole thesis is that records must be trustworthy.
- **Partial stage execution vs `plan()` sentinel.** §1: plan is conditional on `--skeleton` because the run record refuses disagreement. Unstated: if `rig` starts and dies mid-stage, does the run record show attempted/executed/failed, and does the sentinel logic handle the three-state case or only the binary?
- **Idle loop seam.** 24-frame sway (§1): nothing verifies frame 24 interpolates cleanly back to frame 1. A non-looping idle pops once per second, forever, on every enemy.

**Security**
- Lower stakes here (build-time pipeline, no network surface described), but: `--force` (§4-B1) is an unauthenticated destructive override on a directory path; if `--out` ever takes a path influenced by spec content (enemy IDs → filenames), a hostile spec field could aim the destructor. Enemy IDs come from an LLM (§2) — validate IDs against `[a-z0-9-]+` before they touch filesystem paths.
- Zero-PII rule: the roster's "IP row naming three nearest commercial comparisons" (§2) sends third-party product names to an LLM. Not PII, so compliant — but worth noting the spec fields flowing to the model are broader than geometry and nobody has enumerated them.

**Data-truth / schema drift**
- Registry 5 clips ↔ manifest 1 clip (Blocker 2) — live drift shipping green.
- Manifest says `textureMB: 0` on every asset (§4-B7) while the art law promises texture-baked detail: the manifest is *accurate* today but the schema field is a standing lie-in-wait — the day bake exists, every consumer that assumed 0 breaks.
- "collision ≤ 25%" ambiguous between triangle count and hull volume (§4-B9), with enforcement silently picking one interpretation. Undocumented interpretation = future drift between spec text and validator behavior.
- Byte-identical reproducibility (§3) implicitly requires manifests to contain no timestamps and GLBs no generator/version churn. If either manifest or export embeds a Blender version string, the claim is version-pinned and nobody said so.

## HIGHEST RISK

The recurring failure class — an instrument reporting clean over work that didn't happen — now at ten instances, with B1 and B2 being fresh specimens *after* the pattern was named. The doc asks (§5 Q2) whether one guard covers the class. It does: **(a)** every subprocess invocation goes through one shared runner that captures exit code, refuses comparison/reporting on nonzero, and hashes artifacts before-and-after; **(b)** every write goes through one shared io helper that only accepts an empty/staging target and commits via atomic rename — no tool may name a live directory as `--out`, `--force` becomes a staging-swap flag rather than a delete flag. Both are ~a day of work because B1/B2 fixes already exist locally in two scripts — they just need lifting into the shared layer everything else imports. Cheapest de-risk before ship: grep the repo for direct `open(...,'w')`/`shutil` against `out_dir` and for hash-comparison code not going through the runner; the count should be zero.

## CONFIDENCE

Could not verify from the document alone:
- **Whether the idle clip loops and at what fps** — settles with the GLB's animation sampler/inspector output, or a one-line statement about export fps and end-frame interpolation.
- **Whether manifests/GWBs are genuinely deterministic** (the byte-identical claim) — settles by diffing a manifest for timestamp/version fields, and stating the pinned Blender version.
- **Whether fryling/drip-cyst hull absence is intentional** — settles with one sentence mapping role→required-artifacts, ideally encoded in the validator.
- **The 271-vs-469 drip-cyst discrepancy** — settles with the full ladder log for that asset.
- **Line counts vs the ≤300 rule** — B3's extraction suggests `stages.py` is near the ceiling; I cannot confirm compliance or whether the dedent workaround is load-bearing fragility.
- House rules: no UI/chart/palette/credential content appears in this document, so I find **no violations** — but also no evidence of compliance; the roster's health-language wording ("hydration/fiber/greens/movement") is clean of banned terms, and credentials aren't mentioned. Whether the *game* elsewhere honors them is outside this packet.
- My biggest uncertainty: I'm reviewing prose claims about tools I cannot run. Every "verified in the bytes" and "29/29 selftests" is taken on trust; the entire review assumes the author's instrumentation is honest — which is precisely the thing this project has been wrong about ten times. An independent re-run of the gate by another seat is the only real settlement.
