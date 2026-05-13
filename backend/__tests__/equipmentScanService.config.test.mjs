import { afterEach, describe, expect, it } from 'vitest';
import { __testing__ } from '../services/equipmentScanService.mjs';

const ORIGINAL_ENV = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  EQUIPMENT_SCAN_MODEL: process.env.EQUIPMENT_SCAN_MODEL,
  AI_GEMINI_VISION_MODEL: process.env.AI_GEMINI_VISION_MODEL,
  AI_GEMINI_MODEL: process.env.AI_GEMINI_MODEL,
};

function clearGeminiEnv() {
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.EQUIPMENT_SCAN_MODEL;
  delete process.env.AI_GEMINI_VISION_MODEL;
  delete process.env.AI_GEMINI_MODEL;
}

describe('equipment scan configuration', () => {
  afterEach(() => {
    clearGeminiEnv();
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('accepts the repo-standard Gemini env aliases used by production AI services', () => {
    clearGeminiEnv();
    process.env.GEMINI_API_KEY = 'gemini-key';

    expect(__testing__.getEquipmentScanApiKey()).toBe('gemini-key');
    expect(__testing__.isEquipmentScanConfigured()).toBe(true);

    process.env.GOOGLE_API_KEY = 'google-key';
    expect(__testing__.getEquipmentScanApiKey()).toBe('google-key');
  });

  it('does not use retired Gemini vision models from shared env configuration', () => {
    process.env.AI_GEMINI_MODEL = 'gemini-2.0-flash';

    expect(__testing__.getEquipmentScanModel()).toBe('gemini-2.5-flash');

    process.env.EQUIPMENT_SCAN_MODEL = 'gemini-2.5-flash-lite';
    expect(__testing__.getEquipmentScanModel()).toBe('gemini-2.5-flash-lite');
  });
});
