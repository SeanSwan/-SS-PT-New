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

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

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
export function extractText(buffer, mimetype) {
  if (mimetype === 'text/plain' || mimetype === 'text/csv') {
    return buffer.toString('utf-8').trim();
  }
  // For PDF, return raw text extraction (basic)
  if (mimetype === 'application/pdf') {
    // Simple PDF text extraction — look for text between BT/ET blocks
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
  return mimeMap[ext] || 'audio/mp4';
}
