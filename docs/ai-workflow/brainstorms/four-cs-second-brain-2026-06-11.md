# Brainstorm: Four-C's Second Brain — CLAUDE.md + AGENTS.md restructure

**Date:** 2026-06-11  ·  **Status:** in-progress  ·  **For:** reshaping the operating files (CLAUDE.md, AGENTS.md) into a Context · Connections · Capabilities · Cadence second-brain / router for both Claude and Codex

## Summary
From the Nate Herk "AI operating system" transcript. The model: CLAUDE.md is a **router** (points to where rules/references/skills/projects/wikis live), and the system is built in two layers — the **second brain** (Context = who you/the business are; Connections = live data) and the **AIOS** (Capabilities = skills/agents/automations; Cadence = those running on a schedule/trigger, not just manually). Goal: make the operating files tighter, faster to navigate, tool-agnostic (Claude + Codex), and a true second brain rather than a long flat rulebook — without breaking the 66 rules already in place.

## Context going in
- CLAUDE.md is already ~825 lines and self-describes as "an INDEX" with a token-optimization section + a reference-doc table — so router DNA already exists, just not organized under the Four C's.
- 66 numbered MANDATORY rules + dual-pass disciplines + skills tables already live in both files; AGENTS.md mirrors CLAUDE.md for Codex.
- SwanStudios already has some "Connections/Cadence" pieces via Hermes (Pi+Telegram), the continuity bridge, consult-gemini/codex scripts, and the AI Village — so this isn't greenfield.
- Sean is token-conscious — a restructure must not bloat the always-loaded surface.

## Key Decisions
- **Scope = Reframe + router** (Q1). Reorganize existing CLAUDE.md/AGENTS.md content under Context·Connections·Capabilities·Cadence + sharpen the router top; NO new live-data/automation infra. Connections + Cadence get a "planned" roadmap section, not a build.

## Q&A Log

### Q1: What is the Four-C's restructure trying to BE?
- **Recommended:** Reframe + router (low-risk docs/architecture reshape, no infra).
- **Sean's answer:** Reframe + router (accepted).
- **Implication:** Closes the full-AIOS-build branch for now. Opens: how invasive the reframe is to the existing 66 rules, and how much Connections/Cadence roadmap to capture.

### Q2: How invasive to the existing 66 rules?
- **Recommended:** Additive router at top — map each C to where content already lives; rules stay put, zero renumbering.
- **Sean's answer:** Additive router at top (accepted).
- **Implication:** No churn to rule numbers / cross-refs. The router is a compact new top section in CLAUDE.md, mirrored in AGENTS.md. Opens: where the Connections/Cadence roadmap lives + how much to capture.

### Q3: Where does the Connections/Cadence roadmap live + how deep?
- **Recommended:** Separate planned doc (`references/FOUR-C-CONNECTIONS-CADENCE-ROADMAP.md`), router points to it; one-line C2/C4 candidates in the router.
- **Sean's answer:** Separate planned doc, router points to it (accepted).
- **Implication:** Always-loaded file stays lean; full roadmap is on-demand. Design is now fully resolved.

## Phase 2 — Synthesize & Advise

1. **Make the router explicitly tool-agnostic (Claude + Codex).** Nate Herk's core point: "it's folders and files — switch harnesses freely." The router should state both files carry the same Four-C map so Codex and Claude orient identically. (Already a session value — AGENTS.md mirrors CLAUDE.md.)
2. **Router doubles as the <2-min orientation entry point.** Fold the existing "where do I start" pointers (ACTIVE-INDEX.md, continuity bridge `rolling-last-done.md`, load-order rule) into C1 so a fresh session/agent orients fast — strengthens rule 36 (repo index) without duplicating it.
3. **Keep it ≤~30 lines.** It's a navigation layer, not new doctrine — it points at the 66 rules / ref-docs / skills that already exist; it does not restate them. Honors token economy.
4. **C2/C4 surface what's already live** (so the router is honest, not just aspirational): C2 live = Render PG, R2, consult-gemini/consult-codex, Hermes bridge, Oracle/SerpAPI; C4 live = continuity bridge, pre-commit secret scan, the new prompt-watcher UserPromptSubmit hook. Planned items point to the roadmap doc.

## Build plan (additive, low-risk, reversible)
1. New compact **"Four-C Router"** section near the top of CLAUDE.md (after Identity/Product Core Loop, before the deep rules). Mirror verbatim in AGENTS.md.
   - **C1 Context** — identity, Product Core Loop, Active Palette, the 66 rules, vision/strategy docs; orientation entry points (ACTIVE-INDEX.md, continuity bridge, load-order).
   - **C2 Connections** — live: Render PG, R2, consult-gemini/codex, Hermes, Oracle. Planned → roadmap doc.
   - **C3 Capabilities** — 20 `.claude/skills/`, AI Village, `scripts/`.
   - **C4 Cadence** — live: continuity bridge, pre-commit secret scan, prompt-watcher hook. Planned → roadmap doc.
2. New **`docs/ai-workflow/references/FOUR-C-CONNECTIONS-CADENCE-ROADMAP.md`** — the planned C2 connections + C4 cadence automations, prioritized, no build.
3. Add the roadmap doc to the reference-doc table in CLAUDE.md + AGENTS.md.
4. No rule renumbering, no content moved. Pure additive navigation layer.

**Status:** complete — proceeding to build.
