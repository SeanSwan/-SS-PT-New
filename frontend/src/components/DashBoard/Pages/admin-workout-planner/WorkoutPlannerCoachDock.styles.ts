/**
 * Styles for the Workout Planner Swan Coach dock (dictation-first plan edits).
 * Token-with-fallback discipline, 44px touch targets, dark-first, low-motion
 * client-surface treatment per the Swan Card/Button Standard.
 */
import styled, { css, keyframes } from 'styled-components';

const micPulse = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent); }
  70% { box-shadow: 0 0 0 10px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

/* Rule 43: interpolated shared fragment must use the css helper. */
const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const DockWrap = styled.section`width: 100%; margin: 16px 0;`;

export const DockBar = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  min-height: 56px; padding: 8px 16px; border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
`;

export const DockTitle = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ $muted }) => ($muted
    ? 'var(--text-secondary, rgba(224, 236, 244, 0.6))'
    : 'var(--text-primary, #E0ECF4)')};
`;

export const OpenBtn = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: var(--btn-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  &:hover { box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent); }
  &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
  ${focusRing}
`;

export const ClientChip = styled.span`
  display: inline-flex; align-items: center; min-height: 28px; padding: 2px 12px;
  border-radius: 999px; font-size: 0.75rem; font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

export const ReceiptFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 10px;
  background: var(--bg-base, #030712);
  @media (max-width: 480px) { max-height: 120px; }
`;

export const ReceiptRow = styled.p<{ $ok?: boolean; $muted?: boolean }>`
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${({ $muted }) => ($muted
    ? 'var(--text-secondary, rgba(224, 236, 244, 0.6))'
    : 'var(--text-primary, #E0ECF4)')};
  & > span[aria-hidden] {
    margin-right: 6px;
    color: ${({ $ok }) => ($ok ? 'var(--accent-primary, #60C0F0)' : 'var(--danger, #E14B67)')};
  }
`;

export const ReceiptActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 64px;
  margin-left: 10px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(96, 192, 240, 0.12); }
  ${focusRing}
`;

export const InputRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  @media (max-width: 480px) { flex-wrap: wrap; }
`;

export const DockTextarea = styled.textarea`
  flex: 1 1 240px;
  min-height: 56px;
  padding: 10px 12px;
  resize: vertical;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (max-width: 480px) { flex-basis: 100%; }
`;

export const MicBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &[aria-pressed='true'] {
    background: var(--accent-secondary, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
    ${css`animation: ${micPulse} 1.6s ease-out infinite;`}
  }
  @media (prefers-reduced-motion: reduce) {
    &[aria-pressed='true'] { animation: none; }
  }
  @media (max-width: 480px) { flex: 1 1 45%; }
  ${focusRing}
`;

export const SendBtn = styled(OpenBtn)`
  @media (max-width: 480px) { flex: 1 1 45%; }
`;

export const InterimHint = styled.p`
  margin: 6px 0 0; font-size: 0.75rem; font-style: italic;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

export const DockFooterRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px;
`;
