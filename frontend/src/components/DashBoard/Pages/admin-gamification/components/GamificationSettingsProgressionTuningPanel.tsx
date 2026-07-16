/**
 * Read-only admin preview for the Swan 1-1000 progression cadence.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  CardHeadingRow,
  CardTitle,
  CodeBlock,
  GlassCard,
  GridContainer,
  MutedText,
  SectionSpacer,
  SubTitle,
} from './GamificationSettingsFrame.styles';
import { StyledTable, TBody, THead, TableWrapper } from './GamificationSettingsControl.styles';
import { LEVEL_CURVE_SCALE, LEVEL_CURVE_EXPONENT, MAX_LEVEL, getRankTitles, pointsForLevel } from '../../../../../types/gamification';
import { getUpcomingProgressionBeats } from '../../../../../types/gamificationProgression';

const SAMPLE_LEVELS = [10, 25, 50, 100, 250, 500, 1000] as const;
const PREVIEW_BEAT_LEVEL = 1;
const numberFormat = new Intl.NumberFormat('en-US');
const rankTitles = getRankTitles();

const getRankTitleForLevel = (level: number): string => (
  rankTitles.find((title) => level >= title.minLevel && level <= title.maxLevel)?.name ?? 'First Flight'
);

const buildProgressionPreviewRows = () => SAMPLE_LEVELS.map((level) => ({
  level,
  pointsRequired: pointsForLevel(level),
  rankTitle: getRankTitleForLevel(level),
}));

const progressionBeatSummary = getUpcomingProgressionBeats({ level: PREVIEW_BEAT_LEVEL, points: 0, count: 6 })
  .map((beat) => `Level ${beat.level}: ${beat.label}`)
  .join(' | ');

export const GamificationSettingsProgressionTuningPanel: React.FC = () => (
  <GlassCard>
    <CardHeadingRow>
      <Sparkles size={20} />
      <CardTitle>Swan Progression Tuning</CardTitle>
    </CardHeadingRow>

    <GridContainer className="two-col">
      <div>
        <SubTitle>Current XP Curve</SubTitle>
        <CodeBlock>XP for Level L = Math.floor({LEVEL_CURVE_SCALE} × (L − 1) ^ {LEVEL_CURVE_EXPONENT})</CodeBlock>
        <MutedText>
          The live rank ladder runs from Level 1 to Level {MAX_LEVEL}. Public rank titles unlock every 10 levels,
          with Sapphire and Crystalline Swan arcs reserved for long-term achievement.
        </MutedText>
      </div>
      <div>
        <SubTitle>Progression Beats</SubTitle>
        <CodeBlock>5 level rhythm / 25 showcase / 50 surge / 100 biome</CodeBlock>
        <MutedText>{progressionBeatSummary}</MutedText>
      </div>
    </GridContainer>

    <SectionSpacer>
      <SubTitle>Lifetime Level Preview</SubTitle>
      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <th>Level</th>
              <th>XP Required</th>
              <th>Public Title Arc</th>
            </tr>
          </THead>
          <TBody>
            {buildProgressionPreviewRows().map((row) => (
              <tr key={row.level}>
                <td>{row.level}</td>
                <td>{numberFormat.format(row.pointsRequired)}</td>
                <td>{row.rankTitle}</td>
              </tr>
            ))}
          </TBody>
        </StyledTable>
      </TableWrapper>
    </SectionSpacer>
  </GlassCard>
);
