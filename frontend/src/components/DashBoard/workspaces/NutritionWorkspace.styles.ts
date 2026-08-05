import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

const nutritionVars = css`
  --nutrition-panel: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  --nutrition-panel-deep: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  --nutrition-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  --nutrition-soft: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

const nutritionPanelCss = css`
  ${nutritionVars}
  border: 1px solid var(--nutrition-border);
  border-radius: 8px;
  background:
    linear-gradient(160deg, var(--nutrition-panel), var(--nutrition-panel-deep)),
    var(--bg-elevated, #141419);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent),
    0 16px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  backdrop-filter: blur(18px);
`;

const nutritionCardCss = css`
  ${nutritionVars}
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;

const nutritionControlCss = css`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--nutrition-border);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    transform: translateY(-1px);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const nutritionAccentButtonCss = css`
  ${nutritionControlCss}
  border-color: transparent;
  background: var(--button-primary-bg, #002060);
  /* --button-primary-text = getReadableAccentText(theme.colors.primary = Ice Wing),
     i.e. it resolves DARK on the light primary button. The fallback must match that,
     or a missing var would render light-on-light. (Matches visionAccentButtonCss.) */
  color: var(--button-primary-text, #030712);
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
`;

export const WorkspaceRoot = styled.div`
  ${nutritionPanelCss}
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: min(100%, 1680px);
  min-width: 0;
  margin: 0 auto;
  padding: 24px;
  container-type: inline-size;

  /* ≤768px the SegmentedTabBar fixes to the bottom of the viewport —
     reserve space so content and the review drawer never sit under it. */
  @media (max-width: 768px) {
    padding: 16px 16px calc(88px + env(safe-area-inset-bottom, 0px));
    gap: 16px;
  }
  @media (min-width: 2560px) { max-width: min(100%, 2120px); }
  @media (min-width: 3840px) { max-width: min(100%, 2480px); }
`;
export const Header = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: start;
    column-gap: 10px;
    row-gap: 10px;
    > div:nth-child(2) { min-width: 0; }
  }
`;

export const HeaderIcon = styled.div`
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)
  );
  color: var(--accent-secondary, #8B5CF6);
  @media (max-width: 640px) { width: 44px; height: 44px; }
`;

export const HeaderTitle = styled.h1`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  @media (max-width: 768px) { font-size: 18px; }
`;

export const HeaderSubtitle = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 14px;
  @media (max-width: 640px) { font-size: 12px; line-height: 1.35; }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-left: auto;
  @media (max-width: 640px) {
    grid-column: 1 / -1;
    width: 100%;
    margin-left: 0;
  }
`;

export const GentleModeButton = styled.button<{ $active?: boolean }>`
  ${nutritionControlCss}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.95rem;
  cursor: pointer;
  border-color: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 54%, transparent)' : 'var(--nutrition-border)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, var(--bg-elevated, #141419)), color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, var(--bg-base, #0A0A0F)))'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent)')};
  box-shadow: ${({ $active }) => ($active ? '0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent)' : 'none')};
`;

export const TabRow = styled.div`
  ${nutritionCardCss}
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
    border-radius: 3px;
  }
`;

export const TabBtn = styled(motion.button)<{ $active: boolean }>`
  ${({ $active }) => ($active ? nutritionAccentButtonCss : nutritionControlCss)}
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
`;

export const ContentArea = styled.div`
  ${nutritionCardCss}
  min-width: 0;
  min-height: 400px;
  overflow: hidden;
  padding: clamp(1rem, 1.5vw, 1.35rem);
`;
export const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

export const MacroHiddenPanel = styled.section`
  display: grid;
  place-items: center;
  gap: 0.75rem;
  min-height: 260px;
  padding: clamp(1.25rem, 2vw, 1.8rem);
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent), transparent 38%),
    color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
`;

export const MacroHiddenTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.05rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const MacroHiddenText = styled.p`
  max-width: 560px;
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  line-height: 1.55;
`;
