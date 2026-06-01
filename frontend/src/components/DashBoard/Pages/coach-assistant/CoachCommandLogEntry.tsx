/**
 * FILE: CoachCommandLogEntry.tsx
 * PURPOSE: Readable command-log renderer for Swan Coach draft/readback output.
 *
 * The command log can contain natural-language recommendations plus a trailing
 * structured packet. This component keeps the human copy readable and keeps the
 * raw packet available for audit without turning the console into one text blob.
 */
import React from 'react';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import { AttachmentRow, LogBody, LogEntry, LogMeta, PacketDetails, StepList } from './CoachCommandLogEntry.styles';
import type { CoachCommandLogEntryProps, FormattedLogBody } from './CoachCommandLogEntry.types';

const STEP_PATTERN = /(?:^|\s)(\d+)\.\s+\*\*([^*]+?)\*\*:?\s*/g;

function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitParagraphs(value: string): string[] {
  const normalized = normalizeCopy(value);
  if (!normalized) return [];

  const explicitBreaks = value
    .split(/\n{2,}/)
    .map((part) => normalizeCopy(part))
    .filter(Boolean);
  if (explicitBreaks.length > 1) return explicitBreaks;

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [normalized];
  const paragraphs: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    const cleanSentence = normalizeCopy(sentence);
    if (!cleanSentence) return;
    if (current && `${current} ${cleanSentence}`.length > 260) {
      paragraphs.push(current);
      current = cleanSentence;
      return;
    }
    current = current ? `${current} ${cleanSentence}` : cleanSentence;
  });

  if (current) paragraphs.push(current);
  return paragraphs;
}

function extractStructuredPacket(body: string): { readableBody: string; structuredPacket?: string } {
  const candidates = ['{"action"', '{"schema', '{"proposal_type"', '{"client_'];
  const start = candidates
    .map((candidate) => body.indexOf(candidate))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (start === undefined) return { readableBody: body };

  const packet = body.slice(start).trim();
  try {
    return {
      readableBody: body.slice(0, start).trim(),
      structuredPacket: JSON.stringify(JSON.parse(packet), null, 2),
    };
  } catch {
    return { readableBody: body };
  }
}

export function formatCommandLogBody(body: string): FormattedLogBody {
  const { readableBody, structuredPacket } = extractStructuredPacket(body);
  const matches = Array.from(readableBody.matchAll(STEP_PATTERN));

  if (!matches.length) {
    return {
      leadParagraphs: splitParagraphs(readableBody),
      steps: [],
      structuredPacket,
    };
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return {
      leadParagraphs: splitParagraphs(readableBody),
      steps: [],
      structuredPacket,
    };
  }

  const leadParagraphs = splitParagraphs(readableBody.slice(0, firstMatch.index ?? 0));
  const steps = matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? readableBody.length;

    return {
      number: match[1] ?? String(index + 1),
      title: (match[2] ?? 'Step').replace(/:$/, '').trim(),
      body: normalizeCopy(readableBody.slice(bodyStart, bodyEnd)),
    };
  });

  return {
    leadParagraphs,
    steps,
    structuredPacket,
  };
}

function renderInlineCopy(value: string): React.ReactNode[] {
  const parts = value.split(/(\*\*[^*]+?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2).replace(/:$/, '')}</strong>;
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function CoachCommandLogEntry({ entry, onCancelCommand, onConfirmCommand }: CoachCommandLogEntryProps) {
  const formatted = formatCommandLogBody(entry.body);
  const confirmation = entry.commandConfirmation;

  return (
    <LogEntry $actor={entry.actor}>
      <LogMeta>
        <span>{entry.actor}</span>
        <span>{entry.label}</span>
      </LogMeta>

      <LogBody>
        {formatted.leadParagraphs.map((paragraph, index) => (
          <p key={`lead-${index}`}>{renderInlineCopy(paragraph)}</p>
        ))}

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
