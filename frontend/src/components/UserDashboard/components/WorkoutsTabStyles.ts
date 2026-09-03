/**
 * Styled-components for the active UserDashboard V3 workout-usage panel.
 */

import styled from 'styled-components';
import {
  visionAccentButtonCss,
  visionCardCss,
  visionControlCss,
  visionPanelCss,
} from './UserDashboardSectionChrome.styles';

export const Container = styled.div`
  ${visionPanelCss}
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: clamp(1rem, 1.5vw, 1.4rem);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 540px) {
    width: 100%;

    > button {
      flex: 1 1 150px;
      justify-content: center;
    }
  }
`;

export const NextMovePanel = styled.section`
  ${visionCardCss}
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: clamp(0.9rem, 1.4vw, 1.2rem);
  border-color: var(--accent-primary-soft, rgba(96, 192, 240, 0.24));
  background:
    linear-gradient(135deg, var(--surface-primary, rgba(0, 32, 96, 0.86)), var(--surface-secondary, rgba(10, 10, 15, 0.72))),
    radial-gradient(circle at 15% 15%, var(--accent-primary-faint, rgba(96, 192, 240, 0.16)), transparent 38%);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const NextMoveText = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
`;

export const NextMoveEyebrow = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const NextMoveTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 1.2vw, 1.15rem);
  font-weight: 800;
`;

export const NextMoveCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.45;
`;

export const NextMoveActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 520px) {
    > button {
      flex: 1 1 100%;
      justify-content: center;
    }
  }
`;

export const SectionTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
`;

export const LogButton = styled.button`
  ${visionAccentButtonCss}
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  cursor: pointer;
`;

export const CoachButton = styled.button`
  ${visionControlCss}
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  cursor: pointer;
`;

export const EmptyActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;

  @media (max-width: 520px) {
    width: 100%;

    > button {
      flex: 1 1 100%;
      justify-content: center;
    }
  }
`;

export const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const StatCard = styled.div`
  ${visionCardCss}
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
`;

export const StatIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
`;

export const StatValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 700;
`;

export const StatLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const CategorySection = styled.div`
  ${visionCardCss}
  overflow: hidden;
`;

export const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
`;

export const CategoryIcon = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
`;

export const CategoryName = styled.span`
  flex: 1;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
`;

export const CategoryCount = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
`;

export const ChartScroll = styled.div`
  max-height: 180px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: rgba(96, 192, 240, 0.2) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 2px;
    background: rgba(96, 192, 240, 0.2);
  }
`;

export const ChartContainer = styled.div`
  width: 100%;

  svg {
    overflow: visible;
  }
`;

export const ErrorCard = styled.div`
  ${visionCardCss}
  padding: 16px 20px;
  border-left: 4px solid var(--error, #C92A54);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  p {
    margin: 0 0 12px;
  }
`;

export const RetryButton = styled.button`
  ${visionControlCss}
  padding: 8px 16px;
  cursor: pointer;
`;

/** Centered row for the history-extension control (Blueprint v2 S8). */
export const LoadOlderRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
`;

/** Inline note for a FAILED history extension — never a full-screen error. */
export const ExtensionErrorNote = styled.p`
  margin: 0;
  padding: 8px 14px;
  border-left: 3px solid var(--error, #C92A54);
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.8rem;
`;

