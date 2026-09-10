/** Existing command-bar result/proposal helpers, extracted to keep the view small.
 * Pure UI compatibility projection; it does not establish durable save proof.
 */
import type { ConfirmResult } from '../../../../hooks/useCoachCommand';
import type { CommandLogConfirmation } from '../../Pages/coach-assistant/CoachCommandCenter.data';
import type { CoachActionProposal } from '../../Pages/coach-assistant/SwanCoachTypes';
export interface ClientTrainingCommandBarProps {
  clientId: number | string;
  clientName?: string;
  scheduledSessionCreditHint?: number | null;
  scheduledSessionDate?: string | null;
  scheduledSessionId?: string | null;
  onCommandLaneStart?: (message: string) => void | Promise<void>;
}
export function proposalBelongsToClient(proposal: CoachActionProposal, clientId: number | string): boolean {
  const proposalClientId = proposal.summary?.clientId;
  return proposalClientId != null && String(proposalClientId) === String(clientId);
}
const CONFIRM_RESULT_TYPES = new Set<ConfirmResult['type']>([
  'executed', 'error', 'not_wired', 'frontend_dispatch', 'debate_started',
]);
export function normalizeSheetResult(body: unknown, confirmation: CommandLogConfirmation): ConfirmResult {
  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawType = typeof source.type === 'string' ? source.type as ConfirmResult['type'] : 'executed';
  return {
    success: source.success !== false,
    type: CONFIRM_RESULT_TYPES.has(rawType) ? rawType : 'executed',
    message: typeof source.message === 'string' ? source.message : '',
    result: source.result && typeof source.result === 'object'
      ? source.result as Record<string, unknown> : null,
    command: typeof source.command === 'string' ? source.command : confirmation.command,
    event: typeof source.event === 'string' ? source.event : undefined,
    payload: source.payload && typeof source.payload === 'object'
      ? source.payload as Record<string, unknown> : undefined,
    dispatched: typeof source.dispatched === 'boolean' ? source.dispatched : undefined,
  };
}
