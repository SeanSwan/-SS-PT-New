import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const IntakeSnapshot = styled.section`
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-cyan-soft, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: var(--surface-elevated,
    linear-gradient(135deg, rgba(0, 32, 96, 0.35), rgba(10, 10, 15, 0.76)));
`;

export const IntakeSnapshotHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  h2 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0;
  }
`;

export const IntakeStats = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin: 0;

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

export const IntakeStat = styled.div`
  min-height: 64px;
  padding: 0.7rem;
  border-radius: 8px;
  background: var(--surface-recessed, rgba(10, 10, 15, 0.42));

  dt {
    color: var(--text-secondary, rgba(224, 236, 244, 0.72));
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  dd {
    margin: 0.2rem 0 0;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Fira Code', monospace;
    font-size: 1.25rem;
    font-weight: 900;
  }
`;

export const IntakePreviewList = styled.ul`
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const IntakePreviewItem = styled.li<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 48px;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 58%, transparent)'
    : 'transparent')};
  background: ${({ $selected }) => ($selected
    ? `linear-gradient(
        0deg,
        color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent),
        color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent)
      ),
      var(--surface-base, rgba(20, 20, 25, 0.7))`
    : 'var(--surface-base, rgba(20, 20, 25, 0.7))')};
  box-shadow: ${({ $selected }) => ($selected
    ? '0 0 18px color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
    : 'none')};
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-size: 0.84rem;
`;

export const BadgeCluster = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;

  @media (max-width: 640px) {
    justify-content: flex-start;
  }
`;

export const IntakePreviewLink = styled(Link)`
  min-height: 44px;
  display: flex;
  align-items: center;
  min-width: 0;
  color: inherit;
  font-weight: 800;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 3px;
    border-radius: 6px;
  }
`;

export const SourceBadge = styled.span<{ $tone?: 'cyan' | 'gold' }>`
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.5rem;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => ($tone === 'gold'
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent)'
    : 'var(--border-cyan-soft, rgba(96, 192, 240, 0.3))')};
  color: ${({ $tone }) => ($tone === 'gold'
    ? 'var(--accent-gold, #C6A84B)'
    : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
`;
