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
  ${swanSectionBackdrop}
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;

  @media (min-width: 2560px) {
    max-width: 2200px;
    margin: 0 auto;
  }

  @media (min-width: 3840px) {
    max-width: 3000px;
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
  gap: 8px;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : $variant === 'danger'
        ? 'var(--color-error, #EF4444)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'
      : $variant === 'danger'
        ? 'color-mix(in srgb, var(--color-error, #EF4444) 10%, transparent)'
      : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : $variant === 'danger'
        ? 'var(--color-error, #EF4444)'
      : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
        : $variant === 'danger'
          ? 'color-mix(in srgb, var(--color-error, #EF4444) 16%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
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
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const DetailScrollWrap = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;

  @media (max-width: 768px) {
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
