import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const Panel = styled.section`
  margin: 0 12px 10px;
  padding: 14px;
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

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  min-width: 0;

  h2 {
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: 0;

    @media (max-width: 720px) {
      font-size: 16px;
    }
  }

  p {
    margin: 4px 0 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  text-transform: uppercase;
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(260px, 1.18fr);
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const StatGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
`;

export const Stat = styled.div`
  min-height: 64px;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 48%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);

  dt {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  dd {
    margin: 4px 0 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const ItemList = styled.div`
  display: grid;
  gap: 8px;
`;

export const ItemCard = styled.div<{ $active?: boolean }>`
  min-height: 54px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'};
  box-shadow: ${({ $active }) => $active
    ? '0 0 18px color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)'
    : 'none'};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ItemTitle = styled.div`
  min-width: 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;

  strong {
    display: block;
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  }
`;

export const ChipColumn = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    justify-content: flex-start;
  }
`;

export const SourceChip = styled.span<{ $tone?: 'cyan' | 'gold' | 'purple' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent)';
    if ($tone === 'purple') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
  }};
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent)';
    if ($tone === 'purple') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'purple') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }};
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  line-height: 1.25;
  max-width: 100%;
  overflow-wrap: anywhere;
`;
