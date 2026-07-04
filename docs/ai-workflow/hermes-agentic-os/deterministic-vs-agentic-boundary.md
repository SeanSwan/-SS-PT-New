# Deterministic vs Agentic Boundary

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the registry §4 four-question ladder, applied until it's reflex
- **Companions:** `../references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §4 (the ladder — canonical statement) · `./agentic-os-principles.md` §1–3 (the doctrine) · `./workflow-audit.md` §2 (where the owner field gets set) · `./command-effect-registry.md` (where the classification becomes enforceable)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. The ladder, applied

Registry §4 asks four questions in order — exact-and-repeatable? messy-but-single-step? multi-step uncertainty? real-world impact? — and the answers map to Script → one AI call → agent → human-approved. This file exists because the ladder is easy to recite and easy to misapply. The working rule: **walk the ladder from the top, and stop at the first rung that fits.** Skipping down to "agent" because agents are interesting is the most expensive classification error we make; skipping up to "script" because scripts are cheap is the most dangerous.

Classification is per *step*, then the chain composes: a workflow may be script-gathered, one-call-summarized, and human-approved at the end. The chain's tier inherits its max (bridge §4); the chain's owner column in the registry names the worst-governed step.

## 2. Twelve classifications

| Job | Classification | Why this rung and not the next |
|---|---|---|
| Secret scan (pre-commit / pre-write) | **Script (T0)** | Pattern matching is exact; an LLM "scanning" for secrets adds false confidence and nondeterminism to a job regex does perfectly |
| Coordination-ledger prune (`coordination-prune.mjs`) | **Script (T0/T2 file ops)** | Age + size thresholds; zero judgment. Already exists as a script — keep it one |
| Receipt digest | **Script (T0)** | Counting, grouping, rendering fixed sections from JSONL. The digest must be *trustable*, which is exactly what determinism buys |
| Deploy-health watch | **Script (T0)** | Poll endpoints, compare codes, emit green/amber/red. An agent here would be a slot machine reporting on a vending machine |
| Package/credit status check | **Script (T0)** | One authenticated API read, one table render |
| Stale-client sweep (the report) | **Script (T0)** | "No session in N days" is a query, not a judgment. IDs only, rule 8 |
| Workout-transcript parse (redacted → structured sets) | **One AI call, fixed contract (T1)** | Input is messy human speech — regex loses. But it's single-step: one transcript in, one schema-validated draft out, pinned prompt version (`./loop-engineering.md` §4). Not an agent: there is nothing to explore |
| Lead triage (classify intent, draft response) | **One AI call, fixed contract (T1)** | Judgment on unstructured text, single step, draft output. Sending anything remains T3 queued |
| Morning briefing | **Agent (T1)** | Multi-step: gather from several sources, decide what's headline-worthy today, compose. The gathering steps are scripts it calls; the composition judgment is the agent part. Output is DRAFT |
| Stale-client outreach drafting | **Agent (T1)** | Explore the client's history (IDs, sessions, notes via API), decide angle, draft. Multi-step uncertainty is real — but it ends at a draft; the send is a separate human-approved T3 |
| Anything client-visible (sending the follow-up, posting content) | **Human-approved (T3)** | Fourth question fires: real-world impact. Whoever drafted it, Sean approves the specific send (`./approval-gates.md`) |
| DB migration / storefront reseed / credential rotation | **Human-run (T4)** | Not merely human-approved — human-executed, two-step confirm, rollback named. `direct-sql` is a FORBIDDEN registry row; the maintenance exception is Sean at a keyboard, not a command |

## 3. Misclassification failure modes — both directions

**Too agentic (an agent doing a script's job):**
- *Costs tokens to be worse.* The nightly health sweep as an agent burns inference to produce a status a curl loop produces exactly — and occasionally hallucinates an endpoint name into the report.
- *Nondeterminism poisons the evidence chain.* Receipts and digests exist so reviews are mechanical. If the digest generator can phrase things differently each run, "diff yesterday's digest" stops meaning anything.
- *Injection surface where none was needed.* An agent that reads webpage/transcript content to do a counting job can be steered by that content (architecture §6). A script cannot be talked into anything.
- *Drift without a diff.* Model updates silently change behavior of jobs that never needed a model. Scripts change only when their code changes.

**Too deterministic (a script doing an agent's — or a human's — job):**
- *Silent edge-case failure.* A regex "parser" for workout transcripts files garbage sets on every utterance it didn't anticipate, with `outcome: ok`. Wrong data with a confident receipt is worse than a refused run.
- *Judgment flattened into thresholds.* A script that auto-picks "the best follow-up template" by rule encodes one Tuesday's intuition forever, and nobody re-examines it because it's "just a script."
- *Impact laundering — the dangerous one.* Wrapping a T3/T4 effect in a deterministic wrapper ("it's just a script that posts the alert") does not lower its tier. The fourth question is about the *effect*, not the executor; a cron job that messages clients is an unapproved T3 actor with excellent punctuality.
- *False fail-closed confidence.* Scripts fail closed only if written to; a script that swallows an API error and reports green is deterministic *and* wrong, every time, at scale.

## 4. Worked chain composition

One workflow, four rungs, to make the per-step rule concrete — the weekly business snapshot:

1. **Gather** (sessions count, lead count, receipt stats via API + JSONL reads) — *script, T0*. Exact queries, exact counts.
2. **Summarize** ("what does this week's shape mean") — *one AI call, fixed contract, T1*. Messy synthesis, single step, DRAFT output, pinned prompt.
3. **Flag follow-ups** (decide whether anything warrants a queue entry — e.g., a stale-client cluster) — the judgment is inside the same call's contract; creating the queue entry is *script, T2* mechanics.
4. **Send anything anywhere** — doesn't exist in this chain. The snapshot ends as a draft in outputs/; distribution would make the chain T3 and someone would have to ask for that explicitly.

Chain tier: T2 (inherits its max). Registry owner column: the one-AI-call step, because it is the least deterministic link. This decomposition — scripts around a single pinned call — is the house default; a monolithic "snapshot agent" would be classification failure §3-direction-one.

## 5. Quick self-test

Before writing `owner` in any candidate row (`./workflow-audit.md` §2): *Could I write the acceptance test as an exact string/number comparison?* → script. *Is the only fuzzy part one transformation of messy text?* → one call. *Would I genuinely do different steps depending on what I find?* → agent, justify it. *Would a stranger notice if this ran?* → a human approves, whatever executes.

## 6. Re-classification

Classification is a registry fact, so changing it is change-controlled (`./command-effect-registry.md` §4). Signals that a rung was wrong: a script's receipts show hand-patching after runs (too deterministic); an agent's receipts show it doing the identical sequence every run (too agentic — extract the script and demote the agent to a caller); a one-call contract keeps failing on input variety (may genuinely need an agent — justify it, per principles §3). Moving *down* the ladder (agent → script) is a simplification proposal any agent may draft; moving *up* (script → agent) or touching the fourth question is Sean's call, always.
