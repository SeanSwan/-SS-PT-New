/**
 * STYLES: SettingsTabContent
 * PURPOSE: Read-only client settings layout primitives.
 */
import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile } from '../clientCardSystem';

export const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 16px 0;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 430px) {
    gap: 12px;
    padding: 10px 0;
  }
`;

export const SettingsSection = styled.div`
  --swan-card-padding: 20px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  @media (max-width: 430px) {
    --swan-card-padding: 14px;
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
`;

export const SectionIcon = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

export const SectionTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

export const FieldLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0;
  overflow-wrap: anywhere;
`;

const inputStyles = `
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--surface-accent, #003080) 10%);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 44px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  transition: border-color 200ms ease, box-shadow 200ms ease;
  cursor: default;

  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

export const StyledInput = styled.input`
  ${inputStyles}
`;

export const StyledSelect = styled.select`
  ${inputStyles}
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--accent-tertiary, #4070C0) 50%),
    linear-gradient(135deg, var(--accent-tertiary, #4070C0) 50%, transparent 50%);
  background-repeat: no-repeat;
  background-position: calc(100% - 17px) 50%, calc(100% - 12px) 50%;
  background-size: 5px 5px, 5px 5px;
  padding-right: 32px;
`;

export const StyledTextarea = styled.textarea`
  ${inputStyles}
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
`;

export const PolicyNote = styled.div`
  ${swanMetricTile}

  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-muted, rgba(224, 236, 244, 0.76));
  padding: 10px 12px;
  overflow-wrap: anywhere;
`;

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 44px;
  padding: 4px 0;
`;

export const ToggleLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const TogglePill = styled.div<{ $on?: boolean }>`
  width: 44px;
  min-width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) =>
    $on
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--bg-elevated, #1A1A24)'};
  border: 1px solid ${({ $on }) =>
    $on
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--border-soft, rgba(224, 236, 244, 0.12))'};
  position: relative;
  cursor: default;
  transition: background 200ms ease, border-color 200ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? '21px' : '2px')};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-primary, #E0ECF4);
    transition: left 200ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`;
