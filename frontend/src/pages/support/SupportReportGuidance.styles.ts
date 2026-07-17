/**
 * FILE: SupportReportGuidance.styles.ts
 * PURPOSE: Calm, low-motion Swan Coach guidance and structured preview chrome.
 */
import styled from 'styled-components';

export const Guide = styled.aside`
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid var(--guide-border, rgba(198, 168, 75, 0.34));
  border-radius: 16px;
  background: var(--guide-surface, rgba(20, 20, 25, 0.62));
`;

export const GuideHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 640px) { flex-direction: column; }
`;

export const GuideTitle = styled.h3`
  margin: 0;
  color: var(--frost-white, #E0ECF4);
  font: 700 18px/1.35 'Plus Jakarta Sans', sans-serif;
`;

export const GuideCopy = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, #B8C7D9);
  font: 400 14px/1.55 'Plus Jakarta Sans', sans-serif;
`;

export const ProgressText = styled.p`
  margin: 0;
  color: var(--gilded-fern, #C6A84B);
  font: 700 12px/1.4 'Sora', sans-serif;
  white-space: nowrap;
`;

export const PromptButton = styled.button`
  min-height: 44px;
  width: fit-content;
  padding: 10px 16px;
  border: 1px solid var(--ice-wing, #60C0F0);
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  background: var(--midnight-sapphire, #002060);
  box-shadow: 0 0 22px var(--button-purple-glow, rgba(139, 92, 246, 0.2));
  cursor: pointer;
  font: 700 14px/1.4 'Plus Jakarta Sans', sans-serif;

  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Preview = styled.details`
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  padding-top: 14px;

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--ice-wing, #60C0F0);
    cursor: pointer;
    font: 700 14px 'Plus Jakarta Sans', sans-serif;
  }

  summary:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const PreviewText = styled.pre`
  max-height: 320px;
  margin: 8px 0 0;
  padding: 16px;
  overflow: auto;
  border-radius: 12px;
  color: var(--text-secondary, #B8C7D9);
  background: var(--obsidian-black, #0A0A0F);
  font: 400 12px/1.6 'Fira Code', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
