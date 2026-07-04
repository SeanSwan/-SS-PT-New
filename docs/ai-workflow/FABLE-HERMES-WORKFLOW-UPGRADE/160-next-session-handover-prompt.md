# 160 — Next-Session Handover Prompt (Fable Control Layer workstream)

- **Date:** 2026-07-04 · **Author:** Fable (claude-fable-5), SESSION-O · **Status:** ACTIVE handover — paste the block below into the next session verbatim
- **Chat-scroll twin:** the same prompt was delivered inline in the SESSION-O chat; this file is the durable copy.

---

```
FABLE CONTROL-LAYER WORKSTREAM — CONTINUATION HANDOVER (from SESSION-O, 2026-07-03→04)

You are continuing a finished-and-verified build in the SwanStudios repo (c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT). Do not rebuild anything. Read this whole prompt, then follow ORIENTATION, then execute NEXT STEPS in order.

## WHAT ALREADY HAPPENED (do not redo)

1. BUILD (2026-07-03): ~64 files created, docs + 2 static HTML prototypes, ZERO production code:
   - Control layer: docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md · HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md (canonical T0–T4 ladder; resolves a long-dangling CLAUDE.md reference) · SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md (unregistered = BLOCKED)
   - Hermes Agentic OS: docs/ai-workflow/hermes-agentic-os/ (21 docs, Levels 1–6 + governance spine) + prototypes/hermes-agentic-os-command-center.html (Crystalline Cyberforest, browser-verified)
   - Design Brain: docs/ai-workflow/design-brain/ (design.md CANONICAL + design.html mirror + motion/components/anti-patterns/qa-gates + 8 adapters + obsidian/ + graphify/ bridges + website-archetypes.md (20 archetypes) + cinematic-pages.md)
   - Upgrade packet: docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/ 100–150 + checkpoints/010–050
   - "Paybolt" = transcription error for "Fable"; zero pre-existing refs (101 doc); never reintroduce the name.

2. RECURSIVE HOSTILE REVIEW → DRY: two independent reviewers found 6 blockers / 17 majors / 17 minors; ALL fixed; a 13-point independent verifier then confirmed DRY with file:line evidence. Key doctrine locked by the fixes:
   - T4 is HUMAN-EXECUTED: the broker queues/arms/receipts, never executes; arm must be CROSS-CHANNEL; `manual-maintenance` is the reserved T4 intent row.
   - qa-session-start = T0 everywhere. Approval queue holds T3/T4 only. Discord: every send per-send queued; standing template send-authority requires a bridge §7 amendment (open question, NOT granted).
   - Design canon: danger red #E5484D everywhere; semantics success=Ice Wing/warn=Gilded Fern/info=Swan Lavender; tier badges T0 Ice Wing/T1 Swan Lavender/T2 Gilded Fern/T3 Wing Purple/T4 danger red; design.md wins over design.html; adapters may never coin tokens.

3. 110 PATCH APPLIED (2026-07-04, Sean-authorized): CLAUDE.md + AGENTS.md now carry a "## Fable Control Layer" router block + 4 Reference-Docs rows + a rule-40 Design Brain sentence; ACTIVE-INDEX.md points at the registry + both index.md files. Links verified, diff secret-scan clean, no rule renumbered. ALL OF THIS IS UNCOMMITTED in the working tree.

4. PARALLEL WORK WARNING: another lane has ALREADY layered a "Fable Context Compression Protocol" workstream on top (FABLE-CONTEXT-COMPRESSION-PROTOCOL.md in ACTIVE-INDEX, a fable-context-compression-estimate T0 row in hermes-agentic-os/command-effect-registry.md, edits to FABLE-WORKFLOW-INTEGRATION-SPEC.md / the reference registry / 140). Treat those edits as intentional; do not revert; verify lane files before staging anything.

## ORIENTATION (read in this order, ~15 min)
1. .ai-workflow/coordination/claude.lane.md + codex.lane.md + review-queue.md (Rule 67 — claim your lane before editing)
2. docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/150-fable-executive-summary-for-sean.md (state of everything + review-loop verdict)
3. docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md (T0–T4 — the vocabulary every doc uses)
4. docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/140-fable-implementation-slices.md (slice ledger: S1–S14 done, S15 done post-doc, S16/S17 open)
5. docs/ai-workflow/hermes-agentic-os/implementation-slices.md (the runtime build order) + open-questions.md (decisions Sean still owes)

## HARD RAILS (unchanged)
- No production code without a Sean-approved slice; no commits/push without Sean's explicit word; no DB access; no paid AI Village without rule-16 permission; no secrets/PII in any artifact; no shell through any chat surface; T3/T4 always = explicit approval + receipt; git add by EXPLICIT PATH only (never -A — Codex has uncommitted WIP in AGENTS.md and elsewhere).

## NEXT STEPS, IN ORDER

STEP 1 — COMMIT THE WORKSTREAM (needs Sean's "commit it" if not already given; he said "actually already do this" in SESSION-O's last turn — confirm intent, then):
- Stage by explicit path: the three references docs, docs/ai-workflow/hermes-agentic-os/**, docs/ai-workflow/design-brain/**, docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/** (100–160 + checkpoints), CLAUDE.md, AGENTS.md, ACTIVE-INDEX.md.
- COORDINATE the parallel Context-Compression edits: if the other lane's work is mid-flight, either include it deliberately (if its author's lane says done) or exclude those hunks — check lane files; never sweep blindly.
- Message: docs(control-layer): Fable control layer, Hermes Agentic OS, Design Brain + operating-file wiring
- Rule 42 backend audit (should be trivially clean — docs only), secret scan, then push ONLY if Sean says push (Render auto-deploys from main; docs-only is deploy-safe but the rule stands).

STEP 2 — HERMES UPDATE (S17): paste docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/120-fable-hermes-update-prompt.md into Hermes when Sean chooses; run its three verification probes (deploy-now → T4 queue; receipts summary → T0 direct; draft+send → T1 then T3 queued). Wrong answers = re-paste or escalate.

STEP 3 — OPEN QUESTIONS PASS: walk Sean through docs/ai-workflow/hermes-agentic-os/open-questions.md (T2 allowlist per-row yes; Discord template taxonomy; expiry defaults 24h T3/single-use T4; first three buttons; voice hardware; trainer receipt cadence) + bridge §11 + registry §14 + Fable spec §12. Record answers in the docs themselves (edit the Proposed→Confirmed lines) + a dated note.

STEP 4 — FIRST RUNTIME SLICE (S16 / Agentic OS slice 1, needs Sean approval per slice): deterministic receipt-writer + approval-queue scripts, per hermes-agentic-os/implementation-slices.md slice 1 — tests-first, T2 ceiling, kill switch + receipt from day one, isolated worktree, hostile review before report (rule 61). Then slices 2–6 in order (Telegram broker hardening → command center v1 with health-sweep/morning-briefing/approval-queue buttons → Discord broker → headless runner → voice placeholder), each its own approval.

STEP 5 — ADOPTION WIRING (small, high-leverage): update .claude/skills/swan-design-router/SKILL.md to actually load docs/ai-workflow/design-brain/ per the rule-40 sentence (verify the skill file's current text first); offer Sean a Codex hostile review of the whole workstream via review-queue.md (Rule 67 R7) — Codex has not reviewed it yet.

STEP 6 — CLOSE: rule-48 phase audit record for this workstream at docs/ai-workflow/AI-HANDOFF/FABLE-CONTROL-LAYER-AUDIT-RECORD-<date>.md (files, security posture, rollback = git revert of the commit, future review hooks: re-run the AI_VILLAGE_SAFETY_GOVERNANCE mode from the 130 packet against the bridge/registry once runtime slices exist). Continuity closeout only when Sean says "log this and close."

DEFINITION OF FINISHED for this project: workstream committed (+pushed if Sean says) · Hermes taught + probes pass · open questions answered and folded into the docs · runtime slices 1–3 live with receipts/switches proven · design router loading the Design Brain · Codex hostile review APPROVE · rule-48 audit record filed.

Known cosmetic residuals (disclosed, non-blocking): AGENTS.md pre-existing mojibake em-dashes; design.html sticky-TOC anchor offset; both HTML prototypes still deserve Sean's own eyes.
```
