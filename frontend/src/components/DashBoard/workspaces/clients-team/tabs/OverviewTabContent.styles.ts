import styled, { css } from 'styled-components';
import { swanDataCardShell, swanMetricTile } from '../clientCardSystem';

export const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 0;
  min-width: 0;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 430px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding: 12px 0;
  }
`;

export const BentoCard = styled.div<{ $span?: number; $heroAccent?: string }>`
  grid-column: span ${({ $span }) => $span || 1};
  --swan-card-padding: 18px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;

  ${({ $heroAccent }) => $heroAccent && css`
    border-left: 3px solid ${$heroAccent};
  `}

  @media (max-width: 1024px) {
    grid-column: span ${({ $span }) => ($span && $span > 2 ? 2 : $span || 1)};
  }

  @media (max-width: 430px) {
    grid-column: span 1;
    --swan-card-padding: 14px;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`;

export const CardIcon = styled.div<{ $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

export const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  line-height: 1.35;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.2;
  overflow-wrap: anywhere;
`;

export const CardSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

export const HeroRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 96px), 1fr));
  gap: 8px;
  min-width: 0;
`;

export const HeroStat = styled.div`
  ${swanMetricTile}
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  min-width: 0;
`;

export const HeroStatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
`;

export const HeroStatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  overflow-wrap: anywhere;
`;
