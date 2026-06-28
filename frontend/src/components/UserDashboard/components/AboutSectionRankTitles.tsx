/**
 * Full Swan rank-title ladder for the active About/Profile section.
 */
import React from 'react';
import { Award, CheckCircle2, Lock, Sparkles, TrendingUp } from 'lucide-react';
import type { RankTitleCatalog } from './AboutSection.types';
import {
  CardHeader,
  CardTitle,
} from './AboutSection.styles';
import {
  ProgressionBeatCard,
  ProgressionBeatGrid,
  ProgressionBeatLevel,
  ProgressionBeatMeta,
  ProgressionBeatPanel,
  ProgressionBeatReward,
  ProgressionBeatTitle,
  RankTitleAction,
  RankTitleActive,
  RankTitleCount,
  RankTitleCopy,
  RankTitleEyebrow,
  RankTitleList,
  RankTitleMeta,
  RankTitleName,
  RankTitleNumber,
  RankTitleRange,
  RankTitleRow,
  RankTitleSummary,
  RankTitleSummaryCopy,
  RankTitlesCard,
} from './AboutSectionRankTitles.styles';

interface AboutSectionRankTitlesProps extends RankTitleCatalog {
  currentLevel: number;
  onEquipRankTitle: (rankTitleKey: string) => void;
  isEquippingRankTitle: boolean;
  equippingRankTitleKey?: string;
}

const AboutSectionRankTitles: React.FC<AboutSectionRankTitlesProps> = ({
  rankTitles,
  selectedRankTitle,
  currentRankTitle,
  nextRankTitle,
  earnedRankTitleCount,
  upcomingProgressionBeats,
  nextMajorProgressionBeat,
  currentLevel,
  onEquipRankTitle,
  isEquippingRankTitle,
  equippingRankTitleKey,
}) => {
  const activeTitle = selectedRankTitle ?? currentRankTitle;
  const nextCopy = nextRankTitle
    ? 'Next unlock: ' + nextRankTitle.name + ' at Level ' + nextRankTitle.minLevel
    : 'All rank titles unlocked';
  const majorCopy = nextMajorProgressionBeat
    ? 'Next beat: Level ' + nextMajorProgressionBeat.level + ' ' + nextMajorProgressionBeat.label
    : 'Progression roadmap complete';

  return (
    <RankTitlesCard initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
      <CardHeader>
        <CardTitle>
          <Award size={20} />
          Rank Titles
        </CardTitle>
      </CardHeader>

      <RankTitleSummary>
        <RankTitleSummaryCopy>
          <RankTitleEyebrow>Equipped profile tag</RankTitleEyebrow>
          <RankTitleActive>{activeTitle?.label ?? 'Rank 01 | First Flight'}</RankTitleActive>
          <RankTitleMeta>Level {currentLevel} profile display. {nextCopy}. {majorCopy}.</RankTitleMeta>
        </RankTitleSummaryCopy>
        <RankTitleCount>{earnedRankTitleCount}/{rankTitles.length} earned</RankTitleCount>
      </RankTitleSummary>

      {upcomingProgressionBeats.length > 0 && (
        <ProgressionBeatPanel aria-label="Upcoming progression unlocks">
          <RankTitleEyebrow>Next progression beats</RankTitleEyebrow>
          <ProgressionBeatGrid>
            {upcomingProgressionBeats.slice(0, 4).map((beat) => (
              <ProgressionBeatCard key={beat.key}>
                <ProgressionBeatLevel>Level {beat.level}</ProgressionBeatLevel>
                <ProgressionBeatTitle>
                  <TrendingUp size={14} aria-hidden="true" />
                  {beat.label}
                </ProgressionBeatTitle>
                <ProgressionBeatReward>{beat.reward}</ProgressionBeatReward>
                <ProgressionBeatMeta>
                  {beat.pointsRemaining > 0
                    ? beat.pointsRemaining.toLocaleString() + ' XP away'
                    : 'Unlocked'}
                </ProgressionBeatMeta>
              </ProgressionBeatCard>
            ))}
          </ProgressionBeatGrid>
        </ProgressionBeatPanel>
      )}

      <RankTitleList aria-label="Swan rank title unlock ladder">
        {rankTitles.map((rank) => {
          const locked = !rank.earned;
          const selected = rank.isSelected === true || rank.key === activeTitle?.key;
          const equipping = isEquippingRankTitle && equippingRankTitleKey === rank.key;
          const actionLabel = locked
            ? `Locked until Level ${rank.minLevel}`
            : selected
              ? 'Equipped'
              : equipping
                ? 'Equipping'
                : 'Equip';

          return (
            <RankTitleRow key={rank.key} $earned={!locked} $selected={selected}>
              <RankTitleNumber>Rank {String(rank.rankNumber).padStart(2, '0')}</RankTitleNumber>
              <RankTitleCopy>
                <RankTitleName>{rank.name}</RankTitleName>
                <RankTitleRange>Levels {rank.levelRange}</RankTitleRange>
              </RankTitleCopy>
              <RankTitleAction
                type="button"
                $selected={selected}
                disabled={locked || selected || isEquippingRankTitle}
                onClick={() => onEquipRankTitle(rank.key)}
                aria-label={locked ? `${rank.label} locked until Level ${rank.minLevel}` : `${actionLabel} ${rank.label}`}
              >
                {locked ? <Lock size={15} /> : selected ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}
                {actionLabel}
              </RankTitleAction>
            </RankTitleRow>
          );
        })}
      </RankTitleList>
    </RankTitlesCard>
  );
};

export default React.memo(AboutSectionRankTitles);