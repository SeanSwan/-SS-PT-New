/**
 * Dialog and form styles for reward editing and stock updates.
 */
import styled from 'styled-components';

export const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: var(--reward-overlay, rgba(0, 0, 0, 0.6));
  padding: 1rem;
`;

export const DialogPanel = styled.div<{ $maxWidth?: string }>`
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth || '720px'};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--reward-bg, rgba(15, 23, 42, 0.95));
  border: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  border-radius: 12px;
  overflow: hidden;
`;

export const DialogTitleBar = styled.h2`
  margin: 0;
  padding: 1.25rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--reward-text, #e2e8f0);
  border-bottom: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
`;

export const DialogBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

export const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormFieldFull = styled.div`
  grid-column: 1 / -1;
`;

export const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.8rem;
  color: var(--reward-muted, #94a3b8);
  font-weight: 500;
`;

export const FieldInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--reward-bg-light, rgba(30, 41, 59, 0.8));
  border: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--reward-text, #e2e8f0);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: var(--reward-muted, #94a3b8);
  }

  &:focus {
    border-color: var(--reward-accent, #0ea5e9);
  }
`;

export const FieldInputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const InputIconLeft = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: var(--reward-muted, #94a3b8);
  pointer-events: none;
`;

export const InputWithPadding = styled(FieldInput)`
  padding-left: 38px;
`;

export const FieldTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  background: var(--reward-bg-light, rgba(30, 41, 59, 0.8));
  border: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--reward-text, #e2e8f0);
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;

  &::placeholder {
    color: var(--reward-muted, #94a3b8);
  }

  &:focus {
    border-color: var(--reward-accent, #0ea5e9);
  }
`;

export const FieldSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--reward-bg-light, rgba(30, 41, 59, 0.8));
  border: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  color: var(--reward-text, #e2e8f0);
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 0.2s;
`;

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  margin: 0.5rem 0;
`;

export const SectionLabel = styled.p`
  margin: 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--reward-text, #e2e8f0);
`;

export const UploadButton = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: var(--reward-accent, #0ea5e9);
  border: 1px solid var(--reward-border, rgba(14, 165, 233, 0.2));
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: var(--reward-accent, #0ea5e9);
    background: var(--reward-hover-bg, rgba(14, 165, 233, 0.08));
  }
`;

export const HiddenFileInput = styled.input`
  display: none;
`;

export const ImagePreview = styled.div`
  margin-top: 0.75rem;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
  }
`;
