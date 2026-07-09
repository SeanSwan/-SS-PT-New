import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

const capturePanel = css`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent),
    0 18px 36px color-mix(in srgb, var(--bg-base, #0A0A0F) 48%, transparent);
`;

export const CaptureShell = styled.section`
  display: grid;
  gap: 14px;
`;

export const TodayRibbon = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const RibbonCard = styled.article`
  ${capturePanel}
  min-height: 96px;
  padding: 14px;
  border-radius: 16px;
`;

export const RibbonEyebrow = styled.div`
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--accent-luxury, #C6A84B) 86%, var(--text-primary, #E0ECF4));
  font: 800 0.7rem/1 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const RibbonValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(1.15rem, 2vw, 1.55rem)/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const RibbonLabel = styled.div`
  margin-top: 6px;
  color: var(--text-secondary, #94a3b8);
  font: 600 0.78rem/1.35 var(--font-ui, 'Sora', sans-serif);
`;

export const CaptureGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 14px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const CaptureRail = styled.div`
  ${capturePanel}
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const CaptureTile = styled(motion.button)<{ $active: boolean }>`
  min-height: 92px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 58%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary, #002060) 80%, var(--accent-secondary, #8B5CF6) 12%), color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent))'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  box-shadow: ${({ $active }) => ($active ? '0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)' : 'none')};

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const CaptureIcon = styled.span<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, var(--bg-base, #0A0A0F))'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent)')};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-secondary, #8B5CF6)')};
`;

export const CaptureCopy = styled.span`
  min-width: 0;
`;

export const TileTitle = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.9rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const TileMeta = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--text-secondary, #94a3b8);
  font: 600 0.76rem/1.35 var(--font-ui, 'Sora', sans-serif);
`;

export const TileBadge = styled.span<{ $active: boolean }>`
  min-width: 52px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 28%, transparent);
  color: ${({ $active }) => ($active ? 'var(--accent-luxury, #C6A84B)' : 'var(--text-secondary, #94a3b8)')};
  font: 900 0.68rem/1 var(--font-ui, 'Sora', sans-serif);
`;

export const SourceTruthRail = styled.aside`
  ${capturePanel}
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
`;

export const SourceTruthTitle = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 2px;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.95rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const SourcePill = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  color: var(--text-secondary, #94a3b8);
  font: 700 0.78rem/1.35 var(--font-ui, 'Sora', sans-serif);

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const DecisionRail = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 2px;
`;

export const DecisionStep = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 8px;
`;

export const DecisionDot = styled.span`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, var(--bg-base, #0A0A0F));
  color: var(--text-primary, #E0ECF4);
  font: 900 0.75rem/1 var(--font-ui, 'Sora', sans-serif);
`;

export const DecisionStepCopy = styled.span`
  min-width: 0;

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--text-primary, #E0ECF4);
    font: 900 0.78rem/1.2 var(--font-ui, 'Sora', sans-serif);
  }

  span {
    margin-top: 2px;
    color: var(--text-secondary, #94a3b8);
    font: 600 0.72rem/1.35 var(--font-ui, 'Sora', sans-serif);
  }
`;

export const DecisionConnector = styled.span`
  color: color-mix(in srgb, var(--accent-luxury, #C6A84B) 80%, var(--text-primary, #E0ECF4));
`;
