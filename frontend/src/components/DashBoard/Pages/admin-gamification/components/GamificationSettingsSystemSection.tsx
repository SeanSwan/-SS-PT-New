/**
 * System-level enablement switches for the gamification settings tab.
 */
import React from 'react';
import { HelpCircle, Settings } from 'lucide-react';
import {
  CardHeadingRow,
  CardTitle,
  GlassCard,
} from './GamificationSettingsFrame.styles';
import {
  InputGroup,
  InputLabel,
  LabelContent,
  StyledInput,
  SwitchGrid,
  TooltipIcon,
} from './GamificationSettingsControl.styles';
import { GamificationSettingsToggle } from './GamificationSettingsToggle';
import type { SystemSettings, UpdateSystemSetting } from './GamificationSettings.types';

interface GamificationSettingsSystemSectionProps {
  settings: SystemSettings;
  onSettingChange: UpdateSystemSetting;
}

export const GamificationSettingsSystemSection: React.FC<GamificationSettingsSystemSectionProps> = ({
  settings,
  onSettingChange,
}) => {
  const disabled = !settings.enableGamification;

  return (
    <GlassCard>
      <CardHeadingRow>
        <Settings size={20} />
        <CardTitle>System Settings</CardTitle>
      </CardHeadingRow>

      <SwitchGrid>
        <GamificationSettingsToggle
          checked={settings.enableGamification}
          onChange={event => onSettingChange('enableGamification', event.target.checked)}
          label={
            <LabelContent>
              <span>Enable Gamification</span>
              <TooltipIcon data-tooltip="Master switch for the entire gamification system">
                <HelpCircle size={14} />
              </TooltipIcon>
            </LabelContent>
          }
        />
        <GamificationSettingsToggle
          checked={settings.enableAchievements}
          onChange={event => onSettingChange('enableAchievements', event.target.checked)}
          disabled={disabled}
          label="Enable Achievements"
        />
        <GamificationSettingsToggle
          checked={settings.enableRewards}
          onChange={event => onSettingChange('enableRewards', event.target.checked)}
          disabled={disabled}
          label="Enable Rewards"
        />
        <GamificationSettingsToggle
          checked={settings.enableLeaderboard}
          onChange={event => onSettingChange('enableLeaderboard', event.target.checked)}
          disabled={disabled}
          label="Enable Leaderboard"
        />
        <GamificationSettingsToggle
          checked={settings.enableLevels}
          onChange={event => onSettingChange('enableLevels', event.target.checked)}
          disabled={disabled}
          label="Enable Levels"
        />
        <GamificationSettingsToggle
          checked={settings.enableTiers}
          onChange={event => onSettingChange('enableTiers', event.target.checked)}
          disabled={disabled}
          label="Enable Tiers"
        />
        <GamificationSettingsToggle
          checked={settings.enableStreaks}
          onChange={event => onSettingChange('enableStreaks', event.target.checked)}
          disabled={disabled}
          label="Enable Streaks"
        />
        <GamificationSettingsToggle
          checked={settings.notifyOnAchievement}
          onChange={event => onSettingChange('notifyOnAchievement', event.target.checked)}
          disabled={disabled || !settings.enableAchievements}
          label="Notify on Achievement"
        />
        <GamificationSettingsToggle
          checked={settings.notifyOnLevelUp}
          onChange={event => onSettingChange('notifyOnLevelUp', event.target.checked)}
          disabled={disabled || !settings.enableLevels}
          label="Notify on Level Up"
        />

        <InputGroup $fullWidth>
          <InputLabel>Streak Expiration (Days)</InputLabel>
          <StyledInput
            aria-label="Streak Expiration Days"
            type="number"
            value={settings.streakExpirationDays}
            onChange={event => onSettingChange('streakExpirationDays', parseInt(event.target.value) || 0)}
            disabled={disabled || !settings.enableStreaks}
            $disabled={disabled || !settings.enableStreaks}
            min={1}
          />
        </InputGroup>

        <GamificationSettingsToggle
          checked={settings.pointsExpiration.enabled}
          onChange={event =>
            onSettingChange('pointsExpiration', {
              ...settings.pointsExpiration,
              enabled: event.target.checked,
            })
          }
          disabled={disabled}
          label="Enable Points Expiration"
        />

        <InputGroup $fullWidth>
          <InputLabel>Points Expiration (Days)</InputLabel>
          <StyledInput
            aria-label="Points Expiration Days"
            type="number"
            value={settings.pointsExpiration.expirationDays}
            onChange={event =>
              onSettingChange('pointsExpiration', {
                ...settings.pointsExpiration,
                expirationDays: parseInt(event.target.value) || 0,
              })
            }
            disabled={disabled || !settings.pointsExpiration.enabled}
            $disabled={disabled || !settings.pointsExpiration.enabled}
            min={1}
          />
        </InputGroup>
      </SwitchGrid>
    </GlassCard>
  );
};
