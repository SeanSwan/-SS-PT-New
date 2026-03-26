# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.2s
> **Files:** docs/ai-workflow/blueprints/CLIENT-DETAIL-WIRING-BLUEPRINT.md
> **Generated:** 3/25/2026, 5:21:14 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CLIENT DETAIL WIRING BLUEPRINT
## SwanStudios Production SaaS Platform

**Auditor:** DATA SAFETY AUDITOR  
**Date:** 2024  
**Severity Scale:** CRITICAL | HIGH | MEDIUM | LOW  
**Status:** ⚠️ **MULTIPLE CRITICAL FINDINGS — DEPLOYMENT BLOCKED**

---

## ⚠️ EXECUTIVE SUMMARY

This blueprint describes architectural changes that will touch **core user data systems** including:
- Client records (Users table)
- Workout history (Sessions, WorkoutPlans)
- Biometric data (PainEntries, Measurements)
- Photo uploads (R2 storage)
- AI analysis results (JSONB fields)

**CRITICAL CONCERNS IDENTIFIED:**
1. **Database schema changes with no migration safety plan**
2. **Photo upload system with no data retention policy enforcement**
3. **AI analysis storage in JSONB with no validation**
4. **Component refactoring that could break existing data flows**
5. **No rollback plan for failed deployments**

---

## 🔴 CRITICAL FINDINGS

### FINDING #1: UNCONTROLLED DATABASE SCHEMA CHANGES
**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** All pain entries, client biometric history  
**Blast Radius:** ALL USERS with existing pain/injury data  
**File & Line:** Section 3b (Biometrics Tab), "Model: `PainEntry.mjs`"

**What's Wrong:**
The blueprint states:
> "Model: `PainEntry.mjs` | Add: `photoUrl` (STRING), `aiAnalysis` (JSONB), `correctiveExercises` (ARRAY of exercise IDs)"

**This is a schema-altering change with NO migration safety plan:**
- Adding columns to a production table with existing data
- No mention of `ALTER TABLE` transaction safety
- No mention of default values for existing rows
- No mention of nullable vs NOT NULL constraints
- **JSONB field with no validation schema = corrupt data risk**
- **ARRAY field with no foreign key validation = orphaned exercise references**

**If this goes wrong:**
- Migration could fail mid-execution, leaving table locked
- Existing pain entries could become unreadable if code expects new fields
- Rollback could fail if `down()` migration is missing
- Client injury history could be lost or corrupted

**Fix Required:**
```javascript
// migrations/YYYYMMDDHHMMSS-add-pain-photo-analysis.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add columns with NULL defaults (safe for existing data)
      await queryInterface.addColumn(
        'PainEntries',
        'photoUrl',
        {
          type: Sequelize.STRING(512),
          allowNull: true, // CRITICAL: must be nullable
          defaultValue: null
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'PainEntries',
        'aiAnalysis',
        {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: null,
          validate: {
            // CRITICAL: validate structure before save
            isValidAnalysis(value) {
              if (value && typeof value !== 'object') {
                throw new Error('aiAnalysis must be an object');
              }
              // Add schema validation here
            }
          }
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'PainEntries',
        'correctiveExercises',
        {
          type: Sequelize.ARRAY(Sequelize.INTEGER),
          allowNull: true,
          defaultValue: null
        },
        { transaction }
      );

      // CRITICAL: Add index for photo lookups
      await queryInterface.addIndex(
        'PainEntries',
        ['photoUrl'],
        {
          name: 'pain_entries_photo_url_idx',
          where: { photoUrl: { [Sequelize.Op.ne]: null } },
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // CRITICAL: Must have rollback plan
      await queryInterface.removeIndex(
        'PainEntries',
        'pain_entries_photo_url_idx',
        { transaction }
      );
      
      await queryInterface.removeColumn('PainEntries', 'correctiveExercises', { transaction });
      await queryInterface.removeColumn('PainEntries', 'aiAnalysis', { transaction });
      await queryInterface.removeColumn('PainEntries', 'photoUrl', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
```

**Additional Safety Requirements:**
1. **Pre-deployment backup:** Full `PainEntries` table dump
2. **Row count validation:** Migration must log before/after row counts
3. **Dry-run test:** Run migration on staging with production data clone
4. **Validation query:** After migration, verify all existing records still readable

---

### FINDING #2: PHOTO DELETION POLICY NOT ENFORCED
**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** User privacy, GDPR compliance, storage costs  
**Blast Radius:** ALL USERS uploading pain photos  
**File & Line:** Section 3b, "Photos stored in R2 with user-scoped access, auto-delete after 90 days configurable"

**What's Wrong:**
The blueprint mentions "auto-delete after 90 days configurable" but provides:
- **NO implementation plan**
- **NO cron job specification**
- **NO cascade delete logic** (what happens to `photoUrl` in database when R2 file is deleted?)
- **NO user consent flow** (GDPR requires explicit consent for photo storage)

**If this goes wrong:**
- Photos accumulate forever, violating GDPR "right to be forgotten"
- Storage costs spiral out of control
- Database has `photoUrl` pointing to deleted R2 objects (404 errors)
- User deletes account, but photos remain in R2 (privacy violation)

**Fix Required:**

**1. Database-side cascade delete:**
```javascript
// models/PainEntry.mjs

class PainEntry extends Model {
  static associate(models) {
    PainEntry.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE' // CRITICAL: delete pain entries when user deleted
    });
  }
}

// Add lifecycle hook
PainEntry.addHook('beforeDestroy', async (painEntry, options) => {
  // CRITICAL: Delete R2 photo before deleting DB record
  if (painEntry.photoUrl) {
    try {
      const key = painEntry.photoUrl.split('/').pop();
      await r2Client.deleteObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `pain-photos/${painEntry.userId}/${key}`
      });
      console.log(`[PainEntry] Deleted R2 photo: ${key}`);
    } catch (error) {
      console.error(`[PainEntry] Failed to delete R2 photo: ${error.message}`);
      // CRITICAL: Should this block the delete? Decide based on business rules
      if (options.transaction) {
        throw error; // Rollback transaction if photo delete fails
      }
    }
  }
});
```

**2. Scheduled cleanup job:**
```javascript
// jobs/cleanupExpiredPainPhotos.mjs

import { Op } from 'sequelize';
import { PainEntry } from '../models/index.mjs';
import { r2Client } from '../config/r2.mjs';

export async function cleanupExpiredPainPhotos() {
  const RETENTION_DAYS = parseInt(process.env.PAIN_PHOTO_RETENTION_DAYS || '90', 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  console.log(`[Cleanup] Deleting pain photos older than ${cutoffDate.toISOString()}`);

  const expiredEntries = await PainEntry.findAll({
    where: {
      photoUrl: { [Op.ne]: null },
      createdAt: { [Op.lt]: cutoffDate }
    },
    attributes: ['id', 'photoUrl', 'userId', 'createdAt']
  });

  let deletedCount = 0;
  let failedCount = 0;

  for (const entry of expiredEntries) {
    try {
      const key = entry.photoUrl.split('/').pop();
      
      // Delete from R2
      await r2Client.deleteObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `pain-photos/${entry.userId}/${key}`
      });

      // CRITICAL: Update DB record (don't delete entry, just remove photo reference)
      await entry.update({ 
        photoUrl: null,
        aiAnalysis: {
          ...entry.aiAnalysis,
          photoDeletedAt: new Date().toISOString(),
          photoDeletedReason: 'retention_policy'
        }
      });

      deletedCount++;
    } catch (error) {
      console.error(`[Cleanup] Failed to delete photo for PainEntry ${entry.id}: ${error.message}`);
      failedCount++;
    }
  }

  console.log(`[Cleanup] Deleted ${deletedCount} photos, ${failedCount} failures`);
  
  // CRITICAL: Alert if failure rate > 10%
  if (failedCount > 0 && (failedCount / expiredEntries.length) > 0.1) {
    // Send alert to ops team
    throw new Error(`High failure rate in photo cleanup: ${failedCount}/${expiredEntries.length}`);
  }

  return { deletedCount, failedCount };
}
```

**3. User consent flow:**
```typescript
// frontend: PainPhotoCapture.tsx

const [consentGiven, setConsentGiven] = useState(false);

// CRITICAL: Must show before photo upload
{!consentGiven && (
  <ConsentModal>
    <p>Pain position photos will be:</p>
    <ul>
      <li>Analyzed by AI for postural assessment</li>
      <li>Stored securely for {RETENTION_DAYS} days</li>
      <li>Automatically deleted after retention period</li>
      <li>Deleted immediately if you delete your account</li>
    </ul>
    <Checkbox onChange={(e) => setConsentGiven(e.target.checked)}>
      I consent to photo storage and AI analysis
    </Checkbox>
  </ConsentModal>
)}
```

---

### FINDING #3: AI ANALYSIS JSONB WITH NO VALIDATION
**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** Biometric analysis data, corrective exercise recommendations  
**Blast Radius:** ALL USERS using AI postural analysis  
**File & Line:** Section 3b, "AI Analysis Output Schema"

**What's Wrong:**
The blueprint shows a detailed JSON schema for AI analysis output, but:
- **NO validation before saving to database**
- **NO schema versioning** (what happens when AI model changes output format?)
- **NO error handling** if AI returns malformed data
- **Corrective exercises referenced by ID with no foreign key validation**

**If this goes wrong:**
- Corrupt JSON saved to database, breaks frontend rendering
- Exercise IDs reference non-existent exercises (orphaned references)
- Schema changes break old records (can't read historical data)
- AI returns `null` or error, but code saves it anyway

**Fix Required:**

**1. Validation schema (Zod):**
```typescript
// shared/schemas/aiPosturalAnalysis.schema.ts

import { z } from 'zod';

export const AIPosturalAnalysisSchema = z.object({
  schemaVersion: z.literal('1.0'), // CRITICAL: version for future migrations
  posturalAssessment: z.string().min(10).max(2000),
  likelyDysfunction: z.string().min(3).max(200),
  overactiveMuscles: z.array(z.string()).min(1).max(10),
  underactiveMuscles: z.array(z.string()).min(1).max(10),
  correctiveProtocol: z.array(z.object({
    phase: z.enum(['SMR', 'Static Stretch', 'Activation', 'Integration']),
    exercise: z.string(),
    exerciseId: z.number().int().positive()
  })).min(1).max(20),
  severity: z.enum(['mild', 'moderate', 'severe']),
  safeToTrain: z.boolean(),
  modifications: z.string().max(1000).optional(),
  analyzedAt: z.string().datetime(),
  modelVersion: z.string() // Track which AI model version generated this
});

export type AIPosturalAnalysis = z.infer<typeof AIPosturalAnalysisSchema>;
```

**2. Backend validation:**
```javascript
// services/aiPosturalAnalysisService.mjs

import { AIPosturalAnalysisSchema } from '../shared/schemas/aiPosturalAnalysis.schema.js';
import { Exercise } from '../models/index.mjs';

export async function analyzePosturalPain(painEntryId, photoUrl, region, painLevel) {
  let aiResponse;
  
  try {
    // Call AI vision model
    aiResponse = await callAIVisionModel(photoUrl, region, painLevel);
    
    // CRITICAL: Validate response structure
    const validatedAnalysis = AIPosturalAnalysisSchema.parse({
      ...aiResponse,
      schemaVersion: '1.0',
      analyzedAt: new Date().toISOString(),
      modelVersion: process.env.AI_MODEL_VERSION || 'unknown'
    });

    // CRITICAL: Verify all exercise IDs exist in database
    const exerciseIds = validatedAnalysis.correctiveProtocol.map(p => p.exerciseId);
    const existingExercises = await Exercise.findAll({
      where: { id: exerciseIds },
      attributes: ['id']
    });

    if (existingExercises.length !== exerciseIds.length) {
      const foundIds = existingExercises.map(e => e.id);
      const missingIds = exerciseIds.filter(id => !foundIds.includes(id));
      throw new Error(`AI referenced non-existent exercises: ${missingIds.join(', ')}`);
    }

    // CRITICAL: Save with transaction
    const transaction = await sequelize.transaction();
    
    try {
      const painEntry = await PainEntry.findByPk(painEntryId, { transaction });
      
      if (!painEntry) {
        throw new Error(`PainEntry ${painEntryId} not found`);
      }

      await painEntry.update({
        aiAnalysis: validatedAnalysis,
        correctiveExercises: exerciseIds
      }, { transaction });

      await transaction.commit();
      
      return validatedAnalysis;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error(`[AI Analysis] Failed for PainEntry ${painEntryId}:`, error);
    
    // CRITICAL: Save error state to database (don't leave it hanging)
    await PainEntry.update({
      aiAnalysis: {
        schemaVersion: '1.0',
        error: true,
        errorMessage: error.message,
        errorAt: new Date().toISOString()
      }
    }, {
      where: { id: painEntryId }
    });

    throw error;
  }
}
```

---

### FINDING #4: COMPONENT REFACTORING WITHOUT DATA FLOW AUDIT
**Severity:** 🔴 **CRITICAL**  
**Data at Risk:** Workout plans, session logs, client progress data  
**Blast Radius:** ALL USERS with active workout plans  
**File & Line

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
