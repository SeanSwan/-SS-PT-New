# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/90-PACKET-R2-FIX-LEDGER.md
**Tokens:** 1838 in / 12444 out (reasoning: 10061) | total 14282
**Wall:** 177.5s

---

## FINDING-BY-FINDING

*Label note: declines whose stated reason I accept are marked DECLINED-ACCEPTED (the remit's "legitimately declined"); DECLINED-DISPUTED is reserved for declines I contest.*

- **GLM-DISSENT ("port is dead" overclaim)** — **ADDRESSED.** Retitle + corrected reasoning (tested variant lacked the deterministic link-guard that *defines* the pattern; hypothesis unresolved) is exactly the fix I asked for. Properly scoped.
- **GLM-1 (minors data quality / interim mitigations / probe auth)** — **ADDRESSED (mixed).** Data-quality half is genuinely fixed and then some: sanity totals (7 users / 12 waivers), DOB denominators (4/7 classifiable), claim narrowed — this *upgraded* the finding (3/7 NULL DOB, 1 an AI-chat user). Interim mitigations and probe auth: **DECLINED-ACCEPTED** — product/legal changes on the revenue path are O's call; a local SELECT-only shell diagnostic has no auth surface to gate. Residual objection to the tripwire bundling is filed under NEW-N3, not as a dispute of this finding.
- **GLM-2 (pre-register retry gate)** — **ADDRESSED, with a hardening gap filed as NEW-N1.** The gate as registered (fabricated=0, FP≤1, absolute bars, ≥3 seeded runs, counted-never-coerced, guard mandatory) covers everything I demanded. The omission is provenance controls — see N1.
- **GLM-3 (compute/publish precision/F1)** — **ADDRESSED numerically; phrasing defect filed as NEW-N2.** Numbers exist and are published. "Baseline wins outright" on a 0.03 F1 gap over ~15 fragments with *measured* run-to-run non-determinism re-commits the overclaim pathology this round was curing.
- **GLM-4 (non-determinism asserted, not measured)** — **ADDRESSED.** Second identical-config run, divergence documented (unflagged child items 1 vs 0; violation recurred), and it now *motivates* the ≥3-seeded-runs bar. This is the right shape. Aggregation rule across runs unspecified — folded into N1.
- **GLM-5** — *not separately cited in the ledger.* I read it as subsumed into the GLM-6 scoring-parity fix; if it was discrete, it is formally unadjudicated. Flagging for the record, not blocking.
- **GLM-6 ("byte-identical scoring")** — **ADDRESSED.** Retracted → "mirrored-by-construction"; shared scorer is a retry *precondition*, not a post-hoc claim. Co-cited with Kimi-5; fix verified on both readings.
- **GLM-7 (harness magic literal / verdict scope)** — **ADDRESSED.** `linkIntentDropped` in the pass gate (=0), `invalidTypes` kept as FPs, attribution-only banner, variant-scoped verdict. The literal's gate-power is removed; its full replacement by a structured flag remains a design note, which is acceptable residue, not cosmetic — the counters, not the string, now decide.
- **GLM-8b (spend-gate/seat drift)** — **ADDRESSED.** Single `PLAN_DEBATE_SEATS` constant consumed by both the gate and Phase 2A/2B/2C; drift structurally impossible *and the claim is scoped to plan mode*, which is the correct epistemic hygiene.
- **GLM-8c (env coupling)** — **ADDRESSED.** Verified at the cited site (recursive-consensus.mjs:50); failure direction is over-pricing = spend-safe. Accept.
- **GLM-8a/10 (live flat plan-mode paid run)** — **DECLINED-ACCEPTED.** Spend permission is O's; the claim is labeled "done minus live run," which is the honest label. Residual: no stated trigger/expiry for the run — tie it to O's post-memo decision point so it can't quietly rot as "done."
- **GLM-9 (git sweep)** — **ADDRESSED.** 19-file manifest, scanner identity, push status (LOCAL-ONLY, never pushed) published. History rewrite correctly offered, not executed.
- **GLM-11 (delivery to O)** — **ADDRESSED, with N4 caveat.** Memo shipped, options scoped, recommendation gated on the H0 gate and T's month-end answer; owner-per-step ledger exists.
- **GLM-12 (corpus count smelled wrong)** — **ADDRESSED — and the truth was worse than my finding.** 12 cases / 15 fragments / 3 zero-expect vs the claimed 20; the 20 was a sloppy grep; under-sampling against the ≥20 prescription disclosed. This is the corrective working as intended.
- **GLM-13 (5(a) clause diff)** — **ADDRESSED.** Clause-level verbatim record; restoration correctly Sean-gated.
- **GLM-14 (corpus provenance)** — **ADDRESSED, exemplarily on disclosure; sensitivity-scope caveat filed as N5.** Frozen as-found blob, weak mtime flagged as weak, author-exposure disclosed with a sensitivity run (9/14, violation unaffected).

No finding of mine is unaddressed-without-reason. The two history rewrites of the record (20→12; "committed"→never-committed) were self-surfaced in R2, which is to the packet's credit.

## NEW FINDINGS

**P0 — none.** The violation conclusion is stable (recurred in run 2; insensitive to case-1 exclusion), and the central overclaim is retracted.

**P1 — N1: the pre-registered gate omits the exact control whose absence invalidated round 1.** The corpus's fatal flaw was *no commit-order proof of sealing*, discovered only in R2 re-verification. The gate requires a "fresh sealed ≥60-item corpus" but (as described) does not require: (a) corpus commit hash recorded **before any variant run**, (b) author isolation — the session authoring the corpus must be disjoint from contract/scorer authoring (round 1's exposure was roster + scoring code + a trap label), (c) an aggregation rule across the ≥3 seeded runs (all-pass for fabricated=0? median for recall?). Pre-registering now and amending after O approves option (b) defeats the point of pre-registration. Cheap to fix, load-bearing for round 3's validity.

**P1 — N3: the tripwire is executable-now work mislabeled as O-gated.** Age attestation and the ToS clause are legitimately product/legal declines. A *scheduled* re-probe with nonzero-count alerting is an ops task on a local SELECT-only diagnostic — no product surface, no legal change. Current state on the production SaaS: one AI-chat user of unknown DOB (3/7 NULL), zero implemented ongoing detection, one-shot probe only, and the one-page memo (the artifact O actually reads) carries no minors-interim line — the gap lives in the handoff/ledger. Either implement the cron, or put one sentence in the memo making the interim risk acceptance O's informed choice. Drops to P2 if the memo line lands.

**P2 — N2: "baseline wins outright" is an overclaim on unstable ground.** 0.70 vs 0.67 F1, n≈15 fragments, non-determinism *measured* between identical runs, "variance" estimated from two samples. Correct phrasing: point estimates favor the baseline; gap is within run noise; the violation remains the sole decisive fact. Relatedly, the doc should state plainly that the current baseline (F1≈0.70) does not clear the retry bars (≥0.9/≥0.9) — passing means a materially new artifact, not an increment.

**P2 — N4: memo evidence base must carry n.** "Ship rules sorter now (53.3%/0FP/0violations)" should state it rests on 12 cases / 15 fragments of an under-sampled corpus, and whether the rules sorter (unlike the model variant) is deterministic — that's precisely why it's the safe recommendation, and saying so makes the memo stronger, not weaker.

**P2 — N5: sensitivity analysis under-scopes the author exposure.** Excluding case 1 cures *label* leakage; having read the roster and scoring code contaminates design-level choices (trap mix, thresholds) across all 12 cases. Historical conclusion unaffected — the violation stands — but the decision doc should not imply the 9/14 sensitivity fully de-biases the pilot. The fresh-corpus gate cures this going forward *only if* N1(a)/(b) land.

## DISSENT

- **On my own epistemics:** this ledger is self-reported narrative. I verified internal consistency, not blob `dee33868ad63`, the second run's logs, or the manifest's 19 files. My verdict is conditional on the stated artifacts existing as described — the same skepticism that caught 20→12 should apply to the fix report itself. R3 should spot-check at least the blob and one run log.
- **Against the likely pile-on:** the declines of the history rewrite and the live paid run are *correct* under repo law; forcing either would be worse process than the gap they leave. I also side with the repo constitution against Kimi's "process inflation" dissent — on child-data paths, the escalation tier is the one place process inflation is the feature.
- **Owning my miss:** GLM-12 smelled the count but I still accepted "committed corpus" as a frame in review 86. The never-committed revelation is as much reviewer blind spot as authoring fault. Intake rule for future rounds: programmatic counts and commit hashes demanded up front, not in R2.
- **On the verdict's meaning:** NOT CLEAN here is narrow and cheap. The packet's substance — retraction, disclosure of two record-corrupting facts, measured non-determinism, pre-registered gate — is genuinely good work. I am blocking on hardening a gate against the exact failure mode that caused this round, and one cron job's misclassification. Not bad faith; not cosmetic-repair; just not clean.

## VERDICT

**NOT CLEAN** — mechanical application of the remit's rule: no finding of mine remains unaddressed-without-reason, but two new P1s exist (N1: sealing/commit-order/author-isolation/aggregation absent from the pre-registered gate; N3: tripwire executable-now, mislabeled O-gated, minors gap absent from the memo O reads). No P0. Both P1s are fixable in a small R3: amend the gate registration before O decides on option (b), and either schedule the re-probe or add the one-line minors disclosure to `89-OPTION-MEMO-FOR-O.md`. Clear those two and the P2 phrasing items and this is CLEAN.
