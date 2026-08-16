# Fable pre-read hostile pass — execution session (recorded BEFORE reading 86/87)

Timestamp: 2026-08-16, written while GLM 5.3 and Kimi K3 run. Not to be edited after their
replies are read; arbitration references this as the fourth-vantage baseline.

## HOSTILE FINDINGS (against my own session)

1. **P2 · "66.7% beat the baseline" is decoration at n=1.** Temp-0 single run makes the
   VIOLATION deterministic and reproducible (the kill stands), but the recall comparison
   carries no variance bound and should not be quoted as "the 14B is better at sorting."
   Fix: PORT-DECISION should caveat recall as single-sample; kill rests on the invariant.
2. **P1 · The harness silently drops hallucinated childIds.** `validIds.has(i.childId)`
   maps an invented id (or a name-string) to null — link-INTENT on a non-roster child is
   invisible. The gate still failed, so the verdict is robust, but a passing future run
   could hide link-intent. Fix: count dropped non-null childIds as a separate
   `linkIntentDropped` metric; treat >0 as review-required.
3. **P2 · needsReview invariant is trivially satisfiable.** The contract mandates it, the
   model complied everywhere; the metric can't fail unless the model disobeys formatting.
   It measures obedience, not judgement. Keep, but don't cite it as a safety result.
4. **P1 · "Zero minors in production" is over-strong as phrased.** The probe proves zero
   by BOTH AVAILABLE SIGNALS (guardian waivers, DOB). A minor with a null DOB and an
   adult-style signup is invisible to both. The sequencing call (dormant/backlog) survives,
   but the claim should be "no evidence of minors by either signal," and the plain-English
   "there are zero minors in your database" overstated. Fix: tracker comment + handoff
   wording already say "by either signal"-adjacent language; tighten where they don't.
5. **RESOLVED pre-read · plan-mode flat pricing vs runtime:** verified the debate engine
   reads SWAN_VILLAGE_SINGLE_PASS_DEBATES at runtime (recursive-consensus.mjs:50), so the
   fixed estimator matches execution; env-without-budgetProfile over-prices (safe,
   identical asymmetry to code mode).
6. **P2 · Packet §4 describes the harness rather than quoting it.** Reviewers can't attack
   code they can't read; the description could mask a scoring bug. Accepted cost for
   packet size — but if either reviewer flags scoring, quote the source in round 2.

## VERIFICATION GAPS
- Live flat plan-mode Village run (paid) still unexecuted — 5(c)'s final criterion.
- The 5 false positives were counted but not classified by trap; a class pattern
  (emotional input → invented tasks) is asserted from one instance.

## DISSENT (with my own framing)
- The packet frames the violation as "compression dropped the nuance." Alternative
  reading: the PRODUCTION contract never had an explicit "don't link a child named in a
  supply request" rule either — the nuance lives in the rules sorter's code, not the
  contract. If true, the port test partly measured a rule that was never in the source
  material, and "compression sheds safety" is the wrong lesson (the right one: prompts
  cannot carry code-shaped invariants at any length). Worth checking before the lesson is
  canonized further.

## VERDICT
REVISE (own work): verdicts stand (port dead, minors dormant, gate fixed), but findings
1/2/4 need wording and harness fixes before the artifacts are quotable.
