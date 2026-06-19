/**
 * BootcampDemoMode.floorStyles.ts
 * PURPOSE: TV/mobile floor-director controls for Bootcamp Demo Mode.
 */
import styled from 'styled-components';

export const FloorDirectorRail = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent), transparent 44%),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 54%, transparent);

  @media (min-width: 2200px) {
    grid-template-columns: minmax(260px, 0.85fr) minmax(420px, 1.6fr) minmax(220px, 0.7fr);
    align-items: center;
    padding: 14px;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 3px;
  }
`;

export const FloorDirectorSummary = styled.div`
  display: grid;
  gap: 3px;
  min-width: 0;

  strong {
    color: var(--text-primary, #E0ECF4);
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    line-height: 1.2;
  }

  span {
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.35;
  }

  @media (min-width: 2200px) {
    strong { font-size: 22px; }
    span { font-size: 14px; }
  }
`;

export const StationJumpRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const StationJumpButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  min-width: 84px;
  border: 1px solid ${({ $active }) => (
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
  )};
  border-radius: 8px;
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
      : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 84%, transparent)'
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: grid;
  gap: 2px;
  justify-items: start;
  padding: 7px 10px;
  text-align: left;

  strong {
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.1;
  }

  span {
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
    font-family: 'Fira Code', monospace;
    font-size: 10px;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (min-width: 2200px) {
    min-width: 116px;
    padding: 10px 12px;

    strong { font-size: 15px; }
    span { font-size: 12px; }
  }
`;

export const FloorDirectorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (min-width: 2200px) {
    justify-content: flex-end;
  }
`;

export const DirectorButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border: 1px solid ${({ $active }) => (
    $active
      ? 'var(--accent-gold, #C6A84B)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)'
  )};
  border-radius: 8px;
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)'
      : 'color-mix(in srgb, var(--bg-elevated, #141419) 86%, transparent)'
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  padding: 8px 12px;

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 2px;
  }

  @media (min-width: 2200px) {
    min-height: 52px;
    font-size: 14px;
    padding: 10px 14px;
  }
`;
