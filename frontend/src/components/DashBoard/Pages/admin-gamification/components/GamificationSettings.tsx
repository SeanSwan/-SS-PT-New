import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Save,
  HelpCircle,
  Settings,
  TrendingUp,
  BarChart2,
  Award,
  Zap,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Styled Components – Galaxy-Swan theme                             */
/* ------------------------------------------------------------------ */

const PageWrapper = styled.div`
  width: 100%;
`;

const AlertBanner = styled.div<{ $variant?: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #e2e8f0;
  background: ${({ $variant }) =>
    $variant === 'info'
      ? 'rgba(14, 165, 233, 0.12)'
      : 'rgba(234, 179, 8, 0.12)'};
  border: 1px solid ${({ $variant }) =>
    $variant === 'info'
      ? 'rgba(14, 165, 233, 0.3)'
      : 'rgba(234, 179, 8, 0.3)'};

  svg {
    flex-shrink: 0;
  }
`;

const AlertContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'outlined' | 'ghost'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  white-space: nowrap;

  ${({ $variant }) => {
    switch ($variant) {
      case 'outlined':
        return `
          background: transparent;
          color: #0ea5e9;
          border: 1px solid rgba(14, 165, 233, 0.4);
          &:hover:not(:disabled) {
            background: rgba(14, 165, 233, 0.08);
            border-color: rgba(14, 165, 233, 0.7);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: #e2e8f0;
          border: none;
          padding: 6px 12px;
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.06);
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #0ea5e9, #7851A9);
          color: #ffffff;
          border: none;
          &:hover:not(:disabled) {
            filter: brightness(1.12);
          }
        `;
    }
  }}
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    &.two-col {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

const GlassCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const CardHeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #0ea5e9;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const SwitchGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

/* ---------- Toggle / Switch ---------- */

const SwitchLabel = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 4px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  color: #e2e8f0;
  font-size: 0.875rem;
  user-select: none;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
`;

const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  min-width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) =>
    $checked ? '#0ea5e9' : 'rgba(255, 255, 255, 0.12)'};
  transition: background 0.2s ease;
`;

const SwitchThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const LabelContent = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TooltipButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0;
  margin: -10px;
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.5);
  cursor: help;
  position: relative;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 10px;
    background: rgba(15, 23, 42, 0.97);
    border: 1px solid rgba(14, 165, 233, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #e2e8f0;
    white-space: nowrap;
    z-index: 50;
    pointer-events: none;
  }
`;

/* ---------- Form Controls ---------- */

const InputGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const InputLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.6);
  margin-bottom: 2px;
`;

const HelperText = styled.span`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.5);
  margin-top: 2px;
`;

const StyledInput = styled.input<{ $disabled?: boolean; $textAlign?: string; $width?: string }>`
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  font-size: 0.875rem;
  width: ${({ $width }) => $width || '100%'};
  text-align: ${({ $textAlign }) => $textAlign || 'left'};
  outline: none;
  transition: border-color 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'text')};

  &:focus {
    border-color: #0ea5e9;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

/* ---------- Table ---------- */

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 8px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  th {
    text-align: left;
    padding: 10px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(226, 232, 240, 0.6);
    border-bottom: 1px solid rgba(14, 165, 233, 0.15);
  }
`;

const TBody = styled.tbody`
  td {
    padding: 10px 12px;
    font-size: 0.875rem;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(14, 165, 233, 0.08);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const TierDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 8px;
  vertical-align: middle;
`;

const TierCell = styled.div`
  display: flex;
  align-items: center;
`;

const InputSuffix = styled.span`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.5);
  margin-left: 8px;
`;

const FormulaBox = styled.div`
  margin-top: 24px;
`;

const SubTitle = styled.p`
  margin: 0 0 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const CodeBlock = styled.div`
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(14, 165, 233, 0.1);
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
  color: #0ea5e9;
`;

const MutedText = styled.p`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: rgba(226, 232, 240, 0.5);
`;

const SectionSpacer = styled.div`
  margin-top: 16px;
`;

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

interface TierThreshold {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsRequired: number;
  levelRequired?: number;
}

interface LevelSettings {
  pointsPerLevel: number;
  levelCap: number;
  enableLevelCap: boolean;
}

interface SystemSettings {
  enableGamification: boolean;
  enableAchievements: boolean;
  enableRewards: boolean;
  enableLeaderboard: boolean;
  enableLevels: boolean;
  enableTiers: boolean;
  enableStreaks: boolean;
  notifyOnAchievement: boolean;
  notifyOnLevelUp: boolean;
  notifyOnReward: boolean;
  streakExpirationDays: number;
  pointsExpiration: {
    enabled: boolean;
    expirationDays: number;
  }
}

interface GamificationSettingsProps {
  pointValues: PointValue[];
  tierThresholds: TierThreshold[];
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
  onUpdatePointValues: (pointValues: PointValue[]) => void;
  onUpdateTierThresholds: (tierThresholds: TierThreshold[]) => void;
  onUpdateLevelSettings: (levelSettings: LevelSettings) => void;
  onUpdateSystemSettings: (systemSettings: SystemSettings) => void;
  onSaveSettings: () => void;
  onRestoreDefaults: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helper: Custom Switch                                             */
/* ------------------------------------------------------------------ */

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label: React.ReactNode;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled, label }) => (
  <SwitchLabel $disabled={disabled}>
    <HiddenCheckbox checked={checked} onChange={onChange} disabled={disabled} />
    <SwitchTrack $checked={checked}>
      <SwitchThumb $checked={checked} />
    </SwitchTrack>
    {typeof label === 'string' ? <span>{label}</span> : label}
  </SwitchLabel>
);

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * GamificationSettings Component
 * Admin interface for managing gamification system settings
 */
const GamificationSettings: React.FC<GamificationSettingsProps> = ({
  pointValues,
  tierThresholds,
  levelSettings,
  systemSettings,
  onUpdatePointValues,
  onUpdateTierThresholds,
  onUpdateLevelSettings,
  onUpdateSystemSettings,
  onSaveSettings,
  onRestoreDefaults
}) => {
  // State for the settings
  const [editedPointValues, setEditedPointValues] = useState<PointValue[]>(pointValues);
  const [editedTierThresholds, setEditedTierThresholds] = useState<TierThreshold[]>(tierThresholds);
  const [editedLevelSettings, setEditedLevelSettings] = useState<LevelSettings>(levelSettings);
  const [editedSystemSettings, setEditedSystemSettings] = useState<SystemSettings>(systemSettings);
  const [isEdited, setIsEdited] = useState(false);

  // Handle point value changes
  const handlePointValueChange = (id: string, value: number) => {
    const updated = editedPointValues.map(pv =>
      pv.id === id ? { ...pv, pointValue: value } : pv
    );
    setEditedPointValues(updated);
    setIsEdited(true);
  };

  // Handle tier threshold changes
  const handleTierThresholdChange = (tier: 'bronze' | 'silver' | 'gold' | 'platinum', value: number) => {
    const updated = editedTierThresholds.map(tt =>
      tt.tier === tier ? { ...tt, pointsRequired: value } : tt
    );
    setEditedTierThresholds(updated);
    setIsEdited(true);
  };

  // Handle level settings changes
  const handleLevelSettingChange = (key: keyof LevelSettings, value: number | boolean) => {
    setEditedLevelSettings({
      ...editedLevelSettings,
      [key]: value
    });
    setIsEdited(true);
  };

  // Handle system setting changes
  const handleSystemSettingChange = (key: keyof SystemSettings, value: boolean | number | { enabled: boolean, expirationDays: number }) => {
    setEditedSystemSettings({
      ...editedSystemSettings,
      [key]: value
    });
    setIsEdited(true);
  };

  // Handle save button click
  const handleSave = () => {
    onUpdatePointValues(editedPointValues);
    onUpdateTierThresholds(editedTierThresholds);
    onUpdateLevelSettings(editedLevelSettings);
    onUpdateSystemSettings(editedSystemSettings);
    onSaveSettings();
    setIsEdited(false);
  };

  // Handle restore defaults
  const handleRestoreDefaults = () => {
    // Show confirmation dialog in real implementation
    onRestoreDefaults();
    setIsEdited(false);
  };

  const tierColorMap: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };

  return (
    <PageWrapper>
      {isEdited && (
        <AlertBanner $variant="warning">
          <AlertContent>
            <AlertTriangle size={16} />
            You have unsaved changes to the gamification settings.
          </AlertContent>
          <Button $variant="ghost" onClick={handleSave}>
            Save Changes
          </Button>
        </AlertBanner>
      )}

      <HeaderRow>
        <Heading>Gamification System Settings</Heading>

        <ButtonGroup>
          <Button
            $variant="outlined"
            onClick={handleRestoreDefaults}
          >
            <RefreshCw size={16} />
            Restore Defaults
          </Button>

          <Button
            $variant="primary"
            onClick={handleSave}
            disabled={!isEdited}
            $disabled={!isEdited}
          >
            <Save size={16} />
            Save Settings
          </Button>
        </ButtonGroup>
      </HeaderRow>

      {/* System Settings */}
      <GlassCard style={{ marginBottom: 24 }}>
        <CardHeadingRow>
          <Settings size={20} />
          <CardTitle>System Settings</CardTitle>
        </CardHeadingRow>

        <SwitchGrid>
          <ToggleSwitch
            checked={editedSystemSettings.enableGamification}
            onChange={(e) => handleSystemSettingChange('enableGamification', e.target.checked)}
            label={
              <LabelContent>
                <span>Enable Gamification</span>
                <TooltipButton data-tooltip="Master switch for the entire gamification system">
                  <HelpCircle size={14} />
                </TooltipButton>
              </LabelContent>
            }
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableAchievements}
            onChange={(e) => handleSystemSettingChange('enableAchievements', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Achievements"
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableRewards}
            onChange={(e) => handleSystemSettingChange('enableRewards', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Rewards"
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableLeaderboard}
            onChange={(e) => handleSystemSettingChange('enableLeaderboard', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Leaderboard"
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableLevels}
            onChange={(e) => handleSystemSettingChange('enableLevels', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Levels"
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableTiers}
            onChange={(e) => handleSystemSettingChange('enableTiers', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Tiers"
          />

          <ToggleSwitch
            checked={editedSystemSettings.enableStreaks}
            onChange={(e) => handleSystemSettingChange('enableStreaks', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Streaks"
          />

          <ToggleSwitch
            checked={editedSystemSettings.notifyOnAchievement}
            onChange={(e) => handleSystemSettingChange('notifyOnAchievement', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableAchievements}
            label="Notify on Achievement"
          />

          <ToggleSwitch
            checked={editedSystemSettings.notifyOnLevelUp}
            onChange={(e) => handleSystemSettingChange('notifyOnLevelUp', e.target.checked)}
            disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
            label="Notify on Level Up"
          />

          <div>
            <InputGroup $fullWidth>
              <InputLabel>Streak Expiration (Days)</InputLabel>
              <StyledInput
                type="number"
                value={editedSystemSettings.streakExpirationDays}
                onChange={(e) => handleSystemSettingChange('streakExpirationDays', parseInt(e.target.value) || 0)}
                disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableStreaks}
                $disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableStreaks}
                min={1}
              />
            </InputGroup>
          </div>

          <ToggleSwitch
            checked={editedSystemSettings.pointsExpiration.enabled}
            onChange={(e) => handleSystemSettingChange('pointsExpiration', {
              ...editedSystemSettings.pointsExpiration,
              enabled: e.target.checked
            })}
            disabled={!editedSystemSettings.enableGamification}
            label="Enable Points Expiration"
          />

          <div>
            <InputGroup $fullWidth>
              <InputLabel>Points Expiration (Days)</InputLabel>
              <StyledInput
                type="number"
                value={editedSystemSettings.pointsExpiration.expirationDays}
                onChange={(e) => handleSystemSettingChange('pointsExpiration', {
                  ...editedSystemSettings.pointsExpiration,
                  expirationDays: parseInt(e.target.value) || 0
                })}
                disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.pointsExpiration.enabled}
                $disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.pointsExpiration.enabled}
                min={1}
              />
            </InputGroup>
          </div>
        </SwitchGrid>
      </GlassCard>

      <GridContainer className="two-col" style={{ marginBottom: 24 }}>
        {/* Level Settings */}
        <GlassCard>
          <CardHeadingRow>
            <TrendingUp size={20} />
            <CardTitle>Level Settings</CardTitle>
          </CardHeadingRow>

          <InputGroup $fullWidth>
            <InputLabel>Points Per Level</InputLabel>
            <StyledInput
              type="number"
              value={editedLevelSettings.pointsPerLevel}
              onChange={(e) => handleLevelSettingChange('pointsPerLevel', parseInt(e.target.value) || 0)}
              disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
              $disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
              min={1}
            />
            <HelperText>Points required to advance one level</HelperText>
          </InputGroup>

          <SectionSpacer>
            <ToggleSwitch
              checked={editedLevelSettings.enableLevelCap}
              onChange={(e) => handleLevelSettingChange('enableLevelCap', e.target.checked)}
              disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels}
              label="Enable Level Cap"
            />
          </SectionSpacer>

          <SectionSpacer>
            <InputGroup $fullWidth>
              <InputLabel>Level Cap</InputLabel>
              <StyledInput
                type="number"
                value={editedLevelSettings.levelCap}
                onChange={(e) => handleLevelSettingChange('levelCap', parseInt(e.target.value) || 0)}
                disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels || !editedLevelSettings.enableLevelCap}
                $disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableLevels || !editedLevelSettings.enableLevelCap}
                min={1}
              />
              <HelperText>Maximum level a user can reach</HelperText>
            </InputGroup>
          </SectionSpacer>

          <FormulaBox>
            <SubTitle>Level Calculation Formula:</SubTitle>
            <CodeBlock>
              Level = Math.floor(totalPoints / pointsPerLevel) + 1
            </CodeBlock>
            <MutedText>
              Users start at Level 1. For example, with {editedLevelSettings.pointsPerLevel} points per level, a user with 4500 points would be at Level {Math.floor(4500 / editedLevelSettings.pointsPerLevel) + 1}.
            </MutedText>
          </FormulaBox>
        </GlassCard>

        {/* Tier Thresholds */}
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
                {editedTierThresholds.map((tier) => (
                  <tr key={tier.tier}>
                    <td>
                      <TierCell>
                        <TierDot $color={tierColorMap[tier.tier] || '#E5E4E2'} />
                        {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                      </TierCell>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <StyledInput
                          type="number"
                          value={tier.pointsRequired}
                          onChange={(e) => handleTierThresholdChange(tier.tier, parseInt(e.target.value) || 0)}
                          disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableTiers}
                          $disabled={!editedSystemSettings.enableGamification || !editedSystemSettings.enableTiers}
                          $width="120px"
                          min={0}
                        />
                        <InputSuffix>points</InputSuffix>
                      </div>
                    </td>
                  </tr>
                ))}
              </TBody>
            </StyledTable>
          </TableWrapper>

          <MutedText style={{ marginTop: 24 }}>
            Set the point thresholds required for users to reach each tier. Users start with no tier and must earn the specified points to progress.
          </MutedText>

          <AlertBanner $variant="info" style={{ marginTop: 16 }}>
            <AlertContent>
              <Info size={16} />
              Make sure tier thresholds are properly spaced to create achievable progression. Bronze should be attainable fairly easily, while Platinum should represent significant achievement.
            </AlertContent>
          </AlertBanner>
        </GlassCard>
      </GridContainer>

      {/* Point Values */}
      <GlassCard>
        <CardHeadingRow>
          <BarChart2 size={20} />
          <CardTitle>Point Values</CardTitle>
        </CardHeadingRow>

        <MutedText style={{ margin: '0 0 8px' }}>
          Configure the point values awarded for different activities in the system.
        </MutedText>

        <TableWrapper>
          <StyledTable>
            <THead>
              <tr>
                <th>Activity</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Points</th>
              </tr>
            </THead>
            <TBody>
              {editedPointValues.map((pv) => (
                <tr key={pv.id}>
                  <td>{pv.name}</td>
                  <td>{pv.description}</td>
                  <td style={{ textAlign: 'right' }}>
                    <StyledInput
                      type="number"
                      value={pv.pointValue}
                      onChange={(e) => handlePointValueChange(pv.id, parseInt(e.target.value) || 0)}
                      $width="100px"
                      $textAlign="right"
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </TBody>
          </StyledTable>
        </TableWrapper>
      </GlassCard>
    </PageWrapper>
  );
};

export default GamificationSettings;
