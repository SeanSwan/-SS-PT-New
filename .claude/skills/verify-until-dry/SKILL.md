---
name: verify-until-dry
description: Invoke the canonical evidence-bound verifier for hostile review, Kimi K3 escalation, bounded fixes, and two-vantage dry-loop proof on any substantial code, test, config, CI, infrastructure, schema, auth, payment, or PII change.
---

# Verify Until Dry — Claude Adapter

Use the canonical workflow in `.agents/skills/verify-until-dry/SKILL.md` and the
engine at `scripts/verify-until-dry/cli.mjs`.

Do not compute verdicts, lower deterministic risk, hand-author ledger pass events,
or treat Kimi/reviewer output as truth. Run the engine, validate findings, repair
only inside the claimed worktree, and obtain two distinct clean vantages on
unchanged code before reporting `CLEAN_IN_PROVEN_SCOPE`.

When Kimi K3 complexity triggers fire, allow automatic packet construction and
preflight. Obey the configured spend/privacy mode; missing authorization is
`BLOCKED`, never a reason to skip the required review.
