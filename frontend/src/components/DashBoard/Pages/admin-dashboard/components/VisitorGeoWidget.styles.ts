import styled, { css, keyframes } from 'styled-components';
import type { BadgeVariant } from './VisitorGeoWidget.types';

export const MIDNIGHT = 'var(--bg-elevated, #141419)';
export const ICE_WING = 'var(--accent-primary, #60C0F0)';
export const WING_PURPLE = 'var(--accent-secondary, #8B5CF6)';
export const GILDED = 'var(--accent-gold, #C6A84B)';
export const FROST = 'var(--text-primary, #E0ECF4)';
export const SUCCESS_GREEN = 'var(--success, #22C55E)';
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const pulseRing = keyframes`
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
`;
const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;
const variantCss = (variant: BadgeVariant) => {
  if (variant === 'login') return css`color: ${GILDED}; background: color-mix(in srgb, ${GILDED} 12%, transparent); border-color: color-mix(in srgb, ${GILDED} 24%, transparent);`;
  if (variant === 'gallery') return css`color: ${ICE_WING}; background: color-mix(in srgb, ${ICE_WING} 12%, transparent); border-color: color-mix(in srgb, ${ICE_WING} 24%, transparent);`;
  if (variant === 'anonymous') return css`color: ${WING_PURPLE}; background: color-mix(in srgb, ${WING_PURPLE} 12%, transparent); border-color: color-mix(in srgb, ${WING_PURPLE} 24%, transparent);`;
  return css`color: var(--text-secondary, #b8c7d8); background: color-mix(in srgb, ${FROST} 5%, transparent); border-color: color-mix(in srgb, ${FROST} 9%, transparent);`;
};

export const WidgetCard = styled.div`
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated, #003080) 34%, transparent), ${MIDNIGHT});
  border: 1px solid color-mix(in srgb, ${WING_PURPLE} 18%, transparent);
  border-radius: 20px;
  box-shadow: inset 0 1px 0 color-mix(in srgb, ${FROST} 7%, transparent), 0 8px 32px color-mix(in srgb, #000000 36%, transparent);
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
  max-height: 520px;
  overflow: hidden;

  @media (max-width: 768px) { max-height: none; }
`;

export const Header = styled.div`
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 18px 18px 14px;

  @media (max-width: 720px) { align-items: flex-start; flex-direction: column; }
`;

export const HeaderLeft = styled.div`
  align-items: center;
  display: flex;
  gap: 0.75rem;
`;

export const LiveDot = styled.div`
  background: ${SUCCESS_GREEN};
  border-radius: 50%;
  box-shadow: 0 0 8px color-mix(in srgb, ${SUCCESS_GREEN} 60%, transparent);
  height: 10px;
  position: relative;
  width: 10px;

  &::after {
    animation: ${pulseRing} 1.8s ease-out infinite;
    background: color-mix(in srgb, ${SUCCESS_GREEN} 40%, transparent);
    border-radius: 50%;
    content: '';
    inset: 0;
    position: absolute;
    @media (prefers-reduced-motion: reduce) { animation: none; }
  }
`;

export const HeaderTitle = styled.h3`
  align-items: center;
  color: ${FROST};
  display: flex;
  font-size: 1rem;
  gap: 0.5rem;
  letter-spacing: 0;
  margin: 0;
`;

export const HeaderStats = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const StatChip = styled.div`
  align-items: center;
  background: color-mix(in srgb, #000000 22%, transparent);
  border: 1px solid color-mix(in srgb, ${ICE_WING} 12%, transparent);
  border-radius: 12px;
  color: var(--text-secondary, #b8c7d8);
  display: flex;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.45rem 0.7rem;
`;

export const StatValue = styled.span`
  color: ${ICE_WING};
  font-weight: 800;
`;

export const StatLabel = styled.span`
  color: var(--text-muted, #8a96a8);
  font-size: 0.72rem;
`;

export const IconButton = styled.button`
  align-items: center;
  background: color-mix(in srgb, ${FROST} 5%, transparent);
  border: 1px solid color-mix(in srgb, ${WING_PURPLE} 18%, transparent);
  border-radius: 12px;
  color: var(--text-secondary, #b8c7d8);
  cursor: pointer;
  display: inline-flex;
  gap: 0.45rem;
  height: 44px;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.75rem;

  .spinning { animation: ${spin} 0.9s linear infinite; }
  &:hover { background: color-mix(in srgb, ${WING_PURPLE} 16%, transparent); color: ${WING_PURPLE}; }
  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: 3px; }
`;

export const SourceBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 18px 14px;
`;

export const SourceChip = styled.span<{ $variant: BadgeVariant }>`
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.35rem 0.65rem;
  ${({ $variant }) => variantCss($variant)}
`;

export const TabRow = styled.div`
  border-bottom: 1px solid color-mix(in srgb, ${FROST} 7%, transparent);
  display: flex;
  overflow-x: auto;
  padding: 0 10px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  align-items: center;
  background: transparent;
  border: 0;
  border-bottom: 2px solid ${({ $active }) => ($active ? ICE_WING : 'transparent')};
  color: ${({ $active }) => ($active ? FROST : 'var(--text-muted, #8a96a8)')};
  cursor: pointer;
  display: flex;
  gap: 0.35rem;
  min-height: 44px;
  padding: 0 0.8rem;
  white-space: nowrap;

  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: -2px; }
`;

export const ContentArea = styled.div`
  animation: ${fadeSlideUp} 0.25s ease both;
  @media (prefers-reduced-motion: reduce) { animation: none; }
  flex: 1;
  min-height: 260px;
  overflow-y: auto;
  padding: 12px;
`;

export const LoadingState = styled.div`
  color: var(--text-muted, #8a96a8);
  padding: 2rem;
  text-align: center;
`;

export const EmptyState = styled.div`
  align-items: center;
  color: var(--text-muted, #8a96a8);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;
`;

export const ErrorState = styled(EmptyState)`
  color: var(--warning, #e5c76b);
`;

export const GeoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

export const LiveRow = styled.button<{ $clickable?: boolean }>`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: inherit;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  display: grid;
  gap: 0.7rem;
  grid-template-columns: auto 1fr auto auto;
  min-height: 58px;
  padding: 0.65rem;
  text-align: left;

  &:hover { background: color-mix(in srgb, ${WING_PURPLE} 10%, transparent); }
  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: 2px; }
`;

export const LiveDotSmall = styled.div<{ $recent: boolean }>`
  background: ${({ $recent }) => ($recent ? SUCCESS_GREEN : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 20%, transparent)')};
  border-radius: 50%;
  box-shadow: ${({ $recent }) => ($recent ? `0 0 6px color-mix(in srgb, ${SUCCESS_GREEN} 50%, transparent)` : 'none')};
  height: 8px;
  width: 8px;
`;

export const LiveInfo = styled.div`min-width: 0;`;
export const LiveLocation = styled.div`color: ${FROST}; font-size: 0.88rem; font-weight: 800;`;
export const LiveRegion = styled.span`color: var(--text-muted, #8a96a8);`;
export const LivePages = styled.div`color: var(--text-muted, #8a96a8); font-size: 0.76rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
export const LiveMeta = styled.div`align-items: flex-end; display: flex; flex-direction: column; gap: 0.25rem;`;
export const LiveTime = styled.span`color: var(--text-muted, #8a96a8); font-size: 0.72rem;`;
export const MutedChevron = styled.span`color: var(--text-muted, #8a96a8); display: inline-flex;`;
export const SourceBadge = SourceChip;

export const GeoRow = styled.div`
  align-items: center;
  border-radius: 12px;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: auto 1fr auto;
  min-height: 44px;
  overflow: hidden;
  padding: 0.65rem;
  position: relative;

  &:hover { background: color-mix(in srgb, ${ICE_WING} 7%, transparent); }
`;

export const BarBg = styled.div<{ $pct: number }>`
  background: linear-gradient(90deg, color-mix(in srgb, ${WING_PURPLE} 16%, transparent), color-mix(in srgb, ${ICE_WING} 12%, transparent));
  inset: 0 auto 0 0;
  pointer-events: none;
  position: absolute;
  transform-origin: left;
  width: ${({ $pct }) => Math.min(100, Math.max(4, $pct))}%;
  z-index: 0;
`;

export const GeoFlag = styled.span`font-size: 1.15rem; position: relative; z-index: 1;`;
export const GeoName = styled.span`color: ${FROST}; font-weight: 800; min-width: 0; position: relative; z-index: 1;`;
export const CityCountry = styled.span`color: var(--text-muted, #8a96a8); display: block; font-size: 0.72rem; font-weight: 600;`;
export const GeoCount = styled.span`color: ${ICE_WING}; font-weight: 900; position: relative; z-index: 1;`;
export const PageRank = styled.span`color: var(--text-muted, #8a96a8); font-family: var(--font-mono, monospace); position: relative; z-index: 1;`;
export const PageViews = styled.span`align-items: center; color: ${GILDED}; display: flex; font-weight: 900; gap: 0.25rem; position: relative; z-index: 1;`;

export const TotalRow = styled.div`
  background: color-mix(in srgb, #000000 18%, transparent);
  border-radius: 10px;
  color: var(--text-secondary, #b8c7d8);
  margin-top: 0.5rem;
  padding: 0.75rem;
`;

export const RecentRow = styled.div`
  align-items: center;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  min-height: 54px;
  padding: 0.65rem;

  &:hover { background: color-mix(in srgb, ${FROST} 5%, transparent); }
`;

export const RecentInfo = styled.div`display: flex; flex-direction: column; gap: 0.2rem;`;
export const RecentName = styled.span`color: ${FROST}; font-weight: 800;`;
export const RecentMeta = styled.span`color: var(--text-muted, #8a96a8); font-size: 0.76rem;`;
export const RecentRight = styled.div`align-items: flex-end; display: flex; flex-direction: column; gap: 0.25rem;`;
export const RecentTime = styled.span`color: var(--text-muted, #8a96a8); font-size: 0.72rem;`;
