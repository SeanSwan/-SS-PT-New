/**
 * Form, switch, and table styles for gamification settings.
 */
import styled from 'styled-components';

export const SwitchGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

export const SwitchLabel = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 4px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  color: var(--gamification-text, #e2e8f0);
  font-size: 0.875rem;
  user-select: none;
`;

export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
`;

export const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  min-width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) =>
    $checked
      ? 'var(--gamification-accent, #0ea5e9)'
      : 'var(--gamification-switch-bg, rgba(255, 255, 255, 0.12))'};
  transition: background 0.2s ease;
`;

export const SwitchThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--gamification-switch-thumb, #ffffff);
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px var(--gamification-shadow, rgba(0, 0, 0, 0.3));
`;

export const LabelContent = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TooltipIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--gamification-muted-text, rgba(226, 232, 240, 0.5));
  cursor: help;
  position: relative;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 10px;
    background: var(--gamification-tooltip-bg, rgba(15, 23, 42, 0.97));
    border: 1px solid var(--gamification-info-border, rgba(14, 165, 233, 0.3));
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--gamification-text, #e2e8f0);
    white-space: nowrap;
    z-index: 50;
    pointer-events: none;
  }
`;

export const InputGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

export const InputLabel = styled.label`
  font-size: 0.75rem;
  color: var(--gamification-secondary-text, rgba(226, 232, 240, 0.6));
  margin-bottom: 2px;
`;

export const HelperText = styled.span`
  font-size: 0.75rem;
  color: var(--gamification-muted-text, rgba(226, 232, 240, 0.5));
  margin-top: 2px;
`;

export const StyledInput = styled.input<{ $disabled?: boolean; $textAlign?: string; $width?: string }>`
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--gamification-input-border, rgba(14, 165, 233, 0.2));
  background: var(--gamification-input-bg, rgba(15, 23, 42, 0.7));
  color: var(--gamification-text, #e2e8f0);
  font-size: 0.875rem;
  width: ${({ $width }) => $width || '100%'};
  text-align: ${({ $textAlign }) => $textAlign || 'left'};
  outline: none;
  transition: border-color 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'text')};

  &:focus {
    border-color: var(--gamification-accent, #0ea5e9);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

export const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 8px;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const THead = styled.thead`
  th {
    text-align: left;
    padding: 10px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gamification-secondary-text, rgba(226, 232, 240, 0.6));
    border-bottom: 1px solid var(--gamification-table-border, rgba(14, 165, 233, 0.15));
  }
`;

export const TBody = styled.tbody`
  td {
    padding: 10px 12px;
    font-size: 0.875rem;
    color: var(--gamification-text, #e2e8f0);
    border-bottom: 1px solid var(--gamification-table-row-border, rgba(14, 165, 233, 0.08));
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

export const TierDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 8px;
  vertical-align: middle;
`;

export const TierCell = styled.div`
  display: flex;
  align-items: center;
`;

export const InputSuffix = styled.span`
  font-size: 0.75rem;
  color: var(--gamification-muted-text, rgba(226, 232, 240, 0.5));
  margin-left: 8px;
`;

export const InlineInputRow = styled.div`
  display: flex;
  align-items: center;
`;

export const NumericCell = styled.td`
  text-align: right;
`;
