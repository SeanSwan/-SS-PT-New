/**
 * Backfill AI Consent Profiles — Default Deny
 * =============================================
 * Creates AiPrivacyProfile records for all existing client users
 * who do not yet have one. Sets aiEnabled = false (opt-in required).
 *
 * This implements the "default deny" rollout policy:
 *   - Existing users do NOT get AI features automatically
 *   - They must explicitly opt in via the consent screen
 *   - New users are prompted during onboarding (ConsentSection step)
 *
 * Usage:
 *   node backend/scripts/backfill-ai-consent-profiles.mjs
 *   node backend/scripts/backfill-ai-consent-profiles.mjs --dry-run
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */

import { initModels } from '../models/associations.mjs';
import sequelize from '../database.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfill() {
  console.log(`[AI Consent Backfill] Starting... ${DRY_RUN ? '(DRY RUN)' : ''}`);

  try {
    await sequelize.authenticate();
    console.log('[AI Consent Backfill] Database connected.');

    const models = await initModels();
    const { User, AiPrivacyProfile } = models;

    if (!AiPrivacyProfile) {
      console.error('[AI Consent Backfill] AiPrivacyProfile model not found. Run migrations first.');
      process.exit(1);
    }

    // Find all client users who do not have an AiPrivacyProfile
    const clientsWithoutProfile = await User.findAll({
      where: { role: 'client' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      include: [{
        model: AiPrivacyProfile,
        as: 'aiPrivacyProfile',
        required: false,
      }],
    });

    const needsBackfill = clientsWithoutProfile.filter(u => !u.aiPrivacyProfile);

    console.log(`[AI Consent Backfill] Total clients: ${clientsWithoutProfile.length}`);
    console.log(`[AI Consent Backfill] Already have profile: ${clientsWithoutProfile.length - needsBackfill.length}`);
    console.log(`[AI Consent Backfill] Need backfill: ${needsBackfill.length}`);

    if (needsBackfill.length === 0) {
      console.log('[AI Consent Backfill] Nothing to do.');
      process.exit(0);
    }

    if (DRY_RUN) {
      console.log('[AI Consent Backfill] DRY RUN — would create profiles for:');
      for (const user of needsBackfill) {
        console.log(`  - User #${user.id} (${user.email || 'no email'})`);
      }
      console.log('[AI Consent Backfill] DRY RUN complete. No changes made.');
      process.exit(0);
    }

    // Create profiles in a transaction
    const transaction = await sequelize.transaction();
    try {
      const records = needsBackfill.map(user => ({
        userId: user.id,
        aiEnabled: false,    // DEFAULT DENY — user must opt in
        consentVersion: null, // No consent given yet
        consentedAt: null,
        withdrawnAt: null,
      }));

      await AiPrivacyProfile.bulkCreate(records, {
        transaction,
        ignoreDuplicates: true, // Safety: skip if race condition
      });

      await transaction.commit();
      console.log(`[AI Consent Backfill] Created ${needsBackfill.length} profiles (aiEnabled=false).`);
      console.log('[AI Consent Backfill] Policy: default deny — users must opt in via consent screen.');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('[AI Consent Backfill] Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

backfill();
