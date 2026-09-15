# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-25-deterministic-turn/PACKET.md
**Seed:** (none)
**Tokens:** 5382 in / 5758 out | **Cost:** ~$0.1025 | **Wall:** 142.7s | **finish_reason:** stop

---

# HOSTILE REVIEW — THE DETERMINISTIC TURN

Posture note: this packet is unusually self-aware — it pre-confesses its own caveats, which is itself a framing move. A document that says "the panel will catch this otherwise" is managing the panel, not informing it. I note that and proceed.

---

## Q1 — The five challenges: real or cargo-cult?

**1. The 84-rule constitution violates lost-in-the-middle — REAL DEFECT, and worse than stated.**
The packet's own evidence is damning in a way it underplays: the drift-check says the file *claims 66 rules* while containing 84. That is not a cosmetic bug. It means the constitution's self-description is maintained by the same prose-update process the rules govern, and that process has already failed silently. If the file cannot keep its own count accurate, the claim that agents reliably apply rule #57 is unfalsifiable faith. The 6% prune is indeed a rounding error, but I'd go further: the prune was the *wrong operation*. Trimming a file whose problem is positional (middle = dead zone) doesn't fix position; it just moves the dead zone. Caveat: lost-in-the-middle severity is model- and task-dependent, and the packet has no measurement of *which* rules are actually violated most. Before restructuring, mine the 48%-recurrence data by rule position. If violations cluster mid-file, Bob is empirically confirmed in-repo; if they cluster by rule *type* (ceremony vs correctness), the diagnosis changes.

**2. Ceremony hooks vs correctness hooks — REAL DEFECT, and the most important one in the list.**
This is the packet's most honest sentence and it should be promoted to the headline. The Stop hooks enforce that the *report* is complete. A system can pass every hook while shipping broken code with immaculate paperwork. Worse: ceremony hooks have a perverse incentive structure — they make diligence *legible*, which means they optimize for the appearance of diligence, which is exactly the failure the 491-memo backlog already demonstrates. The asymmetry Bob names (agents read everything; humans read almost nothing) means every ceremony hook produces output whose primary consumer is nobody. Real.

**3. Rules 15/64/68 are spec-driven development — PARTIALLY REAL, with a caveat the packet misses.**
The doctrinal conflict is real (see Q5). But the packet frames it as "Bob tried this and it failed," which is an appeal to authority with n=1. The packet's own counter-evidence exists and is ignored: this repo *shipped* a working production SaaS under these rules. That's not proof the rules helped — survivorship and selection effects are rampant — but "always a disaster" is flatly contradicted by the existence of SwanStudios. The real question is counterfactual: would the agile shape have shipped it faster/better? Unknowable from the packet. So: real conflict, but the resolution should be driven by *this repo's* recurrence and rework data, not Bob's war stories.

**4. Missing deterministic tools (CRAP, mutation, dependency checker) — PARTIALLY REAL; partially cargo-cult.**
Mutation testing on money-path/data-truth modules: real, high-value, cheap to pilot. Dependency-rule checker: real — module boundaries are precisely the kind of thing prose rules fail at and checkers excel at. CRAP score: **cargo-cult risk.** Bob himself says the threshold is uncertain ("6, possibly 8"). Adopting a complexity metric because a transcript mentioned it, on a styled-components React frontend where cyclomatic complexity is a weak proxy for the actual failure modes (prop-drilling, styled-component sprawl, Sequelize query shape), is adopting the *shape* of rigor. Build the dependency checker and mutation testing first; let CRAP prove it predicts *actual fires in the fire-log* before it gates anything.

**5. Values vs discipline unaudited — REAL, but the binary is softer than presented.**
Real because the repo demonstrably contains both classes and treats them identically (same file, same numbering, same enforcement surface). Soft because, as Q6 and Q8 develop, many rules are values *wearing* discipline clothing ("no MUI" is a value — taste — expressed as a discipline — a ban). The audit is real work; the classification scheme is not as clean as advertised.

---

## Q2 — Slice ranking and the missing item

**Ranking by value-per-effort:**

1. **D (corpus drain + expiry)** — cheapest, attacks the single most unambiguous measured defect (491/207), and every other slice produces *more* artifacts that will rot without it. Doing A–F without D first is adding lanes to a highway that drains into a swamp.
2. **A (rule-to-ladder ledger)** — the keystone; everything else is downstream of knowing what the 84 rules actually are. Effort is moderate (84 rows), value is structural.
3. **C (deterministic tools)** — highest absolute value, highest effort. Sequence internally: dependency checker → mutation testing → CRAP (per Q1.4).
4. **B (CLAUDE.md restructure)** — high value but *must follow A*; restructuring before classification means re-litigating every rule twice. The packet lists B second; that's wrong.
5. **E (SOUL.md values audit)** — small, real, but a special case of A applied to one file. Fold it into A as the pilot.
6. **F (spec-driven resolution)** — correctly Sean-gated, but as *work* it's a decision, not a slice. Ranking it last is not dismissing it; it's noting it requires no build.

**What's MISSING — the item nobody proposed:**

**Slice G: Measure enforcement cost and hook overhead.** The packet measures *recurrence* (48%) and *artifact counts*, but nowhere measures what the deterministic layer *costs per session*: hook latency, false-positive rate of existing gates, sessions derailed by ceremony-hook failures, token spend on constitution loading (164KB is ~40K tokens of *every context, every session* — at fleet scale that is likely the single largest line item in the operating budget, and it appears nowhere in this packet). A packet titled "the deterministic turn" that never prices the turn is incomplete. Add: per-hook fire/FP rates, per-session token cost of the constitution, and a kill-switch criterion for any gate whose FP rate exceeds its catch rate.

Also missing, smaller: **a rollback story.** If the restructure lands badly — if the compressed CLAUDE.md loses something load-bearing — what restores it? The constitution guard governs *rate of change* but the packet never mentions *reversibility of the restructure itself*, which is ironic given Slice F's proposed reversibility-proportional doctrine.

---

## Q3 — Slice A classification criteria (the decision procedure)

A rule is classified by applying four tests **in order**; first match wins. Each test must be answerable from evidence, not judgment.

**Test 1 (L4 — dead):** Does the rule reference a tool, file, workflow, or constraint that no longer exists, OR has the fire-log / recurrence data shown zero violations *and* zero invocations of this rule across the last N sessions (suggest N=60)? If yes → L4. *Evidence required: grep of rule's referents + recurrence log.* Tiebreaker: if two agents disagree on "superseded," the rule is not dead — ambiguity of status is itself evidence of life.

**Test 2 (L1 — architecturally eliminable):** Can the failure class be made *impossible* by a change to data structure, type, schema, or module boundary — such that even a fully adversarial agent could not commit it? The bar is impossibility, not detection. Example: "zero PII to LLMs" fails this test (you cannot make PII structurally impossible to paste); "no MUI imports" *passes* if you can enforce it at the dependency level (an import boundary is architecture). *Evidence required: a named structural change, not a hypothetical.*

**Test 3 (L2 — gate-able):** Can a deterministic checker state the rule's violation condition as a *boolean over artifacts* (code, diff, file tree, command output) with a false-positive rate measurable in shadow mode? If the violation condition requires judging *intent, taste, or adequacy* ("is this plan complete enough"), it fails L2. *Evidence required: write the checker's pass/fail predicate in one sentence. If the predicate contains "appropriate," "sufficient," "reasonable," or "aligned with," it is not L2.*

**Test 4 (L3 — prose-only value):** Surviving rules must pass a second filter: *does the rule generalize to situations its author has not seen?* A value ("care-first," "trainer-indispensability") tells the agent what to do in novel circumstances; a leftover instruction tells it what to do in enumerated ones. If the rule only fires in circumstances you can enumerate, you failed Test 3 — go back and gate it. L3 is the *residual* bucket, and the burden of proof is on the rule, not the reviewer.

**Meta-rule:** any rule where two classifiers land in different buckets goes to L3 *provisionally* and is flagged — disagreement is data that the rule is poorly written, and the fix is rewriting, not re-bucketing.

---

## Q4 — ADVERSARIAL: what the ladder costs

**Where prose beats mechanism, concretely:**

1. **Gates enforce the letter; prose carries the *reason*, and the reason is what transfers.** A dependency checker can block an import. It cannot tell the agent *why* the boundary exists — which means when the agent faces a *novel* case the checker doesn't cover (a new module, a boundary the spec file predates), it has nothing to reason from. Retiring the prose wholesale creates a system that is perfectly enforced and perfectly brittle: 100% compliance on enumerated cases, 0% guidance on unenumerated ones. The packet's own framing — "the agent surprises you by extending your intent correctly" (Theo's success criterion) — *requires* the reasoning layer the ladder demotes. This is the central tension the packet never confronts: Theo's direction-not-rules model and Bob's gauntlet model are in conflict, and the packet adopts both without noticing.

2. **Specific rule class where prose is genuinely superior: refusal rules.** "Zero PII to LLMs" is partially gate-able (regex for known PII shapes), but the *value* — "when in doubt about whether something is user-sensitive, don't send it" — covers the infinite tail of PII shapes no regex anticipates. A gate that catches 90% of PII and a retired prose rule is *worse* than prose alone, because the gate creates a compliance illusion: "the gate passed, therefore this is safe to send." **Gates lower vigilance on the cases they miss.** This is the ladder's hidden cost and it appears nowhere in the packet.

3. **Phrasing bans ("no-yoga language," credential phrasing) are a trap case.** They look gate-able (forbidden-phrase linter). But a phrase linter teaches the agent to *avoid strings*, not to *understand the audience*. The agent will route around the linter with synonyms that violate the spirit. The value ("speak to trainers as professionals, not gym influencers") is prose-superior; the ban list is its worst possible encoding.

4. **Cost of the ledger itself:** Slice A is 84 classification decisions, each requiring evidence. Done honestly, that is weeks of agent-fleet time. The packet budgets it as the "highest value, unblocks everything" slice without pricing it. The ladder's first cost is the audit's own opportunity cost.

---

## Q5 — The spec-driven conflict: verdicts on Rules 15, 64, 68

**Rule 68 ("plan so complete a worker-bot executes it verbatim with ZERO further questions") — FALLS. Completely.**
This is the waterfall trap in its purest form, and it fails on *first principles*, not just Bob's testimony. A plan complete enough to execute with zero questions must encode every decision the code will require — which means it must be written by someone who has effectively already written the code in their head. But the planner (Fable) *cannot see the code that doesn't exist yet*; the plan's completeness is therefore *asserted, not achieved*. The "zero further questions" clause is the tell: it forbids the feedback loop that is the only known correction mechanism for plan-reality divergence. Worse, persisted verbatim-execution plans are the exact artifact class this repo demonstrably cannot drain (308 stale handoffs). Rule 68 doesn't just risk the waterfall trap; it *manufactures the stale-artifact problem* as a side effect. Verdict: falls. The salvageable core — expensive model does the hard thinking — survives only in inverted form (see Q6c).

**Rule 15 ("NO code without a plan," recursive) — PARTIALLY FALLS; the absolutism falls, the instinct survives.**
"Recursive planning before ANY implementation" applied to a one-line CSS fix is self-evidently waste, and the 48% recurrence data suggests agents already treat it as a guideline — the rule is being silently routed around, which is the worst state a rule can be in (enforced nowhere, costing context everywhere). But the *instinct* — irreversible work deserves up-front thought — is not waterfall, it's engineering. Bob's own agile shape plans; it just plans *slices*. Verdict: the universal quantifier ("ANY") falls; the rule survives only as proportionality (reversibility-scaled depth). Note this is a *rewrite*, not a defense — the rule as written falls.

**Rule 64 (grill-me) — SURVIVES, but not for the packet's reason.**
The packet defends it as "extracts values, which transfer." That's half right. The stronger defense: grill-me is not a *spec*, it's an *elicitation protocol*. Bob's critique targets plans that pretend to foresee implementation; an interview that extracts *constraints, taste, and refusal conditions* before work begins is the agile shape's "understand the problem" step, formalized. The waterfall failure mode is premature *solution* commitment; grill-me commits to *problem definition*, which is exactly what small-slice development needs to slice correctly. Caveat: grill-me survives *only if* its output feeds the work, not the archive. Checkpointed to a "durable brainstorm doc" — there's the rot vector again. The interview survives; the durability of its transcript should be demoted to ephemeral, with only tier-7 promotions persisted.

---

## Q6 — Attacking "keep the interview, kill the blueprint, keep the checks"

**(a) "grill-me extracts values, not steps" — breaks at the boundary.** The values/disciplines distinction is *not* crisp enough to sort real rules by, and grill-me is the proof: an exhaustive pre-build interview inevitably elicits *both* ("should trainers see client injury flags?" — value; "should the session card show RPE before or after notes?" — an implementation decision wearing a question mark). The resolution assumes the interview's output can be cleanly typed after the fact. It can't, reliably. What saves (a) is the tier ladder — tier-7 promotion is a *filter*, and filters don't require the input to be clean. But then the honest claim is "grill-me survives because it has an eviction mechanism," not "because it extracts values." The packet should say that.

**(b) "Plan-depth proportional to reversibility" — breaks on the measurement of reversibility.** Reversibility is not a property of the *change*; it's a property of the change *plus the deployment and data context*, and agents are demonstrably bad at estimating it (a "reversible UI tweak" that touches a shared design-token file is not reversible in the way it appears). Who classifies? If the agent self-classifies, you've replaced one rule with a judgment call the 48% data says agents will soften. If a gate classifies, you need a reversibility *heuristic* (touches migration/billing/auth paths = deep plan; else paragraph) — which is fine, but then say so: (b) is really "plan-depth proportional to a path-based risk classifier," and the classifier is the actual deliverable. Unstated, (b) is a slogan.

**(c) "The expensive model writes the acceptance check, not the plan" — the cleverest piece and the most fragile.** Three breaks:

1. **Whole classes of work have no writable-in-advance acceptance check.** Taste work (does this dashboard *feel* care-first?), exploratory debugging (the acceptance criterion is "we understand why it fails"), and integration work where the check itself requires the system to exist. For these, (c) silently reverts to either no plan (fine, admit it) or a vacuous check (worse — a vacuous check that *passes* is a compliance illusion, Q4.2).
2. **A wrong acceptance check is worse than a wrong plan.** A wrong plan gets *deviated from* — visibly, recoverably. A wrong check gets *satisfied* — the worker-bot optimizes the check, not the intent (Goodhart, mechanically enforced). You've built a machine for confidently shipping the wrong thing. The packet's own rationale — "fails loudly instead of rotting silently" — cuts both ways: it also *passes* loudly while being wrong silently.
3. **Who reviews the check?** The expensive model writes it; the cheap model satisfies it; Sean audits... the check? Then Sean is reviewing specs again, just renamed. The waterfall didn't die; it changed file extension.

Verdict on the resolution: directionally right, but (c) needs a stated scope limit ("acceptance-check-first applies to correctness-verifiable work only") and (b) needs its classifier named, or the resolution is three aphorisms.

---

## Q7 — The values corpus: Direction layer or artifact #1,608?

**It is artifact #1,608 unless its read-path is structural, and the packet proposes no read-path.** That is the whole answer, but let me be concrete.

**What structurally makes a document get READ:**
1. **It is loaded.** Not "available," not "grep-able" — *in the context, every session, near the top*. Theo's 26-never-read files and this repo's 308 stale docs share one property: reading required an act of initiative. The only documents with guaranteed readership in this system are CLAUDE.md and hook output. If SWAN-VALUES-CORPUS.md is not *injected into the front of the context* (the priority zone, per lost-in-the-middle), it is a write-only artifact with a promotion ceremony.
2. **It is cited by gates.** A value that a checker references ("this diff violates corpus entry V-12: least-clicks") gets read every time it fires. Values that never fire a gate are decorative.
3. **It is small enough that reading is cheaper than not reading.** Every entry past the point where the corpus fits in the priority zone is an entry that will not be read.

**Size cap and eviction:** Cap at what fits in ~2KB of front-loaded context — call it **25 entries, hard cap**. Eviction: an entry not *invoked* (cited by an agent in a session transcript, or fired by a gate) in 90 days is demoted to the archive, not deleted. The corpus's health metric is invocations-per-entry, and any entry Sean promotes that never gets invoked is evidence the tier-7 interview is eliciting *aspirational* values, not operative ones — which is itself worth surfacing to Sean.

**Seeding from observed values: corruption at birth, with a narrow exception.** Observed behavior is what the fleet *does*, which includes its 48% of softened-rule failures. Seeding from observation encodes the current compromise as the stated ideal — the corpus becomes a rationalization layer. The narrow exception: observed values that *contradict* written rules and have been stable for 60+ days are not seeds, they are *findings* — evidence the written rule is wrong — and should be presented to Sean as conflicts, not promoted as values. The corpus must remain *authored by Sean at tier 7* or it is not a values corpus; it's a behavior log with better typography.

**The deeper point:** the packet asks "is a values corpus the right Direction layer?" but the repo already *has* a Direction layer — the front of CLAUDE.md. The corpus is not a new layer; it is a *competitor* to the existing one, and the packet never says which wins when they disagree. Two direction layers is the split-brain Theo opened with.

---

## Q8 — Values vs disciplines, applied

**Values (keep, compress, front-load):** zero PII to LLMs; care-first; trainer-indispensability; least-clicks; dark-first; no-yoga *language-as-value* (audience respect); credential phrasing *as respect-for-profession*. Common signature: each tells the agent what to do in a situation nobody enumerated; each would survive the deletion of every example given for it.

**Disciplines (retire into gates or delete):** mandated report shapes; closeout ceremony ordering; dual-tier summary format; memo/packet emission requirements; forbidden-phrase *lists* (the list, not the value behind it). Common signature: each specifies a *procedure* whose value is entirely in its execution, and each is checkable by a boolean over artifacts — which means each is L2 by Q3's Test 3 and is currently consuming priority-zone context to do a hook's job.

**The genuinely ambiguous band, and what to do with it:**

- **"No MUI"** — a taste value (design coherence) encoded as a dependency ban. It's both. Resolution: the *ban* is L2 (import checker — trivially gate-able); the *coherence value* is L3 (three words in the direction layer). Split every ambiguous rule this way: **mechanism to the gate, rationale to the front, nothing to the middle.**
- **Memo/packet emission** — the *emission* is a discipline (gate it — already gated, in fact, by the Stop hook; the prose rule is redundant and should be deleted, which is a finding: some rules are L4 *because the gate already exists*). But the *drain* — reading what was emitted — is neither value nor discipline; it's an *operational obligation*, and the packet's taxonomy has no bucket for it. That gap is why the 491-memo backlog exists: the system classified "write memos" (discipline, gated) and never classified "read memos" (nobody's job). **The taxonomy's blind spot is obligations without artifacts.**
- **Grill-me itself** — a discipline (a procedure) in service of value extraction. It survives not because it's a value but because it's the *factory* for values. Factories are exempt from the values/disciplines sort; classify them as infrastructure.

---

## Q9 — DISSENT: where the packet's own framing is wrong

**Primary dissent: the packet's central metaphor — "the deterministic turn" — assumes the repo's problem is *enforcement*, when its own data says the problem is *attention economics*, and those prescribe different fixes.**

Look at the packet's three headline numbers again: 164KB constitution, 491 undrained memos, 1,607 handoff docs. Every one is a *production* success and a *consumption* failure. The system writes rules, writes memos, writes handoffs, writes gates — and nothing in it is optimized for the scarce resource, which is *context-window position and Sean's reading time*. The packet's response to this is... six slices that produce more artifacts (a ledger, a restructured file, three tools with fire-logs, a values corpus, an audit). Even the drain slice (D) is framed as *adding probes and front-matter fields* — more production. The packet cannot imagine a fix that is purely subtractive, because the packet was written by the system that produces. **The correct first slice is not on the list: delete, with no replacement, the bottom half of every artifact class, and measure whether anything breaks.** The packet's own evidence (308 files untouched in 30 days — did anything break? apparently not) says the deletion experiment is nearly risk-free, and it is nowhere proposed. That absence is the author's stake showing: an agent that did the work does not propose that the work was mostly unnecessary.

**Secondary dissents:**

1. **The packet treats two podcast transcripts as a natural experiment.** Theo audited *Claude Code auto-memory* — a different system, different scale, different failure modes — and the packet imports his verdict as if it were a measurement of *this* corpus, while simultaneously claiming superiority ("our corpus IS consulted"). You cannot both cite his audit as authoritative and exempt yourself from it. Pick one.

2. **The 48% recurrence figure is doing enormous load-bearing work with no stated denominator.** Recurrence of *what* — which rules, which sessions, measured how? The packet calls it "Bob's claim, proven in our repo" but never shows the measurement method. A number that validates the packet's thesis, stated without method, in a document that elsewhere carefully marks `[LIKELY]` vs `[VERIFIED]` — the asymmetry is convenient.

3. **"Sean decides" is doing political work.** Slice F and the spec-conflict are parked on Sean's desk, which reads as deference but functions as *risk transfer*: the packet gets to propose the resolution (Q6's working answer is fully formed — "keep the interview, kill the blueprint, keep the checks" is not a neutral framing of options) while disclaiming the decision. The packet has already decided; "Sean arbitrates" is the ceremony hook of governance — paperwork completeness, not correctness.

4. **The Lauren ladder is adopted "verbatim as prioritization law" one section after the packet warns against cargo-cult adoption of outside opinion.** Adopting a prioritization heuristic verbatim, from a transcript, as *law*, is the exact move Q1 asks me to police. The ladder is good. "Verbatim as law" is not how good heuristics should enter a system that just spent 164KB discovering what unexamined rule accumulation costs.

**Bottom line:** the diagnosis in this packet is largely right and the proposed work is mostly worth doing — but the packet's blind spot is that it is itself an instance of the disease: a long, well-structured, diligently-written artifact proposing the production of more artifacts, in a system whose measured failure is that nobody reads what it produces. The highest-value action available is the one the packet never lists: **stop writing, start deleting, and measure what breaks.**
