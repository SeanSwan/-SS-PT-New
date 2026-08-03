/**
 * COMPONENT: AboutSection
 * PURPOSE: Active UserDashboard V3 profile progress and achievements section.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Profile info] [Skill trees]
 * [Achievements]
 *
 * DATA FLOW:
 * Props In: none.
 * State: derived from auth and gamification hooks.
 * API Calls: useGamificationData.
 * Children: AboutSectionProfileCard, AboutSectionSkillTrees, AboutSectionAchievements.
 */

import styled from 'styled-components';
import React, { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { isDataKnown, resolveDataStatus } from '../hooks/resolveDataStatus';
import { useRankTitleSelection } from '../../../hooks/gamification/useRankTitleSelection';
import {
  AboutContainer,
  LoadingSpinner,
  LoadingState,
  SectionGrid,
} from './AboutSection.styles';
import {
  buildAchievementCards,
  buildPersonalInfo,
  buildRankTitleCatalog,
  buildSkillTreeStats,
} from './AboutSection.helpers';
import AboutSectionAchievements from './AboutSectionAchievements';
import AboutSectionProfileCard from './AboutSectionProfileCard';
import AboutSectionRankTitles from './AboutSectionRankTitles';
import AboutSectionSkillTrees from './AboutSectionSkillTrees';

const RetryButton = styled.button`
  min-height: 44px;
  margin-left: 0.75rem;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

const AboutSection: React.FC = () => {
  const { user } = useAuth();
  const { profile, achievements, isLoading, levelProgress, refetch } = useGamificationData();
  // `isLoading` is v5's `isPending && isFetching`, so it is FALSE for a failed
  // query AND for a disabled one. Falling through rendered "Level 0 / 0 points
  // / 0 days" — every value here resolves through `?? 0`.
  const gamificationStatus = resolveDataStatus(profile);
  const { equipRankTitle, isEquippingRankTitle, equippingRankTitleKey } = useRankTitleSelection();
  const profileData = profile?.data;
  const earnedAchievements = useMemo(() => profileData?.achievements ?? [], [profileData?.achievements]);

  const personalInfo = useMemo(
    () => buildPersonalInfo(user, profileData, levelProgress),
    [user, profileData, levelProgress],
  );
  const achievementList = useMemo(
    () => buildAchievementCards(earnedAchievements),
    [earnedAchievements],
  );
  const skillTreeStats = useMemo(
    () => buildSkillTreeStats(achievements?.data, earnedAchievements),
    [achievements?.data, earnedAchievements],
  );
  const rankTitleCatalog = useMemo(
    () => buildRankTitleCatalog(profileData, levelProgress),
    [profileData, levelProgress],
  );

  if (!isLoading && !isDataKnown(gamificationStatus)) {
    return (
      <AboutContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <LoadingState role="status">
          We couldn&apos;t load your profile stats just now. Your logged
          workouts are safe.
          <RetryButton type="button" onClick={() => refetch()}>Retry</RetryButton>
        </LoadingState>
      </AboutContainer>
    );
  }

  if (isLoading) {
    return (
      <AboutContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <LoadingState>
          <LoadingSpinner size={24} />
          Loading profile...
        </LoadingState>
      </AboutContainer>
    );
  }

  return (
    <AboutContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <SectionGrid>
        <AboutSectionProfileCard personalInfo={personalInfo} />
        <AboutSectionSkillTrees skillTreeStats={skillTreeStats} />
      </SectionGrid>
      <AboutSectionRankTitles
        {...rankTitleCatalog}
        currentLevel={levelProgress?.level ?? profileData?.level ?? 1}
        onEquipRankTitle={equipRankTitle}
        isEquippingRankTitle={isEquippingRankTitle}
        equippingRankTitleKey={equippingRankTitleKey}
      />
      <AboutSectionAchievements achievements={achievementList} />
    </AboutContainer>
  );
};

export default AboutSection;
