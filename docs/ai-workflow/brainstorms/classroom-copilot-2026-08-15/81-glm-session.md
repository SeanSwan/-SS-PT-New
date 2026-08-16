# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/80-PACKET-SESSION-REVIEW.md
**Tokens:** 4171 in / 17116 out (reasoning: 13374) | total 21287
**Wall:** 247.3s

---

## VERDICT
The workstream has produced excellent process and zero delivered product: T started her school year yesterday with nothing in her hands — not the app, not even printed paper — while the machine around her generated seven review rounds, a new process law, and a fresh architectural pivot. The single most important next act is delivery tonight: printables in her bag, three questions asked at dinner, H0 installed within 24 hours, and the production minors check run this week because it is the only live legal exposure in the building. Everything else — coach port, Desk, slices — is correctly gated behind evidence that can only begin accumulating once she has the tools.

## HOSTILE FINDINGS

**F1 — Delivery inversion: T has received none of what the workstream mass-produced.** What the workstream produces in volume is review (7 rounds, DRY protocols), decisions (50+), and architecture (Switchyard, vaults, port plans) — and T has received zero of all three: no artifacts, no installed software, no printed paper, and she has been asked zero questions. The printables are zero-dependency deliverables sitting in a repo as "published artifacts" while week 1 of a 2–3-year-old cohort — peak adaptation/biting/incident week — is underway, and the incident form (her legal shield, the top absence she never named) is not in her binder. Worse, gated-downstream work (the sorter) was built while the ungated upstream delivery waited. **Fix:** paper printed tonight; install ≤24h; nothing that can slip delivery gets attention until delivery happens.

**F2 — The workstream's unit of work is the review, not the ask.** Laptop-at-midday has been a known structural unknown since the first panel and has survived multiple multi-model rounds; it is a ten-second question to T. Same for parent-app contents and the Mac's actual RAM — three open items are single-question T-asks that have outlived entire review phases. The workstream resolves questions with panels when a human answer is cheaper *and authoritative*. **Fix:** standing rule — any open item answerable by T or by direct observation gets a 24-hour ask-deadline before it may appear in another review round.

**F3 — The H0 gate misattributes failure.** The gate counts *her* unprompted ritual days, but the ritual requires the laptop in the room and a rest window that exists; if the environment fails, the gate reads "habit failure" and the app dies for the wrong reason. Compounding: week 1 is the worst habit-formation week of the year. **Fix:** nightly log classifies each miss as structural vs. habit; pass = ≥4/5 *habit*-days; >2 structural misses triggers midday-anchor redesign, not a kill.

**F4 — Coach port: right skeleton, inflated framing, unbounded entry.** The propose→deterministic-approve loop genuinely converged twice, which means the port is a **refactor, not a pivot** — its real marginal value is the hardened contract patterns (`safety_flags`, PII-banned `evidence_refs`, clarify-on-missing-identity) and O's fluency in his own codebase. But "reading the production contract confirmed the fit" was a confirmation-seeking read: the production coach writes into its *own* store, while T's actual bottleneck is fan-out into *external* mandated systems the approval layer cannot own. Unreconciled breaks: Phase 2's "never AI-generate an incident narrative" vs. `incident` as a proposal type (direct contradiction, unnoticed); interval events (naps) vs. point events; identity-by-circumstance; and **dictation-in means classroom audio — a new, unexamined data class**. **Fix:** port = contract patterns + deterministic layer first; incident type last and structure-only; dictation on-device keyboard only, zero retained audio, never T3.

**F5 — The port introduces persistence the legal frame never examined.** `local+SQLite` + proposal history = a child-records datastore on a portable Mac, when the paper-equivalence argument rested on ephemerality and same-day flow-out. Time Machine and iCloud Desktop-&-Documents sync will silently replicate that DB to backup media and cloud. The Switchyard argued model tiers for a full phase; nobody asked where the file lives or what backs it up. **Fix:** datastore location and backup policy are spec-level requirements of the port (outside iCloud-synced dirs; Time Machine local acceptable; FileVault verified at install).

**F6 — The minors check was deferred behind a side project.** O's *live, revenue-bearing* SaaS carries guardian waiver fields; minors can enroll; whether their records reach an AI pipeline with a quasi-identifier KEEP list is unknown. That is today's legal exposure on shipping software, treated as "advisory" behind preschool printables. It is hours of work. **Fix:** run this week; if minors are active in the pipeline, GLM's flip condition fires and it outranks the entire T workstream.

**F7 — Marginal review went negative and DRY isn't treated as frozen.** R5's "hardening" introduced three blockers; R7's DRY was followed by an additive edit. 8 of 13 defects were fix-introduced — the protocol has no stop rule with teeth. **Fix:** DRY = frozen; any post-dry edit reopens review with two parallel independent models on identical bytes; no "just one line" exceptions.

**F8 — O-concentration is structural and unstated.** Every tier above her Mac, all updates, all triage — and tailnet adminship over the machine holding child data — routes through one person. Degradation-to-paper is the de facto design but is written nowhere as an invariant. **Fix:** standing rule: every T-facing capability must degrade to an O-independent paper path, documented on a one-page "if it breaks" card for T.

**F9 — Two-lanes is the decision; the Desk is a measurable-trigger option — but the rule isn't free.** Kimi's dissent is right and the local coach lane strengthens it. However "everything else → ChatGPT freely" has a known failure mode: a tired teacher pasting "the little boy whose mum is in hospital" into ChatGPT for phrasing help. **Fix:** ship the rule *as a printable decision card* (child-shaped → local; cohort-identifiable circumstance → local always; ordinary → ChatGPT); defer the Desk behind a numeric trigger.

**F10 — Open items carry no cost-of-delay, so a fresh agent inherits discovery order as priority.** Example: the village plan-mode fix (file:line known, estimator ~25× reality) rots unclaimed while unspecced design work proceeds. **Fix:** the forward plan below reorders by cost-of-delay; the handoff states the ordering principle explicitly.

## FORWARD PLAN

**Tonight (Aug 18)**
1. **Owner O** — Print all four printables (incident form ×12 copies, command card, triage sheet, week-one watchlist); place physical copies in T's work bag. **Gate:** T confirms paper in hand tomorrow morning. **Effort:** 30 min.
2. **Owner O + T** — At dinner, ask and log three answers as [VERIFIED]: (a) is the MacBook in the classroom at midday rest? (b) what does the school's parent app already record per child per day? (c) About This Mac → 24 or 32GB? Schedule the install window. **Gate:** three verified facts logged; install slot on calendar. **Effort:** 20 min.
3. **Owner O** — Decide and hand-apply drafted Rule 82 as article #82 in BOTH constitution files (main ends at 81, local at 73 — apply to both, no renumbering). **Gate:** #82 present in both files. **Effort:** 30 min. If O withholds go past 48h: log dissent, move on.

**Days 1–2 (Aug 19–20)**
4. **Owner O** — Install H0 per runbook, T present. Add: verify Ollama bound to localhost; check FileVault (if off, enable overnight — initial encryption takes hours, don't block install). Run behavioral acceptance + `ollama show` structural check; T completes one end-to-end dummy record using the command card alone, then deletes it. **Gate:** acceptance pass + one unaided-by-O record completed. **Effort:** 1.5–2h.
5. **Owner O (or next agent)** — Production minors check: query enrollments where `submittedByGuardian` = true or `guardianName` non-null with DOB implying <18 at enrollment; trace whether those records' fields feed the AI pipeline (the five test suites' inputs). **Gate:** written finding with counts; if minors > 0 in pipeline → rebuild-conversation meeting scheduled within 48h and this outranks all T-side work. **Effort:** 2–4h.

**Week 1 (Aug 18–22, H0 gate window)**
6. **Owner T** — The ritual. **Owner O** — 5-min nightly log: done unprompted Y/N; each miss classified structural (laptop absent / no rest window) vs. habit. **Gate (Fri):** ≥4/5 habit-days → app build unlocked; >2 structural misses → midday-anchor redesign before any build. **Effort:** 5 min/day.
7. **Owner next agent** — Coach-port spec v0, bounded to 1.5 days: deterministic layer first — schema for observation/parent_note/supply/prep/idea (incident LAST, structure-only, narrative authored by T verbatim), roster + fuzzy-match invariants ported from the sorter, approval layer, expiry/`pinned` semantics, datastore location + backup policy (F5), dictation = on-device keyboard only, compressed prompt contract ≤35 lines. Must explicitly reconcile the Phase 2 no-AI-narrative rule with the incident proposal type. **Gate:** spec survives two parallel independent models, identical bytes, DISSENT mandatory, zero blockers. **Effort:** 1–1.5 days.
8. **Owner O or next agent (claim it or set a deferral date — no rotting)** — Village plan-mode fix at `validation-orchestrator.mjs:2203`. **Gate:** estimator within 2× reality on a sample plan. **Effort:** 2–4h.

**Week 2 (Aug 25–29)**
9. **Owner T, prep by O** — Director conversation from a one-page brief: ChatGPT approval wording/tier; child data on personal devices; incident-form process. **Gate:** three written answers; cloud lanes locked/unlocked; local posture confirmed or H0 rescoped to paper+phone. **Effort:** 2h prep + one meeting.
10. **Owner next agent** — IF step-6 gate passed: build coach-port slice 1: dictation (on-device) → 8B proposal under compressed contract → one-tap approve → scratchpad record with expiry. Kill criteria live from the first live record: wrong-child = 0 (two strikes → model path permanently dead for family notes); ≥90% uncorrected acceptance over first 20. **Gate:** 20 consecutive live records, wrong-child 0, acceptance ≥90% → slice 2. **Effort:** 3–5 days.
11. **Owner O** — Ship the two-lanes decision card as a printable; Desk formally deferred behind trigger: ≥3 middle-lane events/week for 3 consecutive weeks (tally box on the card, checked weekly). **Gate:** card in T's hands. **Effort:** 1h.

**Weeks 3–4 (Sep 1–18)**
12. **Owner next agent** — Proposal-type rollout in fixed order: parent_note → supply/prep/idea → incident last (structure-only: fields, times, roster, evidence refs; model never composes incident prose). Each type carries its own 20-record acceptance gate before the next. Then: T's hostile-review loop on her Mac 14B for her own child-free artifacts (lesson plans). **Gate:** one artifact reviewed, T's verdict logged. **Effort:** ~1 day/type + 0.5 day.
13. **Owner O** — Month checkpoint (by Sep 18): kill-criteria tally, gate evidence, S-slice roadmap re-confirmed as proposal-type rollouts under the ported engine, open items re-ranked by cost-of-delay. **Gate:** written checkpoint note. **Effort:** 1h.

## RESOLUTIONS

- **H0 install timing: NOW.** Paper tonight precedes it; install ≤24–48h. No engineering work may displace it; parallel work only if it cannot slip the install.
- **Two-lanes vs Desk: two lanes + rule, shipped as a printable card.** Desk deferred with the numeric trigger above (≥3 middle-lane events/week × 3 weeks). The coach port's fully-local lane makes this stronger, not weaker.
- **Coach-architecture port: YES — as a refactor, not a pivot and not a restart of S1–S12.** Port the contract patterns and the deterministic layer; the model side starts only with a compressed contract on observations, 20-record gate; incident type last, structure-only; on-device dictation only. Spec may be written during gate week; build starts on gate pass.
- **Production minors check: URGENT** — this week, hours not days, ahead of further T-side design. A positive finding reorders everything.
- **Rule 82: apply now**, tonight, to both constitution files, per O's go; a >48h stall is logged as dissent, not a blocker.

## HANDOFF MUSTS

- **The [UNVERIFIED] rule plus the live list**: Mac RAM, laptop-at-midday, parent-app fields (shrinking as asks land). Never restate voice-sourced environment facts as settled — this error class is documented and measurably recurring.
- **DRY = frozen.** Post-dry edits reopen with two parallel independent models on identical bytes. 8/13 defects were fix-introduced; post-clearance edits are the highest-risk change class in this workstream.
- **Kill criteria are literal and permanent**: wrong-child = zero; two strikes → the model path is dead for family notes forever. No "one more fine-tune."
- **Never AI-generate an incident narrative — including inside the coach port's incident proposal type.** The Phase 2 rule survives the pivot; structure-only.
- **Dictation policy: on-device keyboard dictation only, zero retained audio, no audio to the 5090/T3.** This follows from the child-data ceiling; it must be stated because dictation-in is the port's headline input.
- **The school authorised T, not O.** No child data on O's infrastructure, ever — including recognising O's tailnet adminship over T's machine as a trust edge that must stay child-data-free.
- **Paper-equivalence is a workstream assumption, not a school-granted right.** The director can restrict child data on personal devices entirely; every T-facing feature must degrade to an O-independent paper path.
- **Datastore policy when SQLite lands**: outside iCloud-synced directories; Time Machine local acceptable; FileVault verified.
- **Numbers honesty**: only held-out numbers count; never cite the tuned-corpus 100%.
- **T has been consulted on nothing.** Before any build, run the design past T in one 20-minute session (kill criteria, expiry semantics, midday anchor). Her veto is cheap now, ruinous after build.
- **Naming discipline**: T, C1..Cn, O only; never a real-sounding name in any artifact.
- **Priority = cost-of-delay, not packet order.** The open-items list is in discovery order; the forward plan above is the ranking.

## DISSENT

- "The middleware's posture is correct under every possible answer" is overclaimed. A director can lawfully restrict child data on personal devices entirely — which touches H0's local assistant, not just cloud lanes. Only the paper layer is answer-proof; the packet conflates graceful degradation with approval-proofness.
- "Reading the production contract confirmed the fit" is a confirmation-seeking read — under this workstream's own Rule 82, that should have been the first thing flagged. The loop-level fit is real; the framing ("this IS the loop, already hardened") dresses a refactor as a pivot, and refactors do not justify re-sequencing anything.
- The packet lists "install not yet performed" as open item #1 of ten. It is not an item; it is the failure state of the entire two days. A workstream whose only user-facing deliverable is undelivered has produced plans, not product, and its honest self-description is "behind," not "dry."
- Rounds 6–7 bought negative-to-zero value — fix-introduced blockers and a post-dry edit — yet are narrated with the same pride as R1's five genuine catches. The process prices its inputs (dollars) meticulously and its rituals (school days, O's attention) at zero.
- The Defect Ledger records who found what; nothing records what the reviews cost T in slipped delivery days. A quality culture that doesn't measure its own opportunity cost will keep polishing while the school year — the one unrenewable resource in this system — burns at one gate-day per delay-day.
