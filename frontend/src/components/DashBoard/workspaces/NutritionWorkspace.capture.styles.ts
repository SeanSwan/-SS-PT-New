import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

const capturePanel = css`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent),
    0 18px 36px color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);
`;

export const CaptureShell = styled.section`
  display: grid;
  gap: 14px;
`;

export const TodayRibbon = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1.6fr) repeat(3, minmax(140px, 1fr));
  gap: 10px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) { grid-template-columns: repeat(3, minmax(0, 1fr)); > article:first-child { grid-column: 1 / -1; } }
  @media (max-width: 360px) { grid-template-columns: repeat(2, minmax(0, 1fr)); > article:last-child { grid-column: 1 / -1; } }
`;

export const RibbonCard = styled.article<{ $primary?: boolean }>`
  ${capturePanel}
  min-height: ${({ $primary }) => ($primary ? '112px' : '96px')};
  padding: 14px;
  border-radius: 8px;
  @media (max-width: 900px) { &:first-child { grid-column: 1 / -1; } }
  @media (min-width: 361px) and (max-width: 520px) { &:first-child { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; } }
`;

export const RibbonEyebrow = styled.div`
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--accent-luxury, #C6A84B) 86%, var(--text-primary, #E0ECF4));
  font: 800 0.7rem/1 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const RibbonValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font: 900 1.45rem/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const RibbonLabel = styled.div`
  margin-top: 6px;
  color: var(--text-secondary, #94a3b8);
  font: 600 0.78rem/1.35 var(--font-ui, 'Sora', sans-serif);
`;

export const RibbonAction = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 12px; padding: 0 14px; border-radius: 8px; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent);
  background: var(--primary, #002060); color: var(--text-primary, #E0ECF4);
  font: 800 0.76rem/1 var(--font-ui, 'Sora', sans-serif);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  @media (min-width: 361px) and (max-width: 520px) { margin-top: 0; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const CaptureGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 14px;
  align-items: stretch;
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const CaptureRail = styled.div`
  ${capturePanel}
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 8px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: unset; grid-auto-flow: column;
    grid-auto-columns: minmax(210px, 74vw); overflow-x: auto;
    overscroll-behavior-inline: contain; scroll-snap-type: inline mandatory;
  }
`;

export const CaptureTile = styled(motion.button)<{ $active: boolean }>`
  min-height: 92px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  scroll-snap-align: start;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  border-left: 3px solid ${({ $active }) => ($active
    ? 'var(--ice-wing, var(--accent-primary, #60C0F0))'
    : 'transparent')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary, #002060) 80%, var(--accent-secondary, #8B5CF6) 12%), color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent))'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  box-shadow: ${({ $active }) => ($active ? '0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)' : 'none')};

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const CaptureIcon = styled.span<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, var(--bg-base, #0A0A0F))'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent)')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-secondary, #8B5CF6)')};
`;

export const CaptureCopy = styled.span`
  min-width: 0;
`;

export const TileTitle = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.9rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const TileMeta = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--text-secondary, #94a3b8);
  font: 600 0.76rem/1.35 var(--font-ui, 'Sora', sans-serif);
`;

export const TileBadge = styled.span<{ $active: boolean }>`
  min-width: 52px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 28%, transparent);
  color: ${({ $active }) => ($active ? 'var(--accent-luxury, #C6A84B)' : 'var(--text-secondary, #94a3b8)')};
  font: 900 0.68rem/1 var(--font-ui, 'Sora', sans-serif);
  @media (max-width: 680px) { display: none; }
`;

export const SourceTruthRail = styled.aside`
  ${capturePanel}
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  @media (max-width: 680px) { display: none; }
`;

export const SourceTruthTitle = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 2px;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.95rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const SourcePill = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  color: var(--text-secondary, #94a3b8);
  font: 700 0.78rem/1.35 var(--font-ui, 'Sora', sans-serif);

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const MacroPulsePanel = styled.div`
  display: grid;
  grid-template-columns: minmax(128px, 160px) minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 8px 0 10px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const MacroPulseChart = styled.div`
  position: relative;
  width: clamp(128px, 100%, 160px);
  aspect-ratio: 1;
  justify-self: center;

  svg {
    width: 100% !important;
    height: 100% !important;
    overflow: visible;
  }
`;

export const MacroPulseCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;

  strong {
    color: var(--text-primary, #E0ECF4);
    font: 900 1.02rem/1 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }

  span {
    margin-top: 5px;
    color: var(--text-secondary, #94a3b8);
    font: 800 0.62rem/1 var(--font-ui, 'Sora', sans-serif);
    letter-spacing: 0;
    text-transform: uppercase;
  }
`;

export const MacroPulseLegend = styled.div`
  min-width: 0;
  display: grid;
  gap: 6px;

  > strong {
    color: var(--text-primary, #E0ECF4);
    font: 900 0.85rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  }

  > span {
    color: var(--text-secondary, #94a3b8);
    font: 700 0.74rem/1.35 var(--font-ui, 'Sora', sans-serif);
  }
`;

export const MacroPulseLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.72rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const MacroPulseSwatch = styled.i<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 10px ${({ $color }) => $color};
`;
export const LiveStatusGrid = styled.div`
  display: grid; gap: 8px; margin-top: 2px;
`;

export const LiveStatusRow = styled.div`
  min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 10px; border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 56%, transparent);
  span { color: var(--text-secondary, #94a3b8); font: 700 0.72rem/1.2 var(--font-ui, 'Sora', sans-serif); }
  strong { color: var(--text-primary, #E0ECF4); font: 800 0.75rem/1.2 var(--font-ui, 'Sora', sans-serif); text-align: right; }
`;
