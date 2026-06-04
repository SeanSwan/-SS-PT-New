import styled from 'styled-components';

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const GlassPanel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-strong, 0 18px 44px rgba(0, 0, 0, 0.36));
`;

export const SectionTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 0 0 24px;
  font-size: 0.85rem;
  color: var(--text-secondary, #9FB2C8);
`;

export const FlexRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

export const FlexCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: center;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, auto);
  }
`;

export const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const StyledLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary, #9FB2C8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StyledSelect = styled.select`
  appearance: none;
  background: var(--surface-soft, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  padding: 10px 36px 10px 12px;
  font-size: 0.875rem;
  min-height: 44px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }

  & option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const SwitchWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-height: 44px;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
  user-select: none;
`;

export const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) => (
    $checked ? 'var(--accent-primary, #60C0F0)' : 'var(--surface-muted, rgba(255, 255, 255, 0.15))'
  )};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

export const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text-primary, #E0ECF4);
  transition: left 0.2s ease;
`;

export const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const StyledThead = styled.thead`
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
`;

export const StyledTh = styled.th<{ $align?: string }>`
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #9FB2C8);
  text-align: ${({ $align }) => $align || 'left'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

export const StyledTd = styled.td<{ $align?: string }>`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
  text-align: ${({ $align }) => $align || 'left'};
  border-bottom: 1px solid var(--border-muted, rgba(255, 255, 255, 0.06));
`;

export const MetricName = styled.span`
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  display: block;
`;

export const MetricCaption = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary, #9FB2C8);
  display: block;
  margin-top: 2px;
`;

export const MetricScore = styled.span<{ $bold?: boolean }>`
  font-weight: ${({ $bold }) => ($bold ? 700 : 400)};
  color: ${({ $bold }) => (
    $bold ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #9FB2C8)'
  )};
  display: block;
`;

export const ProgressBarWrapper = styled.div`
  min-width: 80px;
`;

export const ProgressBarTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--surface-muted, rgba(255, 255, 255, 0.08));
  margin-top: 6px;
  overflow: hidden;
`;

export const ProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  transition: width 0.4s ease;
`;

export const PercentileChip = styled.span<{ $variant: 'success' | 'warning' | 'error' }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $variant }) => `color-mix(in srgb, var(--status-${$variant}, #60C0F0) 15%, transparent)`};
  color: ${({ $variant }) => `var(--status-${$variant}, #60C0F0)`};
`;

export const ImprovementText = styled.span<{ $color: string }>`
  font-weight: 500;
  color: ${({ $color }) => $color};
`;

export const InsightsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'info' | 'error' }>`
  padding: 16px;
  border-radius: 8px;
  background: var(--surface-soft, rgba(255, 255, 255, 0.05));
  border-left: 3px solid ${({ $severity }) => `var(--status-${$severity}, var(--accent-primary, #60C0F0))`};
`;

export const AlertTitle = styled.p`
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const AlertBody = styled.p`
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--text-secondary, #9FB2C8);
`;

export const AlertRec = styled.p`
  margin: 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

export const StatePanel = styled(GlassPanel)`
  min-height: 132px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const StateText = styled.p`
  margin: 0;
  color: var(--text-secondary, #9FB2C8);
  font-size: 0.9rem;
  line-height: 1.5;
`;
