# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** ./SWAN-BRAIN-V2-PACKET.md
**Seed:** (none)
**Tokens:** 6000 in / 2063 out | **Cost:** ~$0.0489 | **Wall:** 74.8s | **finish_reason:** stop

---

# KIMI K3 — HOSTILE REVIEW · Swan Brain v2 "Atelier"

Verdict up front: **this document is better at diagnosing than prescribing, and its prescriptions spend a lot of money fixing problems that have cheaper root causes.** Half of it is excellent forensic work. The other half is a tastefully formatted shopping spree. Going module by module, then the seven questions.

---

## A. Where the document is actually right

The §0 branch-trap law and the five root causes are the strongest part. RC-1 through RC-4 are evidenced, mechanical, and damning — especially RC-2, where the router instructs agents to invoke a mode the protocol hard-refuses. That single finding explains more observed shallowness than the entire rest of the upgrade plan. **Fix RC-2 alone and you recover most of the value of B1 without touching storage policy, ledgers, or privacy law.** The doc buries this by bundling it with the expensive parts.

## B. Where it fails

### 1. The "150 references minimum" floor is cargo-cult rigor (B1.2)
Six facets × 25–30 refs = ~120–150 references as a *hard gate*. No evidence is offered that 150 references produces better output than 15 well-chosen ones. Reference volume is not taste; it's latency and context-window burn. Worse, a mandatory 6-call floor per task converts every small surface decision into a research project — the exact over-process bloat the doc accuses P-mode of causing in reverse. The gate should be *facet coverage with justification*, not call count. As written, Gate 0 will either be gamed (agents fire 6 junk queries to pass) or will stall small tasks. Both outcomes are worse than the disease.

### 2. The Taste Ledger firewall is real but useless (Q1)
I'll answer the panel question directly: the "principles-only, Swan-authored, zero provider media/identity" split is **legally coherent, not laundering**. Abstraction genuinely severs derivation. But that's exactly the problem — a ledger stripped of images, URLs, screen IDs, and even app names is a notebook of aphorisms. "SWAN VERDICT: ADAPT — serves LAW 1" with no retrievable reference means six months later nobody can check *why* a pattern was adopted or re-find the source. You've built a write-only corpus. It will accumulate confident, unfalsifiable principles that drift into doctrine by repetition — precisely the "Mobbin is never doctrine evidence" violation, just laundered through time instead of storage. Either accept *some* citation (a screen ID is not PII; refusing even that is theater) or admit the ledger is a vibes journal and don't gate anything on it.

### 3. The convergence loop has no exit criteria and no cost model (B2, Q3)
"LOOP UNTIL SEAN SAYS 'THAT'S IT.' No round cap." This is not a protocol; it's an invoice generator. Sean is the bottleneck in every loop round, and the doc itself identifies one-question-at-a-time grilling discipline elsewhere — then designs an infinite synchronous loop with the founder in it. The "100× cheaper in pixels than React" argument is directionally right but is asserted, not costed: what does a 4-round loop actually cost in tokens/latency/Sean-hours vs. one React iteration? Without that number, the economic argument is a slogan. Diminishing returns on visual convergence typically hit around round 2–3 for mood, then shift to *implementation fidelity* — which pixels can't test. **Cap at 3 rounds with an explicit "round 3 must produce a lock or escalate to Sean with two finalists," and measure the loop on the homepage commission before canonizing it.**

### 4. B3 is the most confused module technically (Q4)
- The doc correctly flags SREF/Super-Tiling portability as `[HYPOTHESIS]` and then *proceeds to design around them anyway*. The "Swan Style Token" (a saved 12-slot preset) is **not a translation of SREF** — SREF is a latent-space style embedding; a text preset is just a prompt template. Calling it a translation is the cargo cult the doc warns about. The honest statement: "our provider has no style-reference mechanism; we compensate with disciplined prompt presets and seed locking." Say that. Delete the SREF mystique.
- Super-Tiling's edge-preservation trick is Midjourney-inpainting-specific. Whether the OpenRouter image path supports masked inpainting *at all* is unverified. The entire parallax-plate pipeline depends on an unverified capability. Step 3 in sequencing must include "verify inpainting exists," not just slugs.
- The 12-slot architecture is good. It's also ~200 tokens of prompt per image with no evidence that the target models attend to all 12 slots. Midjourney responds to `--chaos`; Gemini/GPT-image models largely ignore numeric chaos parameters. **Half the vocabulary being harvested is model-specific syntax dressed as universal art direction.**

### 5. B5 is a monolith and the doc knows it (Q5)
Web + audio-reactive + video + brand in one brain is not "versatile," it's four domains sharing a folder. The portability requirement (splitting LAWS into universal vs. Swan-specific) is the *only* valuable idea in B5, and it's buried under three medium contracts that are all blocked on `[UNKNOWN]`s. M-AUDIO's core insight — LAW 1 applied to audio reactivity as ownable visualizer identity — is genuinely good. But the visualizer doesn't exist in the tree, the Hailuo integration is unverified, and M-BRAND is scope creep with no customer. **Ship the law-split now; defer all three M- contracts until their UNKNOWNs close. As written, B5 is two modules of vaporware stapled to one real refactor.**

### 6. Absence-first (Q6) — what's missing, ranked by value left on the table
1. **No measurement plan.** The $100k bar is asserted everywhere and operationalized nowhere. "Scored against Awwwards" by *whom*, with *what rubric*, at *what cadence*? Without a repeatable scoring instrument, B6 is a poster. This is the single largest gap — the entire upgrade's ROI is unverifiable.
2. **No failure/rollback path.** What happens when R-mode gets abused, when the ledger fills with junk, when the Forge produces worse images than the 3-line string? No kill criteria, no A/B against current output, no revert plan.
3. **No agent-behavior spec.** The brain is consumed by agents, not Sean. How does an agent with a 200k context window actually sequence 6 sweep calls + ledger write + 12-slot prompt within a task? Token budgets per phase are never stated. The doc designs a museum, not a machine.
4. **RC-5's grep verdict is overclaimed.** One grep across `frontend/src` proves the visualizer isn't in *frontend/src* — not that it "has no audio-reactive implementation in this tree." Sloppy scoping of an evidence claim in a doc that prides itself on evidence.
5. **Nothing on typography, grid, or layout systems.** For a $100k-bar design brain upgrading image generation and 3D, the total silence on the two things that most determine perceived quality — type and spacing — is remarkable. Pixels of hero art over a weak grid still reads cheap.

### 7. Q2 — Was the cap deliberate?
Unknown from this document, and the doc doesn't actually investigate it — it asserts "collateral damage, not the goal" without citing any design rationale, commit history, or Sean decision record. **Before B1.1 lands, someone must read the egress-policy commit message and ask Sean directly.** If the one-query cap was a rate-limit/cost decision, R-mode with "unlimited reads" reopens it. If it was a legal decision, the doc's option (b) is dead. The plan sequences panel review before this question is answered. Wrong order.

---

## C. Prioritized attack summary

| Rank | Issue | Severity |
|---|---|---|
| 1 | B1.2's 150-ref floor is unevidenced rigor theater | High — will be gamed or stall tasks |
| 2 | Taste Ledger is write-only; principles decouple from evidence and drift into doctrine | High — the doc's #1 risk item is worse than stated |
| 3 | B2 infinite loop, no cost model, Sean as synchronous bottleneck | High |
| 4 | B3 SREF "translation" is not a translation; inpainting unverified; syntax is model-specific | High — most likely place the plan silently fails |
| 5 | No measurement instrument for the $100k bar anywhere | High — ROI unverifiable |
| 6 | B5 monolith: ship the law-split, defer the mediums | Medium |
| 7 | Typography/grid absent from a design-system upgrade | Medium |
| 8 | Q2 unanswered before sequencing; RC-5 evidence overclaimed | Medium |

**Recommended cut:** ship RC-2's contradiction fix + B1.1 (pending Q2 answer) + the B3 12-slot architecture with honest non-Midjourney framing + the B5 law-split. Defer the ledger, cap B2 at 3 rounds pending measurement, quarantine all SREF/Super-Tiling claims behind live provider verification. The document's spine is sound; its extremities are spending money to feel thorough.
