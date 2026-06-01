/**
 * Admin sessions modal shell styles.
 * Centralizes dialog surfaces used by create, edit, delete, and assignment flows.
 */
import styled from 'styled-components';
import { executiveTheme } from './AdminSessionsTheme.styles';

export const StyledDialog = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 76%, transparent);
  backdrop-filter: blur(4px);
`;

export const DialogPanel = styled.div`
  background: linear-gradient(135deg, ${executiveTheme.commandNavy}, ${executiveTheme.deepSpace});
  color: var(--text-primary, #E0ECF4);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  overflow: hidden;
  box-shadow: 0 25px 50px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 1rem;
`;

export const DialogTitleBar = styled.div`
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  padding: 1.25rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
`;

export const DialogContentArea = styled.div`
  padding: 1.5rem;

  input,
  select,
  textarea {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent);
    border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    outline: none;
    font-size: 0.95rem;
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  label {
    color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    display: block;
  }
`;

export const DialogActionsBar = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const DeleteDetailBox = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 20%, transparent);
`;
