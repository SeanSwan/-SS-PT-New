/**
 * ┌─── STYLES: Campaign Form ────────────────────────────────────┐
 * │ PARENT: CampaignForm (child of CampaignManager)               │
 * │ PURPOSE: Create-campaign form controls. Extracted from        │
 * │          CampaignManager.styles.ts to respect the 300-line cap.│
 * │ TOKENS: var(--token, #fallback), Crystalline Swan palette.    │
 * │ GLOW: Submit = purple bg → cyan glow (Dual-Button rule).      │
 * └──────────────────────────────────────────────────────────────┘
 */

import styled from 'styled-components';

export const Form = styled.form`
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-card, rgba(20, 20, 25, 0.6));
  border: 1px solid var(--border-subtle, rgba(139, 92, 246, 0.22));
`;

export const FormHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const FormTitle = styled.h4`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  background: transparent;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  transition: color 0.15s ease, border-color 0.15s ease;
  &:hover { color: var(--text-primary, #E0ECF4); border-color: rgba(96, 192, 240, 0.4); }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: ${({ $span }) => ($span === 2 ? '1 / -1' : 'auto')};
`;

export const Label = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
`;

const fieldBase = `
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));

  &:focus {
    outline: none;
    border-color: var(--wing-purple, #8B5CF6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  }
`;

export const Input = styled.input`${fieldBase}`;
export const Select = styled.select`
  ${fieldBase}
  cursor: pointer;
  text-transform: capitalize;
`;
export const Textarea = styled.textarea`
  ${fieldBase}
  min-height: 56px;
  resize: vertical;
`;

export const FormError = styled.p`
  margin: 10px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #EF4444;
`;

export const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
`;

export const GhostButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  background: transparent;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* Dual-Button Glow: purple surface → cyan glow. */
export const SubmitButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0A0A0F;
  background: var(--wing-purple, #8B5CF6);
  border: 1px solid rgba(96, 192, 240, 0.5);
  box-shadow: 0 0 0 rgba(96, 192, 240, 0);
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 0 18px rgba(96, 192, 240, 0.5);
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;
