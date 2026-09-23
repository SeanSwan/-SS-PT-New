**C1 — CLI contract**

Proposed interface:

```text
node scripts/village/run.mjs prepare --mode 1|2 --manifest <path> --roster <path> --budget <path> --run-dir <path> [--rounds 1..7] [--profile subscription|special]
node scripts/village/run.mjs dispatch --run-dir <path> --approve-stage <sha256>
node scripts/village/run.mjs status --run-dir <path>
node scripts/village/run.mjs cancel --run-dir <path>
```

Rules:

- `--manifest`, `--roster`, `--budget`, and `--run-dir` are required for `prepare`.
- Profile defaults to `subscription`.
- Mode 1 has one review round; supplying `--rounds` is rejected.
- Mode 2 defaults to at most three review rounds; allowed range is 1–7.
- Reviewers are explicitly selected; supported count is 1–4.
- No default roster is fabricated.
- The adjudicator route is separately selected and cannot also occupy a reviewer seat in the same run.
- `dispatch` authorizes only the displayed frozen stage. It may prepare the next stage, but must stop before sending it.
- The operator action must come from the authenticated host workflow or the operator’s terminal. An agent must not generate its own approval.
- A digest proves content binding, not the identity of the approving human.

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Requested local operation succeeded. A report or prepared stage may still be pending. |
| `2` | Policy, privacy, route, budget, or approval blocked the operation. |
| `3` | Provider execution failed, became ambiguous, or returned incomplete output. |
| `4` | CLI/schema usage error. |
| `5` | Journal, integrity, or internal invariant failure. |

**C2 — Artifact manifest**

Strict JSON, recursively rejecting unknown keys:

```ts
type ArtifactKind =
  | 'source_excerpt'
  | 'schema_excerpt'
  | 'design_document'
  | 'synthetic_fixture';

type SourceClass = 'repository' | 'authored_synthetic';

type Artifact = {
  id: string;
  kind: ArtifactKind;
  sourceClass: SourceClass;
  text: string;
  sha256: string;
};

type Applicability = {
  area: number; // integer 1..10, exactly once each
  status: 'applicable' | 'not_applicable';
  reason: string;
};

type Manifest = {
  schemaVersion: 1;
  subject: string;
  artifacts: Artifact[];
  applicability: Applicability[];
};
```

Validation:

- IDs match `^[a-z][a-z0-9_-]{0,47}$` and are unique.
- Hashes are lowercase SHA-256 over UTF-8 `text`.
- Text uses LF line endings; reject CR rather than silently changing approved bytes.
- At least one artifact and one applicable area are required.
- Maximum 64 artifacts.
- Maximum 1 MiB UTF-8 per artifact; maximum 4 MiB total.
- Maximum subject length: 200 characters.
- Applicability reasons: 1–2,000 characters.
- A synthetic fixture must use `authored_synthetic`.
- Production-derived and unknown source classes are rejected.
- File paths, database connections, attachments, and arbitrary extra fields are not manifest inputs.
- Source provenance is reviewed locally; a caller-supplied label alone does not prove it.

The assembler keeps any local file-location mapping separately. Outbound citations use artifact IDs and excerpt-relative line numbers.

This schema limits structure. Its `text` field still requires local content review.

**C3 — Privacy ownership and hardening decisions**

| Proposal | Decision |
|---|---|
| H1 | Adopt structural admission and prohibition of production-derived material; remove infallibility claim. |
| H2 | Require locally authored synthetic fixtures with documented provenance. |
| H3 | Reject unknown fields; never strip and continue. |
| H4 | Do not query a client database or export a name roster in this build. A future local-only denylist needs separate ownership and retention design. |
| H5 | Clinical-shape detection may be added only with explicit detector definitions and fixtures. No unspecified PHI detector is claimed here. |
| H6 | Do not implement an undefined “person-name density” detector. Its thresholds and false-positive behavior are absent from the packet. |
| H7 | Add structural rejection and zero-dispatch canaries. Preserve existing detector canaries without expanding their claims. |

The Village admission owner handles source classification and approved content. The dispatcher owns enforcement at its supported transport boundary. Product privacy services retain their existing, separate product policy.

**C4 — Provider admission**

The operator chooses route IDs from an implementation-controlled registry. User input cannot supply arbitrary endpoints, shell commands, executable paths, or provider credentials.

For every selected route, the verifier must establish:

- Requested model and supported effort.
- Actual transport and authentication mode.
- Incremental billing classification.
- Permission for the intended automated use.
- Available entitlement and known expiration, if any.
- Outbound-context isolation.
- Input/output limits and a conservative input-token bound.
- Receipt support for served identity and usage.
- Evidence provenance, digest, verification time, and expiration.

A roster’s editable `verified: true` field is not accepted as evidence.

Evidence must remain valid through the stage’s maximum execution window and be checked immediately before each call. No proof may be reused for more than 24 hours without revalidation. An unknown promotional expiration prevents selecting that promotional route.

Policy:

- Astra’s requested adjudicator identity is `gpt-6-astra`, effort `xhigh`.
- `gpt-6-astra-pro` is not substituted.
- Kimi is prohibited by provider/model-family identity, including known aliases; unknown identities are rejected.
- GLM subscription routes must be direct Z.ai routes.
- A Google consumer subscription is not treated as proof that a Gemini API call is included.
- Fable is unavailable in the subscription profile.
- WorkBuddy routes require demonstrated automation, entitlement, and expiration evidence.
- No automatic fallback exists.
- Served-model mismatch or unavailable identity evidence makes the result inadmissible.

**C5 — Freezing and approval**

A stage contains:

```ts
type FrozenStage = {
  schemaVersion: 1;
  runId: string;
  stageId: string;
  stageKind: 'review' | 'adjudication';
  round: number;
  manifestDigest: string;
  rosterDigest: string;
  policyDigest: string;
  budgetDigest: string;
  requestDigests: string[];
  expiresAt: string;
  stageDigest: string;
};
```

Procedure:

1. Build complete requests, including all instructions and peer material.
2. Apply local privacy transformations.
3. Validate content, limits, and evidence.
4. Serialize application bodies deterministically.
5. Freeze the exact per-request content and stage metadata.
6. Display preflight.
7. Obtain stage-specific authorization.
8. Immediately before sending, revalidate authorization, route evidence, and bytes.

For HTTP, the send callback checks the actual post-`fetchForEgress` body digest. A mismatch causes zero socket calls.

For CLI subscriptions, approval binds the application text. The adapter’s separately verified isolation contract accounts for any CLI-managed wrapper content. If that boundary cannot be demonstrated, the adapter remains blocked.

Approval expires after 60 minutes or earlier when any underlying evidence expires. Changed content requires a new stage digest and authorization.


---

> **CONTINUED in `03-contracts-b.md`** (C6–C10). This file was split at the C6 seam on 2026-09-22 to satisfy Rule 4 (300-line cap); the original `03-contracts.md` was 419 lines.
