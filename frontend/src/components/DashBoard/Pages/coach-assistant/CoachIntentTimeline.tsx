/**
 * FILE: CoachIntentTimeline.tsx
 * PURPOSE: Session Desk receipts timeline. Shows server workout-intent receipts with bounded
 *          pagination. Read / check / open only — the timeline never mutates intent state
 *          (S6: "Server receipts; bounded pagination; read/check/open only").
 *
 *          Closing the detail view hides it but retains the timeline entry (S6: "Do not erase a
 *          terminal receipt by closing its sheet; hide the view and retain timeline entry").
 */
import React, { useMemo, useState } from 'react';

export type CoachTimelineEntryState =
  | 'awaiting_approval'
  | 'executing'
  | 'committed_unverified'
  | 'verified'
  | 'unknown'
  | 'rolled_back'
  | 'cancelled';

export interface CoachTimelineEntry {
  /** Stable receipt id (proposal/intent reference). */
  id: string;
  intentId?: string | null;
  /** Human summary label, e.g. "Bench 4x8 @ 185". */
  label: string;
  state: CoachTimelineEntryState;
  /** ISO timestamp of the receipt, when known. */
  timestamp?: string | null;
}

export interface CoachIntentTimelineProps {
  entries: ReadonlyArray<CoachTimelineEntry>;
  /** Maximum entries rendered per page (bounded). Defaults to 10. */
  pageSize?: number;
  onCheckResult?: (entry: CoachTimelineEntry) => void;
  onOpenRecord?: (entry: CoachTimelineEntry) => void;
  openEntryId?: string | null;
  onOpenEntryChange?: (id: string | null) => void;
}

const STATE_COPY: Record<CoachTimelineEntryState, string> = {
  awaiting_approval: 'Waiting for approval',
  executing: 'Saving…',
  committed_unverified: 'Saved; checking result.',
  verified: 'Saved and checked.',
  unknown: 'Checking whether it saved.',
  rolled_back: 'Nothing was saved.',
  cancelled: 'Cancelled',
};

const CHECKABLE_STATES = new Set<CoachTimelineEntryState>(['committed_unverified', 'unknown', 'awaiting_approval', 'executing']);
const OPENABLE_STATES = new Set<CoachTimelineEntryState>(['verified']);

const CoachIntentTimeline: React.FC<CoachIntentTimelineProps> = ({
  entries,
  pageSize = 10,
  onCheckResult,
  onOpenRecord,
  openEntryId = null,
  onOpenEntryChange,
}) => {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const bounded = useMemo(() => {
    const seen = new Set<string>();
    const ordered: CoachTimelineEntry[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || entry.id === '' || seen.has(entry.id)) continue;
      seen.add(entry.id);
      ordered.push(entry);
    }
    // Newest first when timestamps exist; stable ordering otherwise.
    return ordered.sort((a, b) => {
      const at = a.timestamp ? Date.parse(a.timestamp) : Number.MAX_SAFE_INTEGER;
      const bt = b.timestamp ? Date.parse(b.timestamp) : Number.MAX_SAFE_INTEGER;
      return bt - at;
    });
  }, [entries]);

  const visible = bounded.slice(0, Math.min(visibleCount, bounded.length));
  const remaining = bounded.length - visible.length;
  const openEntry = bounded.find((entry) => entry.id === openEntryId) ?? null;

  if (bounded.length === 0) {
    return (
      <section className="coach-intent-timeline coach-intent-timeline--empty" data-testid="coach-intent-timeline" aria-label="Workout receipts">
        <p className="coach-intent-timeline-empty">No workout receipts yet.</p>
      </section>
    );
  }

  return (
    <section className="coach-intent-timeline" data-testid="coach-intent-timeline" aria-label="Workout receipts">
      <ul className="coach-intent-timeline-list" role="list">
        {visible.map((entry) => {
          const checkable = CHECKABLE_STATES.has(entry.state);
          const openable = OPENABLE_STATES.has(entry.state);
          return (
            <li
              key={entry.id}
              className="coach-intent-timeline-item"
              data-testid={`coach-intent-receipt-${entry.id}`}
              data-state={entry.state}
            >
              <button
                type="button"
                className="coach-intent-timeline-read"
                data-testid={`coach-intent-read-${entry.id}`}
                onClick={() => onOpenEntryChange?.(openEntryId === entry.id ? null : entry.id)}
                aria-expanded={openEntryId === entry.id}
              >
                <span className="coach-intent-timeline-label">{entry.label}</span>
                <span className="coach-intent-timeline-state">{STATE_COPY[entry.state]}</span>
              </button>
              {openEntryId === entry.id ? (
                <div className="coach-intent-timeline-detail" data-testid={`coach-intent-detail-${entry.id}`}>
                  <dl className="coach-intent-timeline-meta">
                    {entry.timestamp ? (
                      <div>
                        <dt>When</dt>
                        <dd>{new Date(entry.timestamp).toLocaleString()}</dd>
                      </div>
                    ) : null}
                    {entry.intentId ? (
                      <div>
                        <dt>Receipt</dt>
                        <dd>{entry.intentId}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="coach-intent-timeline-actions">
                    {checkable && onCheckResult ? (
                      <button
                        type="button"
                        className="coach-intent-timeline-check"
                        data-testid={`coach-intent-check-${entry.id}`}
                        onClick={() => onCheckResult(entry)}
                      >
                        Check result
                      </button>
                    ) : null}
                    {openable && onOpenRecord ? (
                      <button
                        type="button"
                        className="coach-intent-timeline-open"
                        data-testid={`coach-intent-open-${entry.id}`}
                        onClick={() => onOpenRecord(entry)}
                      >
                        Open record
                      </button>
                    ) : null}
                    {onOpenEntryChange ? (
                      <button
                        type="button"
                        className="coach-intent-timeline-close"
                        data-testid={`coach-intent-close-${entry.id}`}
                        onClick={() => onOpenEntryChange(null)}
                      >
                        Close
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          className="coach-intent-timeline-more"
          data-testid="coach-intent-timeline-more"
          onClick={() => setVisibleCount((current) => Math.min(current + pageSize, bounded.length))}
        >
          Show {Math.min(pageSize, remaining)} more receipts
        </button>
      ) : null}
      {openEntry ? (
        <span className="coach-intent-timeline-open-note" data-testid="coach-intent-timeline-open-note">
          Showing receipt for {openEntry.label}
        </span>
      ) : null}
    </section>
  );
};

export default CoachIntentTimeline;
