import styled from 'styled-components';
import { motion } from 'framer-motion';

export const StudioPanel = styled(motion.section)`
  position: fixed;
  top: 76px;
  right: 12px;
  z-index: var(--z-dropdown, 1260);
  width: min(880px, calc(100vw - 24px));
  max-height: min(760px, calc(100vh - 92px));
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 34%, transparent);
  border-radius: 22px;
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 94%, transparent);
  color: var(--text-primary, #e0ecf4);
  box-shadow:
    0 28px 80px color-mix(in srgb, var(--obsidian-black, #0a0a0f) 78%, transparent),
    0 0 42px color-mix(in srgb, var(--wing-purple, #8b5cf6) 16%, transparent);
  backdrop-filter: blur(20px);

  @media (max-width: 640px) {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    max-height: min(88dvh, 760px);
    border-radius: 24px 24px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
`;

export const StudioHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent);

  h2 {
    margin: 0;
    font: 800 20px/1.1 'Plus Jakarta Sans', sans-serif;
    letter-spacing: -0.025em;
  }

  p {
    margin: 5px 0 0;
    color: var(--text-secondary, #b8c8d8);
    font: 500 13px/1.4 'Sora', sans-serif;
  }
`;

export const StudioTabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid color-mix(in srgb, var(--frost-white, #e0ecf4) 10%, transparent);
  &::-webkit-scrollbar { display: none; }
`;

export const StudioTab = styled.button<{ $active: boolean }>`
  min-width: 96px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--ice-wing, #60c0f0)'
      : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 18%, transparent)'};
  /* Adaptive surface (--bg-elevated flips per theme) so the label never becomes
     dark-on-dark on light themes. --carbon is a FIXED dark token (tokens.css:123,
     not in the themeUtils var-bridge), which is why it caused invisible tab labels
     on Arctic Dawn / light colorways — swapped to --bg-elevated. */
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, var(--ice-wing, #60c0f0)) 22%, var(--bg-elevated, #1a1a24))'
      : 'var(--bg-elevated, #1a1a24)'};
  color: ${({ $active }) =>
    $active
      ? 'var(--text-primary, #e0ecf4)'
      : 'var(--text-secondary, rgba(224, 236, 244, 0.82))'};
  cursor: pointer;
  font: 700 13px/1 'Sora', sans-serif;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  &:hover { color: var(--text-primary, #e0ecf4); }
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;

export const StudioBody = styled.div`
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(320px, 1.1fr);
  @media (max-width: 760px) { grid-template-columns: 1fr; overflow-y: auto; }
`;

export const Pane = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  scrollbar-color: var(--swan-lavender, #4070c0) transparent;

  h3 {
    margin: 0 0 6px;
    font: 800 15px/1.2 'Plus Jakarta Sans', sans-serif;
  }
  > p {
    margin: 0 0 14px;
    color: var(--text-secondary, #b8c8d8);
    font: 500 13px/1.45 'Sora', sans-serif;
  }
  @media (max-width: 760px) { overflow: visible; }
`;

export const QuickStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 45%, transparent);
  color: var(--ice-wing, #60c0f0);
  font: 700 12px/1.3 'Sora', sans-serif;
`;

export const StyleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  @media (max-width: 420px) { grid-template-columns: 1fr; }
`;

export const StyleCard = styled.article<{ $active: boolean }>`
  position: relative;
  min-width: 0;
  border-radius: 16px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--ice-wing, #60c0f0)'
      : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 16%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, var(--ice-wing, #60c0f0)) 16%, var(--bg-elevated, #1a1a24))'
      : 'var(--bg-elevated, #1a1a24)'};
  overflow: hidden;
`;

export const StyleSelect = styled.button`
  width: 100%;
  min-height: 116px;
  padding: 14px 44px 14px 14px;
  border: 0;
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  text-align: left;
  cursor: pointer;

  strong { display: block; font: 800 14px/1.2 'Plus Jakarta Sans', sans-serif; }
  span { display: block; margin-top: 7px; color: var(--text-secondary, #b8c8d8); font: 500 12px/1.4 'Sora', sans-serif; }
  em { display: block; margin-top: 9px; color: var(--gilded-fern, #c6a84b); font: 650 10px/1.2 'Fira Code', monospace; font-style: normal; }
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: -3px; }
`;

export const FavoriteButton = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ $active }) => $active ? 'var(--gilded-fern, #c6a84b)' : 'var(--text-secondary, #b8c8d8)'};
  cursor: pointer;
  &:focus-visible { outline: 3px solid var(--ice-wing, #60c0f0); }
`;

export const ChoiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`;

/* Scrollable color grid: the full colorway catalog (all 38) now shows here instead of
   a 12 cap, so the list needs its OWN scroll region. Fixes "I had more colors" (they
   were hidden behind the featured cap) + "it should scroll up and down". */
export const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
  scroll-padding-block: 8px;
  scrollbar-gutter: stable;
  scrollbar-color: var(--swan-lavender, #4070c0) transparent;

  @media (max-width: 420px) { grid-template-columns: 1fr; max-height: 300px; }
`;

/* Count line above the color grid ("Showing all N colorways") — adaptive text. */
export const ColorCount = styled.p`
  margin: 0 0 10px;
  color: var(--text-secondary, #b8c8d8);
  font: 600 12px/1.3 'Sora', sans-serif;
`;

export const ChoiceButton = styled.button<{ $active: boolean }>`
  min-height: 52px;
  padding: 10px 12px;
  border-radius: 13px;
  border: 1px solid ${({ $active }) => $active ? 'var(--ice-wing, #60c0f0)' : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 18%, transparent)'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, var(--ice-wing, #60c0f0)) 20%, var(--bg-elevated, #1a1a24))' : 'var(--bg-elevated, #1a1a24)'};
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
  font: 700 13px/1.25 'Sora', sans-serif;
  transition: background 0.18s ease, border-color 0.18s ease;
  &:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); outline-offset: 2px; }
`;

export const ColorChip = styled.span<{ $bg: string; $primary: string; $accent: string }>`
  display: inline-block;
  width: 28px;
  height: 28px;
  margin-right: 8px;
  border-radius: 50%;
  vertical-align: middle;
  background: ${({ $bg, $primary, $accent }) =>
    `conic-gradient(${$primary}, ${$accent}, ${$bg}, ${$primary})`};
  border: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 24%, transparent);
`;

export const PreviewColumn = styled.div`
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  border-left: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, transparent);
  background: color-mix(in srgb, var(--graphite, #1a1a24) 62%, transparent);
  @media (max-width: 760px) { overflow: visible; border-left: 0; border-top: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, transparent); }
`;

export const PreviewControls = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 10px;
  button {
    min-height: 44px;
    min-width: max-content;
    padding: 0 12px;
    border-radius: 11px;
    border: 1px solid color-mix(in srgb, var(--swan-lavender, #4070c0) 50%, transparent);
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #e0ecf4);
    cursor: pointer;
    font: 700 11px/1 'Sora', sans-serif;
  }
  button[aria-pressed='true'] { border-color: var(--ice-wing, #60c0f0); background: color-mix(in srgb, var(--accent-primary, var(--ice-wing, #60c0f0)) 22%, var(--bg-elevated, #1a1a24)); }
  button:focus-visible { outline: 3px solid var(--wing-purple, #8b5cf6); }
`;

export const PreviewStage = styled.div`
  min-height: 330px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent);
  overflow: hidden;
  background: var(--bg-base, #0a0a0f);
`;

export const StudioFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid color-mix(in srgb, var(--frost-white, #e0ecf4) 12%, transparent);
  background: var(--graphite, #1a1a24);
`;

export const SecondaryButton = styled.button`
  min-height: 48px;
  padding: 0 18px;
  border-radius: 13px;
  border: 1px solid var(--swan-lavender, #4070c0);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
  font: 800 13px/1 'Sora', sans-serif;
  &:focus-visible { outline: 3px solid var(--ice-wing, #60c0f0); outline-offset: 2px; }
`;

export const PrimaryButton = styled(SecondaryButton)`
  border-color: var(--midnight-sapphire, #002060);
  background: var(--midnight-sapphire, #002060);
  box-shadow: 0 0 22px color-mix(in srgb, var(--wing-purple, #8b5cf6) 48%, transparent);
  &:hover { box-shadow: 0 0 32px color-mix(in srgb, var(--wing-purple, #8b5cf6) 66%, transparent); }
`;
