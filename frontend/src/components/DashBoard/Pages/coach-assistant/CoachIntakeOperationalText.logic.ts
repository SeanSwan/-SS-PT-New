/**
 * CoachIntakeOperationalText.logic.ts
 * ===================================
 * PII-safe operational text helpers for Coach/PLAUD intake UI surfaces.
 */

const SAFE_HOLD_REASON_LABELS = new Set([
  'Client confirmation needed',
  'Clarification required',
  'Possible duplicate workout',
]);

const SAFE_BLOCKING_GATES = new Set([
  'Intake failed',
  'Processing is still running',
  'Audio order must be confirmed',
  'Client confirmation required',
  'Clarification required',
  'Duplicate risk requires review',
  'Draft waiting for review',
  'Final write requires a prepared draft',
  'No blocking gate',
]);

const SAFE_NEXT_ACTIONS = new Set([
  'Review failed intake',
  'Wait for processing',
  'Confirm audio order',
  'Ask Coach to resolve client',
  'Answer Coach clarification',
  'Review duplicate risk',
  'Review prepared draft',
  'Prepare draft review',
  'Inspect intake audio',
  'Ask Coach about this intake',
  'Review next intake',
]);

const SAFE_COMMAND_HINTS = new Set([
  'Continue from the Swan Coach intake workspace.',
  'Continue from the Swan Coach intake workspace; PLAUD reviewable merges open in the PLAUD review workspace.',
  'No Coach or PLAUD intake items need action.',
  'Open the Swan Coach intake workspace to act on these health findings.',
  'Open the Swan Coach workspace to review retention candidates before any purge job is enabled.',
  'This is a dry-run cleanup plan. No raw artifacts are purged from a Swan Coach command.',
  'Open the active Coach intake dossier and choose Review prepared draft. Final writes still require approval.',
  'Ask Swan Coach to prepare a structured draft review for this intake before any final write.',
  'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
  'That intake is not in the current actionable audio queue. Open the Coach workspace and refresh the intake list.',
  'Open the PLAUD workspace and continue with the next intake item.',
  'No PLAUD intake items need action.',
  'Open the PLAUD workspace and select the audio pieces in chronological order.',
  'Open the PLAUD workspace and select the audio pieces in chronological order; this uses upload/ingest timestamps until recorded_at metadata is available.',
  'Open the PLAUD workspace to upload or wait for more audio pieces before merging; timeline uses upload/ingest timestamps until recorded_at metadata is available.',
]);

const SAFE_COMMAND_RESULT_MESSAGES = new Set([
  'Command completed.',
  'Action confirmed.',
  'No command action was needed.',
]);

const SAFE_AUDIO_REVIEW_LABELS = new Set([
  'Choose an intake to review',
  'No audio intake to review',
  'Refresh intake list',
  'Confirm this intake order',
  'Prepare Coach draft review',
]);

const SAFE_AUDIO_CONFIDENCE_LABELS: Record<string, string> = {
  high: 'high confidence',
  low: 'low confidence',
  medium: 'medium confidence',
  single: 'single confidence',
};

const SAFE_AUDIO_REVIEW_RATIONALES = new Set([
  'Open the Coach intake workspace, choose one audio item, then confirm order before draft generation.',
  'No actionable audio pieces are currently available in this queue.',
  'The selected intake was not found in the current actionable audio queue.',
]);

const SAFE_OPERATOR_ACTION_LABELS_BY_KEY: Record<string, string> = {
  answer_clarifications: 'Answer Coach clarifications',
  inspect_failed_intake: 'Inspect failed intake',
  inspect_stuck_processing: 'Inspect stuck processing intake',
  none: 'No active intake work',
  resolve_clients: 'Resolve client confirmations',
  review_duplicate_holds: 'Review duplicate-risk holds',
  review_next: 'Review next intake',
  review_purge_candidates: 'Review raw artifact purge candidates',
  review_ready_drafts: 'Review ready drafts',
  review_stale_intake: 'Review stale intake artifacts',
  schema_unavailable: 'Run Coach intake migration',
};

const AUDIO_ORDER_RATIONALE_PATTERN = /^\d+ pieces across \d+ bundles need order review before Swan Coach drafts a workout log\.$/;
const AUDIO_READY_RATIONALE_PATTERN = /^(1 audio piece is|\d+ audio pieces are) ready for Swan Coach draft preparation after client and date checks\.$/;

function compactText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\r\n\t`\\]/g, ' ').trim();
  return text ? text.slice(0, 96) : null;
}

function safePatternText(
  value: unknown,
  allowed: Set<string>,
  patterns: RegExp[] = [],
): string | null {
  const text = compactText(value);
  if (!text) return null;
  if (allowed.has(text)) return text;
  return patterns.some((pattern) => pattern.test(text)) ? text : null;
}

function positiveCount(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function confidenceLabel(value: unknown): string | null {
  if (typeof value !== 'string' || value === 'unknown') return null;
  if (!['high', 'medium', 'low'].includes(value)) return null;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} confidence`;
}

export function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function statusLabel(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .toLowerCase();
}

export function pendingDraftLabel(count: number): string {
  return `${count} ${count === 1 ? 'draft' : 'drafts'} pending`;
}

export function safeCommandGateValue(value: unknown): string | null {
  const text = compactText(value);
  return text && SAFE_BLOCKING_GATES.has(text) ? text : null;
}

export function safeActionableGate(value: unknown): string | null {
  const text = safeCommandGateValue(value);
  return text && text !== 'No blocking gate' ? text : null;
}

export function safeCommandActionLabel(value: unknown): string | null {
  const text = compactText(value);
  return text && SAFE_NEXT_ACTIONS.has(text) ? text : null;
}

export function safeCommandHint(value: unknown): string | null {
  return safePatternText(value, SAFE_COMMAND_HINTS);
}

export function safeCommandResultMessage(value: unknown): string | null {
  return safePatternText(value, SAFE_COMMAND_RESULT_MESSAGES);
}

export function safeCommandConfirmationFailure(): string {
  return 'Confirmation failed. Please try again.';
}

export function safeAudioReviewPlanLabel(value: unknown): string | null {
  return safePatternText(value, SAFE_AUDIO_REVIEW_LABELS);
}

export function safeAudioReviewPlanRationale(value: unknown): string | null {
  return safePatternText(value, SAFE_AUDIO_REVIEW_RATIONALES, [
    AUDIO_ORDER_RATIONALE_PATTERN,
    AUDIO_READY_RATIONALE_PATTERN,
  ]);
}

export function safeAudioConfidenceLabel(value: unknown): string {
  if (typeof value !== 'string') return SAFE_AUDIO_CONFIDENCE_LABELS.medium;
  return SAFE_AUDIO_CONFIDENCE_LABELS[value] || SAFE_AUDIO_CONFIDENCE_LABELS.medium;
}

export function safeOperatorActionLabel(key: unknown, label: unknown): string {
  const safeByKey = typeof key === 'string' ? SAFE_OPERATOR_ACTION_LABELS_BY_KEY[key] : null;
  if (safeByKey) return safeByKey;
  const text = compactText(label);
  if (text && Object.values(SAFE_OPERATOR_ACTION_LABELS_BY_KEY).includes(text)) return text;
  return 'Review Coach intake health';
}

export function safeHoldReasonLabel(value: unknown): string | null {
  const label = compactText(value);
  return label && SAFE_HOLD_REASON_LABELS.has(label) ? label : null;
}

export function safeTranscriptFailureReason(kind: unknown, value: unknown): string {
  const safeNoClient = 'Select a client at the top of the page before uploading a transcript.';
  const safeUpload = 'The transcript could not be accepted. Check the file format and try again.';
  const text = compactText(value);

  if (kind === 'no_client') return safeNoClient;
  if (text === 'Upload timed out. The file may be too large or the server is busy.') return text;
  if (text === 'Network error. Please check your connection and try again.') return text;
  if (text === 'No audio clips were accepted into PLAUD intake.') return text;
  if (text === 'Audio upload failed before it reached PLAUD intake.') return text;
  if (text === 'Upload completed but the response was malformed') return text;
  return safeUpload;
}

export function safeTranscriptUploadFailure(kind: unknown): string {
  if (kind === 'rate_limit') return 'Too many transcript uploads. Wait briefly and try again.';
  if (kind === 'network') return 'Network error. Please check your connection and try again.';
  if (kind === 'server') return 'Coach transcript intake could not finish processing. Try again from the same file.';
  return 'The transcript file could not be accepted. Check the format and try again.';
}

export function safeAudioRejectedSummary(rejectedCount: unknown): string | undefined {
  const count = numberValue(rejectedCount);
  if (count <= 0) return undefined;
  return `${count} audio ${count === 1 ? 'file was' : 'files were'} not accepted. Check the format or size and retry.`;
}

export function safeCoachIntakeDraftFailure(): string {
  return 'Could not create Coach intake draft.';
}

export function safeCoachIntakeDraftSaveResult(ok: unknown): string {
  return ok === true
    ? 'Saved as an encrypted Coach intake draft.'
    : safeCoachIntakeDraftFailure();
}

export function safeTranscriptionFailure(): string {
  return 'Transcription failed. Try again or upload the audio through Coach intake.';
}

export function safeMicrophoneFailure(): string {
  return 'Microphone access was blocked. Check browser permission and try again.';
}

export function safeQueueLoadFailure(): string {
  return 'Queue could not be loaded. Refresh or sign in again.';
}

export function safeProposalPreparationFailure(): string {
  return 'Coach could not prepare that draft safely. Try again from the active intake.';
}

export function safeClientCreateFailure(): string {
  return 'Client draft could not be created safely.';
}

export function safeWorkoutImportFailure(): string {
  return 'Workout import could not be completed safely.';
}

export function holdReasonFacts(result: Record<string, unknown>): string[] {
  const facts: string[] = [];
  const candidateCount = positiveCount(result.nextHoldReasonCandidateCount);
  const duplicateCount = positiveCount(result.nextHoldReasonDuplicateCount);
  const confidence = confidenceLabel(result.nextHoldReasonConfidenceBand);
  if (candidateCount) facts.push(`${candidateCount} ${candidateCount === 1 ? 'candidate' : 'candidates'}`);
  if (duplicateCount) facts.push(`${duplicateCount} possible ${duplicateCount === 1 ? 'match' : 'matches'}`);
  if (confidence) facts.push(confidence);
  return facts;
}
