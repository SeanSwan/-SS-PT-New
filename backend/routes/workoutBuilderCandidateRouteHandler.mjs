/**
 * Route handler factory for Swan Coach guided workout candidates.
 */
import { ALLOWED_GOALS } from '../services/workoutBuilderGoalConfig.mjs';
import { normalizeTrainingStyle } from '../services/workoutBuilderTrainingStyle.mjs';
import {
  candidateCountForMode,
  generateWorkoutCandidates,
  normalizeGenerationMode,
} from '../services/workoutBuilderCandidateService.mjs';
import logger from '../utils/logger.mjs';

const VALID_CATEGORIES = ['full_body', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

function parseRequiredPositiveInteger(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalPhase(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseRequiredPositiveInteger(value);
  return parsed && parsed <= 5 ? parsed : undefined;
}

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  return parseRequiredPositiveInteger(value);
}

function hasProvidedValue(value) {
  return value !== undefined && value !== null && value !== '';
}

export function createWorkoutCandidatesHandler({ enforceWorkoutGenAccess, safeWorkoutBuilderDetails }) {
  return async (req, res) => {
    try {
      const {
        clientId, category, primaryGoal, nasmPhase, generationMode,
        candidateCount, equipmentProfileId, trainingIntensityMode,
        hardcoreMethod, readinessCheck,
      } = req.body;

      const parsedClientId = parseRequiredPositiveInteger(clientId);
      if (!parsedClientId) {
        return res.status(400).json({ success: false, error: 'Valid clientId is required' });
      }

      const parsedEquipmentProfileId = parseOptionalPositiveInteger(equipmentProfileId);
      if (hasProvidedValue(equipmentProfileId) && !parsedEquipmentProfileId) {
        return res.status(400).json({ success: false, error: 'Valid equipmentProfileId is required when provided' });
      }

      const gateResult = await enforceWorkoutGenAccess(req, res, parsedClientId);
      if (gateResult !== null) return gateResult;

      const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'full_body';
      const safeGoal = ALLOWED_GOALS.includes(primaryGoal) ? primaryGoal : 'general_fitness';
      const safePhase = parseOptionalPhase(nasmPhase) || 2;
      const safeMode = normalizeGenerationMode(generationMode);
      const safeCount = candidateCountForMode(safeMode, candidateCount);
      const safeTrainingStyle = normalizeTrainingStyle({ trainingIntensityMode, hardcoreMethod });

      const candidates = await generateWorkoutCandidates({
        clientId: parsedClientId,
        trainerId: req.user.id,
        category: safeCategory,
        primaryGoal: safeGoal,
        nasmPhase: safePhase,
        generationMode: safeMode,
        candidateCount: safeCount,
        equipmentProfileId: parsedEquipmentProfileId,
        trainingIntensityMode: safeTrainingStyle.mode,
        hardcoreMethod: safeTrainingStyle.method,
        readinessCheck,
      });

      return res.json({ success: true, candidates });
    } catch (err) {
      logger.error('[WorkoutBuilder] Candidate generation failed:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate candidates',
        details: safeWorkoutBuilderDetails(err),
      });
    }
  };
}
