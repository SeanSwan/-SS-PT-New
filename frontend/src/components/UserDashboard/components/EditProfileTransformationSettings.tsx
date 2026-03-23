/**
 * ┌─── SUB-COMPONENT: EditProfileTransformationSettings ──────┐
 * │ PARENT: EditProfileModal                                    │
 * │ PURPOSE: Privacy controls for before/after transformation   │
 * │          photos on profile                                  │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────┐          │
 * │ │ 📸 Transformation Photos                       │          │
 * │ │ Control who sees your progress photos          │          │
 * │ │                                                │          │
 * │ │ [Toggle] Show on Profile                       │          │
 * │ │ [Toggle] Show on Social Feed                   │          │
 * │ │ [Toggle] Allow Friends to View                 │          │
 * │ │                                                │          │
 * │ │ Default Visibility: [Everyone ▼]               │          │
 * │ └────────────────────────────────────────────────┘          │
 * │ Props: { settings, onChange }                               │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Toggle] → onChange(key, value) updates setting             │
 * │ [Select] → onChange('defaultVisibility', value)             │
 * └────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Camera } from 'lucide-react';
import { SectionHeading, Label } from './EditProfileModalStyles';
import type { TransformationPhotoSettings, PhotoVisibility } from './TransformationPhotoTypes';
import { VISIBILITY_LABELS } from './TransformationPhotoTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface EditProfileTransformationSettingsProps {
  settings: TransformationPhotoSettings;
  onChange: <K extends keyof TransformationPhotoSettings>(
    key: K,
    value: TransformationPhotoSettings[K]
  ) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (theme-aware)
// ─────────────────────────────────────────────────────────────

const Subtitle = styled.p`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-size: 0.8rem;
  margin: -0.5rem 0 0.75rem;
`;

const SettingRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-bottom: 0.25rem;

  &:hover {
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.06));
  }
`;

const SettingLabel = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8125rem;
  font-family: 'Sora', sans-serif;
`;

const ToggleSwitch = styled.div<{ $on: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) =>
    $on
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.15))'};
  transition: background 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ $on }) => ($on ? '23px' : '3px')};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-heading, #E0ECF4);
    transition: left 0.2s ease;
  }
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SelectWrapper = styled.div`
  margin-top: 0.5rem;
  padding: 0 0.75rem;
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.875rem;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2360C0F0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 2rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }

  option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const EditProfileTransformationSettings: React.FC<EditProfileTransformationSettingsProps> = ({
  settings,
  onChange,
}) => {
  const toggleSettings: { key: keyof TransformationPhotoSettings; label: string }[] = [
    { key: 'showOnProfile', label: 'Show on Profile' },
    { key: 'showOnSocialFeed', label: 'Show on Social Feed' },
    { key: 'allowFriendsToView', label: 'Allow Friends to View' },
  ];

  return (
    <>
      <SectionHeading>
        <Camera size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Transformation Photos
      </SectionHeading>
      <Subtitle>Control who sees your before &amp; after progress photos</Subtitle>

      {toggleSettings.map(({ key, label }) => (
        <SettingRow key={key} htmlFor={`transform-${key}`}>
          <SettingLabel>{label}</SettingLabel>
          <HiddenCheckbox
            id={`transform-${key}`}
            checked={settings[key] as boolean}
            onChange={(e) => onChange(key, e.target.checked as never)}
          />
          <ToggleSwitch $on={settings[key] as boolean} />
        </SettingRow>
      ))}

      <SelectWrapper>
        <Label htmlFor="transform-visibility">Default Visibility</Label>
        <Select
          id="transform-visibility"
          value={settings.defaultVisibility}
          onChange={(e) => onChange('defaultVisibility', e.target.value as PhotoVisibility)}
        >
          {(Object.keys(VISIBILITY_LABELS) as PhotoVisibility[]).map((vis) => (
            <option key={vis} value={vis}>
              {VISIBILITY_LABELS[vis]}
            </option>
          ))}
        </Select>
      </SelectWrapper>
    </>
  );
};

export default React.memo(EditProfileTransformationSettings);
