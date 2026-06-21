import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUserByPk: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  parseNutritionTranscript: vi.fn(),
  tierAllowed: true,
}));

vi.mock('../../middleware/auth.mjs', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 42, role: 'client', username: 'client42' };
    next();
  },
}));

vi.mock('../../middleware/requireTier.mjs', () => ({
  requireTier: () => (_req, res, next) => {
    if (mocks.tierAllowed) return next();
    return res.status(402).json({
      success: false,
      message: 'Upgrade required for nutrition coaching.',
      error: 'subscription_required',
    });
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../services/mealPlanService.mjs', () => ({
  generateMealPlan: vi.fn(),
  getGolfPresets: vi.fn(() => []),
  getGolfPreset: vi.fn(() => null),
}));

vi.mock('../../services/foodPhotoService.mjs', () => ({
  analyzeMealPhoto: vi.fn(),
}));

vi.mock('../../services/nutrition/nutritionTranscriptParserService.mjs', () => ({
  parseNutritionTranscript: mocks.parseNutritionTranscript,
}));

vi.mock('../../models/User.mjs', () => ({
  default: { findByPk: mocks.findUserByPk },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: mocks.logger,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/mealPlanRoutes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const mealPlanRoutes = (await import('../../routes/mealPlanRoutes.mjs')).default;

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/meal-plans', mealPlanRoutes);
  return app;
};

const bodyText = (response) => JSON.stringify(response.body);

describe('meal plan routes security hardening', () => {
  beforeEach(() => {
    mocks.findUserByPk.mockReset();
    mocks.logger.error.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.info.mockReset();
    mocks.parseNutritionTranscript.mockReset();
    mocks.tierAllowed = true;
    mocks.findUserByPk.mockResolvedValue({
      firstName: 'Client',
      lastName: 'FortyTwo',
      username: 'client42',
    });
  });

  it('locks the mounted meal-plan API and active frontend consumer', () => {
    const mealPlanTabSource = readFrontend('src/components/FoodTracker/MealPlanTab.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/meal-plans', mealPlanRoutes)");
    expect(mealPlanTabSource).toContain("apiService.post('/api/meal-plans/generate'");
    expect(mealPlanTabSource).toContain("apiService.post('/api/meal-plans/analyze-photo'");
    expect(routeSource).toContain("router.post('/generate'");
    expect(routeSource).toContain("router.post('/analyze-photo'");
  });

  it('locks the voice meal-parse route as tier-gated + redacted, without leaking parser errors (Slice 1.6)', () => {
    expect(routeSource).toContain("router.post('/parse-voice'");
    expect(routeSource).toContain("requireTier('pro', 'nutrition.coaching')");
    expect(routeSource).toContain('parseNutritionTranscript');
    // never echo the raw parser/LLM error to the client
    expect(routeSource).not.toContain('message: err.message');
    expect(routeSource).toContain("'Could not understand that meal description. Please try again.'");
    expect(routeSource).toContain("'Voice meal logging is temporarily unavailable'");

    // active frontend consumer: the Speak-a-Meal panel calls the voice-parse route via apiService
    const voicePanelSource = readFrontend('src/components/FoodTracker/VoiceNutritionPanel.tsx');
    expect(voicePanelSource).toContain("import apiService from '../../services/api.service'");
    expect(voicePanelSource).toContain("apiService.post('/api/meal-plans/parse-voice'");
    expect(voicePanelSource).not.toContain('fetch(');
    expect(voicePanelSource).not.toContain('Authorization');
  });

  it('does not echo provider or upload exception details to nutrition clients', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error';");
    expect(routeSource).toContain('const uploadMealPhoto =');
    expect(routeSource).toContain("sendMealPlanError(res, 500, 'Meal plan generation failed')");
    expect(routeSource).toContain("'Photo analysis is temporarily unavailable'");
    expect(routeSource).not.toContain('message: err.message');
    expect(routeSource).not.toContain("err.message || 'Meal plan generation failed'");
    expect(routeSource).not.toContain("err.message || 'Photo analysis failed'");
    expect(routeSource).not.toContain("upload.single('photo'), async");
  });

  it('returns safe 400 for short parse-voice transcripts without calling the parser', async () => {
    const response = await request(makeApp())
      .post('/api/meal-plans/parse-voice')
      .send({ transcript: 'hi' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/say a bit more/i);
    expect(mocks.parseNutritionTranscript).not.toHaveBeenCalled();
  });

  it('returns safe 422 for no-food parse results without leaking parser text', async () => {
    mocks.parseNutritionTranscript.mockRejectedValueOnce(
      new Error('No meals parsed: raw-model-stack private-provider-detail')
    );

    const response = await request(makeApp())
      .post('/api/meal-plans/parse-voice')
      .send({ transcript: 'I ate something' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      error: 'no_meals_parsed',
    });
    expect(bodyText(response)).not.toContain('raw-model-stack');
    expect(bodyText(response)).not.toContain('private-provider-detail');
  });

  it('returns safe 503 for unavailable parser providers without leaking provider errors', async () => {
    mocks.parseNutritionTranscript.mockRejectedValueOnce(
      new Error('Gemini provider not configured: API_KEY missing')
    );

    const response = await request(makeApp())
      .post('/api/meal-plans/parse-voice')
      .send({ transcript: 'I had oatmeal and coffee' });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Voice meal logging is temporarily unavailable');
    expect(bodyText(response)).not.toContain('Gemini provider not configured');
    expect(bodyText(response)).not.toContain('API_KEY');
  });

  it('returns the subscription 402 gate before parse-voice calls the parser', async () => {
    mocks.tierAllowed = false;

    const response = await request(makeApp())
      .post('/api/meal-plans/parse-voice')
      .send({ transcript: 'I had oatmeal and coffee' });

    expect(response.status).toBe(402);
    expect(response.body.error).toBe('subscription_required');
    expect(mocks.parseNutritionTranscript).not.toHaveBeenCalled();
  });
});
