import styled, { keyframes } from 'styled-components';

const cardEntrance = keyframes`
  0% { opacity: 0; transform: translateY(16px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const shimmer = keyframes`
  0% { opacity: 0.4; }
  100% { opacity: 0.8; }
`;

export const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const InvalidClientAlert = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: var(--bg-surface, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.5;
`;

export const BentoCardWrapper = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  min-height: 160px;
  border-radius: 12px;
  background: var(--bg-surface, #141419);
  border: 1.5px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 150ms ease;
  animation: ${cardEntrance} 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

  &:nth-child(1) { animation-delay: 0ms; }
  &:nth-child(2) { animation-delay: 60ms; }
  &:nth-child(3) { animation-delay: 120ms; }
  &:nth-child(4) { animation-delay: 180ms; }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent),
                inset 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:active { transform: translateY(0); }
`;

export const CardIconCircle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const CardTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.3;
`;

export const CardDescription = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, #4070C0);
`;

export const ExpandedView = styled.div`
  animation: ${cardEntrance} 300ms cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const StickyBackBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 0 -16px;
  background: var(--bg-base, #0A0A0F);
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  backdrop-filter: blur(12px);

  @media (max-width: 768px) {
    margin: 0 -8px;
    padding: 10px 12px;
  }
`;

export const BackButton = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  transition: background 150ms ease, border-color 150ms ease;
  flex-shrink: 0;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ExpandedTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ComponentWrapper = styled.div`
  border-radius: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex: 1;
  min-height: 0;
`;

export const ShimmerLoader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;

  & > div {
    height: 20px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent-primary, #50A0F0) 10%, var(--bg-surface, #141419));
    animation: ${shimmer} 1.5s ease-in-out infinite alternate;
  }

  & > div:nth-child(1) { width: 70%; }
  & > div:nth-child(2) { width: 90%; }
  & > div:nth-child(3) { width: 55%; }
`;
