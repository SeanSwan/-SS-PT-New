# Design Brain — Adapters Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (map only — each adapter is canonical for its consumer)

---

## 1. What an adapter is

An adapter answers one question for one consumer: **"I am agent X about to do design-adjacent work — what exactly do I load, what do I produce, and how do I verify it?"** Adapters TRANSLATE the canonical docs (`../design.md` and `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`) for their consumer. They never introduce new visual rules — a rule that appears only in an adapter is a bug; file it against `../design.md` or the design system, then re-derive the adapter.

## 2. The map

| File | Consumer(s) | One-line contract |
|---|---|---|
| `builders.md` | Claude Code, Codex | Pre-build load order, the build contract, pre-commit self-check, builder receipt |
| `claude-code.md` | Claude Code only | What Claude Code can do that Codex cannot: view brand assets and surfaces directly, own the design canvas end-to-end, verify against the generator. Loads on top of `builders.md`, never instead of it |
| `fable.md` | Fable | Concept-direction ideation gate, direction format, doctrine arbitration, spec-only vs hand-to-builder |
| `hermes.md` | Hermes + Agentic OS surfaces | Crystalline Cyberforest scope, tier-badge colors, operational calm, how Hermes requests design work |
| `reviewers.md` | AI Village design review; Browser Harness visual QA | Review packet + verdict format; supervised read-only QA sessions + QA receipt |
| `product-surfaces.md` | Coach Command Center; Swan Coach | Trainer/operator density rules; client-facing warmth + proposal-card rules |
| `cinematic-site-generator.md` | Fable (concept) → Codex/Claude (build) | The factory: brief → worldbuilding → arc → assets → build → QA → gated deploy |
| `knowledge.md` | Any agent writing design knowledge down | Thin pointer to `../obsidian/` + `../graphify/` policies |

## 3. Consolidation record (deliberate — 12 planned files → 7 + this index)

The original registry plan (`docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §8) and spec (`docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/030-design-brain-spec.md`) implied 12 adapter files. They were merged where the consumers share ≥60% of their contract (the registry §13 merge threshold, applied to docs):

| Originally planned | Merged into | Why |
|---|---|---|
| `claude-code.md` + `codex.md` | `builders.md` | Identical build contract; only lane ownership (rule 67) differs, and that lives in the pair-coding protocol, not here. **PARTIALLY REVERSED 2026-08-19 — see §3.1** |
| `hermes.md` + `hermes-agentic-os.md` | `hermes.md` | One design mode (Crystalline Cyberforest), one requester pattern; splitting duplicated the tier-badge table |
| `ai-village-design-review.md` + `browser-harness-visual-qa.md` | `reviewers.md` | Both are verdict-producing reviewers consuming the same qa-gates matrix; packet in, receipt out |
| `coach-command-center.md` + `swan-coach.md` | `product-surfaces.md` | Two faces of the same coaching loop; keeping them side-by-side makes the operator/client boundary impossible to miss |
| `obsidian.md` + `graphify.md` | `knowledge.md` | Both are thin pointers; real policy lives in `../obsidian/` and `../graphify/` |

If a merged adapter grows past ~150 lines or its consumers' contracts diverge, split it back out and update this record in the same pass.

### 3.1 Split executed 2026-08-19 — `claude-code.md` restored

The merge held for **building** and fails for **designing**. It was justified on "identical build contract," which remains true; the divergence is upstream of building, in how each agent acquires the design context:

> Claude Code's `Read` tool renders images into context, and it owns the `design` canvas + `Artifact` publish path. Codex has neither and consumes design work as text.

Triggering incident: the 2026-08-19 front-page run built eight directions around a generic `<div>S</div>` monogram because the brief said "the swan logo" and nobody opened the file. Viewing `Logo.png` once yielded "low-poly crystalline, faceted, ice-white → Ice Wing → Wing Purple" — the actual design language, unavailable from the filename. An agent that can look and doesn't is making an unforced error; an agent that cannot look needs a different procedure.

**The split is deliberately partial.** `builders.md` remains the shared contract and both agents load it. `claude-code.md` is additive and carries **only** what Codex genuinely cannot execute. A rule that applies to both belongs in `builders.md` — a rule appearing only in `claude-code.md` that Codex *could* follow is a bug in the split. No `codex.md` was created: Codex's contract is `builders.md` unmodified, so a Codex session is the design brain *without* the Claude-Code layer, which is the intended shape.

## 4. What belongs here / what does not

- **Belongs:** per-consumer load orders, output contracts (receipts, briefs, verdicts), verification checklists, translation notes ("for THIS consumer, rule X means Y").
- **Does not belong:** new tokens, new patterns, new bans (→ `../design.md` / design system §G), security or tier policy (→ `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`), actual vault content (→ `../obsidian/`), code.

## 5. Canonical status & where next

- Every adapter here is **canonical for its consumer** and **subordinate** to `../design.md`, the cinematic design system, and the operator bridge. Conflict resolution: design system > `../design.md` > adapter. An adapter that contradicts upstream must be rewritten, not obeyed.
- New consumer with design-adjacent work → check this table first; extend an existing adapter before creating a new file; record any new file or merge in §3.
- Folder-level map: `../index.md`. Knowledge flow: `knowledge.md` → `../obsidian/index.md` → `../graphify/index.md`.
