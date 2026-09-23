# Hermes Qwen reasoning-wire fix: GLM review packet

**Review date:** 2026-09-03  
**Review scope:** Hermes local-Ollama reasoning-effort failure and the uncommitted remediation currently under test  
**Requested reviewers:** GLM 5.3 and GLM 5.3 Flash  
**Decision status:** advisory review only; no production source change is authorized by this packet

## Owner request

Review the plan and all work completed so far for the Hermes Qwen reasoning-effort failure. Identify the smallest correct fix, any false assumptions, missing tests, and the evidence required before calling the incident resolved. Do not implement a patch in the review response.

## Incident

Hermes can send a local Qwen 3.8 uncensored request with `reasoning_effort: high`. The Ollama OpenAI-compatible endpoint returns HTTP 500 from the model's Jinja template:

`Unexpected reasoning effort high. Supported types are xhigh (default), medium, and low.`

A separate Gemini request returned HTTP 429 `RESOURCE_EXHAUSTED` because the provider's paid-tier input-token quota was exceeded. Treat that as a separate provider-capacity issue unless there is concrete evidence that Hermes is retrying it incorrectly.

## Independently reproduced local evidence

These probes were run against the configured local Ollama endpoint and the installed `qwen3.8-uncensored:latest` model:

| Request shape | Result |
|---|---|
| `reasoning_effort: medium` | HTTP 200 |
| `reasoning_effort: high` | HTTP 500; template rejects `high` |
| `reasoning_effort: xhigh` | HTTP 500; Ollama rewrites `xhigh` to `max`, then the template rejects `max` |
| reasoning field omitted | HTTP 200 |
| `reasoning_effort: none` | HTTP 200 |

The live model metadata exposes a template guard allowing `xhigh`, `medium`, and `low`, but the actual OpenAI-compatible transport probe is the stronger behavior evidence: explicit `medium`, `none`, and omission succeeded; explicit `high` and `xhigh` did not.

The current Hermes config already contains a per-model override for this model family at `medium`, while the global agent setting remains `xhigh`. Earlier review evidence indicates old Hermes sessions can retain a frozen `sessions.model_config.reasoning_config` value of `high`; a green config check therefore does not prove the effective value used by an existing session.

## Current uncommitted implementation

The Hermes checkout is dirty with user work already present in these files; no commit or push has been made:

- `agent/reasoning_effort.py`
- `agent/transports/chat_completions.py`
- `plugins/model-providers/custom/__init__.py`
- `tests/agent/test_reasoning_effort_wire_translation.py`
- `tests/providers/test_transport_parity.py`

The implementation currently:

1. Adds Qwen 3.8 uncensored model detection.
2. Defines a Qwen effort set containing `none`, `low`, `medium`, and `xhigh`.
3. Maps `high`, `max`, and `ultra` to `xhigh`.
4. Applies that normalization in the shared chat-completions transport and in the custom provider profile.
5. Adds a provider-profile capability method returning the model-specific effort set.

The newly added tests intentionally fail against the live behavior because the current implementation returns `xhigh`:

- `test_qwen38_uncensored_high_maps_to_ollama_safe_medium`
- `test_qwen38_uncensored_maximum_levels_map_to_safe_medium`
- `test_qwen38_uncensored_high_uses_ollama_safe_wire_effort`

Observed red result: 2 failures in the wire-translation module and 1 failure in the provider-parity module; the pre-existing tests in those focused modules pass.

## Proposed remediation under review

The current plan is to replace the incorrect `high -> xhigh` strategy with a transport-safe mapping based on the reproduced endpoint:

```python
QWEN38_UNCENSORED_EFFORTS = ("none", "low", "medium")
QWEN38_UNCENSORED_OVERRIDES = {
    "high": "medium",
    "xhigh": "medium",
    "max": "medium",
    "ultra": "medium",
}
```

Then update the comments and run the focused tests, sibling reasoning/provider tests, and a fresh live request through the Hermes-built kwargs. Existing sessions would still require an explicit `/reasoning --session medium` or a new session if their persisted configuration is not normalized at send time; do not mutate the session database as part of this fix without separate approval.

## Alternatives that must be adjudicated

1. Map unsupported high-tier values to explicit `medium` (smallest change, proven accepted by the endpoint).
2. Omit the reasoning field for unsupported high-tier values so the model template applies its default. This may preserve the model's native default, but it requires deliberate omission semantics in every transport path and has not been implemented or tested.
3. Keep `xhigh` as a supported wire value because the template metadata names it. This conflicts with the actual OpenAI-compatible probe and must not be accepted without explaining the discrepancy.
4. Fix only the config override. This does not address old sessions or any transport caller that forwards a stale `high` value.

## Questions for both reviewers

1. Is explicit mapping of `high`, `xhigh`, `max`, and `ultra` to `medium` the correct minimal, behaviorally supported fix for this exact Ollama endpoint? If not, state the precise alternative and why.
2. Should omission be preferred over `medium` for any level, and what code/test contract would make omission safe and consistent?
3. Does the Qwen model-name matcher overmatch unrelated models or fail common aliases? Identify concrete examples and recommend narrow tests.
4. Is normalization duplicated unnecessarily between the shared transport and custom provider profile? Find any path that would bypass one layer or produce conflicting wire fields.
5. Are the three new regression tests sufficient? List the smallest additional tests needed for `low`, `medium`, `none`, omitted config, model aliases, and non-Qwen models.
6. What end-to-end evidence is required to prove an old frozen session no longer emits the rejected value after restart, without editing persisted session data?
7. Should the Gemini 429 receive a code change in this slice, or should it remain a separately documented external quota event? Only recommend a code change if the packet facts demonstrate a Hermes retry/backoff defect.
8. Give a final verdict: `APPROVE`, `REVISE`, or `REJECT`, with an exact action list and explicit stop conditions.

## Constraints

- Review only; do not modify Hermes source or session state.
- Treat the current uncommitted diff as untrusted work in progress and the live probe results as the primary behavior evidence.
- Do not request or expose API keys, tokens, client data, session identifiers, database contents, private network addresses, or raw logs.
- Keep the Qwen reasoning fix separate from Gemini quota handling unless a concrete shared defect is demonstrated.
- GLM 5.3 and GLM 5.3 Flash share the same Z.ai provider lineage. Agreement is useful as a second lens but is not independent-provider corroboration. The implementing agent must independently reconcile both reports with the live probes and tests.

## Prior review context

Earlier Hermes review notes converged on a persisted-session explanation: the configured per-model override can be correct while an existing session still carries a stale `high` value. Those notes also raised, but did not independently settle, the question of whether omission is preferable to an explicit fallback. Re-evaluate both points against the evidence in this packet rather than treating prior reports as authoritative.
