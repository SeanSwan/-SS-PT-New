/**
 * FILE: CoachCommandLogEntry.tsx
 * PURPOSE: Readable command-log renderer for Swan Coach draft/readback output.
 *
 * The command log can contain natural-language recommendations plus a trailing
 * structured packet. This component keeps the human copy readable and keeps the
 * raw packet available for audit without turning the console into one text blob.
 */
import React from 'react';
import styled, { css } from 'styled-components';
import type { CommandLogEntry } from './CoachCommandCenter.data';
type LogActor = CommandLogEntry['actor'];

type LogStep = {
  number: string;
  title: string;
  body: string;
};

type FormattedLogBody = {
  leadParagraphs: string[];
  steps: LogStep[];
  structuredPacket?: string;
};

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

type CoachCommandLogEntryProps = {
  entry: CommandLogEntry;
};

function CoachCommandLogEntry({ entry }: CoachCommandLogEntryProps) {
  const formatted = formatCommandLogBody(entry.body);

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

const actorStyles = {
  operator: css`background: color-mix(in srgb, var(--coach-purple, #8b5cf6) 11%, transparent);`,
  coach: css`background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 9%, transparent);`,
  system: css`background: color-mix(in srgb, var(--coach-surface-strong, #102044) 74%, transparent);`,
};

const LogEntry = styled.article<{ $actor: LogActor }>`
  ${({ $actor }) => actorStyles[$actor]}
  border: 1px solid var(--coach-line, rgba(96, 192, 240, 0.18));
  border-radius: 16px;
  box-shadow: 0 16px 42px var(--coach-shadow-soft, rgba(0, 0, 0, 0.2));
  display: grid;
  gap: 10px;
  padding: clamp(12px, 1.6vw, 16px);
`;

const LogMeta = styled.div`
  color: var(--coach-muted, #91a3bd);
  display: flex;
  flex-wrap: wrap;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  gap: 8px;
  justify-content: space-between;
  text-transform: uppercase;
`;

const LogBody = styled.div`
  color: var(--coach-text-soft, #dbeafe);
  display: grid;
  gap: 12px;
  font-size: clamp(0.875rem, 0.82rem + 0.18vw, 0.98rem);
  line-height: 1.62;
  overflow-wrap: anywhere;
  p { margin: 0; }
  strong { color: var(--coach-text, #e0ecf4); font-weight: 820; }
`;

const StepList = styled.ol`
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    align-items: start;
    background: color-mix(in srgb, var(--coach-soft, #102040) 70%, transparent);
    border: 1px solid var(--coach-line, rgba(96, 192, 240, 0.18));
    border-radius: 14px;
    display: grid;
    gap: 10px;
    grid-template-columns: 32px minmax(0, 1fr);
    padding: 12px;
  }
  .step-number {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 28%, transparent);
    border-radius: 999px;
    color: var(--coach-text, #e0ecf4);
    display: inline-flex;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    height: 30px;
    justify-content: center;
    width: 30px;
  }
`;

const PacketDetails = styled.details`
  border: 1px solid var(--coach-line, rgba(96, 192, 240, 0.18));
  border-radius: 14px;
  overflow: hidden;
  summary {
    align-items: center;
    color: var(--coach-text, #e0ecf4);
    cursor: pointer;
    display: flex;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    min-height: 44px;
    padding: 0 12px;
  }
  pre {
    background: var(--coach-deep, #030712);
    border-top: 1px solid var(--coach-line, rgba(96, 192, 240, 0.18));
    color: var(--coach-text-soft, #dbeafe);
    margin: 0;
    max-height: 260px;
    overflow: auto;
    padding: 12px;
    white-space: pre-wrap;
  }
`;

const AttachmentRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  min-width: 0;
  .attachment {
    border: 1px solid var(--coach-line, rgba(96, 192, 240, 0.18));
    border-radius: 999px;
    color: var(--coach-text-soft, #dbeafe);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    padding: 6px 9px;
  }
`;

export default CoachCommandLogEntry;
