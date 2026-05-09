/**
 * Dialog and form styles for achievement creation/editing.
 */
import styled from 'styled-components';

export const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  background: var(--achievement-dialog-backdrop, rgba(0, 0, 0, 0.7));
  z-index: 1300;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

export const DialogPanel = styled.div`
  background: var(--achievement-dialog-bg, rgba(15, 23, 42, 0.98));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px var(--achievement-dialog-shadow, rgba(0, 0, 0, 0.4));
`;

export const DialogTitleBar = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
`;

export const DialogTitleText = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--achievement-text, #e2e8f0);
`;

export const DialogContentArea = styled.div`
  padding: 24px;
`;

export const DialogActionsBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormFieldFull = styled.div`
  grid-column: 1 / -1;
`;

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: var(--achievement-muted, #94a3b8);
`;

export const FormInput = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--achievement-placeholder, #64748b);
  }

  &:focus {
    border-color: var(--achievement-accent, #0ea5e9);
  }
`;

export const FormInputWithIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--achievement-accent, #0ea5e9);
  }

  input {
    flex: 1;
    min-height: 42px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--achievement-text, #e2e8f0);
    font-size: 14px;
    outline: none;
  }
`;

export const FormTextarea = styled.textarea`
  min-height: 88px;
  padding: 10px 12px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--achievement-placeholder, #64748b);
  }

  &:focus {
    border-color: var(--achievement-accent, #0ea5e9);
  }
`;

export const FormSelect = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  background: var(--achievement-input-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--achievement-text, #e2e8f0);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--achievement-accent, #0ea5e9);
  }

  option {
    background: var(--achievement-option-bg, #0f172a);
    color: var(--achievement-text, #e2e8f0);
  }
`;

export const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid var(--achievement-border, rgba(14, 165, 233, 0.2));
  margin: 4px 0;
`;

export const SectionTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--achievement-text, #e2e8f0);
`;

export const FileUploadButton = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: var(--achievement-accent, #0ea5e9);
  border: 1px solid var(--achievement-accent-border, rgba(14, 165, 233, 0.3));
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: var(--achievement-accent, #0ea5e9);
    background: var(--achievement-hover-bg, rgba(14, 165, 233, 0.1));
  }
`;

export const HiddenFileInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

export const BadgePreview = styled.div`
  margin-top: 12px;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
  }
`;
