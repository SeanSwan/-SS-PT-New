/**
 * Admin Photo Gallery Studio — shared styled-components
 * =====================================================
 * Crystalline Swan tokens only (var(--token, #fallback)), dark-first, 44px
 * targets, Dual-Button Glow (blue bg -> purple glow). Reduced-motion honored.
 * Uploader/grid-specific styles live in their own components to keep files lean.
 */

import styled, { css, keyframes } from 'styled-components';

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/** Glass panel — the C12 surface treatment used across the studio. */
export const Panel = styled.section`
  background: var(--card-bg, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
  border-radius: 16px;
  padding: 1.25rem;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
`;

export const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: clamp(1rem, 2vw, 2rem);
  max-width: 1720px;
  margin: 0 auto;
  width: 100%;
  color: var(--text-primary, #e0ecf4);
`;

export const PageHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
`;

export const PageTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--text-primary, #e0ecf4);
`;

export const PageSubtitle = styled.p`
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted, #8fa3b8);
  max-width: 60ch;
`;

/** Event rail (left) + selected-event work area (right) on wide screens. */
export const TwoColLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(320px, 380px) 1fr;
  gap: 1.25rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

export const Rail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
`;

export const MainArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
`;

export const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 1.05rem;
  font-weight: 650;
  margin: 0 0 0.75rem;
  color: var(--text-primary, #e0ecf4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// ── Form fields ──────────────────────────────────────────────────────────
export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted, #8fa3b8);
  min-width: 0;
`;

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const controlBase = css`
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  border-radius: 10px;
  color: var(--text-primary, #e0ecf4);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &::placeholder { color: var(--text-faint, #64748b); }
  &:focus {
    outline: none;
    border-color: var(--accent-purple, #8b5cf6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.28);
  }
`;

export const Input = styled.input`${controlBase}`;
export const Select = styled.select`${controlBase}`;
export const Textarea = styled.textarea`
  ${controlBase};
  min-height: 84px;
  resize: vertical;
`;

// ── Buttons — Dual-Button Glow (blue bg -> purple glow) ───────────────────
const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.16s ease, box-shadow 0.2s ease, background 0.2s ease;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (prefers-reduced-motion: no-preference) {
    &:not(:disabled):active { transform: translateY(1px); }
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase};
  background: linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080));
  color: var(--text-primary, #e0ecf4);
  border-color: rgba(139, 92, 246, 0.4);
  &:not(:disabled):hover {
    box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.6), 0 6px 22px rgba(139, 92, 246, 0.45);
  }
`;

export const GhostButton = styled.button`
  ${buttonBase};
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  border-color: var(--border-subtle, rgba(96, 192, 240, 0.28));
  &:not(:disabled):hover {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 0 1px rgba(96, 192, 240, 0.35);
  }
`;

export const DangerButton = styled.button`
  ${buttonBase};
  background: transparent;
  color: var(--danger, #e5484d);
  border-color: rgba(229, 72, 77, 0.45);
  &:not(:disabled):hover { background: rgba(229, 72, 77, 0.12); }
`;

/** Square 44px icon button for card actions. */
export const IconButton = styled.button<{ $danger?: boolean }>`
  ${buttonBase};
  width: 44px;
  min-width: 44px;
  padding: 0;
  background: var(--surface-dark, #1a1a24);
  color: ${({ $danger }) => ($danger ? 'var(--danger, #e5484d)' : 'var(--text-muted, #8fa3b8)')};
  border-color: var(--border-subtle, rgba(96, 192, 240, 0.2));
  &:not(:disabled):hover {
    color: ${({ $danger }) => ($danger ? 'var(--danger, #e5484d)' : 'var(--accent-primary, #60c0f0)')};
    border-color: ${({ $danger }) => ($danger ? 'rgba(229,72,77,0.5)' : 'var(--accent-primary, #60c0f0)')};
  }
`;

// ── Status / feedback ─────────────────────────────────────────────────────
export const Badge = styled.span<{ $tone?: 'published' | 'draft' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  ${({ $tone }) =>
    $tone === 'published'
      ? css`
          color: var(--accent-primary, #60c0f0);
          background: rgba(96, 192, 240, 0.12);
          border: 1px solid rgba(96, 192, 240, 0.3);
        `
      : css`
          color: var(--gilded-fern, #c6a84b);
          background: rgba(198, 168, 75, 0.1);
          border: 1px solid rgba(198, 168, 75, 0.3);
        `}
`;

export const Banner = styled.div<{ $tone: 'ok' | 'warn' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  border: 1px solid;
  ${({ $tone }) => {
    if ($tone === 'error') {
      return css`color: var(--danger, #e5484d); background: rgba(229,72,77,0.1); border-color: rgba(229,72,77,0.35);`;
    }
    if ($tone === 'warn') {
      return css`color: var(--gilded-fern, #c6a84b); background: rgba(198,168,75,0.1); border-color: rgba(198,168,75,0.35);`;
    }
    return css`color: var(--accent-primary, #60c0f0); background: rgba(96,192,240,0.08); border-color: rgba(96,192,240,0.28);`;
  }}
`;

export const HelperText = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted, #8fa3b8);
`;

export const ErrorText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: var(--danger, #e5484d);
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.95rem;
`;

export const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border-subtle, rgba(96, 192, 240, 0.25));
  border-top-color: var(--accent-primary, #60c0f0);
  @media (prefers-reduced-motion: no-preference) {
    animation: ${spin} 0.8s linear infinite;
  }
`;
