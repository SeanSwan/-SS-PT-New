# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Seed:** (none)
**Tokens:** 5276 in / 5103 out · **Cost:** ~$0.0063 · **Wall:** 106.4s · **finish:** stop

---

## VERDICT
REVISE. The document correctly audits many of its own premises but still builds its core engineering ask on a measurement surface that omits at least one known boot‑file (the Hermes workflow) and excludes the highest‑quality half of the error corpus, making the target blueprint ungrounded.

## BLOCKERS
1. **P1 – Boot‑context measurement is incomplete; blueprint will miss hidden load.**
   The brief measures only `CLAUDE.md` and `AGENTS.md`, arriving at ~164 KB / ~49k tokens per agent.  Section 1 lists “the Hermes workflow” as one of the four operating files to rewrite.  The Hermes workflow file is neither sized nor tested for auto‑discovery; if it is loaded at conversation start its cost is unaccounted, and any budget derived from the current numbers will be violated before a single line is cut.  *Evidence:* §1 vs §2 (Hermes absent from §2 fact table).

2. **P2 – Review‑debt authorization flaw remains unfixed and is a known bypass.**
   The ledger closes any debt if *any* artifact that EXISTS is named; `README.md` would close a substantive review.  The document acknowledges this (§7.2) but leaves it as an open item with no mitigation plan.  A mechanism that is already defeated by a trivial, documented bypass cannot be counted as a guard.  *Evidence:* §6 “Review‑debt ledger” description, §7.2.

## ATTACKS
- **Correctness:**
  - The 49k‑token figure uses 3.36 chars/token (derived from “this panel’s own harness”) but the brief later requires the panel to name the tokenizer because counts vary ±30%.  The harness‑derived ratio is likely specific to one model; a budget built on it may already be wrong for the actual runtime tokenizer.
  - Hermes workflow load path is unspecified.  If it is injected via a hook or auto‑included, it may add tens of KB with zero trace in the §2 table, making the entire “small boot context” performance claim unverifiable.
  - The classification ranking (D_number_drift #1, C_green_not_correct #2) is drawn from the 2,096 memo bullets only.  The 84 Fable‑tier learning packets (450 issues)—explicitly written for durable lessons—are missing from §4 entirely.  The true class distribution across the full 2,546‑issue corpus is unknown; building the guard set from the visible half risks missing the most important recurring class.
  - The lane‑staged guard is opt‑in; an agent that never claims a file can commit anything, making the guard useless for detecting unreported changes.

- **Security:**
  - No secrets‑handling model is described for the spend‑guard or PII‑gate hooks.  If they call external APIs they need credentials; the brief does not state how those are provisioned, stored, or rotated.
  - The “exit‑status‑gate” blocks `pipeline + bare $?`.  Without an audit of what 44 corpus hits actually caught, it is plausible that this gate is trivial to evade by using `$?` inside an `if` block or assigning to a variable—semantic bypass that the regex will miss.
  - The PII gate is now required to fail closed and loud, which is correct, but there is no description of how an approved override leaves an audit record (the brief says “owner approval and leaves an audit record” without mechanism).  If the audit record is just another file, it can be forged or omitted.

- **Data‑truth / schema drift:**
  - `AGENTS.md` is a byte‑for‑byte duplicate of `CLAUDE.md` that has already diverged on this branch.  The brief correctly identifies the maintenance cost but does not prescribe how the new architecture prevents re‑divergence.  Any blueprint that keeps both files must solve this, or the drift will repeat.
  - `mistake_terminal_state` accepts `MECHANISM: I will try harder` as valid.  This is a documented hole that means the 904 classified bullets may include junk under the `MECHANISM` label, inflating the apparent catch rate.
  - Rule counts (66 / 73 / 83) disagree, and the measurement script is bounded to column zero—so rules inside lists, tables, or code fences are invisible.  The “73” figure used to plan rule reduction may undercount real rules, leading to a blueprint that cuts fewer rules than expected and leaves boot context larger.

## HIGHEST RISK
**The evidence base (2,096 memo‑only issues, 35.5 % classified) is too incomplete to design the guard set.**  The 84 learning packets are the corpus *deliberately written* to hold durable, high‑quality mistakes, and they are absent.  If the #1 error class in the packets is absent from the memo distribution—or if the packets show that semantic errors dominate—the entire “mechanisms beat rules” thesis and the six deliverables will be mis‑aimed.  **Cheapest de‑risk:** run extraction and classification on the 84 packet files immediately (before any blueprint outline) and produce a side‑by‑side class distribution of memos vs. packets to see if the rankings hold or invert.

## CONFIDENCE
- **Not verifiable from the document alone:** the actual size and loading behaviour of the Hermes workflow file; the content and class distribution of the 450 packet issues; which tokenizer the deployed Claude/Codex runtimes use (and therefore what 49k tokens means in practice); whether any of the 14 registered hooks produce false‑positive blocks in production; and whether the 73‑rule count accurately reflects the full set of mandatory rules on `main` (2,209 commits ahead).
- **Settling evidence:** (1) `wc -c` and token‑count the Hermes workflow file on `main` using both the Anthropic and OpenAI tokenizers; (2) produce `packet-mistakes.json` and run the same phrase‑match classifier to get a full‑corpus class distribution; (3) instrument one agent cycle to log system‑prompt bytes actually sent to the model (capture real boot context); (4) diff the rule sections between the stale branch and `main` to confirm rule count and content stability.
