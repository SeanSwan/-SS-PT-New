/**
 * SessionDetailSeriesCallout
 * ==========================
 * Recurring-series context and management actions for the session detail modal.
 */

import React from 'react';
import GlowButton from '../ui/buttons/GlowButton';
import { FlexBox, SmallText } from './ui';
import { SeriesCallout } from './SessionDetailModal.baseStyles';

export interface SessionDetailSeriesCalloutProps {
  recurringGroupId: string;
  seriesCount?: number;
  loading: boolean;
  onManageSeries?: (recurringGroupId: string) => void;
  onDeleteSeries: () => void;
}

const SessionDetailSeriesCallout: React.FC<SessionDetailSeriesCalloutProps> = ({
  recurringGroupId,
  seriesCount,
  loading,
  onManageSeries,
  onDeleteSeries,
}) => (
  <SeriesCallout>
    <SmallText>
      Part of recurring series{seriesCount ? ` (${seriesCount} sessions)` : ''}.
    </SmallText>
    <FlexBox gap="0.5rem">
      <GlowButton
        variant="purple"
        size="small"
        onClick={() => onManageSeries?.(recurringGroupId)}
        disabled={loading}
      >
        Edit Series
      </GlowButton>
      <GlowButton
        variant="ruby"
        size="small"
        onClick={onDeleteSeries}
        disabled={loading}
      >
        Delete Series
      </GlowButton>
    </FlexBox>
  </SeriesCallout>
);

export default SessionDetailSeriesCallout;
