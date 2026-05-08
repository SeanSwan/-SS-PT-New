/**
 * coachIntakeConstants.mjs
 * ========================
 * Shared limits, status buckets, and errors for the Coach intake queue.
 */

export const COACH_TEXT_INTAKE_MAX_CHARS = 60000;
export const DEFAULT_COACH_INTAKE_LIMIT = 30;
export const MAX_COACH_INTAKE_LIMIT = 75;

export const COACH_INTAKE_SOURCE_TYPES = new Set([
  'voice_note',
  'plaud_clip',
  'audio_upload',
  'transcript_file',
  'pdf_transcript',
  'typed_note',
  'chat_narrative',
]);

export const COACH_INTAKE_SCOPES = new Set([
  'actionable',
  'all',
  'today',
  'unprocessed',
  'processing',
  'ready_review',
  'needs_clarification',
  'duplicate_hold',
  'failed',
  'needs_client',
]);

export const COACH_ARCHIVED_STATUSES = new Set(['APPROVED', 'APPLIED', 'ARCHIVED']);

export class CoachIntakeValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CoachIntakeValidationError';
    this.code = code;
    this.details = details;
  }
}

export class CoachIntakeSchemaUnavailableError extends Error {
  constructor() {
    super('Coach intake queue tables are not available in this environment');
    this.name = 'CoachIntakeSchemaUnavailableError';
    this.code = 'COACH_INTAKE_SCHEMA_UNAVAILABLE';
  }
}
