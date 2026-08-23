---
title: Preflight the billing model, not the price sheet — and verify your own dispatch claims
originating_model: claude-fable-5
tier_basis: claude-fable-5 is on the Rule 68 tier allowlist by name. Kimi K3, GLM 5.3, Grok 4.6 and GPT-5.6 Sol Pro contributed as reviewed seats, not as corpus authors.
date: 2026-08-21
decision: per-seat worst-case preflights must use the seat's measured billing multiplier (Sol Pro ≈ 10× naive), and any synthesis claim about what a tool call did must be verified against the actual invocation before it ships
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-fable-5
    role: dispatcher, verifier, final-synthesis seat, blueprint editor
    did: took over the failed Codex-side launcher; verified the frozen packet SHA-256 before send; ran the four-seat panel in one shot with a hand-overridden planning remit; wrote the synthesis, decision ledger (30 entries), and folded 20 ADOPT decisions into the master blueprint under its 300-line cap; authored the final seat in-session for $0 instead of a paid Fable API call; found and fixed a false claim in its own synthesis during packet drafting, after the dry loop had come back clean
    cost: subscription (flat)
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: best cost-signal ratio of the panel ($0.0638, 23s); unique adds — one-day 50-payload red-team before broker build, named-operator/maintenance-cadence gap, biting/incident doctrine; its voice-note feedback idea was the panel's one REJECTED recommendation
    cost: $0.0638
  - model: z-ai/glm-5.3
    role: hostile reviewer (plan credit)
    did: again the highest-value seat at zero marginal cost — deterministic allergy checking (never LLM judgment), controlled-vocabulary radar queries as an unexamined egress channel, the iCloud "Maginot line" OS-egress finding, the missing data lifecycle, and the ~$0 five-printed-cards blind-rating test
    cost: $0 marginal (subscription)
  - model: x-ai/grok-4.6
    role: hostile reviewer (first Grok seat since the rule-12 repeal)
    did: solid full-brief coverage; sharpest single line ("the probable leak is Hermes tool authority, not the prompt box"); dedicated-radar-inbox design; acceptance tests that bite (canaries, airplane-mode render, second-process home lock)
    cost: $0.0958
  - model: openai/gpt-5.6-sol-pro
    role: hostile reviewer
    did: deepest single review (24-row attack/test table, HMAC-receipt correction, full evidence schema for supply recommendations) — and 84% of total panel spend; billed 56,698 input tokens against a ~4,000-token prompt because reasoning.mode=pro runs multiple internal passes
    cost: $0.8319
skills_touched:
  - id: consult-panel preflight discipline
    change: amended
    failure: the zero-call worst-case used price-sheet arithmetic (16k output ceiling × $/M) and certified ≤$0.77; Sol Pro alone billed $0.8319. The cap ($2.50) held only because total headroom was large, not because the preflight was right
  - id: Rule 51/73 (claims need current-session evidence)
    change: reinforced
    failure: the synthesis stated the seats "received house rules alongside the planning remit" — false; the --remit flag replaces the default remit entirely. Written from memory of the script's default, not from the actual dispatch. Caught only while drafting this packet, after the dry loop passed
  - id: panel remit library (proposed, ledger D-21)
    change: proposed
    failure: the default remit is code-review-flavored; a planning packet needed a hand-written override at dispatch time — a stored planning remit removes the dependence on the dispatcher remembering
---

## What happened

The Codex-side Windows launcher for the Classroom Hermes + Radar five-model review died at
spawn, so the suite re-ran on the Claude surface: hash-verify the frozen packet, dry-run,
four seats in parallel, one attempt each, then an in-session Fable synthesis. 4/4 REVISE;
final verdict REVISE BEFORE MAC; $0.9915 of the $2.50 cap spent; every artifact the handoff
required was produced and the master blueprint absorbed 20 ADOPT decisions.

Two things in this run belong in the corpus, and both are about the operator, not the panel.

## Who did what

**claude-fable-5** dispatched, verified, synthesized, and edited. The one structural call worth
copying: the handoff assumed the final Fable seat was a paid API call, but the session itself
was Fable 5 — authoring the synthesis in-session cost $0, removed all remaining cap risk, and
satisfied the seat requirement by model identity rather than transport.

**GLM 5.3 carried the panel again at $0 marginal** — same pattern as the 2026-08-20 visualizer
panel. Two consecutive panels where the free subscription seat produced the highest-leverage
findings is now a routing fact, not an anecdote. **Kimi K3** was the efficiency king (23 seconds,
six cents, three unique adds). **Grok 4.6**, in its first paid seat, earned its place at a tenth
of Sol's cost. **Sol Pro** produced the deepest artifact and consumed 84% of the spend — its
value is real but its billing model is the lesson below.

## Skills created or changed

- **Preflight discipline (amended):** worst-case math must multiply by the seat's measured
  billing multiplier. Sol Pro's reasoning.mode=pro bills ~10× the naive estimate (multiple
  internal passes; 56,698 input tokens metered on a ~4,000-token prompt).
- **Planning remit (proposed, D-21):** store a planning-review remit beside the code-review
  default so a non-code packet never depends on a hand-written override.
- **Rule 51/73 (reinforced):** see the mistake below — a claim about a tool call must be read
  off the invocation, not reconstructed from the tool's defaults.

## Mistakes I made

- **Underestimated Sol Pro's worst case ~10×** in the disclosed preflight (≤$0.26 claimed,
  $0.8319 actual). The prior day's packet had already recorded Sol at 96% of a panel's spend —
  I did not grep the corpus before preflighting, so the documented signal didn't reach the math.
- **Wrote a false dispatch claim into the synthesis** ("seats received house rules alongside
  the planning remit") from memory of the script's default behavior, when `--remit` had replaced
  the default entirely. Caught during packet drafting, after the dry loop returned clean — the
  dry loop verified hashes, line caps, secrets, and links, but never re-checked my own factual
  claims against the dispatch evidence. Fixed in both artifacts before delivery.
- **Two minor tool-path stumbles** (a compound `cd` command denied; a stale working directory
  broke one check) — both fixed same-turn with absolute paths; cost only friction.

## Error → fix → repeat ledger

- **Paid-seat cost underestimate** — 1 occurrence this session; adjacent signal was ALREADY
  documented the previous day (Sol = 96% of spend) without the mechanism, and recurred anyway
  because nothing forced the corpus into the preflight. Procedural fix that survives: before any
  paid preflight, `hermes-learning-surface --grep "<model name>"`, and carry per-model billed
  multipliers (Sol Pro ×10) in the estimate table. "Be more careful with estimates" would not
  have survived; the grep step does.
- **Unverified self-claim in a synthesis** — 1 occurrence, caught in-session. Fix that survives:
  the closing dry loop must include one round that re-reads the *claims about the run itself*
  (what was sent, to whom, with what options) against the actual command/receipts.
- **Declared-open a decision that was already decided** — 1 occurrence, and it is a REPEAT of
  the indexed STALE-CHECK law ("re-verify a blocker before repeating it"). The synthesis named
  H0-coexistence the primary REVISE driver and a "Sean must decide" item; a pre-existing
  `mac-prep/H0-WRAP-DECISION.md` in the same workstream folder had already ruled WRAP with a
  full state machine. Caught one slice later only because Sean asked to resolve it. Fix that
  survives: before classifying anything NEEDS-PROBE/open-decision in a ledger, `ls` the
  workstream's own subdirectories and grep for the decision's nouns — a decision doc beats a
  fresh deliberation, and finding it is one directory listing.

## External-model calibration

- **GLM 5.3 (plan credit):** highest leverage per dollar for the second panel running; findings
  survived verification; zero refuted.
- **Kimi K3 ($0.0638):** all findings sound; one recommendation rejected on the merits (voice
  capture), which is disagreement, not error.
- **Grok 4.6 ($0.0958):** clean first outing; no refuted claims; strong test-design instincts.
- **GPT-5.6 Sol Pro ($0.8319):** deepest coverage, no refuted claims, but 84% of spend —
  route it to the seats where depth-per-dollar matters and budget it at 10× the naive estimate.
