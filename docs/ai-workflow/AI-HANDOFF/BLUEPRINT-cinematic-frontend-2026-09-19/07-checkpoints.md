**P2 amendment applied 2026-09-21. C0, C3, C4 and C6 replaced; C2's existing viewport and
accessibility thresholds retained. P1 text preserved in `/tmp/p1-originals-20260921/07-checkpoints.md`
(md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21.**

**C0 — provenance and authority**

Pass only when applicable A0r receipts exist. P3 overlap, reference-token provenance, deletion ownership, controller internals and CTA wiring must be resolved before their dependent slices.

The packet's HEAD is historical input, not a verified current implementation baseline.

> **A0r status against C0, as of 2026-09-21.** P3 overlap ✅ resolved (zero, both directions).
> Reference-token provenance ✅ resolved (`crystallineSwanTokens` L125–151 = the approved Swan palette
> verbatim; F-Alt's `secondary` role carries an **unresolved hazard**). Deletion ownership ✅ resolved
> (one file, zero exclusive assets). Controller internals ✅ resolved. CTA wiring ✅ resolved (symbol is
> `onOpenOrientation`; **two product conflicts outstanding**). **Receipts are complete for 7 of 10
> items; screenshots were not taken and no production build was obtained.** C0 therefore **does not pass
> in full** — it passes for the five named concerns above and remains open on baseline capture.

**C1 — Policy gate** *(unchanged from P1)*

Pass when:

- All specified capability cases pass.
- No optimistic enhancement request occurs before detection.
- Reduced-motion and connection changes reach mounted callers.
- Subscriptions remain stable and clean up under Strict Mode.
- Final consumer sweep finds no independent cinema-tier detection or old runtime tier literals.

**C2 — static surface additions**

Retain:

- Text contrast ≥4.5:1.
- Interactive targets ≥44px; primary CTA ≥48px high.
- 375×812, 414×896, 768×1024, 1280×800, 1920×1080, 2560×1440 and 3840×2160.
- Usable 200% text zoom.
- Exact Act-1 copy appears on V4.
- The existing orientation action remains reachable by keyboard and touch.
- Reduced, failed, and pending states retain the same content and CTA.

Add:

- Reference provenance recorded.
- Twelve-section order retained.
- Poster resolution adequate at the actual rendered size.
- First-frame silhouette registration differs by no more than one CSS pixel from the accepted poster capture at the tested size.
- Poster/canvas handoff produces zero change to the reserved layout box.
- Orientation opening and return behavior match the verified existing contract.
- Poster dimensions prevent scene-loading layout shift.

> **C2 blocker from A0r.** *"Exact Act-1 copy appears on V4"* cannot be evaluated until the CTA copy
> conflict is ruled: the plan says `Book an orientation`, production ships `Find a Trainer`
> (`HeroSection.tsx:136`). Likewise *"the existing orientation action remains reachable"* is
> **currently satisfied** by `Join the Community` → `/signup` and `Find a Trainer` → `onOpenOrientation`;
> the plan's *"No secondary hero CTA"* clause would remove the former. See `A0r-INTAKE-RECEIPT.md` §12.

**C3 — lifecycle**

- One hero controller maximum; its two-buffer presentation is allowed.
- No hero construction before ready/full eligibility.
- Construction, import failure, deadline, late completion, context loss, route exit and live preference change preserve complete content.
- No reveal replay after terminal states.
- After settlement, no hero frame submissions during a two-second observation without resize or other legitimate invalidation.
- After disposal, zero owned scheduled callbacks and no callbacks into the unmounted component.
- Ten mount/unmount cycles return owned resource counters to baseline.
- CSS and JavaScript reduced-motion gates pass independently.
- Header behavior and resource ownership remain unchanged.

**C4 — performance**

**Keep:** the five-run mobile lab LCP gate, nearest-rank p75 ≤2500ms. Record all five values and the LCP element. This is not production field p75.

**Replace canvas/DPR gate:**

- Hero delta: displayed canvases ≤1; WebGL contexts ≤1; detached scratch canvases ≤1.
- Display ratio ≤2.
- Scratch side ≤2048px; scratch pixels ≤4,194,304.
- Record whole-page/header totals separately.

**Replace `<3ms/frame>`:**

- Five fresh reveal mounts at 375×812 and 2560×1440, DSF 2, recorded real-GPU hardware and a 60Hz display.
- During each beat, nearest-rank p95 interval between successful presentation callbacks ≤25ms; no interval >50ms.
- No hero-attributable synchronous startup task ≥50ms.
- Include first frames; report startup separately from the running beat.
- Record CPU update/render/blit-submission spans separately. They are not GPU time or final display latency.
- Optional GPU query results are diagnostic only.
- Missing attribution or presentation evidence makes the affected criterion **INCONCLUSIVE**.
- These are project acceptance thresholds, not claims of industry consensus.

A failed full-scene gate leaves A8/A9 unaccepted. Static acceptance remains separately reportable.

**C5 — React staging gate** *(unchanged from P1, with one cohort note)*

B1:

- React remains 18.
- Each upgraded dependency has verified peers, frozen versions, caller tests, and independent rollback.
- No forced peer resolution.

B2:

- Cohort install is reproducible.
- Type checking and production build pass.
- Real affected callers pass runtime tests.
- Render-error capture is verified, including deduplication.
- Cohort rollback restores the verified React 18 baseline.
- **R3F 9 is not part of this cohort** — the cancelled home adoption was its only justification.

**C6 — evidence receipt**

Record changed paths, retained base hashes, commands/results, screenshots, browser/GPU details, unresolved items, and the final operator-filed review identifier.

This consultation supplies proposed amendments and test specifications. It provides no executed tests, screenshots, build measurements or runtime certification.

> **C6 note for whoever runs A11.** A0r produced the first real receipts in this workstream: HEAD
> `6e45e239`, 1,295 dirty paths, zero type errors at 8 GB heap, header chunk sizes from the preserved
> 2026-09-20 `dist/` (entry 596 KB · three 459 KB · mesh 290 KB). The production build was **blocked by
> the sandbox's delete guard**, not by the repo. LCP and screenshots remain uncaptured. Carry these
> forward rather than re-deriving them, and record the `NODE_OPTIONS` heap prerequisite.
