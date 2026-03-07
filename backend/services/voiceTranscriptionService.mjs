/**
 * Voice Transcription Service
 * ============================
 * Transcribes audio files using OpenAI Whisper API.
 * Extracts text from plain text, CSV, and PDF files.
 */

import logger from '../utils/logger.mjs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Transcribe an audio file buffer using OpenAI Whisper.
 * @param {Buffer} buffer - Audio file buffer
 * @param {string} filename - Original filename (for format detection)
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(buffer, filename) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured — cannot transcribe audio');
  }

  const formData = new FormData();
  const blob = new Blob([buffer], { type: getMimeType(filename) });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'text');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s for large audio

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    logger.error('[VoiceTranscription] Whisper API error', { status: response.status, error: errText });
    throw new Error(`Transcription failed (${response.status}): ${errText}`);
  }

  const transcript = await response.text();
  logger.info('[VoiceTranscription] Transcription complete', { filename, length: transcript.length });
  return transcript.trim();
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
