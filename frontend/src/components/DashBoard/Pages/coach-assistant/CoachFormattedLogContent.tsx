import React from 'react';
import { BulletList, StepList } from './CoachCommandLogEntry.styles';
import type { FormattedLogBody } from './CoachCommandLogEntry.types';

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

export function CoachFormattedLogContent({ formatted }: { formatted: FormattedLogBody }) {
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
