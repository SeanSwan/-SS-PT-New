import styled from 'styled-components';

export const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 32px);
  overflow: hidden;
  isolation: isolate;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  backdrop-filter: blur(14px);

  &::before,
  &::after {
    content: '';
    position: absolute;
    pointer-events: none;
  }

  &::before {
    inset: -64px;
    z-index: 0;
    background-image: var(--post-lightbox-backdrop-image);
    background-position: center;
    background-size: cover;
    filter: blur(32px) saturate(1.22) brightness(0.58);
    opacity: 0.72;
    transform: scale(1.04);
  }

  &::after {
    inset: 0;
    z-index: 1;
    background:
      radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), transparent 34rem),
      linear-gradient(180deg,
        color-mix(in srgb, var(--bg-base, #0A0A0F) 38%, transparent),
        color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent));
  }

  > * {
    position: relative;
    z-index: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      filter: blur(24px) saturate(1.08) brightness(0.58);
      transform: none;
    }
  }
`;

export const LightboxFrame = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: min(96vw, 1280px);
  max-height: 92vh;
  padding: clamp(10px, 2vw, 18px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent);
  box-shadow: 0 24px 80px color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
`;

export const FullImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 64px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  background: var(--bg-base, #0A0A0F);
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 2px;
  }
`;
