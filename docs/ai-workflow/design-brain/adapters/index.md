# Design Brain — Adapters Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (map only — each adapter is canonical for its consumer)

---

## 1. What an adapter is

An adapter answers one question for one consumer: **"I am agent X about to do design-adjacent work — what exactly do I load, what do I produce, and how do I verify it?"** Adapters TRANSLATE the canonical docs (`../design.md` and `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`) for their consumer. They never introduce new visual rules — a rule that appears only in an adapter is a bug; file it against `../design.md` or the design system, then re-derive the adapter.

## 2. The map

| File | Consumer(s) | One-line contract |
|---|---|---|
| `builders.md` | Claude Code, Codex | Pre-build load order, the build contract, pre-commit self-check, builder receipt |
| `claude-code.md` | Whoever drives the design-canvas toolchain (today: Claude Code) | Thin **toolchain appendix**: base64 image keying, size caps, `{{token}}`-is-a-prop, republish-to-keep-URL. Loads on top of `builders.md`, never instead of it. **Not** a capability claim about any other agent |
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

### 3.1 Split executed 2026-08-19 — `claude-code.md` restored as a toolchain appendix

**The first version of this record justified the split with a false claim and is corrected here rather than deleted.**

It read: *"Claude Code's `Read` tool renders images into context… Codex has neither and consumes design work as text."* **Codex reads images too.** The claim was never checked against anything — not `AGENTS.md`, not `builders.md`, neither of which documents any such limit — and Sean rejected it on sight. It was written into doctrine in the same pass that created `../asset-harvest.md`, a gate built specifically to stop unverified assertions, which makes it the sharper version of the error the gate exists to catch.

**What the triggering incident actually proves.** The 2026-08-19 front-page run built eight directions around a generic `<div>S</div>` monogram because the brief said "the swan logo" and nobody opened the file; one look at `Logo.png` yielded "low-poly crystalline, faceted, ice-white → Ice Wing → Wing Purple." That is a real and expensive failure — but it is an argument for a **universal** harvest gate, not for a per-agent split. *Look at the asset before designing with it* binds every agent. It lives in `../asset-harvest.md`, which both builders load.

**What genuinely justifies the file — and it is narrow.** Claude Code drives the design-canvas toolchain (bundled `design` skill → `.dc.html` artboards → seeder → `Artifact` publish). That toolchain has mechanical rules whose failures are all silent — base64 keyed by exact bare filename, ~70 KB/image and 16 MB/page caps, `{{token}}` being a declared prop rather than a bug, republishing the same path to keep the URL. Those would be noise in a shared builder contract. **That is the entire justification: a toolchain appendix.**

**So the split is thinner than first recorded.** `builders.md` remains the shared contract both builders load, unchanged. `claude-code.md` is keyed to the **toolchain, not the agent** — anything driving the canvas loads it, Claude Code or otherwise. No `codex.md` was created, and the reason is *not* that Codex is less capable: it is that Codex's contract is `builders.md`, complete on its own. Test for anything proposed for the appendix: **if the rule would still be correct with the word "Claude" deleted, it belongs upstream.**

## 4. What belongs here / what does not

- **Belongs:** per-consumer load orders, output contracts (receipts, briefs, verdicts), verification checklists, translation notes ("for THIS consumer, rule X means Y").
- **Does not belong:** new tokens, new patterns, new bans (→ `../design.md` / design system §G), security or tier policy (→ `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`), actual vault content (→ `../obsidian/`), code.

## 5. Canonical status & where next

- Every adapter here is **canonical for its consumer** and **subordinate** to `../design.md`, the cinematic design system, and the operator bridge. Conflict resolution: design system > `../design.md` > adapter. An adapter that contradicts upstream must be rewritten, not obeyed.
- New consumer with design-adjacent work → check this table first; extend an existing adapter before creating a new file; record any new file or merge in §3.
- Folder-level map: `../index.md`. Knowledge flow: `knowledge.md` → `../obsidian/index.md` → `../graphify/index.md`.
