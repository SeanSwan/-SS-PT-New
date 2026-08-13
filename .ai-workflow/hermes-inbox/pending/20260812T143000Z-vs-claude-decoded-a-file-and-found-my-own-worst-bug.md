# I decoded a real file, and the engine called two unrelated clips a match

**Surface:** Creator media pipeline · **Agent:** vs-claude (Opus 5)
**On main:** `2010ec530..36d240f8d` · 79/79 mediaSync · no schema change

## The point of the exercise, and it paid immediately

The sync engine had 65 unit tests and ~2500 fuzz cases and had **never opened a file**.
Every fixture was a Float32Array a test invented. Building the ffmpeg extraction layer was
the only remaining test that could find bugs none of us could see from inside the maths.

First real run — stereo 48kHz AAC camera vs mono 44.1kHz AAC mic, true offset +12.5000s —
recovered **+12.5001s**. Drift with a synthesised 300ppm clock error: **-295.2ppm**,
correct sign, resample ratio the exact inverse.

## The confidently-wrong answer, produced on purpose instead of argued about

```
both files stereo, read interleaved -> offset 25.0000s, usable TRUE, margin 3.26
both files correctly downmixed      -> offset 12.5000s, usable TRUE, margin 3.27
```

Exactly 2x wrong, passing every gate, at a margin **indistinguishable from correct**. No
downstream check can separate those two rows, which is the whole argument for putting the
defence at the decode boundary (`-ac 1`) rather than in a heuristic later.

**Rule: when you document a failure mode you cannot yet reproduce, the next step is to
BUILD the reproduction. A hazard you have only reasoned about is a hazard whose severity
and preconditions you are still guessing at.**

## The one I got wrong, propagated, and had to correct

I had recorded the interleaving trap as triggering on "any stereo mishandling." **It
requires BOTH files stereo.** One stereo against one mono is REFUSED (peak 0.183), because
mismatched 2x stretch destroys correlation rather than preserving it. I wrote the
over-broad version into a memo as fact, from a reviewer's finding I had not reproduced.

**Rule: a finding inherited from a reviewer is a hypothesis with better provenance, not a
verified fact. Reproduce before you write it into the corpus as a rule.**

## The worst defect, and it was entirely mine

A 3-second clip sharing **NO content** with a 90-second take returned offset -1.3376s,
`usable: true`, peak 0.5566.

The overlap floor degrades when geometry cannot supply 8s (flags `lowOverlap`) — but the
peak gate stayed at **0.3, a number calibrated FOR 8s of overlap**. Measured worst spurious
NCC between unrelated speech envelopes, 400 trials each:

```
 1s -> 0.963    3s -> 0.682    6s -> 0.403    12s -> 0.271
 2s -> 0.651    4s -> 0.461    8s -> 0.349    16s -> 0.242
```

At 1s, pure chance reaches 0.963. Below the floor the gate was not strict or lenient — it
was **meaningless**, and the observed 0.5566 junk peak sits exactly where the table says.

**Rule: a threshold is only valid inside the regime it was calibrated for. When a guard
DEGRADES (relaxes a floor, shrinks a window, drops a requirement), every threshold that
depended on it must be re-derived or the whole result must be refused. Degrading the
premise while keeping the conclusion is how a safe system starts lying.**

I deliberately did NOT fit a replacement curve: two independent measurements of the 8s
point disagreed (0.268 vs 0.349), so the curve is sensitive to my synthetic envelope model,
and fitting one would repeat the original error of calibrating against a distribution I
chose. Refusal costs nothing — 500 known-offset fuzz pairs gave 476 usable+correct, **0
confidently wrong, 0 legitimate pairs lost.**

## Mistakes I made

- **Shipped a guard whose lower bound protected against nothing and nearly refused a valid
  file.** ffprobe estimated 532s for a raw ADTS stream whose real content was 308s (ratio
  0.579 against my 0.5 floor — 0.079 of margin), and the error message would have blamed
  channel handling for an unreliable container estimate. Interleaving always lands >= 2.0,
  so the lower bound was pure false-positive risk. Now one-sided.
- **I asserted a guard "still catches the real thing" by citing an earlier measurement
  instead of executing it.** Caught myself and extracted it into a tested pure function.
  Untested arithmetic in a safety guard is not a guard.
- **I saw anomalous output and dismissed it.** An import smoke test printed a stray `}`; I
  moved on. It was the fixture generator executing on import and silently regenerating
  every fixture with DEFAULT parameters — which later produced measurements that
  disagreed with the run that supposedly created them, and I could not explain the numbers.
  **The anomaly was visible at the moment it happened and I chose not to look.**
- **My own test could not reach the regime it was meant to test.** The ratio-invariance
  probe returned empty rows for 3-8s because those cases are now refused, and I nearly read
  "no data" as "no problem."
- **Sixth consecutive cycle in this workstream where my test/harness, not the shipped code,
  was the defect** (drift windows sliced without offset alignment; a dead field name
  `predictedErrorAtEndMs` I reintroduced after it had already been renamed for lying).
  At six in a row this is the base rate and I should assume it first.

## External-model calibration — Kimi K3, $0.05, one pass

- **Q1 (gate design) — its best work, unverified-but-promising.** Proposed replacing the
  absolute peak gate with a **peak/runner-up RATIO >= 2.0**, arguing it is overlap-invariant
  because peak and background inflate together (~1/sqrt(N)). Measured: spurious worst ratio
  1.68 (16s) / 1.41 (30s) vs true-match minimum 2.43 / 2.23 — real separation, but thinner
  than claimed, and my probe could not reach the sub-floor regime it targets. **Deferred to
  its own slice with proper calibration; a gating change on thin evidence is how the
  original bug got in.**
- **Q2 (AGC breaks sync) — mechanism real, severity REFUTED.** It predicted DJI's always-on
  AGC would drag correlation toward zero at the true offset. Tested with simulated
  compression up to 60:1 plus aggressive noise gating: sync survived every setting, error
  **0.6-6.3ms against a 33.3ms frame**, peak degrading only ~8% (0.981 -> 0.89-0.93). At the
  harshest gate the error was SMALLEST, because gating sharpens onsets. `standardize()`
  already removes slowly-varying gain, and AGC release (1-3s) is slow relative to
  syllable-rate features.
- **Q3 (short-clip tiering) — a design proposal for Sean**, not a bug.

**Rule: a mechanistically sophisticated prediction is still a prediction. Kimi's AGC
reasoning was better physics than mine and still wrong about magnitude — because it
reasoned about the signal and not about `standardize()`, which was already in the code it
was reviewing. Test the claim against the ACTUAL system, not against the model of the
system in the reviewer's head.**

## Dry-loop ledger

| Round | Vantage | Result |
|---|---|---|
| 1 | attack extraction: stream selection, memory, stderr | **FOUND 3** |
| 2 | ratio guard vs real container metadata | **FOUND 1** — near false-refusal |
| 3 | argument injection, import side effects | **FOUND 2** |
| 4 | CLI arg validation, non-finite samples | **FOUND 2** |
| 5 | degenerate inputs (identical, 3s clip, concurrency) | **FOUND 1** — the worst one |
| 6 | 500-pair fuzz to quantify the gating change | CLEAN — 0 wrong, 0 capability lost |
| 7 | full backend regression | CLEAN — same 6 pre-existing failures |

`CLEAN x2 (rounds 6, 7)`

## Open — for Sean, not silently retuned

**The 8s floor is itself marginal.** Worst spurious at 8s measured **0.349, ABOVE the 0.3
gate**, while p99 was 0.280, below it — so roughly 1% of genuinely unrelated pairs can clear
the gate AT the floor. Moving the floor is a capability decision with real cost to short
takes, and my two measurements disagree at exactly that point, so I am reporting it rather
than quietly changing it. Kimi's ratio-gate proposal is the strongest candidate fix.

**Still not proven:** no actual A7R IV or DJI file has been through this. Synthetic speech
is not speech. What IS proven is every mechanical link between a file on disk and a number —
demux, stream selection, downmix, resample, float conversion, sign convention.
