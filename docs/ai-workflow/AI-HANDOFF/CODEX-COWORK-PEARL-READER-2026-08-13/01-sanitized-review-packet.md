# Privacy-First Codex + Claude Cowork Operating System — Advisory Review Packet

## Purpose

Design a practical, privacy-first operating model for a solo founder who runs a personal-training SaaS/business and is also launching an AI operations consulting practice. He pays for both ChatGPT/Codex and Claude/Cowork and wants to use both deliberately rather than duplicating work. This is a strategy review only. Do not implement, purchase, deploy, connect accounts, or expose private data.

## Sanitized owner context

- Windows desktop workstation.
- One RTX 5090 with 32 GB VRAM.
- High-end Ryzen desktop CPU; exact model should be confirmed before hardware-specific instructions.
- 64 GB system RAM currently installed; another 64 GB kit is available, but it may be a mixed kit.
- Existing local/private assistant stack and local-model experience.
- Two businesses must remain operationally and contextually separate: a personal-training business/SaaS and a distinct AI operations consulting business.
- Privacy is a first-order requirement. Likely sensitive classes include health and fitness records, client identity/contact data, business financials, credentials, contracts, internal documents, and proprietary workflows.
- Cloud use is acceptable only for bounded, sanitized work. Sensitive raw material should remain local unless a separate approved business/enterprise data agreement and explicit per-workflow decision allow otherwise.

## Source-video synthesis (claims are inputs, not trusted facts)

### Video A — Codex browser/computer execution

The video demonstrates browser annotation, adversarial UI testing, headed/headless browser work, authenticated browser sessions, downloads, reusable skills, schedules, and desktop computer use. Its most valuable operational heuristic is: API first; deterministic script/macro second; AI browser/computer vision only when the workflow truly requires perception or reasoning. It also shows why high-risk workflows need supervised rehearsal and human approval.

### Video B — Claude Cowork

The video frames Cowork as a long-running knowledge/document worker that can plan and execute multi-step tasks, use connected context, operate from desktop/web/mobile, and work with local folders or remotely available project/connector data. The privacy-critical distinction is not merely local versus cloud UI: current official documentation says Cowork task execution runs remotely, while local file/browser/computer access is bridged through the desktop app and requires that machine to remain reachable.

### Video C — observable local AI routing/flywheel

The video argues for an observable control plane: route each task to the cheapest adequate worker; retain human supervision; log tool/result traces; evaluate outcomes; turn corrections into reusable examples; and gradually move repeatable classes from expensive frontier models to smaller/local models. It discusses NVIDIA Switchyard, local retrieval/tools, model customization, and a data flywheel. Official NVIDIA documentation currently describes Switchyard as an experimental LLM-routing decision engine whose integration and contracts can change. The transcript appears to conflate or misname model releases; do not build the plan around an unverified “Nemotron 3.5 Lightning.” The verified family includes NVIDIA Nemotron 3 Nano 30B-A3B, but model selection is not the core decision in this review.

## Already-established business direction

The consulting business should be a separate consult-first offer, not an AI-product store or generic chatbot agency. The service method is: diagnose and baseline one expensive workflow, prove a bounded pilot, harden it, then operate/report on retainer. The public site remains separate from the personal-training product and should not claim fabricated outcomes. The desired founder trajectory is repeatable delivery with SOPs, capacity limits, and eventual delegation so personal operating time can decline.

## Architectural thesis to review

Build a small “AI operations control plane” before attempting a giant local model stack.

1. **Local Intake and Policy Gate** — classify sensitivity, business boundary, action risk, and allowed destinations before any agent sees full context.
2. **Local Context Broker** — retrieve minimum-necessary snippets from separated local vaults; do not expose entire drives or repositories by default.
3. **Local Redaction/Tokenization Layer** — replace names, emails, phone numbers, addresses, account identifiers, health details, and credentials with typed placeholders; preserve a local-only reversible map only when operationally necessary.
4. **Router** — choose deterministic code/API, local model/tool, Codex, Claude Cowork, or a separately approved cloud model based on sensitivity, capability, cost, and action risk.
5. **Approval Gate** — require human review before external messages, publishing, payments, account changes, destructive file operations, production changes, or any action involving health/financial records.
6. **Execution Adapters** — API/connector first; deterministic scripts second; browser/computer use last. Codex is the default code/browser/test/automation builder and verifier. Cowork is the default document/project/research/deliverable worker. Neither is the authority for final irreversible action.
7. **Evidence Ledger** — record task class, source categories, route, tools, cost/usage where available, approvals, output hash, result, correction, and reusable lesson without storing raw sensitive payloads in the general ledger.
8. **Evaluation Flywheel** — build a local eval set from sanitized tasks and human corrections; improve prompts, tools, retrieval, and routing before considering fine-tuning.

## Proposed data zones

- **Zone 0 — Secrets:** credentials, tokens, private keys, password exports. Never enter prompts or general logs. Use OS/vault-managed injection only.
- **Zone 1 — Regulated/highly sensitive:** health, biometric, financial, legal, family, and identifiable client records. Local deterministic/local-model processing by default. External use requires an explicit approved contract, minimum-necessary packet, and workflow-specific authorization.
- **Zone 2 — Confidential business:** contracts, internal SOPs, unpublished strategy, client operations. Local-first; cloud only after redaction and explicit routing approval.
- **Zone 3 — Internal low sensitivity:** templates, generic processes, de-identified examples. Eligible for bounded subscription/cloud work.
- **Zone 4 — Public:** websites, public marketing, public documentation. Eligible for normal cloud research and execution, subject to action approval.

## Proposed division of labor

### Codex / ChatGPT desktop

- Software design, coding, tests, repo work, browser QA, app/browser execution, deterministic automation creation, system inspection, and evidence-backed verification.
- Best fit for workflows where the deliverable is code, a tested automation, a reproducible browser check, or a controlled desktop action.
- Browser/computer use must be constrained to named sites/apps, named accounts, bounded actions, and explicit stop conditions.

### Claude Cowork

- Long-running document synthesis, folder-scoped knowledge work, proposals/SOW drafts, meeting-to-deliverable pipelines, research briefs, SOP generation, and formatted office artifacts.
- Best fit when the deliverable is a document/report/presentation/workbook or a multi-step knowledge-work package.
- Because Cowork runs remotely according to current official documentation, “local folder access” must not be treated as local inference or zero disclosure.

### Local worker stack

- Sensitivity classification, PII/secret detection, redaction/tokenization, OCR/transcription where practical, embeddings/retrieval, small routing decisions, deterministic validation, and evaluation scoring.
- RTX 5090 VRAM is the fast-inference constraint. Moving from 64 GB to 128 GB system RAM expands local capacity, CPU offload, indexing, and concurrency but does not turn RAM into fast VRAM.
- A mixed 128 GB memory configuration is a stability/clocking question, not an AI architecture principle. Recommend validation and conservative memory settings; never imply zero risk.

## Action-risk tiers

- **T0 Read:** local/public read-only analysis.
- **T1 Draft:** create drafts and local artifacts; no external effect.
- **T2 Bounded internal write:** write within an approved working folder/database staging area; reversible and logged.
- **T3 External-visible:** send, publish, submit, deploy, or modify a third-party system. Explicit human approval immediately before execution.
- **T4 Destructive/financial/irreversible:** payments, deletions, credential/security changes, legal acceptance, production data mutation, account ownership changes. Human-executed by default; AI may prepare a checklist and evidence only.

## Candidate first workflows

1. Personal-training marketing content: local/public source intake → content brief → drafts → human approval → scheduled/published output. Never mix client health data into marketing context.
2. Lead qualification for consulting: public form → local rules/scoring → founder briefing → human decides whether to offer calendar access.
3. Client workflow audit: de-identified process map → time/error baseline → automation proposal → bounded pilot → measured report. Client owns production accounts/billing where practical.
4. Document intake: local OCR/transcription/redaction → retrieval index → draft deliverables through the appropriate agent.
5. Software QA: Codex runs automated tests and adversarial browser checks on approved test environments, returns evidence, and never self-publishes to production without approval.

## Decisions requested from each reviewer

Return a decisive, independent review. Do not merely agree with the thesis.

1. State the best overall operating model for combining Codex and Claude Cowork on this Windows workstation.
2. Identify duplication to eliminate and name the primary owner for each task class.
3. Threat-model the architecture: data exfiltration, prompt injection, cross-client/context leakage, connector overreach, credential exposure, unsafe browser actions, misleading logs, silent cloud execution, and training-data contamination.
4. Produce a minimum viable architecture that can be built by one technical founder without becoming a six-month platform project.
5. Give a 30/60/90-day sequence with explicit “do not build yet” items.
6. Decide which components should run locally on the RTX 5090/64–128 GB system and which may use subscription cloud agents only after sanitization.
7. Evaluate the proposed data zones and T0–T4 gates; repair weak boundaries.
8. Define an evidence ledger and eval flywheel that are useful without becoming a privacy liability.
9. Recommend how this same system can become a repeatable consulting-delivery method without leaking one client’s data or business logic into another’s.
10. Address the RAM choice cautiously: expected benefit of 128 GB, mixed-kit stability risks, and the tests/settings needed before relying on it for unattended work.
11. Provide an opinionated Codex-vs-Cowork matrix, a routing flow, failure/rollback plan, and the top 10 implementation backlog items.
12. Flag any video claims that are unsafe, exaggerated, or irrelevant to this owner’s actual needs.

## Non-negotiables

- No raw PII, PHI-like fitness records, credentials, banking data, customer exports, private addresses, or proprietary client documents may be requested or emitted.
- No “upload everything” second brain.
- No autonomous external communication, publishing, financial action, production deployment, permanent deletion, or security-setting change.
- No assumption that a consumer subscription alone provides a regulated-data compliance posture.
- No fine-tuning in the first implementation phase. Improve routing, retrieval, tools, and evals first.
- No fabricated case studies, metrics, savings, or guarantees.
- Keep the personal-training and consulting businesses in separate vaults/projects/logical namespaces.
- Keep recommendations Windows-native and feasible for one RTX 5090 workstation.

## Desired response structure

1. Verdict and strongest disagreement
2. Recommended target architecture (include Mermaid)
3. Codex/Cowork/local-worker responsibility matrix
4. Privacy and security controls
5. 30/60/90-day roadmap
6. Evidence ledger and evaluation design
7. Consulting productization implications
8. Hardware/RAM assessment
9. Top 10 backlog with acceptance criteria
10. Kill list: what not to build or automate yet
