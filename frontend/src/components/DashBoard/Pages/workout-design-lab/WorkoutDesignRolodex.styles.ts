import styled from "styled-components";

export const RolodexBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 2000);
  display: grid;
  justify-items: end;
  background: color-mix(
    in srgb,
    var(--obsidian-black, #0a0a0f) 78%,
    transparent
  );
`;
export const RolodexDrawer = styled.aside`
  width: min(760px, 100%);
  height: 100%;
  overflow-y: auto;
  padding: clamp(16px, 3vw, 28px);
  background: var(--graphite, #1a1a24);
  border-left: 1px solid var(--ice-wing, #60c0f0);
  color: var(--frost-white, #e0ecf4);
`;
export const RolodexHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
  margin-bottom: 18px;
  h2 {
    margin: 0 0 6px;
    font:
      750 clamp(24px, 3vw, 38px)/1.1 "Plus Jakarta Sans",
      sans-serif;
  }
  p {
    margin: 0;
    color: var(--text-secondary, #b8c8d8);
    font-size: 15px;
    line-height: 1.5;
  }
`;
export const CloseButton = styled.button`
  flex: 0 0 auto;
  min-width: 48px;
  min-height: 48px;
  border: 1px solid var(--ice-wing, #60c0f0);
  border-radius: 13px;
  background: var(--carbon, #141419);
  color: var(--frost-white, #e0ecf4);
  cursor: pointer;
  &:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
`;
