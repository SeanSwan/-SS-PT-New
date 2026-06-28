# Continuity — Curated Good Ideas

> **Purpose:** Human-curated distillation of insights, patterns, and lessons promoted from the rolling continuity log.
> **Source:** `<!-- PROMOTE: ... -->` markers in `.ai-workflow/continuity/rolling-last-done.md`, reviewed and edited by Sean.
> **Created:** 2026-04-22 by Phase B (`CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md`).

## Format

Each entry is a short, durable insight. Not a session log — sessions live in the rolling file. Promote when an idea has proven valuable across multiple surfaces or sessions.

```markdown
## <Short title>

> **Promoted:** YYYY-MM-DD from session <timestamp> on <surface>
> **Tags:** <topic, topic, topic>

<1-3 paragraphs of distilled insight, stripped of session-specific noise.>
```

## Curation rules

- One entry = one durable idea. Don't dump session transcripts.
- Distill — rephrase if needed for clarity.
- Tag for discoverability (e.g. `lock-correctness`, `sanitizer`, `hermes`, `permissions`, `protocol`).
- If an idea ages out (e.g. references retired tooling), remove the entry entirely. This file is mutable.
- Review backlog periodically: `scripts/continuity-promotions.sh` to see pending PROMOTE markers.

---

## Validate startup hooks with sentinel smokes

> **Promoted:** 2026-06-28 from session 2026-04-22T20:35:29.121Z on vs-codex
> **Tags:** startup, codex, continuity, smoke-test

Codex AGENTS.md startup reads are valid for the current Codex surface, but treat startup-hook changes as behavior that needs a sentinel smoke. Add a unique marker or observable proof before relying on the hook in future handoffs.

## Release locks before hard exits

> **Promoted:** 2026-06-28 from session 2026-04-22T20:36:28.585Z on vs-claude
> **Tags:** lock-correctness, node, cleanup

In Node scripts, process.exit() and hard-fail helpers can bypass finally cleanup. Lock-owning scripts should track whether the current process holds the lock, release it explicitly before fatal exits, and keep a process exit backstop for last-resort cleanup.

## Probe stale locks, do not age-expire them

> **Promoted:** 2026-06-28 from session 2026-04-22T20:36:28.585Z on vs-claude
> **Tags:** lock-correctness, concurrency, operator-safety

Do not release stale locks by age alone. A hung but still-alive holder can resume and create concurrent writers. Release only when a same-runtime PID probe proves the holder is dead; cross-namespace cases should fail loud and require an explicit operator override.

## Keep private config in local overrides

> **Promoted:** 2026-06-28 from session 2026-04-22T20:36:28.585Z on vs-claude
> **Tags:** config, secrets, continuity, privacy

Tracked config files should keep placeholders for private infrastructure values and fail closed if placeholders are still present. Real local identifiers belong in gitignored .local override files that the script reads first, then falls back to the tracked template.

## Use the live coordination ledger during parallel work

> **Promoted:** 2026-06-28 from session 2026-06-14T01:22:21.286Z on vs-claude
> **Tags:** coordination, parallel-agents, rule-67, release-safety

Rule 67 remains the active two-agent coding process while Claude and Codex share the SwanStudios tree. Read the lane files at startup, claim exact files before editing, avoid broad staging, and use the review queue for hostile-review handoffs instead of relying on chat memory.
