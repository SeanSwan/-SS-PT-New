/**
 * COMPONENT: CoverStudioPanel.layoutStyles
 * PURPOSE: Layout direction, schematic, and segmented-control styles for the feed cover studio panel.
 */
import styled, { css } from 'styled-components';

export const DirGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 460px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const DirTile = styled.button<{ $active: boolean }>`
  position: relative;
  border: none;
  border-radius: 14px;
  padding: 8px;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  transition: box-shadow 0.3s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 0 0 0 1.6px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 80%, transparent),
        0 0 22px -8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const DirTilePreview = styled.div`
  height: 44px;
  border-radius: 9px;
  overflow: hidden;
  position: relative;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const DirTileName = styled.div`
  margin-top: 7px;
  font-size: 11px;
  font-weight: 600;
`;

export const DirTileRec = styled.span`
  position: absolute;
  top: -6px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, var(--accent-gold, #C6A84B), color-mix(in srgb, var(--accent-gold, #C6A84B) 60%, #000));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-gold, #C6A84B) 70%, transparent);
  color: #1a1505;
`;

/* schematic shapes inside a dir/type preview */
export const Schem = styled.div`
  position: absolute;
  inset: 5px;
  display: flex;
  gap: 3px;

  i {
    display: block;
    border-radius: 3px;
    background: linear-gradient(160deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent));
  }
`;

/* ── segmented controls (framing / height presets) ─────────────────────── */
export const Seg = styled.div`
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const SegButton = styled.button<{ $active: boolean }>`
  flex: 1 1 0;
  min-height: 44px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  background: transparent;
  color: ${({ $active }) =>
    $active ? '#fff' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent)'};
  transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;

  ${({ $active }) =>
    $active &&
    css`
      background: linear-gradient(160deg,
        color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent),
        color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
    `}

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

