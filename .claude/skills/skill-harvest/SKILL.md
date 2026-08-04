---
name: skill-harvest
description: Use when Sean asks to harvest, automate, or turn repeated work or an external transcript/repository into reusable skills. Gap-filters current workflows, pins source and license, audits side effects, ranks leverage, and proposes ADOPT/MERGE/DEFER/REJECT before building; never creates or removes a skill without Sean's authorization.
---

# Skill Harvest

**Role:** the loop that makes the operating system improve itself. The toughest part of a good AI operating system is getting what's in Sean's head into reusable form — and the second-toughest is *noticing* when a one-off has become a pattern worth institutionalizing. Skill-harvest is the periodic pass that catches repeated work and proposes folding it into a skill, a reference doc, or a rule.

> "Look back at everything I've asked you to do. Find the requests that repeat. Build yourself tools and reusable instructions for each one, so next time it's one sentence instead of ten. Then tell me — based on what I keep asking — what should I be delegating to you that I'm still doing by hand like an animal?"

This is literally the loop that created Chromie, attack-the-site, and copy-tournament from a video transcript. Skill-harvest makes that loop a standing capability instead of a one-time event.

## When to invoke

- Sean says **"what should I turn into a skill," "automate this," "build your own tools," "harvest," "what am I repeating,"** or `/skill-harvest`.
- Periodically at a natural boundary — end of a multi-day workstream, a phase close, or when Sean notices he's re-explaining the same thing.
- When Claude/Codex notices *itself* being given near-identical multi-step instructions across sessions (proactively offer a harvest).

## Method

1. **Gather the evidence (read-only first).** Look across:
   - The current session / recent transcript for repeated multi-step asks.
   - Recent commits (`git log`) for recurring task *shapes* (e.g. "every slice does: TDD → tsc → Fallow → rule-42 → commit" — already a rule, good; "every social fix needs a canonical receipt" — already a skill, good; find the ones that AREN'T captured yet).
   - `docs/ai-workflow/brainstorms/` + `AI-HANDOFF/` + the continuity log (`.ai-workflow/continuity/rolling-last-done.md`) for patterns Sean keeps returning to.
2. **Cluster into candidate skills.** Group repeated requests into distinct reusable capabilities. For each, draft: the trigger phrase, the one-line description, the method, and whether it's a *skill* (a repeatable procedure), a *reference doc* (knowledge to load on demand), or a *rule* (a always-on constraint for CLAUDE.md/AGENTS.md).
3. **Filter against what already exists (no duplication).** Cross-check `.claude/skills/`, the CLAUDE.md rules, and the reference-doc table. If a candidate is already covered, say so and drop it — the value is in the *gaps*, not re-creating what's there. This is the same gap-filter discipline used when mining transcripts.
4. **Name what Sean is still doing by hand.** Beyond skills, flag the manual work that should be delegated: "you keep pasting transcripts and asking for analysis — that's a skill"; "you keep checking the deploy manually — that's a `/loop` or a scheduled routine." Tie each to a concrete delegation.
5. **Rank by leverage.** Most-repeated × most-painful first. A 10-step thing Sean does weekly beats a 2-step thing he did once.

## External source intake

When a candidate comes from a transcript, repository, marketplace, or another agent's skill pack, add an intake record before recommending installation:

1. Pin the source URL and commit or immutable version.
2. Record the license; preserve its notice if substantial text will be copied.
3. Inventory network calls, paid services, self-update behavior, external writes, credentials, destructive actions, and platform assumptions.
4. Classify every capability `ADOPT`, `MERGE`, `DEFER`, or `REJECT` against current rules, skills, hooks, tools, and operator tiers.
5. Prefer a small adapter that uses current native tools over copied vendor assumptions.
6. If approved for both runtimes, create validated `.agents` and `.claude` entrypoints and run `node scripts/ai-workflow/validate-skill-registry.mjs` plus the relevant contract tests.
7. Regenerate `AGENTS.md` mechanically; never hand-edit its mirrored body.

Reject safety-evasion prompts, blind secret copying, self-modifying instructions, root-by-default remote execution, and default paid/external side effects.

## Output — the harvest proposal (propose, never auto-build)

Summarize in chat (and write to `docs/ai-workflow/brainstorms/skill-harvest-<YYYY-MM-DD>.md` if the list is long; session date, never a date function):

```
## Repeated patterns found (with evidence: where it recurred)
## Candidate skills — ranked by leverage
| # | Candidate | Trigger | skill / ref-doc / rule | Already covered? | Leverage |
## Still doing by hand → should delegate
## Recommended build set (the gaps worth filling)
```

Then **ask Sean which to build.** Skill-harvest does NOT write skill files on its own — it proposes; Sean picks; only then do the chosen skills get authored (each as a real `.claude/skill`, wired into CLAUDE.md/AGENTS.md), following the same flow used to build Chromie/attack-the-site/copy-tournament.

## The iteration principle (bake into every harvested skill)

A skill is **never finished on the first try.** Every use is data. When Sean uses a skill and says "I liked X, not Y," that's the signal to update the skill. Harvested skills should carry a note that they're expected to be refined in place over time — the same way `auto-research` optimizes existing skills. Skill-harvest *creates*; `auto-research` *tunes*; together they keep the skill library alive.

## Integration
- Complements **`auto-research`** (which optimizes existing skills) — skill-harvest finds *new* ones to create.
- Feeds the **CLAUDE.md / AGENTS.md** skills table, operator registry, and rule set. A dual-runtime skill is not done until both entrypoints validate and the mirror check passes.
- Honors rule 8 (no PII in committed proposal docs), rule 35 (proposals live in `brainstorms/`, not root), and rule 34/closeout (no auto-deletion or auto-creation without Sean's yes).

## Non-goals
- Does not write skills autonomously — it proposes; Sean approves; then they're built.
- Does not duplicate existing skills/rules — the gap-filter is mandatory.
- Does not tune existing skills — that's `auto-research`.
- Does not delete or deprecate skills without Sean's explicit approval (rule 34).
