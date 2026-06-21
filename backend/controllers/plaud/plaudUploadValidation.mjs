const ALLOWED_CODECS = new Set(['mp3', 'aac', 'opus', 'pcm_s16le', 'flac', 'vorbis']);
const ALLOWED_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'webm']);
const MAX_SOURCE_FUTURE_DRIFT_MS = 5 * 60 * 1000;

function pickExtFromMimetype(mimetype, originalname) {
  const fallback = (originalname || '').split('.').pop()?.toLowerCase() || '';
  const map = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  };
  const candidate = map[mimetype] || fallback;
  return ALLOWED_EXT.has(candidate) ? candidate : null;
}

function normalizeRecordedAt(value, nowMs = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  if (!Number.isFinite(time)) return null;
  if (time > nowMs + MAX_SOURCE_FUTURE_DRIFT_MS) return null;
  return parsed.toISOString();
}

function safeUploadRejectionMessage(code) {
  const messages = {
    AUTH_REQUIRED: 'Authentication required',
    CLIP_CORRUPT: 'Audio could not be read. Re-record or upload a different file.',
    CLIP_INGEST_IN_PROGRESS: 'This recording is still processing. Try again shortly.',
    CLIP_TOO_SILENT: 'Audio is too quiet to process. Re-record or upload a clearer file.',
    INTERNAL_ERROR: 'Upload processing failed. Try again with this file.',
    NO_FILES: 'No files provided',
    OFFICIAL_SYNC_EXTERNAL_ID_REQUIRED: 'Official PLAUD sync requires a valid recording id.',
    OFFICIAL_SYNC_ONE_FILE: 'Official PLAUD sync uploads one recording at a time.',
    UNSUPPORTED_AUDIO_TYPE: 'File type is not supported. Upload a supported audio file.',
    UPLOAD_TOO_LARGE: 'File is over the upload size limit.',
  };
  return messages[code] || 'File was rejected. Check the file and try again.';
}

export {
  ALLOWED_CODECS,
  ALLOWED_EXT,
  normalizeRecordedAt,
  pickExtFromMimetype,
  safeUploadRejectionMessage,
};
