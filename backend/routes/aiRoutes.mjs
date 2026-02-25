import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { aiKillSwitch } from '../middleware/aiConsent.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import { generateWorkoutPlan, approveDraftPlan } from '../controllers/aiWorkoutController.mjs';
import {
  grantAiConsent,
  withdrawAiConsent,
  getAiConsentStatus,
} from '../controllers/aiConsentController.mjs';
import { listTemplates, getTemplate } from '../controllers/aiTemplateController.mjs';

// --- Register provider adapters at import time (Phase 3A+3B) ---
import { registerAdapter } from '../services/ai/providerRouter.mjs';
import openaiAdapter from '../services/ai/adapters/openaiAdapter.mjs';
import anthropicAdapter from '../services/ai/adapters/anthropicAdapter.mjs';
import geminiAdapter from '../services/ai/adapters/geminiAdapter.mjs';
registerAdapter(openaiAdapter);
registerAdapter(anthropicAdapter);
registerAdapter(geminiAdapter);

const router = express.Router();

// POST /api/ai/workout-generation
// Middleware chain: auth → kill switch → rate limiter → controller (RBAC + consent inside controller)
router.post(
  '/workout-generation',
  protect,
  aiKillSwitch,
  aiRateLimiter,
  generateWorkoutPlan
);

// POST /api/ai/workout-generation/approve (Phase 5A — coach-in-the-loop approval)
router.post(
  '/workout-generation/approve',
  protect,
  aiKillSwitch,
  approveDraftPlan
);

// Consent management endpoints
router.post('/consent/grant', protect, grantAiConsent);
router.post('/consent/withdraw', protect, withdrawAiConsent);
router.get('/consent/status', protect, getAiConsentStatus);
router.get('/consent/status/:userId', protect, getAiConsentStatus);

// Template registry endpoints (Phase 4A)
router.get('/templates', protect, listTemplates);
router.get('/templates/:id', protect, getTemplate);

export default router;
