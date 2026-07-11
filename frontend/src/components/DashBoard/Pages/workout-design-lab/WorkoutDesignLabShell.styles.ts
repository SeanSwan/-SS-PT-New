import styled from 'styled-components';

export const Lab = styled.main`
  min-height: 100%; background: var(--bg-base, #030712); color: var(--frost-white, #e0ecf4);
`;
export const LabHeader = styled.header`
  position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: minmax(260px, .7fr) minmax(0, 2.3fr);
  gap: 18px; padding: 14px clamp(16px, 2vw, 32px); background: color-mix(in srgb, var(--obsidian-black, #0a0a0f) 92%, transparent);
  backdrop-filter: blur(22px); border-bottom: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent);
  h1 { margin: 0; font: 700 clamp(20px, 2vw, 30px)/1 'Plus Jakarta Sans', sans-serif; }
  p { margin: 6px 0 0; color: var(--text-secondary, #b8c8d8); font-size: 13px; }
  @media (max-width: 900px) { position: relative; grid-template-columns: 1fr; }
`;
export const Picker = styled.nav`
  display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 4px;
`;
export const Pick = styled.button<{ $active: boolean }>`
  flex: 0 0 148px; min-height: 52px; padding: 8px 10px; text-align: left; color: var(--frost-white, #e0ecf4);
  border: 1px solid ${({ $active }) => $active ? 'var(--ice-wing, #60c0f0)' : 'color-mix(in srgb, var(--frost-white, #e0ecf4) 13%, transparent)'};
  border-radius: 12px; background: ${({ $active }) => $active ? 'var(--midnight-sapphire, #002060)' : 'var(--carbon, #141419)'};
  cursor: pointer; scroll-snap-align: start; font: 700 12px/1.2 'Sora', sans-serif;
  span { display: block; margin-bottom: 4px; color: var(--ice-wing, #60c0f0); font: 600 10px/1 'Fira Code', monospace; }
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;
export const Stage = styled.section`min-height: calc(100vh - 96px);`;
export const LiveReceipt = styled.div`
  position: fixed; right: 24px; bottom: 24px; z-index: 40; max-width: min(420px, calc(100vw - 32px)); padding: 12px 16px;
  border-radius: 999px; background: var(--graphite, #1a1a24); border: 1px solid var(--ice-wing, #60c0f0);
  box-shadow: 0 10px 32px color-mix(in srgb, var(--obsidian-black, #0a0a0f) 60%, transparent); font: 600 13px/1.4 'Sora', sans-serif;
`;
