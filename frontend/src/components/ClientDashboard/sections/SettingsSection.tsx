import React, { useState } from 'react';
import styled from 'styled-components';
import { Save, RotateCcw } from 'lucide-react';
import GlowButton from '../../ui/GlowButton';

// ============================================================
// Styled Components - Galaxy-Swan Dark Theme
// ============================================================

const Container = styled.div`
  width: 100%;
`;

const PageTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  letter-spacing: 0.5px;
`;

const Card = styled.div`
  background: rgba(29, 31, 43, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(12px);
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
`;

const SubTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 0.75rem 0;
`;

const GridRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const GridCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 1.5rem 0;
`;

// ============================================================
// Toggle Switch (replaces MUI Switch + FormControlLabel)
// ============================================================

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 6px 0;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9375rem;
  user-select: none;

  &:hover {
    color: #ffffff;
  }
`;

const ToggleLabelText = styled.span`
  flex: 1;
  margin-right: 12px;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 13px;
  background: ${({ $checked }) =>
    $checked
      ? 'linear-gradient(135deg, #00cccc, #00ffff)'
      : 'rgba(255, 255, 255, 0.15)'};
  transition: background 0.25s ease;
  box-shadow: ${({ $checked }) =>
    $checked ? '0 0 8px rgba(0, 255, 255, 0.3)' : 'none'};
`;

const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? '24px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
`;

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
  <ToggleLabel>
    <ToggleLabelText>{label}</ToggleLabelText>
    <HiddenCheckbox
      type="checkbox"
      checked={checked}
      onChange={onChange}
      role="switch"
      aria-checked={checked}
    />
    <ToggleTrack $checked={checked}>
      <ToggleThumb $checked={checked} />
    </ToggleTrack>
  </ToggleLabel>
);

// ============================================================
// Select Dropdown (replaces MUI Select / FormControl)
// ============================================================

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;

const SelectLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
  letter-spacing: 0.3px;
`;

const StyledSelect = styled.select`
  appearance: none;
  width: 100%;
  min-height: 44px;
  padding: 10px 36px 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.9375rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23ffffff80' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }

  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  option {
    background: #1d1f2b;
    color: #ffffff;
    padding: 8px;
  }
`;

// ============================================================
// Range Slider (replaces MUI Slider)
// ============================================================

const SliderWrapper = styled.div`
  margin-bottom: 1rem;
`;

const SliderLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;

const StyledRange = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00cccc, #00ffff);
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
    /* 44px touch target via padding trick not needed; 22px thumb is fine
       because the track itself provides an ample hit area */
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
  }

  &::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00cccc, #00ffff);
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  }

  /* Make the touch target at least 44px tall */
  padding: 11px 0;
  margin: 0;
`;

const SliderMarks = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px 2px 0;
`;

const SliderMark = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.4);
`;

// ============================================================
// Action Bar
// ============================================================

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

// ============================================================
// SettingsSection Component
// ============================================================

const SettingsSection: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      workout: true,
      achievement: true,
      community: true,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      showActivity: true,
      showProgress: true,
      allowMessages: true
    },
    appearance: {
      theme: 'dark',
      fontScale: 1.0,
      highContrast: false,
      animationReduced: false
    },
    accessibility: {
      screenReader: false,
      keyboardNavigation: true,
      textToSpeech: false,
      captions: false
    }
  });

  const handleSwitchChange = (category, setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: event.target.checked
      }
    }));
  };

  const handleSelectChange = (category, setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: event.target.value
      }
    }));
  };

  const handleSliderChange = (category, setting) => (event, newValue) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: newValue
      }
    }));
  };

  const handleSave = () => {
    // Here you would normally save settings to the backend
    alert('Settings saved!');
  };

  const handleReset = () => {
    // Reset to default settings
    // This would normally fetch defaults from the backend
    alert('Settings reset to defaults');
  };

  // Generate slider marks for font scale
  const fontScaleMarks = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];

  return (
    <Container>
      <PageTitle>Settings</PageTitle>

      <Card>
        {/* ---- Notifications ---- */}
        <SectionTitle>Notifications</SectionTitle>

        <GridRow>
          <GridCol>
            <SubTitle>Notification Channels</SubTitle>
            <ToggleSwitch
              label="Email Notifications"
              checked={settings.notifications.email}
              onChange={handleSwitchChange('notifications', 'email')}
            />
            <ToggleSwitch
              label="Push Notifications"
              checked={settings.notifications.push}
              onChange={handleSwitchChange('notifications', 'push')}
            />
            <ToggleSwitch
              label="SMS Notifications"
              checked={settings.notifications.sms}
              onChange={handleSwitchChange('notifications', 'sms')}
            />
          </GridCol>

          <GridCol>
            <SubTitle>Notification Types</SubTitle>
            <ToggleSwitch
              label="Workout Reminders"
              checked={settings.notifications.workout}
              onChange={handleSwitchChange('notifications', 'workout')}
            />
            <ToggleSwitch
              label="Achievements & Badges"
              checked={settings.notifications.achievement}
              onChange={handleSwitchChange('notifications', 'achievement')}
            />
            <ToggleSwitch
              label="Community Activity"
              checked={settings.notifications.community}
              onChange={handleSwitchChange('notifications', 'community')}
            />
            <ToggleSwitch
              label="Marketing & Promotions"
              checked={settings.notifications.marketing}
              onChange={handleSwitchChange('notifications', 'marketing')}
            />
          </GridCol>
        </GridRow>

        <SectionDivider />

        {/* ---- Privacy ---- */}
        <SectionTitle>Privacy</SectionTitle>

        <GridRow>
          <GridCol>
            <SelectWrapper>
              <SelectLabel htmlFor="profile-visibility">Profile Visibility</SelectLabel>
              <StyledSelect
                id="profile-visibility"
                value={settings.privacy.profileVisibility}
                onChange={handleSelectChange('privacy', 'profileVisibility')}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </StyledSelect>
            </SelectWrapper>

            <ToggleSwitch
              label="Show Activity Status"
              checked={settings.privacy.showActivity}
              onChange={handleSwitchChange('privacy', 'showActivity')}
            />
          </GridCol>

          <GridCol>
            <ToggleSwitch
              label="Share Progress & Achievements"
              checked={settings.privacy.showProgress}
              onChange={handleSwitchChange('privacy', 'showProgress')}
            />
            <ToggleSwitch
              label="Allow Direct Messages"
              checked={settings.privacy.allowMessages}
              onChange={handleSwitchChange('privacy', 'allowMessages')}
            />
          </GridCol>
        </GridRow>

        <SectionDivider />

        {/* ---- Appearance & Accessibility ---- */}
        <SectionTitle>Appearance & Accessibility</SectionTitle>

        <GridRow>
          <GridCol>
            <SubTitle>Theme</SubTitle>
            <SelectWrapper>
              <SelectLabel htmlFor="theme-select">Theme</SelectLabel>
              <StyledSelect
                id="theme-select"
                value={settings.appearance.theme}
                onChange={handleSelectChange('appearance', 'theme')}
              >
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="system">System Default</option>
              </StyledSelect>
            </SelectWrapper>

            <SliderWrapper>
              <SliderLabel>
                Text Size: {settings.appearance.fontScale.toFixed(1)}x
              </SliderLabel>
              <StyledRange
                type="range"
                min={0.8}
                max={1.4}
                step={0.1}
                value={settings.appearance.fontScale}
                onChange={(e) =>
                  handleSliderChange('appearance', 'fontScale')(e, parseFloat(e.target.value))
                }
                aria-label="Text size"
              />
              <SliderMarks>
                {fontScaleMarks.map((mark) => (
                  <SliderMark key={mark}>{mark.toFixed(1)}</SliderMark>
                ))}
              </SliderMarks>
            </SliderWrapper>
          </GridCol>

          <GridCol>
            <SubTitle>Accessibility Options</SubTitle>
            <ToggleSwitch
              label="High Contrast Mode"
              checked={settings.appearance.highContrast}
              onChange={handleSwitchChange('appearance', 'highContrast')}
            />
            <ToggleSwitch
              label="Reduced Animation"
              checked={settings.appearance.animationReduced}
              onChange={handleSwitchChange('appearance', 'animationReduced')}
            />
            <ToggleSwitch
              label="Screen Reader Support"
              checked={settings.accessibility.screenReader}
              onChange={handleSwitchChange('accessibility', 'screenReader')}
            />
            <ToggleSwitch
              label="Enhanced Keyboard Navigation"
              checked={settings.accessibility.keyboardNavigation}
              onChange={handleSwitchChange('accessibility', 'keyboardNavigation')}
            />
          </GridCol>
        </GridRow>
      </Card>

      <ActionBar>
        <GlowButton
          variant="warning"
          startIcon={<RotateCcw size={18} />}
          onClick={handleReset}
        >
          Reset to Defaults
        </GlowButton>

        <GlowButton
          variant="primary"
          startIcon={<Save size={18} />}
          onClick={handleSave}
        >
          Save Settings
        </GlowButton>
      </ActionBar>
    </Container>
  );
};

export default SettingsSection;
