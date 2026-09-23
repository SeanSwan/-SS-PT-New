# Public-Creative-Lab review policy

**Status:** Current policy for the Public-Creative-Lab packet, effective 2026-08-27.
**Scope:** This policy replaces the former Ox/Grok/Kimi/GLM five-seat request for this packet only. The immutable handoff and original request remain historical evidence and are not rewritten.
**Source packet:** `PUBLIC-CREATIVE-LAB-HOSTILE-REVIEW-AND-BUILD-BLUEPRINT-2026-08-25.md`

## One required review loop

Every implementation slice uses exactly these three hostile passes, in this order:

1. **GLM 5.3 Flash** through the owner's Z.ai subscription as the lead external hostile lens. The legacy `consult-ox.mjs` filename is only a compatibility transport name; it is not a separate Ox reviewer.
2. **GLM 5.3** through the owner's Z.ai subscription as the second external hostile lens.
3. **The active GPT builder/orchestrator's own hostile review.** Whichever GPT agent is active owns this pass (Muna currently; Sol when that is the active seat). It attacks the changed surface, adjudicates the two GLM outputs against evidence, repairs reproducible findings, and repeats until the slice is dry.

The two GLM passes are different capability tiers from the same Z.ai lineage. Agreement between them is not independent-provider corroboration. GLM Flash leads the external lens, but the active GPT builder remains the packet-level orchestrator and evidence gate for this packet; this does not replace the repo-level Rule 46 Fable final-decider/commit gate when a repository commit is proposed. The builder pass is a separate engineering role, not a claim that a third model reviewed the work. If the active GPT seat changes from Muna to Sol, the new seat repeats the hostile pass against fresh evidence; a handoff does not inherit a clean verdict.

Grok and Kimi are retired from this packet because they require unavailable OpenAI credits. They must not be substituted, silently retried, or reintroduced through a generic default roster. No paid seat or unlisted provider is a fallback.

## Review contract

All three passes receive the same scrubbed, hash-pinned packet. Each record must contain:

- `ACCEPT`, `REVISE`, or `REJECT`;
- P0/P1/P2 severity for every finding;
- the violated invariant and concrete failure scenario;
- exact correction and regression tests;
- confidence and evidence gaps.

Reviewer output is a hypothesis until the active builder verifies it against the real file, route, caller, or runtime; an unreproduced finding remains `REVISE` and cannot be dismissed without deterministic or file/runtime evidence. A slice is `DRY` only after repairs and two consecutive fresh-vantage rounds with no new actionable finding. Any unresolved finding is `BLOCKED` or uses the deterministic floor; it never triggers a model fallback.

## Canonical invocation

Use the explicit roster below for this packet; never rely on the generic panel default:

```text
node scripts/consult-panel.mjs --document <packet> --seats glm,glmflash --adjudicator "active GPT builder/orchestrator (<current seat>)" --out-dir <unique-output-dir>
```

The active builder's review is recorded beside the two model outputs. Before any provider call, scrub the packet, verify the egress gate, and record the exact served model. No credentials, PII, classroom/private-derived material, raw configuration, or production data may enter the packet.

## Current gate

The OpenAI-credit blocker is removed for this packet. The 2026-08-27 GLM 5.3 and GLM 5.3 Flash calls completed, both returned `REVISE`, and their findings are not final until reproduced by the active builder. A provider refusal, missing key, egress denial, empty response, wrong served model, or unverifiable output leaves that pass `UNAVAILABLE` and the slice non-final. Hooks, Radar, learning transport, and production activation remain disabled until the packet's three review records and owner receipts are complete.

Run evidence: `GLM-PANEL-REVIEW.md` served `glm-5.3`, SHA-256 `88b4f12ae895f31880c08ea112a851d473b7e7b6e1d8207ccabf45e502f2b416`; `GLM-5.3-FLASH-PANEL-REVIEW.md` served `z-ai/glm-5.3-flash`, SHA-256 `f6bf30bd01c46d5fe577a339610beeeea02292cba9a0356adfccecb6943500ff`; panel exit was `2/2 seats returned cleanly`, estimated per-token spend `$0.0000`. The active builder/Muna review reproduced the contract defects and kept the packet `REVISE`.
