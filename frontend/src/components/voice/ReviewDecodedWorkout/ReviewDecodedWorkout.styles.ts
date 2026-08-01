/**
 * STYLES: ReviewDecodedWorkout (S8). Bottom sheet ≤414px → modal ≥1280px;
 * z-95 per ruling A4; caution-ember (never gold) for low-confidence; world
 * tokens with Crystalline fallbacks (ruling A7); 44px inputs.
 */
import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 94;
  background: color-mix(in srgb, var(--deep-dark, #0A0A0F) 65%, transparent);
  display: flex; align-items: flex-end; justify-content: center;
  @media (min-width: 1280px) { align-items: center; }
`;

export const Sheet = styled.div`
  z-index: 95; width: 100%; max-height: 88dvh; overflow-y: auto;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 16px 16px 0 0; padding: 14px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  @media (min-width: 1280px) { max-width: 720px; border-radius: 16px; }
`;

export const Header = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 10px; `;

export const Title = styled.h2`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.95rem; font-weight: 800;
  color: var(--world-text, var(--text-primary, #E0ECF4));
`;

export const TranscriptReceipt = styled.p`
  margin: 10px 0; padding: 10px 12px; border-radius: 10px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Fira Code', monospace; font-size: 0.76rem; white-space: pre-wrap;
`;

export const RowsList = styled.div` display: flex; flex-direction: column; gap: 10px; `;

export const RowCard = styled.div<{ $lowConfidence: boolean }>`
  padding: 10px 12px; border-radius: 12px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid ${({ $lowConfidence }) => ($lowConfidence
    ? 'var(--caution-ember, #d97706)' : 'var(--world-border, rgba(96, 192, 240, 0.15))')};
  border-style: ${({ $lowConfidence }) => ($lowConfidence ? 'dotted' : 'solid')};
`;

export const RowName = styled.input`
  width: 100%; min-height: 44px; padding: 0 10px; border-radius: 8px;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.85rem; font-weight: 700;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

export const SetLine = styled.div`
  display: flex; align-items: center; gap: 8px; margin-top: 8px;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif; font-size: 0.78rem;
`;

export const FieldInput = styled.input`
  width: 84px; min-height: 44px; padding: 0 8px; border-radius: 8px;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Fira Code', monospace; font-size: 0.85rem;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

export const CheckThis = styled.p`
  margin: 8px 0 0; font-family: 'Sora', sans-serif; font-size: 0.74rem; font-weight: 700;
  color: var(--caution-ember, #d97706);
  text-decoration: underline dotted;
`;

export const PainBlock = styled.div`
  margin: 10px 0; padding: 10px 12px; border-radius: 10px;
  border: 1px dotted var(--caution-ember, #d97706);
`;

export const PainLine = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.78rem;
  color: var(--world-text, var(--text-primary, #E0ECF4));
`;

export const Actions = styled.div` display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; `;

export const CommitButton = styled.button`
  min-height: 44px; padding: 0 20px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: var(--btn-primary-bg, #002060);
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.84rem; font-weight: 800;
  &:hover:not(:disabled) { box-shadow: 0 0 14px color-mix(in srgb, var(--accent-glow, #8B5CF6) 45%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const SecondaryButton = styled.button`
  min-height: 44px; padding: 0 14px; border-radius: 10px; cursor: pointer;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 700;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

export const UndoBar = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding: 8px 12px; border-radius: 10px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem;
`;
