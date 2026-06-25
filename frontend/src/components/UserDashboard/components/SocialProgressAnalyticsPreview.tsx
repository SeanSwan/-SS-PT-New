/**
 * COMPONENT: SocialProgressAnalyticsPreview
 * PURPOSE: User-dashboard home gateway into real workout progress charts.
 */
import React from 'react';
import { BarChart3, Dumbbell, LineChart } from 'lucide-react';
import { useClientProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';
import ProgressChartCube from '../../DashBoard/progress/ProgressChartCube';
import ProgressChartWarRoomBoard from '../../DashBoard/progress/ProgressChartWarRoomBoard';
import type { ClientDashboardTarget } from './ClientDashboardHome.types';
import {
  ActionRow,
  CopyBlock,
  EmptyPanel,
  Eyebrow,
  Muted,
  PreviewButton,
  PreviewStack,
  Title,
} from './SocialProgressAnalyticsPreview.styles';

interface SocialProgressAnalyticsPreviewProps {
  onNavigate: (path: string) => void;
  onTarget: (target: ClientDashboardTarget) => void;
}

const SocialProgressAnalyticsPreview: React.FC<SocialProgressAnalyticsPreviewProps> = ({
  onNavigate,
  onTarget,
}) => {
  const {
    charts,
    isLoading,
    nonEmptyChartCount,
    unavailableChartCount,
  } = useClientProgressCharts();

  if (isLoading && nonEmptyChartCount === 0) {
    return (
      <EmptyPanel aria-label="Progress analytics loading">
        <CopyBlock>
          <Eyebrow><BarChart3 size={14} /> Progress board</Eyebrow>
          <Title>Loading your chart carousel</Title>
          <Muted>Workout analytics are syncing from your logged sessions.</Muted>
        </CopyBlock>
      </EmptyPanel>
    );
  }

  if (nonEmptyChartCount === 0) {
    return (
      <EmptyPanel aria-label="Progress analytics starter">
        <CopyBlock>
          <Eyebrow><LineChart size={14} /> Progress board</Eyebrow>
          <Title>Unlock the rotating chart cube with your first logged workout</Title>
          <Muted>
            Social-only members can still start the board here. Once workouts are logged, this area becomes the same dense chart carousel used in the client progress dashboard.
          </Muted>
        </CopyBlock>
        <ActionRow>
          <PreviewButton type="button" $primary onClick={() => onNavigate('/dashboard/client/log-workout')}>
            <Dumbbell size={16} />
            Log Workout
          </PreviewButton>
          <PreviewButton type="button" onClick={() => onTarget('progress')}>
            <BarChart3 size={16} />
            Progress
          </PreviewButton>
        </ActionRow>
      </EmptyPanel>
    );
  }

  return (
    <PreviewStack aria-label="User dashboard progress analytics preview">
      <ProgressChartCube
        charts={charts}
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
      />
      <ProgressChartWarRoomBoard
        charts={charts}
        storageKey="swan-progress-war-room-board-user-dashboard"
      />
    </PreviewStack>
  );
};

export default React.memo(SocialProgressAnalyticsPreview);
