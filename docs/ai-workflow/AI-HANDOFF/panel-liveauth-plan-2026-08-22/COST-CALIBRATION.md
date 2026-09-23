# Panel cost calibration — 2026-08-22, 7 seats + Fable

Moved out of the handoff on Fable's ruling: operational calibration belongs with the
panel record, not in a build brief.

## Estimated vs actual

| Seat | Estimated | Actual | Note |
|---|---|---|---|
| glm (GLM 5.3) | $0 | $0 | Z.ai subscription |
| qwen (Qwen 3.8 local) | $0 | $0 | local 5090 |
| dsflash (DeepSeek V4 Flash) | ~$0.0012 | $0.0013 | accurate |
| dspro (DeepSeek V4 Pro) | ~$0.0082 | $0.0302 | 3.7x |
| grok (Grok 4.6) | ~$0.0460 | $0.0613 | 1.3x |
| kimi (Kimi K3) | ~$0.1051 | $0.0459 | came in UNDER |
| sol (GPT-5.6 Sol Pro) | ~$0.1026 | **$0.3474** | **3.4x — see below** |
| **panel total** | **$0.2631** | **$0.4861** | **1.85x** |
| fable (Final Decider, separate call) | not estimated | **$0.6761** | 14179 in / 10686 out |
| **session total** | — | **$1.1622** | |

## The Sol anomaly — UNEXPLAINED, do not repeat a guess as fact

Sol billed **46,361 input tokens** for a document of ~5,000 tokens (the panel harness
reported the prompt at ~5,021 tok; Fable's separate call reported ~9,030 chars-derived
tokens for a larger prompt and billed 14,179 in — roughly proportionate).

Fable hypothesised a hostile-loop harness re-sending the full packet each round without
prompt caching. **That is ruled out at the script level:** `scripts/consult-sol.mjs`
makes a single call and contains no loop, retry-with-history, or message accumulation.

What remains plausible but UNVERIFIED from here: `reasoning.mode=pro` +
`SWAN_SOL_EFFORT=high` may cause provider-side multi-pass reasoning billed cumulatively
against input, and OpenRouter may report reasoning tokens inside the input count for this
model. Nobody has confirmed this.

**Practical guidance until someone confirms it:** quote Sol from a `--dry-run` *and* say
the estimate may run 3-4x high for that seat specifically. Do not present the estimator's
Sol figure as a bound. If cost matters more than Sol's depth on a given run, Grok and
DeepSeek Pro delivered real findings at a twentieth of the price.

## Value returned

Grok, Kimi and GLM each produced findings that survived verification. DeepSeek Pro and
Flash produced the strongest process/safety framing (staging environment, capture-before-
change). Qwen — free — produced the single cleanest statement of the highest risk. Sol,
the most expensive seat, was the only REJECT and produced seven blockers of which all
seven were real.

Fable, at $0.68, found eight items that all seven seats had missed, including two P0s,
and caught that the tooling invoking it was stale. On this evidence the Final-Decider
call earns its cost and should not be skipped to save money.
