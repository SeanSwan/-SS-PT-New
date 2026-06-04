import styled from 'styled-components';
import { OutlinedButton, SmallText } from '../ui';

export const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent),
      color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent)
    );
  backdrop-filter: blur(10px);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  flex-shrink: 0;
  gap: 1rem;
  position: relative;
  z-index: 10;

  @media (max-width: 1024px) {
    padding: 1.25rem 1.5rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 1rem;
    backdrop-filter: none;
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, var(--bg-surface, #1A1A24) 12%);
  }

  @media (max-width: 430px) {
    padding: 0.75rem 0.5rem;
    gap: 0.75rem;
  }

  @media (max-width: 375px) {
    padding: 0.625rem 0.375rem;
    gap: 0.625rem;
  }

  @media (max-width: 320px) {
    padding: 0.5rem 0.25rem;
    gap: 0.5rem;
  }

  @media (min-width: 2560px) {
    padding: 2rem 2.5rem;
    gap: 1.5rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 2.5rem 3rem;
    gap: 2rem;
    font-size: 1.25rem;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 1024px) {
    gap: 0.375rem;
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;

    button {
      width: 100%;
      justify-content: center;
      font-size: 0.75rem;
      padding: 0.55rem 0.6rem;
      min-height: 44px;
    }
  }

  @media (max-width: 375px) {
    grid-template-columns: 1fr;
    gap: 0.375rem;

    button {
      font-size: 0.7rem;
      padding: 0.5rem;
    }
  }

  @media (max-width: 320px) {
    gap: 0.25rem;

    button {
      min-height: 40px;
      font-size: 0.68rem;
      padding: 0.4rem;
    }
  }

  @media (min-width: 2560px) {
    gap: 0.75rem;
  }

  @media (min-width: 3840px) {
    gap: 1rem;

    button {
      font-size: 1rem;
      padding: 0.7rem 1.2rem;
    }
  }
`;

export const MenuItemButton = styled(OutlinedButton)`
  width: 100%;
  justify-content: flex-start;
  font-size: 0.85rem;
  padding: 0.55rem 0.75rem;
  min-height: 44px;
`;

export const HeaderAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
`;

export const HeaderSubtitleText = styled(SmallText)`
  margin-top: 0.25rem;
`;

export const AdminScopeToggle = styled.div`
  display: flex;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border-radius: 8px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
    justify-content: center;
  }
`;

export const ScopeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  white-space: nowrap;

  ${({ $active }) =>
    $active
      ? `
        background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 100%);
        color: var(--text-inverse, #0F172A);
        box-shadow: 0 2px 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
      `
      : `
        background: transparent;
        color: var(--text-secondary, rgba(224, 236, 244, 0.65));
        &:hover {
          background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
          color: var(--text-primary, #E0ECF4);
        }
      `}

  @media (max-width: 480px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    flex: 1;
    justify-content: center;
  }
`;

export const LayoutDensityBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
    justify-content: center;
  }
`;

export const ToggleGroup = styled.div`
  display: flex;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border-radius: 6px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $active }) =>
    $active
      ? `
        background: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
        color: var(--accent-primary, #60C0F0);
      `
      : `
        background: transparent;
        color: var(--text-muted, rgba(224, 236, 244, 0.4));
        &:hover {
          background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
          color: var(--text-primary, #E0ECF4);
        }
      `}

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`;

export const TrainerSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 74%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  option {
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
  }

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
  }
`;
