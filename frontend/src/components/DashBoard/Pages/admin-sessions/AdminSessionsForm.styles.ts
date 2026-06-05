/**
 * Admin sessions dialog, detail, and assignment form styles.
 * Extracted from the canonical admin sessions page to keep the page behavior-focused.
 */
import styled from 'styled-components';
import { CheckSquare } from 'lucide-react';
import * as tokens from './AdminSessionsForm.tokens';

export const FormGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$columns || 2}, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormField = styled.div<{ $fullWidth?: boolean }>`
  grid-column: ${p => p.$fullWidth ? '1 / -1' : 'auto'};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const FormLabel = styled.label`
  color: ${tokens.TEXT_SECONDARY};
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

export const FormInput = styled.input`
  color: ${tokens.TEXT_PRIMARY};
  background: ${tokens.FIELD_SURFACE};
  border: 1px solid ${tokens.FIELD_BORDER};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  box-sizing: border-box;

  &:focus {
    border-color: ${tokens.FOCUS_BORDER};
    box-shadow: ${tokens.FOCUS_SHADOW};
  }

  &::placeholder {
    color: ${tokens.TEXT_MUTED};
  }
`;

export const FormTextarea = styled.textarea`
  color: ${tokens.TEXT_PRIMARY};
  background: ${tokens.FIELD_SURFACE};
  border: 1px solid ${tokens.FIELD_BORDER};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    border-color: ${tokens.FOCUS_BORDER};
    box-shadow: ${tokens.FOCUS_SHADOW};
  }

  &::placeholder {
    color: ${tokens.TEXT_MUTED};
  }
`;

export const FormSelect = styled.select`
  color: ${tokens.TEXT_PRIMARY};
  background: ${tokens.FIELD_SURFACE};
  border: 1px solid ${tokens.FIELD_BORDER};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  box-sizing: border-box;

  &:focus {
    border-color: ${tokens.FOCUS_BORDER};
    box-shadow: ${tokens.FOCUS_SHADOW};
  }

  option {
    background: ${tokens.SELECT_OPTION_SURFACE};
    color: ${tokens.TEXT_PRIMARY};
  }
`;

export const DialogDescriptionText = styled.p`
  color: ${tokens.TEXT_SECONDARY};
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
`;

export const OverlineLabel = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${tokens.TEXT_SECONDARY};
  margin-bottom: 0.25rem;
`;

export const DetailValue = styled.span<{ $top?: string }>`
  font-size: 1rem;
  font-weight: 500;
  color: ${tokens.TEXT_PRIMARY};
  display: block;
  margin-top: ${p => p.$top || 0};
`;

export const NotesBox = styled.div`
  padding: 0.75rem;
  margin-top: 0.25rem;
  border-radius: 8px;
  min-height: 60px;
  background: ${tokens.NOTES_SURFACE};
  border: 1px solid ${tokens.NOTES_BORDER};
  white-space: pre-wrap;
  color: ${tokens.TEXT_PRIMARY};
  font-size: 0.875rem;
`;

export const DetailGrid = styled.div<{ $top?: string }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-top: ${p => p.$top || 0};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailFullRow = styled.div<{ $top?: string }>`
  grid-column: 1 / -1;
  margin-top: ${p => p.$top || 0};
`;

/* Trainer Assignment Section styled components */
export const AssignmentPanel = styled.div<{ $accentColor?: string }>`
  padding: 1.5rem;
  background: ${tokens.PANEL_SURFACE};
  border: 1px solid ${p => p.$accentColor || tokens.PANEL_BORDER};
  border-radius: 12px;
`;

export const AssignmentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const AssignmentStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const PanelHeading = styled.h3<{ $color?: string }>`
  margin: 0 0 1rem 0;
  color: ${p => p.$color || 'var(--accent-secondary, #8B5CF6)'};
  font-size: 1.1rem;
  font-weight: 600;
`;

export const SessionSelectItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  border: ${p => p.$selected ? tokens.SELECTED_BORDER : tokens.ITEM_BORDER};
  border-radius: 8px;
  margin: 0.5rem 0;
  cursor: pointer;
  background: ${p => p.$selected ? tokens.SELECTED_SURFACE : 'transparent'};
  color: inherit;
  text-align: left;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${p => p.$selected ? tokens.SELECTED_SURFACE_HOVER : tokens.ITEM_HOVER_SURFACE};
  }
`;

export const ScrollableList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

export const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 300px;

  @media (max-width: 600px) {
    min-width: 100%;
  }

  svg {
    position: absolute;
    left: 10px;
    color: ${tokens.TEXT_MUTED};
    pointer-events: none;
  }
`;

export const SearchInputField = styled.input`
  border-radius: 10px;
  background: ${tokens.FIELD_SURFACE};
  border: 1px solid ${tokens.FIELD_BORDER_SOFT};
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  color: ${tokens.TEXT_PRIMARY};
  padding: 0.5rem 0.75rem;
  padding-left: 2.25rem;
  font-size: 0.95rem;
  outline: none;
  min-width: 300px;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder {
    color: ${tokens.TEXT_MUTED};
  }

  &:hover,
  &:focus {
    border-color: ${tokens.FOCUS_BORDER};
    box-shadow: ${tokens.FIELD_FOCUS_SHADOW};
  }

  @media (max-width: 600px) {
    min-width: 100%;
  }
`;

export const DateFilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

export const DateInput = styled(FormInput)`
  width: 140px;
  font-size: 0.85rem;
`;

export const SessionSelectIcon = styled(CheckSquare)<{ $selected: boolean }>`
  margin-right: 0.5rem;
  flex-shrink: 0;
  color: ${({ $selected }) => ($selected ? 'var(--accent-secondary, #8B5CF6)' : tokens.TEXT_MUTED)};
`;
