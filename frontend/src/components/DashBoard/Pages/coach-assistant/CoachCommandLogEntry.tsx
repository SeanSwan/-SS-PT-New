/**
 * FILE: CoachCommandLogEntry.tsx
 * PURPOSE: Readable command-log renderer for Swan Coach draft/readback output.
 *
 * The command log can contain natural-language recommendations plus a trailing
 * structured packet. This component keeps the human copy readable and keeps the
 * raw packet available for audit without turning the console into one text blob.
 */
import { useState } from 'react';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import {
  AttachmentRow,
  LogBody,
  LogEntry,
  LogMeta,
  PacketDetails,
  StyleSwitch,
} from './CoachCommandLogEntry.styles';
import type { CoachCommandLogEntryProps, LogStyleVariantKey } from './CoachCommandLogEntry.types';
import { formatCommandLogBody } from './CoachCommandLogEntry.format';
import { CoachFormattedLogContent } from './CoachFormattedLogContent';
import { buildCoachWorkoutLoggerHandoff } from './CoachCommandLoggerHandoff';
import CoachWorkoutLoggerReviewCard from './CoachWorkoutLoggerReviewCard';

export { formatCommandLogBody } from './CoachCommandLogEntry.format';

function CoachCommandLogEntry({
  entry,
  onCancelCommand,
  onConfirmCommand,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}: CoachCommandLogEntryProps) {
  const formatted = formatCommandLogBody(entry.body);
  const [activeVariant, setActiveVariant] = useState<LogStyleVariantKey>('science');
  const selectedVariant = formatted.variants?.find((variant) => variant.key === activeVariant) || formatted.variants?.[0];
  const visibleBody = selectedVariant?.body || formatted;
  const loggerRoute = workoutLoggerRoute || null;
  const loggerHandoff = entry.actor === 'coach' && loggerRoute
    ? buildCoachWorkoutLoggerHandoff(visibleBody)
    : null;
  const confirmation = entry.commandConfirmation;

  return (
    <LogEntry $actor={entry.actor}>
      <LogMeta>
        <span>{entry.actor}</span>
        <span>{entry.label}</span>
      </LogMeta>

      <LogBody>
        {formatted.variants?.length ? (
          <StyleSwitch role="group" aria-label="Coach response view">
            {formatted.variants.map((variant) => (
              <button
                type="button"
                key={variant.key}
                aria-pressed={selectedVariant?.key === variant.key}
                onClick={() => setActiveVariant(variant.key)}
              >
                {variant.label}
              </button>
            ))}
          </StyleSwitch>
        ) : null}

        <CoachFormattedLogContent formatted={visibleBody} />

        {loggerHandoff && loggerRoute ? (
          <CoachWorkoutLoggerReviewCard
            handoff={loggerHandoff}
            workoutLoggerRoute={loggerRoute}
            workoutLoggerScopeLabel={workoutLoggerScopeLabel}
          />
        ) : null}

        {formatted.structuredPacket ? (
          <PacketDetails>
            <summary>Structured packet</summary>
            <pre>{formatted.structuredPacket}</pre>
          </PacketDetails>
        ) : null}
      </LogBody>

      {confirmation && onConfirmCommand && onCancelCommand ? (
        <ConfirmationCard
          operationId={confirmation.operationId}
          command={confirmation.command}
          params={confirmation.params}
          client={confirmation.client}
          details={confirmation.details}
          isDestructive={confirmation.isDestructive}
          onConfirm={async () => onConfirmCommand(confirmation)}
          onCancel={async () => onCancelCommand(confirmation)}
        />
      ) : null}

      {entry.commandResult ? (
        <ExecutionResultCard
          command={entry.commandResult.command}
          result={entry.commandResult.result}
          client={entry.commandResult.client}
          message={entry.commandResult.message}
        />
      ) : null}

      {entry.attachments?.length ? (
        <AttachmentRow>
          {entry.attachments.map((attachment) => (
            <span className="attachment" key={attachment}>
              {attachment}
            </span>
          ))}
        </AttachmentRow>
      ) : null}
    </LogEntry>
  );
}

export default CoachCommandLogEntry;
