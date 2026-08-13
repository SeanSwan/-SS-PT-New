# My test was structurally incapable of finding the bug it was testing for

**Surface:** Creator media pipeline · **Agent:** vs-claude (Opus 5)
**On main:** `4ea23a5fa` (unchanged — review turn, no code shipped) · 79/79 mediaSync

Hostile review round 2 on the extraction layer. Kimi K3, $0.14, truncated at max_tokens
(sections 3–4 lost). **No code changed. Two PLANNED changes were killed**, which is the
cheapest possible outcome for a review.

## The lesson: a passing test can be vacuous by construction

I tested whether DJI's automatic gain control breaks audio sync. I applied an ffmpeg
compressor to the mic file, swept severity to 60:1, and measured ~8% peak loss with sync
intact. I concluded the risk was refuted.

**The compressor was keyed by the same signal I then correlated.** So every gain event was
synchronized to content BOTH files share. Real AGC is driven by the microphone's PRIVATE
input — wind, handling noise, the wearer's chest proximity — which the camera never hears.
The failure mode is a gain excursion that suppresses shared speech in ONE copy at a moment
nothing in the shared signal predicts. My test could not generate that. Ever. At any
severity setting.

Rebuilt with `sidechaincompress` driven by an independent key:

```
correlated gain (my vacuous test):  peak 0.981 -> 0.90-0.93   (~8% loss)
UNCORRELATED gain (real mechanism):  peak 0.981 -> 0.65-0.80   (~20-34% loss)
```

**Rule: when a test passes, ask what the test CANNOT produce. A sweep across parameter
values proves nothing if every value shares the same structural flaw — I swept five
severities of a test that was vacuous at all five, and read the consistency as robustness
rather than as the signature of a stuck variable.**

Corollary that caught me twice more this session: **identical results across a wide
parameter range are a red flag, not a green one.** My first sidechain sweep returned
0.693/2.31 to three decimals across a 5x range — saturation, not stability. My sub-floor
ratio probe returned exactly 1.00 for six consecutive lengths — degeneracy, not a finding.
Both times the constant output was the bug in the harness.

## The reviewer was right about my reasoning and wrong about my conclusion

Kimi also corrected WHY the sync survives: I claimed standardization removes the AGC gain.
It does not — standardization removes CONSTANT gain, not time-varying gain. What actually
saves it is that a 1–3s release reweights window regions essentially at random relative to
envelope fine structure, so normalized correlation barely attenuates.

Right answer, wrong reason — and the wrong reason is precisely what concealed the untested
case. **A correct conclusion resting on a wrong mechanism will not tell you which inputs
fall outside it.**

Its severity prediction stayed refuted after the fix: ducking the mic to 1% for 3 of every
5 seconds (60% of the audio destroyed, uncorrelated) still gave the correct offset to
**0.2ms** at margin **1.91** against a refusal boundary of 1.0. The planned
rolling-normalization step is **deleted, not deferred**.

## I refuted the reviewer's proposed fix — in the regime it was proposed for

Kimi's headline proposal across both rounds: replace the absolute peak gate with a
**peak/runner-up ratio >= 2.0**, argued overlap-invariant because peak and background both
inflate ~1/sqrt(N).

Measured at 3s overlap against a 60s reference — the ASYMMETRIC pairing that actually
occurs — 80 trials per search width: **worst spurious ratio 2.11–2.66, above its own 2.0
gate.** It would pass exactly the junk it was designed to stop. Separation also NARROWS as
overlap shrinks (30s: 1.41 vs 2.23 · 16s: 1.68 vs 2.43 · 12s: 1.93 vs 2.20) — the opposite
of the claimed invariance.

**Rule: test a proposed fix in the regime it is proposed FOR. Both the proposer and I had
only measured 16–30s, where the gate looks plausible; it fails at 3s, which is the only
place it was ever needed.**

I had already parked this proposal as the recommended fix in a pending Linear capture.
That capture is now corrected in place. **A recommendation that survives into a backlog
outlives the conversation that qualified it** — refuting it is not finished until the
artifact carrying it is fixed.

## Mistakes I made

- **Shipped a vacuous test and reported its result as a refutation.** Not a wrong number —
  a test that could not have produced the failure at any setting.
- **Read parameter-invariance as robustness, twice.** Identical outputs across a 5x sweep
  and six consecutive 1.00 rows were both stuck harnesses.
- **Explained a correct result with a wrong mechanism**, which is what made the blind spot
  invisible to me.
- **Nearly left a refuted fix sitting in a backlog capture** as the recommended action.
- **Ninth cycle in this workstream where my test/harness, not the shipped code, was the
  defect.** This is the base rate. I should suspect the harness first, not last.

## External-model calibration — Kimi K3 round 2, $0.14, TRUNCATED

Its two strongest contributions were both attacks on MY reasoning rather than my code:
naming the exact structural property my AGC proxy could not reproduce, and pointing out
that my "the refusal hides the data" excuse was false because `findOffset` returns
peak/prominence even when it refuses. Both were correct and both unlocked real
measurements. Its own proposed FIX was then refuted by the measurement it enabled.

**Rule: a reviewer's value is not its prescriptions — it is the questions it makes
answerable. This one's fix was wrong and its critique was decisive.**

Cost note: hit `max_tokens=9000` and lost sections 3–4. Third truncation this session, all
on the largest packets. Small packets, few questions.

## Dry-loop ledger

| Round | Vantage | Result |
|---|---|---|
| 1 | sidechain AGC keyed by an independent signal | **FOUND** — original test structurally blind |
| 2 | intermittent gust key | **FOUND** — my sweep was saturating |
| 3 | direct uncorrelated gain automation | CLEAN — margin 1.91 at 60% destruction |
| 4 | sub-floor ratio read from REFUSED results | **FOUND** — ratio gate refuted |
| 5 | long-reference asymmetric pairing | CLEAN — degeneracy was my setup; refutation holds |

`CLEAN x2 (rounds 3, 5)`

## Open

The 8s floor marginality (worst spurious 0.349 vs the 0.3 gate) is **still open** — the
obvious fix is now eliminated. Refuse-below-floor remains the only measure that works
there. Any future proposal must be validated at 2–8s against a LONG reference; equal-length
short pairs go degenerate (the ±500ms guard band swallows the search, prominence collapses
to 0, ratio is identically 1.0) and will produce a vacuous pass.

Still no real A7R IV or DJI file has been through this — and this round is the argument for
why that matters: fixture construction hid a mechanism for an entire review cycle.
