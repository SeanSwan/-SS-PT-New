/**
 * ============================================================================
 * FILE: EditProfileModalStyles.ts
 * PURPOSE: Shared styled-components for the EditProfileModal family
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports all styled-components used by EditProfileModal
 * and its sub-components (social fields, chart toggles, form sections).
 * HOW IT FITS IN THE APP: EditProfileModal -> imports all styles from here
 * KEY DECISIONS: Extracted to keep each component file under 300 lines.
 *   Uses CSS custom properties for theme support across all 14 themes.
 *   Fallback values match Crystalline Swan palette.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// SECTION: Modal Shell
// PURPOSE: Overlay + dialog container (theme-aware)
// ─────────────────────────────────────────────────────────────

export const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-base, #002060) 60%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;

  @supports not (backdrop-filter: blur(8px)) {
    background: color-mix(in srgb, var(--bg-base, #001440) 92%, transparent);
  }
`;

export const ModalContainer = styled(motion.div)`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 16px;
  padding: 1rem;
  width: calc(100% - 16px);
  max-width: 560px;
  max-height: 90vh;
  margin: 0 8px;

  @media (min-width: 375px) { padding: 1.25rem; width: calc(100% - 24px); margin: 0 12px; }
  @media (min-width: 768px) { padding: 1.5rem; width: 100%; margin: 0; }
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
              0 0 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  outline: none;

  /* Custom scrollbar for theme consistency */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, rgba(96, 192, 240, 0.15));
    border-radius: 3px;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

export const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-heading, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
`;

export const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--accent-primary-10, rgba(96, 192, 240, 0.08));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(201, 42, 84, 0.3);
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Form Elements
// PURPOSE: Inputs, labels, textareas, section headings
// WHY: 44px min touch targets, theme-aware via CSS variables
// ─────────────────────────────────────────────────────────────

export const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

export const Label = styled.label`
  display: block;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.875rem;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem 0.875rem;
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.35));
  }
`;

export const CharCount = styled.span<{ $near?: boolean }>`
  display: block;
  text-align: right;
  font-size: 0.7rem;
  margin-top: 4px;
  color: ${({ $near }) => ($near ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, rgba(224, 236, 244, 0.35))')};
`;

export const RowGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const SectionHeading = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Save Button
// PURPOSE: Primary action CTA (theme-aware gradient)
// ─────────────────────────────────────────────────────────────

export const SaveButton = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg,
    var(--accent-primary, #002060),
    var(--accent-secondary, #8B5CF6)
  );
  color: var(--text-heading, #E0ECF4);
  border: none;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
