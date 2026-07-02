// backend/controllers/testController.mjs
import { randomBytes } from 'node:crypto';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';
import { buildOnboardingResetLinkHandoff } from '../services/onboardingResetHandoffService.mjs';
import { sendPasswordResetEmailForUser } from '../services/auth/passwordResetEmailService.mjs';

const createAccountSeedPassword = () => `Seed${randomBytes(24).toString('base64url')}!A1`;

const buildTestClientResetHandoff = (user) => buildOnboardingResetLinkHandoff(user, {
  sendReset: (targetUser) => sendPasswordResetEmailForUser(targetUser, {
    includeResetUrl: true,
    sendEmail: async () => ({
      success: false,
      error: new Error('Test-client email delivery disabled; use generated reset handoff.'),
    }),
  }),
});

/**
 * Creates a test client user for development purposes.
 * This endpoint should only be accessible in development mode.
 */
export const createTestClient = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }

    const timestamp = Date.now();
    const testUsername = `testclient_${timestamp}`;
    const testEmail = `${testUsername}@example.com`;
    const accountSeedPassword = createAccountSeedPassword();

    const testClient = await User.create({
      email: testEmail,
      username: testUsername,
      password: accountSeedPassword,
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      availableSessions: 0,
      phone: '555-123-4567',
      isEmailVerified: true,
      isActive: true,
      forcePasswordChange: true,
      accountStatus: 'active',
      fitnessGoal: 'Improve overall fitness',
      trainingExperience: 'beginner'
    });

    const resetHandoff = await buildTestClientResetHandoff(testClient);

    logger.info(`Created test client: ${testEmail}`);

    res.status(201).json({
      success: true,
      message: 'Test client created successfully',
      client: {
        id: testClient.id,
        email: testClient.email,
        username: testClient.username,
        firstName: testClient.firstName,
        lastName: testClient.lastName,
        role: testClient.role,
        availableSessions: testClient.availableSessions,
        forcePasswordChange: testClient.forcePasswordChange,
        ...resetHandoff
      }
    });
  } catch (error) {
    logger.error(`Error creating test client: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating test client'
    });
  }
};

/**
 * Add sessions to a test client.
 */
export const addSessionsToTestClient = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }

    const { clientId, sessions } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    if (!sessions || isNaN(sessions) || sessions <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }

    const client = await User.findByPk(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const currentSessions = client.availableSessions || 0;
    client.availableSessions = currentSessions + parseInt(sessions, 10);
    await client.save();

    logger.info(`Added ${sessions} test sessions to client ${clientId}`);

    res.status(200).json({
      success: true,
      message: `Added ${sessions} sessions to test client`,
      client: {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        availableSessions: client.availableSessions
      }
    });
  } catch (error) {
    logger.error(`Error adding sessions to test client: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding sessions to test client'
    });
  }
};

export default {
  createTestClient,
  addSessionsToTestClient
};
