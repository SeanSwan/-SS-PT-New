import styled from "styled-components";

export const ModeRail = styled.div`
  max-width: 1880px;
  margin: 0 auto 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 5px;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--obsidian-black, #0a0a0f) 72%, transparent);
  @media (max-width: 560px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const ModeTab = styled.button<{ $active: boolean }>`
  min-height: 52px;
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid ${({ $active }) => $active ? "var(--ice-wing, #60c0f0)" : "transparent"};
  border-radius: 13px;
  background: ${({ $active }) => $active ? "linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080))" : "transparent"};
  color: var(--frost-white, #e0ecf4);
  cursor: pointer;
  font: 750 14px/1 "Sora", sans-serif;
  svg { color: ${({ $active }) => $active ? "var(--ice-wing, #60c0f0)" : "var(--text-secondary, #b8c8d8)"}; }
  small { color: var(--text-secondary, #b8c8d8); text-align: right; font: 600 10px/1.2 "Fira Code", monospace; }
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 4px;
    padding: 8px 4px;
    small { display: none; }
  }
`;

export const StyleExplorer = styled.section`
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(320px, 1.15fr);
  gap: 14px;
  @media (max-width: 840px) { grid-template-columns: 1fr; }
`;

export const StyleCatalog = styled.div`
  min-width: 0;
  label { position: relative; display: block; margin-bottom: 10px; }
  label > svg { position: absolute; left: 15px; top: 15px; color: var(--ice-wing, #60c0f0); pointer-events: none; }
  input {
    width: 100%; min-height: 48px; padding: 0 14px 0 44px;
    border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 32%, transparent);
    border-radius: 13px; background: var(--graphite, #1a1a24); color: var(--frost-white, #e0ecf4); font-size: 16px;
  }
  input:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;

export const StylePicker = styled.div`
  max-height: 430px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 2px 5px 4px 2px;
  @media (max-width: 460px) { grid-template-columns: 1fr; max-height: none; }
`;

export const StylePick = styled.button<{ $active: boolean }>`
  min-height: 70px; padding: 10px 12px; text-align: left; cursor: pointer;
  border: 1px solid ${({ $active }) => $active ? "var(--ice-wing, #60c0f0)" : "color-mix(in srgb, var(--frost-white, #e0ecf4) 14%, transparent)"};
  border-radius: 14px; background: ${({ $active }) => $active ? "var(--midnight-sapphire, #002060)" : "var(--carbon, #141419)"};
  color: var(--frost-white, #e0ecf4); font: 720 13px/1.3 "Sora", sans-serif;
  span { display: block; margin-bottom: 4px; color: var(--ice-wing, #60c0f0); font: 600 9px/1 "Fira Code", monospace; }
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;

export const StyleDetail = styled.article`
  position: relative; overflow: hidden; min-height: 310px; padding: clamp(18px, 3vw, 34px);
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 38%, transparent);
  border-radius: 24px; background: linear-gradient(145deg, var(--graphite, #1a1a24), var(--midnight-sapphire, #002060));
  box-shadow: 0 24px 60px color-mix(in srgb, var(--obsidian-black, #0a0a0f) 55%, transparent);
  h2 { position: relative; margin: 0; font: 800 clamp(26px, 4vw, 48px)/1 "Plus Jakarta Sans", sans-serif; letter-spacing: -0.04em; }
  > p { position: relative; max-width: 58ch; color: var(--text-secondary, #b8c8d8); font: 500 15px/1.6 "Plus Jakarta Sans", sans-serif; }
  dl { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 22px 0; }
  dl div { padding: 11px 12px; border-radius: 12px; background: color-mix(in srgb, var(--obsidian-black, #0a0a0f) 48%, transparent); }
  dt { color: var(--ice-wing, #60c0f0); font: 650 9px/1 "Fira Code", monospace; text-transform: uppercase; }
  dd { margin: 6px 0 0; font: 700 13px/1.35 "Sora", sans-serif; }
  @media (max-width: 430px) { dl { grid-template-columns: 1fr; } }
`;

export const LensGlyph = styled.div`
  position: absolute; width: 230px; height: 230px; right: -70px; top: -70px; border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 44%, transparent);
  box-shadow: inset 0 0 55px color-mix(in srgb, var(--wing-purple, #8b5cf6) 24%, transparent), 0 0 70px color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent);
  &::before, &::after { content: ""; position: absolute; inset: 28px; border: 1px solid color-mix(in srgb, var(--gilded-fern, #c6a84b) 38%, transparent); transform: rotate(45deg); }
  &::after { inset: 63px; border-color: var(--ice-wing, #60c0f0); border-radius: 50%; }
`;

export const StyleActions = styled.div`
  position: relative; display: flex; flex-wrap: wrap; gap: 9px;
  button { min-height: 48px; padding: 0 17px; border-radius: 13px; border: 1px solid var(--ice-wing, #60c0f0); background: var(--midnight-sapphire, #002060); color: var(--frost-white, #e0ecf4); cursor: pointer; font-weight: 800; }
  button:last-child { background: var(--graphite, #1a1a24); border-color: color-mix(in srgb, var(--frost-white, #e0ecf4) 28%, transparent); }
  button:disabled { opacity: 0.58; cursor: wait; }
  button:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;

export const CompareSelectors = styled.div`
  max-width: 1880px; margin: 0 auto 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
  label { color: var(--text-secondary, #b8c8d8); font: 650 11px/1.4 "Sora", sans-serif; }
  select { display: block; width: 100%; min-height: 48px; margin-top: 6px; padding: 0 12px; border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 35%, transparent); border-radius: 13px; background: var(--graphite, #1a1a24); color: var(--frost-white, #e0ecf4); font-size: 16px; }
  select:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;

export const CompareGrid = styled.section`
  max-width: 1880px; margin: 0 auto 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const ComparePanel = styled.article`
  min-height: 230px; padding: clamp(18px, 2.5vw, 28px); border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 30%, transparent); border-radius: 20px; background: linear-gradient(145deg, var(--carbon, #141419), var(--graphite, #1a1a24));
  > span { color: var(--gilded-fern, #c6a84b); font: 650 10px/1 "Fira Code", monospace; text-transform: uppercase; }
  h2 { margin: 10px 0 8px; font: 800 clamp(24px, 3vw, 38px)/1 "Plus Jakarta Sans", sans-serif; letter-spacing: -0.035em; }
  p { color: var(--text-secondary, #b8c8d8); line-height: 1.55; }
  ul { margin: 18px 0 0; padding: 0; display: grid; gap: 8px; list-style: none; }
  li { padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--frost-white, #e0ecf4) 12%, transparent); font: 650 12px/1.4 "Sora", sans-serif; }
`;

export const CombinedStageLabel = styled.div`
  max-width: 1880px; margin: 0 auto; padding: 12px clamp(16px, 2.4vw, 34px); background: var(--midnight-sapphire, #002060); color: var(--frost-white, #e0ecf4); font: 700 12px/1.4 "Sora", sans-serif;
  strong { color: var(--ice-wing, #60c0f0); }
`;
