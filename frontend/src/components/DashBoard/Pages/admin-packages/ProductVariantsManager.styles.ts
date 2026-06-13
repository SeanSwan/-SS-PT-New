/**
 * ============================================================================
 * FILE: ProductVariantsManager.styles.ts
 * PURPOSE: Styled-components for the admin physical product variant manager.
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-13
 * AI VILLAGE VALIDATED: N/A
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Keeps ProductVariantsManager focused on data and events while preserving the
 * dark-first Crystalline Swan admin form treatment. Interactive controls keep a
 * 44px minimum touch target and reduced-motion handling.
 */
import styled from 'styled-components';

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  border-radius: 10px;
  padding: 0.85rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 60%, transparent);
`;

export const Title = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
`;

export const Hint = styled.div`
  font-size: 0.78rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 70%, transparent);
`;

export const RowLabel = styled.span<{ $dim?: boolean }>`
  flex: 1;
  min-width: 120px;
  color: ${({ $dim }) => (
    $dim
      ? 'var(--text-muted, rgba(224, 236, 244, 0.55))'
      : 'var(--text-primary, #E0ECF4)'
  )};
  font-size: 0.9rem;
`;

export const Meta = styled.span`
  font-size: 0.82rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
`;

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);

  &:hover {
    color: var(--accent-primary, #60C0F0);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  }

  &:hover.danger {
    color: var(--danger, #ef4444);
    border-color: color-mix(in srgb, var(--danger, #ef4444) 45%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  .spin {
    animation: pvm-spin 0.9s linear infinite;
  }

  @keyframes pvm-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .spin { animation: none; }
  }
`;

export const Editor = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 0.4rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  align-self: flex-start;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;
