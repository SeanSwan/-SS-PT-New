---
originating_model: claude-fable-5
date: 2026-08-21
surface: design-brain / front-page atelier
decision: An approval gate must present the property being approved — motion approvals need a motion instrument; a still can only approve stillness.
status: shipped
supersedes: none
models_used:
  - model: claude-fable-5
    role: final decider + synthesis
    did: authored the next-slice plan brief, fired 4 seats, fused the plan, adopted the losing-shape correction
    cost: subscription
  - model: moonshotai/kimi-k3
    role: hostile seat
    did: reordered plan, kill-switch budgets, 300-line pre-decomposition; 12.3s wall
    cost: $0.0315 (disclosed worst case $0.9141, single approved call)
  - model: x-ai/grok-4.6
    role: hostile seat
    did: best absence-first list (FOIT, WCAG 2.2.2 pause, footage likeness rights, hydration, copy-as-module)
    cost: $0.0554
  - model: qwen-3.8-local
    role: free hostile seat (standing directive)
    did: independent convergence on the headline; keyboard a11y for scrub
    cost: $0
  - model: z-ai/glm-5.3
    role: hostile seat (slowest)
    did: the packet's title insight — split the approval probe (A0) from productization (A1)
    cost: $0 (subscription)
skills_touched:
  - id: design-render-gate
    change: amended-in-doctrine
    failure: rule 76's PNG gate cannot show motion; a scroll-journey direction was about to be approved (or built unapproved) from stills
---

# The approval instrument must match the medium

## The lesson

The front-page program had just fixed "nobody rendered the design" with a render-and-look gate
(rule 76). The very next plan almost shipped a subtler version of the same failure: asking the
owner to approve a **scroll-motion** direction from **static PNGs**, then building the expensive
scroll hero on that approval. GLM 5.3 named it exactly: *"a scroll-journey direction cannot be
approved from a static board; motion is the one thing rule 76's PNG gate cannot show."*

The generalization is bigger than design: **a gate certifies only the properties its instrument
can present.** A PNG gate certifies layout, not motion. A text panel certifies a plan, not
pixels (previous packet). A pass-count certifies assertions, not rewritten assertions
(test-delta law). Before trusting any approval, ask: *can the instrument used actually exhibit
the property being approved?* If not, the approval is about something else.

Remedy adopted: the owner's verdict instrument is a **≤3-day, noindexed motion probe** (scrub
sketch + headline + CTAs) — cheapest artifact that exhibits the property being judged.
Productization is gated behind it.

## Who did what

- **All four seats independently rejected hero-first** — Kimi, Grok, Qwen, GLM, no seat saw
  another's output. Convergence that clean on a brief is signal, not coincidence.
- **The slowest, free seat (GLM) carried the single best insight**, landing after the synthesis
  draft had marked it "still streaming." The cheapest seat (Qwen, $0, local) matched the
  headline consensus unaided. Seat count and seat diversity beat seat price on plan review —
  second consecutive panel where the cheap seats carried it.
- **Fable (me)** wrote the brief, fused the plan, and made the near-miss below.

## Skills created or changed

- Fused plan doctrine (handoff §3, `feat/front-page-atelier-run` @ `96ae75e1c`): Slice 0
  motion-probe verdict; static-poster-first hero; canvas frame-scrub committed with kill-switch
  budgets; `video.currentTime` rejected; approval instrument = the probe, not PNGs.

## Mistakes I made

- **I drafted the synthesis recording a still-running seat as "absent, findings appended if they
  land."** GLM completed four minutes later with the panel's best finding. False-absence family,
  another near-miss — a SLOW instrument is not an ABSENT instrument. What saved it was
  **structure, not vigilance**: the append clause kept the verdict open, so the late insight
  folded in without rewriting consensus. Durable form: while any instrument is still running,
  write conclusions open-ended or wait — never convert "not yet" into "no."
- **My handoff draft carried a cross-tree path with no tree qualifier** — the identical class
  that put two wrong paths in the previous session's handoff. Caught pre-commit this time
  because the path-existence sweep is now procedural, which is the point: the fix that survived
  is a sweep, not a resolution.
- **I emitted the closeout memo into the worktree's inbox while the closeout gate watches the
  main tree's** — the artifact existed and the gate still blocked, correctly, because it was
  invisible at the watched path. Same instrument-mismatch lesson at meta-level: an artifact
  satisfies a gate only if it lands where the gate can see it.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| "Not yet" converted toward "absent" | 1 near-miss | Yes — 3+ write-ups incl. this session's own packet | An append clause in the artifact — structural, not attentional |
| Cross-tree path unqualified in a handoff | 1 | Yes — prior handoff (2 instances) | Procedural path-existence sweep |
| Artifact emitted outside the gate's watched path | 1 | No — NEW | The gate itself; fix = emit to the drain's tree, not the working tree |
| Approval instrument mismatched to medium | 1 (caught by panel) | No — NEW (this packet) | An external seat; now doctrine in the fused plan |

**Highest-signal row:** the first. Three prior write-ups did not prevent the fourth approach to
the same cliff; what worked was building the artifact so the error couldn't close anything.
Write-ups describe; structures prevent.

## External-model calibration

| Seat | Cost | Wall | Findings real on verification | Worth |
|---|---|---|---|---|
| Kimi K3 | $0.0315 | 12.3s | high — reordered plan adopted nearly whole | fastest + most complete; keep |
| Grok 4.6 | $0.0554 | 123.7s | high — absence-first list adopted into standing gates | best per-dollar absence-finder, 2nd panel running |
| Qwen local | $0 | ~4min | headline + a11y confirmed | free convergence check; always seat |
| GLM 5.3 | $0 | slowest (~8min, stream stalled) | **the adopted title insight** | never drop for slowness |

Panel ≈ $0.09 actual vs $0.91 disclosed worst case. Pattern across two consecutive panels:
disclose worst case, cap, fire once — actuals land at 3–10% of disclosed.
