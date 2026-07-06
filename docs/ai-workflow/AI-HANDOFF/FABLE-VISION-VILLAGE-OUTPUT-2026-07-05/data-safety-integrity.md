# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 70.3s
> **Files:** docs/SWANSTUDIOS-PLATFORM-VISION.md
> **Generated:** 3/28/2026, 3:17:19 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — SwanStudios Platform Vision Document

## AUDIT SUMMARY

**Document Type:** Product Vision / Requirements Document
**Code Reviewed:** Platform specification (no executable code)
**Critical Findings:** 0
**High Findings:** 0
**Medium Findings:** 3
**Low Findings:** 2

---

## ⚠️ CRITICAL ASSESSMENT

**This is a vision document, not executable code.** There are **NO IMMEDIATE DATA DESTRUCTION RISKS** because no database operations, migrations, API endpoints, or destructive logic are present.

However, this document **describes features that WILL create data safety risks when implemented**. I'm auditing the **architectural decisions and feature specifications** for patterns that could lead to data loss in production.

---

## FINDINGS

### 🟡 MEDIUM SEVERITY FINDINGS

---

#### **FINDING M-1: Cascading Delete Risk in Client Account Architecture**

**Severity:** MEDIUM
**Data at Risk:** Workout history, progress data, social posts, achievements, order history
**Blast Radius:** All data for 1 client (potentially years of training history)
**Location:** Section 3 (Automated Client Onboarding), Two-Path Architecture

**What's Wrong:**

The document describes two client types:
- **SwanStudios Clients** (paid, full-service)
- **Move Fitness Clients** (free, progress-tracking only)

When implementing the database schema, there's a high risk that deleting a `User` record will cascade-delete all related data:

```
User (deleted)
  ├─ WorkoutLogs → CASCADE DELETE ❌
  ├─ Achievements → CASCADE DELETE ❌
  ├─ SocialPosts → CASCADE DELETE ❌
  ├─ Orders → CASCADE DELETE ❌
  ├─ Sessions → CASCADE DELETE ❌
  └─ ProgressData → CASCADE DELETE ❌
```

**Scenario:**
1. Sean accidentally clicks "Delete Client" instead of "Archive Client"
2. The system deletes the User record
3. Foreign key constraints with `ON DELETE CASCADE` wipe 2 years of workout logs, 47 achievements, 120 social posts, and $3,400 in order history
4. **Data is unrecoverable**

**Fix:**

When implementing the database schema, **NEVER use `ON DELETE CASCADE` for user-related tables**. Instead:

```sql
-- ❌ DANGEROUS
CREATE TABLE workout_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE  -- NEVER DO THIS
);

-- ✅ SAFE
CREATE TABLE workout_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,  -- Prevent deletion
  deleted_at TIMESTAMP NULL  -- Soft delete support
);
```

**Required Implementation Rules:**

1. **Soft Deletes Only** — Add `deleted_at` timestamp to `users` table
2. **Restrict Foreign Keys** — Use `ON DELETE RESTRICT` or `ON DELETE SET NULL` (never CASCADE)
3. **Archive Flow** — "Delete Client" button should set `deleted_at`, not call `User.destroy()`
4. **Admin Confirmation** — Any hard delete requires typing "DELETE" + client name + 2FA
5. **Backup Check** — Before any hard delete, verify last backup timestamp < 24 hours

```typescript
// ✅ SAFE deletion pattern
async archiveClient(clientId: number, adminId: number) {
  const client = await User.findByPk(clientId);
  if (!client) throw new Error('Client not found');

  // Count related records
  const workoutCount = await WorkoutLog.count({ where: { userId: clientId } });
  const orderCount = await Order.count({ where: { userId: clientId } });

  // Log the archive action
  await AuditLog.create({
    action: 'CLIENT_ARCHIVED',
    adminId,
    targetUserId: clientId,
    metadata: { workoutCount, orderCount }
  });

  // Soft delete (preserves all related data)
  await client.update({ deleted_at: new Date() });

  return { archived: true, dataPreserved: true };
}
```

---

#### **FINDING M-2: Session Package Deduction Race Condition**

**Severity:** MEDIUM
**Data at Risk:** Session counts, billing integrity
**Blast Radius:** 1 client per incident, but could affect many clients over time
**Location:** Section 7 (E-Commerce & Session Packages), "Automatic deduction" feature

**What's Wrong:**

The document states:

> "Automatic deduction — logging a workout decrements available sessions"

If two trainers (or the same trainer on two devices) log a workout for the same client simultaneously, a race condition can occur:

```
Time    Device A                    Device B                    Database
----    --------                    --------                    --------
T0      Read: sessions_remaining=5  Read: sessions_remaining=5  sessions=5
T1      Calculate: 5-1=4            Calculate: 5-1=4            sessions=5
T2      Write: sessions_remaining=4                             sessions=4
T3                                  Write: sessions_remaining=4 sessions=4 ❌
```

**Result:** Client had 5 sessions, two workouts were logged, but they still have 4 sessions remaining (should be 3). Client gets a free session.

**Reverse scenario (worse):** If the logic is `UPDATE sessions_remaining = sessions_remaining - 1`, but the read happens in a separate query, the same race condition could **double-deduct** sessions.

**Fix:**

Use **atomic database operations** with row-level locking:

```typescript
// ❌ DANGEROUS (read-then-write race condition)
async logWorkout(clientId: number, workoutData: any) {
  const client = await User.findByPk(clientId);
  if (client.sessions_remaining <= 0) throw new Error('No sessions remaining');

  await WorkoutLog.create({ userId: clientId, ...workoutData });
  await client.update({ sessions_remaining: client.sessions_remaining - 1 }); // RACE CONDITION
}

// ✅ SAFE (atomic decrement with row lock)
async logWorkout(clientId: number, workoutData: any, transaction?: Transaction) {
  const t = transaction || await sequelize.transaction();

  try {
    // Lock the user row for update
    const client = await User.findByPk(clientId, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!client) throw new Error('Client not found');
    if (client.sessions_remaining <= 0) throw new Error('No sessions remaining');

    // Atomic decrement (database-level operation)
    await User.decrement('sessions_remaining', {
      by: 1,
      where: { id: clientId },
      transaction: t
    });

    // Create workout log
    const workout = await WorkoutLog.create({
      userId: clientId,
      ...workoutData
    }, { transaction: t });

    if (!transaction) await t.commit();
    return workout;

  } catch (error) {
    if (!transaction) await t.rollback();
    throw error;
  }
}
```

**Additional Safeguards:**

1. **Idempotency Keys** — Voice logs should include a unique `logId` to prevent duplicate submissions
2. **Session Ledger** — Create a `session_transactions` table (append-only) to audit every increment/decrement
3. **Negative Balance Prevention** — Add database constraint: `CHECK (sessions_remaining >= 0)`

```sql
ALTER TABLE users
ADD CONSTRAINT sessions_non_negative
CHECK (sessions_remaining >= 0);
```

---

#### **FINDING M-3: AI Training Data Retention Risk**

**Severity:** MEDIUM
**Data at Risk:** Workout logs, health data, pain entries (used for AI training)
**Blast Radius:** All clients who consented to AI features
**Location:** Section "AI Privacy Architecture (Identity-Blind)"

**What's Wrong:**

The document states:

> "Client names, emails, and phone numbers are stripped before the AI sees them"

This implies that **workout data, pain entries, and health information ARE sent to AI providers** (Gemini, OpenAI, Anthropic, Venice). The document does not specify:

1. **Data retention policies** — How long do AI providers keep the training data?
2. **Model training opt-out** — Are API calls made with `training=false` flags?
3. **Data deletion on account closure** — If a client deletes their account, is their data purged from AI provider logs?

**Scenario:**
1. Client Jackie logs 200 workouts over 2 years, including pain entries ("left knee discomfort")
2. Every voice log is sent to Gemini Flash for transcription
3. Jackie requests account deletion under GDPR/CCPA
4. SwanStudios deletes her database records
5. **But Gemini still has 200 transcripts of her workout data in their training corpus**

**Fix:**

When implementing AI integrations, enforce these rules:

```typescript
// ✅ SAFE AI API call pattern
async transcribeWorkoutAudio(audioBuffer: Buffer, clientId: number) {
  // 1. Check consent
  const client = await User.findByPk(clientId, {
    attributes: ['ai_consent_version', 'ai_consent_date']
  });

  if (!client.ai_consent_version) {
    throw new Error('Client has not consented to AI features');
  }

  // 2. Strip identity (already done per doc)
  const anonymizedContext = `[Client #${clientId}]`;

  // 3. Call AI with training opt-out
  const response = await gemini.transcribe(audioBuffer, {
    context: anonymizedContext,
    // CRITICAL: Opt out of training data retention
    training: false,  // OpenAI
    model_training: false,  // Anthropic
    data_retention: 'zero',  // Gemini (if supported)
  });

  // 4. Log the AI call for audit
  await AICallLog.create({
    userId: clientId,
    provider: 'gemini',
    feature: 'workout_transcription',
    timestamp: new Date(),
    data_sent_hash: crypto.createHash('sha256').update(audioBuffer).digest('hex')
  });

  return response;
}
```

**Required Documentation:**

Add to the platform vision:

```markdown
### AI Data Retention Policy

1. **Training Opt-Out:** All AI API calls use provider-specific flags to prevent model training on client data
2. **30-Day Purge:** AI provider logs are requested to be deleted after 30 days (where supported)
3. **Account Deletion:** When a client deletes their account, SwanStudios submits data deletion requests to all AI providers used during their tenure
4. **Audit Trail:** Every AI call is logged with a hash of the data sent, enabling compliance verification
5. **Provider Selection:** Only AI providers with GDPR/CCPA-compliant data handling are used
```

---

### 🟢 LOW SEVERITY FINDINGS

---

#### **FINDING L-1: Move Fitness Client Billing Exclusion Logic**

**Severity:** LOW
**Data at Risk:** Revenue integrity (charging clients who shouldn't be charged)
**Blast Radius:** Move Fitness clients only (subset of user base)
**Location:** Section 3, Path B (Move Fitness Clients)

**What's Wrong:**

The document states:

> "Move Fitness clients use SwanStudios for progress tracking — they are NEVER charged through the platform. This is a critical business rule."

The exclusion logic relies on a `clientSource: 'move_fitness'` flag. If this flag is:
- Not set correctly during onboarding
- Accidentally changed by an admin
- Not checked in the billing code

...then a Move Fitness client could be charged for a session package.

**Scenario:**
1. Sean creates a Move Fitness client account
2. Due to a UI bug, `clientSource` is set to `'swanstudios'` instead of `'move_fitness'`
3. Client purchases a session package (shouldn't be possible)
4. Stripe charges their card
5. **Client is angry, Sean has to refund, trust is damaged**

**Fix:**

Implement **multiple layers of defense**:

```typescript
// 1. Database constraint
// migration: add-client-source-constraint.ts
await queryInterface.addConstraint('users', {
  fields: ['client_source'],
  type: 'check',
  where: {
    client_source: ['swanstudios', 'move_fitness']
  }
});

// 2. Middleware guard on checkout routes
app.post('/api/checkout', requireAuth, async (req, res) => {
  const user = await User.findByPk(req.user.id);

  // CRITICAL: Block Move Fitness clients from checkout
  if (user.client_source === 'move_fitness') {
    return res.status(403).json({
      error: 'Move Fitness clients cannot purchase packages through SwanStudios',
      message: 'Your sessions are managed by Move Fitness gym. Contact your trainer for billing questions.'
    });
  }

  // Proceed with Stripe checkout...
});

// 3. UI-level prevention
// ClientDashboard.tsx
{user.clientSource === 'move_fitness' && (
  <Alert severity="info">
    Your training is provided through Move Fitness gym.
    Session packages are not available for purchase.
  </Alert>
)}

{user.clientSource === 'swanstudios' && (
  <Button onClick={handlePurchasePackage}>
    Buy Session Package
  </Button>
)}

// 4. Admin dashboard visual indicator
// AdminClientList.tsx
{client.client_source === 'move_fitness' && (
  <Badge
    color="gilded-fern"
    icon={<GymIcon />}
    tooltip="Move Fitness client — billing disabled"
  >
    Move Fitness
  </Badge>
)}
```

**Test Coverage Required:**

```typescript
describe('Move Fitness Billing Protection', () => {
  it('should block checkout API for move_fitness clients', async () => {
    const client = await createMoveFitnessClient();
    const response = await request(app)
      .post('/api/checkout')
      .set('Authorization', client.token)
      .send({ packageId: 1 });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Move Fitness');
  });

  it('should allow checkout for swanstudios clients', async () => {
    const client = await createSwanStudiosClient();
    const response = await request(app)
      .post('/api/checkout')
      .set('Authorization', client.token)
      .send({ packageId: 1 });

    expect(response.status).toBe(200);
  });
});
```

---

#### **FINDING L-2: SWAN Invite Code Collision Risk**

**Severity:** LOW
**Data at Risk:** Account activation integrity
**Blast Radius:** 1 client per collision (low probability but non-zero)
**Location:** Section 3, Path B, "SWAN-XXXX invite code" (Crystalline Link Protocol)

**What's Wrong:**

The document describes a **SWAN-XXXX invite code** system for Move Fitness clients to claim their accounts. If the code generation uses:
- Short codes (4 digits = 10,000 possible codes)
- Non-cryptographic randomness (`Math.random()`)
- No collision detection

...then two clients could receive the same code.

**Scenario:**
1. Sean creates an account for client "David" → generates code `SWAN-1234`
2. Sean creates an account for client "Sarah" → generates code `SWAN-1234` (collision)
3. David receives his QR code, scans it, enters `SWAN-1234`, sets his password
4. **David's login now activates Sarah's account** (or vice versa)
5. David sees Sarah's workout history, Sarah can't log in

**Fix:**

```typescript
// ❌ DANGEROUS (collision-prone)
function generateSwanCode() {
  const code = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
