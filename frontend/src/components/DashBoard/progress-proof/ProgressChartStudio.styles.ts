import styled from 'styled-components';
import type { ProgressChartPulseTone } from './progressChartActions';

const TONE_BORDER: Record<ProgressChartPulseTone, string> = {
  building: 'var(--accent-primary, #60C0F0)',
  empty: 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent))',
  falling: 'var(--warning, #F59E0B)',
  record: 'var(--accent-gold, #C6A84B)',
  rising: 'var(--accent-primary, #60C0F0)',
  steady: 'var(--accent-secondary, #8B5CF6)',
};

const toneBorder = (tone: ProgressChartPulseTone) => TONE_BORDER[tone];

export const StudioBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: end center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 82%, transparent);
  backdrop-filter: blur(14px);
`;

export const StudioDialog = styled.section`
  width: min(100%, 34rem);
  max-height: min(90vh, 45rem);
  overflow: auto;
  border: 1px solid var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  border-radius: 8px;
  background:
    linear-gradient(145deg, var(--bg-elevated, #003080), var(--bg-surface, #1A1A24) 62%),
    var(--bg-surface, #1A1A24);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  @media (min-width: 760px) {
    place-self: center;
  }
`;

export const StudioHeader = styled.header`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
`;

export const StudioKicker = styled.p`
  margin: 0 0 0.25rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const StudioTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 2vw, 1.25rem);
  letter-spacing: 0;
  line-height: 1.2;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const StudioBody = styled.div`
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
`;

export const PreviewCard = styled.article<{ $tone: ProgressChartPulseTone }>`
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid ${({ $tone }) => toneBorder($tone)};
  border-radius: 8px;
  background:
    radial-gradient(
      circle at 14% 0%,
      color-mix(in srgb, ${({ $tone }) => toneBorder($tone)} 22%, transparent),
      transparent 32%
    ),
    linear-gradient(145deg, var(--bg-elevated, #003080), var(--bg-surface, #1A1A24));
`;

export const PreviewKicker = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const PreviewTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  line-height: 1.25;
`;

export const PreviewDetail = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-size: 0.78rem;
  line-height: 1.55;
`;

export const MetricGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricItem = styled.div`
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 34%, transparent);

  dt {
    color: var(--text-muted, rgba(224, 236, 244, 0.6));
    font-size: 0.62rem;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Fira Code', monospace;
    font-size: 0.78rem;
  }
`;

export const ProofLine = styled.p`
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.76rem;
  line-height: 1.45;
`;

export const CaptionBox = styled.textarea`
  width: 100%;
  min-height: 8.5rem;
  resize: vertical;
  padding: 0.8rem;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  border-radius: 8px;
  background: var(--bg-base, #030712);
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
`;

export const StudioActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`;

export const StudioButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  border: 1px solid var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent));
  border-radius: 8px;
  background: var(--accent-primary-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const StudioStatus = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-size: 0.7rem;
  line-height: 1.4;
`;
