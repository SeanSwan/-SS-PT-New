/**
 * Command Outcome Contract
 * ========================
 * Canonical, strict result boundary for the shared Swan brain. The model may
 * suggest structured data, but only outcomes accepted here may cross into an
 * application surface. Parse failures become a non-mutating error and never
 * expose raw provider text as successful user content.
 *
 * Security invariants:
 * - exact JSON only for string inputs (no fences or prose recovery)
 * - strict objects reject undeclared fields
 * - mutation actions are a closed discriminated union
 * - failure copy contains no provider output
 */
import { z } from 'zod';

export const CommandErrorCodeSchema = z.enum([
  'PARSE_FAIL',
  'CLASSIFICATION_FAILED',
  'UNKNOWN_INTENT',
  'CAPABILITY_DENIED',
  'POLICY_DENIED',
  'STALE_VERSION',
  'CONFLICT',
  'VALIDATION_FAILED',
  'EXECUTION_FAILED',
]);

const IdentifierSchema = z.string().trim().min(1).max(160);
const ShortTextSchema = z.string().trim().min(1).max(500);
const LongTextSchema = z.string().trim().min(1).max(6000);
const ChangeSetSchema = z.record(z.unknown()).refine(
  (changes) => Object.keys(changes).length > 0,
  'changes must contain at least one field',
);

const MoveExerciseActionSchema = z.object({
  type: z.literal('move_exercise'),
  dayId: IdentifierSchema,
  exerciseId: IdentifierSchema,
  toIndex: z.number().int().nonnegative(),
}).strict();

const MoveDayActionSchema = z.object({
  type: z.literal('move_day'),
  dayId: IdentifierSchema,
  toIndex: z.number().int().nonnegative(),
}).strict();

const UpdateExerciseActionSchema = z.object({
  type: z.literal('update_exercise'),
  dayId: IdentifierSchema,
  exerciseId: IdentifierSchema,
  changes: ChangeSetSchema,
}).strict();

const AddExerciseActionSchema = z.object({
  type: z.literal('add_exercise'),
  dayId: IdentifierSchema,
  exercise: z.record(z.unknown()).refine(
    (exercise) => Object.keys(exercise).length > 0,
    'exercise must contain structured data',
  ),
  toIndex: z.number().int().nonnegative().optional(),
}).strict();

const RemoveExerciseActionSchema = z.object({
  type: z.literal('remove_exercise'),
  dayId: IdentifierSchema,
  exerciseId: IdentifierSchema,
}).strict();

export const CommandMutationActionSchema = z.discriminatedUnion('type', [
  MoveExerciseActionSchema,
  MoveDayActionSchema,
  UpdateExerciseActionSchema,
  AddExerciseActionSchema,
  RemoveExerciseActionSchema,
]);

const ConversationOutcomeSchema = z.object({
  type: z.literal('conversation'),
  text: LongTextSchema,
}).strict();

const AnalysisOutcomeSchema = z.object({
  type: z.literal('analysis'),
  text: LongTextSchema,
  findings: z.array(z.object({
    code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
    message: ShortTextSchema,
  }).strict()).max(50),
}).strict();

const ProposalOutcomeSchema = z.object({
  type: z.literal('proposal'),
  summary: LongTextSchema,
  actions: z.array(CommandMutationActionSchema).min(1).max(200),
}).strict();

const MutationOutcomeSchema = z.object({
  type: z.literal('mutation'),
  target: z.object({
    entityType: z.literal('workout_plan'),
    entityId: IdentifierSchema,
    entityVersion: IdentifierSchema,
  }).strict(),
  instruction: LongTextSchema,
  declaredScope: z.object({
    dayIds: z.array(IdentifierSchema).max(100),
    exerciseIds: z.array(IdentifierSchema).max(500),
  }).strict(),
  actions: z.array(CommandMutationActionSchema).min(1).max(200),
}).strict();

const ClarificationOutcomeSchema = z.object({
  type: z.literal('clarification'),
  question: ShortTextSchema,
  pendingIntentToken: z.string().trim().min(16).max(512),
}).strict();

const RefusalOutcomeSchema = z.object({
  type: z.literal('refusal'),
  code: z.enum(['CAPABILITY_DENIED', 'POLICY_DENIED']),
  message: ShortTextSchema,
}).strict();

const ErrorOutcomeSchema = z.object({
  type: z.literal('error'),
  code: CommandErrorCodeSchema,
  message: ShortTextSchema,
}).strict();

export const CommandOutcomeSchema = z.discriminatedUnion('type', [
  ConversationOutcomeSchema,
  AnalysisOutcomeSchema,
  ProposalOutcomeSchema,
  MutationOutcomeSchema,
  ClarificationOutcomeSchema,
  RefusalOutcomeSchema,
  ErrorOutcomeSchema,
]);

const DEFAULT_ERROR_MESSAGES = Object.freeze({
  PARSE_FAIL: 'Swan Coach could not safely interpret that request. No data was changed.',
  CLASSIFICATION_FAILED: 'Swan Coach could not classify that request. No data was changed.',
  UNKNOWN_INTENT: 'That request did not match a registered Swan Coach command. No data was changed.',
  CAPABILITY_DENIED: 'This surface is not allowed to perform that action. No data was changed.',
  POLICY_DENIED: 'Swan Coach policy blocked that action. No data was changed.',
  STALE_VERSION: 'The workout plan changed before this action could be applied. No data was changed.',
  CONFLICT: 'That action conflicts with a newer workout plan update. No data was changed.',
  VALIDATION_FAILED: 'That request did not pass command validation. No data was changed.',
  EXECUTION_FAILED: 'Swan Coach could not complete that action. No data was changed.',
});

export function createCommandErrorOutcome(code) {
  const parsedCode = CommandErrorCodeSchema.safeParse(code);
  const safeCode = parsedCode.success ? parsedCode.data : 'EXECUTION_FAILED';

  return {
    type: 'error',
    code: safeCode,
    message: DEFAULT_ERROR_MESSAGES[safeCode],
  };
}

export function parseCommandOutcome(input) {
  let candidate = input;

  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input.trim());
    } catch {
      return createCommandErrorOutcome('PARSE_FAIL');
    }
  }

  const parsed = CommandOutcomeSchema.safeParse(candidate);
  return parsed.success
    ? parsed.data
    : createCommandErrorOutcome('PARSE_FAIL');
}

export default CommandOutcomeSchema;
