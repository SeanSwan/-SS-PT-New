/**
 * Accessible switch control for the gamification settings sections.
 */
import React from 'react';
import {
  HiddenCheckbox,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack,
} from './GamificationSettingsControl.styles';

interface GamificationSettingsToggleProps {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label: React.ReactNode;
}

export const GamificationSettingsToggle: React.FC<GamificationSettingsToggleProps> = ({
  checked,
  onChange,
  disabled,
  label,
}) => (
  <SwitchLabel $disabled={disabled}>
    <HiddenCheckbox checked={checked} onChange={onChange} disabled={disabled} />
    <SwitchTrack $checked={checked}>
      <SwitchThumb $checked={checked} />
    </SwitchTrack>
    {typeof label === 'string' ? <span>{label}</span> : label}
  </SwitchLabel>
);
