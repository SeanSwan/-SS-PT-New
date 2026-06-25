/**
 * STYLES: ProgressChartCube
 * PURPOSE: GPU-safe 3D chart-carousel launcher for progress dashboards.
 */
import styled, { keyframes } from 'styled-components';
import { swanDataCardShell, swanMetricTile, swanPill } from '../workspaces/clients-team/clientCardSystem';

const cubeSpin = keyframes`
  0%, 20% { transform: rotateX(-7deg) rotateY(0deg); }
  25%, 45% { transform: rotateX(-7deg) rotateY(-90deg); }
  50%, 70% { transform: rotateX(-7deg) rotateY(-180deg); }
  75%, 95% { transform: rotateX(-7deg) rotateY(-270deg); }
  100% { transform: rotateX(-7deg) rotateY(-360deg); }
`;

const faceTransform = (face: number) => {
  if (face === 1) return 'rotateY(90deg) translateZ(120px)';
  if (face === 2) return 'rotateY(180deg) translateZ(120px)';
  if (face === 3) return 'rotateY(-90deg) translateZ(120px)';
  return 'translateZ(120px)';
};

export const CubeBoard = styled.section`
  --swan-card-padding: 1rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(230px, 0.72fr);
  gap: 1rem;
  align-items: center;
  margin: 0 0 1rem;
  overflow: hidden;

  &:hover {
    transform: none;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const CopyColumn = styled.div`
  min-width: 0;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h4`
  margin: 0.25rem 0 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.08rem;
  overflow-wrap: anywhere;
`;

export const Subcopy = styled.p`
  max-width: 54rem;
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.55;
`;

export const MetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.85rem;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricTile = styled.div`
  ${swanMetricTile}
  min-height: 70px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  padding: 0.65rem 0.75rem;
`;

export const MetricValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 900;
`;

export const MetricLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const CubeStage = styled.div`
  display: grid;
  place-items: center;
  min-height: 286px;
  perspective: 900px;
`;

export const CubeButton = styled.button`
  width: min(100%, 260px);
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  perspective: inherit;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 8px;
    border-radius: 12px;
  }
`;

export const Cube = styled.div`
  position: relative;
  width: 240px;
  height: 240px;
  transform-style: preserve-3d;
  animation: ${cubeSpin} 60s cubic-bezier(0.7, 0, 0.3, 1) infinite;

  ${CubeButton}:hover &,
  ${CubeButton}:focus-visible & {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: rotateX(-7deg) rotateY(-28deg);
  }
`;

export const CubeFace = styled.div<{ $face: number }>`
  position: absolute;
  inset: 0;
  display: grid;
  align-content: space-between;
  gap: 0.7rem;
  padding: 1rem;
  color: var(--text-primary, #E0ECF4);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, var(--accent-primary, #60C0F0)), var(--bg-surface, #1A1A24));
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent));
  border-radius: 14px;
  box-shadow: 0 24px 50px color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
  backface-visibility: hidden;
  transform: ${({ $face }) => faceTransform($face)};
`;

export const FaceTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const FaceTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.96rem;
  text-align: left;
  overflow-wrap: anywhere;
`;

export const FaceStat = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
`;

export const FaceMeta = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  text-align: left;
`;

export const DetailPill = styled.span`
  ${swanPill}
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 82%, transparent);
`;

export const ModalPanel = styled.div`
  width: min(100%, 780px);
  max-height: min(86vh, 720px);
  overflow: auto;
  padding: 1rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent));
  border-radius: 14px;
  box-shadow: 0 28px 80px color-mix(in srgb, var(--bg-base, #030712) 86%, transparent);
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent));
  border-radius: 8px;
  cursor: pointer;
`;

export const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;
