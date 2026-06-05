import styled, { css, keyframes } from 'styled-components';

const cardEntry = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const motionGuarded = css`
  @media (prefers-reduced-motion: no-preference) {
    animation: ${cardEntry} 200ms ease-out;
  }
`;

export const Card = styled.div<{ $loaded: boolean; $isCurrent: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-surface, rgba(0, 32, 96, 0.45));
  border: 1px solid ${({ $loaded, $isCurrent }) =>
    $isCurrent
      ? 'var(--accent-gold, #C6A84B)'
      : $loaded
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--border-soft, rgba(96, 192, 240, 0.18))'};
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  outline: none;
  ${motionGuarded}

  ${({ $isCurrent }) => $isCurrent && css`
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent);
  `}

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

export const CardTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${({ $status }) => {
    if ($status === 'active') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent)';
    if ($status === 'paused') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)';
    if ($status === 'draft') return 'color-mix(in srgb, var(--text-secondary, rgba(224,236,244,0.5)) 12%, transparent)';
    return 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.3)) 10%, transparent)';
  }};
  color: ${({ $status }) => {
    if ($status === 'active') return 'var(--accent-gold, #C6A84B)';
    if ($status === 'paused') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--text-secondary, rgba(224,236,244,0.7))';
  }};
`;

export const CardMeta = styled.div`
  display: flex;
  gap: 12px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.55));
`;

export const CardActionRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

export const CardActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  min-width: 44px;
  padding: 6px 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-gold, #C6A84B)'
      : $variant === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 35%, transparent)'
        : 'var(--border-soft, rgba(96, 192, 240, 0.2))'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)'
      : $variant === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 8%, transparent)'
        : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-gold, #C6A84B)'
      : $variant === 'danger'
        ? 'var(--danger, #C92A54)'
        : 'var(--text-primary, #E0ECF4)'};
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent)'
        : $variant === 'danger'
          ? 'color-mix(in srgb, var(--danger, #C92A54) 16%, transparent)'
          : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const RenameInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 8px 12px;
  background: var(--bg-base, #030712);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }
`;
