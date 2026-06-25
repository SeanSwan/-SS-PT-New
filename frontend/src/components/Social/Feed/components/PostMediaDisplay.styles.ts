import styled from 'styled-components';

export const ImageMediaButton = styled.button`
  position: relative;
  display: block;
  width: 100%;
  min-height: clamp(240px, 40vw, 360px);
  padding: 0;
  border: 0;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  background: var(--bg-base, #0A0A0F);
  color: inherit;
  cursor: zoom-in;

  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60C0F0);
    outline-offset: -4px;
  }
`;

export const ImageMedia = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  min-height: clamp(240px, 40vw, 360px);
  object-fit: cover;
  background: var(--bg-base, #0A0A0F);
`;
