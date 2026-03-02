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
import { generateLongHorizonPlan, approveLongHorizonPlan } from '../controllers/longHorizonController.mjs';

// --- Register provider adapters at import time (Phase 3A+3B) ---
import { registerAdapter, getRegisteredAdapterNames } from '../services/ai/providerRouter.mjs';
import openaiAdapter from '../services/ai/adapters/openaiAdapter.mjs';
import anthropicAdapter from '../services/ai/adapters/anthropicAdapter.mjs';
import geminiAdapter from '../services/ai/adapters/geminiAdapter.mjs';
import veniceAdapter from '../services/ai/adapters/veniceAdapter.mjs';

// Defensive adapter registration — one failure won't break all AI routes
const adapterPairs = [
  ['openai', openaiAdapter],
  ['anthropic', anthropicAdapter],
  ['gemini', geminiAdapter],
  ['venice', veniceAdapter],
];
for (const [name, adapter] of adapterPairs) {
  try {
    registerAdapter(adapter);
  } catch (err) {
    console.error(`[AI Routes] Failed to register ${name} adapter:`, err.message);
  }
}

const router = express.Router();

// GET /api/ai/health — lightweight route existence check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI routes loaded',
    adapters: getRegisteredAdapterNames(),
    routes: [
      'POST /api/ai/workout-generation',
      'POST /api/ai/workout-generation/approve',
      'POST /api/ai/long-horizon/generate',
      'POST /api/ai/long-horizon/approve',
      'GET  /api/ai/templates',
    ],
    killSwitch: process.env.AI_WORKOUT_GENERATION_ENABLED !== 'false' ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

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

// POST /api/ai/long-horizon/generate (Phase 5C-C — long-horizon plan generation)
// Middleware chain: auth → kill switch → rate limiter → controller (RBAC + consent inside controller)
router.post(
  '/long-horizon/generate',
  protect,
  aiKillSwitch,
  aiRateLimiter,
  generateLongHorizonPlan
);

// POST /api/ai/long-horizon/approve (Phase 5C-D — coach approval + persistence)
// No aiRateLimiter — approval is a coach action, not an AI provider call
router.post(
  '/long-horizon/approve',
  protect,
  aiKillSwitch,
  approveLongHorizonPlan
);

// Template registry endpoints (Phase 4A)
router.get('/templates', protect, listTemplates);
router.get('/templates/:id', protect, getTemplate);

export default router;
