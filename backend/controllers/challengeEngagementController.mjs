/**
 * Challenge engagement controller.
 *
 * Public aggregate-only endpoints for challenge lifecycle analytics. These
 * handlers intentionally avoid storing viewer identity, IP address, or agent
 * strings; persistence stays in challengeEngagementService.
 */

import getModels from '../models/associations.mjs';
import { recordPublicChallengeViewById } from '../services/gamification/challengeEngagementService.mjs';

const INTERNAL_ERROR = 'Internal server error';

const sendViewError = (res, status, message, error = INTERNAL_ERROR) => res.status(status).json({
  success: false,
  message,
  error,
});

const challengeEngagementController = {
  recordChallengeView: async (req, res) => {
    try {
      const models = await getModels();
      const result = await recordPublicChallengeViewById({
        Challenge: models?.Challenge,
        challengeId: req.params.id,
      });

      if (result.reason === 'model_unavailable') {
        return sendViewError(res, 500, 'Challenge view tracking unavailable');
      }

      if (!result.found) {
        return sendViewError(res, 404, 'Challenge not found', 'Challenge not found');
      }

      return res.status(200).json({
        success: true,
        recorded: result.recorded,
        viewCount: result.viewCount,
      });
    } catch (error) {
      console.error('Error recording challenge view:', {
        errorName: error?.name || 'Error',
      });
      return sendViewError(res, 500, 'Failed to record challenge view');
    }
  },
};

export default challengeEngagementController;
