/**
 * FILE: CoachContextStatus.tsx
 * PURPOSE: Session Desk source-quality strip. Renders permission-filtered context sources
 *          (pain, schedule, equipment, …) with honest quality states. The caller filters
 *          sources by the actor's permissions before passing them — this component never
 *          self-reports freshness and never fetches (S6: "no self-reported freshness").
 *
 *          States per source: verified / partial / unavailable. Unavailable sources expose
 *          Retry + manual review; verified/partial are read-only chips.
 */
import React, { useMemo } from 'react';

export type CoachContextSourceQuality = 'verified' | 'partial' | 'unavailable';

export interface CoachContextSource {
  /** Stable source key, e.g. 'pain' | 'schedule' | 'equipment' | 'progress'. */
  source: string;
  /** Human label, e.g. 'Pain' | 'Schedule'. */
  label: string;
  quality: CoachContextSourceQuality;
  /** Optional bounded note for partial/unavailable sources (never free-text health data). */
  note?: string | null;
}

export interface CoachContextStatusProps {
  /** Permission-filtered sources the current actor may see. Empty renders nothing. */
  sources: ReadonlyArray<CoachContextSource>;
  onRetry?: (source: string) => void;
  onManualReview?: (source: string) => void;
}

const QUALITY_COPY: Record<CoachContextSourceQuality, string> = {
  verified: 'Checked',
  partial: 'Partial',
  unavailable: 'Unavailable',
};

const CoachContextStatus: React.FC<CoachContextStatusProps> = ({ sources, onRetry, onManualReview }) => {
  const visible = useMemo(
    () =>
      sources
        .filter((item) => item && typeof item.source === 'string' && item.source.trim() !== '' && item.label)
        .slice(0, 12),
    [sources],
  );
  if (visible.length === 0) return null;

  return (
    <section className="coach-context-status" aria-label="Context sources" data-testid="coach-context-status">
      <ul className="coach-context-status-list" role="list">
        {visible.map((item) => {
          const unavailable = item.quality === 'unavailable';
          return (
            <li
              key={item.source}
              className={`coach-context-status-item coach-context-status-item--${item.quality}`}
              data-testid={`coach-context-source-${item.source}`}
              data-quality={item.quality}
            >
              <span className="coach-context-status-label">
                {item.label} <span className="coach-context-status-quality" aria-hidden="true">{QUALITY_COPY[item.quality]}</span>
              </span>
              {item.note ? <span className="coach-context-status-note">{item.note}</span> : null}
              {unavailable ? (
                <span className="coach-context-status-actions">
                  <span className="coach-context-status-copy">Current {item.label.toLowerCase()} information is unavailable.</span>
                  {onRetry ? (
                    <button
                      type="button"
                      className="coach-context-status-retry"
                      data-testid={`coach-context-retry-${item.source}`}
                      onClick={() => onRetry(item.source)}
                    >
                      Retry
                    </button>
                  ) : null}
                  {onManualReview ? (
                    <button
                      type="button"
                      className="coach-context-status-manual"
                      data-testid={`coach-context-manual-${item.source}`}
                      onClick={() => onManualReview(item.source)}
                    >
                      Manual review
                    </button>
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CoachContextStatus;
