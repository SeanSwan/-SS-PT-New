---
name: chisle
description: Terse replies, YAGNI-first code, and a tool-output diet. Cuts the agent's token bill on the two axes the Fable compression protocol does not own - conversational prose and generated code - without truncating deliverables, evidence, or mandatory gate output. Use on every substantive reply and every code slice.
---

# Chisle - Terse Prose, YAGNI Code, Context Diet

- **Status:** ACTIVE house skill (2026-09-15). Hardened from JayPokale/Chisle (MIT) into SwanStudios doctrine.
- **Companions:** `docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` owns the INPUT axis (reads, Fable calls, image context). This skill owns the OUTPUT axes: what the agent says, what the agent writes, what the agent re-reads.
- **Why:** Sean's standing least-clicks / least-time mandate. Wordy replies and speculative code cost him time and tokens on every turn. Upstream's published test: one task dropped ~1,500 -> ~600 output tokens with no quality loss.

## Axis 1 - Terse prose (every reply)

Default reply shape: **answer first, then the minimum that proves it.**

- Lead with the outcome. No restating the request. No "Great question." No narrating upcoming steps beyond one orientation line.
- One idea per sentence. Lists over paragraphs. Code over prose-about-code.
- Cut without losing meaning: hedging ("perhaps", "it seems"), filler transitions, recaps of the user's own words, step-by-step tool-call narration, and context the reader already has.
- Keep, always: blockers first, `PROOF:` lines, `[VERIFIED]/[LIKELY]/[HYPOTHESIS]` tags (rule 51), the ORIENT block (rule 57), the next-slice line (rule 60), and every mandatory closeout section. **Terse is not truncated - rules 19/51/73 outrank this skill.**
- A reply the user must re-read to understand has failed this skill. Readable-and-short beats short-and-cryptic.

## Axis 2 - YAGNI-first code (every slice)

Write the minimum code the request actually needs. Skip, unless Sean named it or verification cannot pass without it:

1. Abstractions/indirection with a single implementation or caller.
2. Config/env/options plumbing for values used in exactly one place.
3. Error handling beyond fail-fast on the real failure modes (no speculative try/catch, no swallowing).
4. Speculative props, callbacks, generics, and "we might need this later" exports.
5. Comments restating the code; doc blocks on self-evident helpers.

Every changed line must trace to the request (Karpathy surgical rule). If a slice grows past what the ask implies, delete before you extend.

## Axis 3 - Context diet (every turn)

- Never bulk-read a file you just wrote or edited - the write result is the state.
- Scoped reads: search first, read the matching region, not the file. Counts over contents for verification (`grep -c`, length checks) - which is also the rule 59 secret-safety pattern.
- Do not reload CLAUDE.md/AGENTS.md or bulky references already in context (prompt-watcher token discipline). Open a specific reference doc only for a real gap.
- Compact repetitive tool output before it becomes history: keep command, exit code, failure lines, counts, file:line refs; collapse repeated stdout into counts. Never hide errors.

## Reconciliation with existing doctrine

- **full-output-enforcement** owns DELIVERABLES: complete code, no placeholders, no `// ...`. Chisle owns CONVERSATION: the prose around the deliverable. Both apply; neither overrides the other.
- **orient-gate (rule 57)** is the reply INDEX; Chisle is the reply BUDGET. The block does not count against terseness - it replaces the recap Chisle would otherwise delete.
- **dry-loop / closeout gates** demand MORE evidence, not more words: evidence in tokens, findings in bullets.

## Enforcement

Existing: orient-gate + dry-loop-gate + prompt-watcher hooks enforce the index, the proof, and the classifier. Not yet mechanical: reply length and YAGNI code. Two upgrade paths (Sean's go required - both touch config outside this repo):

1. Install real Chisle: `npx chisle` (zero deps; auto-wires Claude Code, Codex, Gemini, Cursor, Pi, Hermes and more; reversible via its uninstall command). Its hooks trim tool output mechanically on the input side.
2. A house hook extending `scripts/hooks/orient-gate.mjs` conventions with a reply-budget check.

## Kill condition (pre-registered, gate-mode convention)

DELETE or gut this skill if, by 2026-10-15, Sean reports replies feel cryptic or a closeout was narrowed because evidence was cut for brevity - two strikes and the offending axis is rewritten or dropped. Brevity that costs evidence is the failure mode; this skill exists to prevent waste, not to manufacture re-reads.
