/**
 * CoachInputBar.styles.ts
 * =======================
 * Styled-components used by the Coach composer.
 */
import styled from 'styled-components';

export const InputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;

  @media (max-width: 520px) {
    grid-column: 1 / -1;
    order: -1;
  }
`;

export const CharCount = styled.span<{ $near: boolean }>`
  position: absolute;
  right: 8px;
  bottom: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: ${({ $near }) => $near
    ? 'var(--accent-gold, #C6A84B)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)'};
  pointer-events: none;
  transition: color 0.2s ease;
`;

export const InputBarWrap = styled.div`
  display: flex;
  flex-direction: column;
`;

export const InputError = styled.div`
  margin: 6px 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.4;
`;

export const InputErrorAction = styled.button`
  margin-top: 8px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;
