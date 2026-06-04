import React from 'react';
import { Award, Calendar, Flag, Star, Trophy } from 'lucide-react';
import type { Achievement, GoalTrackingData } from '../../../../services/enhanced-progress-analytics-service';
import { clampPercent, goalAccentTone } from './GoalProgressTracker.logic';
import {
  AchievementCard,
  AchievementDesc,
  AchievementProgressFrame,
  AchievementTitle,
  AchievementsGrid,
  BodyText,
  Chip,
  ChipOffset,
  CellCaption,
  EmptyState,
  GlassPanel,
  PanelTitle,
  PanelTitleWithGap,
  ProgressBarFill,
  ProgressBarOuter,
} from './GoalProgressTracker.styles';

interface GoalProgressTrackerAchievementsProps {
  data: GoalTrackingData | null;
}

const renderAchievementIcon = (achievement: Achievement) => {
  const color = achievement.earned ? goalAccentTone('warning') : goalAccentTone('muted');

  switch (achievement.icon) {
    case 'star':
      return <Star color={color} size={32} />;
    case 'flag':
      return <Flag color={color} size={32} />;
    case 'calendar':
      return <Calendar color={color} size={32} />;
    default:
      return <Trophy color={color} size={32} />;
  }
};

const GoalProgressTrackerAchievements: React.FC<GoalProgressTrackerAchievementsProps> = ({ data }) => {
  if (!data) return null;

  return (
    <GlassPanel>
      <PanelTitleWithGap>
        <Award color={goalAccentTone('warning')} size={20} />
        Achievements &amp; Badges
      </PanelTitleWithGap>

      {data.achievements.length === 0 ? (
        <EmptyState>
          <PanelTitle>No Goal Achievements Yet</PanelTitle>
          <BodyText>Completed goals will appear here once they are saved in this client's goal history.</BodyText>
        </EmptyState>
      ) : (
        <AchievementsGrid>
          {data.achievements.map((achievement) => (
            <AchievementCard key={achievement.id} $earned={achievement.earned}>
              <div>{renderAchievementIcon(achievement)}</div>
              <AchievementTitle>{achievement.title}</AchievementTitle>
              <AchievementDesc>{achievement.description}</AchievementDesc>

              {achievement.earned ? (
                <ChipOffset>
                  <Chip $bg={goalAccentTone('success')} $color="var(--text-on-danger, #ffffff)">
                    Earned {new Date(achievement.date!).toLocaleDateString()}
                  </Chip>
                </ChipOffset>
              ) : achievement.progress !== undefined ? (
                <AchievementProgressFrame>
                  <ProgressBarOuter $full>
                    <ProgressBarFill $value={clampPercent(achievement.progress)} $color={goalAccentTone('primary')} />
                  </ProgressBarOuter>
                  <CellCaption>{clampPercent(achievement.progress)}% complete</CellCaption>
                </AchievementProgressFrame>
              ) : (
                <ChipOffset>
                  <Chip>Locked</Chip>
                </ChipOffset>
              )}
            </AchievementCard>
          ))}
        </AchievementsGrid>
      )}
    </GlassPanel>
  );
};

export default GoalProgressTrackerAchievements;
