import logger from '../../utils/logger.mjs';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getGeminiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null;
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

function safeParseJson(text) {
  const raw = stripCodeFences(text);
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error('Vision response was not valid JSON');
  }
}

function normalizeAnalysis(result) {
  return {
    imageQuality: result.imageQuality || { usable: false, limitations: ['No image-quality details returned'] },
    visualObservations: Array.isArray(result.visualObservations) ? result.visualObservations.slice(0, 12) : [],
    possibleContributors: Array.isArray(result.possibleContributors) ? result.possibleContributors.slice(0, 8) : [],
    movementQuestions: Array.isArray(result.movementQuestions) ? result.movementQuestions.slice(0, 8) : [],
    trainerChecks: Array.isArray(result.trainerChecks) ? result.trainerChecks.slice(0, 10) : [],
    avoidModify: Array.isArray(result.avoidModify) ? result.avoidModify.slice(0, 10) : [],
    redFlags: Array.isArray(result.redFlags) ? result.redFlags.slice(0, 8) : [],
    swanCoachNotesDraft: typeof result.swanCoachNotesDraft === 'string' ? result.swanCoachNotesDraft.slice(0, 2000) : '',
    confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : null,
    model: 'gemini-2.0-flash',
    promptVersion: 'body-map-vision-v1',
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeBodyMapEvidence({ imageBuffer, mimeType, entry, captureContext }) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { success: false, error: 'Vision analysis requires a configured Gemini API key' };
  }

  const prompt = `You are Swan Coach assisting a certified personal trainer with a body-map evidence image.
Return ONLY valid JSON. This is trainer decision support, not a diagnosis.
Use cautious language: visual observation, possible contributor, confidence, and what evidence is missing.
Do not identify the person. Do not infer protected traits. Do not provide emergency or medical treatment instructions.
Escalate urgent concerns as trainer-review flags only.

Context:
- bodyRegion: ${entry?.bodyRegion || 'unknown'}
- side: ${entry?.side || 'unknown'}
- level: ${entry?.painLevel ?? 'unknown'}
- type: ${entry?.painType || 'unknown'}
- description: ${entry?.description || 'none'}
- captureContext: ${JSON.stringify(captureContext || {})}

Schema:
{
  "imageQuality": { "usable": true, "limitations": ["single angle only"] },
  "visualObservations": [{ "observation": "...", "bodyRegion": "...", "confidence": 0.5 }],
  "possibleContributors": [{ "hypothesis": "...", "evidenceFor": ["..."], "evidenceAgainst": ["..."], "confidence": 0.5 }],
  "movementQuestions": ["..."],
  "trainerChecks": ["..."],
  "avoidModify": [{ "movement": "...", "recommendation": "..." }],
  "redFlags": [{ "flag": "...", "action": "trainer review or referral when appropriate" }],
  "swanCoachNotesDraft": "one concise paragraph for workout-generation constraints after trainer approval",
  "confidence": 0.5
}`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBuffer.toString('base64') } },
        ] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 3072 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API ${response.status}: ${text.slice(0, 240)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty vision response');

    return { success: true, analysis: normalizeAnalysis(safeParseJson(text)) };
  } catch (error) {
    logger.error('[BodyMapVision] Analysis failed: %s', error.message);
    return { success: false, error: error.message };
  }
}
