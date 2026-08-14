---
decision: Panel finds, Kimi adjudicates. N cheap models review the same evidence BLIND and in parallel; Kimi then receives every finding plus the original evidence and rules each one real / not real. Debate is a gated escalation, never automatic.
status: open
supersedes: none
---

# Panel-Finds / Kimi-Adjudicates — design

**Sean, 2026-08-14:** *"the whole point of having all those different options is so we can have
different routes to look at just in case it may have missed something, but at the same time [Kimi]
would be the final brain to say 'that's not real'. They will all go first, give their view, and then
we review all their stuff."*

---

## 1. The shape

```
  evidence packet
        │
        ├──► model A ─┐   ALL RUN BLIND, IN PARALLEL.
        ├──► model B ─┤   No model sees another's output.
        ├──► model C ─┤   Independence is the entire point: shared
        ├──► model D ─┤   context makes them converge, which destroys
        └──► model E ─┘   the coverage the panel exists to buy.
                     │
              findings pool  (deduped by file:line + claim)
                     │
                     ▼
              ┌─────────────┐
              │  KIMI K3    │  gets: every finding + the ORIGINAL evidence
              │ ADJUDICATOR │  (never a summary — see §3)
              └─────────────┘
                     │
        REAL / NOT REAL / NEEDS-PROOF per finding
                     │
                     ▼
        single verdict → optional gated DEBATE
```

**Why this order and not a debate:** a debate is N models arguing across R rounds — cost scales
`N × R`. This is N models once, plus one adjudication: cost scales `N + 1`. Measured, adding eight
panel models to Kimi is **~2-3¢** on a 50k-char packet. Rounds are what cost money, which is why
debate stays behind an explicit confirm.

## 2. Why panel-then-adjudicate rather than panel-alone

A wide cheap panel raises **recall** and lowers **precision** — more candidate findings, more noise.
Kimi's measured record over 16 rounds is the opposite: ~56 findings, 55 verified real, 1 inaccurate
(an attribution, not a false defect), 0 hallucinated. It is the precision instrument.

Using it to *filter* rather than to *find* plays each part to its strength and preserves the thing
that has actually been working. **The panel must never be allowed to vote a finding in — Kimi rules,
and its ruling is the output.**

## 3. Non-negotiables (each one is a defect this session actually produced)

1. **Blind panel.** No model receives another's output. Convergence is failure.
2. **Adjudicator sees the ORIGINAL evidence, not a digest.** This session proved a summary is where
   false claims survive — a fix was reported as landed that had never been applied, and only reading
   the real diff caught it. Kimi must be able to check a finding against the source itself.
3. **Every finding carries its origin model.** Needed to learn which model is worth paying for on
   which task class. Without it there is no calibration, only vibes.
4. **NOT REAL still gets recorded.** A rejected finding is training data about the model that raised
   it. Dropping it silently loses the calibration signal.
5. **Adjudication is not a vote.** Five cheap models agreeing does not make a finding real; the
   panel's job is coverage, Kimi's job is truth.
6. **Every call writes a ReceiptV1** (built as S0) — per-model cost, latency, findings raised,
   findings upheld. That is the flywheel data.
7. **Design-ceiling respected.** Kimi and HY3 are `ceiling: 'design'` in `providers.mjs` and REFUSE
   packets whose evidence paths match the sensitive pattern (auth/billing/PII/secrets/migrations).
   Enforced in code; widening it is a Sean-gated change, not a workflow decision.

## 4. Panel roster — verified routing 2026-08-14

One model per lab, deliberately, so training corpora do not overlap.

| Model | Lab | $/M in→out | Ctx |
|---|---|---|---|
| `deepseek/deepseek-v4-flash` | DeepSeek | 0.09 → 0.18 | 1M |
| `qwen/qwen3.5-flash-02-23` | Alibaba | 0.07 → 0.26 | 1M |
| `meta-llama/llama-4-scout` | Meta | 0.10 → 0.30 | **10M** |
| `z-ai/glm-4.7-flash` | Zhipu | 0.06 → 0.40 | 203k |
| `nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA | **0 → 0** | 1M |
| `mistralai/mistral-nemo` | Mistral | 0.02 → 0.03 | 131k |
| `bytedance-seed/seed-1.6-flash` | ByteDance | 0.07 → 0.30 | 262k |
| `openai/gpt-oss-20b` | OpenAI (OW) | 0.03 → 0.14 | 131k |
| `tencent/hy3-preview` | Tencent | 0.06 → 0.21 | 262k |
| **`moonshotai/kimi-k3`** | Moonshot | 3 → 15 | — | **ADJUDICATOR** |

Also verified routing, held in reserve: `xiaomi/mimo-v2.5`, `stepfun/step-3.5-flash`,
`nousresearch/hermes-4-70b`, `deepseek/deepseek-v4-pro`, `google/gemini-3.7-flash`.

**Saving:** `tencent/hy3` costs $0.14/$0.58; `tencent/hy3-preview` is $0.06/$0.21 — same lab, ~⅓.
A/B on one real packet before switching.

**Catalog warning:** OpenRouter's public `/models` is INCOMPLETE (`kimi-k3`, `gpt-5.6-sol`,
`opus-5` route but are unlisted) and a `:free` listing is not an entitlement (`hy3:free`,
`qwen3-coder:free`, `gpt-oss-120b:free` all refuse). **Probe every candidate ID before trusting it.**

## 5. Debate — the gated escalation

Default is one panel pass + one adjudication. Debate fires ONLY when:
- Kimi's adjudication returns genuine contradictions it cannot resolve from the evidence, **or**
- Sean asks for it by name.

Requirements: printed cost estimate BEFORE the first paid round · explicit two-step confirm ·
hard round cap · running spend total shown between rounds.

## 6. Open decisions for Sean

1. **Panel width per task class?** All nine every time, or a smaller default with the full panel on
   request? Nine costs ~2-3¢; the real cost is adjudication input size, which grows with findings.
2. **Does the panel run on non-review work** (planning, design options), or only hostile review?
3. **Free-model data retention.** Rule 8 (zero PII to LLMs) applies regardless of price. Provider
   terms should be checked before free models see repo evidence — cheapest is not safest.
4. **Disagreement floor.** If every panel model finds nothing, is that a signal to skip
   adjudication and save the spend, or does Kimi always run?

## 7. Build order

Blocked on S0 shipping (dry-loop rounds 17-18 owed). Then:
- **P1** roster config + blind parallel fan-out, receipts per call
- **P2** finding schema (file:line, claim, origin model) + dedup
- **P3** adjudication prompt + REAL/NOT-REAL/NEEDS-PROOF verdicts, upheld-rate tracked per model
- **P4** gated debate escalation
- **P5** the cost/calibration rollup — which model earns its place, per task class
