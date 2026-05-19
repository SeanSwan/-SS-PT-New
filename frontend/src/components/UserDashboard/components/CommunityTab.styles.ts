/**
 * Styled-components for the active UserDashboard V3 community tab.
 */

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import styled, { css } from 'styled-components';
import { visionCardCss, visionPanelCss } from './UserDashboardSectionChrome.styles';

export const CommunityContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const SectionLabel = styled.p`
  margin: 0 0 0.125rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const DiscoveryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 320px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const discoveryCardCss = css<{ $dim?: boolean }>`
  ${visionCardCss}
  position: relative;
  min-height: 108px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.125rem 1rem 1rem;
  border-color: ${({ $dim }) => ($dim ? 'rgba(255, 255, 255, 0.04)' : 'var(--vision-border)')};
  color: var(--text-primary, #E0ECF4);
  font-family: inherit;
  text-align: left;
  opacity: ${({ $dim }) => ($dim ? 0.55 : 1)};
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  backdrop-filter: blur(18px);

  &:hover:not([aria-disabled='true']) {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 375px) {
    min-height: 96px;
    padding: 1rem 0.875rem 0.875rem;
  }
`;

export const DiscoveryCard = styled(motion.button)<{ $dim?: boolean }>`
  ${discoveryCardCss}
  cursor: ${({ $dim }) => ($dim ? 'default' : 'pointer')};
`;

export const DiscoveryStaticCard = styled(motion.div)<{ $dim?: boolean }>`
  ${discoveryCardCss}
`;

export const CardIconWrap = styled.div<{ $colorRgb?: string }>`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid ${({ $colorRgb }) => ($colorRgb ? `rgba(${$colorRgb}, 0.18)` : 'rgba(96, 192, 240, 0.15)')};
  border-radius: 8px;
  background: ${({ $colorRgb }) => ($colorRgb ? `rgba(${$colorRgb}, 0.08)` : 'rgba(96, 192, 240, 0.08)')};
  color: ${({ $colorRgb }) => ($colorRgb ? `rgb(${$colorRgb})` : 'var(--accent-primary, #60C0F0)')};
`;

export const CardLabel = styled.span`
  flex: 1;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
`;

export const CardArrow = styled(ChevronRight)`
  flex-shrink: 0;
  margin-top: auto;
  color: var(--text-muted, #64748b);
`;

export const SoonPill = styled.span`
  margin-top: auto;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted, #64748b);
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const EventsBanner = styled(motion.div)`
  ${visionPanelCss}
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  border-color: rgba(198, 168, 75, 0.18);
  box-shadow: inset 0 1px 0 rgba(198, 168, 75, 0.06);

  @media (max-width: 375px) {
    gap: 0.75rem;
    padding: 0.875rem 1rem;
  }
`;

export const EventsIcon = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(198, 168, 75, 0.2);
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.08);
  color: var(--accent-gold, #C6A84B);
`;

export const EventsText = styled.div`
  min-width: 0;
  flex: 1;
`;

export const EventsTitle = styled.p`
  margin: 0 0 0.125rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
`;

export const EventsSub = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
`;

export const EventsBadge = styled.span`
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  border: 1px solid rgba(198, 168, 75, 0.25);
  border-radius: 999px;
  background: rgba(198, 168, 75, 0.1);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
`;
