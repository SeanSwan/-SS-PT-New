/**
 * ============================================================================
 * FILE: ClientsWorkspace.styles.ts
 * PURPOSE: Styled-components for the admin Client Hub workspace.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 */

import styled from 'styled-components';
import { swanSectionBackdrop } from './clients-team/clientCardSystem';

export const HubContainer = styled.div`
  --client-hub-density-scale: 1;
  ${swanSectionBackdrop}
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 64px);
  color: var(--text-primary, #E0ECF4);
  overflow: visible;
  font-size: calc(1rem * var(--client-hub-density-scale));

  @media (min-width: 2560px) {
    --client-hub-density-scale: 1.08;
  }

  @media (min-width: 3840px) {
    --client-hub-density-scale: 1.16;
  }
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 10px 12px;
    gap: 8px;
  }

  @media (max-width: 520px) {
    padding: 6px 10px 4px;
    gap: 6px;
  }
`;

export const TopBarActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 768px) {
    width: 100%;
    margin-left: 0;
  }

  @media (max-width: 520px) {
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    overscroll-behavior-x: contain;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : $variant === 'danger'
        ? 'var(--color-error, #DC2626)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent)'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060))'
      : $variant === 'danger'
        ? 'var(--color-error, #DC2626)'
      : 'var(--bg-base, #0A0A0F)'};
  color: ${({ $variant }) =>
    $variant === 'primary' || $variant === 'danger'
      ? 'var(--button-primary-text, #FFFFFF)'
      : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;

  svg {
    flex: 0 0 auto;
  }

  span {
    min-width: 0;
  }

  &:not(:disabled):hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060))'
        : $variant === 'danger'
          ? 'var(--color-error, #DC2626)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, #0A0A0F)'};
    box-shadow: ${({ $variant }) =>
      $variant === 'primary'
        ? '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)'
        : $variant === 'danger'
          ? '0 0 16px color-mix(in srgb, var(--color-error, #DC2626) 35%, transparent)'
        : '0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'};
  }

  &:disabled {
    cursor: wait;
    opacity: 0.62;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 14px;

    span {
      display: none;
    }
  }

  @media (max-width: 520px) {
    width: 44px;
    min-width: 44px;
    height: 44px;
    padding: 0;
    flex: 0 0 44px;
    justify-content: center;
    border-radius: 11px;
  }
`;

export const HeaderSection = styled.div`
  padding: 0 20px 12px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0 12px 8px;
  }

  @media (max-width: 640px) {
    > section + * {
      display: none;
    }
  }
`;

export const ContentArea = styled.div`
  flex: 1 0 auto;
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
`;

export const DetailScrollWrap = styled.div`
  flex: 1 0 auto;
  min-height: 0;
  overflow: visible;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
`;

export const CardGrid = styled.div`
  --client-card-desktop-row: 520px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, clamp(340px, 25vw, 560px)), 1fr));
  grid-auto-rows: minmax(var(--client-card-desktop-row), auto);
  align-items: stretch;
  gap: clamp(16px, 1.2vw, 28px);
  padding: clamp(16px, 1.4vw, 32px);
  overflow: visible;
  align-content: start;
  flex: 0 0 auto;
  min-height: 0;

  @media (min-width: 2560px) {
    --client-card-desktop-row: 560px;
  }

  @media (min-width: 3840px) {
    --client-card-desktop-row: 620px;
  }

  @media (max-width: 768px) {
    grid-auto-rows: auto;
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
`;

export const EmptyHub = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;

  > svg:first-child {
    opacity: 0.3;
  }

  [data-empty-title='true'] {
    font-size: 16px;
    font-weight: 600;
  }

  [data-empty-copy='true'] {
    font-size: 14px;
  }
`;

export const EmptyHubActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    width: 100%;

    ${ActionBtn} {
      width: 100%;
      justify-content: center;

      span {
        display: inline;
      }
    }
  }
`;

export const LoadingPulse = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;
