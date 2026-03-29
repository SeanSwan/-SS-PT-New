/**
 * ============================================================================
 * FILE: CompanionPetStyles.ts
 * PURPOSE: Styled components for the companion pet system
 * ============================================================================
 */
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(96, 192, 240, 0.2); }
  50% { box-shadow: 0 0 20px 4px rgba(96, 192, 240, 0.15); }
`;

export const PetContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  animation: ${fadeIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const PetSpriteWrapper = styled.div`
  position: relative;
  animation: ${pulse} 3s ease-in-out infinite;
  border-radius: 50%;
`;

export const HealthBar = styled.div`
  width: 100%;
  max-width: 180px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-base, #0A0A0F);
  overflow: hidden;
`;

export const HealthFill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
`;

export const PetName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  text-align: center;
`;

export const PetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const InteractionBar = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const InteractionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

// ── Adoption Flow ──

export const AdoptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 1.5rem;
  border-radius: 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  animation: ${fadeIn} 0.4s ease;
`;

export const AdoptionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

export const AdoptionSubtitle = styled.p`
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  margin: 0;
  text-align: center;
  max-width: 340px;
`;

export const SpeciesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  width: 100%;
  max-width: 600px;
`;

export const SpeciesCard = styled.button<{ $selected?: boolean; $color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  min-height: 120px;
  border-radius: 12px;
  border: 2px solid ${({ $selected, $color }) =>
    $selected ? $color : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $selected, $color }) =>
    $selected ? `color-mix(in srgb, ${$color} 10%, var(--bg-base, #0A0A0F))` : 'var(--bg-base, #0A0A0F)'};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $selected, $color }) => $selected && `box-shadow: 0 0 16px ${$color}33;`}

  &:hover {
    border-color: ${({ $color }) => $color};
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

export const SpeciesName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  text-align: center;
`;

export const SpeciesElement = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.625rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  text-transform: uppercase;
`;

export const NameInput = styled.input`
  width: 100%;
  max-width: 250px;
  height: 44px;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  text-align: center;

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.5)); }
  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.12);
  }
`;

export const AdoptButton = styled.button`
  min-height: 48px;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover:not(:disabled) {
    transform: scale(1.03);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
  }

  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;
