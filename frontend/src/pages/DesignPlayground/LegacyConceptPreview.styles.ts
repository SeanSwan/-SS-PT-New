import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const ViewerContainer = styled.div`
  min-height: 100vh;
  position: relative;
`;

export const FloatingNav = styled.nav`
  position: fixed;
  top: 16px;
  left: 50%;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 32px);
  padding: 8px 16px;
  transform: translateX(-50%);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 50px;
  background: var(--surface-elevated, rgba(0, 32, 96, 0.9));
  box-shadow: var(--shadow-elevated, 0 8px 32px rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(16px);
`;

export const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border-accent, rgba(139, 92, 246, 0.3));
  border-radius: 20px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;

  &:hover,
  &:focus-visible {
    border-color: var(--focus-ring, rgba(139, 92, 246, 0.5));
    background: var(--surface-focus, rgba(139, 92, 246, 0.1));
    outline: none;
  }
`;

export const ArrowButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--focus-ring, rgba(139, 92, 246, 0.4));
    background: var(--surface-focus, rgba(139, 92, 246, 0.1));
    color: var(--accent-primary, #60C0F0);
    outline: none;
  }

  &:disabled {
    cursor: default;
    opacity: 0.3;
  }
`;

export const CategoryGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const CategoryLabel = styled.span`
  min-width: 24px;
  margin-right: 2px;
  color: var(--text-muted, #8090B0);
  font-size: 0.65rem;
  letter-spacing: 1px;
  text-align: right;
`;

export const NavDot = styled.button<{ $active: boolean; $color: string }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;

  &:hover > div,
  &:focus-visible > div {
    border-color: ${({ $color }) => $color};
    background: ${({ $color }) => $color}33;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 1px;
  }
`;

export const DotInner = styled.div<{ $active: boolean; $color: string }>`
  width: 8px;
  height: 8px;
  border: 2px solid ${({ $active, $color }) =>
    $active ? $color : 'var(--border-subtle, rgba(255, 255, 255, 0.2))'};
  border-radius: 50%;
  background: ${({ $active, $color }) => ($active ? $color : 'transparent')};
`;

export const Separator = styled.div`
  flex-shrink: 0;
  width: 1px;
  height: 20px;
  background: var(--border-subtle, rgba(255, 255, 255, 0.1));
`;

export const MobileCounter = styled.span`
  display: none;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;

  @media (max-width: 768px) {
    display: inline;
  }
`;

export const ConceptInfo = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const VersionBadge = styled.span<{ $version: number }>`
  margin-left: 6px;
  padding: 2px 6px;
  border: 1px solid var(--border-accent, rgba(139, 92, 246, 0.35));
  border-radius: 8px;
  background: ${({ $version }) =>
    $version === 1
      ? 'var(--surface-accent, rgba(139, 92, 246, 0.15))'
      : 'var(--surface-accent-strong, rgba(139, 92, 246, 0.25))'};
  color: ${({ $version }) =>
    $version === 1 ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-secondary, #B088F0)'};
  font-size: 0.65rem;
  font-weight: 600;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-base, #002060);
  color: var(--text-primary, #E0ECF4);
`;

export const Spinner = styled.div`
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border: 3px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-top-color: var(--accent-primary, #60C0F0);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--bg-base, #002060);
  color: var(--text-primary, #E0ECF4);
  text-align: center;
`;

export const ErrorTitle = styled.h2`
  margin: 0 0 12px;
  color: var(--status-error, #FF6B7A);
  font-size: 1.5rem;
`;