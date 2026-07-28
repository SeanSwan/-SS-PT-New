import styled, { css } from 'styled-components';
import type { BootcampCommandDeckModel } from './BootcampCommandDeck.logic';

type ReadinessTone = BootcampCommandDeckModel['readinessTone'];

const toneStyles = {
  ready: css`
    --command-tone: var(--accent-gold, #C6A84B);
    --command-glow: color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  `,
  steady: css`
    --command-tone: var(--accent-primary, #60C0F0);
    --command-glow: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  `,
  warning: css`
    --command-tone: var(--accent-secondary, #8B5CF6);
    --command-glow: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  `,
  danger: css`
    --command-tone: var(--danger, #C92A54);
    --command-glow: color-mix(in srgb, var(--danger, #C92A54) 18%, transparent);
  `,
};

export const CommandDeckShell = styled.section<{ $tone: ReadinessTone }>`
  ${({ $tone }) => toneStyles[$tone]}
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--command-tone) 36%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 86%, transparent), color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)),
    radial-gradient(circle at top right, var(--command-glow), transparent 42%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) inset,
    0 18px 44px color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);

  @media (max-width: 430px) {
    padding: 12px;
    gap: 12px;
  }

  @media (min-width: 2200px) {
    padding: 20px;
    gap: 18px;
  }
`;

export const CommandDeckHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(220px, 1.4fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandDeckKicker = styled.span`
  display: block;
  margin-bottom: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;

  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;

export const CommandScoreLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

export const CommandScore = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: clamp(34px, 3vw, 56px);
  line-height: 0.95;
  letter-spacing: 0;
`;

export const ReadinessPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--command-tone) 42%, transparent);
  color: var(--command-tone);
  background: color-mix(in srgb, var(--command-tone) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;

export const CommandMeter = styled.div`
  width: 100%;
  height: 8px;
  overflow: hidden;
  margin-top: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
`;

export const CommandMeterFill = styled.div<{ $score: number }>`
  width: ${({ $score }) => `${$score}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--command-tone));
  transition: width 220ms cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const NextAction = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  line-height: 1.45;

  strong {
    color: var(--command-tone);
  }
`;

export const MetricRail = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: var(--border-soft, rgba(96, 192, 240, 0.16));

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricSegment = styled.div`
  min-width: 0;
  padding: 10px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);

  @media (min-width: 2200px) {
    padding: 14px;
  }
`;

export const MetricLabel = styled.span`
  display: block;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const MetricValue = styled.strong`
  display: block;
  margin-top: 4px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  line-height: 1.1;
  overflow-wrap: anywhere;

  @media (min-width: 2200px) {
    font-size: 22px;
  }
`;

export const MetricDetail = styled.span`
  display: block;
  margin-top: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 12px;
  line-height: 1.35;
`;

export const AlertStrip = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const AlertChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 9%, transparent);
  font-size: 12px;
  font-weight: 700;
`;

export const RepairQueue = styled.div`
  display: grid;
  gap: 8px;
`;

export const RepairQueueTitle = styled.span`
  color: var(--command-tone);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const RepairQueueList = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const RepairQueueItem = styled.li`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--command-tone) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--command-tone) 9%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  padding: 6px 10px;
`;
