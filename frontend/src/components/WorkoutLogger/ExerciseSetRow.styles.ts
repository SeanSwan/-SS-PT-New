import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const SetsTable = styled.div`
  background: ${withAlpha(CS.bgDeep, 0.6)};
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid ${withAlpha(CS.text, 0.04)};
`;

export const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 50px 90px 70px 120px 80px 100px 130px 1fr 44px;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: ${withAlpha(CS.surfaceDark, 0.8)};
  font-weight: 700;
  font-size: 0.7rem;
  color: ${CS.gaming};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid ${CS.glassBorder};
  @media (max-width: 768px) { display: none; }
`;

export const SetRow = styled.div`
  display: grid;
  grid-template-columns: 50px 90px 70px 120px 80px 100px 130px 1fr 44px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${withAlpha(CS.gaming, 0.08)};
  align-items: center;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:last-child { border-bottom: none; }
  &:hover { background: ${withAlpha(CS.glow, 0.06)}; }

  @media (max-width: 768px) {
    display: block;
    margin: 8px;
    border-radius: 8px;
    background: ${withAlpha(CS.cardDark, 0.5)};
    padding: 4px 0;
    border-bottom: none;
    &:last-child { margin-bottom: 4px; }
  }
`;

export const SetCell = styled.div`
  display: contents;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;

    &::before {
      content: attr(data-label);
      font-weight: 700;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${CS.textMuted};
      min-width: 60px;
      flex-shrink: 0;
      font-family: 'Sora', sans-serif;
    }

    &[data-label=""]::before { display: none; }

    & > input,
    & > div {
      flex: 1;
      min-width: 0;
    }
  }

  @media (max-width: 430px) { padding: 6px 10px; }
`;

export const SetNumber = styled.div`
  font-weight: 700;
  color: ${CS.gaming};
  font-size: 1.1rem;
  text-align: center;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

export const NumberInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: ${withAlpha(CS.cardDark, 0.6)};
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  text-align: center;
  font-size: 0.9rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px ${withAlpha(CS.glow, 0.15)};
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] { -moz-appearance: textfield; }
  @media (max-width: 768px) { min-height: 48px; }
  @media (max-width: 430px) { font-size: 16px; padding: 10px; }
`;

export const WeightInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  @media (max-width: 768px) { flex: 1; }
`;

export const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: ${withAlpha(CS.cardDark, 0.6)};
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px ${withAlpha(CS.glow, 0.15)};
  }

  &::placeholder { color: ${withAlpha(CS.text, 0.4)}; }
  @media (max-width: 768px) { min-height: 48px; }
  @media (max-width: 430px) { font-size: 16px; }
`;

export const AddSetButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: ${withAlpha(CS.glow, 0.08)};
  border: 2px dashed ${withAlpha(CS.glow, 0.3)};
  border-radius: 0.75rem;
  color: ${CS.glowLight};
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  min-height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${withAlpha(CS.glow, 0.15)};
    border-color: ${withAlpha(CS.glow, 0.5)};
    border-style: solid;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${withAlpha(CS.glow, 0.15)};
  }
`;

export const RemoveSetButton = styled.button`
  background: ${withAlpha(CS.error, 0.1)};
  border: 1px solid ${withAlpha(CS.error, 0.3)};
  border-radius: 0.5rem;
  color: ${CS.errorText};
  cursor: pointer;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${withAlpha(CS.error, 0.2)};
    border-color: ${withAlpha(CS.error, 0.5)};
    box-shadow: 0 0 12px ${withAlpha(CS.error, 0.2)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.errorText};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${withAlpha(CS.error, 0.15)};
  }

  &:disabled { opacity: 0.3; cursor: not-allowed; }
  svg { width: 18px; height: 18px; }
`;
