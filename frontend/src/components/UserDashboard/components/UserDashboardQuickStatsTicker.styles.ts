import styled, { css } from 'styled-components';

export const TickerShell = styled.section`
  display: grid;
  gap: 0.8rem;
  min-width: 0;
`;

export const TickerHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  color: var(--accent-primary, #60C0F0);
  font: 900 0.72rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const TickerTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
`;

export const TickerCounter = styled.span`
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 78%, transparent);
  font-size: 0.68rem;
`;

export const TickerViewport = styled.div`
  min-width: 0;
`;

export const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const TickerStatCard = styled.div`
  min-width: 0;
  min-height: 84px;
  display: grid;
  align-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      150deg,
      color-mix(in srgb, var(--surface-primary, #003080) 52%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent)
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);
`;

export const TickerStatLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 86%, transparent);
  font: 800 0.72rem/1.25 var(--font-ui, 'Sora', sans-serif);
`;

export const TickerIconWrap = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  color: var(--accent-primary, #60C0F0);
`;

export const TickerStatValue = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(1.05rem, 2vw, 1.35rem)/1 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0;
  word-break: break-word;
`;

export const TickerStatCaption = styled.span`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 72%, transparent);
  font: 700 0.68rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const TickerFooterControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 44px;
  flex-wrap: wrap;
`;

export const SlideDots = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
`;

export const SlideDot = styled.span<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '1.2rem' : '0.45rem')};
  height: 0.45rem;
  border-radius: 999px;
  background: ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--text-secondary, #B8C7D9) 28%, transparent)')};
  transition: width 180ms ease, background 180ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TickerControlButton = styled.button`
  width: 44px;
  min-width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    &:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 68%, transparent);
      background: color-mix(in srgb, var(--surface-primary, #003080) 42%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const mediaFrame = css`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  background: var(--bg-base, #030712);
  object-fit: cover;
`;

export const SponsorCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.42fr);
  gap: 0.85rem;
  align-items: center;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 38%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent)
    );

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const SponsorCopy = styled.div`
  display: grid;
  gap: 0.42rem;
  min-width: 0;
`;

export const SponsorLabel = styled.span`
  color: var(--accent-gold, #C6A84B);
  font: 900 0.68rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const SponsorTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1rem/1.22 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const SponsorBody = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 86%, transparent);
  font: 700 0.78rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const SponsorMediaImage = styled.img`
  ${mediaFrame}
`;

export const SponsorMediaVideo = styled.video`
  ${mediaFrame}
`;

export const SponsorLink = styled.a`
  min-height: 44px;
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 44%, transparent);
  color: var(--accent-gold, #C6A84B);
  text-decoration: none;
  font: 900 0.74rem/1 var(--font-ui, 'Sora', sans-serif);

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;