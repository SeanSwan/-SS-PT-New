/**
 * COMPONENT: CoverStudioPanel.baseStyles
 * PURPOSE: Base shell, section labels, and cover-type cards for the feed cover studio panel.
 */
import styled, { css } from 'styled-components';

export const StudioBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);

  span.num {
    color: var(--accent-primary, #60C0F0);
  }
`;

export const SectionHelp = styled.p`
  margin: -4px 0 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);

  b {
    color: var(--accent-gold, #C6A84B);
  }
`;

/* ── cover-type cards ──────────────────────────────────────────────────── */
export const TypeCard = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  gap: 14px;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 14px;
  border: none;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  transition: box-shadow 0.3s ease, transform 0.25s ease, background 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent),
      0 0 26px -8px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      background: linear-gradient(160deg,
        color-mix(in srgb, var(--accent-secondary, #8B5CF6) 36%, transparent),
        color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
      box-shadow: inset 0 0 0 1.6px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 80%, transparent),
        0 0 34px -8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TypeCardPreview = styled.div`
  flex: 0 0 auto;
  width: 76px;
  height: 52px;
  border-radius: 11px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

export const TypeCardMeta = styled.div`
  min-width: 0;
  flex: 1 1 auto;
`;

export const TypeCardName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 15px;
`;

export const TypeCardDesc = styled.div`
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
`;

export const RecTag = styled.span`
  padding: 2px 8px;
  border-radius: 999px;
  font-family: 'Fira Code', monospace;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-gold, #C6A84B) 50%, transparent);
`;

export const TypeCardCheck = styled.span<{ $active: boolean }>`
  position: absolute;
  right: 14px;
  top: 14px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--accent-secondary, #8B5CF6);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent);
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.25s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

