/**
 * Styles for LoggerDictationStrip — slim dictation strip above the exercise
 * list (blueprint 02 §D). Token-with-fallback, 44px targets, reduced-motion.
 */
import styled, { css } from 'styled-components';

/* Rule 43: shared interpolated fragment uses the css helper. */
const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const StripWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: var(--bg-elevated, #141419);
`;

export const StripHint = styled.span`
  flex: 1 1 240px;
  font-size: 0.78rem;
  font-style: italic;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
`;

export const StripInput = styled.input`
  flex: 1 1 220px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const StripBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: var(--btn-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent); }
  &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
  ${focusRing}
`;

export const StripGhostBtn = styled(StripBtn)`
  background: transparent;
  border-color: var(--border-soft, rgba(96, 192, 240, 0.2));
`;

export const StripReceipt = styled.p<{ $ok?: boolean }>`
  flex-basis: 100%;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-primary, #E0ECF4);
  & > span[aria-hidden] {
    margin-right: 6px;
    color: ${({ $ok }) => ($ok ? 'var(--accent-primary, #60C0F0)' : 'var(--danger, #E14B67)')};
  }
`;
