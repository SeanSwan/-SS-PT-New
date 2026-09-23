**Replace C0, C3, C4 and C6; retain C2’s existing viewport and accessibility thresholds.**

**C0 — provenance and authority**

Pass only when applicable A0r receipts exist. P3 overlap, reference-token provenance, deletion ownership, controller internals and CTA wiring must be resolved before their dependent slices.

The packet’s HEAD is historical input, not a verified current implementation baseline.

**C2 — static surface additions**

Retain:

- Text contrast ≥4.5:1.
- Interactive targets ≥44px; primary CTA ≥48px high.
- 375×812, 414×896, 768×1024, 1280×800, 1920×1080, 2560×1440 and 3840×2160.
- Usable 200% text zoom.

Add:

- Reference provenance recorded.
- Twelve-section order retained.
- Poster resolution adequate at the actual rendered size.
- First-frame silhouette registration differs by no more than one CSS pixel from the accepted poster capture at the tested size.
- Poster/canvas handoff produces zero change to the reserved layout box.
- Orientation opening and return behavior match the verified existing contract.

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

**C6 — evidence receipt**

Record changed paths, retained base hashes, commands/results, screenshots, browser/GPU details, unresolved items, and the final operator-filed review identifier.

This consultation supplies proposed amendments and test specifications. It provides no executed tests, screenshots, build measurements or runtime certification.
