/**
 * HistoryBackfillDialog.styles
 * ============================
 * Styled primitives for the attested history-backfill dialog (charter v3 H).
 */
import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* 2200 = house precedent for full-screen dialogs (WorkoutDayDrilldown,
     PostMediaLightbox): clears the fixed header (1250), dropdowns (1260),
     and toasts (1300). */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
`;

export const Panel = styled.div`
  width: min(620px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
`;

export const IconButton = styled.button`
  margin-left: auto;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
`;

export const Note = styled.p`
  margin: 0.35rem 0 0.7rem;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.74rem;
`;

export const FieldRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.76rem;

  input, textarea {
    flex: 1;
    min-height: 44px;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const PreviewList = styled.ul`
  margin: 0.4rem 0 0.6rem;
  padding-left: 1rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.74rem;
  color: var(--text-secondary, #9FB6C8);

  li { margin-bottom: 0.25rem; }
`;

export const ActionButton = styled.button<{ $tone?: 'primary' }>`
  min-height: 44px;
  margin: 0.25rem 0.5rem 0 0;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: ${({ $tone }) => ($tone === 'primary' ? 'var(--accent-deep, #002060)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: progress; }
`;
