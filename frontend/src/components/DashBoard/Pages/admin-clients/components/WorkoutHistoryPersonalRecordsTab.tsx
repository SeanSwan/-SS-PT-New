/**
 * WorkoutHistoryPersonalRecordsTab
 *
 * Focused render component for the PRs branch of the canonical admin workout
 * history panel. It receives already-sorted data and only asks the parent to
 * open the share modal for the selected record.
 */
import React from 'react';
import { Share2, Trophy } from 'lucide-react';

import type {
  PersonalRecord,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryDate } from './workoutHistoryFormatters';
import { getPersonalRecordKey } from './workoutHistoryPanelData';
import { buildPersonalRecordShareSession } from './workoutHistorySharing';
import { EmptyState } from './WorkoutHistoryPanel.layoutStyles';
import {
  PRActionRow,
  PRBadge,
  PRCard,
  PRDateText,
  PRDetails,
  PREstimate,
  PRExerciseName,
  ShareIconBtn,
} from './WorkoutHistoryPanel.sessionStyles';

export interface WorkoutHistoryPersonalRecordsTabProps {
  records: PersonalRecord[];
  onShareSession: (session: WorkoutSession) => void;
}

const WorkoutHistoryPersonalRecordsTab: React.FC<WorkoutHistoryPersonalRecordsTabProps> = ({
  records,
  onShareSession,
}) => {
  if (records.length === 0) {
    return (
      <EmptyState>
        <Trophy size={40} />
        <p>No personal records yet</p>
      </EmptyState>
    );
  }

  return (
    <>
      {records.map((pr) => (
        <PRCard key={getPersonalRecordKey(pr)}>
          <PRDetails>
            <PRExerciseName>
              {pr.exercise}
            </PRExerciseName>
            <PRDateText>
              {formatWorkoutHistoryDate(pr.date)}
            </PRDateText>
          </PRDetails>
          <PRActionRow>
            <PRBadge>
              <Trophy size={14} />
              {pr.weight > 0 ? `${pr.weight} lbs` : 'BW'} &times; {pr.reps}
            </PRBadge>
            {pr.estimated1RM && pr.estimated1RM > 0 && (
              <PREstimate>
                Est. 1RM: {pr.estimated1RM} lbs
              </PREstimate>
            )}
            <ShareIconBtn
              type="button"
              aria-label={`Share ${pr.exercise} personal record`}
              onClick={() => onShareSession(buildPersonalRecordShareSession(pr))}
            >
              <Share2 size={12} /> Share
            </ShareIconBtn>
          </PRActionRow>
        </PRCard>
      ))}
    </>
  );
};

export default React.memo(WorkoutHistoryPersonalRecordsTab);
