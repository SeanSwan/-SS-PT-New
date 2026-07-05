/**
 * Level and tier threshold sections for gamification settings.
 */
import React from 'react';
import { Award, Info, TrendingUp } from 'lucide-react';
import {
  AlertBanner,
  AlertContent,
  CardHeadingRow,
  CardTitle,
  CodeBlock,
  FormulaBox,
  GlassCard,
  GridContainer,
  MutedText,
  SectionSpacer,
  SubTitle,
} from './GamificationSettingsFrame.styles';
import {
  HelperText,
  InlineInputRow,
  InputGroup,
  InputLabel,
  InputSuffix,
  StyledInput,
  StyledTable,
  TBody,
  THead,
  TableWrapper,
  TierCell,
  TierDot,
} from './GamificationSettingsControl.styles';
import { GamificationSettingsToggle } from './GamificationSettingsToggle';
import type {
  LevelSettings,
  SystemSettings,
  TierName,
  TierThreshold,
  UpdateLevelSetting,
  UpdateTierThreshold,
} from './GamificationSettings.types';
import { TIER_COLOR_MAP, TIER_PUBLIC_LABELS } from './GamificationSettings.types';
import { LEVEL_CURVE_SCALE, LEVEL_CURVE_EXPONENT, MAX_LEVEL, pointsForLevel } from '../../../../../types/gamification';

interface GamificationSettingsProgressionSectionsProps {
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
  tierThresholds: TierThreshold[];
  onLevelSettingChange: UpdateLevelSetting;
  onTierThresholdChange: UpdateTierThreshold;
}

const formatTierLabel = (tier: string) => TIER_PUBLIC_LABELS[tier as TierName] ?? 'Swan Arc';
const formatTierColor = (tier: string) => TIER_COLOR_MAP[tier as TierName] ?? 'var(--gamification-tier-fallback, #60C0F0)';

export const GamificationSettingsProgressionSections: React.FC<GamificationSettingsProgressionSectionsProps> = ({
  levelSettings,
  systemSettings,
  tierThresholds,
  onLevelSettingChange,
  onTierThresholdChange,
}) => {
  const levelsDisabled = !systemSettings.enableGamification || !systemSettings.enableLevels;
  const tiersDisabled = !systemSettings.enableGamification || !systemSettings.enableTiers;
  const currentCap = Math.min(Math.max(levelSettings.levelCap || MAX_LEVEL, 1), MAX_LEVEL);
  const capPoints = pointsForLevel(currentCap);

  return (
    <GridContainer className="two-col">
      <GlassCard>
        <CardHeadingRow>
          <TrendingUp size={20} />
          <CardTitle>Level Settings</CardTitle>
        </CardHeadingRow>

        <InputGroup $fullWidth>
          <InputLabel>Legacy Points Per Level</InputLabel>
          <StyledInput
            aria-label="Legacy Points Per Level"
            type="number"
            value={levelSettings.pointsPerLevel}
            onChange={event => onLevelSettingChange('pointsPerLevel', parseInt(event.target.value) || 0)}
            disabled={levelsDisabled}
            $disabled={levelsDisabled}
            min={1}
          />
          <HelperText>Fallback value for older milestone settings; the Swan ladder uses the XP curve below.</HelperText>
        </InputGroup>

        <SectionSpacer>
          <GamificationSettingsToggle
            checked={levelSettings.enableLevelCap}
            onChange={event => onLevelSettingChange('enableLevelCap', event.target.checked)}
            disabled={levelsDisabled}
            label="Enable Level Cap"
          />
        </SectionSpacer>

        <SectionSpacer>
          <InputGroup $fullWidth>
            <InputLabel>Level Cap</InputLabel>
            <StyledInput
              aria-label="Level Cap"
              type="number"
              value={levelSettings.levelCap}
              onChange={event => onLevelSettingChange('levelCap', Math.min(parseInt(event.target.value) || 0, MAX_LEVEL))}
              disabled={levelsDisabled || !levelSettings.enableLevelCap}
              $disabled={levelsDisabled || !levelSettings.enableLevelCap}
              min={1}
              max={MAX_LEVEL}
            />
            <HelperText>Maximum public Swan level. Current ladder cap is Level {MAX_LEVEL}.</HelperText>
          </InputGroup>
        </SectionSpacer>

        <FormulaBox>
          <SubTitle>Live Level Calculation Formula:</SubTitle>
          <CodeBlock>XP for Level L = Math.floor({LEVEL_CURVE_SCALE} × (L − 1) ^ {LEVEL_CURVE_EXPONENT})</CodeBlock>
          <MutedText>
            Users start at Level 1. The selected cap of Level {currentCap} requires {capPoints.toLocaleString()} XP.
          </MutedText>
        </FormulaBox>
      </GlassCard>

      <GlassCard>
        <CardHeadingRow>
          <Award size={20} />
          <CardTitle>Swan Arc Thresholds</CardTitle>
        </CardHeadingRow>

        <TableWrapper>
          <StyledTable>
            <THead>
              <tr>
                <th>Arc</th>
                <th>Points Required</th>
              </tr>
            </THead>
            <TBody>
              {tierThresholds.map(tier => (
                <tr key={tier.tier}>
                  <td>
                    <TierCell>
                      <TierDot $color={formatTierColor(tier.tier)} />
                      {formatTierLabel(tier.tier)}
                    </TierCell>
                  </td>
                  <td>
                    <InlineInputRow>
                      <StyledInput
                        aria-label={`${formatTierLabel(tier.tier)} Points Required`}
                        type="number"
                        value={tier.pointsRequired}
                        onChange={event => onTierThresholdChange(tier.tier, parseInt(event.target.value) || 0)}
                        disabled={tiersDisabled}
                        $disabled={tiersDisabled}
                        $width="120px"
                        min={0}
                      />
                      <InputSuffix>points</InputSuffix>
                    </InlineInputRow>
                  </td>
                </tr>
              ))}
            </TBody>
          </StyledTable>
        </TableWrapper>

        <MutedText>
          Set the point thresholds for each public Swan arc. Early arcs should feel attainable; Amethyst and
          Sapphire-era progression should feel earned through sustained training proof.
        </MutedText>

        <AlertBanner $variant="info" $compact>
          <AlertContent>
            <Info size={16} />
            Keep thresholds spaced so workouts, streaks, badges, and social support all contribute meaningfully.
          </AlertContent>
        </AlertBanner>
      </GlassCard>
    </GridContainer>
  );
};
