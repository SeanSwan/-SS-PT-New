/**
 * Safe operator-facing PLAUD error copy.
 *
 * Backend error details may include provider text, debug strings, or artifact
 * metadata. UI banners render only allowlisted codes and deterministic copy.
 */

const SAFE_CODES = new Set([
  'AUDIO_FETCH_FAILED',
  'AUDIO_FETCH_TIMEOUT',
  'AUDIO_TOO_LARGE',
  'AUDIO_URL_ALLOWLIST_UNCONFIGURED',
  'AUDIO_URL_NOT_ALLOWED',
  'AUDIO_URL_REDIRECT_REJECTED',
  'INVALID_CLIP_ID',
  'INVALID_CLIENT_ID',
  'INVALID_MERGE_REQUEST_ID',
  'NO_FILES',
  'PLAUD_DISABLED',
  'RATE_LIMITED',
  'TOO_MANY_FILES',
  'UNSUPPORTED_MIMETYPE',
  'UPLOAD_TOO_LARGE',
]);

const UPLOAD_MESSAGES: Record<string, string> = {
  NO_FILES: 'Choose at least one audio file before uploading.',
  PLAUD_DISABLED: 'PLAUD intake is disabled right now.',
  RATE_LIMITED: 'Too many upload attempts. Wait briefly and retry.',
  TOO_MANY_FILES: 'At most 5 files can be uploaded at once.',
  UNSUPPORTED_MIMETYPE: 'File type is not supported.',
  UPLOAD_TOO_LARGE: 'File is over the upload size limit.',
};

const MERGE_MESSAGES: Record<string, string> = {
  INVALID_CLIENT_ID: 'Choose a valid client before processing.',
  INVALID_CLIP_ID: 'One selected clip is no longer available. Refresh the queue and retry.',
  PLAUD_DISABLED: 'PLAUD intake is disabled right now.',
  RATE_LIMITED: 'Too many processing attempts. Wait briefly and retry.',
  TOO_MANY_FILES: 'At most 5 clips can be processed at once.',
};

export function safePlaudIssueCode(value: unknown): string {
  if (typeof value !== 'string') return 'PLAUD_ERROR';
  return SAFE_CODES.has(value) ? value : 'PLAUD_ERROR';
}

export function safePlaudUploadErrorMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return UPLOAD_MESSAGES[safeCode] || 'Upload failed. Check the file and try again.';
}

export function safePlaudRejectedFileMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return UPLOAD_MESSAGES[safeCode] || 'File was rejected. Check the file type and size.';
}

export function safePlaudMergeErrorMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return MERGE_MESSAGES[safeCode] || 'Processing failed. Refresh the queue and retry.';
}
