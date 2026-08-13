// backend/controllers/onboardingController.mjs
import { randomBytes } from 'node:crypto';
import User from '../models/User.mjs';
import ClientOnboardingQuestionnaire from '../models/ClientOnboardingQuestionnaire.mjs';
import sequelize from '../database.mjs';
import { triggerSequence } from '../services/automationService.mjs';
import { generateChallengesFromGoals } from '../services/gamification/goalChallengeService.mjs';
import { transformQuestionnaireToMasterPrompt } from '../services/onboardingMasterPromptBuilder.mjs';
import { computeDerivedFields } from '../utils/onboardingHelpers.mjs';
import logger from '../utils/logger.mjs';
import { buildOnboardingResetLinkHandoff } from '../services/onboardingResetHandoffService.mjs';
import { resolveOnboardingName } from '../utils/onboardingNameContract.mjs';
import {
  parseHeightInches,
  parseOptionalFloat,
  persistCompletedOnboardingQuestionnaire,
} from '../services/onboardingCompletionPersistenceService.mjs';

export { transformQuestionnaireToMasterPrompt };

const parsePositiveUserId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const isClientSelfOnboardingRole = (role) => role === 'client' || role === 'user';

/**
 * Onboarding Controller
 * =====================
 * Handles client onboarding questionnaire data and transforms it into
 * Master Prompt JSON (v3.0 schema) for AI-powered coaching.
 *
 * POST /api/onboarding - Creates/updates client with complete master prompt
 */

/**
 * Generate the preferred anonymous client alias for AI/privacy flows.
 * A caller-provided alias takes precedence; otherwise we fall back to
 * the numeric Client #ID format.
 *
 * @deprecated Use clientId directly. Kept for backward compat in API responses.
 */
export const generateSpiritName = (formData = {}, userId) => {
  const preferredAlias = typeof formData.preferredAlias === 'string'
    ? formData.preferredAlias.trim()
    : '';

  if (preferredAlias) {
    return preferredAlias;
  }

  return userId ? `Client #${userId}` : 'Client';
};

/**
 * POST /api/onboarding
 * Create or update a client with complete onboarding data
 */
export const createClientOnboarding = async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields.
    // Field-SPECIFIC on purpose: the previous message listed all three fields on
    // any failure, so a caller could not tell which one it got wrong — and the
    // staff wizard, which sends firstName/lastName, was told it was missing a
    // `fullName` it has no input for. Errors name the field, never the value.
    const resolvedName = resolveOnboardingName(formData);
    if (!resolvedName.ok) {
      return res.status(400).json({
        success: false,
        error: `Missing required field: name — ${resolvedName.reason}`
      });
    }

    if (!formData.email) {
      return res.status(400).json({ success: false, error: 'Missing required field: email' });
    }

    if (!formData.primaryGoal) {
      return res.status(400).json({ success: false, error: 'Missing required field: primaryGoal' });
    }

    // Downstream code (master prompt, notifications, automation payloads) reads
    // formData.fullName. Normalize it once here so every later reference is fed
    // the same derived value regardless of which shape arrived.
    formData.fullName = resolvedName.fullName;

    // Transform questionnaire data to Master Prompt JSON
    const masterPromptJson = transformQuestionnaireToMasterPrompt(formData, null);

    // Check if user already exists
    let user = await User.findOne({ where: { email: formData.email } });

    if (user) {
      // SECURITY (authz sweep 2026-08-04): this path keys on a BODY-SUPPLIED email and used to
      // overwrite whatever account matched — including `role: 'client'`. Any trainer could post
      // an admin's email and (a) demote that admin (protect re-reads role from the DB per
      // request, so it took effect on their very next call, no token rotation needed) and
      // (b) overwrite their name/phone/DOB/gender/weight/height. Staff accounts are now
      // off-limits to this client-onboarding endpoint entirely.
      // Two independent refusals, both answered with the SAME 409 body so this endpoint is
      // not an account-enumeration oracle (Kimi review: a staff-specific 403 told any trainer
      // which emails belong to staff):
      //   (a) staff accounts are never onboardable as clients;
      //   (b) an existing client may only be overwritten by an admin or by a trainer with an
      //       ACTIVE assignment to them. Without this, any trainer could overwrite any
      //       client's name/phone/DOB/gender/weight/height — cross-tenant PII tampering on
      //       minors, and a phone overwrite is a step toward SMS-based account recovery abuse.
      const isStaffAccount = user.role === 'admin' || user.role === 'trainer';
      let mayOverwrite = req.user?.role === 'admin';
      if (!mayOverwrite && !isStaffAccount && req.user?.role === 'trainer') {
        const { ClientTrainerAssignment } = await import('../models/index.mjs')
          .then((m) => m.getAllModels());
        const assignment = ClientTrainerAssignment
          ? await ClientTrainerAssignment.findOne({
              where: { clientId: user.id, trainerId: req.user.id, status: 'active' },
            })
          : null;
        mayOverwrite = Boolean(assignment);
      }

      if (isStaffAccount || !mayOverwrite) {
        logger.warn('[onboarding] refused overwrite of an existing account', {
          actorId: req.user?.id,
          actorRole: req.user?.role,
          targetUserId: user.id,
          reason: isStaffAccount ? 'staff-account' : 'no-active-assignment',
        });
        return res.status(409).json({
          success: false,
          message: 'An account already exists for that email. Link the existing account instead of re-onboarding it.',
        });
      }

      // Generate anonymous alias using client ID
      const anonymousAlias = generateSpiritName(formData, user.id);

      // Update existing user
      await user.update({
        firstName: resolvedName.firstName,
        lastName: resolvedName.lastName,
        phone: formData.phone,
        // Only promote a plain signup into a client; never rewrite an existing role.
        role: user.role === 'user' ? 'client' : user.role,
        masterPromptJson: masterPromptJson,
        spiritName: anonymousAlias, // Store client ID alias (replaces spirit name)
        // Update other client-specific fields
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        weight: parseOptionalFloat(formData.currentWeight, user.weight),
        height: parseHeightInches(formData, user.height),
        fitnessGoal: formData.primaryGoal,
        isOnboardingComplete: true
      });

      await persistCompletedOnboardingQuestionnaire({
        userId: user.id,
        createdBy: req.user?.id || null,
        formData,
      });

      // Also update/create PII record
      const clientId = `PT-${String(user.id).padStart(5, '0')}`;
      await sequelize.query(`
        INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, privacy_level, "createdAt", "updatedAt")
        VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (client_id) DO UPDATE SET
          real_name = EXCLUDED.real_name,
          spirit_name = EXCLUDED.spirit_name,
          "updatedAt" = CURRENT_TIMESTAMP
      `, {
        replacements: {
          clientId: clientId,
          realName: formData.fullName,
          spiritName: anonymousAlias
        }
      });

      const resetHandoff = user.forcePasswordChange === true
        ? await buildOnboardingResetLinkHandoff(user)
        : {};

      return res.status(200).json({
        success: true,
        message: 'Client onboarding updated successfully',
        data: {
          userId: user.id,
          clientId: `PT-${String(user.id).padStart(5, '0')}`,
          email: user.email,
          ...resetHandoff,
          masterPromptCreated: true
        }
      });
    } else {
      // Create new user
      // Generate a server-only seed password; access is handed off through reset links
      const accountSeedPassword = `Seed${randomBytes(12).toString('base64url')}!A1`;

      user = await User.create({
        firstName: resolvedName.firstName,
        lastName: resolvedName.lastName,
        email: formData.email,
        username: formData.email.split('@')[0], // Use email prefix as username
        password: accountSeedPassword,
        forcePasswordChange: true,
        phone: formData.phone,
        role: 'client',
        masterPromptJson: masterPromptJson,
        // Client-specific fields
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        weight: parseOptionalFloat(formData.currentWeight),
        height: parseHeightInches(formData),
        fitnessGoal: formData.primaryGoal,
        isOnboardingComplete: true,
        isActive: true
      });

      // Now set the anonymous alias using the auto-generated user ID
      const anonymousAlias = generateSpiritName(formData, user.id);
      await user.update({ spiritName: anonymousAlias });

      await persistCompletedOnboardingQuestionnaire({
        userId: user.id,
        createdBy: req.user?.id || null,
        formData,
      });

      // Create PII record
      const clientId = `PT-${String(user.id).padStart(5, '0')}`;
      await sequelize.query(`
        INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, current_program, privacy_level, created_by, "createdAt", "updatedAt")
        VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, :currentProgram, 'standard', :createdBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, {
        replacements: {
          clientId: clientId,
          realName: formData.fullName,
          spiritName: anonymousAlias,
          currentProgram: formData.primaryGoal,
          createdBy: req.user?.id || null
        }
      });

      try {
        await triggerSequence('client_created', user.id, {
          clientName: formData.fullName
        });
      } catch (sequenceError) {
        console.error('[Onboarding Controller] Automation trigger failed:', sequenceError);
      }

      // Generate gamification challenges from onboarding goals (non-blocking)
      generateChallengesFromGoals(user.id, masterPromptJson).catch(err => {
        console.error('[Onboarding Controller] Challenge generation failed:', err.message);
      });

      const resetHandoff = await buildOnboardingResetLinkHandoff(user);

      return res.status(201).json({
        success: true,
        message: 'Client onboarding created successfully',
        data: {
          userId: user.id,
          clientId: `PT-${String(user.id).padStart(5, '0')}`,
          email: user.email,
          ...resetHandoff,
          masterPromptCreated: true
        }
      });
    }
  } catch (error) {
    console.error('[Onboarding Controller] Error creating client onboarding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process onboarding',
      code: 'internal_error'
    });
  }
};

/**
 * GET /api/onboarding/:userId
 * Retrieve a client's master prompt JSON
 */
export const getClientMasterPrompt = async (req, res) => {
  try {
    const userId = parsePositiveUserId(req.params.userId);
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Valid userId is required'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'spiritName', 'masterPromptJson', 'role']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'client') {
      return res.status(400).json({
        success: false,
        error: 'User is not a client'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        clientId: `Client #${user.id}`,
        email: user.email,
        masterPrompt: user.masterPromptJson
      }
    });
  } catch (error) {
    console.error('[Onboarding Controller] Error fetching master prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch master prompt',
      code: 'internal_error'
    });
  }
};

/**
 * POST /api/onboarding/self
 * Client self-service onboarding (authenticated client fills their own profile)
 */
export const createClientSelfOnboarding = async (req, res) => {
  try {
    const formData = req.body;
    const userId = parsePositiveUserId(req.user?.id);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!isClientSelfOnboardingRole(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Client self-onboarding is only available to client accounts',
        code: 'client_role_required'
      });
    }

    if (!formData.primaryGoal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: primaryGoal'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Use existing name from user record if not provided in form
    const fullName = formData.fullName || `${user.firstName} ${user.lastName}`;
    formData.fullName = fullName;
    formData.email = formData.email || user.email;
    formData.phone = formData.phone || user.phone;

    const anonymousAlias = generateSpiritName(formData, userId);
    const masterPromptJson = transformQuestionnaireToMasterPrompt(formData, userId);
    const questionnaireRecord = {
      userId,
      createdBy: userId,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: formData,
      ...computeDerivedFields(formData),
      completedAt: new Date()
    };

    await user.update({
      masterPromptJson,
      isOnboardingComplete: true,
      spiritName: anonymousAlias,
      phone: formData.phone || user.phone,
      dateOfBirth: formData.dateOfBirth || user.dateOfBirth,
      gender: formData.gender || user.gender,
      weight: formData.currentWeight ? parseFloat(formData.currentWeight) : user.weight,
      height: formData.heightFeet && formData.heightInches
        ? parseInt(formData.heightFeet) * 12 + parseInt(formData.heightInches)
        : user.height,
      fitnessGoal: formData.primaryGoal
    });

    const existingQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    if (existingQuestionnaire) {
      await existingQuestionnaire.update(questionnaireRecord);
    } else {
      await ClientOnboardingQuestionnaire.create(questionnaireRecord);
    }

    // Upsert PII record
    const clientId = `PT-${String(userId).padStart(5, '0')}`;
    await sequelize.query(`
      INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, privacy_level, "createdAt", "updatedAt")
      VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id) DO UPDATE SET
        real_name = EXCLUDED.real_name,
        spirit_name = EXCLUDED.spirit_name,
        "updatedAt" = CURRENT_TIMESTAMP
    `, {
      replacements: {
        clientId,
        realName: fullName,
        spiritName: anonymousAlias
      }
    });

    // Generate gamification challenges from onboarding goals (non-blocking)
    generateChallengesFromGoals(userId, masterPromptJson).catch(err => {
      console.error('[Onboarding Controller] Challenge generation failed:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        userId,
        clientId: `Client #${userId}`,
        masterPromptCreated: true
      }
    });
  } catch (error) {
    console.error('[Onboarding Controller] Self-onboarding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save onboarding data',
      code: 'internal_error'
    });
  }
};

export default {
  createClientOnboarding,
  getClientMasterPrompt,
  createClientSelfOnboarding
};
