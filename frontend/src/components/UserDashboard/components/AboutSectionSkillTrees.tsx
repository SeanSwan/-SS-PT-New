/**
 * Skill tree progress card for the active UserDashboard V3 about section.
 */

import React from 'react';
import { Target } from 'lucide-react';
import { SKILL_TREE_DISPLAY, type SkillTree } from '../../../types/gamification';
import { CardHeader, CardTitle, InfoCard } from './AboutSection.styles';
import {
  GoalDescription,
  GoalHeader,
  GoalItem,
  GoalsList,
  GoalStatus,
  GoalTitle,
  ProgressBar,
  ProgressFill,
} from './AboutSectionProgress.styles';
import type { SkillTreeStats } from './AboutSection.types';

interface AboutSectionSkillTreesProps {
  skillTreeStats: SkillTreeStats;
}

const AboutSectionSkillTrees: React.FC<AboutSectionSkillTreesProps> = ({ skillTreeStats }) => (
  <InfoCard initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
    <CardHeader>
      <CardTitle>
        <Target size={20} />
        Skill Trees
      </CardTitle>
    </CardHeader>

    <GoalsList>
      {(Object.entries(SKILL_TREE_DISPLAY) as [SkillTree, typeof SKILL_TREE_DISPLAY[SkillTree]][]).map(([key, tree]) => {
        const total = skillTreeStats.total[key] || 0;
        const earned = skillTreeStats.earned[key] || 0;
        const hasProgress = earned > 0;
        const progress = total > 0 ? (earned / total) * 100 : 0;

        return (
          <GoalItem key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <GoalHeader>
              <GoalTitle>{tree.name}</GoalTitle>
              <GoalStatus $completed={hasProgress}>{earned}/{total} earned</GoalStatus>
            </GoalHeader>
            <GoalDescription>{tree.description}</GoalDescription>
            {total > 0 && (
              <ProgressBar>
                <ProgressFill $progress={progress} $active={hasProgress} />
              </ProgressBar>
            )}
          </GoalItem>
        );
      })}
    </GoalsList>
  </InfoCard>
);

export default AboutSectionSkillTrees;
