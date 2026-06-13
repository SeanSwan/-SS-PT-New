/**
 * ProductCard.styles - focused styled-components for physical product cards.
 *
 * Responsibilities:
 * - Keep ProductCard under the project line budget while preserving local styling.
 * - Provide accessible, 44px+ product purchase action states.
 * - Keep motion GPU-safe and reduced-motion aware.
 */
import styled from 'styled-components';

export const Action = styled.button<{ $active: boolean }>`
  min-height: 48px;
  width: 100%;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 999px;
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--accent-secondary, #8B5CF6))'
    : 'var(--surface-elevated, rgba(0, 48, 128, 0.28))'};
  color: var(--text-primary, #E0ECF4);
  cursor: ${({ $active }) => ($active ? 'pointer' : 'not-allowed')};
  font-family: var(--font-ui, "Sora", sans-serif);
  font-weight: 800;
  margin-top: auto;
  padding: 0.75rem 1rem;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  white-space: normal;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;
