import { isCommandLaneCandidate } from '../../../../hooks/aiMessageLimits';
import type { CommandResponse, ConfirmResult } from '../../../../hooks/useCoachCommand';
import type { CoachCommandInputMode } from '../../../../hooks/coachInputOrigin';
import type { CommandLogConfirmation, CommandLogResult } from './CoachCommandCenter.data';
import { commandResultSummary } from './utils/coachCommandResultSummary';
import { appendWorkoutPlannerDebateJobId } from '../admin-workout-planner/workoutPlannerDebateJob';

export type ExecuteCoachCommand = (
  message: string,
  opts?: {
    selectedClientId?: number | null;
    previousContext?: string;
    routeContext?: Record<string, unknown> | null;
    commandType?: string;
    inputMode?: CoachCommandInputMode;
  },
) => Promise<CommandResponse>;

export type ConfirmCoachCommand = (
  operationId: string,
  renderedDigest?: string,
  confirmChannel?: 'tap' | 'keyboard' | 'voice',
) => Promise<ConfirmResult>;
export type CancelCoachCommand = (operationId: string) => Promise<void>;
export type CommandConfirmationResult = { success: boolean; error?: string };

type CommandLaneHandledResponse = Exclude<CommandResponse, { type: 'fallback_to_chat' } | { type: 'error' }>;
type ConfirmedCommandLogResultOptions = { workoutPlannerRoute?: string | null };

const WORKOUT_PLAN_DEBATE_COMMANDS = new Set([
  'build_workout_plan',
  'create_nasm_program',
  'generate_periodization',
]);

const isWorkoutPlanDebateCommand = (command: string): boolean => WORKOUT_PLAN_DEBATE_COMMANDS.has(command);

function isCoachRecallCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return /^(what did we do last time|what did .+ do last (workout|session)|show last workout|view last session)\b/.test(normalized)
    || /^(who are my clients|who needs attention|where is .+ in onboarding)\b/.test(normalized);
}

export function commandLaneErrorBody(result: Extract<CommandResponse, { type: 'error' }>): string {
  return result.error || 'Swan Coach command lane failed. No data was changed.';
}

export function shouldRouteToCommandLane(message: string): boolean {
  return isCommandLaneCandidate(message) || isCoachRecallCommand(message);
}

export function commandLaneLogBody(result: CommandLaneHandledResponse): string {
  switch (result.type) {
    case 'executed':
      return commandResultSummary(result.command, result.result, result.client);
    case 'confirmation_required':
      return result.message || 'Approval required before Swan Coach can complete this command.';
    case 'frontend_dispatch':
    case 'not_wired':
    case 'debate_started':
      return result.message;
    default:
      return 'Swan Coach command lane returned a review-gated result.';
  }
}

export function commandLaneLogAttachments(result: CommandLaneHandledResponse): string[] {
  switch (result.type) {
    case 'executed':
    case 'frontend_dispatch':
    case 'not_wired':
      return [result.command].filter(Boolean);
    case 'confirmation_required':
      return [result.command, 'approval required'].filter(Boolean);
    case 'debate_started':
      return [result.debateType, result.jobId].filter(Boolean);
    default:
      return [];
  }
}

export function commandLaneConfirmation(
  result: CommandLaneHandledResponse,
  sourceMessage?: string,
  sourceInputMode?: CoachCommandInputMode,
): CommandLogConfirmation | undefined {
  if (result.type !== 'confirmation_required') return undefined;
  return {
    operationId: result.operationId,
    command: result.command,
    params: result.params,
    client: result.client,
    details: result.details,
    expiresAt: result.expiresAt,
    isDestructive: result.isDestructive,
    ...(result.tier ? { tier: result.tier } : {}),
    ...(result.physical !== undefined ? { physical: result.physical } : {}),
    ...(sourceMessage ? { sourceMessage } : {}),
    ...(sourceInputMode ? { sourceInputMode } : {}),
  };
}

export function commandLaneResult(result: CommandLaneHandledResponse): CommandLogResult | undefined {
  if (result.type !== 'executed') return undefined;
  return {
    command: result.command,
    result: result.result,
    client: result.client,
  };
}

export function commandConfirmationResultBody(
  confirmation: CommandLogConfirmation,
  result: ConfirmResult,
): string {
  if (result.type === 'frontend_dispatch') {
    return result.message || 'Confirmed action sent to the active workout surface.';
  }

  return commandResultSummary(result.command || confirmation.command, result.result, confirmation.client);
}

export function confirmedCommandLogResult(
  confirmation: CommandLogConfirmation,
  result: ConfirmResult,
  options: ConfirmedCommandLogResultOptions = {},
): CommandLogResult | undefined {
  if (!result.success) return undefined;

  const command = result.command || confirmation.command;
  if (result.type === 'debate_started' && isWorkoutPlanDebateCommand(command)) {
    const targetRoute = appendWorkoutPlannerDebateJobId(options.workoutPlannerRoute, result.result?.jobId);
    return {
      command,
      result: {
        ...(result.result ?? {}),
        ...(targetRoute ? { targetRoute } : {}),
      },
      client: confirmation.client,
      message: commandConfirmationResultBody(confirmation, result),
    };
  }

  if (result.type !== 'executed') return undefined;
  return {
    command,
    result: result.result,
    client: confirmation.client,
  };
}

export function commandCancelledBody(confirmation: CommandLogConfirmation): string {
  return `${confirmation.command.replace(/_/g, ' ')} cancelled. No data was changed.`;
}
