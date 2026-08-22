import logger from '../utils/logger.mjs';
import db from '../database.mjs';
import UserFeatureFlag from '../models/UserFeatureFlag.mjs';
import { getAllModels } from '../models/index.mjs';
import {
  createClientChallengeSubmission,
  getClientChallengeSubmissionPolicy,
  getManagedChallengeSubmissionQueue,
  moderateManagedChallengeSubmission,
} from '../services/gamification/challengeSubmissionService.mjs';

const INTERNAL_ERROR = 'Internal server error';

const errorMeta = (error) => ({
  errorName: error instanceof Error ? error.name : typeof error,
});

const getChallengeSubmissionModels = () => ({ ...getAllModels(), UserFeatureFlag });

const publicStatusCode = (error) => error.statusCode || 500;
const publicMessage = (error) => error.publicMessage || INTERNAL_ERROR;
const logChallengeSubmissionError = (message, error) => {
  const statusCode = publicStatusCode(error);
  const meta = { ...errorMeta(error), statusCode };

  if (statusCode >= 500) {
    logger.error(message, meta);
    return;
  }

  logger.warn(message, meta);
};

const challengeSubmissionController = {
  getClientChallengeSubmissionPolicy: async (req, res) => {
    try {
      const policy = await getClientChallengeSubmissionPolicy({
        models: getChallengeSubmissionModels(),
        viewer: req.user,
      });
      return res.status(200).json({
        success: true,
        ...policy,
      });
    } catch (error) {
      logger.error('[Challenge Submissions] Failed to load client policy:', errorMeta(error));
      return res.status(500).json({ success: false, message: INTERNAL_ERROR });
    }
  },

  createClientChallengeSubmission: async (req, res) => {
    try {
      const result = await createClientChallengeSubmission({
        models: getChallengeSubmissionModels(),
        viewer: req.user,
        body: req.body,
      });
      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      logChallengeSubmissionError('[Challenge Submissions] Failed to create client submission:', error);
      return res.status(publicStatusCode(error)).json({
        success: false,
        message: publicMessage(error),
      });
    }
  },

  getManagedChallengeSubmissions: async (req, res) => {
    try {
      // req.user is REQUIRED, not optional: the service fails closed to an empty
      // queue without it. Omitting it here is what made the queue global.
      const queue = await getManagedChallengeSubmissionQueue({
        models: getAllModels(),
        viewer: req.user,
      });
      return res.status(200).json({
        success: true,
        ...queue,
      });
    } catch (error) {
      logger.error('[Challenge Submissions] Failed to load managed queue:', errorMeta(error));
      return res.status(500).json({ success: false, message: INTERNAL_ERROR });
    }
  },

  moderateManagedChallengeSubmission: async (req, res) => {
    const transaction = await db.transaction();

    try {
      const result = await moderateManagedChallengeSubmission({
        models: getAllModels(),
        submissionId: req.params.id,
        viewer: req.user,
        action: req.body?.action,
        reviewNotes: req.body?.reviewNotes,
        transaction,
      });

      await transaction.commit();
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      await transaction.rollback();
      logChallengeSubmissionError('[Challenge Submissions] Failed to moderate submission:', error);
      return res.status(publicStatusCode(error)).json({
        success: false,
        message: publicMessage(error),
      });
    }
  },
};

export default challengeSubmissionController;