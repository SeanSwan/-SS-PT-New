/**
 * Admin sessions table and utility styles.
 * Extracted from the canonical admin sessions page to keep behavior and visuals separate.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { User } from 'lucide-react';
import { DialogPanel } from './AdminSessionsDialog.styles';
import { StyledTableCell, StyledTableHeadCell } from './AdminSessionsTableBase.styles';
import * as tokens from './AdminSessionsTable.tokens';

export {
  StyledTableContainer,
  StyledTableHead,
  StyledTableHeadCell,
  StyledTableCell,
  StyledTableRow,
} from './AdminSessionsTableBase.styles';

export const BulkActionsBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
  background: ${tokens.BULK_ACTION_SURFACE};
  border: 1px solid ${tokens.BULK_ACTION_BORDER};
  border-radius: 12px;
  color: ${tokens.TEXT_PRIMARY};
  backdrop-filter: blur(5px);
`;

export const FlexRow = styled.div<{
  $gap?: string;
  $align?: string;
  $justify?: string;
  $wrap?: boolean;
  $top?: string;
  $bottom?: string;
  $flex?: number;
}>`
  display: flex;
  flex-direction: row;
  align-items: ${p => p.$align || 'center'};
  justify-content: ${p => p.$justify || 'flex-start'};
  gap: ${p => p.$gap || '0.5rem'};
  flex-wrap: ${p => p.$wrap ? 'wrap' : 'nowrap'};
  flex: ${p => p.$flex ?? 'initial'};
  margin-top: ${p => p.$top || 0};
  margin-bottom: ${p => p.$bottom || 0};
`;

export const FlexCol = styled.div<{ $gap?: string; $flex?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${p => p.$gap || '0.5rem'};
  flex: ${p => p.$flex ?? 'initial'};
`;

export const ViewToggleContainer = styled.div`
  background: ${tokens.TOGGLE_SURFACE};
  border-radius: 8px;
  padding: 4px;
  border: 1px solid ${tokens.BULK_ACTION_BORDER};
  display: flex;
  gap: 4px;
`;

export const TitleText = styled.span`
  font-weight: 300;
  font-size: 1.25rem;
  color: ${tokens.TEXT_PRIMARY};
`;

export const BulkSelectedText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: ${tokens.TEXT_PRIMARY};
`;

export const TrainerSectionWrap = styled(motion.div)`
  margin-top: 2rem;
`;

export const TitleIcon = styled(User)`
  margin-right: 0.5rem;
`;

export const DialogPanelNarrow = styled(DialogPanel)<{ $maxWidth: string }>`
  max-width: ${({ $maxWidth }) => $maxWidth};
`;

export const NativeTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const NativeTableHead = styled.thead``;

export const NativeTableBody = styled.tbody``;

export const SortableHeaderCell = styled(StyledTableHeadCell)`
  cursor: pointer;
  user-select: none;

  &:hover {
    background: ${tokens.SORT_HOVER_SURFACE};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -3px;
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  }
`;

export const CheckboxCell = styled(StyledTableHeadCell)`
  width: 48px;
  min-width: 48px;
`;

export const CheckboxBodyCell = styled(StyledTableCell)`
  width: 48px;
  min-width: 48px;
`;

export const ActionsCell = styled(StyledTableHeadCell)`
  text-align: right;
`;

export const ActionsBodyCell = styled(StyledTableCell)`
  text-align: right;
`;

/* Styled Checkbox */
export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export const CheckboxWrapper = styled.label<{ $checked?: boolean; $indeterminate?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  position: relative;

  &::before {
    content: '';
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid ${p => (p.$checked || p.$indeterminate) ? tokens.CHECKBOX_SELECTED_BORDER : tokens.CHECKBOX_BORDER};
    background: ${p => (p.$checked || p.$indeterminate) ? tokens.CHECKBOX_SELECTED_SURFACE : 'transparent'};
    transition: all 0.2s ease;
  }

  &::after {
    content: '${p => p.$indeterminate ? '\\2014' : p.$checked ? '\\2713' : ''}';
    position: absolute;
    color: ${tokens.CHECKBOX_SELECTED_BORDER};
    font-size: ${p => p.$indeterminate ? '14px' : '13px'};
    font-weight: bold;
    line-height: 1;
  }
`;

/* Avatar */
export const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${p => p.$size || 32}px;
  height: ${p => p.$size || 32}px;
  border-radius: 50%;
  background: ${tokens.AVATAR_SURFACE};
  border: 1px solid ${tokens.AVATAR_BORDER};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${p => ((p.$size || 32) * 0.35)}px;
  font-weight: 600;
  color: ${tokens.TEXT_PRIMARY};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/* Session count chip inside table */
export const SessionCountChip = styled.span<{ $hasAvailable?: boolean }>`
  font-size: 0.7rem;
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  margin-top: 4px;
  border-radius: 10px;
  border: 1px solid ${p => p.$hasAvailable ? tokens.POSITIVE_BORDER : tokens.DANGER_BORDER};
  color: ${p => p.$hasAvailable ? tokens.POSITIVE_TEXT : tokens.DANGER_TEXT};
  background: ${p => p.$hasAvailable ? tokens.POSITIVE_SURFACE : tokens.DANGER_SURFACE};
`;

export const CellPrimaryText = styled.span<{ $top?: string; $bottom?: string }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${tokens.TEXT_PRIMARY};
  display: block;
  margin-top: ${p => p.$top || 0};
  margin-bottom: ${p => p.$bottom || 0};
`;

export const CellSecondaryText = styled.span`
  font-size: 0.75rem;
  color: ${tokens.TEXT_SECONDARY};
  display: block;
`;

export const MutedText = styled.span`
  color: ${tokens.TEXT_MUTED};
  font-style: italic;
  font-size: 0.875rem;
`;

/* Pagination */
export const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: ${tokens.TEXT_SECONDARY};
  border-top: 1px solid ${tokens.DIVIDER};
  margin-top: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;

  select {
    background: ${tokens.FIELD_SURFACE};
    color: ${tokens.TEXT_PRIMARY};
    border: 1px solid ${tokens.FIELD_BORDER};
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
    min-height: 44px;

    &:focus {
      border-color: ${tokens.FOCUS_BORDER};
    }
  }
`;

export const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: 1px solid ${tokens.FIELD_BORDER};
  border-radius: 6px;
  color: ${p => p.$disabled ? tokens.TEXT_DISABLED : tokens.TEXT_SECONDARY};
  cursor: ${p => p.$disabled ? 'default' : 'pointer'};
  padding: 4px 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${tokens.BUTTON_HOVER_SURFACE};
    border-color: ${tokens.BUTTON_HOVER_BORDER};
  }
`;
