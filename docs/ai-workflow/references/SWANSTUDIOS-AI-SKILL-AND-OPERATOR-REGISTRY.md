# SwanStudios AI Skill & Operator Registry

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the single map of who/what may do which job at which tier
- **Companions:** `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (defines T0-T4 + actors) · `FABLE-WORKFLOW-INTEGRATION-SPEC.md` (Fable routing) · `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` (token-economy startup rule) · `AGENT-WORKFLOW-ROUTER.md` (task mode + external skill intake) · `docs/ai-workflow/hermes-agentic-os/command-effect-registry.md` (runtime command detail)

---

## 1. Purpose

The 2026-07-03 audit's core finding: *the registry is implicit, and that is not good enough for an operator agent.* This file makes it explicit. Every skill, workflow, brain, and surface gets an owner, a tier, a data class, and a verification rule. **An entry not in this registry defaults to BLOCKED for autonomous execution** — an agent may still propose it (T1), never run it.

## 2. Decision labels

`KEEP` (works, leave it) · `MERGE` (fold into another entry) · `REWRITE` (right idea, wrong shape) · `DELETE` (bloat/broken — propose removal, rule 34 applies) · `CREATE` (doesn't exist yet, should) · `AUTOMATE` (make it scheduled/event-triggered) · `BUTTON` (expose as one-click in the command center) · `KEEP MANUAL ONLY` (must stay human-initiated) · `FABLE REVIEW` (needs a Fable pass before status changes) · `AI VILLAGE REVIEW` (needs the paid court before status changes)

## 3. Operator owners

`Hermes` · `Fable` · `Codex` · `Claude Code` · `AI Village` · `Browser Harness` · `Deterministic Script` · `SwanStudios API` · `Obsidian/Vault` · `Graphify` · `Human/Sean`

## 4. Deterministic-vs-agent boundary

**Vending machine before slot machine.** Ask in order:
1. Can the job be exact and repeatable? → **Deterministic Script** (scan, prune, receipt, report, diff, count). No LLM.
2. Is it messy language/judgment but single-step? → **One AI call** with a fixed prompt contract.
3. Does it need multi-step uncertainty (explore → decide → act)? → **Agent**, with tier + receipt + kill switch.
4. Does it have real-world impact (T3/T4)? → whatever executes, a **Human** approves.

Misclassification is a registry bug: an agent doing a script's job wastes tokens and adds nondeterminism; a script doing an agent's job silently fails on edge cases.

## 5. Skill registry (default-exposed `.claude/skills/` + core workflows)

Data classes: `repo` (code/docs) · `app-meta` (routes, configs, non-client data) · `client-scoped` (per-client via app auth) · `sensitive-redacted` (health/transcripts after redaction) · `public`

| Entry | Owner | Tier | Data | Decision | Verification / notes |
|---|---|---|---|---|---|
| prompt-watcher (rule 66) | Claude Code | T0 | prompt only | KEEP | Hook fires per prompt; add classification receipt to slice docs |
| grill-me (rule 64) | Claude Code | T1 | repo | KEEP | Checkpoint doc must exist in `brainstorms/` per grill |
| chromie (rule 65) | Claude Code | T1 | repo | KEEP | Only for unproven bets; output = spec + 3 failure modes + gap ranking |
| swan-orchestrator | Claude Code | T1 | repo | KEEP | Pre-task gate artifacts (rules 15/17/26/32) present before build |
| wayfinder (rule 78) | Claude Code/Codex | T1 local map; external tracker write requires explicit authority | repo | KEEP SITUATIONAL | Multi-session + material fog only; Linear owns implementation status when authorized, local map stores decision evidence; exits early otherwise |
| goal-contract (rule 78) | Claude Code/Codex | T1 contract; persistent goal API only on explicit user request | repo | KEEP | Objective, validation, constraints, checkpoints, uncertainty, and stop conditions; anti-reward-hacking |
| worktree-isolation (rule 78) | Claude Code/Codex | T0 inspect -> T2 bounded repo/worktree write | repo | KEEP | Verify current baseline, exact branch/path, env/dependencies/ports/services; cleanup is separately authorized |
| guided-setup (rule 78) | Claude Code/Codex + Human | T0/T1; sensitive step uses its own tier | repo/app-meta | KEEP | One verified current step; stable remaining ledger; human performs auth/financial/irreversible steps |
| validate-skill-registry | Deterministic Script | T0 | repo | KEEP | Exact `SKILL.md` casing, frontmatter, and filesystem inventory; no model calls |
| swan-design-router (rule 40) | Claude Code | T1 | repo | KEEP | Loads Design Brain and suitability-filtered World Engine context; refuses unlicensed M4 |
| swan-world-factory | Codex/Claude builders | T1 plan → T2 bounded ignored writes | repo/public | KEEP MANUAL ONLY | Sean supplies N/purpose/seed/budget; delegates each site to the canonical cinematic generator; worker pool ≤3; ignored experiments + receipts only; no production promotion |
| closeout-evidence-lock (rule 41) | Claude Code | T1 | repo | KEEP | Claim-to-evidence lock; forbidden-language filter |
| canonical-surface-audit | Claude Code | T0 | repo | KEEP | Produces rule 26–31 receipts |
| repo-hygiene-scan | Claude Code | T0 | repo | KEEP | Non-destructive only |
| systematic-debugging / TDD / verification-before-completion / full-output-enforcement | Claude Code | T0–T1 | repo | KEEP | Core discipline set |
| webapp-testing / agent-browser / audit-website | Browser Harness | T0 (T1 receipts) | app-meta | KEEP | Read-only default; interactions need per-run approval (bridge §6) |
| attack-the-site | Claude Code | T1 | repo/app-meta | KEEP | Product red-team; hands code CVEs to security-review |
| copy-tournament | Claude Code | T1 | public copy | KEEP | Visual side routes through design router |
| skill-harvest | Claude Code | T1 | repo | KEEP | Proposes only; this registry is where its proposals land |
| fusion-router / ai-village-fusion (Tiers 0–2) | Claude Code | T1 | repo | KEEP | Free triangle = everyday cross-review workhorse |
| seedance workout/cinematic video skills | Claude Code | T1 | public | KEEP | Prompt artifacts only; media generation is external+manual |
| swan-oracle | Claude Code | T1 | redacted packets | KEEP | Privacy-safe packets only |
| requesting-code-review | — | — | — | **DELETE (quarantined)** | Broken dependency; checklist already preserved in closeout-evidence-lock. Do not dispatch |
| Mode Router → Wayfinder if foggy → Grill-Me/Chromie as needed → Goal Contract if long/measurable → Worktree/Rule-67 execution → Orchestrator → Design Router if UI → Build → Closeout | Claude Code/Codex | T0 classification → T1/T2 | repo | KEEP | Rule 78 selects the smallest mode; existing project gates remain authoritative |

## 6. Fable section

| Entry | Owner | Tier | Decision | Notes |
|---|---|---|---|---|
| Fable workflow integration | Fable | T1 | CREATE → done | `FABLE-WORKFLOW-INTEGRATION-SPEC.md` (this pass) |
| Fable context compression protocol | Deterministic Script + Codex/Fable | T0 estimate / T1 prompt packaging | CREATE -> done | `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` + `scripts/ai-workflow/fable-context-compression-estimate.mjs`; tool-output compaction, semantic compression, huge-read guards, and image-context receipts; unreviewed request proxies are blocked |
| Fable skill audit pass | Fable | T0–T1 | KEEP · AUTOMATE(cadence) | Re-run registry classification periodically; propose-only |
| Fable root-cause audit pass | Fable | T0–T1 | KEEP | Multi-system causal audits with file:line receipts |
| Fable Design Brain authorship | Fable | T1 | CREATE → done | `docs/ai-workflow/design-brain/`; evolves only in sync with SWAN-CINEMATIC-DESIGN-SYSTEM |
| Fable as Final Decider (rule 46) | Fable / fallback chain | arbitration | KEEP | Verdicts logged in review-queue/debate files |
| Cinematic site generator | Fable → Codex/Claude | T1 spec → T2 build | CREATE → done | Design Brain `adapters/cinematic-site-generator.md` |

## 7. Hermes Agentic OS section

| Entry | Owner | Tier | Decision | Notes |
|---|---|---|---|---|
| Hermes Agentic OS (doc system) | Fable authors · Hermes consumes | T1 | CREATE → done | `docs/ai-workflow/hermes-agentic-os/` |
| Hermes command center dashboard | Human/Sean + Hermes | T0 shell; buttons carry own tiers | CREATE (prototype done, static) | Build gated on Sean approval; prototype at `hermes-agentic-os/prototypes/` |
| Hermes headless runner | Hermes | ≤T2 | CREATE (spec only) | Runs only registered commands; spec in `headless-runner-spec.md` |
| Hermes command effect registry | Fable authors · Hermes enforces | governance | CREATE → done | `command-effect-registry.md` — runtime twin of this file |
| Hermes command receipts | Deterministic Script | T2 (append-only) | CREATE (spec) → AUTOMATE | Format in `audit-receipts.md` |
| Hermes kill switches | Human/Sean | T0 read / T2 flip | CREATE (spec) · BUTTON | Inventory in `kill-switches.md`; master switch per runtime |
| Telegram command broker | Hermes | broker ≤T2; T3/T4 queue-only | KEEP · REWRITE (per spec) | Chat-id allowlist; safe toolset (2026-04-18 lockdown stays) |
| Discord alert broker | Hermes | T3 (templated outbound) | CREATE (spec only) | Alerts only; inbound Discord = untrusted input |
| Local voice / Jarvis layer | Hermes | T0–T1 | CREATE (placeholder spec) | Optional; command execution still goes through the same tiers |
| Coach Brain ingestion (Obsidian-compatible vault → Hermes) | Hermes | T0 read | KEEP · REWRITE (adapter spec) | Must preserve frontmatter/privacy/PDF contracts (`docs/ai-workflow/coach-brain/`) |
| PLAUD transcript intake | SwanStudios API | T2 (approval-gated product writes) | KEEP | Existing webhook/merge/encrypt pipeline |
| PLAUD redaction workflow | Deterministic Script + local model | T1 | KEEP · REWRITE (formalize) | Redact BEFORE any external LLM; bridge §6 |

## 8. Design Brain section

| Entry | Owner | Tier | Decision | Notes |
|---|---|---|---|---|
| Design Brain bundle | Fable authors · all builders consume | T1 | CREATE → done | `docs/ai-workflow/design-brain/` — adapts, never replaces, SWAN-CINEMATIC-DESIGN-SYSTEM.md |
| design.md enforcement | Claude Code/Codex | T1 gate | CREATE → done | `design.md` is canonical and the **sole canonical copy** — the `design.html` mirror was retired 2026-08-16, so there is no "update together" obligation any more. It still ADAPTS `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; "sole" means one copy, not top of the hierarchy. Structural enforcement is `npm run brain:links` (pre-commit) |
| Fable Design Brain adapter | Fable | T1 | CREATE → done | `adapters/fable.md` |
| Website archetype codex | Fable authors | T1 | CREATE → done | 21 archetypes, one dense doc; #21 is the licensed Experience/World Showcase archetype |
| World Engine catalog + M4 license | Fable authors · Codex/Claude execute | T1 doctrine / T2 ignored proof | CREATE → done | 18 World DNA recipes, WFX/PSY contracts, product/Hermes firewall, deterministic proof receipts |
| Browser Harness visual QA | Browser Harness | T0–T1 | CREATE → done | `adapters/browser-harness-visual-qa.md` checklist + receipt |

## 9. AI Village section

| Entry | Owner | Tier | Decision | Notes |
|---|---|---|---|---|
| AI Village light/STORM review | AI Village | T1 | CREATE (mode def) | `130-fable-ai-village-review-packet.md`; cheap subset |
| AI Village full review | AI Village | T1 | KEEP (rule 16 gate) | Sean approval + spend cap, always |
| AI Village hostile review | AI Village | T1 | CREATE (mode def) | Adversarial lenses; refute-first |
| AI Village design review | AI Village | T1 | KEEP · REWRITE (mode def) | GLM-lead pattern from 2026-06-20 runs |
| AI Village safety/governance review | AI Village | T1 | CREATE (mode def) | Reviews THIS control layer for gaps |
| AI Village product / implementation review | AI Village | T1 | CREATE (mode defs) | Product bets; pre-merge implementation court |
| STORM research briefing | Claude Code | T1 | CREATE (procedure) | Multi-lens research synthesis; free-tier first |
| Roast council | Claude Code | T1 | KEEP (via copy-tournament/chromie panels) | MERGE-adjacent: panel mechanics already exist |

## 10. Browser Harness / Obsidian / Graphify section

| Entry | Owner | Tier | Decision | Notes |
|---|---|---|---|---|
| Browser Harness admin audit (supervised) | Browser Harness + Human | T0 observe | CREATE (policy) | Human authenticates; harness observes; receipt mandatory |
| Obsidian/Karpathy wiki routing | Obsidian/Vault | T1 | CREATE → done | raw/wiki/outputs/runs/graph-imports/references/templates + index.md law |
| Graphify quarantine import | Graphify + Human | T1 | CREATE → done | Standalone output → `graph-imports/` quarantine → reviewed promotion |
| Graphify promotion checklist | Human/Sean | T1 | CREATE → done | Provenance + usefulness before anything enters `wiki/` |

## 11. Dashboard button candidates (command-center; each button shows its tier badge)

| Button | Tier | Backing entry |
|---|---|---|
| System status / health sweep | T0 | Deterministic script |
| Generate morning briefing | T1 | Hermes briefing automation |
| Run repo hygiene scan | T0 | repo-hygiene-scan |
| Draft client follow-up (per stale client) | T1 | Swan Coach proposal path |
| Approve queued proposal | T2→executes queued tier | Approval queue |
| Send Discord alert (templated) | T3 — confirm modal | Discord alert broker |
| Pause all automations (master kill) | T2 flip, always available | kill-switches |
| Start supervised browser QA session | T0 + human login | Browser Harness policy |

## 12. Manual-only actions (never automated, never buttoned without Sean present)

- Credential/secret rotation; anything touching `.env`/keys (T4)
- Production deploy approval and `git push` to main outside standing authorizations (T4)
- Direct DB mutation, migrations, data deletion (T4)
- Payments, refunds, pricing changes (T4)
- Client-visible messaging campaigns (T3, per-send approval until trust earned)
- CLAUDE.md/AGENTS.md rule changes (proposal-only from agents, Sean applies)
- Paid AI Village runs (rule 16)
- Unreviewed model API proxies or base-URL overrides that intercept prompts, tool schemas, request history, API keys, or outputs; source review + sandbox + Sean approval required before any run

## 13. Skill bloat policy

- Every CREATE here must name what it replaces or why nothing existing covers it (gap-filter, as skill-harvest does).
- Two skills >60% overlapping → MERGE candidate at the next Fable skill audit.
- A skill unused for 90 days → FABLE REVIEW label; quarantine (not delete) if confirmed dead — the 2026-04-12 quarantine pattern is the model.
- Registry rows without an owner or tier are invalid and treated as BLOCKED.

## 14. Open questions

> **2026-07-04:** items 1–3 are DECIDED (Sean delegation to Fable's proposed defaults; canonical record in `../hermes-agentic-os/open-questions.md`). Item 4 decided below.

1. ~~Confirm the T2 standing allowlist for Hermes.~~ **DECIDED** → open-questions Q1: exactly four rows — `memory-note`, `queue-approve`, `queue-deny`, `switch-flip`. (This item's older proposed list is superseded: briefing generation is T1 and needs no allowlist row; receipt writes are part of every command's lifecycle, not an allowlist entry.)
2. **DECIDED 2026-07-04** (delegation): trainer-facing operators get a **filtered product-tier view** rendered in-product — never this raw operator registry. Scoped to their own available actions; ships with the trainer-lane product slice.
3. ~~Which three buttons ship first?~~ **DECIDED** → open-questions Q5: health sweep (T0) · morning briefing (T1) · approval queue (T2), in that order.
4. **DECIDED 2026-07-04** (delegation): skill-audit cadence = **quarterly floor + triggered early by `skill-harvest` findings** (matches the runtime registry's §4 audit rhythm; no monthly overhead until row count earns it).
