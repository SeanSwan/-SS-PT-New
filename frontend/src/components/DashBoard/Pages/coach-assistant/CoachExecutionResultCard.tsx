/**
 * CoachExecutionResultCard.tsx
 * ============================
 * Execution-result renderer for Swan Coach command-lane responses.
 *
 * Specialized workflow cards handle Coach intake/audio commands first; generic
 * command results fall back to compact key-value rows plus safe route actions.
 */
import { memo } from 'react';
import styled from 'styled-components';
import { CheckCircle } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';
import {
  CoachAudioInspectionResultCard,
  isAudioInspectionCommand,
} from './CoachAudioInspectionResultCard';
import {
  CoachReviewNextResultCard,
  isCoachReviewNextCommand,
} from './CoachReviewNextResultCard';
import {
  CoachRetentionResultCard,
  isCoachRetentionCommand,
} from './CoachRetentionResultCard';
import {
  CoachPreparedDraftResultCard,
  isPreparedDraftCommand,
} from './CoachPreparedDraftResultCard';
import {
  CoachPlaudStructuredActionResultCard,
  isPlaudStructuredActionCommand,
} from './CoachPlaudStructuredActionResultCard';
import { safeCommandResultMessage } from './CoachIntakeOperationalText.logic';
import { isCommandRouteKey } from './commandRouteKeys';
import { isSafeCommandDisplayKey, renderCommandParamValue } from './coachCommandFormatters';

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-surface, #1A1A24));
`;

const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const CardBody = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 14px;
  line-height: 1.5;
`;

const DataRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;

const DataLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 90px;
  flex-shrink: 0;
`;

const DataValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-word;
`;

const NudgeText = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-style: italic;
`;

const NEXT_ACTION_MAP: Record<string, string> = {
  log_workout: 'Want me to generate a session recap?',
  log_meals: 'Log another meal?',
  create_client: 'Send the claim link to the client now?',
  save_workout_plan: 'Review the plan before saving?',
  create_hermes_task: 'Check task status? Say "show hermes tasks".',
};

export interface ExecutionResultCardProps {
  command: string;
  result: Record<string, unknown> | null;
  client: { id?: number; firstName?: string } | null;
  message?: string;
}

export const ExecutionResultCard = memo(function ExecutionResultCard({
  command,
  result,
  client,
  message,
}: ExecutionResultCardProps) {
  const safeMessage = safeCommandResultMessage(message);

  if (result && isAudioInspectionCommand(command)) {
    return <CoachAudioInspectionResultCard command={command} result={result} message={safeMessage ?? undefined} />;
  }
  if (result && isCoachReviewNextCommand(command)) {
    return <CoachReviewNextResultCard command={command} result={result} message={safeMessage ?? undefined} />;
  }
  if (result && isCoachRetentionCommand(command)) {
    return <CoachRetentionResultCard command={command} result={result} message={safeMessage ?? undefined} />;
  }
  if (result && isPreparedDraftCommand(command)) {
    return <CoachPreparedDraftResultCard command={command} result={result} message={safeMessage ?? undefined} />;
  }
  if (result && isPlaudStructuredActionCommand(command)) {
    return (
      <CoachPlaudStructuredActionResultCard
        command={command}
        result={result}
        message={safeMessage ?? undefined}
      />
    );
  }

  const clientLabel = client?.firstName ?? null;
  const resultEntries = result
    ? Object.entries(result)
      .filter(([key]) => !isCommandRouteKey(key) && isSafeCommandDisplayKey(key))
      .slice(0, 6)
    : [];

  return (
    <CardShell>
      <CardTitle><CheckCircle size={16} aria-hidden="true" /> Command Executed</CardTitle>
      {safeMessage && <CardBody>{safeMessage}</CardBody>}
      <DataRow><DataLabel>Command</DataLabel><DataValue>{command}</DataValue></DataRow>
      {clientLabel && <DataRow><DataLabel>Client</DataLabel><DataValue>{clientLabel}</DataValue></DataRow>}
      {resultEntries.map(([key, value]) => (
        <DataRow key={key}>
          <DataLabel>{key}</DataLabel>
          <DataValue>{renderCommandParamValue(key, value)}</DataValue>
        </DataRow>
      ))}
      <CommandRouteAction command={command} result={result} />
      {NEXT_ACTION_MAP[command] && (
        <NudgeText>{NEXT_ACTION_MAP[command]}</NudgeText>
      )}
    </CardShell>
  );
});
