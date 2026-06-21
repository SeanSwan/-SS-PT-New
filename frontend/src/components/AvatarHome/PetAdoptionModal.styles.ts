/**
 * COMPONENT: PetAdoptionModal styles
 * PURPOSE: Keeps Avatar Home pet adoption presentation separate from modal behavior.
 */

import styled, { keyframes } from 'styled-components';
import { Check } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s;
  padding: 16px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Modal = styled.div`
  background: var(--bg-elevated, #141419);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
`;

export const ModalTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CloseBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #B8C7D1);
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;

export const SpeciesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 16px 24px;
`;

export const SpeciesCard = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid ${({ $selected }) => (
    $selected
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
  )};
  background: ${({ $selected }) => (
    $selected
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent)'
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 44px;
  transition: border-color 0.15s, background 0.15s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:disabled { cursor: wait; opacity: 0.72; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const SpeciesEmoji = styled.div`
  font-size: 36px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-primary, #002060) 40%, transparent);
`;

export const SpeciesInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const SpeciesName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 3px;
`;

export const SelectedCheck = styled(Check)`
  margin-left: 6px;
  color: var(--accent-primary, #60C0F0);
`;

export const SpeciesAffinity = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

export const SpeciesDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, #A8B7C7);
  margin-top: 2px;
`;

export const NameInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  min-height: 44px;
  margin: 0 24px 16px;
  box-sizing: border-box;

  &:focus { border-color: var(--accent-primary, #60C0F0); }
  &::placeholder { color: var(--text-muted, #748398); }
`;

export const StatusMsg = styled.div`
  margin: 0 24px 16px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--status-danger, #EF4444) 24%, transparent);
  background: color-mix(in srgb, var(--status-danger, #EF4444) 8%, transparent);
  color: var(--status-danger, #EF4444);
  font: 600 12px 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Footer = styled.div`
  padding: 16px 24px 20px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  display: flex;
  justify-content: flex-end;
`;

export const AdoptButton = styled.button`
  min-height: 44px;
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
