/**
 * STYLES: BadgeAdminEditorPanel
 * PURPOSE: Editor controls for saved admin badge records.
 */

import styled, { css } from 'styled-components';

const assignmentField = css`
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 44px;
  min-width: 140px;
  padding: 8px 12px;
`;

export const AssignTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-size: 10px;
`;

export const AssignPanel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  margin-top: 20px;
  padding: 16px;
`;

export const AssignTitle = styled.h3`
  align-items: center;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-wrap: wrap;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  gap: 8px;
  margin: 0 0 12px;
`;

export const AssignRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
`;

export const AssignSelect = styled.select`
  ${assignmentField}
  option { background: var(--bg-elevated, #141419); }
`;

export const AssignInput = styled.input`
  ${assignmentField}
  flex: 2;
`;

export const AssignBtn = styled.button<{ $variant?: string }>`
  align-items: center;
  background: ${({ $variant }) => $variant === 'danger'
    ? 'color-mix(in srgb, var(--status-danger, #EF4444) 12%, transparent)'
    : 'linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6))'};
  border: ${({ $variant }) => $variant === 'danger'
    ? '1px solid color-mix(in srgb, var(--status-danger, #EF4444) 32%, transparent)'
    : 'none'};
  border-radius: 8px;
  color: ${({ $variant }) => $variant === 'danger'
    ? 'var(--status-danger, #EF4444)'
    : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  display: flex;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  transition: opacity 150ms ease;
  &:hover { opacity: 0.85; }
  &:disabled { cursor: not-allowed; opacity: 0.4; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const EditSectionTitle = styled.div`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 82%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  margin: 14px 0 8px;
  text-transform: uppercase;
`;

export const EditFormGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 12px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

export const EditField = styled.div<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $wide }) => $wide ? 'grid-column: 1 / -1;' : ''}
`;

export const EditLabel = styled.label`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 78%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;

export const EditTextArea = styled.textarea`
  ${assignmentField}
  min-height: 84px;
  resize: vertical;
`;

export const EditFileInput = styled.input`
  ${assignmentField}
  padding: 10px 12px;
  &::file-selector-button {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    border-radius: 8px;
    color: var(--text-primary, #E0ECF4);
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    margin-right: 10px;
    min-height: 32px;
    padding: 6px 10px;
  }
`;
