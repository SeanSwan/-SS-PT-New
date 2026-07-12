import styled from "styled-components";

export const Lab = styled.main`
  min-height: 100%;
  overflow-x: clip;
  background: var(--bg-base, #030712);
  color: var(--frost-white, #e0ecf4);
`;
export const LabHeader = styled.header`
  position: relative;
  z-index: 30;
  padding: clamp(16px, 2.4vw, 34px);
  background: linear-gradient(
    145deg,
    var(--obsidian-black, #0a0a0f),
    var(--midnight-sapphire, #002060)
  );
  border-bottom: 1px solid
    color-mix(in srgb, var(--ice-wing, #60c0f0) 24%, transparent);
`;
export const HeaderTop = styled.div`
  max-width: 1880px;
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: end;
  h1 {
    margin: 0;
    max-width: 18ch;
    font:
      800 clamp(30px, 4vw, 68px)/0.96 "Plus Jakarta Sans",
      sans-serif;
    letter-spacing: -0.045em;
  }
  p {
    margin: 10px 0 0;
    max-width: 70ch;
    color: var(--text-secondary, #b8c8d8);
    font:
      500 16px/1.55 "Plus Jakarta Sans",
      sans-serif;
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
export const SafetyCard = styled.aside`
  padding: 14px 16px;
  border: 1px solid
    color-mix(in srgb, var(--gilded-fern, #c6a84b) 48%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--graphite, #1a1a24) 86%, transparent);
  strong {
    color: var(--gilded-fern, #c6a84b);
  }
  p {
    margin: 6px 0 0;
    font-size: 13px;
  }
`;
export const Toolbar = styled.div`
  max-width: 1880px;
  margin: 0 auto 12px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 10px;
label {
    position: relative;
    display: block;
  }
  label > svg {
    position: absolute;
    left: 15px;
    top: 15px;
    z-index: 1;
    color: var(--ice-wing, #60c0f0);
    pointer-events: none;
  }
  input {
    min-height: 48px;
    width: 100%;
    border: 1px solid
      color-mix(in srgb, var(--ice-wing, #60c0f0) 34%, transparent);
    border-radius: 13px;
    padding: 0 15px 0 44px;
    background: var(--graphite, #1a1a24);
    color: var(--frost-white, #e0ecf4);
    font-size: 16px;
  }
  input:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
  div {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  button {
    min-width: 48px;
    min-height: 48px;
    border: 1px solid
      color-mix(in srgb, var(--ice-wing, #60c0f0) 40%, transparent);
    border-radius: 13px;
    background: var(--carbon, #141419);
    color: var(--frost-white, #e0ecf4);
    cursor: pointer;
    font-weight: 700;
    padding: 0 14px;
  }
  button:focus-visible {
    outline: 3px solid var(--ice-wing, #60c0f0);
    outline-offset: 2px;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;
export const Picker = styled.div`
  max-width: 1880px;
  margin: 0 auto;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 3px 2px 8px;
`;
export const Pick = styled.button<{ $active: boolean }>`
  flex: 0 0 min(240px, 72vw);
  min-height: 58px;
  padding: 9px 12px;
  text-align: left;
  cursor: pointer;
  scroll-snap-align: start;
  border: 1px solid
    ${({ $active }) => ($active ? "var(--ice-wing, #60c0f0)" : "color-mix(in srgb, var(--frost-white, #e0ecf4) 16%, transparent)")};
  border-radius: 14px;
  background: ${({ $active }) => ($active ? "var(--midnight-sapphire, #002060)" : "var(--carbon, #141419)")};
  color: var(--frost-white, #e0ecf4);
  font:
    700 13px/1.3 "Sora",
    sans-serif;
  span {
    display: block;
    margin-bottom: 4px;
    color: var(--ice-wing, #60c0f0);
    font:
      650 10px/1 "Fira Code",
      monospace;
  }
  em {
    margin-left: 6px;
    color: var(--gilded-fern, #c6a84b);
    font-style: normal;
  }
  &:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
`;
export const Stage = styled.section`
  min-height: 720px;
`;
export const LiveReceipt = styled.div`
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 90;
  max-width: min(520px, calc(100vw - 36px));
  padding: 13px 16px;
  border-radius: 16px;
  background: var(--graphite, #1a1a24);
  border: 1px solid var(--ice-wing, #60c0f0);
  box-shadow: 0 12px 36px
    color-mix(in srgb, var(--obsidian-black, #0a0a0f) 65%, transparent);
  font:
    650 13px/1.45 "Sora",
    sans-serif;
  @media (max-width: 480px) {
    position: relative;
    right: auto;
    bottom: auto;
    margin: 12px 16px 18px;
  }
`;
