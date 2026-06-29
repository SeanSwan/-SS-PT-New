import styled from 'styled-components';

export const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 32px);
  overflow: auto;
  overscroll-behavior: contain;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  backdrop-filter: blur(14px);
`;

export const LightboxFrame = styled.div`
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  width: min(96vw, 1280px);
  max-height: 92vh;
  padding: clamp(10px, 2vw, 18px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent);
  box-shadow: 0 24px 80px color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
`;

export const LightboxHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const LightboxActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export const LightboxOpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 2px;
  }
`;

export const FullImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 96px);
  width: auto;
  height: auto;
  object-fit: contain;
  justify-self: center;
  align-self: center;
  border-radius: 6px;
  background: var(--bg-base, #0A0A0F);
`;

export const CloseButton = styled.button`
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
