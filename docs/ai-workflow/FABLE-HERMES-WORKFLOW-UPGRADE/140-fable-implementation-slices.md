# 140 — Fable Implementation Slices

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL slice plan for this workstream
- **Legend per slice:** Objective · Why · Files · Risk · Acceptance · Verification · Rollback · Fable needed? · Codex-executable later? · Claude-executable later? · Human approval?
- Slices 1â€“14 are **docs/prototype slices executed in THIS pass** (their acceptance is checked in the final verification of this session). Slices 15â€“17 are the original future work. S18 is a 2026-07-04 Codex follow-up executed in-place. S19â€“S20 are future work.

---

## Executed in this pass

**S1 — Paybolt mishearing cleanup.** Objective: prove Paybolt is not canonical; map intent to Fable docs. Files: `101-paybolt-mishearing-cleanup.md`. Risk: none. Acceptance: two sweeps documented (incl. gitignored/hidden), zero pre-existing refs, mapping table present. Verification: rerun `rg -li paybolt` — only correction-note hits. Rollback: delete file. Fable: yes (judgment). Codex/Claude later: yes. Approval: none.

**S2 — Fable workflow integration spec.** Files: `references/FABLE-WORKFLOW-INTEGRATION-SPEC.md`. Risk: low (doc). Acceptance: role, use/don't-use, vs-each-brain table, output formats, acceptance/verification requirements, cost discipline, open questions — all present. Verification: file exists, sections enumerable. Rollback: delete file. Fable: yes. Approval: none (routing doc; CLAUDE.md wiring is S15).

**S3 — Hermes/SwanStudios operator bridge.** Files: `references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`. Risk: LOW-MED — this file is referenced by CLAUDE.md/AGENTS.md and was missing; wrong content here would mislead every agent. Acceptance: boundary table, actor table, canonical T0–T4 (defined once), safe-write-path diagram, gates/receipts/switches, design boundary, open questions. Verification: no contradiction with CLAUDE.md rules (hostile pass); dangling reference resolved. Rollback: delete file (reference dangles again, as before). Fable: yes. Approval: content review by Sean recommended.

**S4 — AI skill & operator registry.** Files: `references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`. Risk: low. Acceptance: decision labels, owners, deterministic-vs-agent ladder, ≥40 seeded rows incl. all Sean-mandated entries, button candidates, manual-only list, bloat policy. Verification: every row has owner+tier; retired `requesting-code-review` marked do-not-dispatch. Rollback: delete file. Fable: yes. Approval: none for the doc; any capability grant it records still needs its own gate.

**S5 — Hermes Agentic OS core docs.** Files: `hermes-agentic-os/` (README, index, architecture, principles, workflow-audit, skills-to-automations, loop-engineering, memory-and-state, deterministic-vs-agentic-boundary). Risk: low. Acceptance: six levels covered; doctrine embodies vending-vs-slot-machine, approval, receipts, no-shell, fail-closed. Verification: files exist; index lists whole tree. Rollback: delete folder. Fable: authored briefs + review. Codex/Claude later: yes (extensions).

**S6 — Agentic OS governance + command-center spec docs.** Files: command-effect-registry, approval-gates, audit-receipts, kill-switches, dashboard-command-center-spec, dashboard-button-registry, channels-and-brokers, headless-runner-spec, distribution-and-voice, run-logs-and-self-improvement, implementation-slices, open-questions. Risk: low. Acceptance: unregistered=BLOCKED stated; T3/T4 = approval+receipt everywhere; kill switches fail closed; Discord inbound has zero authority. Verification: grep for contradiction with bridge. Rollback: delete files.

**S7 — Agentic OS static command-center prototype.** Files: `hermes-agentic-os/prototypes/hermes-agentic-os-command-center.html`. Risk: none at runtime (static, no external requests, demo data). Acceptance: self-contained; banner present; 13 required panels; tier badges; reduced-motion gating; reads with JS disabled. Verification: grep for `http`/`fetch`/`@import`/`src=`; open-in-browser pass by Sean. Rollback: delete file. Approval: none (non-production artifact).

**S8 — Design Brain core.** Files: `design-brain/` README, index, design.md, motion.md, components.md, anti-patterns.md, qa-gates.md. Risk: LOW-MED (design drift if it contradicted the source doc). Acceptance: design.md canonical + subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md; Cyberforest scoped operator-only; QA gates binary. Verification: no contradiction on palette/bans; token names consistent. Rollback: delete folder; `swan-design-router` continues on its two source docs unaffected.

**S9 — Design Brain static visual reference.** Files: `design-brain/design.html` (1,340 lines, landed). Acceptance: 18 sections, self-contained, banner cedes authority to design.md, reduced-motion gated. Verification: agent's zero-external-request grep done; browser render pass pending (flagged, S14). Rollback: delete file.

**S10 — Design Brain adapters.** Files: `adapters/` (index + builders, fable, hermes, reviewers, product-surfaces, cinematic-site-generator, knowledge — consolidation of 12 planned files into 8, recorded in adapters/index.md). Acceptance: every adapter ends with a self-applicable verification list; no new visual rules introduced. Rollback: delete folder.

**S11 — Obsidian bridge.** Files: `obsidian/` (index, vault-routing, design-decision-log-policy). Acceptance: raw/wiki/outputs/runs/graph-imports/references/templates lanes + index.md law + anti-pollution + zero-PII. Rollback: delete folder.

**S12 — Graphify bridge.** Files: `graphify/` (index, graphify-policy, templates). Acceptance: quarantine-first; promotion checklist; imports removable; relationship-chains-only trigger. Rollback: delete folder.

**S13 — Website archetypes + cinematic factory.** Files: `design-brain/website-archetypes.md` (20 archetypes, 545 lines) + `design-brain/cinematic-pages.md` (200 lines) + `adapters/cinematic-site-generator.md`. Acceptance: all 20 archetypes with adapters/QA/Village questions; hard-caps table; no-cloning rule; deploy checklist gated on Sean. Rollback: delete files.

**S14 — Village modes + this slice plan + Hermes prompt + patch proposal + exec summary + checkpoints + hostile review.** Files: `130`, `140` (this), `120`, `110`, `150`, `checkpoints/010–050`. Acceptance: 110 is proposal-only (nothing applied); 120 paste-ready with verification probes; hostile-review findings fixed or disclosed. Verification: final session verification block. Rollback: delete files. **Residual flagged:** design.html + command-center prototype need a human open-in-browser pass (2 min each).

## Future slices (NOT executed in this pass)

**S15 — Apply the CLAUDE/AGENTS patch (110).** Owner: Claude Code or Codex. Risk: MED (operating files). **Human approval: REQUIRED (Sean).** Acceptance/verification/rollback: as written in 110. Fable not needed.

**S16 — Deterministic receipts + approval-queue scripts (Agentic OS slice 1).** Owner: Codex or Claude Code, per `hermes-agentic-os/implementation-slices.md`. Risk: MED (first runtime artifact). Approval: Sean per slice; tests-first (rule Bugfix/TDD standards); T2 ceiling; kill switch + receipt from day one. Fable: spec exists; not needed to build.

**S17 — Hermes system-prompt update via 120 + probe verification.** Owner: Sean pastes; Hermes acknowledges; probes verified. Risk: LOW (teaching prompt, grants nothing). Approval: Sean chooses timing. Follow-ups (broker hardening, command center v1, Discord broker, headless runner, voice) proceed per `hermes-agentic-os/implementation-slices.md` ordering — each its own approval.

**S18 - Fable token-economy protocol + estimator.** Owner: Codex. Status: EXECUTED 2026-07-04. Files: `references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`, `scripts/ai-workflow/fable-context-compression-estimate.mjs`, `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, registry/index pointers. Risk: LOW (docs + local deterministic read). Acceptance: protocol defines tool-output compaction, semantic compression, logs/query-first handling, huge-read guards, low-thinking defaults, startup discovery contract, image-context receipt, savings threshold, fidelity gate, and proxy block; estimator self-test passes and produces a report on the Sean-supplied transcripts. Approval: Sean requested setup; no proxy/install/model call performed.

**S19 â€” Local context image renderer.** Owner: Codex or Claude Code. Risk: MED-LOW. Files: local renderer + manifest format + fixture tests. Acceptance: renders approved text packets to local images, emits manifest + sampled-line map, no model/API call, no third-party upload, sensitive-pattern block demonstrated. Approval: Sean approves before use in a Fable packet.

**S20 â€” Supervised proxy provenance review.** Owner: Codex hostile review + Fable arbitration. Risk: MED-HIGH. Files: review packet only unless approved. Acceptance: package/repo exists, source pinned, network/logging/key-handling reviewed, sandbox command documented, cost/fidelity A/B test passed, kill switch documented. Approval: Sean approves exact package/version/command before any run.

## Sequencing note

S15 (wire the operating files) should land before S16/S17 so every agent session discovers the control layer at startup. S18 is additive cost-control documentation and a local estimator; it does not unblock S16/S17 and does not authorize proxying. S19 must land before any S20 proxy experiment. Nothing else here blocks production work; the entire pass is additive documentation.
