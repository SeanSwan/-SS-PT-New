/**
 * Session Deduction Service
 * ==========================
 * Automatically deducts session credits from client packages
 * after sessions are completed or the scheduled time has passed.
 */

import { getSession, getUser, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';

/**
 * Process session deductions for past sessions that haven't been deducted yet
 * This should be called periodically (e.g., via cron job or at regular intervals)
 *
 * @returns {Object} Result with count of processed sessions
 */
export async function processSessionDeductions() {
  const Session = getSession();
  const User = getUser();

  const results = {
    processed: 0,
    deducted: 0,
    errors: [],
    noCredits: []
  };

  const transaction = await sequelize.transaction();

  try {
    // Find sessions that:
    // 1. Are scheduled or confirmed (not cancelled, not completed, not available)
    // 2. Have a session date in the past
    // 3. Haven't been deducted yet
    // 4. Have a client assigned
    const eligibleSessions = await Session.findAll({
      where: {
        status: {
          [Op.in]: ['scheduled', 'confirmed']
        },
        sessionDate: {
          [Op.lt]: new Date()
        },
        sessionDeducted: false,
        userId: {
          [Op.not]: null
        },
        isBlocked: false
      },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions']
        }
      ],
      transaction
    });

    for (const session of eligibleSessions) {
      results.processed++;

      try {
        const client = session.client;

        if (!client) {
          results.errors.push({
            sessionId: session.id,
            reason: 'No client found'
          });
          continue;
        }

        // Check if client has available sessions
        if (client.availableSessions <= 0) {
          results.noCredits.push({
            sessionId: session.id,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            reason: 'No available session credits'
          });

          // Mark session as completed but note no credits available
          session.status = 'completed';
          session.notes = (session.notes || '') + '\n[Auto] Session completed - No credits to deduct';
          await session.save({ transaction });
          continue;
        }

        // Deduct the session
        client.availableSessions -= 1;
        await client.save({ transaction });

        // Update session
        session.status = 'completed';
        session.sessionDeducted = true;
        session.deductionDate = new Date();
        session.notes = (session.notes || '') + '\n[Auto] Session credit deducted automatically';
        await session.save({ transaction });

        results.deducted++;

      } catch (error) {
        results.errors.push({
          sessionId: session.id,
          reason: error.message
        });
      }
    }

    await transaction.commit();

    console.log(`[SessionDeduction] Processed ${results.processed} sessions, deducted ${results.deducted} credits`);
    if (results.noCredits.length > 0) {
      console.log(`[SessionDeduction] ${results.noCredits.length} clients had no credits available`);
    }
    if (results.errors.length > 0) {
      console.error(`[SessionDeduction] ${results.errors.length} errors occurred`);
    }

    return results;

  } catch (error) {
    await transaction.rollback();
    console.error('[SessionDeduction] Error processing deductions:', error);
    throw error;
  }
}

/**
 * Get clients with exhausted session credits who have pending sessions
 * These clients need to apply payment / purchase more sessions
 *
 * @returns {Array} List of clients needing payment
 */
export async function getClientsNeedingPayment() {
  const Session = getSession();
  const User = getUser();

  try {
    // Find clients with 0 or less available sessions
    const clients = await User.findAll({
      where: {
        role: 'client',
        availableSessions: {
          [Op.lte]: 0
        }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions'],
      include: [
        {
          model: Session,
          as: 'sessions',
          where: {
            status: {
              [Op.in]: ['scheduled', 'confirmed']
            },
            sessionDate: {
              [Op.gte]: new Date()
            }
          },
          required: true,
          attributes: ['id', 'sessionDate', 'status']
        }
      ]
    });

    return clients.map(client => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.phone,
      availableSessions: client.availableSessions,
      upcomingSessions: client.sessions.length,
      nextSession: client.sessions[0]?.sessionDate
    }));

  } catch (error) {
    console.error('[SessionDeduction] Error getting clients needing payment:', error);
    throw error;
  }
}

/**
 * Apply payment to a client's account (add session credits)
 *
 * @param {number} clientId - Client user ID
 * @param {number} sessionsToAdd - Number of sessions to add
 * @param {string} paymentNote - Note about the payment
 * @returns {Object} Updated client info
 */
export async function applyPaymentCredits(clientId, sessionsToAdd, paymentNote = '') {
  const User = getUser();

  try {
    const client = await User.findByPk(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    if (client.role !== 'client') {
      throw new Error('User is not a client');
    }

    const previousCredits = client.availableSessions || 0;
    client.availableSessions = previousCredits + sessionsToAdd;
    await client.save();

    console.log(`[SessionDeduction] Applied ${sessionsToAdd} credits to client ${clientId}. ${previousCredits} -> ${client.availableSessions}`);

    return {
      clientId: client.id,
      name: `${client.firstName} ${client.lastName}`,
      previousCredits,
      creditsAdded: sessionsToAdd,
      newBalance: client.availableSessions,
      paymentNote
    };

  } catch (error) {
    console.error('[SessionDeduction] Error applying payment credits:', error);
    throw error;
  }
}

export default {
  processSessionDeductions,
  getClientsNeedingPayment,
  applyPaymentCredits
};
