/**
 * Full Swan rank-title ladder for the active About/Profile section.
 */
import React from 'react';
import { Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import type { RankTitleCatalog } from './AboutSection.types';
import {
  CardHeader,
  CardTitle,
} from './AboutSection.styles';
import {
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
  currentLevel,
  onEquipRankTitle,
  isEquippingRankTitle,
  equippingRankTitleKey,
}) => {
  const activeTitle = selectedRankTitle ?? currentRankTitle;
  const nextCopy = nextRankTitle
    ? `Next unlock: ${nextRankTitle.name} at Level ${nextRankTitle.minLevel}`
    : 'All rank titles unlocked';

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
          <RankTitleMeta>Level {currentLevel} profile display. {nextCopy}.</RankTitleMeta>
        </RankTitleSummaryCopy>
        <RankTitleCount>{earnedRankTitleCount}/{rankTitles.length} earned</RankTitleCount>
      </RankTitleSummary>

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