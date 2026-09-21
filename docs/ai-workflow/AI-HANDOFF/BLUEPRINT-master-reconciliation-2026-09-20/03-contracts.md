**Manual workflow amendment**

Replace the actual canonical mandate’s installed-mechanism claim with the following text, retaining the prior text in a verified historical snapshot:

> This repository currently uses the manual Mega Blueprint admission protocol defined by `MASTER-RECONCILIATION-20260920`. No `scripts/workflow.mjs`, `scripts/workflow-policy.mjs` or `scripts/workflow-hook.mjs` enforcement is claimed.  
>  
> An integration owner freezes an isolated committed revision, records the applicable review policy, verifies source identity, obtains the required reviews in order, records archive receipts and obtains the existing final authority’s admission. Changes to reviewed source or review policy require a new revision.  
>  
> The protocol detects drift at checkpoints; it does not prevent concurrent filesystem writes. Native enrollment and write-blocking status are `NOT INSTALLED` unless separately implemented and demonstrated.

**[UNKNOWN]** The canonical mandate’s full repository path is absent from the packet. The operator must resolve the existing unique file and record its path. Creating a second file with the same basename is forbidden.

**Package registry**

New supporting file:

`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-master-reconciliation-2026-09-20/package-registry.json`

Schema:

```ts
type PackageRegistry = {
  schemaVersion: 1;
  masterPackagePath: string; // Repository-relative; forward slashes.
  lanes: Array<{
    id: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8";
    canonicalPackagePath: string;
    aliases: string[];
    authorities: Array<{
      path: string;
      scope: string;
      precedence: number; // Unique within this lane; lower wins.
    }>;
    documents: Array<{
      path: string;
      status: "ACTIVE" | "HISTORICAL" | "REJECTED";
      supersededBy: string | null;
      permittedUse: string;
    }>;
  }>;
};
```

Rules:

1. Exactly eight lane IDs and one master path.
2. Canonical paths are those in `00-README.md`.
3. Aliases resolve directly to one canonical package; no alias chains or case-insensitive collisions.
4. L2’s `BLUEPRINT-coach-ai-harness-20260920/` location is an alias.
5. L4’s `BLUEPRINT-studio-spotlight-completion-2026-09-19/` location is an alias.
6. L6’s rejected August merge document is a **rejected document**, not an alias to active architecture.
7. Authorities must be actual, bound document paths. Missing full authority evidence blocks the affected lane.
8. Preserve historical documents. Correct current routing and future references; do not rewrite historical quotations to make old paths disappear.
9. File existence alone cannot establish authority or precedence.

**Source selection and ownership**

- Resolve the packet’s abbreviated commits to full commit IDs before use.
- Treat `382427ae6` as the inherited comparison point, not a certified integration base.
- Before building, the integration owner selects the exact intended integration base after comparing relevant candidates and preserving user-owned work.
- Use an isolated integration branch named `blueprint/master-reconciliation-20260920`; if it already exists, inspect and resume or choose a documented suffix. Never replace it blindly.
- Each lane starts from the latest admitted integration revision.
- One owner serializes integration. Concurrent independent planning is allowed; competing writes to the same source are not.
- Never bulk-import the reported 1,235 dirty files. Each imported change needs ownership, scope and provenance.
- Full reviewed source remains in its isolated checkout. An external review packet may contain a smaller authorized scope; that review must identify what it did not cover.

**Revision identity**

Supporting records live outside the frozen checkout, under a caller-selected local evidence directory. Each revision receives a new directory; prior records remain preserved.

```ts
type ArtifactRef = { path: string; sha256: string };

type FileRecord = {
  path: string;       // Relative, forward slashes, no traversal.
  sha256: string;     // SHA-256 of raw bytes.
  mode: string;       // Git mode for tracked source.
};

type Snapshot = {
  schemaVersion: 1;
  taskId: string;
  revision: string;
  git: {
    root: string;    // Absolute isolated-checkout path.
    commit: string;  // Full Git object ID.
    tree: string;    // Full Git tree ID.
  };
  registryPath: string;
  files: FileRecord[]; // Every tracked file, unique and sorted by path.
  requiredTestIds: string[];
  reviewPolicy: {
    policyId: string;
    authorityRefs: string[];
    orderedSeats: string[];
    finalAuthority: string; // Must equal the last required seat.
    budgetRecord: ArtifactRef;
  };
  preservation: Array<{
    sourceId: string;
    inventory: ArtifactRef; // JSON array of {path, sha256}.
    storageAttestation: ArtifactRef;
    copies: Array<{ root: string; storageId: string }>;
  }>;
};
```

`snapshot.json` is serialized once. Its SHA-256 hashes its exact raw bytes. It contains no self-hash, review result or later test output.

```ts
type Receipt = {
  snapshot: ArtifactRef;
  tests: Array<{
    id: string;
    command: string;
    exitCode: number;
    outcome: "PASS" | "FAIL" | "BLOCKED" | "NOT RUN";
    snapshotSha256: string;
    output: ArtifactRef;
  }>;
  reviews: Array<{
    seat: string;
    reviewId: string;
    archive: ArtifactRef;
    snapshotSha256: string;
    decision: "APPROVE" | "REVISE" | "REJECT" | "UNKNOWN";
    terminalEvidence: ArtifactRef;
    identityEvidence: ArtifactRef;
  }>;
  unresolvedFindings: string[];
  admission: {
    decision: "ADMIT" | "BLOCK";
    by: string;
    snapshotSha256: string;
    attestation: ArtifactRef;
  } | null;
};
```

The required test list excludes the evidence-integrity suite itself, avoiding a receipt that must contain its own unfinished result. Its output is attached after execution.

A receipt’s assertions are not self-authenticating. The final authority checks the linked underlying evidence.

**Preservation contract**

1. Capture the reported original L6 directory, the registered salvage worktree, and relevant root-scope candidates separately where present.
2. Preserve both named scopes: `scripts/swan-brain-console/` and `frontend/src/pages/HomePage/three-worlds/`.
3. Treat the reported 77 files as a reconciliation clue, not a count to manufacture.
4. Provisional rescue may proceed before quiescence. It must remain labeled unverified.
5. Stable preservation requires source-owner quiescence, exact inventories and reconciliation of missing/conflicting versions.
6. Keep two verified copies outside the source worktrees on independently attested storage failure domains. Different directories alone do not satisfy this.
7. Select local, non-public destinations. Do not upload raw source as an implicit backup.
8. Record metadata for links or special files without dereferencing them during rescue. They require explicit resolution before regular-file admission tests.
9. Source disappearance or an unexplained inventory difference blocks S0 exit. Preserve available copies while resolving it.

**Review and archive contract**

- This master pass is planning adjudication, not a replacement for any lane’s implementation review.
- Resolve the exact applicable lane policy from existing scoped instructions and explicit overrides. Record ordered seats, final authority, historical counters and remaining authorization.
- Ambiguous authority, unknown terminal execution, unavailable required identity or exhausted authorization blocks the affected review.
- Do not reset budgets or invoke a paid fallback.
- Each new review body includes this exact binding line:

```text
Snapshot-SHA256: <64 lowercase hexadecimal characters>
```

- Use the existing archive header schema. Keep `unproven` explicit.
- The caller records actual archive paths, IDs and hashes after filing and indexing.
- A later review supersedes an earlier review only when it actually replaces the same review scope. Master reconciliation does not supersede L4 or L6 correctness reviews.
- Preserve findings and verdicts. Only the mandated reciprocal supersession link may update an older filed review.

**Shared runtime boundary contracts**

| Boundary | Decision |
|---|---|
| Capability | L1’s existing provider remains authoritative for its capability vocabulary and hooks. A second detector is forbidden. |
| Theme | L8 remains owner of its existing theme-selection contract. This master creates no new theme store or token vocabulary. |
| Capability × theme | If callers overlap, record exact reads/writes and initialization order before either overlapping slice is admitted. |
| Knowledge × actions | L3 approval/provenance and L2 action authorization remain distinct. Knowledge approval never grants mutation permission. |
| Console × public UI | L6 operator previews/assets do not enter public runtime without an explicit consumer receipt and lane review. |
| Web × mobile API | L7 consumes the bound existing contract. Backend changes require separate scope authority and consumer verification. |

**Migrations, environment and rollback**

- Application database migration: **N/A — none introduced by the master.**
- Application environment variables: **N/A — none introduced.**
- Test-only environment variable: `BLUEPRINT_RECEIPT`, an absolute local receipt path; never a secret.
- Workflow migration: preserve old instructions and counters; amend the actual authority; create new registry/evidence records; retain previous review state.
- Master tooling rollback: revert its isolated commit and leave all preserved artifacts and review history intact.
- Lane rollback: revert the lane’s integration commits, then rerun affected integration checks.
- Database-changing lanes must supply their own tested migration, restore and rollback plans before admission.
- No master rollback permits deletion of preservation copies or review records.
