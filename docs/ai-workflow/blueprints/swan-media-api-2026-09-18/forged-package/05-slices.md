**Slice 1 — Local over-wire vertical slice**

> ### AMENDMENT 1 — the model named in 1C, and what counts as its evidence
>
> **Status: PROPOSED 2026-09-22. Not in force until the operator approves it.** Until then the
> original text below governs and Slice 1 is incomplete.
>
> **What this amends.** `1C` names the **Wan** profile. A real GPU run has since been recorded, but
> it used the **measured H3 text-to-video profile**, not Wan. The forged contract and the README's
> narrative therefore reached opposite conclusions about one requirement — the README calling
> Slice 1's exit gate MET, this contract requiring Wan. Neither clause said which governed, and the
> defect was that the question was never asked rather than answered wrongly.
>
> **Amendment, per Astra's recommendation of 2026-09-21:**
>
> 1. **The recorded H3 run is preserved as MET for the demonstration it is** — one authorized local
>    render through the lane's own adapter, on a prompt read back out of ComfyUI's own history. It
>    is not relabelled as evidence of HTTP, restart-reconciliation or resource-ownership tests that
>    were not performed on it.
> 2. **The measured H3 text-to-video profile replaces Wan** as the profile 1C requires.
> 3. **Every other 1C requirement is retained unchanged** — full quote, admission, real graph
>    execution, restart reconciliation, a verified artifact served through HTTP, explicit operator
>    authorization, known resource authority, synthetic/nonpersonal input, zero hosted egress, and
>    recorded graph/checkpoint identity.
> 4. Requiring a second model purely to honour old prose adds cost and proves nothing; the run's
>    value is in the injection proof and the HTTP/restart path, not the brand of graph.
>
> **Why this is an amendment and not an edit.** The contract is the baseline the lane agreed to be
> judged against. Changing it by silence — which is what the README's "MET" already did — is the
> defect class this lane has spent 28 rounds hunting. An amendment that says *"this clause is
> replaced, here is who approved it, here is the date"* leaves the original text readable and the
> change attributable.
>
> **Consequence for the STOP clause below.** While this amendment is PROPOSED, the STOP clause
> stands: Slice 1 is incomplete and Slice 2 must not start. On approval, the STOP clause is
> satisfied only by the retained requirements in item 3 — **not** by the H3 render alone.

Sub-slices preserve the original live exit:

- **1A: Offline contract and truth repairs.** Strict schemas, literal loopback, per-principal authority, honest readiness, profile inspection, corrected receipts.
- **1B: Minimum durable execution.** Journal, atomic admission, lifecycle adapter, existing resource lease integration, artifact ownership, recovery.
- **1C: Authorized real Wan demonstration.** Full quote → admission → actual graph execution → restart reconciliation → verified artifact served through HTTP.

Acceptance:

```text
node --test media-api/tests/api-contract.test.mjs
node --test media-api/tests/readiness.test.mjs
node --test media-api/tests/auth.test.mjs
node --test media-api/tests/admission.test.mjs
node --test media-api/tests/recovery.test.mjs
node --test media-api/tests/artifacts.test.mjs
```

These suites are specified in `09-tests.md` and are **TO IMPLEMENT**, not existing evidence.

Slice 1C requires explicit operator authorization, the actual audited Wan profile, known resource authority, synthetic/nonpersonal input, zero hosted egress, and recorded graph/checkpoint identity. Test the real gateway entry point, not only `buildServer()`.

**STOP:** Slice 1 remains incomplete until API-002, JOB-002 and GPU-001 have real authorized evidence. No ComfyUI start or provider enablement is authorized by this document.

**Slice 2 — Admission and crash hardening**

Entry: full Slice 1 checkpoint.

Scope: every write boundary, concurrency, cross-midnight exposure, clock rollback, corruption, ownership, cancellation races, artifact retention and rollback.

Acceptance:

```text
node --test media-api/tests/store-crash.test.mjs
node --test media-api/tests/accounting.test.mjs
node --test media-api/tests/cancellation.test.mjs
node --test media-api/tests/migration.test.mjs
```

Required evidence includes a Windows process-termination drill. In-memory exceptions alone do not prove filesystem recovery.

**STOP:** No advancement with uncertain lease ownership, lost admission records, or failed reservation recovery.

**Slice 3 — Hosted contract, offline only**

Entry: Slice 2 checkpoint and retrieved, archived model-specific contract evidence.

Scope: disabled catalogue data; exact schema validation; maximum-charge arithmetic; hosted lifecycle fixtures; refunds; redaction; destination policy.

Acceptance:

```text
node --test media-api/tests/hosted-contract.test.mjs
node --test media-api/tests/hosted-lifecycle.test.mjs
node --test media-api/tests/download-policy.test.mjs
```

A partial research result cannot be labeled “mostly done.” Missing model path, licence, charge bound, or accounting source blocks the route.

**STOP:** No real Higgsfield requests, credentials, enabled rows, or invented endpoint/CDN values.

**Slice 4 — Optional owner-authorized hosted verification**

Entry: separate explicit spending approval, securely provisioned credentials, all eight hosted gates, exact request hash, one-call cap, funding cap, no automatic top-up, and no automatic retry.

Exit: one approved execution with retained artifact and independently labeled accounting evidence.

**STOP:** Not authorized. No executable live command is issued here.

**Slice 5 — Explicit routing and operations**

Entry: proven route-specific contracts. A disabled hosted route does not become eligible through a family alias.

Scope: one-target routing profiles, recovery procedures, restore/retention verification and caller-scoped wallet operation.

Acceptance:

```text
node --test media-api/tests/routing.test.mjs
node --test media-api/tests/operations.test.mjs
```

**STOP:** No silent fallback, MiniSwan generation registration, or invented performance promise.
