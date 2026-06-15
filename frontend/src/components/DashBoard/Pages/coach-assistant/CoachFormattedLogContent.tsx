import React from 'react';
import { BulletList, StepList } from './CoachCommandLogEntry.styles';
import type { FormattedLogBody } from './CoachCommandLogEntry.types';

const WORKOUT_DETAIL_COPY_PATTERN =
  /\b(?:sets?|reps?|rounds?|rpe|rir|rest|tempo|sec(?:onds?)?|min(?:utes?)?|lbs?|kg|warm-?up|cool-?down)\b|\d+\s*x\s*\d+/i;

export function formattedLogBodyToPlainText(formatted: FormattedLogBody): string {
  const lines = [
    ...formatted.leadParagraphs,
    ...formatted.bullets.map((bullet) => `- ${bullet}`),
    ...formatted.steps.map((step) => `${step.number}. ${step.title}: ${step.body}`),
  ];

  return lines.filter(Boolean).join('\n\n');
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

function splitWorkoutBullet(value: string): { name: string; detail: string } | null {
  const match = value.match(/^(.{2,80}?)(?:\s*[:\-]\s+)(.+)$/);
  const name = match?.[1]?.trim();
  const detail = match?.[2]?.trim();

  if (!name || !detail || !WORKOUT_DETAIL_COPY_PATTERN.test(detail)) return null;
  return { name, detail };
}

function renderWorkoutBullet(bullet: string): React.ReactNode {
  const split = splitWorkoutBullet(bullet);

  if (!split) return renderInlineCopy(bullet);

  return (
    <>
      <span className="exercise-name">{renderInlineCopy(split.name)}</span>
      <span className="exercise-detail">{renderInlineCopy(split.detail)}</span>
    </>
  );
}

export function CoachFormattedLogContent({ formatted }: { formatted: FormattedLogBody }) {
  return (
    <>
      {formatted.leadParagraphs.map((paragraph, index) => (
        <p key={`lead-${index}`}>{renderInlineCopy(paragraph)}</p>
      ))}

      {formatted.bullets.length ? (
        <BulletList aria-label="Workout details">
          {formatted.bullets.map((bullet) => (
            <li key={bullet}>{renderWorkoutBullet(bullet)}</li>
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
