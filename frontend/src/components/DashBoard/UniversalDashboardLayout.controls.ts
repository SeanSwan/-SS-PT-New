import styled from 'styled-components';

export const MobileBackBtn = styled.button`
  display: none;
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 999;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
  background: var(--bg-surface, #141419);
  color: var(--text-primary, #E0ECF4);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-subtle, 0 4px 16px color-mix(in srgb, var(--bg-base, #0A0A0F) 40%, transparent));
  transition:
    background 200ms ease,
    border-color 200ms ease,
    transform 200ms ease;

  &:hover {
    background: var(--bg-elevated, #1A1A24);
    border-color: var(--border-accent-medium, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent));
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition:
      background 1ms linear,
      border-color 1ms linear;

    &:active {
      transform: none;
    }
  }

  @media (max-width: 1024px) {
    display: flex;
    top: 60px;
    right: 10px;
  }

  @media (max-width: 480px) {
    top: 60px;
    right: 10px;
  }

  @media (max-width: 375px) {
    top: 58px;
    right: 8px;
  }
`;

export const UniversalButton = styled.button<{ $variant?: 'danger' }>`
  background: ${({ $variant }) => (
    $variant === 'danger'
      ? 'var(--danger-bg-soft, color-mix(in srgb, var(--danger, #C92A54) 20%, transparent))'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%)'
  )};
  border: 1px solid ${({ $variant }) => (
    $variant === 'danger'
      ? 'color-mix(in srgb, var(--danger, #C92A54) 45%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
  )};
  border-radius: 12px;
  color: var(--text-on-accent, #FFFFFF);
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 200ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease,
    transform 200ms ease;
  min-height: 44px;

  &:hover {
    box-shadow: var(--shadow-accent, 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent));
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition:
      background 1ms linear,
      border-color 1ms linear,
      box-shadow 1ms linear;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;