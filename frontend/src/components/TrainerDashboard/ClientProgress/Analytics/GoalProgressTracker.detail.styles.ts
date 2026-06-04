import styled, { css } from 'styled-components';

export const TableWrapper = styled.div`
  overflow-x: auto;
  width: 100%;
  -webkit-overflow-scrolling: touch;
`;

export const StyledTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

export const Thead = styled.thead``;
export const Tbody = styled.tbody``;

export const Tr = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid var(--surface-muted, rgba(96, 192, 240, 0.08));

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;

      &:hover {
        background: var(--surface-muted, rgba(96, 192, 240, 0.08));
      }
    `}
`;

export const Th = styled.th`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const Td = styled.td`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.875rem;
  padding: 14px 16px;
  vertical-align: middle;
`;

export const CellTitle = styled.p`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
`;

export const CellCaption = styled.span`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
`;

export const TargetDateText = styled.span`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.875rem;
`;

export const Chip = styled.span<{ $bg?: string; $color?: string }>`
  align-items: center;
  background: ${({ $bg }) => $bg || 'var(--surface-muted, rgba(96, 192, 240, 0.08))'};
  border-radius: 20px;
  color: ${({ $color }) => $color || 'var(--text-primary, #e2e8f0)'};
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  white-space: nowrap;
`;

export const ProgressBarOuter = styled.div<{ $full?: boolean }>`
  background: var(--surface-muted, rgba(96, 192, 240, 0.08));
  border-radius: 3px;
  height: 6px;
  margin-bottom: 4px;
  overflow: hidden;
  width: ${({ $full }) => ($full ? '100%' : '100px')};
`;

export const ProgressBarFill = styled.div<{ $value: number; $color: string }>`
  background: ${({ $color }) => $color};
  border-radius: 3px;
  height: 100%;
  transition: width 0.4s ease;
  width: ${({ $value }) => Math.max(0, Math.min(Number.isFinite($value) ? $value : 0, 100))}%;
`;

export const ProgressCellFrame = styled.div`
  width: 100px;
`;

export const Overlay = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 1000;
`;

export const ModalPanel = styled.div`
  background: var(--bg-elevated, #111827);
  border: 1px solid var(--border-primary, rgba(96, 192, 240, 0.18));
  border-radius: 16px;
  box-shadow: var(--shadow-strong, 0 18px 38px rgba(0, 0, 0, 0.32));
  max-height: 90vh;
  max-width: 800px;
  overflow-y: auto;
  width: 100%;
  backdrop-filter: blur(16px);
`;

export const ModalHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid var(--surface-muted, rgba(96, 192, 240, 0.08));
  display: flex;
  justify-content: space-between;
  padding: 20px 24px;
`;

export const ModalTitleActions = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;
`;

export const ModalBody = styled.div`
  padding: 24px;
`;

export const ModalFooter = styled.div`
  border-top: 1px solid var(--surface-muted, rgba(96, 192, 240, 0.08));
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
`;

export const TwoColGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const AchievementsGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const AchievementCard = styled.div<{ $earned: boolean }>`
  align-items: center;
  background: ${({ $earned }) =>
    $earned
      ? 'color-mix(in srgb, var(--feedback-warning, #FFC107) 12%, transparent)'
      : 'var(--surface-muted, rgba(96, 192, 240, 0.08))'};
  border: 1px solid ${({ $earned }) =>
    $earned
      ? 'color-mix(in srgb, var(--feedback-warning, #FFC107) 28%, transparent)'
      : 'var(--border-primary, rgba(96, 192, 240, 0.18))'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: ${({ $earned }) => ($earned ? 1 : 0.65)};
  padding: 20px;
  text-align: center;
`;

export const AchievementTitle = styled.p`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
`;

export const AchievementDesc = styled.span`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
  line-height: 1.4;
`;

export const StepperContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StepItem = styled.div`
  display: flex;
  gap: 12px;
  position: relative;
`;

export const StepIconCol = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 24px;
`;

export const StepConnector = styled.div<{ $visible: boolean }>`
  background: ${({ $visible }) => ($visible ? 'var(--border-primary, rgba(96, 192, 240, 0.22))' : 'transparent')};
  flex: 1;
  min-height: 16px;
  width: 2px;
`;

export const StepContent = styled.div`
  padding-bottom: 20px;
`;

export const StepTitle = styled.p`
  color: var(--text-primary, #e2e8f0);
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 4px;
`;

export const StepCaption = styled.span<{ $tone?: 'success' | 'warning' }>`
  color: ${({ $tone }) =>
    $tone === 'success'
      ? 'var(--feedback-success, #4CAF50)'
      : $tone === 'warning'
        ? 'var(--feedback-warning, #FFC107)'
        : 'var(--text-secondary, #94a3b8)'};
  display: block;
  font-size: 0.75rem;
  line-height: 1.6;
`;
