# Fix Instructions — Code Quality Consensus

> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)
> Consensus: YES

---

# CEO Response — Round 2

## CONSENSUS REACHED ON COMPONENT COMMUNICATION

CTO, your performance analysis on React Context is **technically sound and accepted**. I was indeed overlooking the high-frequency re-render implications of live transcription state.

**CEO Final Decision on Issue #4:**
- ✅ **ACCEPT** your strict Context state isolation
- **ADD to Blueprint Section 3:**
  ```typescript
  // HIGH-FREQUENCY STATE: Local to EmbeddedAITerminal only
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // LOW-FREQUENCY STATE: Shared via AITerminalContext
  interface AITerminalContextState {
    pendingAction: AIActionResponse | null;
    setPendingAction: (action: AIActionResponse | null) => void;
  }
  ```
- **Rationale:** Prevents unnecessary re-renders of dashboard components while maintaining clean architecture
- **Performance Target:** Dashboard components re-render only when `pendingAction` changes (1-2x per voice command, not 10x per second)

This resolves Issue #4 completely. No Zustand needed, no performance thrashing.

---

## ❌ DISPUTED — Exercise RBAC Schema (Issue #5)

**Your Assessment:** The `rejected` status creates foreign key orphaning risks when admins reject exercises already used in workout logs.

**CEO Response:** You are **100% correct about the problem** but your proposed solution creates a worse UX and architectural mess. Let me explain why, then propose a better hybrid.

### Problems with Your "Visibility + Merge" Approach:

1. **Admin Cognitive Overload:** Your "Merge" function requires admins to manually map duplicate exercises to canonical ones. With 50 trainers creating variations, this becomes a full-time job. "Is 'Goblet Squat (Kettlebell)' the same as 'KB Goblet Squat'?" — this requires domain expertise admins may not have.

2. **Dangerous Bulk Updates:** Your merge transaction (`UPDATE workout_log_entries SET exercise_id = X WHERE exercise_id = Y`) is a **data integrity nightmare**. If an admin accidentally merges "Barbell Back Squat" with "Goblet Squat" (similar names, different movements), you've just corrupted months of training data with no rollback mechanism.

3. **Missing the Real Problem:** The issue isn't rejection — it's that we're allowing exercises to be **used in production workouts** before quality control. Your solution still allows trainers to log workouts with unvetted exercises, then tries to clean up the mess later.

### CEO Counter-Proposal: "Draft Mode" Architecture

**Core Principle:** Separate **creation** from **production use**.

```sql
-- Modified Schema
ALTER TABLE exercises ADD COLUMN state ENUM('draft', 'active', 'archived') DEFAULT 'draft';
ALTER TABLE exercises ADD COLUMN scope ENUM('global', 'trainer') DEFAULT 'trainer';
ALTER TABLE exercises ADD COLUMN created_by_trainer_id INT NULL;
ALTER TABLE exercises ADD COLUMN promoted_from_draft_id INT NULL; -- For audit trail
```

**Workflow:**

1. **Trainer Creates Exercise:**
   - State: `draft`, Scope: `trainer`
   - **Immediately usable** in workout planning UI (form builders, AI terminal)
   - **BLOCKED** from being logged in actual workout sessions (enforced at API level)
   - UI shows draft badge: "⚠️ Draft Exercise — Submit for Approval to Use in Workouts"

2. **Trainer Submits for Approval:**
   - Trainer clicks "Submit for Approval" when ready
   - Exercise remains in `draft` state but flagged for admin review

3. **Admin Reviews:**
   - **Approve:** 
     - If unique: Change state to `active`, scope to `global`
     - If duplicate: Show suggested canonical exercise, trainer must manually remap in their workout plans (NOT in historical logs, because none exist yet)
   - **Request Changes:** Admin adds feedback, returns to trainer
   - **Archive:** State changes to `archived` (soft delete), never used in production so no orphaning risk

4. **Emergency Override:**
   - For live training sessions, trainers can use a "Quick Add" that creates `state: active, scope: trainer` exercises
   - These bypass approval but remain trainer-scoped
   - Admins can later review and promote/merge these as needed

**Why This is Superior:**

| Concern | Your Solution | CEO Solution |
|---------|---------------|--------------|
| Historical data integrity | ⚠️ Risky bulk updates | ✅ No production use until approved |
| Admin workload | 🔴 Manual merge mapping | 🟢 Simple approve/reject |
| Trainer workflow | ✅ Can create freely | ✅ Can create + emergency override |
| Data corruption risk | 🔴 High (wrong merge) | 🟢 Minimal (drafts isolated) |
| Audit trail | ⚠️ Merge history unclear | ✅ `promoted_from_draft_id` tracks lineage |

**API Enforcement:**
```typescript
// POST /api/workout-sessions/:id/log-exercise
if (exercise.state === 'draft') {
  throw new ValidationError(
    "Cannot log draft exercises. Please submit for approval first."
  );
}
```

### CTO, Here's My Ask:

I need you to acknowledge that:
1. **Preventing production use of unvetted exercises** is architecturally safer than allowing use + cleanup
2. The "draft mode" state machine is clearer than visibility + merge workflows
3. The emergency override satisfies your original concern about trainers being blocked mid-session

If you still believe the merge approach is necessary, provide a **specific scenario** where draft mode fails but your visibility+merge succeeds.

---

## 📋 Updated Status

| Issue | Status | Blocker? |
|-------|--------|----------|
| #1 Split-Brain Data | ✅ Resolved | No |
| #2 Migration Data Loss | ✅ Resolved | No |
| #3 Voice Latency | ✅ Resolved | No |
| #4 Component Communication | ✅ Resolved (Round 2) | No |
| #5 Exercise RBAC | 🔄 **Active Dispute** | **YES** |
| #6 TypeScript Safety | ✅ Resolved | No |

**2 rounds remaining.** We must finalize Issue #5 before implementation begins. The database schema depends on this decision.
