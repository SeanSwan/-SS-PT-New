# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/brain-review/KIMI-PASS-A-DOC.md
**Seed:** .ai-workflow/brain-review/KIMI-VERDICT.md
**Tokens:** 14723 in / 11557 out · **Cost:** ~$0.2175 · **Wall:** 388.9s

---

# KIMI PASS A — ARCHITECT VERDICT: THE MOBBIN HARVEST → SWAN DESIGN BRAIN ENGINE

---

## 1. VERDICT (≤12 lines)

**The unit of evidence is wrong, and that is the whole problem.** I am rebuilding the engine around the **convergence claim** — one reviewed unit citing 2–4 independent products — instead of the per-reference record. Agents inspect (L2/L3) with verifiable receipts; Sean stops inspecting records and starts **batch-adjudicating claims, ~75 min/week**. Human authority is untouched; its *granularity* changes. **Brutal answer on the goal: a universally self-sufficient brain across all seven-plus domains in 11 weeks is NOT achievable** — not under any design that respects §5. What IS achievable, and what I'm building to: **~70 accepted convergence claims backed by ~200–280 independent product citations, 3 domains deep (workout-logging→progress, scheduling/trainer-ops, pricing/checkout), 8 domains mapped shallow, cold-mode-proven in the deep domains by week 11, at ~1.5 hrs/week of Sean's time.** Codex's 600–1,000-reference program is arithmetically compatible with the caps but incompatible with the human-inspection model it assumed; under my unit change its *volume* survives and its *week-by-week domain plan* gets re-sequenced. Vectors: still no — but my Pass-0 deferral condition on K5 ("until the merge burden is felt") is now met, so the trigram candidate-pair generator ships in week 2. Mobbin's rate limits remain **[UNKNOWN]**; I design headroom, not a number.

---

## 2. WHAT I'M KILLING

| Element | Verdict | Reasoning |
|---|---|---|
| **Per-reference evidence record as the reviewed unit** | **KILLED** | This is the throughput killer. One human decision per one product observation caps learning at Sean's minutes. The *observation* stays (as an audit receipt); the *reviewed unit* becomes the convergence claim. |
| **Accept-ratio as the operative novelty/pause metric** | **KILLED as agent-visible** | It is gameable by construction (hostile scenario 4): the same agent that proposes records is judged on their acceptance rate. Under my design the agent never accepts anything, so there is no ratio to game. Coverage-gain replaces it (§6). |
| **Codex's 11-domain-equal-depth pack list** | **KILLED, re-sequenced** | Eleven domains at equal depth in 11 weeks is 60–150 records of spread-too-thin. Three deep + eight shallow (§7). The pack taxonomy itself survives as the coverage matrix's row labels. |
| **Codex's W1–W12 calendar as written** | **KILLED, re-sequenced** | It front-loads depth (W1-2 workout logging) before any coverage map exists. You cannot target queries at gaps you haven't mapped. Breadth-map first, then depth. |
| **`PAUSE_NOVELTY` as a documented mechanism** | **KILLED (it never existed)** | [VERIFIED] No such token in the repo. The pause was human judgment wearing a costume of mechanism. I replace it with an explicit, unspoofable authorization model (§6). |
| **"Human inspects every record" as the L2 interpretation** | **KILLED** | L2 doctrine says "registered researcher" inspects. A registered agent IS a researcher. The doctrine survives; the staffing assumption dies. Sean becomes the L2 *auditor* (spot-checks), not the L2 *operator*. |
| **K5 as exact-string human-normalized matching, alone** | **KILLED, upgraded** | [VERIFIED] `evidence-gate.mjs:85-92` is a `Set` membership test. Semantic dedupe of principles via typed strings is a fiction that will silently double-count. Replaced by trigram candidate-pairs → human merge queue (still no embeddings — §10/Q8). |
| **The 88-reference pre-governance sample as promotable-anything** | **KILLED (kept as query intelligence only)** | Consistent with Appendix B §1: anecdotal, non-promotable. It may seed the coverage map. Nothing else. |
| **A second MCP server / new retrieval infrastructure** | **KILLED** | Consistent with Pass 0: reuse the existing FTS5 spine and `hermes2_brain_mcp_server.py` façade pattern. One thin read-only Design Brain tool surface added to the existing server, week 10–11 only. |

---

## 3. THE THROUGHPUT SOLUTION — §2 solved, with arithmetic

### 3.1 The diagnosis restated honestly

The old model's arithmetic: 144 results reviewable/week under caps, ~25% yield, ~3–4 min of human inspection per reviewed result → **full-cap operation requires 8–10 hrs/week of Sean.** Observed reality: 7 runs total, 17 accepted records. Sean does not have 8–10 hrs/week; the system silently de-rated to ~1 run/week. [VERIFIED by the measured table in §2]. The caps were never binding. **Sean's calendar was.**

### 3.2 The three moves (accepted from §2's candidate list, rest rejected)

**ACCEPT: Agent-inspects / human-spot-checks.** The agent opens flows via MCP and writes inspection receipts containing *verifiable* fields (flow identity, step count, platform, per-step hierarchy notes, timestamp, deep-link retained client-side). Sean spot-checks ~15–20% via deep links. A failed spot-check is a kill-condition event (§6), which is what makes delegation non-ceremonial.

**ACCEPT: Batch adjudication + pattern packs as the unit — merged into one mechanism: the convergence claim.** One claim = "principle P, in phase F, for role R, observed independently in products {A, B, C}, with exceptions E, translated to Swan as C-pattern/tokens T." Sean adjudicates ~12–18 of these in one weekly 60–75 min sitting — each claim is one paragraph plus a citation list, reviewed at a glance, spot-verified at random.

**ACCEPT: Raise yield via targeting.** Every run must name a coverage-matrix gap cell *before* fetching (§6 — this is also the unspoofable resume mechanism). Targeted runs against known gaps should produce claim-yield far above 25% because the "irrelevant result" failure mode is designed out at query-draft time [HYPOTHESIS — the first 3 weeks will measure it].

**REJECT: "Change what evidence means to N-products-as-one-record"** as stated — because it deletes the audit trail. My version keeps the atomic observations as receipts underneath the claim. **REJECT: pure "front-load breadth, defer depth"** — breadth-first alone produces a brain that knows a little about everything and can build nothing. Breadth *map* first (2 weeks), then depth where Swan builds next.

### 3.3 The arithmetic

**Demand side (Sean's time):**
- Weekly batch adjudication: ~14 claims × ~4 min + triage ≈ **60–75 min**
- Spot-checks: 3 receipts × ~4 min ≈ **15 min**
- **Total: ~1.5 hr/week — a budget the observed system proves is sustainable, because it is roughly what Sean was already giving.**

**Supply side (11 weeks, using the existing caps — no cap increase requested, headroom preserved against [UNKNOWN] Mobbin limits):**

| Week | Runs | Claims proposed | Claims accepted (est.) | Notes |
|---|---|---|---|---|
| W1 | 2 (pilot) | 3 | 2 | Build week: schema change, receipts, batch protocol, coverage matrix, retrofit of the 17 existing records |
| W2 | 12 | 10 | 8 | Breadth-map: one run per domain cell; trigram K5 generator ships |
| W3–W5 | 30 | 40 | 30 | Depth 1: workout logging → progress proof |
| W6–W7 | 20 | 26 | 19 | Depth 2: scheduling / trainer ops |
| W8–W9 | 20 | 26 | 19 | Depth 3: pricing / checkout / storefront |
| W10 | 8 | 8 | 5 | Cross-cutting states (empty/error/loading/a11y/destructive) + contradiction week + first cold-mode tests |
| W11 | 4 | 4 | 2 | Dedupe, promote, MCP façade, final cold-mode eval |
| **Total** | **~96** | **~117** | **~85 raw → ~70 after reality factor** | |

Reality factor applied: 0.8 for Sean skipping a week (hostile scenario 11 is a *certainty* over 11 weeks, not a risk), targeting misses, and contradiction re-runs. **Headline: ~70 accepted convergence claims, each citing 2–4 independent products ⇒ ~200–280 independent product citations, organized as 11 domain packs (3 deep, 8 shallow).**

**Throughput comparison, stated without flinching:**
- Old trajectory: 60–150 atomic records **if** Sean found 5–8 hrs/week (he demonstrably doesn't) → realistic old trajectory was closer to **40–80 records**.
- New: ~200+ product citations behind ~70 principles, at ~16.5 total Sean-hours.
- Per-human-hour: old ≈ 3–4 accepted records/hr; new ≈ 12–16 product-evidence units/hr ⇒ **~4–5× per hour, and ~3–4× total feasible volume.** The honest "10×" exists only measured as *coverage-equivalents per sustainable human-hour* — a claim that cites 4 products and names exceptions and a Swan translation carries the design content of ~3–4 atomic records. I claim **~10× on that basis and no other.** Sean gets the real numbers, not the flattering one.

**What this does NOT buy:** deep self-sufficiency in commerce/marketing/community/admin. Those get a shallow map + named gaps. If Sean renews Mobbin, every future session is pre-targeted — which is what "Mobbin becomes a refresh/discovery source" actually means in practice.

---

## 4. YOUR LAYER MODEL

L0–L8 survives as doctrine (it is genuinely good); three layers change staffing, one artifact is added, Codex's five layers are absorbed:

| Layer | Change |
|---|---|
| **L0 Control** | + `authorizedRuns[]` entries `{gapId, maxQueries, maxOpened, expiryUtc, humanNote}` — human-minted run tokens (§6). + single-run lockfile (concurrency 1 made mechanical, not documentary). + `spotCheckLog` with auto-pause on failure. |
| **L1 Acquire** | + **Coverage matrix** as the mandatory planning artifact. No gap cell, no run. Query drafts hash-committed to the append-only ledger *before* fetch. |
| **L2 Inspect** | **Staffing change: registered agent inspects, writes verifiable receipts. Human audits via spot-check.** Receipts are the atomic audit trail; they are never the reviewed unit. |
| **L3 Observe** | Agent extracts principle candidates from its own inspections. Unchanged in kind. |
| **L4 Ledger** | + corroboration edges (a K-collision becomes `corroborates: claimId`, raising the independent-product count instead of rejecting or duplicating). + trigram K5 candidate-pair table feeding a human merge queue. |
| **L5 Synthesis** | Agent assembles observations → **convergence claims** + a mandatory contradiction report per batch. Non-canonical. |
| **L6 Adjudication** | **Human, weekly, batch.** Accept / reject / trial / merge / send-back. The only human gate that spends time. |
| **L7 Canon** | Untouched. Human-approved repo change only. No MCP path to it, ever. |
| **L8 Delivery** | + thin read-only tool surface on the existing MCP server (W10–11). |

**Codex's five layers, disposition:** (1) research-run ledger — **accept** (exists as audit JSONL; formalize the run record with the pre-fetch question hash). (2) normalized pattern ledger — **amend**: the normalized unit is the convergence claim, not a freeform per-pattern doc. (3) promotion gate — **accept with one fix**: "≥3 independent products **or** strong direct fitness evidence" becomes "≥2 independent products, with single-product claims flagged `single-source` and confidence-capped" — ≥3 across 11 weeks is arithmetically incompatible with the caps. (4) domain packs — **accept, re-sequenced** (§7). (5) portable MCP — **accept, deferred and thinned** (§10/Q13).

---

## 5. THE EVIDENCE CONTRACT

**Two artifact classes. Only one is adjudicated.**

**(a) Inspection receipt** — atomic, agent-written, never adjudicated, spot-checkable:
```
receiptId · runId · sourceRef(K1) · product · refType · surface · platform (K2/K3 fields)
· openedAtUtc · stepCount · hierarchyNotes · stateNotes (empty/error/loading observed?)
· deepLinkRef (client-side only, never committed) · inspectorActorId
```
Denied fields per Appendix B §5, enforced by the existing gate + **magic-byte binary detection** (not extension-sniffing) + **lstat symlink rejection** (§11).

**(b) Convergence claim** — the reviewed unit:
```
claimId · gapId (coverage cell) · principleNormalized (K5 string)
· workflowPhase · userRole · productCategory
· independentProducts[] (≥2, or status flag: single-source, confidence-capped)
· receiptRefs[] · corroborations[] · contradictions[] (claimIds, both directions)
· exceptions · a11yImplications · failureStates
· swanTranslation { b2Arc · cPatterns[] · tokens · qaRisks }
· rejectedPatterns[] { pattern · whyFailsSwan }
· confidence { level · basis: productCount | directFitnessEvidence | trialResult }
· contraSearchResult · doctrineConflictCheck (mechanical diff vs anti-patterns.md/design.md rules)
· status: proposed | accepted | trial | rejected | superseded
· lastVerified · staleAfterDays
· humanDecision { actor · utc · batchId · note }
```
K1–K5 still computed, but a collision now routes to `corroborations[]` (confidence lift) or the merge queue (K5 candidate) instead of a dead reject. **Contradictions are first-class, bidirectional, and never resolved by scoring** — confidence ranks review order, nothing else (§10/Q9).

---

## 6. NOVELTY / RESUME / STOP

**Metric replacement.** Accept-ratio dies as an agent-visible number (agent can't accept ⇒ nothing to game). Replacement dashboard, computed over rolling 4-run windows:
- **CoverageGain** — accepted claims filling *previously empty* matrix cells / run (breadth-phase metric).
- **ConfidenceLift** — corroborations raising existing-claim confidence / run (depth-phase metric; prevents breadth-metric from penalizing correct depth work).
- **ContradictionYield** — real contradictions surfaced / run (a run that finds a genuine conflict is a success, not a failure).
- **ColdUsefulness** — §8's eval score (the only terminal metric).

**Pause triggers (mechanical):** CoverageGain < 0.25 AND ConfidenceLift < 0.25 over 4 runs; any spot-check failure; any denied-data detection; cap breach; service warning from Mobbin (auto cool-down — stop before the limit, per §5).

**The unspoofable resume condition.** Resume is not a boolean; it is a **human-minted run authorization**: Sean writes an `authorizedRuns[]` entry into `control.json` keyed to a `gapId` that the gate verifies is *not already covered* in the run ledger. An agent cannot resume the system because (a) it cannot mint the entry (L0 write authority is human-only, unchanged), (b) a forged gapId fails the ledger check, (c) the pre-fetch question hash makes post-hoc question-rewriting detectable as a ledger inconsistency. This kills hostile scenario 1's boolean-flip by removing the boolean.

---

## 7. COVERAGE PLAN — the 11 weeks, concretely

| Wk | Work | Exit test |
|---|---|---|
| 1 | Build: claim schema + gate changes, receipt format, batch-adjudication protocol, coverage matrix v1, lockfile + authorizedRuns, magic-byte/symlink writer hardening. Retrofit the 17 records → ~5 seed claims. 2 pilot runs. | Gate passes new schema; Sean runs one batch session ≤ 75 min. |
| 2 | **Breadth map:** one run per domain cell (11 cells + universal-states cell). Trigram K5 candidate generator ships. | Every matrix cell is `mapped | gap | deferred`; nothing is unknown. |
| 3–5 | **Depth 1 — workout logging → progress proof → next action** (Swan's actual next surface [LIKELY — confirm, §12]). The Appendix B §8 first-run question anchors W3. | ~30 claims accepted; pack v1; Sean trial-builds one component from the pack and grades it. |
| 6–7 | **Depth 2 — scheduling / trainer ops** (calendar vs availability vs reschedule separation is already a known convergence from the audit). | ~19 claims; pack v1. |
| 8–9 | **Depth 3 — pricing / checkout / storefront** (highest consultancy portability per dollar). | ~19 claims; pack v1. |
| 10 | Cross-cutting states (empty/error/loading/a11y/destructive-recovery); contradiction-resolution week; **cold-mode tests begin.** | Zero unresolved contradictions in deep domains; cold-mode trial 1 graded. |
| 11 | Dedupe/merge queue cleared; canon promotions (L7, human); thin MCP façade; **final cold-mode eval; day-91 export verification.** | §8 pass criteria met or honestly reported as not met. |

---

## 8. INDEPENDENCE PROOF

**Cold-mode test (concrete):** From W10, weekly: `control.json` kills Mobbin; agent receives a real small design task *in a deep domain*; it may use only canon + accepted packs via the recall façade; output graded by Sean against the existing QA gates + a 10-point rubric (hierarchy, state coverage, a11y, token fidelity, anti-pattern avoidance). **Pass = ≥8/10 with zero Mobbin calls, twice consecutively, in each deep domain.** Every claim used cites its claimId, so usefulness is attributable.

**Build-quality eval (the 17/20-vs-0/20 analogue, run on Sean's own data per my Pass-0 doctrine):** Two comparable small surfaces, one built brain-assisted, one built cold-model-only, blind-graded by Sean on the same rubric. N=2 is weak; by W11, four pairs (W3, W6, W8 trial-builds + final) gives a directional answer honestly labeled [HYPOTHESIS-grade evidence]. The golden-set harness from the broader brain review is the same machinery — one eval investment serves both.

**Dependence metric:** share of canon principles with single-source (Mobbin-only) support; target: declining across W2→W11, reported weekly in the batch packet. Target number set after first measurement — inventing one now would be theater.

---

## 9. PORTABILITY PARTITION

**Reusable IP (the consultancy product):** the evidence/claim schema + gate pattern; the authorized-runs control model; the coverage-matrix method; batch-adjudication protocol; receipt format + magic-byte/symlink hardening; corroboration/trigram-merge machinery; cold-mode eval harness; the source-adapter contract (below). **Scaffolding (never carry):** the fitness domain pack *contents*, Swan token/C1–C12 translations, any path, any actor name, the 11-cell matrix itself.

**Cold-client install (e.g., e-commerce, legal, real estate):** five artifacts (consistent with Pass 0's protocol-as-product): `SCHEMA.md`, `ingest`/gate, `query` façade, `lint`, `eval/` — plus a blank coverage matrix the client fills with *their* domain cells and *their* doctrine files as the L7 target. Half a day, config-not-code.

**Source-adapter contract:** any source (Mobbin today; Dribbble, app-store teardowns, competitor audits tomorrow) must yield the §5 receipt struct and accept the same denylist/anti-clone rules. Mobbin is adapter #1, not the engine.

---

## 10. ANSWERS TO §7 Q1–Q24

1. **Unit of evidence:** the convergence claim; atomic observations demoted to receipts (§5).
2. **10× mechanism:** agent inspection + human batch adjudication + gap-targeted queries (§3). Honest multiple: 4–5×/hour, ~10× coverage-equivalents per sustainable hour.
3. **11-week yield:** ~70 claims / ~200–280 citations / 11 packs (3 deep). Arithmetic in §3.3. Self-sufficiency: domain-scoped only — universal is not achievable, full stop.
4. **Human authority spend:** one weekly batch session + spot-checks, ~1.5 hr/week, at L6 only.
5. **Codex's program vs caps:** the *volumes* fit (50–83 refs/wk < 144 cap) but the *human-inspection assumption* makes it infeasible; the two documents contradict each other and neither noticed. My unit change reconciles them; my re-sequencing replaces the calendar.
6. **Accept-ratio right?** No. CoverageGain + ConfidenceLift + ContradictionYield + ColdUsefulness (§6).
7. **Resume condition:** human-minted `authorizedRuns[]` entry keyed to an uncovered gapId; mechanical verification; no boolean exists to spoof (§6).
8. **K1–K5 evolution:** collisions become corroboration edges (confidence lift, no new unit); K5 gains a trigram candidate-pair generator → human merge queue. **Vectors verdict — explicit:** unchanged. My Pass-0 deferral condition ("until the merge burden is felt") is now *met* by the convergence-claim design, so the generator ships W2 — as trigrams, not embeddings. Embeddings still require measured trigram failure. Consistent revision, not a reversal.
9. **Contradictions:** first-class bidirectional links, mandatory contra-search report per batch, scoring never suppresses (§5).
10. **Decay:** `lastVerified`/`staleAfterDays` enforced in lint (the doctrine exists and is unenforced today [VERIFIED — Pass 0 §2e]); cold-mode failure invalidates; product-evolution re-verification scheduled per claim.
11. **Codex's five layers:** §4 — accept 1, amend 2, accept-with-fix 3, accept-resequenced 4, accept-deferred 5.
12. **Storage substrate:** JSON + append-only JSONL outside Git stays as the *system of record* (exclusive-create, auditable, portable). The evidence corpus is **also indexed as its own collection in the existing WSL FTS5 spine**, labeled recall-tier, queried through the existing façade. Rationale: one query home (Pass 0), trust separation by collection label (not by infrastructure), and the index is disposable — the corpus is the asset. Merging into the vault index would re-open the PII-exclusion question for zero benefit.
13. **MCP server:** yes, thin, read-only, W10–11, on the *existing* server. Tools: `search_patterns` · `get_archetype` · `get_state_requirements` · `check_design_against_doctrine` · `get_coverage_map`. No write tools. No path to L6/L7.
14. **Packs vs design.md/components.md:** packs are recall-tier *evidence with Swan translations*; canon files stay hand-adjudicated doctrine. Packs cite C1–C12; they never define them. Lint flags any pack whose translation contradicts a canon token/anti-pattern.
15. **Pipeline:** gap cell → query draft (hash-committed) → human run-token → fetch (broker, backoff) → agent inspect (receipts) → agent observe → dedupe/corroborate → claim synthesis + contradiction report → **Sean batch-adjudicates** → canon promotion (human) → matrix update.
16. **Breadth vs depth:** map-first (2 wks), then depth on what Swan builds next (§7). Breadth-only fails "holds its own"; depth-only fails portability.
17. **Highest-value portable domains:** pricing/checkout, scheduling, onboarding, universal states — every client vertical needs them. Swan-only: workout logging, progress/PRs, trainer ops.
18. **Domain "done":** CoverageGain < 0.25 AND ConfidenceLift < 0.25 over 4 targeted runs AND zero open contradictions AND cold-mode pass. Then the cell is marked `done` and further runs against it fail the gapId check — waste becomes mechanically impossible.
19. **Measuring dependence:** §8 cold-mode + single-source-share metric.
20. **Proof a principle improved a build:** §8 blind A/B pairs + attributable claimId citation in build receipts.
21. **Day 91:** everything is local files + canon; Mobbin unavailability becomes permanent cold-mode; the engine (packs, MCP façade, eval) keeps working. Lapse mid-pack: packs are incremental, nothing is half-lost.
22. **IP partition:** §9.
23. **Cold-client install:** §9 — five artifacts + blank matrix, half a day.
24. **Non-Mobbin sources:** yes — §9 adapter contract; Mobbin is adapter #1.

---

## 11. HOSTILE TABLE

| §8 Scenario | Survives? | Minimum fix |
|---|---|---|
| Agent fakes inspection; boolean flipped to resume | **Yes** — no boolean exists (§6); receipts carry verifiable fields; spot-check failure auto-pauses; confirmed fraud revokes the actor in `identity-registry.json`. | The authorized-run mechanism + receipt format, as specified. |
| Two agents query concurrently; undocumented burst limit blown | **Yes** — single-run lockfile in L0 makes concurrency-1 mechanical; caps ledger checked pre-fetch. | Lockfile; without it this fails silently today. |
| Retry burst; service warning mid-batch | **Yes** — broker with backoff + circuit-breaker; any service warning = automatic cool-down, human-only resume. Stop before the limit [limits UNKNOWN — never probed]. | Broker pattern (consistent with Pass 0 Q26). |
| Yield gamed to stay above floor | **Yes, by construction** — the agent cannot accept anything; the floor it would game no longer exists. | Removing agent-visible accept-ratio. |
| One screen inflated into many records | **Yes** — claims require ≥2 independent products (or flagged single-source, confidence-capped); one sourceRef is primary in exactly one claim; K2/K3 still reject replay. | The claim contract itself. |
| Same K5 principle counted twice from two products | **Partially today → Yes after W2** — corroboration edges + trigram candidate pairs → human merge queue. Unique-product count, never record count. | Ship the W2 trigram generator; until then this is the weakest point. |
| Promoted principle contradicts doctrine unnoticed | **Mostly** — mechanical doctrineConflictCheck (diff vs anti-patterns/design.md) in every claim + contra-search report in every batch packet. Residual risk on prose-level conflicts [HYPOTHESIS]. | The two checks as specified; human adjudication is the backstop, unchanged. |
| Screenshot stored as `.md`; symlink into repo | **No today → Yes after W1** — magic-byte binary detection (extension is irrelevant), lstat symlink rejection, path jail outside repo. | W1 writer hardening — non-optional, it is in the build list. |
| Research question rewritten post-hoc | **Yes** — question hash committed to append-only ledger pre-fetch; post-hoc edits appear as ledger inconsistencies in lint. | The pre-fetch hash. |
| Mobbin changes product/limits mid-sub; lapses day 91 | **Yes** — headroom posture (never operate near [UNKNOWN] limits); all assets local; day-91 is the designed end-state, not a failure (§10/Q21). | None beyond the design. |
| Sean busy 3 weeks | **Degrades gracefully** — acquisition halts (no run-tokens), but agents keep useful queued work: matrix maintenance, pack drafting from accepted claims, doctrine-conflict lint, eval-harness work. Backlog adjudicates in one longer session on return. The reality factor in §3.3 already prices this in. | Budgeted, not fixed. |

---

## 12. OPEN QUESTIONS FOR SEAN

1. **Mobbin rate limits:** [UNKNOWN]. I designed headroom (12 runs/wk caps kept, broker circuit-breaker, warning = cool-down). Confirm you accept "never probe the cap" as permanent policy — it costs potential volume we cannot quantify.
2. **Confirm the three deep domains** — workout-logging→progress, scheduling/trainer-ops, pricing/checkout. If Swan's actual next build is different, W3–5 retargets immediately; the plan is domain-swappable by config.
3. **Agent-as-L2-inspector sign-off.** Doctrine says "registered researcher"; I am registering an agent as one, with you as auditor. If you consider *opened-by-agent* insufficient as "inspection," the throughput solution collapses back to ~60–150 records and this whole verdict is void — this is the single decision everything hangs on.
4. **Fable's adjudication role.** Codex's gate says "human/Kimi/Fable approval"; §5 says human sole canon authority. My reading: agents may *co-review* L6 batches but only Sean signs. Confirm.
5. **Weekly time budget:** is 1.5 hr/week real? If it's 45 min, cut proposed-runs to ~8/week and the headline drops to ~50 claims / ~150 citations — still 3× the old feasible trajectory.
6. **Retrofit disposition of the 17 existing records:** I plan to fold them into ~5 seed claims in W1 rather than leave them as atomic orphans. Object?
7. **Golden-set seeding (from the brain review):** the cold-mode rubric needs 2 hours of your grading in W3/W6/W8/W11. Same ask as before — your grading, not mine, or the eval is theater.
8. **Codex's audit findings (Hevy/Strava/Square/Calendly et al.):** usable as *query seeds* for the coverage matrix, non-promotable per Appendix B §1. Confirm that reading.

**Bottom line, unsoftened:** the governed system's doctrine was good and its unit economics were fatal. Kill the per-record human loop, keep the human gate as a weekly batch over convergence claims, and 11 weeks buys you a brain that genuinely holds its own in three domains and knows exactly what it doesn't know in eight more. It does not buy universal self-sufficiency, and no §5-compliant design does. That is the real number.
