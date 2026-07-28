# Hermes Agentic OS — Folder Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the map; read this before opening anything else in the folder
- **Law:** every major folder in the operator world carries an `index.md` that says what belongs here, what does not, and where to go next. This is that file for `docs/ai-workflow/hermes-agentic-os/`.

---

## 1. What belongs here

Governance and design docs for Sean's private operator system: the six capability levels, the cross-cutting governance spine (tiers, gates, receipts, kill switches), runtime architecture, the command-center spec, and the slice plan that turns the docs into running software. Everything here is **operator-world only** — Sean-facing, approval-gated, private.

## 2. What does NOT belong here

- Product feature specs (Swan Coach, dashboards, storefront) — those live under `../references/` and the product docs; design goes through the Design Brain (`../design-brain/`).
- Production code. This folder ships zero runtime; implementation lands in `backend/`/`frontend/`/`scripts/` via slices in `implementation-slices.md`, each with its own review chain.
- Secrets, credentials, chat IDs, client PII. Placeholder/demo data only, always (bridge boundary 9; CLAUDE.md rules 8/44).
- The T0–T4 tier definitions. They are defined **once**, in `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4. Files here reference the ladder; none may restate or fork it.

## 3. The map

### Core (canonical)
| File | One line |
|---|---|
| `README.md` | What the Agentic OS is, who consumes it, load order, what it is not, six-level overview |
| `index.md` | This map |
| `architecture.md` | End-to-end runtime: channels → broker → tier classification → API → Postgres; trust boundaries; Hermes-down behavior |
| `agentic-os-principles.md` | The doctrine: deterministic-first, approval-for-impact, fail closed, one honest slice |
| `workflow-audit.md` | **Level 1** — extracting Sean's real repeated workflows; interview prompts; seeded skill-candidate table; promotion rule |
| `skills-to-automations.md` | **Level 2** — which skills earn triggers; approval modes per tier; failure routes; the decision table |
| `loop-engineering.md` | **Level 3** — run logs → improvement; propose-only self-modification; drift control; approval preservation |
| `memory-and-state.md` | **Level 4** — three-brain memory model; vault folder law; provenance; zero-PII rules; distilled Mobbin/reference receipts only |
| `deterministic-vs-agentic-boundary.md` | The four-question ladder expanded with ~12 classified SwanStudios examples + misclassification failure modes |

### Governance spine (parallel authorship — may land after this pass)
| File | One line |
|---|---|
| `command-effect-registry.md` | Runtime twin of the skill registry: every command's tier, owner, gate, receipt, kill switch; includes the T0 Fable context-compression estimator |
| `approval-gates.md` | How approvals work: who, how, expiry, standing allowlists, what an approval must name |
| `audit-receipts.md` | The receipt format for every T2+ action; append-only; retention |
| `kill-switches.md` | The switch inventory: one per automation, one master per runtime, fail-closed semantics |

### Command center & channels (parallel authorship)
| File | One line |
|---|---|
| `dashboard-command-center-spec.md` | **Level 5** — the visual cockpit: status, approval queue, buttons with tier badges, kill-switch panel |
| `dashboard-button-registry.md` | Every button, its tier badge, its backing registry entry, its confirm behavior |
| `channels-and-brokers.md` | Telegram command lane, Discord alert lane, VS Code lane — auth, allowlists, what each may carry |
| `headless-runner-spec.md` | The ≤T2 runner that executes only registered commands; no shell, no improvisation |
| `prototypes/hermes-agentic-os-command-center.html` | Static visual prototype of the command center (demo data only; not wired to anything) |

### Operations & growth (parallel authorship)
| File | One line |
|---|---|
| `run-logs-and-self-improvement.md` | Where run logs live, what they must contain, how they feed Level 3 loops |
| `distribution-and-voice.md` | **Level 6** — Discord alert taxonomy, optional local voice layer, the no-new-authority rule |
| `implementation-slices.md` | The ordered honest-slice plan from docs to running system |
| `open-questions.md` | Everything unresolved, each item with an owner and a decision path |

## 4. Canonical vs temporary vs quarantined

- **Canonical:** every `.md` at this folder's root once its header says CANONICAL. Conflicts resolve upward: CLAUDE.md > operator bridge > registry > this folder (matching the CLAUDE.md load-order rule).
- **Temporary:** files whose header status is DRAFT or SPEC-ONLY — real intent, not yet ratified; treat their authorizations as T1 proposals.
- **Quarantined:** `prototypes/` — visual demos with placeholder data. Nothing in `prototypes/` grants capability, defines a tier, or may be cited as policy. Promotion out of prototypes requires a real spec + Sean's approval.

## 5. Read full docs vs search

- **Read fully:** README, this index, `agentic-os-principles.md` — short, load-bearing, assumed context for everything else.
- **Read on task:** the one level doc or spine doc your task touches (the README load order, step 5).
- **Search, don't read:** `command-effect-registry.md` and `dashboard-button-registry.md` are lookup tables — grep for the command or button name. `open-questions.md` — grep for your topic before adding a duplicate question.

## 6. Where to go next

- New to the system → `README.md`, then `agentic-os-principles.md`.
- Adding a workflow/skill/automation → `workflow-audit.md` → `skills-to-automations.md` → register it in `command-effect-registry.md`.
- Building anything → `implementation-slices.md` first; nothing builds out of slice order.
- Questioning a boundary → `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`, which outranks this folder.
