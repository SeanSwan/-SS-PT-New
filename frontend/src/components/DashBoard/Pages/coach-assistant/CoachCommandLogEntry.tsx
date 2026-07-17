/**
 * FILE: CoachCommandLogEntry.tsx
 * PURPOSE: Readable command-log renderer for Swan Coach draft/readback output.
 *
 * The command log can contain natural-language recommendations plus a trailing
 * structured packet. This component keeps the human copy readable and keeps the
 * raw packet available for audit without turning the console into one text blob.
 */
import { useState } from 'react';
import CoachActionProposalCard from './CoachActionProposalCard';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import {
  AccessHandoffCard,
  AccessHandoffHeader,
  AccessHandoffToken,
  AttachmentRow,
  LogBody,
  LogEntry,
  LogMeta,
  PacketDetails,
  StyleSwitch,
} from './CoachCommandLogEntry.styles';
import { RetryRow } from './CoachCommandLogEntry.retryStyles';
import type { CoachCommandLogEntryProps, LogStyleVariantKey } from './CoachCommandLogEntry.types';
import { formatCommandLogBody } from './CoachCommandLogEntry.format';
import { CoachFormattedLogContent } from './CoachFormattedLogContent';
import { buildCoachWorkoutLoggerHandoff } from './CoachCommandLoggerHandoff';
import CoachWorkoutLoggerReviewCard from './CoachWorkoutLoggerReviewCard';
import { CommandLogAccessLinkActions, CommandLogClaimCodeCopyAction } from './CoachClaimLinkActions';
import {
  buildCommandResultAccessHandoff,
  commandLogAccessHandoffDescription,
  commandLogAccessHandoffLink,
  commandLogAccessHandoffTitle,
} from './CoachCommandCenter.accessHandoff';

export { formatCommandLogBody } from './CoachCommandLogEntry.format';

function formatLogTime(at?: string): string | null {
  if (!at) return null;
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function CoachCommandLogEntry({
  entry,
  onCancelCommand,
  onConfirmCommand,
  onRetryMessage,
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
  const accessHandoff = entry.accessHandoff ?? buildCommandResultAccessHandoff(entry.commandResult);
  const accessHandoffTitle = accessHandoff ? commandLogAccessHandoffTitle(accessHandoff) : null;
  const accessLink = accessHandoff ? commandLogAccessHandoffLink(accessHandoff) : null;
  const accessHandoffSource = accessHandoff?.clientSource
    ? String(accessHandoff.clientSource).replace(/_/g, ' ')
    : null;

  return (
    <LogEntry $actor={entry.actor}>
      <LogMeta>
        {/* Coach/operator labels already name the speaker ("Swan Coach", "You",
            "operator command") — the raw actor tag only adds signal for system rows. */}
        {entry.actor === 'system' ? <span>{entry.actor}</span> : <span aria-hidden="true" />}
        <span>
          {entry.label}
          {formatLogTime(entry.at) ? <time dateTime={entry.at}> · {formatLogTime(entry.at)}</time> : null}
        </span>
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

        {accessHandoff ? (
          <AccessHandoffCard aria-label="Client access handoff">
            <AccessHandoffHeader>
              <strong>{accessHandoffTitle}</strong>
              {accessHandoffSource ? <span>{accessHandoffSource}</span> : null}
            </AccessHandoffHeader>
            <p>{commandLogAccessHandoffDescription(accessHandoff)}</p>
            {accessHandoff.claimCode ? (
              <AccessHandoffToken>
                <span>Claim code</span>
                <code>{accessHandoff.claimCode}</code>
                <CommandLogClaimCodeCopyAction code={accessHandoff.claimCode} />
              </AccessHandoffToken>
            ) : null}
            {accessLink ? (
              <CommandLogAccessLinkActions url={accessLink.url} label={accessLink.label} />
            ) : null}
          </AccessHandoffCard>
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

      {entry.proposals?.map((proposal) => (
        <CoachActionProposalCard key={proposal.id} proposal={proposal} />
      ))}

      {entry.commandResult ? (
        <ExecutionResultCard
          command={entry.commandResult.command}
          result={entry.commandResult.result}
          client={entry.commandResult.client}
          message={entry.commandResult.message}
          showAccessHandoff={false}
        />
      ) : null}

      {entry.retryMessage && onRetryMessage ? (
        <RetryRow>
          <button type="button" onClick={() => onRetryMessage(entry.retryMessage as string)}>
            Retry message
          </button>
        </RetryRow>
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
