import { isCommandLaneCandidate } from '../../../../hooks/aiMessageLimits';
import type { CommandResponse, ConfirmResult } from '../../../../hooks/useCoachCommand';
import type { CommandLogConfirmation, CommandLogResult } from './CoachCommandCenter.data';
import { commandResultSummary } from './utils/coachCommandResultSummary';

export type ExecuteCoachCommand = (
  message: string,
  opts?: {
    selectedClientId?: number | null;
    previousContext?: string;
    routeContext?: Record<string, unknown> | null;
  },
) => Promise<CommandResponse>;

export type ConfirmCoachCommand = (operationId: string) => Promise<ConfirmResult>;
export type CancelCoachCommand = (operationId: string) => Promise<void>;
export type CommandConfirmationResult = { success: boolean; error?: string };

type CommandLaneHandledResponse = Exclude<CommandResponse, { type: 'fallback_to_chat' } | { type: 'error' }>;

export function shouldRouteToCommandLane(message: string): boolean {
  return isCommandLaneCandidate(message);
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

export function commandLaneConfirmation(result: CommandLaneHandledResponse): CommandLogConfirmation | undefined {
  if (result.type !== 'confirmation_required') return undefined;
  return {
    operationId: result.operationId,
    command: result.command,
    params: result.params,
    client: result.client,
    details: result.details,
    isDestructive: result.isDestructive,
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
): CommandLogResult | undefined {
  if (!result.success || result.type !== 'executed') return undefined;
  return {
    command: result.command || confirmation.command,
    result: result.result,
    client: confirmation.client,
  };
}

export function commandCancelledBody(confirmation: CommandLogConfirmation): string {
  return `${confirmation.command.replace(/_/g, ' ')} cancelled. No data was changed.`;
}
