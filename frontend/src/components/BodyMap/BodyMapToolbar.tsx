/**
 * ============================================================================
 * FILE: BodyMapToolbar.tsx
 * PURPOSE: Gender selector + anatomical label toggle for the body map
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-02
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a compact toolbar above the body map SVGs
 * with a male/female gender toggle and muscles/bones/off label toggle.
 * HOW IT FITS IN THE APP: BodyMap (index) → BodyMapToolbar + BodyMapSVG
 */
import React from 'react';
import styled from 'styled-components';

// ── Types ──────────────────────────────────────────────────────────────

// Slice 2 (A5): 'neutral' is the inclusive default — non-binary/unset
// profiles are never silently rendered male.
export type AnatomyGender = 'male' | 'female' | 'neutral';
export type LabelMode = 'off' | 'muscles' | 'bones';

// ── Styled Components ──────────────────────────────────────────────────

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.15));
  border-radius: 12px;
`;

const ToggleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-base, #0A0A0F);
  border-radius: 8px;
  padding: 3px;
`;

const ToggleLabel = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-right: 4px;
  white-space: nowrap;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  background: ${({ $active }) =>
    $active ? 'var(--accent-primary, #8B5CF6)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? '#fff' : 'var(--text-secondary, rgba(255, 255, 255, 0.6))'};
  box-shadow: ${({ $active }) =>
    $active ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none'};

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--accent-primary, #8B5CF6)' : 'rgba(139, 92, 246, 0.15)'};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

// ── Component ──────────────────────────────────────────────────────────

interface BodyMapToolbarProps {
  gender: AnatomyGender;
  labelMode: LabelMode;
  onGenderChange: (gender: AnatomyGender) => void;
  onLabelModeChange: (mode: LabelMode) => void;
}

const BodyMapToolbar: React.FC<BodyMapToolbarProps> = ({
  gender,
  labelMode,
  onGenderChange,
  onLabelModeChange,
}) => (
  <ToolbarRow>
    <ToggleLabel>Body</ToggleLabel>
    <ToggleGroup>
      <ToggleBtn
        $active={gender === 'male'}
        onClick={() => onGenderChange('male')}
        aria-label="Male body view"
        aria-pressed={gender === 'male'}
      >
        Male
      </ToggleBtn>
      <ToggleBtn
        $active={gender === 'neutral'}
        onClick={() => onGenderChange('neutral')}
        aria-label="Neutral body view"
        aria-pressed={gender === 'neutral'}
      >
        Neutral
      </ToggleBtn>
      <ToggleBtn
        $active={gender === 'female'}
        onClick={() => onGenderChange('female')}
        aria-label="Female body view"
        aria-pressed={gender === 'female'}
      >
        Female
      </ToggleBtn>
    </ToggleGroup>

    <ToggleLabel>Labels</ToggleLabel>
    <ToggleGroup>
      <ToggleBtn
        $active={labelMode === 'off'}
        onClick={() => onLabelModeChange('off')}
        aria-label="Hide labels"
        aria-pressed={labelMode === 'off'}
      >
        Off
      </ToggleBtn>
      <ToggleBtn
        $active={labelMode === 'muscles'}
        onClick={() => onLabelModeChange('muscles')}
        aria-label="Show muscle labels"
        aria-pressed={labelMode === 'muscles'}
      >
        Muscles
      </ToggleBtn>
      <ToggleBtn
        $active={labelMode === 'bones'}
        onClick={() => onLabelModeChange('bones')}
        aria-label="Show bone labels"
        aria-pressed={labelMode === 'bones'}
      >
        Bones
      </ToggleBtn>
    </ToggleGroup>
  </ToolbarRow>
);

export default BodyMapToolbar;
