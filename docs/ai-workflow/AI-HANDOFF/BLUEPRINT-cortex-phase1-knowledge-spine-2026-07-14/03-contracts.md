# 03 — Contracts (models, APIs, functions)

## 3.1 Model conventions (copy exactly)

Copy the house pattern (verified from `LongTermProgramPlan.mjs` / `WaiverVersion.mjs` on main):
`import { DataTypes, Model } from 'sequelize'; import sequelize from '../database.mjs';`
class extends Model; `Model.init({...},{sequelize, modelName, tableName, timestamps:true,
indexes:[...]})`. Every FK to users references `{model:'Users', key:'id'}` — capital U, always.
Every column gets a `comment`. snake_case tableName, camelCase attributes.

## 3.2 New tables (exact columns)

### knowledge_sources
| column | type | notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| sourceTitle | STRING(300) NOT NULL | |
| sourceCategory | ENUM NOT NULL | `'formal_certification','continuing_education','textbook','live_workshop','personal_notes','professional_recollection','peer_reviewed_research','org_guidance','government_guidance','manufacturer_guidance','healthcare_direction','practical_experience','swan_original','client_outcome','historical_method','industry_practice','unverified','superseded','conflicting','user_submitted'` (= v1 classes A–T) |
| organization | STRING(200) NULL | e.g. 'NASM' |
| authorOrInstructor | STRING(200) NULL | |
| edition | STRING(50) NULL · publicationYear INTEGER NULL · attendanceDate DATEONLY NULL · completionDate DATEONLY NULL | |
| historicalStatus | ENUM NOT NULL default `'current'` | `'current','historical','superseded','requires_verification'` |
| evidenceLevel | ENUM NOT NULL default `'unrated'` | `'high','moderate','low','anecdotal','unrated'` |
| copyrightSensitivity | ENUM NOT NULL default `'restricted'` | `'open','cite_only','restricted','prohibited_user_facing'` |
| userDisplayAllowed | BOOLEAN NOT NULL default false | |
| summary | TEXT NULL · topicsCovered JSONB NULL (string array) · seanNotes TEXT NULL | |
| reviewStatus | ENUM NOT NULL default `'pending'` | `'pending','reviewed','flagged'` |
| lastReviewedAt DATE NULL · nextReviewAt DATE NULL · reviewedByUserId INTEGER NULL FK Users | |
| createdByUserId | INTEGER NULL FK Users | |
Indexes: `sourceCategory`, `historicalStatus`, `reviewStatus`.

### source_files (metadata ONLY — no bytes, no public URLs)
id PK · sourceId INTEGER NOT NULL FK knowledge_sources (CASCADE) · fileLabel STRING(200) NOT NULL ·
storageLocation STRING(500) NOT NULL comment 'external pointer e.g. hermes-vault://… or r2-private://… — NEVER repo path, NEVER public URL' ·
sourceFormat ENUM('pdf','image','audio','video','markdown','physical','other') NOT NULL ·
accessRestriction ENUM('sean_only','trainer_internal','system_internal') NOT NULL default 'sean_only' ·
chapter STRING(100) NULL · pageRange STRING(50) NULL · checksum STRING(64) NULL. Index: sourceId.

### credentials
id PK · credentialName STRING(200) NOT NULL · issuingOrganization STRING(200) NOT NULL ·
credentialStatus ENUM('active','expired','historical','in_progress') NOT NULL ·
earnedDate DATEONLY NULL · expiresDate DATEONLY NULL · sourceId INTEGER NULL FK knowledge_sources ·
holderUserId INTEGER NOT NULL FK Users · displayString STRING(300) NOT NULL comment
'EXACT user-facing wording, e.g. "NASM workshop-trained" — never invent; copy Sean-approved strings' ·
notes TEXT NULL.

### continuing_education
id PK · courseTitle STRING(300) NOT NULL · provider STRING(200) NULL · completedDate DATEONLY NULL ·
ceuValue DECIMAL(5,2) NULL · sourceId INTEGER NULL FK knowledge_sources · integratedIntoRules
BOOLEAN NOT NULL default false · notes TEXT NULL · holderUserId INTEGER NOT NULL FK Users.

### workshops
id PK · workshopName STRING(300) NOT NULL · organization STRING(200) NULL · approximateDate
STRING(50) NULL comment 'string to allow "~2000"' · exactDate DATEONLY NULL · location STRING(200)
NULL · knowledgeFormat JSONB NULL comment 'array e.g. ["recollection","notes","handouts"]' ·
sourceId INTEGER NULL FK knowledge_sources · attendeeUserId INTEGER NOT NULL FK Users ·
verificationPolicy TEXT NULL.

### workshop_notes
id PK · workshopId INTEGER NOT NULL FK workshops (CASCADE) · noteTitle STRING(200) NOT NULL ·
noteBody TEXT NOT NULL · confidence ENUM('verified','clear_memory','fuzzy_memory','uncertain')
NOT NULL default 'clear_memory' · capturedVia ENUM('typed','grill_me_interview','plaud_transcript','scan')
NOT NULL default 'typed' · createdByUserId INTEGER NULL FK Users.

### knowledge_concepts
id PK · conceptName STRING(200) NOT NULL UNIQUE · domain STRING(100) NOT NULL comment
'one of the 48 v1 domains, kebab-case e.g. "core-training"' · definition TEXT NOT NULL ·
conceptSourceIds JSONB NULL comment 'array of knowledge_sources ids' · evidenceStatus
ENUM('supported','mixed','contested','historical') NOT NULL default 'supported' · notes TEXT NULL.

### knowledge_rules (the heart)
| column | type |
|---|---|
| id PK · ruleName STRING(200) NOT NULL · domain STRING(100) NOT NULL · subdomain STRING(100) NULL | |
| ruleType | ENUM('selection','progression','regression','contraindication','stop_condition','referral','dosage','coaching_cue','eligibility','methodology') NOT NULL |
| plainLanguageRule | TEXT NOT NULL (Sean-readable one-paragraph rule) |
| operationalLogic | JSONB NOT NULL comment 'machine shape: {if:[{field,op,value}], then:[{action,target,params}]} — ops: eq,neq,gt,gte,lt,lte,in,contains; actions: exclude_exercise,prefer_exercise,cap_intensity,require_regression,flag_referral,stop_session,require_review' |
| technicalExplanation TEXT NULL · userFacingExplanation TEXT NULL · trainerFacingExplanation TEXT NULL | |
| applicablePopulation JSONB NULL · excludedPopulation JSONB NULL · triggeringConditions JSONB NULL · contraindications JSONB NULL · stopConditions JSONB NULL · referralConditions JSONB NULL · progressionCriteria JSONB NULL · regressionCriteria JSONB NULL · coachingCues JSONB NULL (all string arrays or the op-shape above) | |
| status | ENUM('draft','extracted','needs_source_verification','needs_sean_review','sean_approved','professionally_reviewed','current_with_qualifications','conflicting_evidence','restricted_use','client_specific_only','experimental','deprecated','superseded','archived','prohibited') NOT NULL default 'draft' |
| confidenceLevel | ENUM('verified','likely','hypothesis') NOT NULL default 'hypothesis' |
| sourceStrength | ENUM('level1_exact_page','level2_chapter','level3_course_record','level4_documented_experience','level5_unverified_recollection') NOT NULL default 'level5_unverified_recollection' |
| seanInterpretation TEXT NULL · historicalStatus ENUM('current','historical','superseded') default 'current' | |
| approvedByUserId INTEGER NULL FK Users · approvedAt DATE NULL · reviewDueAt DATE NULL | |
| currentVersion INTEGER NOT NULL default 1 · isActive BOOLEAN NOT NULL default true · createdByUserId INTEGER NULL FK Users | |
Indexes: `status`, `domain`, `ruleType`, composite `(status,isActive)`.

### rule_sources
id PK · ruleId INTEGER NOT NULL FK knowledge_rules (CASCADE) · sourceId INTEGER NOT NULL FK
knowledge_sources · citationLevel ENUM('level1','level2','level3','level4','level5') NOT NULL ·
citationDetail STRING(300) NULL comment 'e.g. "ch. 7 pp. 142-150" — never invented; null if unknown'.
Unique composite index `(ruleId, sourceId)`.

### rule_versions (immutable — no UPDATE path in code)
id PK · ruleId INTEGER NOT NULL FK knowledge_rules (CASCADE) · versionNumber INTEGER NOT NULL ·
snapshot JSONB NOT NULL comment 'full knowledge_rules row as-of change' · changeNote TEXT NOT NULL ·
changedByUserId INTEGER NULL FK Users · previousStatus STRING(50) NULL · newStatus STRING(50) NULL.
Unique composite `(ruleId, versionNumber)`.

### rule_conflicts
id PK · ruleAId INTEGER NOT NULL FK knowledge_rules · ruleBId INTEGER NOT NULL FK knowledge_rules ·
conflictDescription TEXT NOT NULL · resolutionStatus ENUM('open','resolved_a_wins','resolved_b_wins','resolved_merged','deferred') NOT NULL default 'open' ·
resolutionRationale TEXT NULL · resolvedByUserId INTEGER NULL FK Users · resolvedAt DATE NULL.

### progression_events (decision 5c — one table for both directions)
id PK · userId INTEGER NOT NULL FK Users comment 'the client' · exerciseId INTEGER NULL FK
Exercises · direction ENUM('progression','regression') NOT NULL · eventType
ENUM('load_increase','rep_increase','range_increase','complexity_increase','assistance_reduced','tempo_advance','load_decrease','substitution','support_added','volume_reduced','impact_reduced','other') NOT NULL ·
fromValue JSONB NULL · toValue JSONB NULL comment 'e.g. {"load":135,"unit":"lb"}' · reason
STRING(300) NULL · sourceRuleId INTEGER NULL FK knowledge_rules · workoutSessionId INTEGER NULL FK
workout_sessions (match the real FK target of `WorkoutSession` — VERIFY tableName in
backend/models/WorkoutSession.mjs before writing the migration; if it differs, use the model's
real tableName) · recordedByUserId INTEGER NULL FK Users · occurredAt DATE NOT NULL default NOW.
Indexes: `(userId, occurredAt)`, `exerciseId`, `direction`.

## 3.3 API contract — all under `/api/cortex`, one router file

Auth: ALL endpoints `requireAdmin` (copy the admin-guard middleware used by an existing admin
route — see 04). Flag: every handler first checks `process.env.ENABLE_CORTEX_KNOWLEDGE === 'true'`
else `503 {success:false, error:'cortex_knowledge_disabled'}`. All responses
`{success:boolean, ...}`. Errors: 400 `{success:false, error:'<snake_code>', message}` · 404
`not_found` · 500 `internal_error` (never leak stack traces).

| Method + path | Body → Response |
|---|---|
| GET `/api/cortex/sources?category=&status=&page=1&pageSize=25` | → `{success, sources:[], total, page}` |
| POST `/api/cortex/sources` | full source fields (3.2) → 201 `{success, source}` |
| PUT `/api/cortex/sources/:id` | partial fields → `{success, source}` |
| GET `/api/cortex/sources/:id` | → `{success, source, files:[], linkedRuleCount}` |
| POST `/api/cortex/sources/:id/files` | `{fileLabel, storageLocation, sourceFormat, accessRestriction, chapter?, pageRange?}` → 201. REJECT 400 `invalid_storage_location` if storageLocation starts with `http://`, `https://`, `/`, or a drive letter — external pointer schemes only |
| GET `/api/cortex/rules?status=&domain=&ruleType=&q=&page=&pageSize=` | → `{success, rules:[], total, page}` (q = ILIKE on ruleName+plainLanguageRule) |
| POST `/api/cortex/rules` | rule fields → 201 `{success, rule}` (status forced to 'draft' regardless of body) |
| PUT `/api/cortex/rules/:id` | partial fields (NOT status) → snapshots to rule_versions first, increments currentVersion → `{success, rule}` |
| PUT `/api/cortex/rules/:id/status` | `{status, changeNote}` (changeNote required ≥5 chars) → validates transition per 01 state machine → `{success, rule}` |
| GET `/api/cortex/rules/:id` | → `{success, rule, sources:[{...citation}], versions:[{versionNumber,changeNote,changedAt}], conflicts:[]}` |
| POST `/api/cortex/rules/:id/sources` | `{sourceId, citationLevel, citationDetail?}` → 201 |
| POST `/api/cortex/conflicts` | `{ruleAId, ruleBId, conflictDescription}` → 201 |
| PUT `/api/cortex/conflicts/:id` | `{resolutionStatus, resolutionRationale}` → `{success, conflict}` |
| GET `/api/cortex/stats` | → `{success, stats:{sources, rulesByStatus:{draft:n,...}, openConflicts, reviewDue}}` |
| POST `/api/cortex/progression-events` | event fields (3.2) → 201 `{success, event}` — auth: `requireTrainerOrAdmin` (this one endpoint) |
| GET `/api/cortex/progression-events?userId=&from=&to=&direction=` | → `{success, events:[], total}` — trainer/admin; a client may query ONLY their own userId (403 `forbidden` otherwise) |

## 3.4 Service extension — `swanCoachCortexService.mjs`

ADD (do not modify existing exports):
```js
export async function getApprovedKnowledgeRules({ domain = null } = {})
// → Promise<Array<rulePlain>> ; findAll {status:'sean_approved', isActive:true} (+domain),
// mapped to plain objects; module-level cache 5 min TTL.
export function invalidateKnowledgeCache() // clears the cache; called by status/PUT handlers
```
Wire into the existing policy return: the object returned by the service's existing public
policy-loader gains a `knowledgeRules` property = `await getApprovedKnowledgeRules()` **only when
the flag is on**; when off, `knowledgeRules: []`. Existing consumers must be untouched and green.

## 3.5 Seed (Slice 1)

Idempotent seeder `backend/seeders/20260714-seed-cortex-founding-sources.mjs` (findOrCreate by
sourceTitle), creating: (1) source "Sean Swan NASM Workshop Education" — category
`live_workshop`, historicalStatus `historical`, copyrightSensitivity `cite_only`, summary = the
verification policy from v1 (any safety-sensitive recommendation originating primarily here is
checked against newer evidence before becoming an authoritative automated rule); plus linked
`workshops` row (approximateDate `"~2000"`, knowledgeFormat
`["recollection","notes_if_available","handouts_if_available"]`); (2) source "NASM OPT Model —
Sean's certification education" category `formal_certification`; (3) credentials row —
displayString EXACTLY `"NASM workshop-trained (26+ years experience)"`, holderUserId = the admin
user (look up by role `'admin'`, lowest id).

**Founding source catalog (also seeded, metadata-only, from the owner's declared library —
create each with findOrCreate by sourceTitle; author/edition/year = NULL where not stated; NO
source_files rows for any of these):**
| sourceTitle | sourceCategory | notes/summary |
|---|---|---|
| "NASM OPT textbook (Sean's owned copy)" | `textbook` | copyrightSensitivity `restricted`; summary: "Owner-held NASM textbook. Metadata record only — edition/year to be filled by Sean in the Knowledge Console. No content stored." |
| "NASM course materials (lawfully obtained)" | `formal_certification` | copyrightSensitivity `restricted`; edition/year NULL |
| "Sean's personal workshop & course notes" | `personal_notes` | copyrightSensitivity `cite_only` |
| "ACSM guidance & position statements" | `org_guidance` | copyrightSensitivity `cite_only` |
| "NSCA guidance & position statements" | `org_guidance` | copyrightSensitivity `cite_only` |
| "U.S. Physical Activity Guidelines (HHS)" | `government_guidance` | copyrightSensitivity `public` if the enum has it, else `cite_only` |
| "Sean's practical coaching experience (26+ years)" | `practical_experience` | historicalStatus `current` |
| "SWAN original methodology" | `swan_original` | historicalStatus `current` |

Do NOT invent titles, editions, years, page counts, or additional books beyond this table —
Sean enumerates exact editions later via the Knowledge Console Sources tab (that surface exists
for precisely this). The seeder total is therefore 10 knowledge_sources rows + 1 workshops row +
1 credentials row.
