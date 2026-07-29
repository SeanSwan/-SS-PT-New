/**
 * ============================================================================
 * FILE: clientOnboardRoutes.mjs
 * PURPOSE: AI-powered client onboarding — single transactional endpoint
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29 (11-Brain Consensus: intent-parser architecture)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Provides POST /api/clients/onboard — a single transactional endpoint that
 *   creates a User + ClientProgress + ClientTrainerAssignment + SWAN-XXXXXXXX claim
 *   code in one atomic database transaction. Designed to be called after the AI
 *   returns an ONBOARD_CLIENT_INTENT JSON from the chat interface.
 *
 * HOW IT FITS IN THE APP:
 *   AI Chat → parses trainer speech into ONBOARD_CLIENT_INTENT →
 *   Frontend sends structured JSON here → Backend creates all records atomically →
 *   Returns claim code + claim link for trainer to share with client.
 *
 * KEY DECISIONS:
 *   - AI is intent parser only (no PII in AI context)
 *   - Single transaction prevents orphan records
 *   - Claim token uses SHA-256 (O(1) lookup, not bcrypt)
 *   - Tier detection from clientSource field, not AI inference
 *   - Non-fatal sub-records (ClientProgress, notes) wrapped in inner try/catch
 */

import express from 'express';
import crypto from 'crypto';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { getUser, getClientProgress } from '../models/index.mjs';
import { generateClaimToken } from '../services/claimTokenService.mjs';
import {
  CLIENT_SOURCES,
  NON_DEDUCTING_CLIENT_SOURCES,
  normalizeClientSource,
  normalizePaidSessionCount,
} from '../services/sessionBillingPolicy.mjs';
import {
  buildClientOnboardStubEmail,
  normalizeClientOnboardEmailInput,
} from '../services/clientOnboardIdentityService.mjs';
import { buildClientOnboardAccessHandoff } from '../services/clientOnboardAccessHandoffService.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const ALLOWED_CLIENT_ONBOARD_SOURCES = CLIENT_SOURCES;

export const isAllowedClientOnboardSource = (clientSource) =>
  ALLOWED_CLIENT_ONBOARD_SOURCES.has(normalizeClientSource(clientSource, null));

export const getClientOnboardAvailableSessions = ({ clientSource, availableSessions }) => {
  if (NON_DEDUCTING_CLIENT_SOURCES.has(clientSource)) return 0;
  return normalizePaidSessionCount(availableSessions);
};

export const getClientOnboardSuccessMessage = (clientSource) => {
  const source = normalizeClientSource(clientSource);
  if (source === 'move_fitness') {
    return 'Client onboarded successfully (Move Fitness - free tracking)';
  }
  if (source === 'external') {
    return 'Client onboarded successfully (External - free tracking)';
  }
  return 'Client onboarded successfully (SwanStudios - paid sessions)';
};

// ─────────────────────────────────────────────────────────────
// SECTION: Username Generation
// PURPOSE: Create unique username from firstName + lastName + random suffix
// WHY: Avoids collision while keeping usernames human-readable
// ─────────────────────────────────────────────────────────────

/**
 * Generate a candidate username like "liz.movefit.a7x3".
 * Retries up to maxAttempts if username already exists.
 * @param {string} firstName
 * @param {string} lastName
 * @param {Object} User - Sequelize User model
 * @param {Object} transaction - active Sequelize transaction
 * @param {number} maxAttempts - retry limit (default 5)
 * @returns {Promise<string>} unique username
 */
async function generateUniqueUsername(firstName, lastName, User, transaction, maxAttempts = 5) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = crypto.randomBytes(2).toString('hex'); // 4 hex chars
    const candidate = `${base}.${suffix}`;

    const existing = await User.findOne({
      where: { username: candidate },
      attributes: ['id'],
      transaction
    });

    if (!existing) return candidate;
  }

  // Fallback: use timestamp to guarantee uniqueness
  return `${base}.${Date.now().toString(36)}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Account Seed Password Generation
// PURPOSE: Create a random server-only password for claimable stub accounts
// ─────────────────────────────────────────────────────────────

function generateAccountSeedPassword() {
  // 12-char alphanumeric, URL-safe
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

// ─────────────────────────────────────────────────────────────
// SECTION: POST / — Onboard Client (Transactional)
// PURPOSE: Create User + optional sub-records in a single transaction
// WHY: Atomic creation prevents orphan records on partial failure
// ─────────────────────────────────────────────────────────────

router.post('/', protect, trainerOrAdminOnly, async (req, res) => {
  const trainerId = req.user.id;
  let transaction;

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      clientSource,
      healthConcerns,
      fitnessGoal,
      trainingExperience,
      trainerNotes,
      assignToSelf = true,
      generateClaimCode = true,
      availableSessions = 0
    } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'firstName and lastName are required'
      });
    }

    const normalizedClientSource = normalizeClientSource(clientSource, null);

    if (!normalizedClientSource || !isAllowedClientOnboardSource(normalizedClientSource)) {
      return res.status(400).json({
        success: false,
        message: 'clientSource is required and must be "swanstudios", "move_fitness", or "external"'
      });
    }

    const User = getUser();

    // ── Check email uniqueness (if provided) ────────────────
    const normalizedEmail = normalizeClientOnboardEmailInput(email);
    const resolvedEmail = normalizedEmail || buildClientOnboardStubEmail({
      firstName,
      lastName,
      token: crypto.randomBytes(3).toString('hex'),
    });

    const existingUser = await User.findOne({
      where: { email: resolvedEmail },
      attributes: ['id']
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user with email "${resolvedEmail}" already exists`
      });
    }

    // ── Begin Transaction ───────────────────────────────────
    transaction = await sequelize.transaction();

    // 1. Generate unique username
    const username = await generateUniqueUsername(firstName, lastName, User, transaction);

    // 2. Generate server-only account seed password (User model beforeCreate hook handles hashing)
    const accountSeedPassword = generateAccountSeedPassword();

    // 3. Generate claim token (if requested)
    let claimData = null;
    if (generateClaimCode) {
      claimData = generateClaimToken();
    }

    // 4. Create User record
    const newUser = await User.create({
      firstName,
      lastName,
      email: resolvedEmail,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      username,
      password: accountSeedPassword,
      role: 'client',
      clientSource: normalizedClientSource,
      forcePasswordChange: true,
      accountStatus: generateClaimCode ? 'stub' : 'active',
      availableSessions: getClientOnboardAvailableSessions({ clientSource: normalizedClientSource, availableSessions }),
      healthConcerns: healthConcerns || null,
      fitnessGoal: fitnessGoal || null,
      trainingExperience: trainingExperience || null,
      isActive: true,
      isOnboardingComplete: false,
      claimTokenHash: claimData?.hash || null,
      claimTokenExpires: claimData?.expires || null,
    }, { transaction });

    // 5. Non-fatal: Create ClientProgress record
    //    SAVEPOINT is load-bearing: without it, a failure here aborts the WHOLE transaction
    //    (SQLSTATE 25P02) and the later commit() silently degrades to ROLLBACK — the caller
    //    still gets 201 while nothing was persisted. "Non-fatal" is only true with a savepoint.
    await sequelize.query('SAVEPOINT sp_client_progress', { transaction });
    try {
      const [tableCheck] = await sequelize.query(
        `SELECT to_regclass('client_progress') AS exists`,
        { transaction }
      );
      if (tableCheck?.[0]?.exists) {
        const ClientProgress = getClientProgress();
        await ClientProgress.create({
          userId: newUser.id,
          currentPhase: 1,
          currentWeight: null,
          bodyFatPercentage: null,
        }, { transaction });
      }
    } catch (cpError) {
      await sequelize.query('ROLLBACK TO SAVEPOINT sp_client_progress', { transaction });
      logger.warn(`[ClientOnboard] Non-fatal: ClientProgress creation failed for user ${newUser.id}:`, cpError.message);
    }

    // 6. If assignToSelf: Create ClientTrainerAssignment via raw SQL
    //    Table uses QUOTED camelCase columns ("clientId", "trainerId", "assignedBy"), verified
    //    against information_schema. The old snake_case list threw "column client_id does not exist".
    let assignedTrainer = null;
    if (assignToSelf) {
      await sequelize.query('SAVEPOINT sp_trainer_assignment', { transaction });
      try {
        const [tableCheck] = await sequelize.query(
          `SELECT to_regclass('client_trainer_assignments') AS exists`,
          { transaction }
        );
        if (tableCheck?.[0]?.exists) {
          await sequelize.query(
            `INSERT INTO client_trainer_assignments ("clientId", "trainerId", "assignedBy", status, "createdAt", "updatedAt")
             VALUES (:clientId, :trainerId, :assignedBy, 'active', NOW(), NOW())`,
            {
              replacements: {
                clientId: newUser.id,
                trainerId,
                assignedBy: trainerId,
              },
              transaction
            }
          );
          assignedTrainer = {
            id: req.user.id,
            firstName: req.user.firstName || req.user.username,
            lastName: req.user.lastName || ''
          };
        }
      } catch (assignError) {
        await sequelize.query('ROLLBACK TO SAVEPOINT sp_trainer_assignment', { transaction });
        logger.warn(`[ClientOnboard] Non-fatal: Assignment creation failed for user ${newUser.id}:`, assignError.message);
      }
    }

    // 7. Non-fatal: Create trainer note via raw SQL if table exists
    //    Columns are QUOTED camelCase. noteType is enum_client_notes_noteType, whose only labels
    //    are observation|red_flag|achievement|concern|general — 'onboarding' is NOT a member and
    //    threw even after the column names were corrected. 'general' is the model's own default.
    if (trainerNotes) {
      await sequelize.query('SAVEPOINT sp_client_note', { transaction });
      try {
        const [tableCheck] = await sequelize.query(
          `SELECT to_regclass('client_notes') AS exists`,
          { transaction }
        );
        if (tableCheck?.[0]?.exists) {
          await sequelize.query(
            `INSERT INTO client_notes ("userId", "trainerId", "noteType", content, "createdAt", "updatedAt")
             VALUES (:userId, :trainerId, 'general', :content, NOW(), NOW())`,
            {
              replacements: {
                userId: newUser.id,
                trainerId,
                content: trainerNotes,
              },
              transaction
            }
          );
        }
      } catch (noteError) {
        await sequelize.query('ROLLBACK TO SAVEPOINT sp_client_note', { transaction });
        logger.warn(`[ClientOnboard] Non-fatal: Note creation failed for user ${newUser.id}:`, noteError.message);
      }
    }

    // ── Commit Transaction ──────────────────────────────────
    await transaction.commit();
    transaction = null;

    logger.info(`[ClientOnboard] Client created: ${resolvedEmail} (source: ${normalizedClientSource}) by trainer ${trainerId}`);

    // ── Build Response ──────────────────────────────────────
    const isMoveFitness = normalizedClientSource === 'move_fitness';
    const isFreeTracking = NON_DEDUCTING_CLIENT_SOURCES.has(normalizedClientSource);
    const frontendUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\/+$/, '');
    const accessHandoff = await buildClientOnboardAccessHandoff({ user: newUser, claimData, frontendUrl });
    const responseData = {
      client: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        username: newUser.username,
        clientSource: newUser.clientSource,
        availableSessions: newUser.availableSessions,
        accountStatus: newUser.accountStatus,
        role: newUser.role,
      },
      ...accessHandoff,
      assignedTrainer,
      isMoveFitness,
      isFreeTracking,
    };
    return res.status(201).json({
      success: true,
      message: getClientOnboardSuccessMessage(normalizedClientSource),
      data: responseData,
    });

  } catch (error) {
    // Rollback on any unhandled error
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.error('[ClientOnboard] Rollback failed:', rollbackError.message);
      }
    }

    logger.error('[ClientOnboard] Onboard failed:', error.message, error.stack);

    // Handle Sequelize validation errors specifically
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.errors?.map(e => e.message).join(', ') || error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to onboard client. Please try again.',
    });
  }
});

export default router;
