// File: frontend/src/components/Reports/ThemeBuilder.tsx
// FINAL FIX: Ensured the line referencing 'isDark' is removed from PreviewContainer.

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import DragDropImageUpload from './DragDropImageUpload';
import { ThemeSettings } from '../../types/reports'; // Assuming this path is correct

import defaultMarbleBackground from '../../assets/marble-texture.png';

interface ExtendedThemeSettings extends ThemeSettings {
  companyLogo?: string;
  clientLogo?: string;
  headerImage?: string;
  backgroundImage?: string;
  backgroundOpacity: number;
  reportTitle?: string;
}

// Styled components
const Section = styled.div`
  margin-top: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.5rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const SettingGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const ColorInput = styled.input`
  width: 100%;
  height: 40px;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
`;

const RangeSlider = styled.input`
  width: 100%;
  margin-top: 0.5rem;
  cursor: pointer;
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
  color: #333;

  &:focus {
    border-color: #0070f3;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #333;

  &:focus {
    border-color: #0070f3;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
  }
`;

const PresetButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  background: ${props => props.$active ? '#0070f3' : 'white'};
  color: ${props => props.$active ? 'white' : '#333'};
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#0060df' : '#f0f0f0'};
  }
`;

// Using transient props $bgColor, $textColor, $backgroundImage
const PreviewContainer = styled.div<{ $bgColor: string; $textColor: string; $backgroundImage?: string }>`
  margin-top: 1.5rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: ${props => props.$bgColor}; /* Fallback/overlay color */
  color: ${props => props.$textColor};
  position: relative;
  overflow: hidden;

  /* Apply background image if provided */
  ${props =>
    props.$backgroundImage &&
    css`
      background-image: url(${props.$backgroundImage});
      background-size: cover;
      background-position: center;
    `}

  /* The problematic line containing 'isDark' has been verified as removed from this definition */
`;


const ImagePreview = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  position: relative;
  z-index: 2;

  img {
    max-height: 60px;
    max-width: 45%;
    object-fit: contain;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 4px;
    padding: 4px;
  }
`;

// Using transient $accentColor
const PreviewTitle = styled.h3<{ $accentColor: string }>`
  margin-bottom: 0.5rem;
  color: ${props => props.$accentColor};
  position: relative;
  z-index: 2;
`;

const PreviewText = styled.p`
  margin-bottom: 0.5rem;
  position: relative;
  z-index: 2;
`;

const PreviewHighlight = styled.div`
  padding: 8px;
  border-radius: 4px;
  position: relative;
  z-index: 2;
`;

const themePresets = [
  {
    name: 'Default',
    primaryColor: '#FFFFFF',
    secondaryColor: '#1A1A1A',
    accentColor: '#FFD700',
    fontFamily: 'Inter, sans-serif',
    backgroundImage: defaultMarbleBackground,
  },
  {
    name: 'Corporate',
    primaryColor: '#2c3e50',
    secondaryColor: '#ffffff',
    accentColor: '#3498db',
    fontFamily: 'Arial, sans-serif',
    backgroundImage: undefined,
  },
  {
    name: 'Elegant',
    primaryColor: '#2c3e50',
    secondaryColor: '#f9f9f9',
    accentColor: '#9b59b6',
    fontFamily: 'Georgia, serif',
    backgroundImage: undefined,
  },
  {
    name: 'Modern',
    primaryColor: '#34495e',
    secondaryColor: '#ecf0f1',
    accentColor: '#e74c3c',
    fontFamily: 'Roboto, sans-serif',
    backgroundImage: undefined,
  },
  {
    name: 'Security',
    primaryColor: '#f2f3f4',
    secondaryColor: '#1c2833',
    accentColor: '#c0392b',
    fontFamily: 'Verdana, sans-serif',
    backgroundImage: undefined,
  },
  {
    name: 'Professional',
    primaryColor: '#2e4053',
    secondaryColor: '#f5f5f5',
    accentColor: '#2980b9',
    fontFamily: 'Helvetica, sans-serif',
    backgroundImage: undefined,
  },
];


interface ThemeBuilderProps {
  settings: ExtendedThemeSettings;
  onChange: (settings: Partial<ExtendedThemeSettings>) => void;
}

const ThemeBuilder: React.FC<ThemeBuilderProps> = ({ settings, onChange }) => {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = (preset: typeof themePresets[0]) => {
    setActivePreset(preset.name);
    onChange({
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
      backgroundImage: preset.backgroundImage,
    });
  };

  const handleImageUpload = (type: 'headerImage' | 'backgroundImage' | 'companyLogo' | 'clientLogo', imageData: string | null) => {
    onChange({ [type]: imageData });
  };

  return (
    <Section>
      <SectionTitle>Theme & Branding</SectionTitle>

      <SettingGroup>
        <Label>Theme Presets</Label>
        <div>
          {themePresets.map(preset => (
            <PresetButton
              key={preset.name}
              $active={activePreset === preset.name}
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </PresetButton>
          ))}
        </div>
      </SettingGroup>

      <SettingsGrid>
        <SettingGroup>
          <Label>Company Logo</Label>
          <DragDropImageUpload
            label="companyLogo"
            onImageUpload={(imageData) => handleImageUpload('companyLogo', imageData)}
            storedImage={settings.companyLogo}
          />
        </SettingGroup>

        <SettingGroup>
          <Label>Client Logo</Label>
          <DragDropImageUpload
            label="clientLogo"
            onImageUpload={(imageData) => handleImageUpload('clientLogo', imageData)}
            storedImage={settings.clientLogo}
          />
        </SettingGroup>
      </SettingsGrid>

      <SettingsGrid>
        <SettingGroup>
          <Label>Header Image</Label>
          <DragDropImageUpload
            label="headerImage"
            onImageUpload={(imageData) => handleImageUpload('headerImage', imageData)}
            storedImage={settings.headerImage}
          />
        </SettingGroup>

        <SettingGroup>
          <Label>Background Image</Label>
          <DragDropImageUpload
            label="backgroundImage"
            onImageUpload={(imageData) => handleImageUpload('backgroundImage', imageData)}
            storedImage={settings.backgroundImage}
          />

          <Label style={{ marginTop: '1rem' }}>Background Opacity: {settings.backgroundOpacity ?? 1}</Label>
          <RangeSlider
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.backgroundOpacity ?? 1}
            onChange={(e) => onChange({ backgroundOpacity: parseFloat(e.target.value) })}
          />
        </SettingGroup>
      </SettingsGrid>

      <SettingsGrid>
        <SettingGroup>
          <Label>Primary Color (Text/Foreground)</Label>
          <ColorInput
            type="color"
            value={settings.primaryColor ?? '#000000'}
            onChange={(e) => onChange({ primaryColor: e.target.value })}
          />
        </SettingGroup>

        <SettingGroup>
          <Label>Secondary Color (Background/Overlay)</Label>
          <ColorInput
            type="color"
            value={settings.secondaryColor ?? '#FFFFFF'}
            onChange={(e) => onChange({ secondaryColor: e.target.value })}
          />
        </SettingGroup>

        <SettingGroup>
          <Label>Accent Color</Label>
          <ColorInput
            type="color"
            value={settings.accentColor ?? '#0070f3'}
            onChange={(e) => onChange({ accentColor: e.target.value })}
          />
        </SettingGroup>

        <SettingGroup>
          <Label>Font Family</Label>
          <SelectInput
            value={settings.fontFamily ?? 'Inter, sans-serif'}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
          >
            <option value="Inter, sans-serif">Inter (Modern)</option>
            <option value="Arial, sans-serif">Arial (Standard)</option>
            <option value="Georgia, serif">Georgia (Traditional)</option>
            <option value="Roboto, sans-serif">Roboto (Clean)</option>
            <option value="Verdana, sans-serif">Verdana (Readable)</option>
            <option value="Helvetica, sans-serif">Helvetica (Professional)</option>
            <option value="Times New Roman, serif">Times New Roman (Formal)</option>
          </SelectInput>
        </SettingGroup>
      </SettingsGrid>

      <SettingGroup>
        <Label>Report Title</Label>
        <TextInput
          type="text"
          placeholder="AI Live Monitoring Report"
          value={settings.reportTitle || ''}
          onChange={(e) => onChange({ reportTitle: e.target.value })}
        />
      </SettingGroup>

      <PreviewContainer
        $backgroundImage={settings.backgroundImage}
        $bgColor={settings.secondaryColor ?? '#FFFFFF'}
        $textColor={settings.primaryColor ?? '#000000'}
      >
        <h4>Theme Preview</h4>

        <ImagePreview>
          {settings.companyLogo && <img src={settings.companyLogo} alt="Company Logo Preview" />}
          {settings.clientLogo && <img src={settings.clientLogo} alt="Client Logo Preview" />}
        </ImagePreview>

        <PreviewTitle $accentColor={settings.accentColor ?? '#0070f3'}>
          {settings.reportTitle || 'AI Live Monitoring Report'}
        </PreviewTitle>

        <PreviewText>
          This is a preview of how your report theme will appear to clients. The report includes comprehensive security monitoring data,
          daily activity logs, and AI-driven insights.
        </PreviewText>

        <PreviewHighlight style={{ backgroundColor: settings.primaryColor ?? '#000000', color: settings.secondaryColor ?? '#FFFFFF' }}>
          Primary color background with secondary color text
        </PreviewHighlight>

        <div style={{ marginTop: '8px', color: settings.accentColor ?? '#0070f3' }}>
          Accent color is used for highlights and emphasis
        </div>
      </PreviewContainer>
    </Section>
  );
};

export default ThemeBuilder;