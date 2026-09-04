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
import { ExecutionResultCard } from './CoachCommandCards';
import ConfirmationSheet from '../../../CoachConfirm/ConfirmationSheet';
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
import { MessageActionsRow, RetryRow } from './CoachCommandLogEntry.retryStyles';
import { Copy, Volume2 } from 'lucide-react';
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
import type { ConfirmResult } from '../../../../hooks/useCoachCommand';

export { formatCommandLogBody } from './CoachCommandLogEntry.format';

function formatLogTime(at?: string): string | null {
  if (!at) return null;
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const CONFIRM_RESULT_TYPES = new Set<ConfirmResult['type']>([
  'executed', 'error', 'not_wired', 'frontend_dispatch', 'debate_started',
]);

function normalizeSheetResult(body: unknown, confirmation: NonNullable<CoachCommandLogEntryProps['entry']['commandConfirmation']>): ConfirmResult {
  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawType = typeof source.type === 'string' ? source.type as ConfirmResult['type'] : 'executed';
  const type = CONFIRM_RESULT_TYPES.has(rawType) ? rawType : 'executed';
  const rawResult = source.result;
  return {
    success: source.success !== false,
    type,
    message: typeof source.message === 'string' ? source.message : '',
    result: rawResult && typeof rawResult === 'object' ? rawResult as Record<string, unknown> : null,
    command: typeof source.command === 'string' ? source.command : confirmation.command,
    event: typeof source.event === 'string' ? source.event : undefined,
    payload: source.payload && typeof source.payload === 'object' ? source.payload as Record<string, unknown> : undefined,
    dispatched: typeof source.dispatched === 'boolean' ? source.dispatched : undefined,
  };
}

function CoachCommandLogEntry({
  entry,
  onCancelCommand,
  onConfirmCommand,
  onRetryMessage,
  onSpeak,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
}: CoachCommandLogEntryProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard?.writeText(entry.body).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  };
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

      {confirmation?.operationId && onConfirmCommand && onCancelCommand ? (
        <ConfirmationSheet
          operationId={confirmation.operationId}
          lockedClientId={confirmation.client?.id ?? null}
          presentation="dialog"
          input={{
            tier: confirmation.tier || (confirmation.isDestructive ? 'deliberate' : 'read_back'),
            isDestructive: confirmation.isDestructive,
            affectedCount: Number(confirmation.details?.affectedCount ?? 1),
            physical: Boolean(confirmation.physical),
            irreversible: Boolean(confirmation.details?.irreversible),
          }}
          onDone={(result) => { void onConfirmCommand(confirmation, normalizeSheetResult(result, confirmation)); }}
          onCancel={() => { void onCancelCommand(confirmation, { alreadyCancelled: true }); }}
          onAcknowledge={() => undefined}
          onReissue={confirmation.sourceMessage && onRetryMessage
            ? () => onRetryMessage(confirmation.sourceMessage as string)
            : undefined}
        />
      ) : confirmation ? (
        <div role="status">Swan Coach did not return a pending operation id. No action was run.</div>
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

      {entry.actor === 'coach' && entry.body && !entry.commandResult && !confirmation ? (
        <MessageActionsRow aria-label="Message actions">
          {typeof navigator !== 'undefined' && navigator.clipboard ? (
            <button type="button" onClick={handleCopy}>
              <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
            </button>
          ) : null}
          {onSpeak ? (
            <button type="button" onClick={() => onSpeak(entry.body)}>
              <Volume2 size={14} aria-hidden="true" /> Read aloud
            </button>
          ) : null}
        </MessageActionsRow>
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
