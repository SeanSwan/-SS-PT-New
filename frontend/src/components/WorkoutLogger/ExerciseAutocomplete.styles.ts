/**
 * ExerciseAutocomplete.styles.ts
 * Extracted styles for the admin workout exercise search field.
 * Uses shared WorkoutLogger Crystalline Swan tokens.
 */
import styled, { keyframes } from 'styled-components';
import { Search } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

export const InputRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const SearchIconStyled = styled(Search)`
  position: absolute;
  left: 14px;
  color: ${CS.gaming};
  pointer-events: none;
  z-index: 1;
`;

export const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 12px 16px 12px 42px;
  border-radius: 0.75rem;
  border: 1.5px solid ${({ $error }) => ($error ? CS.error : CS.glassBorder)};
  background: ${withAlpha(CS.cardDark, 0.6)};
  backdrop-filter: blur(12px);
  color: ${CS.text};
  font-size: 0.95rem;
  font-family: 'Sora', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)}, 0 0 20px ${withAlpha(CS.glow, 0.08)};
  }

  &::placeholder {
    color: ${withAlpha(CS.text, 0.4)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  margin: 0;
  padding: 6px 0;
  border-radius: 1rem;
  background: ${withAlpha(CS.cardDark, 0.95)};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${withAlpha(CS.glow, 0.2)};
  box-shadow: 0 16px 48px ${withAlpha(CS.bgDeep, 0.5)}, 0 0 40px ${withAlpha(CS.glow, 0.06)};
  list-style: none;
  animation: ${slideDown} 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${withAlpha(CS.glow, 0.25)};
    border-radius: 3px;
  }
`;

export const DropdownItem = styled.li<{ $highlighted: boolean }>`
  padding: 12px 16px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ $highlighted }) => ($highlighted ? withAlpha(CS.glow, 0.12) : 'transparent')};
  border-left: 3px solid ${({ $highlighted }) => ($highlighted ? CS.glow : 'transparent')};

  &:hover {
    background: ${withAlpha(CS.glow, 0.1)};
    border-left-color: ${withAlpha(CS.glow, 0.4)};
  }
`;

export const ExName = styled.span`
  color: ${CS.text};
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const ExMeta = styled.span`
  color: ${CS.textSecondary};
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: linear-gradient(135deg, ${withAlpha(CS.glow, 0.15)}, ${withAlpha(CS.gaming, 0.1)});
  color: ${CS.glowLight};
  border: 1px solid ${withAlpha(CS.glow, 0.2)};
  margin-right: 6px;
`;
