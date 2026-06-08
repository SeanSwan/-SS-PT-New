import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const ScheduleBanner = styled.section<{ $deducting: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.875rem;
  align-items: start;
  margin: -0.75rem 0 1.5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid ${({ $deducting }) =>
    $deducting
      ? `var(--status-warning-border, ${CS.warningBorder})`
      : `var(--status-success-border, ${CS.successBorder})`};
  background:
    linear-gradient(
      135deg,
      ${({ $deducting }) =>
        $deducting
          ? `var(--status-warning-bg, ${CS.warningBg})`
          : `var(--status-success-bg, ${CS.successBg})`},
      ${withAlpha(CS.cardDark, 0.78)}
    );
  box-shadow: 0 10px 28px ${withAlpha(CS.bgDeep, 0.28)};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    margin-top: -0.25rem;
  }
`;

export const ScheduleIconShell = styled.div<{ $deducting: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $deducting }) =>
    $deducting
      ? `var(--status-warning-text, ${CS.warningText})`
      : `var(--status-success-text, ${CS.successText})`};
  background: ${withAlpha(CS.bgDeep, 0.35)};
  border: 1px solid ${withAlpha(CS.text, 0.12)};
`;

export const ScheduleBannerBody = styled.div`
  min-width: 0;
`;

export const ScheduleBannerTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, ${CS.text});
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0;
`;

export const ScheduleBannerText = styled.p`
  margin: 0.35rem 0 0;
  color: var(--text-secondary, ${CS.textSecondary});
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.5;
`;

export const ScheduleMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

export const ScheduleMetaPill = styled.span<{ $deducting?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 32px;
  padding: 0.375rem 0.625rem;
  border-radius: 999px;
  color: ${({ $deducting }) =>
    $deducting
      ? `var(--status-warning-text, ${CS.warningText})`
      : `var(--text-secondary, ${CS.textSecondary})`};
  background: ${withAlpha(CS.bgDeep, 0.32)};
  border: 1px solid ${withAlpha(CS.text, 0.1)};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
`;
