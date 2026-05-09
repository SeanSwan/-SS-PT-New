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
  TierThreshold,
  UpdateLevelSetting,
  UpdateTierThreshold,
} from './GamificationSettings.types';
import { TIER_COLOR_MAP } from './GamificationSettings.types';

interface GamificationSettingsProgressionSectionsProps {
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
  tierThresholds: TierThreshold[];
  onLevelSettingChange: UpdateLevelSetting;
  onTierThresholdChange: UpdateTierThreshold;
}

const formatTierName = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1);

export const GamificationSettingsProgressionSections: React.FC<GamificationSettingsProgressionSectionsProps> = ({
  levelSettings,
  systemSettings,
  tierThresholds,
  onLevelSettingChange,
  onTierThresholdChange,
}) => {
  const levelsDisabled = !systemSettings.enableGamification || !systemSettings.enableLevels;
  const tiersDisabled = !systemSettings.enableGamification || !systemSettings.enableTiers;
  const formulaDivisor = Math.max(levelSettings.pointsPerLevel, 1);
  const sampleLevel = Math.floor(4500 / formulaDivisor) + 1;

  return (
    <GridContainer className="two-col">
      <GlassCard>
        <CardHeadingRow>
          <TrendingUp size={20} />
          <CardTitle>Level Settings</CardTitle>
        </CardHeadingRow>

        <InputGroup $fullWidth>
          <InputLabel>Points Per Level</InputLabel>
          <StyledInput
            aria-label="Points Per Level"
            type="number"
            value={levelSettings.pointsPerLevel}
            onChange={event => onLevelSettingChange('pointsPerLevel', parseInt(event.target.value) || 0)}
            disabled={levelsDisabled}
            $disabled={levelsDisabled}
            min={1}
          />
          <HelperText>Points required to advance one level</HelperText>
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
              onChange={event => onLevelSettingChange('levelCap', parseInt(event.target.value) || 0)}
              disabled={levelsDisabled || !levelSettings.enableLevelCap}
              $disabled={levelsDisabled || !levelSettings.enableLevelCap}
              min={1}
            />
            <HelperText>Maximum level a user can reach</HelperText>
          </InputGroup>
        </SectionSpacer>

        <FormulaBox>
          <SubTitle>Level Calculation Formula:</SubTitle>
          <CodeBlock>Level = Math.floor(totalPoints / pointsPerLevel) + 1</CodeBlock>
          <MutedText>
            Users start at Level 1. For example, with {levelSettings.pointsPerLevel} points per level,
            a user with 4500 points would be at Level {sampleLevel}.
          </MutedText>
        </FormulaBox>
      </GlassCard>

      <GlassCard>
        <CardHeadingRow>
          <Award size={20} />
          <CardTitle>Tier Thresholds</CardTitle>
        </CardHeadingRow>

        <TableWrapper>
          <StyledTable>
            <THead>
              <tr>
                <th>Tier</th>
                <th>Points Required</th>
              </tr>
            </THead>
            <TBody>
              {tierThresholds.map(tier => (
                <tr key={tier.tier}>
                  <td>
                    <TierCell>
                      <TierDot $color={TIER_COLOR_MAP[tier.tier]} />
                      {formatTierName(tier.tier)}
                    </TierCell>
                  </td>
                  <td>
                    <InlineInputRow>
                      <StyledInput
                        aria-label={`${formatTierName(tier.tier)} Points Required`}
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
          Set the point thresholds required for users to reach each tier. Bronze should be attainable
          fairly easily, while Platinum should represent significant achievement.
        </MutedText>

        <AlertBanner $variant="info" $compact>
          <AlertContent>
            <Info size={16} />
            Make sure tier thresholds are properly spaced to create achievable progression.
          </AlertContent>
        </AlertBanner>
      </GlassCard>
    </GridContainer>
  );
};
