# Personal-agent architecture and boundary contracts

Artifact: SWAN-AGENT-CONTRACTS · v2.0 · 2026-09-06 · Owner: Sean
Status: proposed; all new endpoints, tables and connection controls below are unbuilt.
Authority: [packet index](README.md); preserves existing Coach and Workout OS writers.

## Architecture decision

Treat Swan as a domain application that agents can use. Use MCP as an adapter to
explicit tools; expose versioned REST/JSON contracts underneath so the domain
model does not depend on one agent product. A local model endpoint is not itself
an agent: it needs a tool loop, validation and a connection to Swan. Hermes can
provide that loop. A later Swan companion can provide the in-app/local-device
experience without turning Render into a proxy to arbitrary localhost URLs.

| Responsibility | Owner / integration point |
|---|---|
| Human identity | Existing Swan authentication; user signs in on Swan's consent page |
| Delegated authorization | New `backend/services/agentConnect/agentGrantService.mjs`; grant, expiry, current-role and object-access intersection |
| OAuth/resource boundary | New gateway resource server and audited authorization implementation; no copied application bearer tokens |
| Tool schemas and dispatch | New `agentCapabilityRegistry.mjs`, with versioned allowlisted functions and bounded outputs |
| Training reads | Adapters to current exercise contract, plan read model and authorized workout/progress readers |
| Draft proposals | Reuse integrated Coach proposal/intent infrastructure; plan actions get dedicated plan handlers, not workout-log handlers |
| Plan mutations | Existing `workoutPlanMutationService.mjs` and `workoutPlanLifecycleService.mjs` |
| Logged workout writes | Existing canonical workout writer + Coach intent/read-back path after the owned worktree lands |
| UI state | Existing Planner Data/UI/Actions/Voice providers; one draft and target identity per task |
| Local execution | User's Hermes or companion; model credentials and local files remain on that device |
| Connection UI | Proposed shared `My agents` settings view and a small Planner agent selector; Coach dock remains the interaction surface |

Do not expose Express internals, generic CRUD, raw SQL, shell execution, arbitrary
URLs, client roster dumps, finance, payments, private Hermes Wiki or infrastructure.
The current `/api/hermes` queue is an operator/staff integration input, not the
new customer device broker. Preserve its separate permissions and namespace.

## Two transports, one authorization model

**A — External agent → Swan (first delivery).** User adds Swan's remote MCP URL
to Hermes. Swan consent issues a short-lived audience-bound token. Hermes makes
outbound HTTPS requests to Swan. The model can run locally; Swan never needs to
reach the user's computer. Connect/read/propose/revoke are sufficient for v1.

**B — Swan UI → local agent (second delivery).** User installs or uses a supported
companion integration. Pair in a browser using a one-use challenge, device public
key, human-readable device name and short expiry. Device opens an outbound
authenticated channel. Swan posts a bounded typed job; the device runs the
approved local route and returns a candidate. No public inbound listener or
router port-forward. Render wake/restart, mobile browser backgrounding and laptop
sleep are normal states. An offline device never means a cloud fallback.

The first bridge carries only allowlisted minimized context. Do not call it
end-to-end encrypted: Swan already holds that selected application data. A later
encrypted user-private chat relay is a separate audited design; it cannot exempt
submitted plans from Swan's validation. No desktop filesystem/memory sync in v1.

**C — Optional hosted BYOK (later).** Provider-specific audited adapters and
server-side encrypted credential storage, explicit usage caps, delete/revoke.
No arbitrary base URL accepted by Swan's backend. This is independent of A/B and
does not block a local-first launch. User subscriptions are not automatically
API entitlements; connection setup must not promise that they are interchangeable.

## Permission matrix (effective access is always re-evaluated)

| Capability | General user | Client | Trainer | Admin |
|---|---|---|---|---|
| Manage own agent connections | own | own | own | own |
| Exercise discovery | entitled catalog | entitled catalog | entitled catalog | entitled catalog |
| Training context | own eligible training record only | own eligible fields | explicitly assigned/authorized clients | explicitly selected authorized record |
| Create self workout proposal | only if eligible record and existing feature grant | existing self-generation flag required | own/assigned target under policy | selected target under policy |
| Change trainer-managed plan | request/review flow only | request/review flow only | explicit permitted assignment | explicit permitted assignment |
| Activate plan | no new grant from connecting agent | no new grant from connecting agent | human approval through current lifecycle | human approval through current lifecycle |
| Log workout | later, current own-record rules | later, current own-record rules | later, assigned-client rules | later, selected-target rules |
| Read someone else's personal agent memory | denied | denied | denied | denied |
| Finance/security/admin tools | excluded | excluded | excluded | excluded from customer harness |

An administrator's position does not grant the personal agent all administrator
capabilities. Trainer reassignment, role downgrade, account disable, scope change
and revoke invalidate access on the next request and again before a write commits.
No role is taken from a request body. Grant IDs are server-issued opaque handles.

## Proposed HTTP and MCP surface

| Endpoint / tool | Input | Output / effects |
|---|---|---|
| `GET /api/agent-connect/capabilities` | authenticated human | eligible capability catalog; no private client records |
| `GET /api/agent-connect/connections` | authenticated human | own connection labels, grants, last activity, device state |
| `POST /api/agent-connect/connections/:id/revoke` | CSRF-protected human action | revoke grant and refresh family; stop queued jobs; preserve minimal audit |
| OAuth discovery / consent / token | auth code + PKCE; exact redirect; resource audience | mature standards implementation, no homegrown crypto or implicit grant |
| `POST /api/agent-gateway/mcp` | negotiated MCP version + audience-bound access token | Streamable HTTP adapter; unauthorized callers get OAuth challenge |
| `swan.exercise.search.v1` | query ≤120 chars, filters, cursor, limit ≤50 | canonical exercise IDs and licensed/authorized metadata |
| `swan.training.context.v1` | opaque target reference, allowed field groups, time window | sanitized typed context, freshness and version token |
| `swan.plan.read.v1` | plan ID + target reference | authorized plan revision, normalized prescription and field provenance |
| `swan.plan.propose.v1` | context token, expected revision, request ID, bounded typed draft/change set | persisted proposal ID, violations, review URL; zero activation |
| `swan.proposal.status.v1` | proposal ID | authorized lifecycle/receipt; not private human discussion |
| `POST /api/agent-connect/device-pairings` | human/device handshake | one-use challenge, expiry and device fingerprint; no token in URL |
| `POST /api/agent-connect/jobs` | authorized UI task + selected connected device | bounded job identity; no automatic execution without active grant |

No `approve`/`activate` tool in first release. The authenticated human reviews in
Swan. Existing Coach confirmation semantics are reused only after their exact
payload binding, actor, target, expiry and policy checks are verified. Adding a
chat sentence saying “approved” is never sufficient authority.

Use MCP 2025-11-25 as the researched compatibility baseline; negotiate supported
versions, and freeze the exact SDK/client versions at implementation. Require
OAuth discovery, audience validation, PKCE S256, exact redirects and safe token
handling. Do not pass tokens downstream. Begin with approved/pre-registered
clients; defer arbitrary dynamic metadata fetches until SSRF protections are
proven. [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

## Proposal envelope (illustrative JSON contract, not current API)

```json
{
  "schemaVersion": 1,
  "requestId": "synthetic-uuid",
  "targetRef": "opaque-grant-target",
  "contextToken": "opaque-server-snapshot-reference",
  "action": "plan.replaceDraft",
  "expectedRevision": 7,
  "planId": "synthetic-plan-uuid",
  "constraintsVersion": 1,
  "candidate": { "weeks": [], "programming": {}, "provenance": {} }
}
```

The server binds contextToken to user, grant, target, eligible fields, source
revision and expiry. Client-supplied provenance is labeled claimed until verified.
For a new plan, expectedRevision is null and a distinct create action is used.
The candidate must pass a strict schema before review: unknown fields rejected,
IDs resolved against the canonical library, finite numbers and explicit units,
bounded text and array lengths, allowed prescriptions, current safety policy.
No URL, markdown or exercise note can become a tool instruction.

Proposed limits: 256 KiB request; 52 weeks; 7 days/week; 30 exercises/session;
20 prescribed sets/exercise; text notes ≤500 characters; result pages ≤50 rows.
These are engineering limits, not suggested training volumes. Oversize → 413;
invalid fields → 422 with field paths; absent/expired token → 401; forbidden →
403; stale context/revision → 409; rate limit → 429 + Retry-After; unavailable
device → explicit offline state. No silent truncation of a program to fit a model.

Idempotency key: (grant ID, action version, requestId), bound to canonical payload
hash. Same key/body returns the same proposal; same key/different body returns
409. Human approval binds the exact proposal revision/hash. Durable transaction
updates proposal and plan together, or records a recoverable reconciliation
state. A lost response triggers status lookup, never an automatic second write.
Revoke/cancel is checked under the same relevant locks before commit; a completed
commit cannot be undone by calling cancel. Restore creates a new revision.

## Data model extension

Reuse `Users`, `WorkoutPlan` (including existing contentRevision/contentHash),
and integrated Coach proposal/intent records. Add only missing records:

- AgentConnection: UUID, ownerUserId, client registration, label, kind, status,
  created/revoked timestamps; no general-purpose provider credential blob.
- AgentGrant: connectionId, scoped capability list, target binding, policy
  version, expiry, revocation epoch. Token/refresh material hashed/encrypted by
  the authorization component and stored separately with key rotation.
- AgentDevice: owner/connection, public key, installation version, heartbeat,
  declared capabilities; online/unknown/offline computed from bounded freshness.
- AgentJob: grant/task/target, request hash, lease/version, expiry, state and
  result proposal reference. Raw freeform content excluded from logs.
- PlanRevisionSnapshot: plan UUID, immutable revision, prescription hash,
  encrypted snapshot/reference, author type, source references and timestamp.
  Existing revision counters are reused; this adds recoverable historical bodies.

Tenant isolation uses the application's actual user/assignment authority. The
audit did not prove an existing tenantId column; do not invent one in queries.
Any future tenant model needs a separate verified migration and permission plan.

## Privacy and local truth

Names stay in Swan's UI. Do not send contacts, freeform assessment notes,
photos/audio, precise location, private staff notes or secrets to an agent.
Context uses connection-scoped references and allowlisted training fields. Even
pseudonymous workout/restriction data remains sensitive; minimize it, show the
field groups being shared, and exclude it from telemetry. Existing privacy policy
has no automatic exception for a model merely described as local.

Managed local profile: pin main model, embeddings, speech, compression and
fallback settings; default nonessential network tools off; opt-in downloads are
separate from inference. Fail the local-only conformance test if a denied
destination receives any synthetic canary. Local provider death, timeout and
malformed tool output must fail closed. Arbitrary external agents are labeled
**User-managed privacy: Swan cannot verify downstream routing**.

Default proposals for operational policy: 5-minute access tokens; 30-day maximum
refresh family with rotation/reuse detection; jobs expire in 10 minutes; unapproved
draft proposals in 7 days; minimal audit in 90 days; no raw prompts in metrics.
These retention and identity-provider choices require Sean's approval before
the authentication/storage slice. Account deletion and consent revocation must
also cover device caches and encrypted draft retention. No claim of deletion
from an independently operated external agent's memory.

## Reference comparison and consulting fit

Hermes Desktop shares its agent core/settings across its interfaces and puts
conversation beside outputs. Its MCP support connects external tools. Its local
model support allows local execution. Borrow these principles; don't copy its
OS terminal/git permissions into a fitness SaaS.
[Hermes Desktop](https://hermes-agent.nousresearch.com/docs/user-guide/desktop),
[MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp),
[Local Models](https://hermes-agent.nousresearch.com/docs/user-guide/local-models).

LM Studio documents local serving and MCP/tool filtering, making it a useful
second compatibility target, not evidence that every model can reliably call
tools. Adapter admission requires synthetic schema/permission/error tests.
[LM Studio developer documentation](https://lmstudio.ai/docs/developer),
[MCP via API](https://lmstudio.ai/docs/developer/core/mcp).

Offer optional setup packages: local installation, model/tool compatibility
check, Swan connection, data-flow explanation, recovery drill and owner handoff.
Customer owns the machine, accounts and credentials. A consultant never retains
a master token. Separate, expiring supervised support grants need visible consent
and audit. Measure successful local setup and retained use before inventing
pricing tiers, charging usage credits or promising a marketplace.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.
