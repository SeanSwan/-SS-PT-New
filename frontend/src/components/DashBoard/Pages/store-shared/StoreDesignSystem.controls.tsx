/**
 * StoreDesignSystem.controls.tsx - Store/Revenue controls.
 * Contains bounded form controls, buttons, tabs, loaders, and notices for
 * admin order management while preserving 44px touch targets.
 */

import styled, { css } from 'styled-components';
import { STORE_TOKENS } from './StoreDesignSystem.tokens';

export const SwanToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
`;

export const SwanToggleTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  background: ${({ $checked }) => $checked
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)'};
  border: 1px solid ${({ $checked }) => $checked
    ? STORE_TOKENS.color.purple
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent)'};
  border-radius: 24px;
  transition: all 0.3s ease;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    left: 2px;
    bottom: 2px;
    background: ${({ $checked }) => $checked ? STORE_TOKENS.color.purple : STORE_TOKENS.color.muted};
    box-shadow: ${({ $checked }) => $checked
      ? '0 0 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 72%, transparent)'
      : 'none'};
    transform: translateX(${({ $checked }) => $checked ? '20px' : '0'});
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:focus-within {
    outline: 2px solid ${STORE_TOKENS.color.purple};
    outline-offset: 2px;
  }
`;

export const SwanToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: -1px;
`;

export const SubSectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${STORE_TOKENS.color.cyan};
  margin: 1.5rem 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const StoreButton = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: ${STORE_TOKENS.radius.button};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return css`
          background: color-mix(in srgb, ${STORE_TOKENS.color.inactive} 10%, transparent);
          border: 1px solid color-mix(in srgb, ${STORE_TOKENS.color.inactive} 30%, transparent);
          color: ${STORE_TOKENS.color.inactive};
          &:hover {
            background: color-mix(in srgb, ${STORE_TOKENS.color.inactive} 20%, transparent);
            border-color: color-mix(in srgb, ${STORE_TOKENS.color.inactive} 50%, transparent);
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          border: 1px solid transparent;
          color: ${STORE_TOKENS.color.muted};
          &:hover {
            color: ${STORE_TOKENS.color.white};
            background: ${STORE_TOKENS.bg.glassHover};
          }
        `;
      default:
        return css`
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent),
            color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)
          );
          border: 1px solid ${STORE_TOKENS.border.purple};
          color: var(--text-primary, #E0ECF4);
          &:hover {
            background: linear-gradient(
              135deg,
              color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent),
              color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)
            );
            border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
            transform: translateY(-1px);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid ${STORE_TOKENS.color.cyan};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

export const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

export const SearchBar = styled.div`
  position: relative;
  flex: 1;
  min-width: 240px;

  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${STORE_TOKENS.color.muted};
    pointer-events: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  min-height: 44px;
  transition: border-color 0.2s;

  &::placeholder { color: color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent); }

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  }
`;

export const ViewModeTabs = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-radius: ${STORE_TOKENS.radius.button};
  overflow: hidden;
  border: 1px solid ${STORE_TOKENS.border.glass};
`;

export const ViewModeTab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  min-height: 44px;
  border: none;
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent), color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent))'
    : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 60%, transparent)'};
  color: ${({ $active }) => $active ? STORE_TOKENS.color.cyan : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent)'};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:not(:last-child) {
    border-right: 1px solid ${STORE_TOKENS.border.glass};
  }

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    color: ${STORE_TOKENS.color.white};
  }

  ${({ $active }) => $active && css`
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: ${STORE_TOKENS.color.cyan};
      box-shadow: 0 -2px 10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    }
  `}
`;

export const FilterPill = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 44px;
  border: 1px solid ${({ $active }) => $active ? STORE_TOKENS.color.cyan : STORE_TOKENS.border.glass};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)' : 'transparent'};
  color: ${({ $active }) => $active ? STORE_TOKENS.color.cyan : STORE_TOKENS.color.muted};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${STORE_TOKENS.color.cyan};
    color: ${STORE_TOKENS.color.white};
  }
`;
