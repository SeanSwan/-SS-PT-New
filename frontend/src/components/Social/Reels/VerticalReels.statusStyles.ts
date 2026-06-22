/**
 * Status-state styling for VerticalReels loading, retry, and empty states.
 */
import styled from 'styled-components';

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  text-align: center;
  padding: 40px;
  gap: 16px;

  h3 { color: var(--text-primary, #E0ECF4); margin: 0; }
  p { margin: 0; font-size: 14px; }

  button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, var(--bg-elevated, #141419));
    color: var(--text-primary, #E0ECF4);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  .reels-status-spin {
    animation: reels-spin 1s linear infinite;
  }

  @keyframes reels-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .reels-status-spin { animation: none; }
  }
`;
