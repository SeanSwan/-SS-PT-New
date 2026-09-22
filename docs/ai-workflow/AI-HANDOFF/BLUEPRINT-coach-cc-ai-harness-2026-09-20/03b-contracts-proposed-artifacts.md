> **CALLER NOTE — not Astra's text.** This is the second half of a single 352-line document Astra
> emitted. The caller split it at the natural boundary: `03-contracts.md` covers contracts against the
> EXISTING surface; **this part covers PROPOSED new artifacts** —
> the Sequelize model, migration/retention, provider boundary, additional implementation
> interfaces, and environment/operations. No content was altered or dropped. Both parts remain
> **unreviewed by any seat** in their split form.

**Proposed Sequelize model**

This complete definition applies only if S0 approves replacement storage. It introduces no guessed relationship to existing user/domain tables.

```js
import { DataTypes } from 'sequelize';

export function defineCoachHarnessOperation(sequelize) {
  return sequelize.define('CoachHarnessOperation', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    actor_key: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    request_key: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    request_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    command: {
      type: DataTypes.STRING(96),
      allowNull: false,
    },
    registry_version: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    scope_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    request_ciphertext: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result_ciphertext: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    key_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    state: {
      type: DataTypes.ENUM(
        'PENDING', 'SUCCEEDED', 'CANCELLED', 'EXPIRED', 'INVALIDATED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    request_issued_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  }, {
    tableName: 'CoachHarnessOperations',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['actor_key', 'request_key'] },
      { fields: ['state', 'expires_at'] },
    ],
  });
}
```

Repository methods must provide timestamps from database time, implement version increments, and enforce transitions. The model alone does not enforce the execution protocol.

`actor_key` is a server-derived keyed digest of the authenticated identity, not a client field. Request hashes use a keyed digest over canonical normalized input. Request/result ciphertext uses the project’s reviewed authenticated-encryption adapter; a custom cryptographic implementation is forbidden.

Nullable ciphertext supports payload removal while retaining replay tombstones. Pending rows must always have request ciphertext; enforce that invariant in the migration and repository.

**Migration and retention**

- Additive migration only; no domain-table changes are authorized by this package alone.
- Migration must match the model, indexes, state values, and pending-payload constraint exactly.
- Keep encrypted terminal payloads for 24 hours; keep minimal operation tombstones for 30 days.
- Expire pending previews after five minutes; payload deletion must never convert pending operations into executable empty records.
- After payload removal, status may report completion without detailed result content. It cannot fabricate details.
- Retention does not delete business records or the existing required domain audit.
- Migration filename and registration follow the supplied repository convention. No convention is invented here.
- Rollback does not drop an operation table that contains records. Disable upgraded writes and retain the ledger for reconciliation.

**Provider boundary**

```ts
type ApprovedTemplate = {
  id: string;
  version: string; // content hash
  instructionText: string; // approved static text
  fields: Readonly<Record<string, {
    kind: 'enum' | 'integer' | 'number' | 'boolean';
    values?: readonly string[];
    minimum?: number;
    maximum?: number;
  }>>;
};

type ProviderEnvelope = {
  templateId: string;
  templateVersion: string;
  fields: Readonly<Record<string, string | number | boolean>>;
};

function admitProviderEnvelope(
  candidate: unknown,
  templates: ReadonlyMap<string, ApprovedTemplate>
): { ok: true; value: ProviderEnvelope }
 | { ok: false; code: 'unknown_template' | 'invalid_fields' };

function buildProviderMessages(
  admitted: ProviderEnvelope,
  templates: ReadonlyMap<string, ApprovedTemplate>
): readonly { role: 'system' | 'user'; content: string }[];
```

- Templates are server-owned, approved, versioned artifacts. Client-supplied templates are rejected.
- Unknown fields, arbitrary strings, non-finite numbers, and out-of-range values are rejected.
- String fields are finite enumerations from approved content.
- Raw messages, notes, client names, diagnoses, histories, route text, and retrieved documents are not interpolated.
- Approved Cortex notes are context, never executable tools or dispatcher arguments.
- Access restrictions and programming constraints are enforced by application logic before and after generation.
- `inputSanitizer`, `deIdentifier`, `phiScanner`, and `detectPii` remain defense-in-depth; their names do not establish admission.
- No admissible representation means local clarification or explicit unavailability, not automatic provider fallback.
- Real task templates and numeric bounds are not supplied in the packet. Production template enablement remains blocked until those approved artifacts are included.
- Classification, debate, plan generation, and other in-scope model callers must use this boundary or have a separately approved equivalent. No “internal AI call” exemption.

**Scope of the rules above — NEW templates only (round-4 R4-03).** These bullets govern the **proposed
`ProviderEnvelope` / `buildProviderMessages` artifacts**, i.e. *new* provider templates. They are
**stricter** than the boundary the existing paths run under, deliberately:

- **new templates** interpolate **no** free text — only finite enumerations from approved content, per the
  bullets above;
- the **existing** classification and chat paths **do** carry authored free text (`message`,
  `previousContext`), governed by `privacy-boundary@1.2.0` §6.1.

The two rules do not conflict once scoped — but an **unscoped** reading of this list ("raw messages are
never interpolated") appears to forbid exactly what §6.1 admits, and round-4 **R4-03** found that reading.
Where they could touch, the stricter rule wins for new artifacts, and §6.1 governs the existing channels.

**Pinned contract.** This package consumes **`privacy-boundary@1.2.0`**
(`BLUEPRINT-swan-coach-live-2026-09-20/03b-privacy-boundary.md`). See `03-contracts.md` for the reciprocal
pin, the binding requirement (**H06**), and the change rule. This file does not restate it.

**Additional implementation interfaces**

```ts
function reduceHarnessOutcome(
  outcome: unknown
): {
  view: 'answer' | 'review' | 'unavailable' | 'unknown' | 'handoff' | 'job';
  allowChatFallback: boolean;
  operationId?: string;
};

function createOperationService(deps: OperationDependencies): {
  preview(input: AuthorizedPreviewInput): Promise<OperationView>;
  confirm(actor: VerifiedActor, operationId: string): Promise<OperationView>;
  cancel(actor: VerifiedActor, operationId: string): Promise<OperationView>;
  get(actor: VerifiedActor, operationId: string): Promise<OperationView>;
  getByRequest(actor: VerifiedActor, requestKey: string): Promise<OperationView>;
};
```

`OperationDependencies`, `VerifiedActor`, and the domain adapter types must be completed from S0’s actual auth/database interfaces. They are not left to builder invention.

**Environment and operations**

Preserve `AI_COMMANDS_ENABLED` and `AI_COMMAND_WRITES_ENABLED`: only the exact disabling string documented in the packet disables them. Do not silently reverse their default-enabled behavior.

New encryption/digest configuration must use the existing approved secret-management adapter. The packet supplies no such configuration names; S0 must provide them. Missing cryptographic readiness blocks upgraded writes at startup without changing existing switch semantics.

Logs contain request/operation identifiers, command, state, error code, policy version, and duration. Do not log raw messages, decrypted parameters, provider bodies, names, or access tokens.
