# Skill Registry Audit

Date: 2026-07-03
Scope: local repo skill/tool docs, AGENTS/CLAUDE rules, route surfaces, and active workflow files.

## Executive Verdict

SwanStudios has enough skills and agent workflows to become a serious AI operating system, but the registry is not clean enough yet for Hermes to safely drive it end to end. The next upgrade should create one canonical registry that answers four questions for every skill/tool:

1. What is it for?
2. Who can invoke it?
3. What data may it touch?
4. What verification or approval is required before acting?

## Current Skill and Tool Map

| Capability | Current local evidence | Best use | Risk | Upgrade needed |
| --- | --- | --- | --- | --- |
| `prompt-watcher` | AGENTS/CLAUDE rule 66 | Classify SIMPLE vs VISION and improve broad prompts before work starts | Can be ignored if not visible in future tools | Add a visible receipt field to slice docs: `prompt_watcher_classification` |
| `grill-me` | AGENTS/CLAUDE strategy rules | Extract Sean's real intent and pressure-test raw ideas | Can become too abstract without a concrete slice | Require output: bet, metric, threat, next slice |
| `chromie` | AGENTS/CLAUDE strategy rules | Strategy pressure-test for unproven bets | Can over-delay obvious fixes | Trigger only for net-new product bets or acquisition/monetization pivots |
| `swan-orchestrator` | AGENTS/CLAUDE pipeline order | Pre-task gate for rules, canonical surface, planning, hygiene | Needs a canonical checklist | Add registry row with Rule 15/17/26/32 obligations |
| `swan-design-router` | ACTIVE-INDEX, AGENTS, CLAUDE, design docs | Only default design brain | Strong, but spread across files | Create Design Brain bundle and a router receipt template |
| `frontend-design` and `ui-ux-pro-max` | AGENTS/CLAUDE reference libraries | Support material under design router | Can conflict with Swan rules | Always subordinate to Swan design docs |
| `design-taste-frontend` | AGENTS adapter note | Explicit high-taste add-on only | Tailwind/default guidance conflicts | Keep explicit-only and filter through Swan rules |
| `closeout-evidence-lock` | AGENTS/CLAUDE rule 41 | End-of-task proof and hostile review | Needs consistent receipt format | Add final receipt template to implementation slices |
| `requesting-code-review` | AGENTS/CLAUDE retired | None | Broken/retired path | Keep blocked; do not dispatch |
| AI Village | AGENTS/CLAUDE, `scripts/validation-orchestrator.mjs`, AI-Village docs | Paid high-stakes validation | Cost, stale docs, overuse | Create AI Village canonical packet and spend gate |
| Fable final decider | AGENTS/CLAUDE rule 46 amendments | Final arbitration on major release decisions | Not locally callable here | Use paste-ready Fable prompt, not assumed availability |
| Hermes operator bridge | Hermes docs, `/api/hermes` routes, memory notes | Sean-only operator tasks and review queue | Blurred identity across Pi/Windows/in-app | Restore missing bridge doc and permission ladder |
| Browser Harness | local Hermes setup and user workflow | Read-only/public or supervised browser audits | Admin/private audit blocked without stronger scope | Add admin-audit policy and no-write receipt |
| Coach Brain vault | `docs/ai-workflow/coach-brain` | Obsidian-compatible workout doctrine brain | Not runtime-wired yet | Add Hermes ingestion adapter spec and contract test |
| Karpathy Wiki / Mythos | `HERMES-WIKI-MYTHOS-MASTER-PLAN.md` | Personal/system memory and planning context | Could become ungoverned memory soup | Add provenance, privacy, stale-date, and source-tier rules |
| PLAUD pipeline | PLAUD controllers and AI routes | Voice workout capture and trainer approval | Raw client health/injury text | Require local-private redaction first |
| AI command lane | `/api/ai-command/*` | In-app natural language draft/confirm commands | Mutations need approval | Add command registry by effect level |
| Hermes tasks | `/api/hermes/tasks` | Persistent operator work queue | Could circumvent app auth if not governed | Keep admin/trainer protected; add task category effect labels |
| Coach proposals | `/api/coach/proposals` | Draft actions from AI response | Needs human approval | Keep proposal-only until explicitly confirmed |

## Missing Registry Fields

Every registry row should include:

- `name`
- `category`: prompt, skill, route, model, operator, browser, validator, brain
- `owner`: Sean, Codex, Claude, Fable, Hermes, app user role
- `status`: active, planned, stale, missing, retired
- `allowed_data`: public, repo, app metadata, client-scoped, sensitive-redacted, forbidden
- `effect_level`: read-only, draft-only, approval-required write, destructive, forbidden
- `default_model_lane`: local, single-provider, Fable, Gemini, AI Village, none
- `requires_sean_approval`: yes/no
- `verification`: test, route smoke, browser capture, design receipt, security review, Render proof
- `source_files`

## Hostile Review Findings

1. The registry is implicit. That is not good enough for an operator agent.
2. `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` is referenced as a core boundary file but missing locally.
3. `docs/11-slice-registry.md` was requested but not found.
4. AI Village counts and roles drift across docs.
5. The repo has strong design rules, but no single Design Brain artifact for Fable/Hermes to consume.
6. Browser Harness admin audit is conceptually desired but policy-blocked in current safe lane.
7. The app has many powerful AI routes; there is no single operator effect-level map.
8. The coach brain vault is correctly shaped but not yet integrated into runtime generation or Hermes retrieval.

## Required Registry Upgrade

Create:

`docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`

It should become the canonical map for:

- prompt router
- strategy brains
- design brain
- closeout gate
- AI Village
- Hermes
- Browser Harness
- Coach Brain
- PLAUD
- AI command lane
- review queue
- Render release gates

Acceptance criteria:

- Every listed skill/tool has an owner, scope, effect level, data class, and verification rule.
- Missing/stale tools are explicitly labeled.
- The registry says "do not use" for retired/broken tools.
- The registry is linked from `ACTIVE-INDEX.md`, `AGENTS.md`, and `CLAUDE.md`.

