import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Stat, StatGrid } from './CoachIntakeWorkspaceQueue.styles';

export const Panel = styled.section`
  width: min(100%, 1240px);
  margin: 0 auto 10px;
  padding: clamp(10px, 1.6vw, 14px);
  box-sizing: border-box;
  overflow-x: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-midnight-sapphire, #002060) 58%, transparent),
      color-mix(in srgb, var(--card-bg, #141419) 86%, transparent)
    ),
    var(--card-bg, #141419);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--bg-base, #030712) 55%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

export const IntakeSnapshot = styled.div`
  margin: 10px 0 12px;
  min-width: 0;

  ${StatGrid} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  ${Stat} {
    min-height: 56px;
    padding: 8px 10px;
  }

  ${Stat} dd {
    font-size: 21px;
  }

  @media (max-width: 640px) {
    ${StatGrid} {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'};
  background: ${({ $primary }) => $primary
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--color-midnight-sapphire, #002060) 34%, transparent)'};
  color: ${({ $primary }) => $primary
    ? 'var(--bg-base, #030712)'
    : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  max-width: 100%;
  min-width: 0;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ $primary }) => $primary
      ? '0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent)'
      : '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.68;
    transform: none;
    box-shadow: none;
  }
`;

export const WorkspaceLink = styled(Link)<{ $primary?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent)'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 36%, transparent)'};
  background: ${({ $primary }) => $primary
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'};
  color: ${({ $primary }) => $primary
    ? 'var(--bg-base, #030712)'
    : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  max-width: 100%;
  min-width: 0;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  text-decoration: none;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ $primary }) => $primary
      ? '0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent)'
      : '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ $primary }) => $primary
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--accent-primary, #60C0F0)'};
    outline-offset: 2px;
  }
`;

export {
  ChipColumn,
  ItemCard,
  ItemList,
  ItemTitle,
  QueueActions,
  QueueMetaChips,
  SourceChip,
  Stat,
  StatGrid,
} from './CoachIntakeWorkspaceQueue.styles';
