/**
 * Canonical admin gamification settings tab.
 * Owns draft state and delegates section rendering to small modules.
 */
import React, { useState } from 'react';
import { RefreshCw, Save, AlertTriangle } from 'lucide-react';
import {
  AlertBanner,
  AlertContent,
  Button,
  ButtonGroup,
  HeaderRow,
  Heading,
  PageWrapper,
  SettingsStack,
} from './GamificationSettingsFrame.styles';
import { GamificationSettingsPointValuesSection } from './GamificationSettingsPointValuesSection';
import { GamificationSettingsProgressionSections } from './GamificationSettingsProgressionSections';
import { GamificationSettingsProgressionTuningPanel } from './GamificationSettingsProgressionTuningPanel';
import { GamificationSettingsSystemSection } from './GamificationSettingsSystemSection';
import type {
  GamificationSettingsProps,
  LevelSettings,
  PointValue,
  SystemSettings,
  TierName,
  TierThreshold,
} from './GamificationSettings.types';

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
  onRestoreDefaults,
}) => {
  const [editedPointValues, setEditedPointValues] = useState<PointValue[]>(pointValues);
  const [editedTierThresholds, setEditedTierThresholds] = useState<TierThreshold[]>(tierThresholds);
  const [editedLevelSettings, setEditedLevelSettings] = useState<LevelSettings>(levelSettings);
  const [editedSystemSettings, setEditedSystemSettings] = useState<SystemSettings>(systemSettings);
  const [isEdited, setIsEdited] = useState(false);

  const markEdited = () => setIsEdited(true);

  const handlePointValueChange = (id: string, value: number) => {
    setEditedPointValues(current =>
      current.map(pointValue => (pointValue.id === id ? { ...pointValue, pointValue: value } : pointValue))
    );
    markEdited();
  };

  const handleTierThresholdChange = (tier: TierName, value: number) => {
    setEditedTierThresholds(current =>
      current.map(threshold => (threshold.tier === tier ? { ...threshold, pointsRequired: value } : threshold))
    );
    markEdited();
  };

  const handleLevelSettingChange = <K extends keyof LevelSettings>(key: K, value: LevelSettings[K]) => {
    setEditedLevelSettings(current => ({ ...current, [key]: value }));
    markEdited();
  };

  const handleSystemSettingChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setEditedSystemSettings(current => ({ ...current, [key]: value }));
    markEdited();
  };

  const handleSave = () => {
    const draft = {
      pointValues: editedPointValues,
      tierThresholds: editedTierThresholds,
      levelSettings: editedLevelSettings,
      systemSettings: editedSystemSettings,
    };

    onUpdatePointValues(draft.pointValues);
    onUpdateTierThresholds(draft.tierThresholds);
    onUpdateLevelSettings(draft.levelSettings);
    onUpdateSystemSettings(draft.systemSettings);
    onSaveSettings(draft);
    setIsEdited(false);
  };

  const handleRestoreDefaults = () => {
    onRestoreDefaults();
    setIsEdited(false);
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
          <Button $variant="outlined" onClick={handleRestoreDefaults}>
            <RefreshCw size={16} />
            Restore Defaults
          </Button>

          <Button $variant="primary" onClick={handleSave} disabled={!isEdited} $disabled={!isEdited}>
            <Save size={16} />
            Save Settings
          </Button>
        </ButtonGroup>
      </HeaderRow>

      <SettingsStack>
        <GamificationSettingsSystemSection
          settings={editedSystemSettings}
          onSettingChange={handleSystemSettingChange}
        />
        <GamificationSettingsProgressionSections
          levelSettings={editedLevelSettings}
          systemSettings={editedSystemSettings}
          tierThresholds={editedTierThresholds}
          onLevelSettingChange={handleLevelSettingChange}
          onTierThresholdChange={handleTierThresholdChange}
        />
        <GamificationSettingsProgressionTuningPanel />
        <GamificationSettingsPointValuesSection
          pointValues={editedPointValues}
          onPointValueChange={handlePointValueChange}
        />
      </SettingsStack>
    </PageWrapper>
  );
};

export default GamificationSettings;
