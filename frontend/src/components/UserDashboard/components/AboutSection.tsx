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

import React, { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
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

const AboutSection: React.FC = () => {
  const { user } = useAuth();
  const { profile, achievements, isLoading, levelProgress } = useGamificationData();
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
