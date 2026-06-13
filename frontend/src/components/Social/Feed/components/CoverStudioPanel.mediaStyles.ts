/**
 * COMPONENT: CoverStudioPanel.mediaStyles
 * PURPOSE: Focal point, media library, accordion, and range styles for the feed cover studio panel.
 */
import styled, { css } from 'styled-components';

export const FocalPad = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`;

export const FocalButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Fira Code', monospace;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)' : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent)'};
  color: ${({ $active }) =>
    $active ? '#fff' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent)'};
  box-shadow: inset 0 0 0 ${({ $active }) => ($active ? '1.4px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 80%, transparent)' : '1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  transition: box-shadow 0.25s ease, color 0.25s ease;

  &:hover {
    color: #fff;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* ── media library grid ────────────────────────────────────────────────── */
export const LibGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  @media (max-width: 460px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const LibItem = styled.button<{ $selected: boolean }>`
  position: relative;
  aspect-ratio: 1;
  border: none;
  border-radius: 11px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  transition: box-shadow 0.25s ease, transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  ${({ $selected }) =>
    $selected &&
    css`
      box-shadow: inset 0 0 0 1.8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 90%, transparent),
        0 0 18px -4px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, transparent);
    `}

  img,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LibAddTile = styled.button`
  aspect-ratio: 1;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  border-radius: 11px;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LibPickNumber = styled.span`
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: #fff;
  background: var(--accent-secondary, #8B5CF6);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent);
`;

export const LibVideoTag = styled.span`
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

/* ── advanced accordion + range rows ───────────────────────────────────── */
export const Accordion = styled.div<{ $open: boolean }>`
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const AccordionHead = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -2px;
  }
`;

export const AccordionChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const AccordionInner = styled.div`
  padding: 4px 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const RangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  input[type='range'] {
    flex: 1 1 auto;
    accent-color: var(--accent-primary, #60C0F0);
    min-height: 28px;
  }
`;

export const RangeValue = styled.span`
  flex: 0 0 auto;
  width: 46px;
  text-align: right;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--accent-primary, #60C0F0);
`;
