/**
 * FILE: MessageReportPanel.styles.ts
 * PURPOSE: Styled report form for message safety actions.
 */
import styled from 'styled-components';

export const ReportPanel = styled.form`
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: var(--bg-surface, #1A1A24);
`;

export const ReportTitle = styled.strong`
  color: var(--text-heading, #E0ECF4);
  font-size: 0.85rem;
`;

export const ReportField = styled.label`
  display: grid;
  gap: 0.3rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.75rem;
`;

export const ReportSelect = styled.select`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 0.7rem;
`;

export const ReportTextArea = styled.textarea`
  min-height: 74px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0.65rem 0.7rem;
  resize: vertical;
`;

export const ReportActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const ReportButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $danger }) => ($danger ? 'color-mix(in srgb, var(--error, #EF4444) 45%, transparent)' : 'var(--border-soft, rgba(96, 192, 240, 0.22))')};
  background: ${({ $danger }) => ($danger ? 'color-mix(in srgb, var(--error, #EF4444) 14%, var(--bg-base, #0A0A0F))' : 'var(--bg-base, #0A0A0F)')};
  color: var(--text-primary, #E0ECF4);
  padding: 0 0.85rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;
