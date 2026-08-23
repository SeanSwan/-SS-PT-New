# Hostile Review Panel — 2026-08-23

**Document under review:** `docs/ai-workflow/AI-HANDOFF/SWANGUARD-S0-S2-REVIEW-PACKET-2026-08-23.md`
**Seed context:** (none)
**Seats run:** kimi, glm, grok · **Estimated spend:** ~$0.1466
**Coverage:** PARTIAL — 3 of 10 seats ran (sol, qwen, gemini, dspro, ox, fable, dsflash not requested).

> Fable 5 is the FINAL SEAT and the Final Decider (CLAUDE.md Co-Orchestrator
> Hierarchy, Rule 46). These seat replies are ADVISORY INPUT. Fable reads all
> of them, arbitrates contradictions against the house rules, and owns the
> verdict. A seat reply is a HYPOTHESIS until verified (Rule 30) — findings
> must be checked against the real code before any of them is acted on.

| Seat | Model | Status | Wall | Reply |
|---|---|---|---|---|
| kimi | Kimi K3 | ✅ ok | 55.3s | [reply](./KIMI-PANEL-REVIEW.md) |
| glm | GLM 5.3 | ✅ ok | 325.1s | [reply](./GLM-PANEL-REVIEW.md) |
| grok | Grok 4.6 | ✅ ok | 352.8s | [reply](./GROK-PANEL-REVIEW.md) |

## Failures
- none — all seats returned.

## Fable synthesis

**Every finding was executed before being acted on. Two of the seats' highest-confidence claims
were wrong** — which is the whole reason for the rule.

1. **Consensus, CONFIRMED and fixed:** the `e6bca37` short-circuit helped only the happy path, so
   every unknown key still cost a full `listStates()` scan before its 404 — read amplification on
   the caller-controlled REJECTION path (verified: 5 rejections were 5 full scans). And
   `evaluateMarkers` accepted an empty marker, because `''.includes('')` is true, so a present-entry
   with a blank marker passed forever while claiming to guard a surface. Both fixed (`94fea46`).
2. **Consensus, DISPROVEN by running it:** all three seats said `terms_not_recorded` was "a flag,
   not a gate". `sync()` refuses — `ran=false`, 0 items, blocker on the receipt — even for an outlet
   enabled before the gate shipped. All three also said a ghost holding state could be enabled; it
   was already refused. Right instincts, wrong mechanisms, and acting on them would have hardened
   paths that were already closed while leaving the real one open.
3. **Unique insight:** Kimi — put the existence check on a keyed lookup, not a filtered scan.
   GLM — the clock had "one consumer and zero producers". Grok — the `absent` arm is only as strong
   as the ledger's review discipline.
4. **Blind spot:** no seat could run anything; every one reasoned from the diff. Kimi's F8 ("the
   gate is not wired into the build") was wrong because **my packet's diff excerpt omitted
   `package.json`** — a defect in what I sent, not in what they read.
5. **Verified verdict:** REVISE, applied. Four commits: `94fea46` (scan + vacuous marker + enable
   hardening + explicit `hasState`), `319d6b3` (clock defaulted at the root, non-optional
   downstream — the type checker immediately found an unfixed caller), `4ff9c17` (the reachability
   receipt states the artifact's age rather than silently certifying a stale one).

**Spend:** $0.22 actual against $0.15 estimated (Grok $0.117, Kimi $0.101, GLM $0 subscription).

1. **Consensus** — what two or more seats independently flagged (highest signal).
2. **Contradictions** — where seats disagree, and which is right on the evidence.
3. **Unique insight** — a real finding only one seat saw.
4. **Blind spots** — what NO seat looked at, that a human reviewer would.
5. **Verified verdict** — the arbitrated call, with the findings confirmed against real code.
