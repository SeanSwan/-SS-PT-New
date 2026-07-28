/**
 * Challenge results controller.
 * Keeps managed challenge analytics out of the large challenge controller file.
 */

import getModels from '../models/associations.mjs';
import {
  ChallengeResultsReadError,
  getManagedChallengeResults,
} from '../services/gamification/challengeResultsService.mjs';

const sendResultsError = (res, status, message, error = message) => res.status(status).json({
  success: false,
  message,
  error,
});

const challengeResultsController = {
  getManagedChallengeResults: async (req, res) => {
    try {
      const models = await getModels();
      const result = await getManagedChallengeResults({
        models,
        challengeId: req.params.id,
        viewer: req.user,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof ChallengeResultsReadError) {
        return sendResultsError(res, error.statusCode, error.publicMessage, error.publicMessage);
      }

      console.error('Error fetching managed challenge results:', error);
      return sendResultsError(res, 500, 'Failed to fetch challenge results', 'Internal server error');
    }
  },
};

export default challengeResultsController;