# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GATE-HARDENING-SESSION-REVIEW-PACKET-2026-08-23.md
**Tokens:** 2251 in / 12000 out (reasoning: 11014) | total 14251
**Wall:** 199.4s

---

# Verdict: REVISE

The work is real — row-keys diffed instead of trusting the tool's own report, a wrong first fix disclosed rather than buried, a perf defect caught pre-merge. That's why this isn't REJECT. But APPROVE would certify a layer whose central claim — "deterministic enforcement, 17/83" — is **unverified in every checkout except the one it was built in**, and whose enforcement lives entirely client-side, in the exact clients it polices, while the receiving side goes unused.

**Single strongest objection, stated plainly:** nothing in this system distinguishes "gate passed" from "gate not installed." A fresh clone or worktree without `core.hooksPath` set ships zero hooks, fails nothing, and reports green forever. The session hardened the gates against careless agents but never hardened the gates against entropy. Until a gate's *presence* is itself enforced, "deterministic enforcement" is a property of one machine, not of the system.

---

## What breaks first

A new checkout (agent #5 spins up, worktree added, clone after a machine change) without the hooks bootstrap. Rule 42 and Rule 6 silently vanish. Every push "passes." Nobody notices because passing-for-the-right-reason and passing-because-absent are observationally identical — and the discovery event is the next production crash-loop, i.e., the exact incident the gate exists to prevent.

Runners-up, in order: (1) the Rule 6 cache was mutation-verified **only in the false-block direction** — a same-mtime, same-size edit to a token-definition file after fingerprinting yields a stale registry and a false *pass*; you verified the direction that protects latency, not the direction that protects correctness. (2) Nothing flags `git push --no-verify` — the cheapest bypass in the system, ten characters, and Rule 45's blocklist doesn't include it (verify whether `push -f` shorthand is caught, too). (3) The runner checks "current on main" at start, not before write — main moved twice *during this session*; that's a live TOCTOU on the exact branch-staleness hazard it exists to prevent.

---

## The five questions

**1. The Rule 42 / Rule 6 asymmetry — defensible, but the packet argues it from the weak premise.** The strong version isn't "hazard now vs. historical debt"; it's **scope the gate to the thing that harms**. Rule 6 guards a *diff event* — an undefined token already in the tree is inert until someone adds one, the debt is finite and enumerated (831), and shipping it is cosmetic. Rule 42 guards a *state event* — a push **is** a deploy, and an untracked backend file is not debt but live divergence between the tree that booted locally and the commit that will boot in production. Event gates check world-state; diff gates check the delta. Making them symmetric would be the error. **But the asymmetry is indefensible as shipped in two ways:** (a) Rule 6's added-only scope has no sunset — burn down the 831, then flip to whole-tree, or added-only calcifies from adoption tactic into permanent amnesty. (b) Rule 42 ignores multi-agent contention: with 4–8 agents in one tree, agent B's legitimate push is blocked by agent A's in-flight untracked file, and the gate *manufactures pressure toward its own bypass*. The denial message should attribute the dirt (whose files, how old) and offer a safe quarantine path, or the asymmetry is right in principle and hostile in practice.

**2. The pending metric.** Stop counting stock; measure age and flow. The signal is **age of the oldest undistilled document** — monotone, ungameable, and it expresses a real SLA ("everything older than six days is distilled"), which a raw count structurally cannot. Pair it with the creation-vs-distillation ratio so you can tell whether the catalog is losing ground. A raw count is also gameable downward by distilling garbage fast, which — given the excerpt-proxy issue below — is not hypothetical. Optionally sample whether catalog rows actually answer agents' greps; completeness of a library nobody consults is vanity.

**3. Bypassability — acceptable only under an honest relabel, plus three repairs.** These are airbags, not locks: controls against negligence, not malice, which is the correct threat model for agents that are careless rather than adversarial. Calling them more than that *is* theatre. Three repairs before "acceptable": (a) flag `--no-verify` in Rule 45's matcher — an escape hatch
