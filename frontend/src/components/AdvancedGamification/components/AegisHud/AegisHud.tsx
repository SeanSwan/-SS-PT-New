/**
 * COMPONENT: AegisHud
 * PURPOSE: Mounted RPG needs panel for athletic, recovery, social,
 * discipline, and vitality state.
 * DATA: GET /api/gamification/users/:userId/aegis-hud through useAegisHud.
 */
import React from 'react';
import { Shield } from 'lucide-react';
import type { AegisHudProps } from './AegisHudTypes';
import { useAegisHud } from './useAegisHud';
import NeedBarComponent from './NeedBarComponent';
import MoodletBadge from './MoodletBadge';
import {
  HudContainer,
  HudHeader,
  HudTitle,
  OverallHealth,
  NeedBarRow,
  NeedInfo,
  NeedLabelRow,
  SkeletonBar,
  SkeletonLabel,
  MoodletContainer,
} from './AegisHudStyles';
import {
  ErrorContent,
  ErrorHudContainer,
  ErrorRetryButton,
  ErrorText,
  ErrorTitle,
  HeaderMeta,
  SkeletonIcon,
  SkeletonValueLabel,
} from './AegisHudStateStyles';

const AegisHudSkeleton: React.FC = () => (
  <HudContainer role="status" aria-live="polite" aria-label="Loading Aegis HUD">
    <HudHeader>
      <HudTitle>
        <Shield size={16} />
        AEGIS HUD
      </HudTitle>
    </HudHeader>
    {[1, 2, 3, 4, 5].map((i) => (
      <NeedBarRow key={i}>
        <SkeletonIcon aria-hidden="true" />
        <NeedInfo>
          <NeedLabelRow><SkeletonLabel /><SkeletonValueLabel /></NeedLabelRow>
          <SkeletonBar />
        </NeedInfo>
      </NeedBarRow>
    ))}
  </HudContainer>
);

const AegisHudError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <ErrorHudContainer role="alert" aria-live="polite">
    <HudHeader>
      <HudTitle>
        <Shield size={16} />
        AEGIS HUD
      </HudTitle>
    </HudHeader>
    <ErrorContent>
      <ErrorTitle>Unable to load needs data</ErrorTitle>
      <ErrorText>Needs data is temporarily unavailable. Refresh the HUD to try again.</ErrorText>
      <ErrorRetryButton
        type="button"
        onClick={onRetry}
      >
        Retry
      </ErrorRetryButton>
    </ErrorContent>
  </ErrorHudContainer>
);

const AegisHud: React.FC<AegisHudProps> = ({
  userId,
  compact = false,
  showMoodlet = true,
  className,
}) => {
  const { data, loading, error, refresh } = useAegisHud(userId);

  if (loading) return <AegisHudSkeleton />;
  if (error) return <AegisHudError onRetry={refresh} />;
  if (!data) return null;

  return (
    <HudContainer $compact={compact} className={className}>
      <HudHeader>
        <HudTitle>
          <Shield size={16} />
          AEGIS HUD
        </HudTitle>

        <HeaderMeta>
          {showMoodlet && data.moodlet && (
            <MoodletContainer>
              <MoodletBadge moodlet={data.moodlet} size={compact ? 'sm' : 'md'} />
            </MoodletContainer>
          )}
          <OverallHealth $value={data.overallHealth}>
            {data.overallHealth.toFixed(1)}%
          </OverallHealth>
        </HeaderMeta>
      </HudHeader>

      {data.needs.map((need) => (
        <NeedBarComponent key={need.key} need={need} animate />
      ))}
    </HudContainer>
  );
};

AegisHud.displayName = 'AegisHud';

export default AegisHud;
