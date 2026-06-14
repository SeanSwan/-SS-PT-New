/**
 * FILE: CoachCommandLogEntry.tsx
 * PURPOSE: Readable command-log renderer for Swan Coach draft/readback output.
 *
 * The command log can contain natural-language recommendations plus a trailing
 * structured packet. This component keeps the human copy readable and keeps the
 * raw packet available for audit without turning the console into one text blob.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import {
  AttachmentRow,
  BulletList,
  LoggerHandoffRow,
  LogBody,
  LogEntry,
  LogMeta,
  PacketDetails,
  StepList,
  StyleSwitch,
} from './CoachCommandLogEntry.styles';
import type {
  CoachCommandLogEntryProps,
  FormattedLogBody,
  LogStyleVariantKey,
} from './CoachCommandLogEntry.types';
import { formatCommandLogBody } from './CoachCommandLogEntry.format';
import {
  buildCoachWorkoutLoggerHandoff,
  storeCoachWorkoutLoggerHandoff,
} from './CoachCommandLoggerHandoff';

export { formatCommandLogBody } from './CoachCommandLogEntry.format';

function renderInlineCopy(value: string): React.ReactNode[] {
  const parts = value.split(/(\*\*[^*]+?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2).replace(/:$/, '')}</strong>;
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function FormattedLogContent({ formatted }: { formatted: FormattedLogBody }) {
  return (
    <>
      {formatted.leadParagraphs.map((paragraph, index) => (
        <p key={`lead-${index}`}>{renderInlineCopy(paragraph)}</p>
      ))}

      {formatted.bullets.length ? (
        <BulletList aria-label="Workout details">
          {formatted.bullets.map((bullet) => (
            <li key={bullet}>{renderInlineCopy(bullet)}</li>
          ))}
        </BulletList>
      ) : null}

      {formatted.steps.length ? (
        <StepList>
          {formatted.steps.map((step) => (
            <li key={`${step.number}-${step.title}`}>
              <span className="step-number">{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{renderInlineCopy(step.body)}</p>
              </div>
            </li>
          ))}
        </StepList>
      ) : null}
    </>
  );
}

function CoachCommandLogEntry({
  entry,
  onCancelCommand,
  onConfirmCommand,
  workoutLoggerRoute,
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

        <FormattedLogContent formatted={visibleBody} />

        {loggerHandoff && loggerRoute ? (
          <LoggerHandoffRow>
            <Link
              to={loggerRoute}
              aria-label={`Send ${loggerHandoff.exerciseCount} exercises to Logger`}
              onClick={() => storeCoachWorkoutLoggerHandoff(loggerHandoff.payload)}
            >
              Send to Logger
            </Link>
            <span>{loggerHandoff.exerciseCount} exercise{loggerHandoff.exerciseCount === 1 ? '' : 's'} staged for review</span>
          </LoggerHandoffRow>
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
