import styled, { css } from 'styled-components';

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    transition: none !important;
    transform: none !important;
  }
`;

export const HeroKicker = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 38%, transparent);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--surface-primary, #003080) 72%, transparent),
    color-mix(in srgb, var(--bg-base, #030712) 56%, transparent));
  color: var(--accent-gold, #C6A84B);
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: min(760px, 92vw);
  margin-top: 1.35rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    width: min(360px, 92vw);
  }
`;

export const HeroStat = styled.div`
  position: relative;
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: radial-gradient(circle at top left,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent),
      transparent 42%),
    color-mix(in srgb, var(--surface-primary, #003080) 38%, transparent);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--bg-base, #030712) 28%, transparent);
  overflow: hidden;
  transition: transform 0.22s ease, border-color 0.22s ease;
  ${reducedMotion}

  strong {
    display: block;
    color: var(--text-primary, #E0ECF4);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.25rem, 2.4vw, 1.75rem);
    line-height: 1;
  }

  span {
    display: block;
    margin-top: 8px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 52%, transparent);
  }
`;
