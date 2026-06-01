/**
 * Admin sessions dialog, detail, and assignment form styles.
 * Extracted from the canonical admin sessions page to keep the page behavior-focused.
 */
import styled from 'styled-components';
import { CheckSquare } from 'lucide-react';
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
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`;

export const FormInput = styled.input`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

export const FormTextarea = styled.textarea`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

export const FormSelect = styled.select`
  color: rgba(255, 255, 255, 0.9);
  background: rgba(20, 20, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.95rem;
  min-height: 44px;
  cursor: pointer;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  option {
    background: #1a1a2e;
    color: #e2e8f0;
  }
`;

export const DialogDescriptionText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
`;

export const OverlineLabel = styled.span`
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.25rem;
`;

export const DetailValue = styled.span<{ $top?: string }>`
  font-size: 1rem;
  font-weight: 500;
  color: #e2e8f0;
  display: block;
  margin-top: ${p => p.$top || 0};
`;

export const NotesBox = styled.div`
  padding: 0.75rem;
  margin-top: 0.25rem;
  border-radius: 8px;
  min-height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: pre-wrap;
  color: #e2e8f0;
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
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid ${p => p.$accentColor || 'rgba(139, 92, 246, 0.3)'};
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
  color: ${p => p.$color || '#8B5CF6'};
  font-size: 1.1rem;
  font-weight: 600;
`;

export const SessionSelectItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  border: ${p => p.$selected ? '2px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  margin: 0.5rem 0;
  cursor: pointer;
  background: ${p => p.$selected ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  color: inherit;
  text-align: left;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${p => p.$selected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
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
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }
`;

export const SearchInputField = styled.input`
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.75rem;
  padding-left: 2.25rem;
  font-size: 0.95rem;
  outline: none;
  min-width: 300px;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &:hover,
  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
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
  color: ${({ $selected }) => ($selected ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, #666)')};
`;
