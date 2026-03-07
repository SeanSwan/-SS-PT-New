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

const EQUIPMENT_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
];

const RESISTANCE_TYPES = [
  'bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine', 'kettlebell', 'other'
];

const SCAN_PROMPT = `You are an expert fitness equipment identifier. Analyze this image and identify the gym/fitness equipment shown.

Return a JSON object with these fields:
{
  "name": "Equipment name (e.g., 'Adjustable Bench', 'Cable Crossover Machine')",
  "category": "One of: ${EQUIPMENT_CATEGORIES.join(', ')}",
  "resistanceType": "One of: ${RESISTANCE_TYPES.join(', ')}",
  "description": "Brief description of what this equipment is used for (1-2 sentences)",
  "confidence": 0.0 to 1.0,
  "boundingBox": { "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0 },
  "suggestedExercises": ["exercise1", "exercise2", "exercise3"]
}

Rules:
- boundingBox coordinates are normalized 0-1 relative to image dimensions
- suggestedExercises should list 3-8 common exercises this equipment is used for
- If multiple pieces of equipment are visible, identify the PRIMARY/largest one
- If no fitness equipment is visible, set confidence to 0 and name to "Unknown"
- Return ONLY valid JSON, no markdown or explanation`;

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
  const result = {
    suggestedName: typeof raw.name === 'string' ? raw.name.slice(0, 150) : 'Unknown Equipment',
    suggestedCategory: EQUIPMENT_CATEGORIES.includes(raw.category) ? raw.category : 'other',
    resistanceType: RESISTANCE_TYPES.includes(raw.resistanceType) ? raw.resistanceType : 'other',
    description: typeof raw.description === 'string' ? raw.description.slice(0, 500) : '',
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0,
    boundingBox: validateBoundingBox(raw.boundingBox),
    suggestedExercises: Array.isArray(raw.suggestedExercises)
      ? raw.suggestedExercises.filter(e => typeof e === 'string').slice(0, 10).map(e => e.slice(0, 100))
      : [],
  };
  return result;
}

/**
 * Scan equipment from an image using Gemini Flash Vision.
 *
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType - Image MIME type (image/jpeg, image/png, image/webp)
 * @returns {Promise<object>} Sanitized scan result
 */
export async function scanEquipmentImage(imageBuffer, mimeType) {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured');
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

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.2,
    },
  });

  const base64Image = imageBuffer.toString('base64');

  const startMs = Date.now();
  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: SCAN_PROMPT },
        ],
      }],
    });

    const response = result?.response;
    const text = typeof response?.text === 'function' ? response.text() : '';

    // Parse JSON from response (strip markdown code fences if present)
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.warn('[EquipmentScan] Failed to parse AI response as JSON', { text: text.slice(0, 200) });
      throw new Error('AI returned invalid JSON response');
    }

    const sanitized = sanitizeScanResult(parsed);
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
      model: 'gemini-2.0-flash',
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

export default { scanEquipmentImage };
