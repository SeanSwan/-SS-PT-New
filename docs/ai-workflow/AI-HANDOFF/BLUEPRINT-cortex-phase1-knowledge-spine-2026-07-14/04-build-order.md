# 04 — Build order (file by file)

Every file ≤300 lines. Pattern excerpts referenced here are pasted in §4.9 so the builder never
needs to grep. Order below = build order; each slice boundary leaves the app bootable with the
flag off.

## Slice 1 — Source Library (models + migration + seed)

| # | File | Purpose / exports |
|---|---|---|
| 1 | `backend/migrations/20260714000001-create-cortex-source-library.cjs` | Creates `knowledge_sources`, `source_files`, `credentials`, `continuing_education`, `workshops`, `workshop_notes` exactly per 03 §3.2. CommonJS (`module.exports = {up, down}`); `down` drops in reverse order. Additive only. |
| 2 | `backend/models/KnowledgeSource.mjs` | Model per 03. Copy the init style of §4.9-A. |
| 3 | `backend/models/SourceFile.mjs` · `Credential.mjs` · `ContinuingEducation.mjs` · `Workshop.mjs` · `WorkshopNote.mjs` | One model per file, same style. |
| 4 | `backend/models/associations.mjs` (EDIT) | Add hasMany/belongsTo pairs per the ER diagram, in a clearly-commented `// Cortex knowledge spine (Phase 1)` block. Mimic the file's existing association style exactly. |
| 5 | `backend/models/index.mjs` (EDIT) | Export the 6 new models following the file's existing export pattern. |
| 6 | `backend/seeders/20260714-seed-cortex-founding-sources.mjs` | Idempotent per 03 §3.5 (findOrCreate). |
| 7 | `backend/tests/cortexSourceLibrary.test.mjs` | Unit tests: model shape (columns exist, enums reject bad values), seeder idempotency (run twice → same counts), source_files storageLocation scheme validation. Mimic an existing backend test file's harness (find the shortest `*.test.mjs` under backend/tests and copy its setup/teardown verbatim). |

## Slice 2 — Rules layer

| # | File | Purpose |
|---|---|---|
| 8 | `backend/migrations/20260714000002-create-cortex-rules.cjs` | `knowledge_concepts`, `knowledge_rules`, `rule_sources`, `rule_versions`, `rule_conflicts` per 03. |
| 9 | `backend/models/KnowledgeConcept.mjs` · `KnowledgeRule.mjs` · `RuleSource.mjs` · `RuleVersion.mjs` · `RuleConflict.mjs` | Models. `KnowledgeRule` will approach 300 lines — if it exceeds, extract the ENUM value arrays to `backend/models/cortexRuleEnums.mjs` and import. |
| 10 | `backend/models/associations.mjs` + `index.mjs` (EDIT) | Register, same commented block. |
| 11 | `backend/services/cortex/knowledgeRuleService.mjs` | Business logic, exports: `listRules(filters)`, `createRule(data, actorUserId)` (forces status 'draft'), `updateRule(id, patch, actorUserId, changeNote)` (snapshot→rule_versions, currentVersion++), `changeRuleStatus(id, newStatus, changeNote, actorUserId)` (validates 01 state machine — encode allowed transitions as a const map; snapshot; sets approvedBy/At when → sean_approved; writes AiCommandAuditLog row per §4.9-C), `attachSource(ruleId, sourceId, citationLevel, citationDetail)`, `getRuleDetail(id)`, `listConflicts()`, `createConflict()`, `resolveConflict(id, resolution, rationale, actorUserId)`, `getStats()`. |
| 12 | `backend/tests/cortexKnowledgeRuleService.test.mjs` | Status-transition matrix test (every drawn transition allowed, ≥4 undrawn rejected), snapshot-on-update, changeNote-required, approve sets approvedByUserId/At. Min 12 assertions. |

## Slice 3 — API + service extension

| # | File | Purpose |
|---|---|---|
| 13 | `backend/routes/cortexKnowledgeRoutes.mjs` | Express router implementing 03 §3.3 exactly. First middleware = flag gate (503). Auth middleware: copy the import used by an existing admin-only route (locate the router that serves `/api/admin/onboarding` or similar and reuse ITS admin guard import — §4.9-B shows the shape). Thin handlers → knowledgeRuleService / models. If >300 lines, split `cortexProgressionEventRoutes.mjs` out (still mounted under `/api/cortex`). |
| 14 | `backend/core/routes.mjs` (EDIT) | Import + `app.use('/api/cortex', cortexKnowledgeRoutes);` placed in the coach/AI mounts region (near the `/api/coach/intake` mount, ~line 384 on baseline). ONE mount. No other edits to this file. |
| 15 | `backend/services/swanCoachCortexService.mjs` (EDIT) | Add `getApprovedKnowledgeRules` + `invalidateKnowledgeCache` per 03 §3.4. Import models lazily INSIDE the function (`const { default: models }` pattern or direct model import) to avoid boot-order cycles — match how other services import models. Do NOT alter existing exported function signatures. |
| 16 | `backend/tests/cortexKnowledgeRoutes.test.mjs` | Supertest: flag off → 503; non-admin → 401/403; happy-path create source → create rule → attach citation → approve → GET rules?status=sean_approved returns it; invalid transition → 400; storageLocation `https://…` → 400. Min 10 assertions. |

## Slice 4 — Admin Knowledge Console UI

| # | File | Purpose |
|---|---|---|
| 17 | `frontend/src/services/cortexKnowledgeService.ts` | Typed API client using the project's existing `apiService`/axios wrapper (copy the import used by `coachIntakeService.ts`). Exact paths from 03 §3.3. Exports one function per endpoint + TS interfaces `KnowledgeSource`, `KnowledgeRule`, `RuleConflict`, `CortexStats`, `ProgressionEvent`. |
| 18 | `frontend/src/components/DashBoard/Pages/admin-knowledge/KnowledgeConsole.tsx` | Page shell: header, tabs, stats row, tab switching (URL param `?tab=`). ≤300 lines — presentational pieces live in the files below. |
| 19 | `admin-knowledge/KnowledgeConsole.styles.ts` | styled-components. Tokens per 02. Shared style fragments with `${}` interpolation MUST use the `css` helper. |
| 20 | `admin-knowledge/RulesTab.tsx` · `SourcesTab.tsx` · `ConflictsTab.tsx` · `ReviewDueTab.tsx` | One tab per file; loading/empty/error states per 02 copy strings. |
| 21 | `admin-knowledge/RuleDetailDrawer.tsx` · `SourceDrawer.tsx` | Drawer forms per 02 Screens 2/3. Change-note gating logic here. |
| 22 | `admin-knowledge/useKnowledgeConsole.ts` | Data hook: fetch/paginate/mutate via service; optimistic status update with rollback on error. |
| 23 | Route registration (EDIT 2 files) | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx`: add admin route `{path:'/knowledge', …}` following the EXACT shape of the existing `/client-onboarding` entry at ~line 112. `UniversalDashboardLayout.routeComponents.tsx`: add lazy component entry following the existing pattern at ~line 26. Sidebar/nav entry: add "Knowledge" with a book/brain lucide icon following the sidebar config where other admin entries live (find the entry rendering "Client Onboarding" and mirror it). |
| 24 | `admin-knowledge/KnowledgeConsole.test.tsx` | Vitest+RTL: renders tabs; flag-off notice when API 503s; approve disabled until change note ≥5 chars; empty states render exact copy. Min 6 tests. |

## Slice 5 — Progression events

| # | File | Purpose |
|---|---|---|
| 25 | `backend/migrations/20260714000003-create-progression-events.cjs` | Per 03. **Before writing:** open `backend/models/WorkoutSession.mjs`, confirm its real `tableName`, use that for the FK target. |
| 26 | `backend/models/ProgressionEvent.mjs` + registry edits | Model + associations/index. |
| 27 | `backend/routes/cortexProgressionEventRoutes.mjs` (or section in #13) | POST (trainer/admin) + GET (self-scoped for clients) per 03. |
| 28 | `backend/tests/cortexProgressionEvents.test.mjs` | Client can read own only (403 cross-client), trainer can write, direction/eventType enum rejects junk. Min 8 assertions. |

## §4.9 Pattern excerpts (verified on origin/main @ eac60c638)

**A — Model init house style** (from `backend/models/LongTermProgramPlan.mjs`):
```js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';
class LongTermProgramPlan extends Model {}
LongTermProgramPlan.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: 'Users', key: 'id' },          // ← ALWAYS "Users", capital U
      comment: 'FK to Users — the client this plan is for',
    },
    status: {
      type: DataTypes.ENUM('draft', 'approved', 'active', 'archived', 'superseded'),
      allowNull: false, defaultValue: 'draft', comment: 'Plan lifecycle state',
    },
    goalProfile: { type: DataTypes.JSONB, allowNull: false, comment: '…' },
    approvedByUserId: { type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'Users', key: 'id' }, comment: '…' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, comment: '…' },
  },
  { sequelize, modelName: 'LongTermProgramPlan', /* tableName, timestamps, indexes */ },
);
```
**B — Route mount house style** (from `backend/core/routes.mjs:295-301`):
```js
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/onboarding', clientOnboardingRoutes);
app.use('/api/clients/onboard', clientOnboardRoutes);
```
Imports sit at the top of the same file grouped by domain — add yours beside the coach imports.
**C — Audit log:** model `backend/models/AiCommandAuditLog.mjs` exists; on status changes create a
row via the model directly (`AiCommandAuditLog.create({...})`) mirroring the field names you find
in that model file — open it first; do not guess field names (Rule 58).
**D — Vault loader you are extending** (head of `backend/services/swanCoachCortexService.mjs`):
caches `cachedPolicy` at module level; parses frontmatter from `docs/ai-workflow/coach-brain/`.
Your `getApprovedKnowledgeRules` follows the same module-level-cache pattern with a 5-minute TTL
timestamp check.
