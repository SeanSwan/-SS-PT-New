/**
 * SignaturePad.styles — Phase 5W-G (accessibility rebuild)
 * ========================================================
 * styled-components for <SignaturePad />. NO Material-UI.
 * Every color goes through the `var(--token, #fallback)` pattern with
 * Crystalline Swan fallbacks (rule 6). All motion respects
 * `prefers-reduced-motion` (rule 25). All controls clear 44px (rule 2).
 */
import styled, { css } from 'styled-components';
import { SCRIPT_FONT_STACK } from './typedSignature';

const focusRing = css`
  outline: 2px solid var(--accent-glow, #8b5cf6);
  outline-offset: 2px;
`;

const motionSafe = css`
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--text-primary, #e0ecf4);
`;

export const TabList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const Tab = styled.button<{ $active: boolean }>`
  flex: 1 1 120px;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  ${motionSafe};
  border: 1px solid
    ${({ $active }) =>
      $active
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--border-subtle, rgba(139, 92, 246, 0.3))'};
  background: ${({ $active }) =>
    $active ? 'var(--accent-soft, rgba(96, 192, 240, 0.14))' : 'var(--surface-elevated, #141419)'};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)')};

  &:hover {
    border-color: var(--accent-primary, #60c0f0);
  }

  &:focus-visible {
    ${focusRing};
  }
`;

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &[hidden] {
    display: none;
  }
`;

export const CanvasWrap = styled.div`
  position: relative;
  width: 100%;
`;

export const Canvas = styled.canvas`
  display: block;
  width: 100%;
  /* Responsive: never eats a short landscape viewport, never collapses. */
  height: clamp(120px, 30vh, 200px);
  border: 2px solid var(--border-subtle, rgba(139, 92, 246, 0.3));
  border-radius: 8px;
  background: var(--bg-base, #030712);
  cursor: crosshair;
  touch-action: none;

  &:focus-visible {
    ${focusRing};
    border-color: var(--accent-primary, #60c0f0);
  }
`;

export const Placeholder = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  font-size: 1rem;
  pointer-events: none;
  user-select: none;
`;

export const ControlRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`;

export const ControlButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  ${motionSafe};
  background: var(--surface-elevated, #141419);
  border: 1px solid
    ${({ $danger }) =>
      $danger ? 'var(--accent-glow, #8B5CF6)' : 'var(--border-subtle, rgba(139, 92, 246, 0.3))'};
  color: ${({ $danger }) => ($danger ? 'var(--accent-glow, #8B5CF6)' : 'var(--accent-primary, #60C0F0)')};

  &:hover:not(:disabled) {
    background: var(--accent-soft, rgba(96, 192, 240, 0.14));
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    ${focusRing};
  }
`;

export const ConfirmText = styled.span`
  font-size: 0.8rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
`;

export const TextInput = styled.input`
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 2px solid var(--border-subtle, rgba(139, 92, 246, 0.3));
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  font-size: 1rem;
  ${motionSafe};

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }

  &:focus-visible {
    ${focusRing};
    border-color: var(--accent-primary, #60c0f0);
  }
`;

export const Preview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(84px, 18vh, 120px);
  padding: 0.5rem 1rem;
  border: 2px dashed var(--border-subtle, rgba(139, 92, 246, 0.3));
  border-radius: 8px;
  background: var(--bg-base, #030712);
  overflow: hidden;
`;

export const PreviewText = styled.span<{ $empty: boolean }>`
  font-family: ${SCRIPT_FONT_STACK};
  font-style: italic;
  font-size: clamp(1.5rem, 6vw, 2.5rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
  text-align: center;
  color: ${({ $empty }) =>
    $empty ? 'var(--text-muted, rgba(224, 236, 244, 0.35))' : 'var(--accent-primary, #60C0F0)'};
`;

export const AdoptRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  min-height: 44px;
  padding: 0.35rem 0;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);

  input {
    width: 22px;
    height: 22px;
    margin-top: 0.35rem;
    flex-shrink: 0;
    accent-color: var(--accent-primary, #60c0f0);
    cursor: pointer;
  }

  input:focus-visible {
    ${focusRing};
  }
`;

export const HelpText = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
`;

/** Screen-reader-only live region (visually hidden, still announced). */
export const LiveRegion = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
