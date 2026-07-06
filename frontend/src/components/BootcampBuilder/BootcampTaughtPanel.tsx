/**
 * BootcampTaughtPanel
 * ===================
 * Slice 0.2 (Fable Vision arc): the one-tap "Mark as Taught" terminal action
 * plus a compact "Recently taught" history strip. Logging feeds the exercise
 * freshness engine — the next Generate excludes exercises taught in the last
 * 14 days — so this panel is the bootcamp loop's missing closing beat.
 *
 * Mounted once at the bottom of ClassPreviewPanel: with a generated class it
 * sits directly under "Save as Template" (purple terminal action per the
 * Village FAB semantics: cyan = next/navigation, purple = terminal); with no
 * class it still shows the history strip so trainers get freshness feedback
 * with zero clicks. Both live mounts (/dashboard/{admin,trainer}/bootcamp and
 * the /bootcamp-builder alias) inherit it from ClassPreviewPanel.
 */

import React from 'react';
import { ErrorBanner } from './BootcampBuilderStyles';
import { useBootcampTaughtLog } from '../../hooks/useBootcampTaughtLog';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import {
  HistoryList,
  HistoryMeta,
  HistoryRow,
  HistoryStatus,
  HistoryTitle,
  MarkTaughtButton,
  TaughtConfirmed,
  TaughtSection,
} from './BootcampTaughtPanel.styles';

const DAY_TYPE_LABELS: Record<string, string> = {
  lower_body: 'Lower Body',
  upper_body: 'Upper Body',
  cardio: 'Cardio',
  full_body: 'Full Body',
  custom: 'Custom',
};

const formatDayType = (dayType?: string | null): string =>
  (dayType && DAY_TYPE_LABELS[dayType]) || 'Class';

const exerciseCount = (exercisesUsed: unknown): number =>
  Array.isArray(exercisesUsed) ? exercisesUsed.length : 0;

export interface BootcampTaughtPanelProps {
  bootcamp: GeneratedBootcamp | null;
  floorMode?: boolean;
}

const BootcampTaughtPanel: React.FC<BootcampTaughtPanelProps> = ({ bootcamp, floorMode }) => {
  const {
    payload,
    logging,
    loggedId,
    logError,
    history,
    historyTotal,
    historyLoading,
    historyError,
    markTaught,
  } = useBootcampTaughtLog(bootcamp);

  return (
    <TaughtSection>
      {payload && loggedId === null && (
        <MarkTaughtButton
          type="button"
          $floorMode={floorMode}
          onClick={markTaught}
          disabled={logging}
          aria-label="Mark this class as taught"
        >
          {logging ? 'Logging class...' : 'Mark as Taught'}
        </MarkTaughtButton>
      )}

      {loggedId !== null && (
        <TaughtConfirmed role="status">
          Class logged — the next Generate will rotate these exercises for freshness.
        </TaughtConfirmed>
      )}

      {logError && <ErrorBanner role="alert">{logError}</ErrorBanner>}

      <HistoryTitle>Recently taught</HistoryTitle>
      {historyLoading && <HistoryStatus>Loading class history...</HistoryStatus>}
      {!historyLoading && historyError && <HistoryStatus role="alert">{historyError}</HistoryStatus>}
      {!historyLoading && !historyError && historyTotal === 0 && (
        <HistoryStatus>
          No classes logged yet. Mark a class as taught to power exercise rotation.
        </HistoryStatus>
      )}
      {!historyLoading && !historyError && history.length > 0 && (
        <HistoryList>
          {history.map((entry) => (
            <HistoryRow key={entry.id}>
              <span>
                {entry.classDate} · {formatDayType(entry.dayType)}
              </span>
              <HistoryMeta>
                {exerciseCount(entry.exercisesUsed)} exercises
                {entry.classRating ? ` · rated ${entry.classRating}/5` : ''}
              </HistoryMeta>
            </HistoryRow>
          ))}
        </HistoryList>
      )}
    </TaughtSection>
  );
};

export default React.memo(BootcampTaughtPanel);
