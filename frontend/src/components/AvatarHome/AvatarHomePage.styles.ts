/**
 * STYLES: AvatarHomePage.styles
 * PURPOSE: Page-shell primitives for the mounted Avatar Home dashboard route.
 */

import styled, { keyframes } from 'styled-components';
import { Loader } from 'lucide-react';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const PageWrapper = styled.div`
  min-height: 100%;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  flex-wrap: wrap;
  gap: 12px;
`;

export const HeaderTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ModeToggle = styled.button<{ $minimalist: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $minimalist }) =>
    $minimalist
      ? 'color-mix(in srgb, var(--accent-warning, #C6A84B) 30%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  background: ${({ $minimalist }) =>
    $minimalist
      ? 'color-mix(in srgb, var(--accent-warning, #C6A84B) 8%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
  color: ${({ $minimalist }) =>
    $minimalist ? 'var(--accent-warning, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-secondary, #B8C7D1);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  gap: 8px;
`;

export const LoadingSpinner = styled(Loader)`
  animation: ${spin} 1s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ErrorBanner = styled.div`
  padding: 16px 24px;
  margin: 16px 24px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--status-danger, #EF4444) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-danger, #EF4444) 25%, transparent);
  color: var(--status-danger, #EF4444);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

export const HomeLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  padding: 0 24px 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const PhaseThreeStack = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const PhaseThreeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
