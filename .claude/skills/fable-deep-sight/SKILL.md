---
name: fable-deep-sight
description: Use when Sean wants Fable to look at something and tell him the whole truth of what it sees — real completion state, what actually works vs what is scaffolding, test truth, ranked risk/gap map, and the things it noticed that nobody asked about. Turns every expensive Fable call into a maximum-observation call. Wraps the existing consult-fable transport with a Deep-Sight remit; PAID, so it always asks Sean before firing. Distinct from swan-oracle (GPT-Pro strategy) and ai-village-fusion (multi-brain panel) — this is the single most-capable brain giving its fullest read of one target.
---

# Fable Deep-Sight

## Role

Fable 5 is the strongest and scarcest brain in the stack. When we spend it, we should get its
**fullest possible read of what it sees** — not a yes/no, not an optimistic summary, but the honest
ground truth of a codebase area, plan, design, or decision. Deep-Sight is the standing mode that
forces that: maximum structured observation in, maximum structured observation out.

This skill is advisory. It does not replace `CLAUDE.md`, `AGENTS.md`, tests, browser QA, the
required receipts, or Sean's approval. Fable's read is a high-quality hypothesis until checked
against repo evidence (rule 30/52).

## Load First

- `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` — §4 spend test, §7 Fable-safe
  wording, §8 output formats (this skill produces the **Audit** shape), §11 cost discipline.
- `docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` — before assembling a large
  packet, compact tool noise, query large logs instead of bulk-reading, and run the estimator.

## When To Use

- Sean says "have Fable look at this and tell me everything," "deep sight," "what does Fable really
  see," "how done is this actually," "Fable read of X," or `/fable-deep-sight`.
- Before trusting a "looks done" claim on a complex slice/phase — get Fable's real completion read.
- Phase-close audit (rule 48 moment) where the honest ground-truth state must be recorded.
- After a big autonomous run or rewrite, to learn what actually got built vs what got claimed.
- Arbitrating "is this real" on contradictory reviews, where the tie-breaker is a maximal read.

## When NOT to use

- Trivial fixes, single-file edits, shallow UI tweaks — that fails the §4 spend test; use Codex/Claude.
- A yes/no you can answer deterministically (a test, a grep, a route walk) — run the check, don't
  spend Fable.
- Anything already fully specified by an existing Fable/registry artifact — hand it to a cheaper brain.
- When the free triangle (`ai-village-fusion` Tier 2) would answer it — prefer free cross-review first,
  escalate to Fable only for the maximal single-brain read.

## Spend gate (MANDATORY — this is PAID)

Deep-Sight runs Fable via the OpenRouter wallet (`anthropic/claude-fable-5`, ~$10/M in · $50/M out).
Per Rule 16 and the free-first / ask-before-paid rule, **never fire without Sean's explicit OK.**
Build the packet, show the estimated size/cost, get the yes, then run. If the free triangle can do
it, offer that first.

## Workflow

1. **Name the target in one sentence.** "Fable's honest read of <surface / plan / codebase area>."
   Pick the mode: **completion-truth** (how done is this, really) or **general deep-sight** (fullest
   read of a plan/design/decision).
2. **Assemble a narrow, high-signal packet.** Only what Fable needs to see the truth: the relevant
   file paths (with the code inline or as tight excerpts + file:line), route/receipt evidence, test
   files and their last run output, the claim being tested ("this is done / this works"), and known
   constraints. Redact aggressively — IDs/roles only, no PII, no secrets, no env values (rules 8/44/59).
3. **Write the packet doc** to `docs/ai-workflow/AI-HANDOFF/FABLE-DEEP-SIGHT-PACKET-<slug>-<UTC>.md`
   with the **Deep-Sight Remit block below as its first section**, then the evidence.
4. **Secret-scan:** `bash scripts/scan-secrets.sh <packet>` — hard-fail on any hit.
5. **Show Sean the cost estimate and get the OK** (spend gate above).
6. **Fire** the existing transport with a compact remit that points at the block:
   ```bash
   node scripts/consult-fable.mjs \
     --document docs/ai-workflow/AI-HANDOFF/FABLE-DEEP-SIGHT-PACKET-<slug>-<UTC>.md \
     --out docs/ai-workflow/AI-HANDOFF/FABLE-DEEP-SIGHT-REPORT-<slug>-<UTC>.md \
     --remit "You are Fable 5 performing a DEEP-SIGHT AUDIT. Execute the DEEP-SIGHT REMIT block at the top of the document to the letter and return the full Deep-Sight Report. Do NOT hedge to consensus, do NOT summarize optimistically — report what is actually there, with file:line evidence, and say plainly what you cannot verify from the packet."
   ```
7. **Classify the return.** Fable's read is a hypothesis (rule 30/52). Produce an
   `ADOPT / VERIFY / DEFER / REJECT` table with repo evidence before any code moves on it. Surface the
   real completion % and the single highest risk in the chat summary.

## The Deep-Sight Remit (paste as the packet's first section)

> **DEEP-SIGHT REMIT — Fable 5.** You are giving your fullest, most honest read of the target below.
> Do not flatter it, do not assume the claim is true, do not hedge to consensus. Report what is
> actually there. Use construction-domain framing: read-only local inspection, verify mounted routes
> with file:line, name what is scaffolding vs load-bearing. Structure your Deep-Sight Report exactly:
>
> 1. **Executive read (one paragraph).** What this actually is, in plain terms.
> 2. **Real completion %** — for completion-truth mode: honest % toward *usable* AND % toward *fully
>    done/shippable*, stated separately (they differ). Justify each number.
> 3. **Load-bearing vs scaffolding** — a table: component/slice → works & proven | works-unproven |
>    stub/placeholder | broken — each with file:line evidence from the packet.
> 4. **Test truth** — what the tests actually prove vs what they appear to prove; any test that is
>    green but tests the wrong thing, is skipped, or has no real assertion.
> 5. **Risk & gap map** — ranked by value/money left on the table (absence-first: what SHOULD exist
>    and doesn't). Each: severity, why it matters, cheapest way to close it.
> 6. **Peripheral vision** — the things you noticed that nobody asked about: adjacent bugs, drift,
>    security/PII exposure, dead code, a better shape. This section is required and must be non-empty.
> 7. **Hostile self-review** — argue against your own read above; where might YOU be wrong given only
>    the packet, and what evidence would change your numbers.
> 8. **Buildable next slices** — 1–3 narrow, binary-checkable slices, ordered, each with a one-line
>    acceptance criterion. Name the SINGLE highest-priority one.
>
> Binding house rules (non-negotiable, reject any suggestion that violates them): styled-components
> only (no MUI); Victory charts only; Crystalline Swan palette via `var(--token,#fallback)`;
> Dual-Button Glow; 44px targets; dark-first; WCAG 4.5:1; ≤300 lines/file; zero PII to LLMs (IDs
> only); "stretching"/"flexibility" not "yoga/meditation"; credentials = "26+ years / NASM-protocol",
> never "NASM-certified". If the packet lacks evidence for a claim, say "cannot verify from packet" —
> never invent it.

## Output Contract

When creating a packet:
```text
DEEP-SIGHT PACKET STATUS: READY / BLOCKED
TARGET:
MODE: completion-truth | general
CONTEXT INCLUDED:
CONTEXT EXCLUDED FOR PRIVACY:
EST. SIZE / COST: ~N tokens · ~$X   (awaiting Sean's OK to fire — PAID)
```

When classifying Fable's returned report:
```text
DEEP-SIGHT CLASSIFICATION

REAL COMPLETION: usable ~N% · shippable ~N%
SINGLE HIGHEST RISK:

| Finding | ADOPT / VERIFY / DEFER / REJECT | Evidence | Action |
|---|---|---|---|

NEXT SLICE (rule 60):
```

## Hard Rules

- **Never fire without Sean's OK** — it is paid Fable (spend gate). Offer the free triangle first when
  it would do.
- **No PII / secrets in the packet** (rules 8/44/59); scan before firing.
- Fable's read is a **hypothesis until checked** against repo evidence (rules 30/52) — classify, don't
  auto-implement.
- **Construction-domain wording only** in the remit and packet (spec §7) — inspection/verification,
  never intrusion framing.
- Do not let Fable's peripheral findings silently expand the task — classify out-of-scope ideas as
  `DEFER` (rule 3 surgical scope).
- Verify the model slug against `config/MODEL_VERSIONS.md`; never invent a model string.
