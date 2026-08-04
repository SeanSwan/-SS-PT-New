/**
 * Voice Transcription Service
 * ============================
 * Transcribes audio files using Gemini Flash multimodal (NO OpenAI/Whisper).
 * Gemini accepts audio natively via inline data.
 * Extracts text from plain text, CSV, and PDF files.
 *
 * Provider chain: GOOGLE_API_KEY → GEMINI_API_KEY
 */

import logger from '../utils/logger.mjs';
import { redactTranscriptPII } from './redactTranscriptPII.mjs';

// Rate limiting: per-user transcription counts
const userTranscriptions = new Map(); // userId → { count, resetAt }
const MAX_TRANSCRIPTIONS_PER_HOUR = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (Gemini inline data limit)

/**
 * Check if a user is within their transcription rate limit.
 * Does NOT increment — call recordTranscription() after successful transcription.
 * @param {number} userId
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkTranscriptionLimit(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);

  if (!entry || entry.resetAt < now) {
    return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR };
  }

  const remaining = MAX_TRANSCRIPTIONS_PER_HOUR - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

/**
 * Atomically check AND record a transcription in one call.
 * Returns whether the request is allowed. Prevents check-then-record race window.
 * @param {number} userId
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function checkAndRecordTranscription(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);

  if (!entry || entry.resetAt < now) {
    // Reset window — this is the first request
    userTranscriptions.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR - 1 };
  }

  if (entry.count >= MAX_TRANSCRIPTIONS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  // Atomic increment — single synchronous operation
  entry.count++;
  return { allowed: true, remaining: MAX_TRANSCRIPTIONS_PER_HOUR - entry.count };
}

export function recordTranscription(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);
  if (!entry || entry.resetAt < now) {
    userTranscriptions.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
  } else {
    entry.count++;
  }
}

// Cleanup stale rate limit entries every 30 minutes
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of userTranscriptions.entries()) {
    if (entry.resetAt < now) userTranscriptions.delete(id);
  }
}, 30 * 60 * 1000);
rateLimitCleanup.unref();

/**
 * Get the Gemini API key from environment.
 * @returns {string|null}
 */
function getGeminiApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null;
}

/**
 * Transcribe an audio file buffer using Gemini Flash multimodal.
 * @param {Buffer} buffer - Audio file buffer
 * @param {string} filename - Original filename (for format detection)
 * @param {{ biasTerms?: string[], piiNameHints?: string[] }} [options] - Safe domain hints for Gemini
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(buffer, filename, options = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured (GOOGLE_API_KEY or GEMINI_API_KEY) — cannot transcribe audio');
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('Audio buffer is empty');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Audio file too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`);
  }

  const mimeType = getMimeType(filename);
  const base64Audio = buffer.toString('base64');
  const model = process.env.AI_GEMINI_TRANSCRIPTION_MODEL || 'gemini-2.5-flash';

  const biasTerms = sanitizeBiasTerms(options.biasTerms, options.piiNameHints);
  const vocabularyHint = biasTerms.length > 0
    ? `\n\nFitness vocabulary hints (transcribe these terms accurately when spoken): ${biasTerms.join(', ')}.`
    : '';
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Transcribe this audio exactly as spoken. Return ONLY the transcribed text with no additional commentary, labels, or formatting. If the audio is unclear or silent, return "[inaudible]".${vocabularyHint}`,
          },
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // 60s for large audio

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;
      logger.error('[VoiceTranscription] Gemini API error', {
        status: response.status,
        error: errorMsg,
        model,
      });
      throw new Error(`Transcription failed (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!transcript) {
      throw new Error('Gemini returned empty transcription');
    }

    logger.info('[VoiceTranscription] Transcription complete', {
      filename,
      model,
      audioSizeKB: Math.round(buffer.length / 1024),
      transcriptLength: transcript.length,
      inputTokens: data?.usageMetadata?.promptTokenCount,
      outputTokens: data?.usageMetadata?.candidatesTokenCount,
    });

    return transcript;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Transcription timed out after 60s');
    }
    throw err;
  }
}

/**
 * Extract text from non-audio files (text, CSV, PDF).
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - MIME type
 * @returns {string} Extracted text
 */
export async function extractText(buffer, mimetype) {
  if (mimetype === 'text/plain' || mimetype === 'text/csv') {
    return buffer.toString('utf-8').trim();
  }
  // For PDF, use pdf-parse if available, fallback to regex
  if (mimetype === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      if (data.text?.trim().length > 5) return data.text.trim();
    } catch {
      logger.warn('[VoiceTranscription] pdf-parse unavailable or failed, using fallback');
    }
    // Fallback: basic regex extraction
    const raw = buffer.toString('latin1');
    const textChunks = [];
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const chunk = match[1].replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      if (chunk.length > 2 && /[a-zA-Z]/.test(chunk)) {
        textChunks.push(chunk);
      }
    }
    return textChunks.join(' ').trim() || buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').trim();
  }
  return buffer.toString('utf-8').trim();
}

/**
 * Determine if a file is an audio type.
 */
export function isAudioFile(mimetype) {
  return mimetype?.startsWith('audio/') || false;
}

function sanitizeBiasTerms(biasTerms, piiNameHints) {
  if (!Array.isArray(biasTerms)) return [];
  const hints = Array.isArray(piiNameHints) ? piiNameHints : [];
  const safeTerms = new Set();
  for (const candidate of biasTerms) {
    const term = String(candidate ?? '').trim().slice(0, 80);
    if (!term) continue;
    const redaction = redactTranscriptPII(term, { nameHints: hints });
    if (redaction.detections.length > 0 || redaction.hasCriticalPII || redaction.text !== term) continue;
    safeTerms.add(term);
    if (safeTerms.size >= 250) break;
  }
  return [...safeTerms];
}

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = {
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    mp4: 'audio/mp4',
    flac: 'audio/flac',
  };
  if (!mimeMap[ext]) {
    throw new Error(`Unsupported audio format: .${ext}`);
  }
  return mimeMap[ext];
}
