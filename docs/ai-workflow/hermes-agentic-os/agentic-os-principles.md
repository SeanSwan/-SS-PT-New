# Agentic OS Principles

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the doctrine every other file in this folder instantiates
- **Siblings:** `./architecture.md` (where these run) · `./deterministic-vs-agentic-boundary.md` (principles 1–3 applied) · `./approval-gates.md` · `./audit-receipts.md` · `./kill-switches.md`
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

These twelve principles are the OS. Everything else in this folder is procedure derived from them. When a procedure and a principle conflict, the principle wins and the procedure gets fixed.

## 1. Vending machine, not slot machine

If a job can be exact and repeatable, it is a **script**: same input, same output, every time, auditable by reading the code. A secret scan, a prune, a receipt writer, a count — these earn zero benefit from an LLM and inherit all of its nondeterminism. Deterministic-first is the default answer; reaching for an agent is the move that requires justification. Full ladder with classified examples: `./deterministic-vs-agentic-boundary.md`.

## 2. AI only when the input is messy

A single LLM call is justified when the input is unstructured language or the job needs judgment a regex can't encode — parsing a rambling workout transcript into structured sets, summarizing a week of run logs. Even then: **fixed prompt contract, pinned version, schema-validated output**. One call, one contract, one place to diff when behavior changes.

## 3. Agents only when multi-step uncertainty exists

An agent — something that explores, decides, then acts — is justified only when the path genuinely can't be enumerated in advance. Multi-step uncertainty is the *only* thing agents buy you; everything else they add is cost and risk. Every agent carries a tier, a receipt obligation, and a named kill switch from birth. No exceptions for "small" agents.

## 4. Real-world impact requires a human

Anything T3/T4 — client-visible, team-visible, financial, destructive, credential-touching — is approved by Sean per action, no matter how smart the pipeline that proposed it. Approval names the exact action, tier, target, and expiry; blanket approvals are invalid (bridge §7). The pipeline's confidence is not a gate. Sean is the gate.

## 5. Material actions leave receipts

Every T2+ action emits an append-only receipt: who, what, tier, target, when, approved-by, outcome, evidence pointer (format: `./audit-receipts.md`; bridge §8). The standing rule is absolute: **no receipt → the action didn't happen correctly, regardless of outcome.** Receipts are not bureaucracy; they are the only reason a post-incident review takes minutes instead of days.

## 6. No raw shell through messaging surfaces

No Telegram message, Discord message, or chat prompt ever reaches an unrestricted shell. The `hermes-telegram-safe` lockdown (2026-04-18) is permanent posture, not a phase. Messaging surfaces are the most spoofable input channel we have (bridge boundary 5); the distance between "convenient shell access" and "total compromise" is one prompt injection.

## 7. Browser Harness is eyes, not hands

Read-only by default: navigate, scroll, read, screenshot, capture console/network. Any state-mutating interaction — form fill, click-that-writes, login — needs explicit per-run human approval and produces a receipt (bridge §6). The harness never handles credentials; on admin surfaces, the human authenticates and the harness observes.

## 8. Headless execution runs only registered commands

The headless runner (`./headless-runner-spec.md`) executes commands that exist in `./command-effect-registry.md` — nothing else. An unregistered command is **blocked, not T0** (bridge §4). There is no "just this once" path where an agent composes a novel action at runtime and executes it headlessly; novel actions are proposals (T1) until registered.

## 9. Hermes is never exposed to product users

No client, trainer, or public surface ever touches Hermes (bridge boundaries 1–2). Product operator capability ships through the role-scoped, multi-tenant product tool layer with product auth. Hermes holds cross-domain context — business, family, health, immigration — that must never sit one auth bug away from a product user.

## 10. Automation must earn trust — and can lose it

The promotion ladder is **manual → button → scheduled**, and every rung is earned with clean receipted runs (thresholds: `./skills-to-automations.md`). The ladder runs both directions: repeated failure, a scope change, or a prompt change **demotes** the automation back to manual until it re-earns its rung. Trust is a balance, not a badge.

## 11. Fail closed

If the kill-switch state can't be read, the automation does not run. If the registry entry is ambiguous, the command is blocked. If tier classification is uncertain, ambiguity rounds **up** (bridge §4). If a receipt can't be written, the action doesn't execute. Every failure mode resolves toward inaction plus an honest alert — never toward "probably fine."

## 12. One honest slice at a time

The system grows by slices small enough to verify completely (`./implementation-slices.md`): built, hostile-reviewed, receipted, then closed — before the next begins. No fake completion, no speculative success language, no "the rest is trivial." A half-verified automation platform is strictly worse than no automation platform, because it manufactures confidence without manufacturing safety.

---

**The one-line compression:** *deterministic where possible, approved where it matters, receipted always, killable everywhere, and never load-bearing under the product.*
