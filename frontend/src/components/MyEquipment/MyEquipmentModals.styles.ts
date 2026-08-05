/**
 * MyEquipmentModals.styles — add-place sheet + quick review sheet styling
 * =======================================================================
 * Bottom-sheet on mobile, centered dialog on desktop (same geometry as the
 * Equipment Manager modals). Location type is chosen with 44px toggle chips —
 * never a native select (§10a #12 template ban). Crystalline tokens with
 * fallbacks throughout.
 */
import styled from 'styled-components';

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.75);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;

  @media (min-width: 768px) { align-items: center; }
`;

export const ModalCard = styled.div`
  width: 100%;
  max-width: 460px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 16px 16px 0 0;
  border: 1px solid rgba(96, 192, 240, 0.22);
  background: linear-gradient(180deg, var(--surface-dark, #1A1A24), var(--card-dark, #141419));

  @media (min-width: 768px) { border-radius: 16px; }
`;

export const ModalTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.8));
`;

export const FieldGroup = styled.div`
  margin-bottom: 16px;
`;

export const TextInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.22);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.45)); }
  &:focus { outline: none; border-color: var(--accent-primary, #60C0F0); }
`;

export const TypeChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const TypeChip = styled.button<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $selected }) => ($selected
    ? 'linear-gradient(135deg, var(--primary, #002060), var(--surface-elevated, #003080))'
    : 'transparent')};
  border: 1px solid ${({ $selected }) => ($selected
    ? 'var(--accent-primary, #60C0F0)'
    : 'rgba(96, 192, 240, 0.25)')};

  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

export const ModalError = styled.p`
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--luxury-accent, #C6A84B);
`;

export const ModalActions = styled.div`
  display: flex;
  gap: 10px;

  & > button { flex: 1; }

  @media (max-width: 360px) { flex-direction: column; }
`;

export const ReviewMeta = styled.p`
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
`;
