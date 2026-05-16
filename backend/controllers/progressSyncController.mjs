// backend/controllers/progressSyncController.mjs
import logger from '../utils/logger.mjs';

const retiredProgressSyncResponse = (action) => ({
  success: false,
  retired: true,
  action,
  message: 'Legacy MCP progress synchronization is retired. SwanStudios now uses first-party workout, analytics, and gamification APIs.',
  replacements: [
    '/api/workout',
    '/api/client/analytics',
    '/api/v1/gamification',
    '/api/gamification'
  ]
});

const sendRetired = (res, action) => {
  logger.info(`Blocked retired MCP progress sync action: ${action}`);
  return res.status(410).json(retiredProgressSyncResponse(action));
};

/**
 * Retired progress synchronization controller.
 *
 * The old implementation called standalone MCP servers and localhost ports.
 * Those servers are no longer part of the Render runtime, so each endpoint now
 * fails closed with API replacements instead of attempting external sync.
 */
const progressSyncController = {
  syncClientProgress: async (req, res) => sendRetired(res, 'syncClientProgress'),
  verifyProgressIntegration: async (req, res) => sendRetired(res, 'verifyProgressIntegration'),
  updateAchievements: async (req, res) => sendRetired(res, 'updateAchievements'),
  refreshClientProgress: async (req, res) => sendRetired(res, 'refreshClientProgress')
};

export default progressSyncController;
