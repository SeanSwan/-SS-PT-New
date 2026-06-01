/**
 * STYLES: SettingsTabContent
 * PURPOSE: Read-only client settings layout primitives.
 */
import styled from 'styled-components';

export const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const SettingsSection = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const FieldLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const inputStyles = `
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 44px;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234070C0' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
`;

export const StyledTextarea = styled.textarea`
  ${inputStyles}
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
`;

export const PolicyNote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-muted, rgba(224, 236, 244, 0.76));
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, var(--bg-elevated, #1A1A24));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 8px;
  padding: 10px 12px;
`;

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 4px 0;
`;

export const ToggleLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

export const TogglePill = styled.div<{ $on?: boolean }>`
  width: 40px;
  height: 22px;
  border-radius: 11px;
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
    left: ${({ $on }) => ($on ? '19px' : '2px')};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-primary, #E0ECF4);
    transition: left 200ms ease;
  }
`;
