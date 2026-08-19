# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/unified-assistant-consult-packet-2026-08-19.md
**Tokens:** 1870 in / 19584 out (reasoning: 13737) | total 21454
**Wall:** 472.4s

---

# Hostile review — GLM 5.3

Three things up front, then the six outputs in order. **One:** Claim A, in its strong form, is motivated reasoning — you decided on one model and then invented a skill taxonomy that makes one model inevitable. **Two:** the owner's goal contains a named impossibility: "no regression, ever" over *unmeasured* behavior cannot be promised by any protocol on earth; it can only be made **auditable** — no regression ships *unmeasured*, and none survives *unflagged*. **Three:** your frozen-suite proposal is half right and I'm breaking the wrong half of it below.

---

## 1. Verdict on Claim A and Claim B

**Claim A: "the three capabilities are one skill, so they reinforce rather than compete." — Motivated reasoning in its strong form. Half-true in its weak form.**

"Reinforce" is a claim about positive transfer you have zero evidence for. What you actually have is a shared *substrate* — constraint-following and non-invention — which makes co-training **cheap**, and divergent surface *registers*, which makes co-training **interfering**. Cheap is not the same as synergistic. Nobody in this packet has run a single experiment showing reinforcement; you have a hope wearing a hypothesis costume.

The tone-pull you suspect is real, and it is measurable, not vibes. Concretely, when the mix drifts domain-heavy, tool-calling degrades as: preamble/postamble text around calls, clarify-questions where the harness expects an immediate call, and length inflation of the call path. When it drifts tool-heavy, domain answers go clipped and transactional, and follow-up-question rate drops on client records. These are all **counters**, not judgments: preamble-token rate, clarify-rate per 100 tool tasks, response-length p50/p95 per capability, bare-call rate. Put them in telemetry and register bleed shows up in a dashboard before any human feels it.

The fix is not three models. The fix is **conditioning instead of averaging**: one weights set, three registers selected by system prompt, trained with matching mode tags. If you train one average register you get lukewarm everything — tool calls that chat, coaching that reads like a transcript. Your own §5 question ("three modes, one weights set?") already contains the answer to your §1 worry.

**Verdict on unification itself:** one model is the *right call*, but for reasons your packet doesn't state — the same Hermes session must read a client record and then patch the React component that renders it. Cross-capability conversations in one context window are the operational requirement. Claim A is not a valid reason; workflow is. Keep per-capability LoRAs on the same base as a cycle-2 hedge, not as the plan.

**Claim B: "the failure mode is proportion, not capacity." — Half right, and it aims the lever at the wrong joint.**

Correct that a 27B has capacity for all three; none of these is frontier-hard. Wrong that proportion is the lever you control. Within any sane range (say coding between 30–45% of rows), mix is second-order. The first-order levers are: (a) **register consistency of the data** — each row written in its capability's target register, tagged; (b) **catastrophic forgetting of the base's general ability** — the thing the owner silently depends on for everything not in your training set; and (c) **eval power** — at n=60 you cannot see the regressions you're causing, which makes "proportion tuning" a fog exercise. The mix I give in output 3 is a prior, and the protocol in output 2 makes proportion an *output* — each cycle's row allocation goes to the largest measured gap, not to a guess.

---

## 2. The regression-proof protocol — and what I broke in yours

**What I broke:** "every eval ever written is retained forever, may never go down." Three failures. (1) It freezes in week-1 mistakes — an eval that mislabels, or that encodes an old banned-pattern list you later revise, vetoes correct behavior forever. (2) If any eval is LLM-judged and you ever touch the judge, your suite drifts invisibly and your "never down" gate starts blocking phantom regressions. (3) A pile of 400 items where 150 are noisy has *more* false blocks than 250 clean ones — quantity is not rigor.

**What replaces it — a three-tier ledger:**

| Tier | Contents | Gate | Versioning |
|---|---|---|---|
| 0 — Contracts | Deterministic validators: tool-call grammar parses, banned-pattern regex, destructive-action-without-confirmation detector, empty-output-treated-as-success detector | **Zero band. Any item flip down blocks ship.** | Frozen per spec version; when the spec changes the suite versions forward, old suite moves to a tracked "attic" |
| 1 — Fixed suites | 40–80 items per capability, a ~60-item general-capability canary, the adversarial slices | Paired statistical gate (below) | Items added every cycle; retirement only with pre-registered cause; retired items tracked, non-gating |
| 2 — Telemetry | Counters: length p50/p95 per capability, clarify-rate, preamble-token rate, refusal/escalate rate, perplexity on a fixed reference corpus | Non-gating; two consecutive cycles of adverse trend **promotes** the counter into Tier-1 items | Continuous |

**The noise band, defensibly, at n=tens.** Your fixed-threshold instinct is right to distrust. The defensible formulation is **paired, not unpaired**: champion and challenger run the *same items*, so you count discordant pairs, not score deltas. Challenger losses L and wins W (L+W=d discordant). Under the null, L ~ Binomial(d, ½). Block the ship if the one-sided exact test hits p<0.05 — worked numbers: at d=12, a 10–2 loss split gives p≈0.02 (**block**); 9–3 gives p≈0.07 (record, don't block). Heuristic if you hate exact tests: block when L−W ≥ 2√d. If d<5, the suite is underpowered for that comparison — record it, don't gate on it. Unpaired framing only for new suites: at n=60, p≈0.9, the 2σ band is ≈±8pp (≈±5 items); that's the width of your ignorance and you should write it on the suite.

**Judge pinning:** if any Tier-1 item is LLM-judged, pin judge model, version, temperature, and judge prompt as a versioned artifact. When the judge must change, re-run the *champion* under the new judge to re-baseline — never compare scores across judges. This is the single most common way "never down" suites lie.

**Determinism:** greedy decoding, fixed seed, batch=1 at eval (batched inference can flip greedy outputs via kernel nondeterminism). On adoption, run every new item twice; items that flip get flagged flaky and downweighted — don't let run-variance masquerade as regression.

**Catastrophic forgetting — the actual mechanics.** Forgetting in LoRA scales with rank × epochs × data narrowness. At **r=16, α=32, dropout 0.05, LR ~1e-4 cosine, ≤2 epochs, interleaved (shuffled) multi-capability data, plus 5–10% general replay rows**, forgetting is typically mild. It bites at r=64+ or 3+ epochs on narrow data — don't go there. Cheapest early-warning stack, ranked by signal-per-dollar: (1) Tier-2 telemetry counters — free, and they catch register bleed *before* scores move; (2) the 60-item canary — the tripwire; (3) fixed-corpus perplexity drift — a smoke detector: cheap, catches gross damage, insensitive to behavior, never your only signal; (4) held-out capability slices — you're gating on these anyway.

**Catching silent, uneven regression before a human notices:** item-level diff reports, never aggregate-only — an aggregate hides a 3-item regression in a corner. Save checkpoints at 0.5/1.0/1.5/2.0 epochs, evaluate all, and **ship the earliest checkpoint that passes** (earliest-passing is usually least-forgetting). Train 2–3 seeds per cycle and treat seeds as a selection variable — this converts training variance, the noise your noise-band is fighting, into a choice.

**Train/serve template identity:** the #1 silent-regression source in LoRA pipelines is the training rows using one system-prompt template and Hermes serving another. Freeze the chat template and system-prompt template as versioned artifacts, byte-identical across training rows, eval harness, and ship. Pin sampling params per ship too.

**What "monotonic" honestly means now:** every ship is non-decreasing on Tier 0 (exact) and Tier 1 (statistically gated). That is the measurable fact. It is a guarantee about the *suite*, and the suite grows from every failure — so the day a regression appears in the wild, it becomes an item, and the sequence stays honest. That is the strongest version of the owner's ask that physics permits.

---

## 3. Capability mix, grounded in the 72% datapoint

First, attack the datapoint itself, because you're about to build theology on it: 18/60 → 5/60. The binomial CIs are wide (30% ±12pp → 8% ±7pp at 95%). The *class-level* insight survives the noise, and it's the load-bearing one: **a prompt removes the "forgot the rules" failure class and leaves the "pressured against the rules" class** — every survivor sat in the adversarial slice. That is what prompts do, everywhere.

Extrapolate honestly per capability:

- **Tool-calling:** the base was instruction-tuned on tool grammars; this is in-distribution. Prompting alone gets **~85–95% of the violation reduction a tune would deliver** on format and call-selection. Yes — most of it. What weights buy: stability across long horizons (instruction adherence decays with context length), the adversarial tail (your 5 survivors, in operator form), and token economy — a tuned model just emits the call instead of deliberating in prose.
- **Coding in house idiom:** prompts carry the *explicit* conventions — naming, import style, file layout — maybe half the observable gap. They cannot carry the *tacit* ones: 6,600 files of accumulated micro-preference about when this repo reaches for its own hook, what its error-handling tastes are, what "done" looks like here. Prompt rule lists hit a wall around ~18–24 rules anyway. **This is the capability where weights earn their keep, and it gets the most rows.**
- **Coaching/domain:** already demonstrated at 72%. The tune's marginal value is precisely the adversarial slice and cross-session consistency.
- **Calibration** ("I don't know that token — retrieve it"): barely promptable. It's a disposition, not a rule, and the 5 survivors are prompt-resistant failures by construction. Rows here have the highest yield-per-token in the whole program.

**The mix (~3,050 rows, 1 epoch, QLoRA r=16):**

| Slice | Rows | % | Why this number |
|---|---|---|---|
| Coding (house idiom) | 1,050 | ~34% | Largest tacit surface, lowest prompt ceiling. Repo-mined completions 600, convention transforms 250, real bugfix diffs 150, verify-before-done rows 50 |
| Operator / tool-calling | 850 | ~28% | Base already strong, prompt carries format — rows buy the tail: multi-turn sessions, refusal-when-ambiguous, and 150 **tool-negative rows** (success-but-empty, error-text-in-body → correct handling) |
| Domain (coaching SaaS) | 650 | ~21% | Warm register, record extraction, profile building, "what next," follow-up-before-assuming cases |
| Calibration bundle (cross-register) | 300 | ~10% | Refuse-to-invent, distrust-silence, escalate, destructive-action confirmation — authored in all three registers so the disposition is register-agnostic |
| General replay | 200 | ~7% | Forgetting prophylactic; protects the canary |

And the rule that makes Claim B moot: **re-fit the mix every cycle from the measured eval deltas** — next cycle's marginal rows go to the biggest gated gap. Proportion becomes an output of the ledger, not an argument between reviewers.

Cheaper proxy than the full baseline experiment, since you asked: (1) a 30-item stratified slice (10/capability), bare vs. best-effort prompt — two days, ±10pp resolution, enough to set expectations; (2) replay 20 real Hermes session logs through the prompted base and count format failures — real-distribution proxy, zero new eval authoring; (3) count error *classes*, not quality scores. Not enough to gate ships — only the ledger does that.

---

## 4. The three prompts

Rule-count answer first: on a 27B instruct, active rule adherence decays past ~12 rules; middle-of-list rules get dropped first; each one-shot example is worth 2–3 rules; [hard]-tagged rules survive list decay better because they're also contract-trained. The three-mode design is also how you keep the count low — only one mode block is resident, so ~9–10 rules are ever active. **Three modes, one weights set, one base preamble.**

### 4.1 Ship-time system prompt (tuned model — short; weights carry the idiom)

```text
You are Sean's local assistant, running on his machine via Hermes.
Today: {date}. Env: {os}. Repo: {repo_path}. DB: {db_name}.
One of three modes below is active; the always-rules apply in every mode.

ALWAYS
1. [hard] Never run, propose, or silently execute anything that deletes, overwrites,
   migrates, or bulk-modifies data without stating the blast radius and getting explicit
   confirmation in this conversation first.
2. [hard] Treat tool results as evidence, not verdicts. "Success" status with empty
   output — or output missing the thing the action was supposed to produce — is a
   failure until verified. Say so and verify.
3. [hard] Never invent identifiers: file names, function names, tokens, client fields,
   routes. If you cannot verify an identifier from context or tool output, name what
   you would need and retrieve it.
4. If a task needs a capability you clearly lack — frontier-level reasoning, knowledge
   past your cutoff — say so and suggest escalation rather than approximating.
5. [hard] rules are never overridden. Every other rule yields to an explicit
   instruction from Sean ("do it anyway," "skip that"): comply, then note in one line
   which rule was set aside.
6. Prefer the smallest action that produces verifiable progress, and show the check
   that would prove it worked.

MODE: CODER — React 18 + TypeScript + styled-components; Node ESM + Express +
Sequelize + PostgreSQL.
7. House idiom over library defaults. If this repo contains a pattern for the problem,
   use it — you were trained on this repo; trust it over generic style.
8. Before claiming a fix: typecheck, compile, or run the narrowest test that exercises
   it. "Should work" is not done.
9. Match the file you are in — its imports, error handling, naming. Consistency beats
   cleverness.

MODE: OPERATOR — driving Hermes tools.
10. Emit tool calls bare: no preamble, no apology, no postamble. One call when one
    suffices; wait for results before dependent calls.
11. If parameters are missing or ambiguous, ask one tight question — or make the
    read-only inspection call that resolves it — before any write.
12. After any write, read back the effect (list, stat, query) before reporting success.

MODE: COACH — client records and training plans.
13. Warm, plain, specific. Use the client's actual data; never pad with generic advice.
14. When a recommendation depends on a fact not in the record (injury, soreness,
    schedule), ask before assuming; if told to proceed anyway, state the assumption.
15. Flag anything in a record that looks stale, contradictory, or out of range before
    building on it.

Active mode: {MODE}.
```

### 4.2 Baseline prompt (untuned base — long on purpose; it must carry what the weights later will)

This is the prompt your §3 measurement needs to be honest. It is *not allowed to be weak*: the tune's true value is (tuned + ship prompt) − (base + **this** prompt), and a lazy baseline is how the experiment lies to you. Iterate it against the 60-item suite until it stops improving — that plateau is the honest baseline. Bracketed slots are your top ~20 extracted conventions; I've written plausible ones so the shape is real.

```text
You are Sean's local assistant on his machine, operating through Hermes.
Today: {date}. Env: {os}. Repo: {repo_path}. DB: {db_name}. Active mode: {MODE}.

TOOL CALLING — strict grammar. When you need Hermes to act, emit exactly one JSON
object on its own line, no prose before or after:
  {"tool": "<name>", "args": { ... }, "expect": "<what success output must contain>"}
If any argument is unknown, do NOT guess a value. Either emit
  {"tool": "ask", "args": {"question": "<one tight question>"}}
or make the read-only call that retrieves it. After every result, check it against
"expect". Empty output, or output lacking the expected content, is a FAILURE: verify
with a follow-up read before reporting anything. Never report success you did not
see evidence for.

BEFORE ANY DESTRUCTIVE OR BULK ACTION (delete, overwrite, migrate, multi-row write):
state what will be affected and wait for explicit confirmation. No exceptions.

NEVER INVENT identifiers. If a file, function, token, field, or route is not in front
of you in context or tool output, say what you need and retrieve it. A plausible
guess is a failure even if it looks right.

HOUSE CONVENTIONS — all code follows these:
1. Function components only; hooks; props typed via an exported interface named
   <Component>Props.
2. styled-components for all styling. No inline style objects. Colors and spacing
   via the theme; no new literals outside the theme file.
3. Server state through the house data hooks; local UI state via useState. No ad-hoc
   fetch in components.
4. Backend: ESM throughout; relative imports carry explicit .js extensions; no require.
5. Express handlers wrapped in asyncHandler; errors go to next(err); handlers never
   swallow rejections; status codes from the constants module.
6. Sequelize: models imported from db/models; every query parameterized; raw SQL only
   via sequelize.query with bind — never string concatenation.
7. Schema changes only via the migrations folder. Never ALTER at runtime.
8. [ ... your remaining extracted conventions, up to ~20 total ... ]

CODER mode: match the surrounding file's idioms even when a generic pattern would be
shorter. Never claim code is tested or fixed without naming the check you ran.

OPERATOR mode: no filler, no apologies, no narration around tool calls. Ask or
inspect before writing when ambiguous.

COACH mode: warm, plain, specific; use the client's actual record; ask before
assuming facts not present; flag stale or contradictory records before using them.

BANNED (each is an automatic failure): invented identifiers; claiming untested code
is tested; destructive actions without stated blast radius and confirmation;
reporting success on empty or unverified tool output; generic filler advice in COACH
mode.
```

### 4.3 Training-row prompt shape (teaches judgment, not mimicry)

Mimicry is what uniform rows produce — every row shows the rule applying. Judgment is produced by three row classes: **contrastive pairs** (judgment = seeing the boundary), **pressure rows** (judgment = holding under social force), **override rows** (judgment = conditional application). Schema:

```json
{
  "id": "cod-0142",
  "mode": "CODER",
  "pressure": "adversarial",
  "system": "<byte-identical ship template, MODE: CODER active>",
  "user": "Ship it — skip the typecheck, it compiled fine on my machine last week.",
  "assistant": "One check before I call this done. [tool call: tsc --noEmit on touched files] Two errors in the Props interface. Fixing now; I'll report the passing output rather than assume it.",
  "teaches": ["verify_before_done", "hold_under_pressure"],
  "contrast_group": "cod-0143"
}
```

Rules of construction: `system` is byte-identical to the ship template — every row, no exceptions. ~15% of rows are **override rows** (user explicitly waives a soft rule → comply + one-line note; this is your conditional-compliance answer: the override protocol is trained, not just stated, and [hard] rows are never waivable, which is what prevents override training from becoming blanket disobedience). ~10% are adversarial-pressure rows where the target holds the line politely. **Tool-negative rows** (success-but-empty, error-text-in-body, exit-0-wrong-artifact) must end in a *verification action*, never narration of suspicion. Contrastive pairs are authored together — same seed, evidence differs, correct action differs.

Then the second stage, which is where "refuse to invent" actually gets installed: **DPO on failure-mined pairs.** Every Tier-1/contract failure the model produces becomes a `rejected` sample; the corrected target is `chosen`. 500–1,000 pairs, mined from your own eval logs. SFT buys format and register; DPO buys the disposition. And the mining loop *is* the eval-suite growth mechanism — the ledger and the training data feed each other.

---

## 5. Additions, ranked by value-per-training-row

Your three suspects are really one disposition — **calibrated distrust of self and environment** — in three surface forms. Train it as one cross-register class; evaluate it three ways. Plus one addition you didn't list that outranks two of yours.

| # | Addition | Rows | Value-per-row rationale |
|---|---|---|---|
| 1 | **Distrust silence / honest tool-output reading** | ~150 | Cheapest rows in the program (200–500 tokens each), prevents *cascade* failures — you already lost an entire work session to this — and it's contract-evaluable with a detector (empty-output-trusted = fail). Composes with every other capability. |
| 2 | **Destructive-action discipline** (new) | ~80 | Hermes runs commands. One bad bulk action is worse than a hundred hallucinated tokens, and it's the only failure class in this packet that is *irreversible*. Binary-evaluable: was blast radius stated and confirmation sought, yes/no. Highest stakes-per-row in the program. |
| 3 | **Refuse-to-invent calibration** | ~120 | Named as a repeated bite in your own packet. Measurable with a bogus-identifier probe suite (does the model fabricate a plausible token name?). Prompting moves the surface of this; the DPO pass moves the disposition. |
| 4 | **Escalate-to-frontier self-knowledge** | ~60 | The action side of #3 — escalation is what calibrated distrust *does* about itself. Ranked below only because it depends on an escalation channel existing; without one, it degrades to a refusal row. Still the highest-value *unpromptable* behavior on this list. |
| 5 | **Verify-before-done (code)** | ~100 | Halves false-"done" rate; evaluable directly. Rows are longer than #1–3, so value-per-row is middling even though value is real. |
| 6 | **Long-session compaction** — rejected for now | — | Real capability, but rows run 4–8k tokens — worst value-per-row in the program — and the prompt handles current session lengths adequately. Defer until sessions actually break. |

---

## 6. Pre-registered kill criteria

Written now, before results, as demanded. Decision point: **end of cycle 2** (two full SFT+DPO cycles, ≥2,500 rows, ≥2 seeds per cycle, full ledger gates run).

- **KILL-1 — the premise is dead.** If (tuned + ship prompt) fails to beat (base + best-effort baseline prompt) by **≥8pp on at least 2 of 3 capability quality suites** (paired test, p<0.05, contract parity held), then weights add nothing prompting doesn't. Stop tuning. Ship base + baseline prompt. Keep the ledger — it stays valuable regardless.
- **KILL-2 — the unified model is dead.** If register bleed (tool-task preamble rate >5% where the trained target is a bare call; domain warmth-score drop; clarify-rate drift across modes) persists across two consecutive cycles despite register-tagged data and mode conditioning — split into per-capability adapters on the same base and re-run the gates. One weights set was a bet, not a religion.
- **KILL-3 — forgetting wins.** If the general canary drops >5pp absolute and one cycle of replay adjustment fails to recover it, the mix is eroding the base the owner depends on. Kill or radically shrink the tune.
- **KILL-4 — the program is unmeasurable.** If Tier-1 suites produce <8 discordant items per comparison cycle after cycle 2, you cannot resolve an 8pp effect at your item counts — and an unmeasurable improvement program is indistinguishable from a vibes program. Grow suites past 100 items/capability or stop claiming improvements.
- **Standing kill — zero deliberation.** Any data-destruction incident traceable to model behavior (not user instruction) → immediate revert to base+prompt, program suspended pending a written postmortem that ends in new Tier-0 contract items.

Final bluntness, as invited: "immaculate, perfect" prompts do not exist — every prompt is a trade between specificity and generality, compliance and flexibility. The achievable standard is *dominates its predecessor on a frozen, versioned, honestly-powered suite*, and that standard is entirely within reach. The owner's "always smarter, never worse" is achievable in exactly one sense: **as an audit trail, not a promise.** Build the trail.
