# Charts comprehensive hostile review: 8 real defects in shipped work, fixed DRY x2

- **When:** terminal VS Claude, worktree C:/tmp/ss-charts-g3. Linear: SWA-68.
- **Shipped:** afdab030d (8 fixes) + 7b0ad4b0e (confirmation-round refinement).

## Method that worked: 3 parallel adversarial reviewers + own pass
Reviewed all 5 shipped chart slices (G1/G4/G5/gravity/G3a) with THREE parallel Explore
agents each attacking one dimension (logic/edge-cases, a11y/UX/motion, data-truth/
integration), each required to return file:line + a concrete failure scenario or say
"NO REAL DEFECTS FOUND." Plus my own parallel pass. Found 6 defect classes / 8 fixes on
code that had ALREADY passed per-slice dry-loops. The multi-reviewer breadth caught what
per-slice review missed - especially CROSS-COMPONENT contradictions.

## Transferable defect patterns (watch for these)
1. **Cross-component contradiction:** two independently-correct components rendered
   opposite messages on the same state - the gravity bar said "Peak reached" while the
   coach line said "break the plateau" for a flat-at-best series. Per-component review
   passed both; only reviewing them TOGETHER caught it. Lesson: review the composed
   surface, not just each piece.
2. **Scale-blind thresholds:** a `Math.abs(delta) < 1` "steady" band silently swallowed a
   sub-1-unit NEW BEST for fractional metrics (body fat, est-1RM). Integer metrics hid it.
   Order checks so a genuine record is caught BEFORE a magnitude threshold.
3. **Rounding contradictions:** a value that rounds to "0"/"100%" while a sibling label
   rounds the other way ("0 from your best" at a 100% bar). Tie the label's visibility to
   the SAME rounded value the bar shows.
4. **Trailhead-truth in CSS:** a component header claimed a "glowing fill" but the glow
   box-shadows were clipped away by the track's overflow:hidden - dead code AND a false
   claim. Rule 75 applies to code comments too.
5. **Live-region-on-mount:** an aria role=status rendered already-populated is commonly
   dropped by VO/JAWS; set its text POST-mount (useEffect) to actually announce.
6. **Single-source counts EVERYWHERE:** G5 single-sourced the 15-chart deck in the summary
   + status util, but a SOCIAL-FEED renderer (ProofFeedCard) still hardcoded `|| 12` for
   the same denominator. When you kill a magic number, grep EVERY renderer including other
   subsystems (social feed), not just the obvious module.

## Rejected (not a bug): a "-20% vs prior" for a body-fat drop is factually correct - the
value text is not sign-colored, so no misleading red. Verify the color pipeline before
"fixing" a negative number.

## 3 PRE-EXISTING findings flagged to Linear (NOT swept - dry-loop law):
(a) ProofFeedCard shows "0 of 15" on EVERY real share because the posted caption format
doesn't match the card's parser and progressProofData is never set (separate Social-feed
bug, user-facing, recommend a dedicated issue); (b) FactPill alert red ~4.3:1 on safety
text; (c) LegendButton missing 44px min-width.

## Proof
progress-proof 67/67 (incl new D1/D2/D4/D5 tests); 650 consumer tests; build exit 0;
guards clean. DRY-LOOP: R1 (3 agents) 6 found -> R2 own-attack found D4 residual -> R3
composition clean -> R4 pushed+grep+650 clean = CLEAN x2.
