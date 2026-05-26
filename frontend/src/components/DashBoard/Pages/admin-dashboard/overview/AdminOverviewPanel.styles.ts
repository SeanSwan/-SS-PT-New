import styled, { css, keyframes } from 'styled-components';

const atmosphericPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const bentoItemAnimation = css`
  animation: ${fadeInUp} 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  &:nth-child(1)  { animation-delay: 0ms; }
  &:nth-child(2)  { animation-delay: 50ms; }
  &:nth-child(3)  { animation-delay: 100ms; }
  &:nth-child(4)  { animation-delay: 150ms; }
  &:nth-child(5)  { animation-delay: 200ms; }
  &:nth-child(6)  { animation-delay: 250ms; }
  &:nth-child(7)  { animation-delay: 300ms; }
  &:nth-child(8)  { animation-delay: 350ms; }
  &:nth-child(9)  { animation-delay: 400ms; }
  &:nth-child(10) { animation-delay: 450ms; }
  &:nth-child(11) { animation-delay: 500ms; }
  &:nth-child(n+12) { animation-delay: 550ms; }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

export const BentoWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    top: -20vh;
    left: 50%;
    transform: translateX(-50%);
    width: 80vw;
    height: 60vh;
    background: radial-gradient(
      circle at 50% 50%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: -1;
    animation: ${atmosphericPulse} 10s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before { animation: none; }
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const BentoFull = styled.div`
  grid-column: 1 / -1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  ${bentoItemAnimation}
`;

export const BentoHalf = styled.div`
  grid-column: span 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  ${bentoItemAnimation}

  @media (min-width: 1280px) {
    grid-column: span 3;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

export const BentoThird = styled.div`
  grid-column: span 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  ${bentoItemAnimation}

  @media (min-width: 1280px) {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    grid-column: 1 / -1;
  }
`;

export const TelemetryDetails = styled.details`
  grid-column: 1 / -1;
  margin-top: 8px;
  ${bentoItemAnimation}

  &[open] > summary {
    margin-bottom: 20px;
  }

  & > summary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: 'Sora', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent-secondary, #8B5CF6);
    cursor: pointer;
    padding: 12px 24px;
    min-height: 44px;
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
    border-radius: 44px;
    transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
    list-style: none;
    user-select: none;

    &::-webkit-details-marker { display: none; }
    &::marker { display: none; }

    &:hover {
      background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
      border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--accent-secondary, #8B5CF6);
      outline-offset: 4px;
    }
  }
`;

export const TelemetryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (min-width: 1280px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const ControlsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 90%, var(--accent-secondary, #8B5CF6) 10%);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  box-shadow: var(--shadow-elevation, 0 4px 24px rgba(0, 0, 0, 0.2));

  @media (max-width: 430px) {
    padding: 12px 16px;
  }
`;

export const ControlsInner = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

export const CosmicSelect = styled.select`
  appearance: none;
  background: var(--bg-surface, #1A1A24) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2360C0F0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  padding: 10px 40px 10px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover, &:focus {
    background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }

  option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
    padding: 12px;
  }
`;

export const StatusText = styled.span`
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.875rem;
`;

export const ErrorText = styled.div`
  display: inline-flex;
  align-items: center;
  color: var(--accent-gold, #E5C76B);
  font-family: 'Fira Code', monospace;
  font-size: 0.825rem;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
  padding: 6px 12px;
  border-radius: 0 6px 6px 0;
  border-left: 3px solid var(--accent-gold, #C6A84B);
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--accent-gold, #C6A84B) 2%, transparent);
`;
