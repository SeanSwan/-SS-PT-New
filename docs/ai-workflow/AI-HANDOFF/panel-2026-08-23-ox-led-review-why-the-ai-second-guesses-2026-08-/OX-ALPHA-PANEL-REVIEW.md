# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/OX-LED-REVIEW-WHY-THE-AI-SECOND-GUESSES-2026-08-23.md
**Seed:** (none)
**Tokens:** 2997 in / 3795 out · **Cost:** ~$0.0000 · **Wall:** 145.5s · **finish:** stop

---

## VERDICT

REVISE — the core diagnosis (governance apparatus crowding out product work, with zero damping and zero measurement) is well-supported, but the brief demands per-rule and per-hook verdicts (Deliverables A and E) without supplying the rule list or 9 of 14 hook names, so any seat that "complies fully" will be fabricating specifics — the deliverable spec must be revised before the ruling is actionable.

(Note on format conflict: §9 of the document demands PREMISE AUDIT → A–F → CONFIDENCE; my panel contract mandates VERDICT/BLOCKERS/ATTACKS/HIGHEST RISK/CONFIDENCE. I follow my contract and fold the premise audit and A–F substance into those headings rather than inventing a second structure.)

## BLOCKERS

1. **P1 — Deliverable A is unexecutable as specified.** §6.A demands "name rule numbers" for triage of 73 MANDATORY rules, but the brief never enumerates them — not even titles. No seat can honestly say "retire rule 41." Any reply containing specific rule numbers is confabulation. Required input: the full numbered rule table (or at minimum title + byte cost per rule). Evidence: §3 (`CLAUDE.md` 164,499 bytes, 73 rules), §6.A.

2. **P1 — Deliverable E is unexecutable for 9 of 14 hooks.** Only 5 Stop-gates are named (`hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate`, `dual-tier-gate`, `backup-after-work`). The other 9 hooks — including 7 explicitly documented as *undocumented* (§3) — have no filenames, triggers, or descriptions in the brief. Ruling keep/merge/retire on unnamed hooks is impossible. Evidence: §3, §6.E.

3. **P1 — The brief's own headline metric is selection-biased in the way §7.1 admits, yet §2 still deploys it as the thesis anchor.** "11 commits, 0 files under frontend/ or backend/" comes from a session *tasked with mechanism work*. Leading the evidence section with it primes every seat toward "the agent wastes time" before the competing hypothesis in §4 gets fair weight. This is precisely the interested-party framing §7.6 warns about — the author flags it and then does it anyway. Not fatal, but the round-2 synthesis must re-weight this, or the final ruling inherits the bias.

4. **P2 — Round-2 design manufactures the exact failure mode §7 describes.** A prior panel had 7/7 seats echo a false premise. Round 2 hands ox-alpha all four round-1 replies *including its own* before the final ruling — that is a herding mechanism, not a correction mechanism. Independence exists only in round 1; the deliverable Sean acts on is the round-2 consensus artifact. If the goal is anti-echo, round 2 should include at least one adversarial seat whose round-1 reply ox has NOT seen, or require ox to restate its round-1 position before reading others.

## ATTACKS

**Correctness**
- Commit `28125d082` — "fix: absent input read as clean (**twice, same session**)". The same null/absent-input bug was introduced and re-fixed twice in one day. That means the guard's test suite does not cover the absent-input path, and the fix process itself regressed. Pattern-level risk: every new guard added under pressure will repeat this until there is a mandatory "empty/absent/malformed input" test template for guard code.
- `d650f4c2d` — hung subprocess in a freshly wired guard. Blocking Stop-hooks that spawn subprocesses with no visible timeout policy means a single wedged guard can hang the agent indefinitely. The brief reports the hang was fixed but never states whether a global timeout/budget applies to all 14 hooks or just that one.
- Off-by-one on the corpus: machine extract covers 528 of 612 artifacts (84 learning packets excluded) — §7.2 calls this 35.5%, which checks out (528/612 ≈ 86% covered... wait: 528/612 ≈ 86.3%; the brief says the extract covers "only the 528 memos, not the 84 learning packets," i.e., 528/(528+84) ≈ 86%. **The 35.5% figure in §7.2 does not match the brief's own arithmetic.** Either the corpus is larger than 612 items or the percentage is wrong. This is exactly the kind of unchecked number a prior panel echoed. Flag for verification before anyone quotes it.)

**Security**
- 7 of 14 registered hooks are undocumented (§3). Undocumented executable hooks wired into the commit/Stop path are a supply-chain surface: no inventory, no owner, no reviewed diff history cited, no kill switch. Minimum bar before ANY other reform: enumerate all 14, record trigger + command + timeout for each, and put the inventory under version control with the same drift-check discipline applied to product code.
- Blocking hooks execute repo-local scripts automatically at turn end. Any compromised or careless script in the hook chain runs with the agent's full credentials/context. There is no mention of scoping, sandboxing, or allowlisting.
- Zero PII to LLMs is a binding constraint, and the PII gate caught a dead phone-number rule — good — but nothing in the brief states whether the learning packets and panel briefs themselves were PII-screened before being fed to four external LLM seats. The review pipeline is itself an LLM egress point and is ungoverned by its own apparatus.

**Data-truth / schema drift**
- Rule count drift: 73 on branch vs 83 on tracking issue (§7.4), branch 2,209 commits behind `origin/main`. Every measurement in this brief may be stale relative to where Sean actually ships. The governance system polices schema drift in product code while its own canonical documents drift freely — the apparatus demonstrably does not apply to itself.
- `AGENTS.md` diverged from `CLAUDE.md` by 2 lines (§3). Two readers, near-duplicate bodies, manual sync — this is the PascalCase-vs-snake_case class of bug reproduced in prose. It will diverge again after any reform unless generation is mechanical (one source, build step emits both), not symlinked (symlinks break on Windows checkouts and some tooling) and not hand-copied.

**Cost/accounting asymmetry**
- The programme tracks panel spend meticulously ("4 free seats", "6 paid seats", §2) yet has spent nothing measuring gate value — zero false-positive counters (§7.3). You can price the policing but not the policed. That asymmetry guarantees the apparatus grows: expansion is visible, harm is invisible.

## HIGHEST RISK

**The undamped confession→rule feedback loop combined with zero wrongful-block telemetry means Sean cannot distinguish "gates are saving him" from "gates are the problem" — and neither can any panel, including this one.** Every reform proposed without instrumentation is a guess wearing a lab coat.

Cheapest de-risk before ship (one day of work, no behavior change):
1. Add a counter line to each of the 14 hooks: timestamp, hook name, blocked/proceed, and a one-line reason.
2. Once a week, classify each block post-hoc: *real defect caught* / *wrongful block* / *duplicate of an existing rule*.
3. Run two weeks. Then cut with data: any gate with zero real-defect catches and nonzero wrongful blocks retires; any gate with real catches stays regardless of how annoying it is.

This converts the entire unfalsifiable debate in §4 into a measurable one, and it is strictly cheaper than another panel round.

## CONFIDENCE

What I could NOT verify from the document alone:

- **The 73 rules' content.** Without the enumerated list, Deliverable A cannot be answered honestly — I refuse to invent rule numbers. Evidence needed: the numbered rule table with per-rule byte cost and last-recorded-catch date.
- **The identities of 9 of 14 hooks.** Deliverable E is answerable only for the 5 named Stop-gates. Evidence needed: `.git/hooks` / hook-config listing with trigger, command, and timeout per hook.
- **Whether the 35.5% figure in §7.2 is correct.** The brief's own arithmetic (528 memos + 84 packets) implies ~86% coverage, not 35.5%. One of these numbers is wrong and I cannot tell which. Evidence: the raw corpus manifest.
- **Model-vs-environment attribution (§5).** The honest answer is that nothing here separates Opus 5 capability from operating-environment design, because every observed session ran under the full 73-rule/14-hook apparatus. The discriminating experiment: run 3 identical well-scoped product tasks with the config stripped to ~10 invariants and compare error rate, hedging density, and product-code ratio. Until that runs, any confident "it's the model" or "it's the rules" answer — mine included — is storytelling.
- **Whether gates prevent defects on `main`.** All measurements are from a branch 2,209 commits behind origin/main (§7.4). Evidence: re-run the commit-classification and hook-inventory extraction against main.
- **My own exposure:** I am reasoning entirely from the brief author's account of the session, the corpus, and the gates. §7.6 correctly notes the author is the agent under review. If the commit table or gate-fire counts are misreported, my entire analysis inherits the error. Settling evidence: raw git log and hook logs, not summaries of them.

On the substantive questions I *can* take positions despite gaps: delete the `AGENTS.md` body (keep the 45-line adapter + generated pointer, mechanically emitted from `CLAUDE.md`, never hand-synced); do **not** create `SOUL.md` — it is unmeasurable lore that directly violates the small-boot goal, and if Sean wants voice/brand constraints they belong as ≤15 lines inside `CLAUDE.md`; and the "skill" Sean asked for is the wrong instrument — the right instruments are (a) the block-telemetry loop above, (b) a hard token budget on always-loaded rules (~10 invariants loaded, rest on-trigger), and (c) a CI-enforced rule that no new rule or gate may be added without citing the specific defect it prevents and the rule it replaces or retires.
