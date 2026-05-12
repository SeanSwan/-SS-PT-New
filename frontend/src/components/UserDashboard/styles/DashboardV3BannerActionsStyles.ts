/**
 * Banner action controls for the canonical UserDashboard V3 profile header.
 */

import styled from 'styled-components';

export const BannerRepositionAnchor = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

export const BannerRepositionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-base, #002060) 65%, transparent);
  backdrop-filter: blur(16px);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
  letter-spacing: 0.02em;
  margin-right: 0.5rem;

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--bg-surface, #003080) 85%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  svg {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 0;
    gap: 0;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    justify-content: center;
    margin-right: 0.375rem;
  }

  @media (max-width: 340px) {
    width: 44px;
    height: 44px;
  }
`;

export const BannerRepositionPanel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: grid;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: 4px;
  padding: 10px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 96%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  z-index: 4;
`;

export const BannerRepositionCell = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--border-soft, #60C0F0) 16%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent)'
      : 'color-mix(in srgb, var(--bg-surface, var(--bg-elevated, #141419)) 60%, transparent)'};
  color: ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent))'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const BannerActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  width: min(100% - 2rem, 1440px);
  margin: 0.875rem auto 0;
  padding: 0 0.25rem;

  @media (max-width: 768px) {
    width: calc(100% - 1.5rem);
    margin-top: 0.625rem;
  }

  @media (min-width: 1920px) {
    width: min(100% - 4rem, 1760px);
  }

  @media (min-width: 2560px) {
    width: min(100% - 6rem, 2360px);
  }

  @media (min-width: 3840px) {
    width: min(100% - 8rem, 3440px);
  }
`;

export const BannerUploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-base, #002060) 65%, transparent);
  backdrop-filter: blur(16px);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
  letter-spacing: 0.02em;

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--bg-surface, #003080) 85%, transparent);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  svg {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 0;
    gap: 0;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    justify-content: center;
  }

  @media (max-width: 340px) {
    width: 44px;
    height: 44px;
  }
`;
