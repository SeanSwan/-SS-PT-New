/**
 * FILE: AegisHudStateStyles.ts
 * PURPOSE: Styled state primitives for Aegis HUD loading/error chrome.
 * OWNER: Codex
 */

import styled from 'styled-components';
import { HudContainer, SkeletonLabel } from './AegisHudStyles';

export const SkeletonIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  flex-shrink: 0;
`;

export const SkeletonValueLabel = styled(SkeletonLabel)`
  width: 40px;
`;

export const ErrorHudContainer = styled(HudContainer)`
  border-color: color-mix(in srgb, var(--error, #C92A54) 35%, transparent);
`;

export const ErrorContent = styled.div`
  text-align: center;
  padding: 16px 0;
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

export const ErrorTitle = styled.p`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
`;

export const ErrorText = styled.p`
  margin: 0 0 12px;
  font-size: 11px;
`;

export const ErrorRetryButton = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  padding: 8px 16px;
  background: var(--accent-primary, #60C0F0);
  color: var(--button-text-dark, #0A0A0F);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

export const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
