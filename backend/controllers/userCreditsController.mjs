/**
 * FILE: userCreditsController.mjs
 * SYSTEM: Session Credit Management
 *
 * PURPOSE:
 * Provide a lightweight endpoint for clients to view remaining session credits.
 *
 * ARCHITECTURE:
 * [Route] -> [Controller] -> [User Model] -> [Response]
 *
 * NOTES:
 * - Uses User.availableSessions as the source of truth.
 * - packageName/expiresAt are optional; return null when unknown.
 */
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

export const getUserCredits = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'availableSessions', 'masterPromptJson']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const packageInfo = user.masterPromptJson?.package || {};
    const packageName = packageInfo.tier || packageInfo.name || null;
    const expiresAt = packageInfo.expiresAt || null;

    return res.status(200).json({
      success: true,
      data: {
        sessionsRemaining: user.availableSessions || 0,
        packageName,
        expiresAt
      }
    });
  } catch (error) {
    logger.error('Error fetching user credits', {
      error: error.message,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch session credits'
    });
  }
};
