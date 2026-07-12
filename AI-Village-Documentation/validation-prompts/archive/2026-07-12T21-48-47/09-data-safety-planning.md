# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 82.9s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — Jarvis Swan OS Super Prompt (v1.0 + 2026-07-12 Amendment)
**Auditor Role:** Production Data Safety Auditor
**Platform:** sswanstudios.com (live, paying customers)
**Audit Date:** 2026-07-12
**Plan Version:** PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md

---

> **PREAMBLE — SCOPE HONESTY**
> This plan is primarily a *planning and architecture document* — it produces "plan packs" rather than shipping code directly. However, it describes concrete data writes, new tables, new API surfaces, and new storage patterns with enough specificity to derive real risk. Every finding below is derived strictly from plan text. Where the plan is silent on a data-safety concern that its described feature *necessarily* creates, that silence is itself the finding. **Silence in a plan = unguarded write path in production.**

---

## EXECUTIVE SUMMARY

| Severity | Count |
|---|---|
| CRITICAL | 4 |
| HIGH | 7 |
| MEDIUM | 6 |
| LOW | 4 |

**Top-line verdict:** The plan describes at least **six new write paths** to the production database, **two new file/media storage patterns**, **one new external OAuth token store**, and **one new per-user API key store** — none of which have explicit size limits, retention policies, cleanup hooks, or migration safety gates documented. The "no new billing system" claim in §10 is partially correct but masks a new `feature_grants` audit trail and a new Stripe webhook path that both touch user data. The Agent Gateway (§6) introduces the highest-severity risk: per-user API keys with scoped grants and an audit trail, described with zero schema, zero rate-limit spec, and zero key-rotation policy.

---

## FINDING 1 — CRITICAL
### Conversation History: Unbounded JSONB / Row Growth with No Retention Policy

**Source:** §5 Workstream C — *"persistent chat with full conversation history, resumable threads"*

**Derived write path:**
```
conversations table (new)
  └── messages table (new) OR JSONB blob on conversations
        ├── role: string
        ├── content: text (potentially large — TTS, chart JSON, inline chart data)
        ├── created_at: timestamp
        └── [implied] chart_payload: JSONB (charts-in-chat feature)
```

**Risk:**
The plan mandates "full conversation history" and "resumable threads" for every paid user. No maximum message count, no conversation archival window, no JSONB size cap, and no pagination strategy is specified. A single power user running daily voice-first sessions with inline chart payloads can accumulate thousands of rows or multi-megabyte JSONB blobs. At scale across all paying clients this becomes a table-scan and storage cost problem. More critically: **if a user cancels their subscription, their conversation history — which may contain health disclosures, body metrics, injury history, and financial information — has no documented deletion or anonymization path.**

**Privacy amplifier:** §5 explicitly mentions voice-first input. If transcripts of voice sessions are stored verbatim, they are health-adjacent data under CCPA/HIPAA-adjacent obligations even if not formally HIPAA-covered. The plan is completely silent on this.

**Recommendations:**
```sql
-- Enforce at schema level, not application level
ALTER TABLE messages ADD CONSTRAINT messages_content_length 
  CHECK (char_length(content) <= 32768); -- 32KB per message

ALTER TABLE conversations ADD CONSTRAINT conversations_message_cap
  -- enforced via trigger, not CHECK (requires count)
  -- trigger fires on INSERT, rejects if COUNT(*) > 500 for conversation_id

-- Retention policy (must be in migration, not just app code)
ALTER TABLE conversations ADD COLUMN expires_at TIMESTAMPTZ 
  GENERATED ALWAYS AS (created_at + INTERVAL '2 years') STORED;

CREATE INDEX idx_conversations_expires ON conversations(expires_at) 
  WHERE expires_at < NOW();
-- Nightly job: DELETE FROM conversations WHERE expires_at < NOW();
```

**Additional requirements the plan must specify before any agent builds this:**
1. Maximum messages per conversation thread (recommend: 500, hard-capped at DB level)
2. Maximum conversations per user per month (recommend: configurable per tier)
3. Retention window (recommend: 24 months, user-deletable on demand)
4. On subscription cancellation: grace period → anonymize content → delete (not soft-delete)
5. Chart payloads in chat must be references (FK to `saved_charts`) not embedded JSONB blobs

---

## FINDING 2 — CRITICAL
### Agent Gateway API Keys: No Schema, No Rotation, No Revocation Audit Trail

**Source:** §6 Workstream D — *"Per-user agent API keys, scoped grants, rate limits, audit trail"*

**Derived write path:**
```
agent_api_keys table (new — implied, never specified)
  ├── id: uuid
  ├── user_id: FK → users
  ├── key_hash: text (hopefully — plan doesn't say)
  ├── scopes: JSONB or text[] (T0/T1 tiers)
  ├── created_at: timestamp
  └── last_used_at: timestamp (implied by "audit trail")

agent_audit_log table (new — implied)
  ├── key_id: FK → agent_api_keys
  ├── action: text
  ├── payload_snapshot: JSONB (UNBOUNDED — see Finding 1 pattern)
  └── created_at: timestamp
```

**Risk:**
The plan references the existing "T0–T4 bridge doctrine" but that doctrine governs *Hermes* (a known, trusted agent). The new Gateway exposes the same surface to **"strangers' agents = later, same contract"** — meaning the same key/scope system will eventually be opened to unknown third-party agents. The plan provides zero guidance on:

1. Whether API keys are stored as plaintext, hashed (bcrypt/SHA-256), or via a secrets manager
2. Key rotation policy (no expiry field mentioned)
3. What happens to issued keys when a user's subscription is cancelled or account is deleted
4. Whether the audit log payload snapshots contain user health data (they will — T0 reads include workouts and charts)
5. Cascade behavior: if `users` row is deleted, do `agent_api_keys` rows cascade-delete? If soft-deleted, do keys remain valid?

**This is a credential-leak and orphaned-access risk on a production platform with real paying customers.**

**Recommendations:**
```sql
CREATE TABLE agent_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- hard cascade
  key_hash TEXT NOT NULL, -- store ONLY SHA-256(key), never plaintext
  key_prefix VARCHAR(8) NOT NULL, -- for display: "sk_live_ab12..." 
  scopes TEXT[] NOT NULL DEFAULT '{}',
  tier SMALLINT NOT NULL DEFAULT 0 CHECK (tier BETWEEN 0 AND 4),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 year',
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent unbounded key accumulation per user
  CONSTRAINT max_keys_enforced CHECK (true) -- enforce via trigger: max 10 active keys/user
);

CREATE INDEX idx_agent_keys_user ON agent_api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_agent_keys_expires ON agent_api_keys(expires_at) WHERE revoked_at IS NULL;

-- Audit log: NO payload snapshots of health data
CREATE TABLE agent_audit_log (
  id BIGSERIAL PRIMARY KEY,
  key_id UUID NOT NULL REFERENCES agent_api_keys(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64), -- 'workout', 'chart', 'schedule' — NOT the data itself
  resource_id INTEGER, -- FK reference only, not a copy
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Partition by month; retain 90 days; no health data in log rows
```

**The plan must explicitly forbid storing health data payloads in audit log rows.** Log the *fact* of access, not the *content* accessed.

---

## FINDING 3 — CRITICAL
### Wearables OAuth Tokens: Storage Pattern Unspecified, Revocation Path Missing

**Source:** §6 — *"Fitbit first (OAuth consent posture, Rule 8 data minimization), then Apple Health/Google Fit as aggregators... consent/export/revocation surfaces"*

**Derived write path:**
```
wearable_connections table (new — implied)
  ├── user_id: FK → users
  ├── provider: enum ('fitbit', 'apple_health', 'google_fit')
  ├── access_token: text (SENSITIVE — OAuth bearer token)
  ├── refresh_token: text (SENSITIVE — long-lived)
  ├── token_expires_at: timestamp
  ├── scopes_granted: text[] or JSONB
  └── connected_at: timestamp

wearable_sync_data table (new — implied, for §7 avatar mirror)
  ├── user_id: FK → users
  ├── provider: text
  ├── data_type: text ('steps', 'heart_rate', 'sleep', ...)
  ├── recorded_at: timestamp
  ├── value: JSONB (UNBOUNDED — no size limit specified)
  └── synced_at: timestamp
```

**Risk:**
OAuth tokens for health data providers are among the most sensitive credentials a fitness app can hold. The plan mentions "consent/export/revocation surfaces" as a deliverable but provides zero schema or storage guidance. Specific risks:

1. **Token storage:** If `access_token` and `refresh_token` are stored as plaintext columns in PostgreSQL, a SQL injection or backup leak exposes live access to users' Fitbit health data
2. **Revocation gap:** When a user revokes consent in the SwanStudios UI, does the app call Fitbit's token revocation endpoint? The plan doesn't say. GDPR/CCPA require this
3. **Sync data unbounded growth:** §7 E2 requires avatar body/energy to reflect "real logged workouts, nutrition, Fitbit data" — this implies continuous sync writes with no documented retention window or row cap
4. **Cascade on account deletion:** No mention of what happens to wearable sync data when a user deletes their account

**Recommendations:**
```sql
-- Tokens must be encrypted at rest — use pgcrypto or application-layer encryption
-- NEVER store plaintext OAuth tokens in a standard text column

CREATE TABLE wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  -- Store encrypted; decrypt only in application memory, never log
  access_token_encrypted BYTEA NOT NULL, 
  refresh_token_encrypted BYTEA NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes_granted TEXT[] NOT NULL DEFAULT '{}',
  revoked_at TIMESTAMPTZ, -- set this AND call provider revocation endpoint
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Sync data: rolling window only
CREATE TABLE wearable_sync_data (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  data_type VARCHAR(64) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  value NUMERIC, -- typed, not JSONB blob
  unit VARCHAR(16),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);
-- Retain 13 months (rolling); older partitions dropped automatically
-- Index: (user_id, data_type, recorded_at DESC)
```

**Revocation contract (must be in plan pack):**
```
ON user revokes consent:
  1. Call provider.revokeToken(refresh_token) → confirm 200
  2. SET revoked_at = NOW() on wearable_connections row
  3. DELETE FROM wearable_sync_data WHERE user_id = ? AND provider = ?
     (or schedule for async deletion with audit receipt)
  4. Log revocation event with timestamp (no token values in log)
```

---

## FINDING 4 — CRITICAL
### Custom Chart Schema: User-Scoped Data Isolation Not Enforced at Schema Level

**Source:** §5 — *"data scoped to THEIR data only (Rule 8; trainer scope via existing ownership gates)"*; *"custom-chart schema (sources = canonical chart endpoints + goals + wearables)"*

**Derived write path:**
```
saved_charts table (new)
  ├── id: UUID
  ├── user_id: FK → users (owner)
  ├── title: text
  ├── chart_config: JSONB (data source references, axes, filters)
  ├── pinned_to_dashboard: boolean
  ├── created_at: timestamp
  └── updated_at: timestamp

chart_config JSONB structure (implied):
  {
    "sources": ["workouts", "goals", "wearables"],
    "filters": { "user_id": "...", "date_range": "..." },
    "axes": { "x": "date", "y": "squat_volume" }
  }
```

**Risk:**
The plan says data is "scoped to THEIR data only" and relies on "existing ownership gates" — but the custom chart builder is a *new* feature where users construct arbitrary queries conversationally. The risk is **IDOR (Insecure Direct Object Reference)**: if the `chart_config` JSONB contains a `user_id` filter that is set by the client (via the Coach conversation) rather than enforced server-side, a malicious or misconfigured request could reference another user's data.

This is not hypothetical. The plan explicitly describes the Coach *proposing* chart configurations based on user input. If the proposal pipeline constructs a chart config that includes a `user_id` derived from the conversation context rather than the authenticated session, and that config is saved and later executed, it becomes a persistent data-leak vector.

**The plan's "Rule 8" reference and "existing ownership gates" claim is insufficient.** Existing gates were designed for known endpoints, not for a new conversational chart-builder that constructs dynamic queries.

**Recommendations:**

```typescript
// Server-side chart execution — NEVER trust user_id from chart_config JSONB
// Always inject from authenticated session

async function executeCustomChart(
  chartId: string, 
  requestingUserId: number,
  requestingUserRole: 'client' | 'trainer' | 'admin'
): Promise<ChartData> {
  
  const chart = await SavedChart.findOne({ 
    where: { id: chartId },
    // CRITICAL: ownership check at fetch time, not after
  });
  
  if (!chart) throw new NotFoundError();
  
  // Enforce ownership — never use chart.chart_config.filters.user_id
  const authorizedUserId = resolveAuthorizedScope(
    requestingUserId, 
    requestingUserRole, 
    chart.user_id
  );
  
  if (!authorizedUserId) throw new ForbiddenError();
  
  // Build query with server-injected user_id, ignoring any user_id in JSONB
  return buildChartQuery(chart.chart_config, authorizedUserId);
}

// Schema constraint: chart_config must NOT contain user_id field
// Enforce via JSON Schema validation on INSERT/UPDATE
```

```sql
-- Add check constraint to prevent user_id embedding in chart configs
ALTER TABLE saved_charts ADD CONSTRAINT no_userid_in_config
  CHECK (chart_config -> 'filters' ->> 'user_id' IS NULL);

-- Pinned charts: cap per user to prevent dashboard DoS
ALTER TABLE saved_charts ADD CONSTRAINT max_pinned_charts
  CHECK (true); -- enforce via trigger: max 20 pinned charts per user
```

---

## FINDING 5 — HIGH
### Token Budget Counters: Denormalized Aggregates with Race Condition Risk

**Source:** §5 — *"per-user monthly token budgets w/ soft warning + hard stop"*; *

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
