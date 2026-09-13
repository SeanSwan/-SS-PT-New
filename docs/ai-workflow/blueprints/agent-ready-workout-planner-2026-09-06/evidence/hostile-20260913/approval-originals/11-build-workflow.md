# Build workflow — Mega Blueprints v3
Version 2.1 packet addendum, 2026-09-08. Owner Sean.
This extends the existing packet. Application implementation remains NOT RUN.

Use the installed non-vibe-coding v3.1 policy and workflow controller. Fixed
roles are exact `gpt-6-astra` at `xhigh` for architecture, adjudication and
repair and exact `gpt-5.6-luna` at `xhigh` for bounded implementation. An
explicitly user-selected, verified subscription alternative changes only the
builder. Every slice and the final combined regression use the ordered route
`glm-5.3` -> `glm-5.3-flash` -> `gpt-6-astra`; there is no reviewer reselection,
Quinn self-review fallback or silent downgrade. Missing seats block with a
handoff. This model selection supersedes older model-lineup recommendations in
05. Sean's privacy, human commit/push/deploy and final release authority remain.

Use the actual guarded GLM transports separately with `--max-tokens 8000`:
`consult-glm.mjs --model glm-5.3 --max-tokens 8000`, then
`consult-ox.mjs --max-tokens 8000`. The `consult-panel.mjs --seats` mode is
unsupported because it hard-codes 34000 tokens per seat; never bypass egress,
consumption or single-flight guards.

Every slice must have exact owned files, model identities, passing tests,
fresh source/plan/policy hashes, complete review receipts and resolved findings.
Changed plans/evidence revoke readiness. Unavailable or unverified required
seats block with reasons and a concrete handoff; no Quinn fallback or degraded
subset can satisfy the route.
No OpenRouter/API credits, paid extra usage, auto top-up or usage resets.
Default caps: 3 review rounds/slice, 12 calls/task, one in flight, 8000 output
tokens/call, 600 seconds/call. Unknown execution holds; no automatic retry.

R-W01: every implemented slice and final combined state has valid v3 workflow evidence.
T-WF01: execute current installed workflow controller/native hooks against the
actual future app slice and attach its complete workflow receipt to readiness.json.
Status NOT RUN for Swan application implementation. Synthetic controller tests
and skill installation are separate evidence; they do not certify app behavior.

Existing privacy repair gates in 09/10 remain prerequisites. The previous
wireframes, diagrams, requirements, source audits and historical tests remain.
Canonical reusable skill: C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/SKILL.md.
