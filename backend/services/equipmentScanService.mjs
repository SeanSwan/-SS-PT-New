/**
 * Equipment Scan Service — Gemini Flash Vision
 * ==============================================
 * Phase 7c: AI-powered equipment recognition from photos.
 *
 * Workflow:
 *   1. Trainer uploads a photo of equipment
 *   2. Image is sent to Gemini Flash Vision API
 *   3. AI returns: name, category, description, bounding box, exercises it supports
 *   4. Result stored as aiScanData on EquipmentItem (pending approval)
 *
 * Cost: ~$0.001 per scan (Gemini Flash Vision pricing)
 */
import logger from '../utils/logger.mjs';
import {
  DEFAULT_EQUIPMENT_SCAN_MODEL,
  EQUIPMENT_CATEGORIES,
  RESISTANCE_TYPES,
  RETIRED_EQUIPMENT_SCAN_MODELS,
  buildEquipmentScanPrompt,
  isUnknownEquipmentResult,
  normalizeRawScanResult,
  parseEquipmentScanResponse,
} from './equipmentScanSupport.mjs';
import {
  buildEquipmentCaptionPrompt,
  scanResultFromCaption,
} from './equipmentScanCaptionFallback.mjs';

/**
 * Validate bounding box coordinates are in 0-1 range
 */
function validateBoundingBox(box) {
  if (!box || typeof box !== 'object') return null;
  const { x, y, w, h } = box;
  if ([x, y, w, h].some(v => typeof v !== 'number' || v < 0 || v > 1)) return null;
  return { x, y, w, h };
}

/**
 * Validate and sanitize the AI scan result
 */
function sanitizeScanResult(raw) {
  const normalized = normalizeRawScanResult(raw);
  const hasKnownName = normalized.name && !/^unknown/i.test(normalized.name);
  const fallbackConfidence = hasKnownName ? 0.65 : 0;
  const confidence = typeof normalized.confidence === 'number'
    ? Math.max(0, Math.min(1, normalized.confidence > 0 || !hasKnownName ? normalized.confidence : fallbackConfidence))
    : fallbackConfidence;
  const result = {
    suggestedName: typeof normalized.name === 'string' ? normalized.name.slice(0, 150) : 'Unknown Equipment',
    suggestedCategory: EQUIPMENT_CATEGORIES.includes(normalized.category) ? normalized.category : 'other',
    resistanceType: RESISTANCE_TYPES.includes(normalized.resistanceType) ? normalized.resistanceType : 'other',
    description: typeof normalized.description === 'string' ? normalized.description.slice(0, 500) : '',
    confidence,
    boundingBox: validateBoundingBox(normalized.boundingBox),
    suggestedExercises: Array.isArray(normalized.suggestedExercises)
      ? normalized.suggestedExercises.filter(e => typeof e === 'string').slice(0, 10).map(e => e.slice(0, 100))
      : [],
  };
  return result;
}

export function getEquipmentScanApiKey() {
  return process.env.GOOGLE_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || null;
}

export function isEquipmentScanConfigured() {
  return Boolean(getEquipmentScanApiKey());
}

export function getEquipmentScanModel() {
  const configuredModel = process.env.EQUIPMENT_SCAN_MODEL
    || process.env.AI_GEMINI_VISION_MODEL
    || process.env.AI_GEMINI_MODEL
    || DEFAULT_EQUIPMENT_SCAN_MODEL;
  const model = String(configuredModel).trim();
  return RETIRED_EQUIPMENT_SCAN_MODELS.has(model)
    ? DEFAULT_EQUIPMENT_SCAN_MODEL
    : model;
}

async function requestGeminiEquipmentScan(model, { base64Image, mimeType, prompt }) {
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ],
    }],
  });
  const response = result?.response;
  const text = typeof response?.text === 'function' ? response.text() : '';
  return parseEquipmentScanResponse(text);
}

async function tryGeminiEquipmentScan(model, params, pass) {
  try {
    const parsed = await requestGeminiEquipmentScan(model, params);
    return {
      parsed,
      sanitized: sanitizeScanResult(parsed),
      error: null,
    };
  } catch (err) {
    logger.warn('[EquipmentScan] Strict JSON scan pass failed', {
      pass,
      error: String(err?.message || 'unknown').slice(0, 160),
    });
    return { parsed: null, sanitized: null, error: err };
  }
}

async function requestGeminiEquipmentCaption(model, { base64Image, mimeType }) {
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: buildEquipmentCaptionPrompt() },
      ],
    }],
  });
  const response = result?.response;
  return typeof response?.text === 'function' ? response.text() : '';
}

/**
 * Scan equipment from an image using Gemini Flash Vision.
 *
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType - Image MIME type (image/jpeg, image/png, image/webp)
 * @returns {Promise<object>} Sanitized scan result
 */
export async function scanEquipmentImage(imageBuffer, mimeType) {
  const apiKey = getEquipmentScanApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not configured');
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(mimeType)) {
    throw new Error(`Invalid image type: ${mimeType}. Allowed: ${allowedMimes.join(', ')}`);
  }

  // Max 10MB
  if (imageBuffer.length > 10 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 10MB.');
  }

  let GoogleGenerativeAI;
  try {
    const mod = await import('@google/generative-ai');
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch {
    throw new Error('Google Generative AI SDK not installed');
  }

  const modelName = getEquipmentScanModel();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
  const captionModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 80,
      temperature: 0.1,
    },
  });

  const base64Image = imageBuffer.toString('base64');

  const startMs = Date.now();
  try {
    let primary = await tryGeminiEquipmentScan(model, {
      base64Image,
      mimeType,
      prompt: buildEquipmentScanPrompt(),
    }, 'primary');
    let parsed = primary.parsed;
    let sanitized = primary.sanitized;

    if (!sanitized || isUnknownEquipmentResult(sanitized)) {
      const retry = await tryGeminiEquipmentScan(model, {
        base64Image,
        mimeType,
        prompt: buildEquipmentScanPrompt({ retry: true }),
      }, 'retry');
      if (retry.sanitized && !isUnknownEquipmentResult(retry.sanitized)) {
        parsed = retry.parsed;
        sanitized = retry.sanitized;
      } else {
        const caption = await requestGeminiEquipmentCaption(captionModel, { base64Image, mimeType });
        const captionResult = scanResultFromCaption(caption);
        if (!captionResult) {
          throw new Error('AI could not identify visible workout equipment');
        }
        parsed = captionResult;
        sanitized = sanitizeScanResult(captionResult);
      }
    }

    const latencyMs = Date.now() - startMs;

    logger.info('[EquipmentScan] Scan complete', {
      name: sanitized.suggestedName,
      category: sanitized.suggestedCategory,
      confidence: sanitized.confidence,
      latencyMs,
    });

    return {
      ...sanitized,
      rawResponse: parsed,
      latencyMs,
      model: modelName,
    };
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    logger.error('[EquipmentScan] Scan failed', {
      error: err.message,
      latencyMs,
    });
    throw err;
  }
}

export const __testing__ = {
  getEquipmentScanApiKey,
  getEquipmentScanModel,
  isEquipmentScanConfigured,
  buildEquipmentCaptionPrompt,
  buildEquipmentScanPrompt,
  isUnknownEquipmentResult,
  parseEquipmentScanResponse,
  scanResultFromCaption,
  sanitizeScanResult,
};

export default { scanEquipmentImage };
