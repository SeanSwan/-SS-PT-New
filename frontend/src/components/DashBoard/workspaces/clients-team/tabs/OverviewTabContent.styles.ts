import styled from 'styled-components';

export const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 0;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const BentoCard = styled.div<{ $span?: number; $heroAccent?: string }>`
  grid-column: span ${({ $span }) => $span || 1};
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 200ms ease, box-shadow 200ms ease;

  ${({ $heroAccent }) => $heroAccent && `
    border-left: 3px solid ${$heroAccent};
  `}

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  @media (max-width: 1024px) {
    grid-column: span ${({ $span }) => ($span && $span > 2 ? 2 : $span || 1)};
  }

  @media (max-width: 430px) {
    grid-column: span 1;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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
`;

export const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const CardSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.5;
`;

export const HeroRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
`;

export const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const HeroStatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const HeroStatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;
