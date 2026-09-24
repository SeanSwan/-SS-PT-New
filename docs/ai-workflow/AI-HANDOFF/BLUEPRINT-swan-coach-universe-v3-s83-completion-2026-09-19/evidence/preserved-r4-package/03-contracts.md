# Contracts, storage, isolation and rollback

## C0 source supplement: exact missing inputs

The workspace operator supplies these bounded excerpts and receipts. The context-free builder does not search for substitutes.

| Input | Required content |
|---|---|
| G0-MOUNT | Actual route registration and mounted JSX for Coach, Settings and Logger; applicable backend `app.use`/router entries in order; exact frontend API string literals |
| G0-ADOPT | Full `CreatedThreadAdoptionArgs`, `PublicationSnapshot`, `PublicationBinding`; adoption hook; composing hook/controller call sites; route/active-thread setters; transport timeout and follow-on-send logic |
| G0-MEMORY | Full memory route handlers, service signatures, validation and HTTP error/response envelopes; shared normalization and invalidation behavior |
| G0-CONSENT | Dedicated read/write routes, shared update helper, both controller writers, real `Users` preference attribute definition |
| G0-DB | Test helper, loader, both `.postgres.test.mjs` files, integration config, matrix runner CLI/config, migration config |
| G0-TEST | Package scripts and test discovery for frontend/backend, native runner suites, Playwright configs, tsconfig and scoped config |
| G0-SCHEMA | Orientation model/baseline creator; other repaired migration bodies; canonical parent definitions; authorized schema evidence without private row data |
| G0-OWNER | Current lane digest, exact owned paths, current HEAD, dirty-path inventory and hashes of target files |
| G0-RELEASE | Applicable unresolved release-gate ledger, exact Final Decider seat/identity and existing entitlement route |

Missing inputs block dependent edits. They do not authorize plausible guesses.

## Existing public selection interfaces

Preserve these supplied signatures:

```ts
type CoachCreatedThreadAdoptionSettler =
  (args: CreatedThreadAdoptionArgs) => Promise<boolean>;

type CoachSelectionAdapterParams = {
  actorId?: string | number | null;
  rawRole?: string | null;
  audienceRole?: string | null;
  observation?: {
    pathname: string;
    search: string;
    hash: string;
  } | null;
  adoptionSettler?: CoachCreatedThreadAdoptionSettler;
};
```

`CreatedThreadAdoptionArgs` is an existing imported type. Its fields are **not supplied**; do not redeclare it.

Required behavior:

1. Only the current null-thread publication and its own send may adopt.
2. Created target, audience and actor match the captured operation.
3. Apply route/active-thread changes once using existing setters.
4. Resolve `true` only after committed, independently observed route and active-thread identity match.
5. Actor/audience change, independent selection, abort, timeout or unmount resolves refusal.
6. Publication state remains owned by the existing state module.
7. Adoption alone preserves generation; ordinary admission acknowledgements mint generations.
8. Do not reuse the generation-increasing producer-cleanup predicate as adoption settlement.
9. Reuse the transport’s existing deadline; no independent second timeout.
10. Cleanup removes listeners/timers and makes completion idempotent.

The implementation export for a settler hook is **not prescribed until G0-ADOPT establishes the existing hook’s actual API**. Adding a duplicate hook because a planned name sounds suitable is prohibited.

## HTTP contracts

| Interaction | Known contract | Missing contract / disposition |
|---|---|---|
| Target admission | One generation-fenced GET ending in `/target-access` | Full path, query, envelope and mounted owner require G0-MOUNT |
| Memory list/correct/forget | Existing `/api/coach/memory` route family; `ensureClientAccess` before lookup/write | Exact suffixes/methods and envelopes require G0-MEMORY |
| Consent update | `PUT /api/notification-settings/coach-nudges` | Response envelope and exact error codes require G0-CONSENT |
| Profile update | `PUT /api/profile` | Full validated profile shape and envelope require G0-CONSENT |
| Self-consent read | Existing read, exact endpoint absent | G0-CONSENT |
| Conversation create/list/detail/message | Existing transport contracts | G0-ADOPT/G0-MOUNT |
| Logger execute/confirm | Existing command API, `rest_adjust` schema retained | G0-MOUNT/G0-TEST |

Exact consent request examples:

```json
{"coachProactiveNudges":false}
```

```json
{"coachNudgeSnoozedUntil":"2026-09-20T18:00:00.000Z"}
```

```json
{"coachNudgeSnoozedUntil":null}
```

Omitted keys remain unchanged. Reject extra keys, nonboolean opt-in, invalid timestamp and target-user selection. The authenticated caller selects the row.

Generic profile `notificationPreferences` is a patch of submitted **non-Coach** keys. Presence of either Coach-owned key returns 400. Combined profile/preference changes commit or roll back together.

## Memory contracts

- IDs are strict positive integers.
- Authorization precedes scoped database lookup.
- Ownership lookup includes both fact ID and authorized `userId`.
- Unknown/other-client fact responses are indistinguishable 404.
- Correction requires a canonical UUID `Idempotency-Key`; missing header returns 400 with `COACH_FACT_IDEMPOTENCY_REQUIRED`.
- Hash normalized accepted fields and actor/client/predecessor identity. Omitted `validFrom` has an explicit hash marker independent of the retry date.
- Use those same normalized values for insertion.
- Lock the predecessor; create successor and invalidate predecessor in one transaction.
- Matching key/hash returns existing successor identity without another mutation; changed body/actor cannot replay.
- New correction success: existing 201 envelope containing `fact` and `supersededFact`.
- Replay success: existing 200 envelope with `replayed:true`; exact envelope requires G0-MEMORY.
- Conflict: 409; unreadable/missing successor: bounded 404/409 per supplied implementation contract. C0 must settle the exact mapping before tests assert it.
- Forgotten predecessor replay never returns its statement.
- Forget targets one version, serializes against correction and never extends an existing purge deadline.
- Retrieval exclusion is immediate after successful forget; physical purge is separately controlled and currently not production-certified.
- Inspect: default limit 50, maximum 100, `id DESC`, limit+1, strict cursor, same filters/scope on every page.
- Apply active-context priority and validity predicates **before** LIMIT.
- No network/provider work inside transactions.
- Post-commit invalidation failure cannot be described as transaction rollback. Same-key retry must recover a committed correction without duplication; serving stale forgotten content remains forbidden.

## Complete supplied CoachFact model contract

This reproduces the supplied model definition in compact form; it is a reference, **not an instruction to replace the current file**.

```js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CoachFact extends Model {}

CoachFact.init({
  id: {
    type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE', onDelete: 'CASCADE',
  },
  category: {
    type: DataTypes.ENUM(
      'injury_constraint', 'preference', 'goal_context',
      'lifestyle', 'equipment', 'motivation_style',
      'schedule_pattern', 'coaching_cue', 'milestone',
    ),
    allowNull: false,
  },
  statement: { type: DataTypes.TEXT, allowNull: false },
  structured: { type: DataTypes.JSONB, allowNull: true },
  status: {
    type: DataTypes.ENUM('proposed', 'active', 'invalidated', 'rejected'),
    allowNull: false, defaultValue: 'proposed',
  },
  validFrom: { type: DataTypes.DATEONLY, allowNull: false },
  validTo: { type: DataTypes.DATEONLY, allowNull: true },
  invalidatedAt: { type: DataTypes.DATE, allowNull: true },
  invalidatedByFactId: {
    type: DataTypes.INTEGER, allowNull: true,
    references: { model: 'coach_facts', key: 'id' },
    onUpdate: 'CASCADE', onDelete: 'SET NULL',
  },
  sourceType: {
    type: DataTypes.ENUM(
      'chat', 'dictation', 'intake', 'workout_log',
      'client_note', 'trainer_manual',
    ),
    allowNull: false,
  },
  sourceRef: { type: DataTypes.JSONB, allowNull: true },
  createdByUserId: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE', onDelete: 'CASCADE',
  },
  approvedByUserId: {
    type: DataTypes.INTEGER, allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE', onDelete: 'SET NULL',
  },
  approvedAt: { type: DataTypes.DATE, allowNull: true },
  forgottenAt: {
    type: DataTypes.DATE, allowNull: true,
    comment: 'When a forget operator invalidated this fact for deletion/privacy',
  },
  purgeAfterAt: {
    type: DataTypes.DATE, allowNull: true,
    comment: 'forgottenAt + 24h; purgeDueFacts hard-destroys the row after this',
  },
  conflictMetadata: {
    type: DataTypes.JSONB, allowNull: true,
    comment: 'T37 conflict annotations; written only by an explicit reconcile step',
  },
  correctionRequestKey: {
    type: DataTypes.STRING(128), allowNull: true,
    comment: 'Scoped client idempotency key for a committed correction',
  },
  correctionRequestHash: {
    type: DataTypes.CHAR(64), allowNull: true,
    comment: 'SHA-256 hash of the normalized correction request and scope',
  },
}, {
  sequelize,
  modelName: 'CoachFact',
  tableName: 'coach_facts',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['userId', 'category', 'status'] },
  ],
});

CoachFact.associate = (models) => {
  CoachFact.belongsTo(models.User, {
    foreignKey: 'userId', as: 'client',
  });
  CoachFact.belongsTo(models.User, {
    foreignKey: 'createdByUserId', as: 'createdBy',
  });
  CoachFact.belongsTo(models.User, {
    foreignKey: 'approvedByUserId', as: 'approvedBy',
  });
  CoachFact.belongsTo(models.CoachFact, {
    foreignKey: 'invalidatedByFactId', as: 'supersededBy',
  });
};

export default CoachFact;
```

No other model definition is invented. Missing `Users`, orientation and parent definitions block edits to those models.

## PostgreSQL isolation contract

Known historical cluster: PostgreSQL 17, loopback port 55433, role `swanverify`, data directory `%TEMP%\swan-verify-pg`. These values are **not proof of current ownership**.

Before any reset/migration, verify through the actual suite connection:

```sql
SELECT current_database(), current_user,
       inet_server_addr(), inet_server_port();
SHOW server_encoding;
SHOW data_directory;
```

Required:

- Loopback only; no non-loopback trust listener.
- UTF8 database.
- Exact operator-assigned database, role and data directory.
- Current ownership receipt permitting lifecycle operations.
- No application `.env`, production `DATABASE_URL` or inherited credential fallback.
- No parallel reset of a shared fixture.
- Integration suites run serially with real Sequelize/model classes.
- Test process establishes lock/statement timeouts; no unbounded concurrency barrier.
- Teardown runs after pass, failure and interruption.
- If the cluster is already running without verified ownership, halt before using or stopping it.

Configuration keys are not interchangeable:

| Key family | Use |
|---|---|
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DB` | Supplied historical migration invocation; actual config precedence must be verified |
| `SWAN_COACH_TEST_PORT` | Supplied fixed helper’s declared input |
| `BASE_URL` | Owned browser frontend; no automatic backend startup |
| `DATABASE_URL` | Must not reach application production configuration in these tests |

C0 decides whether the existing helper safely accepts a narrow explicit identity object or whether the harness provisions its fixed database/role inside the owned cluster. Do not modify only the port and assume isolation is solved.

## Migration and rollback

Three distinct fixtures:

1. **Fresh:** zero public application tables before migration; no boot sync.
2. **Installed history:** synthetic pre-remediation schema plus applied migration metadata.
3. **Interrupted:** table exists but one or more expected indexes are absent.

Assert names/types/targets, not only table or FK counts.

A forward-repair migration is conditional on C2 evidence. Its filename and complete body require verified migration ordering and column contracts. No guessed conversion, broad `alter`, deletion or data remapping is authorized.

Rollback rules:

- Source: restore only the coherent owned patch, preserving unrelated dirty work.
- Memory replay columns: stop dependent correction writes before removing replay capability; production down is not authorized.
- Consent: retain atomic merge or disable affected writes; never restore snapshot replacement.
- Adoption: fail closed by disabling adoption capability; do not fabricate success.
- Data: restore only the owned test fixture and verify content/constraints.
- Never use the destructive `UserAchievements.down()` as the completion rollback.
