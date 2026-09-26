# Evidence-Sufficiency Dispatch Protocol (all AI harnesses)

**Status:** MANDATORY (Rule 91, added 2026-09-26 by Sean).
**Scope:** every dispatch of AI judgment — subagent fan-outs (rule 90), consult scripts,
external harnesses, operator bridges, review chains (rule 46), AI Village brains (rule 16).
**Problem it exists for:** a consult that receives only summaries returns plausible-but-wrong
answers with full confidence. Proven twice on 2026-09-26 alone: (1) a money-path fix that
passed its own test suite was broken in minutes by a reviewer with repository access (the
"tests green ≠ attack-survived" lesson); (2) a badly dispatched 8-round parallel review batch
returned nothing usable. Summaries are a *lossy compression of the evidence* — and every
compression step is a place where the answering model silently substitutes guesswork for fact.

**The bar, in one sentence:** never ask a model to give a verdict on evidence it cannot see;
never let it answer without saying what it actually verified.

---

## 1. Tier the harness by what it can actually SEE

| Tier | Seats (current inventory) | What it can see | Dispatch consequence |
|---|---|---|---|
| **A — repo-rooted agent** | Codex CLI, Astra via `consult-astra-subscription.mjs` (default, no `--bounded`), WorkBuddy, CLINE, Cursor, ZCode/vs-claude, Claude Code seats, OpenCode | The repo itself (files, diffs, tests, git history) | **Pointer-rich packet + re-derivation mandate.** Do NOT inline what the agent can read. Give SHAs, `file:line` maps, exact read-only commands, and the order: *verify the packet's claims, don't trust them.* |
| **B — packet-only model** | GLM (`consult-glm.mjs`), Gemini (`consult-gemini.mjs`), OpenRouter escalation seats (rule 16), DeepSeek (dev-preview, $5 cap, never authoritative), AI Village brains, Fable fallback transports | ONLY what the packet carries | **Evidence-inline packet.** The packet must contain the actual diffs/excerpts/outputs the verdict depends on — a characterization is not evidence. Cap discipline: GLM single-call lock (never seize, retry); consult-panel.mjs is UNSUPPORTED (hard-codes 34k tokens/seat). |
| **C — chat/operator surface** | Hermes (Pi+Telegram, T0-T4 tiers), Sean reading a handoff | The message text only | **Decision brief, pre-verified.** Facts must already carry file:line/probe evidence from a Tier-A/B pass. Never hand raw unverified claims upward. |

**Tier-upgrade rule:** if a verdict is important enough to act on, and the seat is Tier B/C,
the answer is either (a) upgrade the seat to Tier A for this question, or (b) a Tier-A pass
verifies the Tier-B output before it becomes action (this is exactly rules 30/55 — subagent
output is a hypothesis; diagnostic prescriptions need a probe).

## 2. The dispatch packet (what every Tier-A/B dispatch MUST contain)

1. **Remit with the verdict shape.** What is being asked, in what format, with what severity
   language. "Review this" is not a remit.
2. **Orientation map:** repo, branch, HEAD SHA, pushed/local state, stack, incident flags
   (START-HERE-INCIDENT-2026-09-22.md), what auto-deploys and what does not.
3. **Claims with pointers, not prose.** Every factual assertion carries `file:line`, a SHA, a
   command, or a test path. The answering model must be able to check each claim in one step.
4. **Re-derivation mandate (Tier A mandatory; Tier B best-effort on inline evidence):**
   *"Do not trust this packet's characterizations — open the code and verify. Cite file:line
   for every claim in your answer. 'Could not verify' is an acceptable answer."*
5. **Safety rails, spelled out:** read-only scope; no `git` write commands; never read
   `.env`/secrets (rule 59); never touch `DATABASE_URL` (it is PRODUCTION in this repo); spend
   gates (rule 16) for metered seats; lane discipline (rules 67/90) for anything that edits.
6. **What NOT to look at** (closed findings, already-owned areas) so the budget goes to gaps.
7. **Known-broken/known-green baselines** (e.g. the 14 pre-existing test failures) so the
   answerer can distinguish regression from baseline.
8. **Return contract:** severity vocabulary, evidence requirement per claim, explicit
   coverage statement ("what I did not get to"), and where to file the output.

## 3. The anti-bullshit bar for the REPLY

A reply is ACCEPTED only if:
- Every load-bearing claim carries `file:line`, a command+output, or an explicit confidence
  tag (`[VERIFIED]`/`[LIKELY]`/`[HYPOTHESIS]` — rule 51). Verdicts without evidence are
  INVALID and get one re-dispatch with the gap named.
- It states what it did NOT examine. An answer with no coverage statement is presumed blind.
- Speculative success language is absent (rule 19): no "should be fixed", no "looks good".
- For "X is broken" claims on recently-passed-gate areas: the reply carries a reproduction or
  is treated as [HYPOTHESIS] (rule 52).
- For "switch from X to Y" prescriptions: executed probe or explicit `[HYPOTHESIS]` + probe
  required before code lands (rule 55).

## 4. Harness mechanics matrix (who to route through, and their caps)

Canonical routing: `docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md`.
Astra operational detail: `docs/ai-workflow/references/ASTRA-REVIEW-ROUTING.md`.

| Harness | Transport | Tier | Notes / caps |
|---|---|---|---|
| **Astra** (`gpt-6-astra` @ xhigh) | `node scripts/consult-astra-subscription.mjs --document <packet> --remit "..." --out <reply>` | **A** (repo-rooted via Codex exec; `--bounded` downgrades to B) | FREE on ChatGPT subscription — never treat as gated. `gpt-6-astra-pro` is OpenRouter-only (refused here). Mega Blueprint arms on the keyword; `--dry-run` proves the mandate before spending. Exit codes: 0 ok · 2 blocked · 3 incomplete (retry meaningful) · 4/6 usage/input (do NOT retry) · 5 contract · 7 internal. Max `--timeout-ms` 1,800,000. |
| **Codex CLI** | `scripts/consult-codex.mjs`; also the AGENTS.md seat | A | The subscription-transport pattern originator. |
| **GLM 5.3 / 5.3-Flash** | `node scripts/consult-glm.mjs --document <path> --model glm-5.3 --max-tokens 8000` | B | DIRECT to Z.ai only (redact-egress refuses OpenRouter for `z-ai/*`). Single-call lock — retry when held, never seize (rule 67 R5). |
| **Gemini CTO** | `node scripts/consult-gemini.mjs --file <path> --review` | B | Output lands in `AI-Village-Documentation/gemini-consults/latest.md`. Review-chain seat (rule 46). |
| **OpenRouter seats** | episodic hostile-review escalation ONLY | B | Rule 16 `--confirm-spend` every run; worst-case disclosure first; never auto-retry. `consult-panel.mjs --seats` UNSUPPORTED. |
| **DeepSeek V4.1 Flash** | dev-preview harness (no in-repo script) | B | The ONLY metered seat ($5/mo hard cap). Advisory only, never authoritative, never in the rule-46 chain. Its harness mutates shared Codex config — do not route through the Codex seat. |
| **Hermes** (Pi+Telegram) | `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` | C | T0-T4 command tiers; T3/T4 = explicit approval + audit receipt. Dispatch = decision brief with pre-verified facts. |
| **WorkBuddy** | separate agent surface (reads `CODEBUDDY.md`) | A | Writes its own lane/archive; same packet bar applies when Sean dispatches it. |
| **CLINE / Cursor / Continue / Copilot(CodeBuddy)** | IDE seats (`.cursor/rules/`, `.continue/rules/`, `CODEBUDDY.md`, `.github/copilot-instructions.md`) | A | Repo-rooted by construction; the discipline is the dispatch prompt, not the packet. |
| **OpenCode** | `.opencode/SEAT.md` | A | Reads AGENTS.md. |
| **AI Village (15-brain)** | `scripts/validation-orchestrator.mjs` | B brains | Rule 16: Sean's explicit per-run permission, CRITICAL decisions only. Each brain gets an evidence-inline packet. |
| **Fable (Final Decider)** | fallback models per rule 46 | A/B | Arbitrates verdicts; receives the evidence, not just the verdicts. |
| **ZCode / Claude Code in-seat subagents** | Agent tool fan-out (rule 90) | A | Same bar: Explore agents get pointer-rich prompts + the safety rails; findings re-verified by the orchestrator before they become action. |

## 5. Worked reference instance (this protocol's first application)

`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-hostile-review-r2-upgrades-2026-09-26/` — the
2026-09-26 Astra dispatch: pointer-rich packet (campaign claims + backlog, all with
file:line), re-derivation mandate ("you are a Codex-exec agent rooted at the repo; do not
trust this packet"), safety rails inline, Mega Blueprint remit, return contract demanding
file:line per claim and a coverage statement. The wave-2 hostile review that proved this
protocol's worth (it broke a tested fix in minutes) was run the same way at subagent scale.

## 6. Filing

Consult outputs file where the seat's convention puts them (AI-HANDOFF/BLUEPRINT-* for Astra
packets per rule 86; gemini-consults for Gemini; continuity notes for operator work). The
packet AND the reply are both committed — the packet is the audit trail of what the model was
actually shown, which is half the evidence when a verdict later turns out wrong.
