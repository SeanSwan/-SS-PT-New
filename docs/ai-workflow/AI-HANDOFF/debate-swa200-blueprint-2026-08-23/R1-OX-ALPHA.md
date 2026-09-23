# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWA200-CONTINUATION-BLUEPRINT-2026-08-23.md
**Seed:** (none)
**Tokens:** 3505 in / 1799 out · **Cost:** ~$0.0000 · **Wall:** 68.7s · **finish:** stop

---

**(a) Most important MISSING thing**

An **incident runbook**. The blueprint is entirely preventive: backup exists, guard exists, CI exists. Nowhere does it tell the next agent what to do *when prevention fails* — e.g., a migration corrupts prod mid-handoff. Who runs `backup-db.mjs`'s restore? Into what target? What's the RTO (the doc admits restore time is unmeasured)? What gets frozen first (deploys? cron?)? A fresh agent inheriting a live incident with zero context is the worst-case this handoff must survive, and §6 lists gaps but not responses. Secondary omission: no "verify current state first" step — SHAs (`16ca1ba56`, `74ff1099a`), PR #68 open/closed, and Sean's three decisions may all have drifted by handoff time, and the doc presents them as live facts.

**(b) WRONG or misleading**

1. **Wireframe 7.1 wraps the ATTESTATION JSON across three lines.** §4 instructs the agent to "read that line," but any scripted check (`grep PRE-MIGRATE-ATTESTATION | jq`) fails against the depicted output. Either show it on one physical line or annotate "wrapped here for display only."
2. **Unverified test counts stated as fact.** "25/25", "19/19", "25 files" are session snapshots, not durable truth. A fresh agent treating a count mismatch as "something broke" vs. "tests were added" needs a caveat.
3. **Inconsistent paths invite wrong-cwd failures.** §8 mixes `backend/scripts/pre-migrate-guard.test.mjs` with root-relative `scripts/hooks/lib/...` without stating where each must be run from.
4. **§3.1's diff omits the guard's failure semantics.** Warn-only means exit 0 even on backup failure — pasting the one-liner without restating "this protects nothing until §3.2 flips" risks an agent believing the rail is live post-merge.

**(c) Phase order**

Mostly right, two problems:

- **Phase 4 (post-apply verify) is sequenced last but is cheap and independent.** It should ship alongside the guard (before Phase 1), because every intermediate phase silently trusts that migrations did what they claimed. Sequencing it after enforcement means you enforce on an unverified pipeline.
- **Phase 1 (restore drill) gates more than the doc admits.** The guard takes a backup before every migration from day one; if that backup has never been proven restorable, the guard manufactures false confidence immediately upon merge — not at Phase 1. The drill should be flagged as blocking *meaningful* protection, not just blocking Phase 2.

Phase 0's conditionality and Phase 3's placement are correct.

**(d) One concrete mermaid fix**

Node **D1 ("guard never ran") is a dead end** — no outgoing edge. A fresh agent following the chart literally stops there. Add `D1 --> B1` (or a new node "fix render.yaml routing → redeploy → return to C"), mirroring the text in §4 which correctly says "check the routing landed." Relatedly, wireframe 7.2's verdict row should name the *next action* (e.g., "BLOCK → rewrite migration with backfill"), since a report that blocks without prescribing remediation just relocates the ambiguity.
