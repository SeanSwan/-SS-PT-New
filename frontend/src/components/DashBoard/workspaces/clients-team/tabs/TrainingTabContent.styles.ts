import styled from 'styled-components';
import { swanClientActionButton, swanDataCardShell } from '../clientCardSystem';

/**
 * Phase 13.2 scroll-ownership fix:
 * The embedded route owns scroll at the page level. The shell stays visible and
 * does not clip expanded workout sessions, notes, or edit controls.
 *
 * Client Command Center IA (2026-07-04): the rail carries THREE workflow modes
 * (Today / Plan / History & Inputs); lanes within a mode render as SectionChip
 * pills above the panel. Seven-section deep links stay intact underneath.
 */
export const LayoutWrapper = styled.div`
  --swan-card-padding: 0;
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  display: flex;
  min-height: 400px;
  min-width: 0;
  max-width: 100%;
  gap: 0;
  overflow: visible;

  &:hover {
    transform: none;
  }

  @media (max-width: 767px) {
    flex-direction: column;
    min-height: 360px;
  }

  @media (min-width: 2560px) {
    min-height: 480px;
  }

  @media (min-width: 3840px) {
    min-height: 540px;
  }
`;

export const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  width: 240px;
  min-width: 0;
  flex-shrink: 0;
  background: var(--bg-elevated, #1A1A24);
  border-right: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (min-width: 768px) and (max-width: 1023px) {
    width: 72px;
    align-items: center;
    padding: 8px 4px;
  }

  @media (min-width: 2560px) {
    width: 280px;
    gap: 8px;
    padding: 12px;
  }

  @media (min-width: 3840px) {
    width: 320px;
    padding: 14px;
  }

  @media (max-width: 767px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    max-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
    padding: 8px;
    gap: 6px;
    overflow: visible;
  }
`;

export const ModeCopy = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-align: left;
`;

export const ModeSublabel = styled.small`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  overflow-wrap: anywhere;

  @media (max-width: 767px) {
    display: none;
  }

  @media (min-width: 3840px) {
    font-size: 12px;
  }
`;

export const SidebarItem = styled.button<{ $active: boolean }>`
  --swan-action-border: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent)'
      : 'transparent'};
  --swan-action-bg: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--surface-accent, #003080) 76%, transparent)'
      : 'transparent'};
  --swan-action-fg: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)'};
  ${swanClientActionButton}

  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 56px;
  padding: 10px 14px;
  justify-content: flex-start;
  align-items: center;
  text-align: left;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  position: relative;
  overflow-wrap: anywhere;
  text-shadow: ${({ $active }) =>
    $active
      ? '0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)'
      : 'none'};

  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--accent-secondary, #8B5CF6);
    }
  `}

  &:hover {
    --swan-action-bg: ${({ $active }) =>
      $active
        ? 'color-mix(in srgb, var(--surface-accent, #003080) 82%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }

  svg {
    flex: 0 0 auto;
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    justify-content: center;
    padding: 10px;
    width: 56px;
    min-height: 48px;

    ${ModeCopy} {
      display: none;
    }

    &::before {
      top: 6px;
      bottom: 6px;
    }
  }

  @media (min-width: 2560px) {
    padding: 12px 16px;
    font-size: 14px;
  }

  @media (min-width: 3840px) {
    padding: 14px 18px;
    font-size: 15px;
  }

  @media (max-width: 767px) {
    width: 100%;
    min-height: 48px;
    padding: 9px 8px;
    gap: 6px;
    font-size: 12px;
    justify-content: center;

    &::before {
      display: none;
    }

    ${({ $active }) =>
      $active &&
      `
      border: 1.5px solid var(--accent-secondary, #8B5CF6);
    `}

    .full-label {
      display: none;
    }

    .short-label {
      display: inline;
    }
  }

  @media (min-width: 768px) {
    .short-label {
      display: none;
    }

    .full-label {
      display: inline;
    }
  }
`;

export const SectionChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
`;

export const SectionChip = styled.button<{ $active: boolean }>`
  --swan-action-border: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent)'};
  --swan-action-bg: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--surface-accent, #003080) 76%, transparent)'
      : 'transparent'};
  --swan-action-fg: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)'};
  ${swanClientActionButton}

  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  overflow-wrap: anywhere;

  &:hover {
    --swan-action-bg: ${({ $active }) =>
      $active
        ? 'color-mix(in srgb, var(--surface-accent, #003080) 82%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }

  svg {
    flex: 0 0 auto;
  }

  @media (max-width: 767px) {
    padding: 8px 12px;
    font-size: 12px;

    .full-label {
      display: none;
    }

    .short-label {
      display: inline;
    }
  }

  @media (min-width: 768px) {
    .short-label {
      display: none;
    }

    .full-label {
      display: inline;
    }
  }

  @media (min-width: 2560px) {
    font-size: 14px;
  }
`;

export const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  padding: 16px;
  overflow: visible;

  @media (max-width: 767px) {
    padding: 10px 8px 12px;
  }
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
    animation: shimmer 1.5s ease-in-out infinite alternate;
  }

  & > div:nth-child(1) {
    width: 70%;
  }

  & > div:nth-child(2) {
    width: 90%;
  }

  & > div:nth-child(3) {
    width: 55%;
  }

  @keyframes shimmer {
    0% {
      opacity: 0.4;
    }

    100% {
      opacity: 0.8;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    & > div {
      animation: none;
    }
  }
`;

export const PlaceholderCard = styled.div`
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  border-style: dashed;
  overflow-wrap: anywhere;

  h4 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    color: var(--text-primary, #E0ECF4);
    margin: 12px 0 6px;
  }

  p {
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0;
    overflow-wrap: anywhere;
  }
`;
