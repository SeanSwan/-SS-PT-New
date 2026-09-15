# SwanStudios: personal agents and the next Workout Planner

## September 13 audit and repair continuation

Sean authorized independent review of the Rolodex, Bootcamp, Sprint and Planner reports and components, followed by fixes and UI/UX upgrades. [The reconciled audit and repair contract](12-hostile-reconciliation-and-repair.md) extends this same packet against current-main baseline `c0cbe538d8`. The two old reviews targeted a divergent checkout; their claims must be reconciled before implementation. The original packet is preserved. Application implementation and its review gates remain pending; the historical statuses below describe their original dated scope.

Start with the [independent audit and fix register](15-audit-findings-and-fix-register.md). Its 30 requirements have [server](13-server-repair-contract.md) and [frontend](14-frontend-repair-contract.md) implementation contracts, an `interactive state preview` (`audit-repair-preview.html` — not committed; machine-local evidence), `rendered source diagrams` (`audit-diagrams.html` — not committed; machine-local evidence), and the current [blocked readiness receipt](audit-readiness.json). Existing green tests and new intentional RED failures are preserved under evidence/hostile-20260913. No application repairs have been applied or deployed in this continuation.

Artifact: SWAN-AGENT-PLANNER-20260906 · Version 2.0 · Owner: Sean
Status: upgraded blueprint and interactive preview; app implementation not started. New provider integration is blocked on the privacy repair gates in 10.
Scope authority: Sean's September 6–7 audit/design requests and explicit choice to upgrade blueprint and preview first.
This is the canonical expansion packet for this request. It adds requirements to
the established Planner/Workout OS and Coach packets; it does not replace their
review authority or authorize their unfinished runtime work.

## The product direction

Make SwanStudios an app that people can operate with their own agents, including
an agent running on their own computer. Give those agents the same narrow,
permissioned training capabilities used by the app. Keep the useful workout
interface: an agent's output becomes a reviewable plan in the existing builder.

Default Swan Coach should work immediately, without API setup. The optional personal-agent experience is concrete: connect Hermes, authorize access to
your own training context, ask it for a workout within your constraints, inspect
the proposed changes in Swan, and save through Swan's existing guarded writer.
A trainer can do the equivalent only for clients they are authorized to coach.
An administrator connects a personal agent with explicit training scopes; this
does not expose billing, account administration, or Sean's private operator tools.

Two experiences matter and need separate delivery milestones:

1. **Use your agent with Swan.** Hermes or another MCP client calls Swan's new
   authenticated tools. The agent and model can stay on the user's machine.
2. **Use your local agent inside Swan.** Choose a paired device beside Swan Coach
   in the Planner. A bounded companion receives an app-started task over an
   outbound connection and returns a proposal. This requires a device bridge;
   adding an MCP server alone does not deliver this experience.

Cloud providers are optional. Local mode must never silently switch a model,
transcription, embedding, memory, or summarization call to a cloud provider.
Swan's hosted data and application APIs still use the network. Local inference
is not a claim that the entire SaaS runs offline or that arbitrary external
agents cannot leak data. These limits must be visible during connection setup.

## Read this packet

| Artifact | Purpose |
|---|---|
| `Audit and source receipt` (`01-audit.md` — not committed; machine-local evidence) | Live observations, current-main caller paths, implemented versus missing |
| `Agent architecture and contracts` (`02-agent-contracts.md` — not committed; machine-local evidence) | Connections, local devices, authorization, privacy, API and storage |
| `Planner upgrade specification` (`03-planner.md` — not committed; machine-local evidence) | Advanced programming, Rolodex, builder, saved/backup/blended plans |
| `Tests and traceability` (`04-verification.md` — not committed; machine-local evidence) | Acceptance cases, executed baseline, intentional RED and future gates |
| `Delivery and hostile review` (`05-delivery-review.md` — not committed; machine-local evidence) | Slices, dependencies, decisions, migration and rollback |
| `Interactive wireframes` (`wireframes.html` — not committed; machine-local evidence) | Desktop/mobile concept, programming sections, saved plans and agent setup |
| `Mermaid diagrams` (`06-diagrams.md` — not committed; machine-local evidence) | Workflow, durable states, sequence, data relationships and trust boundaries |
| `Rendered diagrams` (`diagrams.html` — not committed; machine-local evidence) | Eight diagrams rendered locally with pinned Mermaid |
| `Scoped hygiene inventory` (`07-hygiene.md` — not committed; machine-local evidence) | Competing surfaces and preservation decisions; no cleanup |
| `Readiness receipt` (`readiness.json` — not committed; machine-local evidence) | Machine-checkable evidence references; not runtime certification |

## What the audit changed

The opening checkout was **not** the current Planner. It lacks the live V2
Advanced panel, backups and blending. We fetched `origin/main`, created a clean
detached audit worktree at `53120649f356c3efccee32872b530096d386642f`, and reviewed
the live authenticated admin route. Recommendations below use that newer source.
No claim is made that the live bundle's exact commit was identified.

Keep the live scope selector, Guide Me / Deep Grill, Coach dock, exercise source,
backup generation, plan blending, save bar, PDF lifecycle and revision guards.
Upgrade their depth and coordination. Do not rebuild these as parallel systems.

## Proposed experience

Sean selected **Training Studio with optional Program Map**. The Swan Design Brain and a bounded real Mobbin MCP pass informed the revision. The session dominates; a compact Rolodex and contextual Programming / Coach / Changes inspector support it. My plans keeps current, backup, draft, template and archived workflows distinct. Default Swan Coach works without API setup; personal OpenRouter and local connections are optional.

Read `the design synthesis` (`08-design-synthesis.md` — not committed; machine-local evidence), `connection and spending contracts` (`09-model-connections-and-budgets.md` — not committed; machine-local evidence), and `current Coach privacy audit` (`10-coach-privacy-audit.md` — not committed; machine-local evidence). These govern v2 where v1 wording differs.

## Requirements and measurable outcomes

| ID | Requirement / acceptance criterion |
|---|---|
| R-A01 | Personal connections for user, client, trainer and admin; effective tool access is the intersection of grant, current role, object access and feature eligibility |
| R-A02 | Hermes plus one independently implemented MCP client complete the same synthetic read/propose/revoke workflow |
| R-A03 | Local inference supports tested Hermes and OpenAI-compatible local runtimes; induced model failure makes zero cloud fallback calls |
| R-A04 | Agent output only creates a draft/proposal; an authorized human reviews the exact version before activation; replay causes no duplicate effect |
| R-A05 | Pseudonymous allowlisted context only; no names, contacts, raw notes, secrets or private operator memory; revoked access denies the next request |
| R-A06 | Pair, inspect capabilities, pause, revoke, re-pair and handle sleeping devices in the app; no inbound public port required |
| R-A07 | Consulting setup has an optional onboarding service and customer-owned credentials; support access is separate, scoped, time-limited and revocable |
| R-P01 | Chosen exercise count and rotation reach generation unchanged after validation; omitted values retain current behavior |
| R-P02 | Session length, equipment, schedule, goals, split, preferences, restrictions and programming controls persist and affect the plan; unsupported combinations return explicit violations |
| R-P03 | Ordered blocks and typed per-set prescriptions round-trip through save/load/PDF/logger without losing grouping, units, warmups or cooldowns |
| R-P04 | Exercise Rolodex keeps search, filters, Library/In plan, undo and Teach Mode; richer comparisons and substitutions preserve canonical exercise identity |
| R-P05 | Whole-program editing preserves unedited weeks; edits explain session time, planned volume and expected progression without inventing logged progress |
| R-P06 | Current, draft, backup, blended, template and archived plans remain distinguishable; existing revision conflicts/PDF invalidation remain enforced |
| R-P07 | Backup refresh previews differences and preserves a recoverable prior revision; promotion uses the existing transactional lifecycle |
| R-P08 | Blending explains source lineage and validates merged constraints before creating a new draft; originals are unchanged |
| R-P09 | Any client switch, timeout, duplicate request, cancellation or access change prevents cross-client results and silent overwrite |
| R-P10 | All modes work by keyboard and at 320/390/414/768/1024/1440/1920/2560/3840 CSS widths; 44px targets, 200% zoom and reduced motion |
| R-O01 | Feature-flag rollback, schema compatibility, isolated restore and privacy-safe diagnostics are proven before release |

## Scope and explicit non-goals

Included: product audit, source reconciliation, requirements, wireframes,
contracts, tests, diagram source and phased implementation instructions.
Excluded from this pass: application edits, production generation or saved-plan
changes, training real models, account/credential provisioning, purchases,
provider calls, deployment and paid external review.

No new medical diagnosis engine. Restrictions come from established Swan
assessment/safety policy and authorized professional input. Do not derive pain
clearance from an agent's recommendation or an exercise's marketing label.
No generic shell/SQL/browser automation tool in Swan's customer agent API.
No compulsory consulting purchase to connect a compatible personal agent.

## Readiness truth

Current-main focused baseline: **72 frontend + 60 backend tests PASS**.
Two new acceptance tests produce **EXPECTED RED** against the actual request
builder: an eight-exercise choice becomes six; conservative rotation becomes
standard. These are missing desired controls, not a claim that a present UI
already offers them. The older checkout's 43 passing tests are historical
context only. No application behavior was changed to turn RED green.

The packet is ready for design review only. The earlier proposed first implementation slice
described in 05 must incorporate the new C0 privacy prerequisite in 09. Integration, live writes, local-agent compatibility, egress
negative controls and production release are **NOT RUN**. Fable remains the
final decider/commit gate. Structural receipt validation cannot supply that review.

One dictated phrase, “Mighty Asheville,” has no verified component match. This
packet covers NASM/OPT and the visible Deep Research / Workout Swan Intelligence
entry point. It does not silently invent a component for that phrase.


## V2 evidence and preservation

The complete v1 packet (36 regular files) was copied and SHA256-verified before edits, with two sample restores. See evidence/preservation-v2.json. The canonical packet stays here; the original snapshot is .ai-workflow/vault/agent-ready-planner-v1-before-v2-20260907 under the repository root.

Fresh evidence: evidence/v2-preview-qa.json (eight synthetic workflows and twelve responsive widths), evidence/privacy-reproductions.json (five actual-source gaps reproduced with fake dependencies), and evidence/security/ (sealed security report). Prior 72 frontend + 60 backend PASS and two EXPECTED RED results are dated September 6 evidence, not fresh v2 app runs.

Open `interactive preview` (`wireframes.html` — not committed; machine-local evidence), `state wireframes` (`wireframe-states.html` — not committed; machine-local evidence), `rendered architecture` (`diagrams.html` — not committed; machine-local evidence), and `privacy decision` (`10-coach-privacy-audit.md` — not committed; machine-local evidence). No OpenRouter inference, real accounts, devices or customer data were used. Codex and Mobbin research usage occurred.

## Build workflow upgrade (v2.1)

[Per-slice subscription review workflow](11-build-workflow.md) governs future implementation. Blueprint/preview scope and privacy release gates remain unchanged.
